import { finalizePrompt } from './prompts';
import { appendAiLog } from './aiLogStore';
import { AiError } from './errors';
import { extractJsonString } from './parseModelJson';

const LLM_PORT = 1234;
const MAX_CONTINUATION_ROUNDS = 16;
export const DEFAULT_LLM_TIMEOUT_MS = 5 * 60 * 1000;
export const BATCH_LLM_TIMEOUT_MS = 15 * 60 * 1000;

const LOCAL_SYSTEM_PROMPT = `You generate JSON for a Tomodachi Life character dictionary app running on a local model.

Output rules (critical):
- Reply with valid JSON only. No markdown fences, no commentary, no text before or after the JSON.
- Use double quotes for all JSON strings.
- Complete the requested JSON object. If you run out of space mid-JSON, stop exactly where you are; the app will ask you to continue.
- On continue requests, output ONLY the remaining JSON fragment — do not repeat earlier content.`;

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

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

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

export function buildLlmUrl(host: string): string {
  const trimmed = host.trim();
  if (!trimmed) {
    throw new AiError('Add the local LLM IP in Configuration');
  }
  const withoutScheme = trimmed.replace(/^https?:\/\//i, '');
  const hostOnly = withoutScheme.split('/')[0]?.split(':')[0]?.trim();
  if (!hostOnly) {
    throw new AiError('Invalid LLM IP in Configuration');
  }
  return `http://${hostOnly}:${LLM_PORT}/v1/chat/completions`;
}

function isJsonComplete(text: string): boolean {
  if (!text.trim()) return false;
  try {
    JSON.parse(extractJsonString(text));
    return true;
  } catch {
    return false;
  }
}

function shouldContinue(finishReason: string | undefined, text: string): boolean {
  if (finishReason === 'length' || finishReason === 'max_tokens') return true;
  return !isJsonComplete(text);
}

export async function callLocalLlm(
  llmHost: string,
  options: ModelCallOptions,
): Promise<ModelCallResult> {
  if (options.signal?.aborted) {
    throw new AiError('Generation cancelled');
  }

  const url = buildLlmUrl(llmHost);
  const started = Date.now();
  const operation = options.operation ?? 'local-llm';
  const timeoutMs = options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;
  const timeout = timeoutAbort(timeoutMs);
  const signal = linkAbortSignals(
    [options.signal, timeout.signal].filter(Boolean) as AbortSignal[],
  );

  const messages: ChatMessage[] = [
    { role: 'system', content: LOCAL_SYSTEM_PROMPT },
    { role: 'user', content: finalizePrompt(options.prompt) },
  ];

  let fullText = '';
  let lastFinishReason: string | undefined;
  let logStatus: 'ok' | 'error' = 'error';
  let errorMessage: string | undefined;
  let continuationCount = 0;

  const requestMeta = {
    url,
    maxOutputTokens: options.maxOutputTokens,
    model: 'local-model',
  };

  try {
    for (let round = 0; round <= MAX_CONTINUATION_ROUNDS; round += 1) {
      if (options.signal?.aborted) {
        throw new AiError('Generation cancelled');
      }
      if (timeout.signal.aborted && !options.signal?.aborted) {
        throw new AiError(
          `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
        );
      }

      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            model: 'local-model',
            messages,
            temperature: 0.7,
            max_tokens: options.maxOutputTokens,
            stream: false,
          }),
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
        throw new AiError(
          e instanceof Error
            ? `Could not reach local LLM at ${url}: ${e.message}`
            : 'Could not reach local LLM',
        );
      }

      if (!res.ok) {
        const errBody = await res.text();
        let message = `Local LLM error (${res.status})`;
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
        choices?: {
          message?: { content?: string };
          finish_reason?: string;
        }[];
      };

      const choice = data.choices?.[0];
      const chunk = choice?.message?.content ?? '';
      if (!chunk && round === 0) {
        throw new AiError('Empty response from local LLM');
      }

      fullText += chunk;
      lastFinishReason = choice?.finish_reason;

      if (!shouldContinue(lastFinishReason, fullText)) {
        break;
      }

      if (round >= MAX_CONTINUATION_ROUNDS) {
        throw new AiError(
          'Local LLM output was still incomplete after multiple continuations',
        );
      }

      continuationCount += 1;
      messages.push({ role: 'assistant', content: chunk });
      messages.push({
        role: 'user',
        content:
          'Continue the JSON exactly where you stopped. Output ONLY the remaining JSON fragment needed to complete valid JSON. Do not repeat any earlier text.',
      });
    }

    if (!fullText.trim()) {
      throw new AiError('Empty response from local LLM');
    }

    logStatus = 'ok';
    return {
      text: fullText,
      finishReason: lastFinishReason,
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
      prompt: finalizePrompt(options.prompt),
      request: {
        ...requestMeta,
        continuationCount,
        body: { messages: messages.slice(0, 4) },
      },
      response:
        fullText.trim().length > 0
          ? { text: fullText, finishReason: lastFinishReason }
          : undefined,
      error: errorMessage,
      durationMs: Date.now() - started,
      status: logStatus,
    });
  }
}
