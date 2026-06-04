import { appendAiLog } from './aiLogStore';
import { AiError } from './errors';

// Upgraded from gemini-2.5-flash-lite to gemini-2.5-flash for better deep-cut retrieval
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const DEFAULT_GEMINI_TIMEOUT_MS = 3 * 60 * 1000;
export const BATCH_GEMINI_TIMEOUT_MS = 10 * 60 * 1000;

export interface ModelCallOptions {
  prompt: string;
  maxOutputTokens: number;
  signal?: AbortSignal;
  /** Label stored in local AI logs (one entry per request). */
  operation?: string;
  timeoutMs?: number;
}

export interface ModelCallResult {
  text: string;
  finishReason?: string;
}

function linkAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

function timeoutAbort(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(id),
  };
}

export async function callGemini(
  apiKey: string,
  options: ModelCallOptions,
): Promise<ModelCallResult> {
  const key = apiKey.trim();
  if (!key) {
    throw new AiError('Add a Gemini API key in Configuration');
  }

  if (options.signal?.aborted) {
    throw new AiError('Generation cancelled');
  }

  const started = Date.now();
  const operation = options.operation ?? 'gemini';
  const timeoutMs = options.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS;
  const timeout = timeoutAbort(timeoutMs);
  const signal = linkAbortSignals(
    [options.signal, timeout.signal].filter(Boolean) as AbortSignal[],
  );

  const requestBody = {
    contents: [{ parts: [{ text: options.prompt }] }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: options.maxOutputTokens,
      responseMimeType: 'application/json',
    },
  };

  let logStatus: 'ok' | 'error' = 'error';
  let responseText: string | undefined;
  let finishReason: string | undefined;
  let errorMessage: string | undefined;

  try {
    let res: Response;
    try {
      res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify(requestBody),
      });
    } catch (e) {
      if (
        options.signal?.aborted ||
        (e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && e.name === 'AbortError')
      ) {
        if (timeout.signal.aborted && !options.signal?.aborted) {
          throw new AiError(
            `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
          );
        }
        throw new AiError('Generation cancelled');
      }
      throw new AiError(e instanceof Error ? e.message : 'Network error');
    }

    if (options.signal?.aborted) {
      throw new AiError('Generation cancelled');
    }

    if (timeout.signal.aborted && !options.signal?.aborted) {
      throw new AiError(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }

    if (!res.ok) {
      const errBody = await res.text();
      let message = `Gemini API error (${res.status})`;
      try {
        const parsed = JSON.parse(errBody) as {
          error?: { message?: string };
        };
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        if (errBody) message = errBody.slice(0, 200);
      }
      throw new AiError(message);
    }

    const data = (await res.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
        finishReason?: string;
      }[];
      promptFeedback?: { blockReason?: string };
    };

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      const block = data.promptFeedback?.blockReason;
      throw new AiError(
        block ? `Blocked by Gemini: ${block}` : 'Empty response from Gemini',
      );
    }

    logStatus = 'ok';
    responseText = text;
    finishReason = candidate?.finishReason;

    return {
      text,
      finishReason,
    };
  } catch (e) {
    errorMessage =
      e instanceof AiError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Generation failed';
    throw e instanceof AiError ? e : new AiError(errorMessage);
  } finally {
    timeout.clear();
    appendAiLog({
      id: crypto.randomUUID(),
      timestamp: started,
      operation,
      prompt: options.prompt,
      request: {
        model: GEMINI_MODEL,
        maxOutputTokens: options.maxOutputTokens,
        body: requestBody,
      },
      response:
        responseText != null
          ? { text: responseText, finishReason }
          : undefined,
      error: errorMessage,
      durationMs: Date.now() - started,
      status: logStatus,
    });
  }
}
