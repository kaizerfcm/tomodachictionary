-- Community phrase suggestions (run in Supabase SQL Editor).
-- Returns up to N distinct phrases for a character name + phrase type from other users' islands.
-- No user ids or island data are exposed.

create or replace function public.get_community_phrase_suggestions(
  p_character_name text,
  p_phrase_type text,
  p_limit integer default 12
)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(p_character_name));
  uid uuid := auth.uid();
  allowed_types text[] := array[
    'catchphrases', 'startingSentence', 'endingSentence', 'beforeEating',
    'shoutAtSea', 'whenHappy', 'whenSad', 'whenAngry', 'whileSleeping', 'greeting'
  ];
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if normalized = '' then
    return;
  end if;

  if not (p_phrase_type = any (allowed_types)) then
    raise exception 'invalid phrase type';
  end if;

  if p_limit is null or p_limit < 1 then
    p_limit := 12;
  elsif p_limit > 12 then
    p_limit := 12;
  end if;

  return query
  select distinct trim(both from pt.phrase_text)::text
  from public.island_data idata
  cross join lateral jsonb_array_elements(
    case jsonb_typeof(idata.data -> 'characters')
      when 'array' then idata.data -> 'characters'
      else '[]'::jsonb
    end
  ) as ch(elem)
  cross join lateral jsonb_array_elements_text(
    case jsonb_typeof(ch.elem -> 'phrases' -> p_phrase_type)
      when 'array' then ch.elem -> 'phrases' -> p_phrase_type
      else '[]'::jsonb
    end
  ) as pt(phrase_text)
  where idata.user_id <> uid
    and lower(trim(ch.elem ->> 'name')) = normalized
    and trim(coalesce(pt.phrase_text, '')) <> ''
  limit p_limit;
end;
$$;

revoke all on function public.get_community_phrase_suggestions(text, text, integer) from public;
grant execute on function public.get_community_phrase_suggestions(text, text, integer) to authenticated;
