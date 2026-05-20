-- Run once in Supabase: SQL Editor → New query → paste → Run

create table if not exists public.island_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{"version":1,"characters":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.island_data enable row level security;

create policy "Users read own island"
  on public.island_data for select
  using (auth.uid() = user_id);

create policy "Users insert own island"
  on public.island_data for insert
  with check (auth.uid() = user_id);

create policy "Users update own island"
  on public.island_data for update
  using (auth.uid() = user_id);
