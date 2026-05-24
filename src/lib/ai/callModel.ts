import { AiError } from './errors';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface ModelCallOptions {
  prompt: string;
  maxOutputTokens: number;
}

export async function callGemini(
  apiKey: string,
  options: ModelCallOptions,
): Promise<string> {
  const key = apiKey.trim();
  if (!key) {
    throw new AiError('Add a Gemini API key in Configuration');
  }

  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: options.prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: options.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    }),
  });

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
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AiError('Empty response from Gemini');
  return text;
}
