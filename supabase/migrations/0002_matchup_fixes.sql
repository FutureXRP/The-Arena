-- Matchup fixes.
--  1. An open matchup belongs to one season. A voter who left a matchup undecided
--     in a closed season gets a fresh pair in the next season, and the old one is
--     never dealt or counted again.
--  2. Two simultaneous requests for a voter's first matchup no longer fail: the
--     loser of the race is handed the row the winner inserted.
--  3. A vote is only accepted while its season is open.

-- One open matchup per voter per season (was: one per voter across all seasons).
drop index if exists one_open_matchup;
create unique index if not exists one_open_matchup_per_season
  on matchups (voter_id, season_id) where decided_at is null;

create or replace function next_matchup(p_user uuid, p_season uuid, p_daily_cap integer)
returns setof matchups
language plpgsql security definer set search_path = public as $$
declare
  existing matchups%rowtype;
  v_a uuid;
  v_b uuid;
  v_cat text;
  tries integer := 0;
begin
  if not exists (select 1 from seasons where id = p_season and phase = 'open') then return; end if;

  select * into existing from matchups
   where voter_id = p_user and season_id = p_season and decided_at is null;
  if found then
    return next existing;
    return;
  end if;

  if (select count(*) from matchups
       where voter_id = p_user and created_at > now() - interval '24 hours') >= p_daily_cap then
    return;
  end if;

  v_cat := case when random() < 0.5 then 'ad' else 'platform' end;

  loop
    tries := tries + 1;
    v_a := null;
    v_b := null;
    select id into v_a from ads
     where season_id = p_season and status = 'live' and owner_id <> p_user
     order by random() limit 1;
    if v_a is null then return; end if;
    select id into v_b from ads
     where season_id = p_season and status = 'live' and owner_id <> p_user and id <> v_a
     order by random() limit 1;
    if v_b is null then return; end if;

    exit when tries >= 6 or not exists (
      select 1 from matchups
       where voter_id = p_user and category = v_cat
         and ((ad_a = v_a and ad_b = v_b) or (ad_a = v_b and ad_b = v_a))
    );
  end loop;

  begin
    return query
      insert into matchups (season_id, voter_id, category, ad_a, ad_b)
      values (p_season, p_user, v_cat, v_a, v_b)
      returning *;
  exception when unique_violation then
    -- A concurrent request already dealt this voter a matchup. Hand back that one.
    select * into existing from matchups
     where voter_id = p_user and season_id = p_season and decided_at is null;
    if found then return next existing; end if;
  end;
end $$;

create or replace function cast_vote(p_matchup uuid, p_user uuid, p_winner uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update matchups m
     set winner_ad = p_winner, skipped = (p_winner is null), decided_at = now()
   where m.id = p_matchup
     and m.voter_id = p_user
     and m.decided_at is null
     and (p_winner is null or p_winner in (m.ad_a, m.ad_b))
     and exists (select 1 from seasons s where s.id = m.season_id and s.phase = 'open');
  return found;
end $$;

-- create or replace keeps existing grants, but restate them so this file is safe on its own.
revoke execute on function next_matchup(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function cast_vote(uuid, uuid, uuid) from public, anon, authenticated;
