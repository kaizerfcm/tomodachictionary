/**
 * Community nickname suggestions (authenticated users only).
 * Deploy: npm run supabase:deploy-community-nicknames
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response('Server misconfigured', { status: 500 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: {
    characterName?: string;
    targetName?: string;
    kind?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const characterName = (body.characterName ?? '').trim();
  const targetName = (body.targetName ?? '').trim();
  const kind = body.kind ?? 'default';

  if (!characterName) {
    return new Response(JSON.stringify({ nicknames: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (kind === 'outgoing') {
    if (!targetName) {
      return new Response(JSON.stringify({ nicknames: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { data, error } = await admin.schema('private').rpc(
      'get_community_outgoing_nicknames',
      {
        p_user_id: userId,
        p_speaker_name: characterName,
        p_target_name: targetName,
        p_limit: 12,
      },
    );
    if (error) {
      return new Response(error.message, { status: 500 });
    }
    const nicknames = Array.isArray(data)
      ? data.filter((s): s is string => typeof s === 'string' && s.trim() !== '')
      : [];
    return new Response(JSON.stringify({ nicknames }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await admin.schema('private').rpc(
    'get_community_default_nicknames',
    {
      p_user_id: userId,
      p_character_name: characterName,
      p_limit: 12,
    },
  );

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const nicknames = Array.isArray(data)
    ? data.filter((s): s is string => typeof s === 'string' && s.trim() !== '')
    : [];

  return new Response(JSON.stringify({ nicknames }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
