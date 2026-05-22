# Supabase security notes

## Community phrases (linter fix)

The community feature no longer exposes a `SECURITY DEFINER` function on the **public** API.

1. Run **`supabase/community_phrases.sql`** in the SQL Editor (drops the old public RPC, creates `private.get_community_phrase_suggestions`).
2. Deploy the Edge Function:

```bash
npm run supabase:deploy-community-phrases
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

The function requires a signed-in user JWT (default). Anonymous callers cannot use it.

## Community nicknames

Same pattern as phrases — private RPC, Edge Function, JWT required.

1. Run **`supabase/community_nicknames.sql`** in the SQL Editor.
2. Deploy:

```bash
npm run supabase:deploy-community-nicknames
```

## Leaked password protection (Auth warning)

In **Supabase Dashboard → Authentication → Providers → Email** (or Password security):

Enable **Leaked password protection** (Have I Been Pwned check).

This is a project setting, not something in this repo.

## Stripe webhook

Keep `stripe-webhook` deployed with `--no-verify-jwt` and secrets only in Supabase — never in Vercel env.
