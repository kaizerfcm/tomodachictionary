import { appendAiLog } from './aiLogStore';
import { AiError } from './errors';
import {
  LLM_MODEL_ID,
  LLM_PORT,
  LOCAL_SYSTEM_PROMPT,
} from './localLlmConfig';
import { extractJsonString } from './parseModelJson';

const MAX_CONTINUATION_ROUNDS = 16;
export const DEFAULT_LLM_TIMEOUT_MS = 5 * 60 * 1000;
export const BATCH_LLM_TIMEOUT_MS = 15 * 60 * 1000;

const CONTINUE_INPUT =
  'Continue the JSON exactly where you stopped. Output ONLY the remaining JSON fragment needed to complete valid JSON. Do not repeat any earlier text.';

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

type LmStudioOutputItem = {
  type?: string;
  content?: string;
};

type LmStudioChatResponse = {
  output?: LmStudioOutputItem[];
  response_id?: string;
  error?: string | { message?: string };
  stats?: {
    total_output_tokens?: number;
  };
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
  return `http://${hostOnly}:${LLM_PORT}/api/v1/chat`;
}

export function extractLmStudioMessageText(data: LmStudioChatResponse): string {
  return (data.output ?? [])
    .filter((item) => item.type === 'message' && item.content)
    .map((item) => item.content!)
    .join('');
}

function parseLmStudioError(data: LmStudioChatResponse): string | null {
  if (!data.error) return null;
  if (typeof data.error === 'string') return data.error;
  return data.error.message ?? 'Local LLM error';
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

function shouldContinue(text: string): boolean {
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

  let fullText = '';
  let lastFinishReason: string | undefined;
  let logStatus: 'ok' | 'error' = 'error';
  let errorMessage: string | undefined;
  let continuationCount = 0;
  let previousResponseId: string | undefined;
  let input = options.prompt;

  const requestMeta = {
    url,
    maxOutputTokens: options.maxOutputTokens,
    model: LLM_MODEL_ID,
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

      const body: Record<string, unknown> = {
        model: LLM_MODEL_ID,
        system_prompt: LOCAL_SYSTEM_PROMPT,
        input,
        temperature: 0.7,
        context_length: Math.max(8192, options.maxOutputTokens * 2),
      };
      if (previousResponseId) {
        body.previous_response_id = previousResponseId;
      }

      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify(body),
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
            error?: string | { message?: string };
          };
          if (typeof parsed.error === 'string') message = parsed.error;
          else if (parsed.error?.message) message = parsed.error.message;
        } catch {
          if (errBody) message = errBody.slice(0, 200);
        }
        throw new AiError(message);
      }

      const data = (await res.json()) as LmStudioChatResponse;
      const apiError = parseLmStudioError(data);
      if (apiError) {
        throw new AiError(apiError);
      }

      const chunk = extractLmStudioMessageText(data);
      if (!chunk && round === 0) {
        throw new AiError('Empty response from local LLM');
      }

      fullText += chunk;
      previousResponseId = data.response_id;
      lastFinishReason =
        shouldContinue(fullText) && round < MAX_CONTINUATION_ROUNDS
          ? 'length'
          : 'stop';

      if (!shouldContinue(fullText)) {
        break;
      }

      if (round >= MAX_CONTINUATION_ROUNDS) {
        throw new AiError(
          'Local LLM output was still incomplete after multiple continuations',
        );
      }

      continuationCount += 1;
      input = CONTINUE_INPUT;
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
      prompt: options.prompt,
      request: {
        ...requestMeta,
        continuationCount,
        body: {
          model: LLM_MODEL_ID,
          system_prompt: LOCAL_SYSTEM_PROMPT,
          input: options.prompt,
        },
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
