/**
 * Stripe webhook: sets ads_removed when checkout completes.
 * Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
 * Secrets: STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
 *
 * In Stripe Dashboard → Webhooks → add endpoint URL:
 * https://<project-ref>.supabase.co/functions/v1/stripe-webhook
 * Events: checkout.session.completed
 *
 * Users must sign in with the same email used at Stripe checkout.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripeSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function verifyStripeSignature(
  body: string,
  signature: string | null,
): Promise<boolean> {
  if (!stripeSecret || !signature) return false;
  const parts = signature.split(',').map((p) => p.split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const v1 = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || v1.length === 0) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(stripeSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payload = `${t}.${body}`;
  const sig = await crypto.subtle.sign(
    'key',
    key,
    new TextEncoder().encode(payload),
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const timingSafeEqual = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let out = 0;
    for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return out === 0;
  };

  return v1.some((v) => timingSafeEqual(v, expected));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Server misconfigured', { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const valid = await verifyStripeSignature(body, sig);
  if (!valid) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body) as {
    type?: string;
    data?: { object?: { customer_details?: { email?: string }; customer_email?: string } };
  };

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const session = event.data?.object;
  const email = (
    session?.customer_details?.email ??
    session?.customer_email ??
    ''
  )
    .trim()
    .toLowerCase();

  if (!email) {
    return new Response(JSON.stringify({ ok: false, reason: 'no email' }), {
      status: 200,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserByEmail(email);

  if (userError || !userData?.user) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'no matching account' }),
      { status: 200 },
    );
  }

  const { error: upsertError } = await supabase.from('user_profiles').upsert(
    {
      user_id: userData.user.id,
      ads_removed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (upsertError) {
    return new Response(upsertError.message, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, user_id: userData.user.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
