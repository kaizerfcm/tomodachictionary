/**
 * Stripe webhook: sets ads_removed when checkout completes.
 * Deploy: npm run supabase:deploy-webhook
 * Secrets: STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
 *
 * Stripe Dashboard → Webhooks → endpoint:
 * https://<project-ref>.supabase.co/functions/v1/stripe-webhook
 * Event: checkout.session.completed
 *
 * Checkout email must match the user's Supabase Auth email.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripeSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

/** Stripe `whsec_…` values must be base64-decoded before HMAC. */
function stripeWebhookKeyBytes(secret: string): Uint8Array {
  const encoded = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

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
    stripeWebhookKeyBytes(stripeSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payload = `${t}.${body}`;
  const sig = await crypto.subtle.sign(
    'HMAC',
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

type CheckoutSession = {
  customer_details?: { email?: string | null };
  customer_email?: string | null;
};

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

  let event: { type?: string; data?: { object?: CheckoutSession } };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userLookup, error: userError } =
    await supabase.auth.admin.getUserByEmail(email);

  const user = userLookup?.user;
  if (userError || !user) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'no matching account' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { error: upsertError } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      ads_removed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (upsertError) {
    return new Response(upsertError.message, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, user_id: user.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
