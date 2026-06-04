import { AiError } from './errors';

// Upgraded from gemini-2.5-flash-lite to gemini-2.5-flash for better deep-cut retrieval
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface ModelCallOptions {
  prompt: string;
  maxOutputTokens: number;
  signal?: AbortSignal;
}

export interface ModelCallResult {
  text: string;
  finishReason?: string;
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

  let res: Response;
  try {
    res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: options.prompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: options.maxOutputTokens,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (e) {
    if (
      options.signal?.aborted ||
      (e instanceof DOMException && e.name === 'AbortError') ||
      (e instanceof Error && e.name === 'AbortError')
    ) {
      throw new AiError('Generation cancelled');
    }
    throw new AiError(e instanceof Error ? e.message : 'Network error');
  }

  if (options.signal?.aborted) {
    throw new AiError('Generation cancelled');
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
    throw new AiError(block ? `Blocked by Gemini: ${block}` : 'Empty response from Gemini');
  }

  return {
    text,
    finishReason: candidate?.finishReason,
  };
}
