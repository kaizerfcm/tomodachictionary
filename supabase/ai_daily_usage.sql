-- Daily AI quota for hosted generation (run in Supabase SQL Editor).

create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default (timezone('utc', now()))::date,
  request_count integer not null default 0,
  primary key (user_id, usage_date)
);

alter table public.ai_daily_usage enable row level security;

revoke all on table public.ai_daily_usage from public;
revoke all on table public.ai_daily_usage from anon;
revoke all on table public.ai_daily_usage from authenticated;

create or replace function private.consume_ai_quota(
  p_user_id uuid,
  p_daily_limit integer default 40
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  today date := (timezone('utc', now()))::date;
  current_count integer;
begin
  if p_user_id is null then
    raise exception 'missing user id';
  end if;

  insert into public.ai_daily_usage (user_id, usage_date, request_count)
  values (p_user_id, today, 1)
  on conflict (user_id, usage_date)
  do update set request_count = public.ai_daily_usage.request_count + 1
  returning request_count into current_count;

  return current_count <= p_daily_limit;
end;
$$;

revoke all on function private.consume_ai_quota(uuid, integer) from public;
revoke all on function private.consume_ai_quota(uuid, integer) from anon;
revoke all on function private.consume_ai_quota(uuid, integer) from authenticated;
