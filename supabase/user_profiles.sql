-- Run in Supabase SQL Editor after island_data schema

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ads_removed boolean not null default false,
  country_code text,
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users read own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);
