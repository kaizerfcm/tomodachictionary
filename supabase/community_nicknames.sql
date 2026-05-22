-- Community nickname suggestions (run in Supabase SQL Editor).
-- Clients call the community-nicknames Edge Function (JWT required).

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

create or replace function private.get_community_default_nicknames(
  p_user_id uuid,
  p_character_name text,
  p_limit integer default 12
)
returns setof text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  normalized text := lower(trim(p_character_name));
begin
  if p_user_id is null then
    raise exception 'missing user id';
  end if;

  if normalized = '' then
    return;
  end if;

  if p_limit is null or p_limit < 1 then
    p_limit := 12;
  elsif p_limit > 12 then
    p_limit := 12;
  end if;

  return query
  select distinct trim(both from nick)::text
  from public.island_data idata
  cross join lateral jsonb_array_elements(
    case jsonb_typeof(idata.data -> 'characters')
      when 'array' then idata.data -> 'characters'
      else '[]'::jsonb
    end
  ) as ch(elem)
  cross join lateral jsonb_array_elements_text(
    case jsonb_typeof(ch.elem -> 'nicknameDefaults')
      when 'array' then ch.elem -> 'nicknameDefaults'
      else '[]'::jsonb
    end
  ) as nick(nick)
  where idata.user_id <> p_user_id
    and lower(trim(ch.elem ->> 'name')) = normalized
    and trim(coalesce(nick, '')) <> ''
  limit p_limit;
end;
$$;

create or replace function private.get_community_outgoing_nicknames(
  p_user_id uuid,
  p_speaker_name text,
  p_target_name text,
  p_limit integer default 12
)
returns setof text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  speaker_norm text := lower(trim(p_speaker_name));
  target_norm text := lower(trim(p_target_name));
begin
  if p_user_id is null then
    raise exception 'missing user id';
  end if;

  if speaker_norm = '' or target_norm = '' then
    return;
  end if;

  if p_limit is null or p_limit < 1 then
    p_limit := 12;
  elsif p_limit > 12 then
    p_limit := 12;
  end if;

  return query
  select distinct trim(both from n.val)::text
  from public.island_data idata
  cross join lateral jsonb_array_elements(
    case jsonb_typeof(idata.data -> 'characters')
      when 'array' then idata.data -> 'characters'
      else '[]'::jsonb
    end
  ) as sp(elem)
  cross join lateral jsonb_array_elements(
    case jsonb_typeof(idata.data -> 'characters')
      when 'array' then idata.data -> 'characters'
      else '[]'::jsonb
    end
  ) as tg(elem)
  cross join lateral jsonb_array_elements_text(
    coalesce(sp.elem -> 'nicknames' -> (tg.elem ->> 'id'), '[]'::jsonb)
  ) as n(val)
  where idata.user_id <> p_user_id
    and lower(trim(sp.elem ->> 'name')) = speaker_norm
    and lower(trim(tg.elem ->> 'name')) = target_norm
    and trim(coalesce(n.val, '')) <> ''
  limit p_limit;
end;
$$;

revoke all on function private.get_community_default_nicknames(uuid, text, integer) from public;
revoke all on function private.get_community_default_nicknames(uuid, text, integer) from anon;
revoke all on function private.get_community_default_nicknames(uuid, text, integer) from authenticated;

revoke all on function private.get_community_outgoing_nicknames(uuid, text, text, integer) from public;
revoke all on function private.get_community_outgoing_nicknames(uuid, text, text, integer) from anon;
revoke all on function private.get_community_outgoing_nicknames(uuid, text, text, integer) from authenticated;
