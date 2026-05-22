import { getSupabase, isSupabaseConfigured } from '../supabase';
import { AiError } from './errors';
import type { AiProviderId, AiSettings, ModelCallOptions } from './types';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

async function parseJsonResponse(res: Response, provider: string): Promise<string> {
  if (!res.ok) {
    const errBody = await res.text();
    let message = `${provider} API error (${res.status})`;
    try {
      const parsed = JSON.parse(errBody) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      if (errBody) message = errBody.slice(0, 200);
    }
    throw new AiError(message);
  }
  return res.text();
}

async function callGeminiApi(apiKey: string, options: ModelCallOptions): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: options.prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: options.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    }),
  });
  const body = await parseJsonResponse(res, 'Gemini');
  const data = JSON.parse(body) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AiError('Empty response from Gemini');
  return text;
}

async function callOpenAiCompatible(
  url: string,
  apiKey: string,
  model: string,
  provider: string,
  options: ModelCallOptions,
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      max_tokens: options.maxOutputTokens,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `${options.prompt}\n\nReply with JSON only.`,
        },
      ],
    }),
  });
  const body = await parseJsonResponse(res, provider);
  const data = JSON.parse(body) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new AiError(`Empty response from ${provider}`);
  return text;
}

async function callHosted(options: ModelCallOptions): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new AiError('Cloud AI requires Supabase sign-in');
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('ai-generate', {
    body: {
      prompt: options.prompt,
      maxOutputTokens: options.maxOutputTokens,
    },
  });
  if (error) throw new AiError(error.message);
  const payload = data as { text?: string; error?: string } | null;
  if (payload?.error) throw new AiError(payload.error);
  if (!payload?.text?.trim()) throw new AiError('Empty response from cloud AI');
  return payload.text;
}

export async function callModel(
  settings: AiSettings,
  options: ModelCallOptions,
): Promise<string> {
  const provider = settings.provider;

  if (provider === 'hosted') {
    if (!settings.canUseHosted) {
      throw new AiError('Sign in to use Tomodict cloud generation');
    }
    return callHosted(options);
  }

  const key = settings.apiKey.trim();
  if (!key) {
    throw new AiError(`Add a ${providerLabel(provider)} API key in Configuration`);
  }

  switch (provider) {
    case 'gemini':
      return callGeminiApi(key, options);
    case 'groq':
      return callOpenAiCompatible(GROQ_URL, key, GROQ_MODEL, 'Groq', options);
    case 'openrouter':
      return callOpenAiCompatible(
        OPENROUTER_URL,
        key,
        OPENROUTER_MODEL,
        'OpenRouter',
        options,
      );
    default:
      throw new AiError('Unknown AI provider');
  }
}

export function providerLabel(id: AiProviderId): string {
  switch (id) {
    case 'gemini':
      return 'Gemini';
    case 'groq':
      return 'Groq';
    case 'openrouter':
      return 'OpenRouter';
    case 'hosted':
      return 'Tomodict cloud';
    default:
      return 'AI';
  }
}
