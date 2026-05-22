/**
 * Hosted AI generation with per-user daily quota (authenticated only).
 * Set secret GEMINI_API_KEY in Supabase Edge Function secrets.
 * Deploy: npm run supabase:deploy-ai-generate
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
const geminiKey = Deno.env.get('GEMINI_API_KEY');

const MODEL = 'gemini-2.5-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const DAILY_LIMIT = 40;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!geminiKey) {
    return new Response(
      JSON.stringify({ error: 'Cloud AI is not configured (missing GEMINI_API_KEY)' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { prompt?: string; maxOutputTokens?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const maxOutputTokens = Math.min(
    Math.max(Number(body.maxOutputTokens) || 256, 64),
    4096,
  );

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: allowed, error: quotaError } = await admin.schema('private').rpc(
    'consume_ai_quota',
    { p_user_id: userId, p_daily_limit: DAILY_LIMIT },
  );

  if (quotaError) {
    return new Response(JSON.stringify({ error: quotaError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: `Daily cloud AI limit reached (${DAILY_LIMIT} requests). Try again tomorrow or use a local/API key.`,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const res = await fetch(`${API_URL}?key=${encodeURIComponent(geminiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return new Response(
      JSON.stringify({ error: errBody.slice(0, 300) || `Gemini error ${res.status}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: 'Empty response from model' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ text }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
