-- The Arena: schema.
-- Every table has RLS on with no policies: the browser never talks to these
-- tables directly. All reads and writes go through the Next.js server using
-- the service role key.

create extension if not exists pgcrypto;

create table seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  phase text not null default 'open' check (phase in ('open', 'finals', 'closed')),
  is_current boolean not null default false,
  -- Fixed prizes, announced before the season starts. Whole XRP. 0 shows as "TBA".
  prize_ad_xrp integer not null default 0,
  prize_platform_xrp integer not null default 0,
  prize_newcomer_xrp integer not null default 0,
  -- Section prices in US cents.
  price_field_cents integer not null,
  price_lower_cents integer not null,
  price_upper_cents integer not null
);
create unique index one_current_season on seasons (is_current) where is_current;

create table sections (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons (id) on delete cascade,
  code text not null,
  tier text not null check (tier in ('field', 'lower', 'upper')),
  position integer not null,
  owner_id uuid references auth.users (id),
  claimed_at timestamptz,
  held_by uuid,
  held_until timestamptz,
  unique (season_id, code)
);
create index sections_owner on sections (owner_id);

create table ads (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null unique references sections (id) on delete cascade,
  season_id uuid not null references seasons (id) on delete cascade,
  owner_id uuid not null references auth.users (id),
  brand text not null default '',
  kind text not null default '',
  headline text not null default '',
  url text not null default '',
  bg text not null default '#131A22',
  fg text not null default '#E8EDF2',
  -- draft: not yet complete. live: in the matchup pool. hidden: pulled by an admin.
  status text not null default 'draft' check (status in ('draft', 'live', 'hidden')),
  visits integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ads_pool on ads (season_id, status);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  section_id uuid not null references sections (id),
  season_id uuid not null references seasons (id),
  amount_cents integer not null,
  stripe_session_id text unique,
  -- conflict: paid, but the section was already taken. Refund by hand.
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'conflict')),
  created_at timestamptz not null default now()
);

create table matchups (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons (id) on delete cascade,
  voter_id uuid not null references auth.users (id),
  category text not null check (category in ('ad', 'platform')),
  ad_a uuid not null references ads (id) on delete cascade,
  ad_b uuid not null references ads (id) on delete cascade,
  winner_ad uuid references ads (id) on delete cascade,
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
-- A voter has at most one undecided matchup, so reloading cannot re-roll the pair.
create unique index one_open_matchup on matchups (voter_id) where decided_at is null;
create index matchups_voter_time on matchups (voter_id, created_at);
create index matchups_season on matchups (season_id, category) where winner_ad is not null;

create table final_votes (
  season_id uuid not null references seasons (id) on delete cascade,
  voter_id uuid not null references auth.users (id),
  category text not null check (category in ('ad', 'platform', 'newcomer')),
  ad_id uuid not null references ads (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (season_id, voter_id, category)
);

alter table seasons enable row level security;
alter table sections enable row level security;
alter table ads enable row level security;
alter table orders enable row level security;
alter table matchups enable row level security;
alter table final_votes enable row level security;

-- Win rate per ad and category. win_bp is basis points (7100 = 71.00%), integer math only.
create view standings as
select
  m.season_id,
  m.category,
  a.id as ad_id,
  (count(*) filter (where m.winner_ad = a.id))::integer as wins,
  count(*)::integer as judged,
  ((count(*) filter (where m.winner_ad = a.id)) * 10000 / count(*))::integer as win_bp
from matchups m
join ads a on a.id in (m.ad_a, m.ad_b)
where m.winner_ad is not null
group by m.season_id, m.category, a.id;

-- Reserve a section while its buyer is in checkout.
create function hold_section(p_section uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update sections
     set held_by = p_user, held_until = now() + interval '35 minutes'
   where id = p_section
     and owner_id is null
     and (held_until is null or held_until < now() or held_by = p_user);
  return found;
end $$;

-- Called from the Stripe webhook once payment succeeds. Safe to call twice.
create function complete_order(p_session text) returns text
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
begin
  select * into o from orders where stripe_session_id = p_session for update;
  if not found then return 'missing'; end if;
  if o.status <> 'pending' then return o.status; end if;

  update sections
     set owner_id = o.user_id, claimed_at = now(), held_by = null, held_until = null
   where id = o.section_id and owner_id is null;
  if not found then
    update orders set status = 'conflict' where id = o.id;
    return 'conflict';
  end if;

  insert into ads (section_id, season_id, owner_id) values (o.section_id, o.season_id, o.user_id)
  on conflict (section_id) do nothing;
  update orders set status = 'paid' where id = o.id;
  return 'paid';
end $$;

create function expire_order(p_session text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
begin
  select * into o from orders where stripe_session_id = p_session and status = 'pending' for update;
  if not found then return; end if;
  update orders set status = 'expired' where id = o.id;
  update sections set held_by = null, held_until = null
   where id = o.section_id and owner_id is null and held_by = o.user_id;
end $$;

-- Hand a voter their next matchup. The server picks the pair, never the voter.
-- Returns no rows when voting is closed, the daily cap is hit, or there are
-- not two eligible ads.
create function next_matchup(p_user uuid, p_season uuid, p_daily_cap integer)
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

  select * into existing from matchups where voter_id = p_user and decided_at is null;
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

  return query
    insert into matchups (season_id, voter_id, category, ad_a, ad_b)
    values (p_season, p_user, v_cat, v_a, v_b)
    returning *;
end $$;

-- Record a vote. p_winner null means the voter skipped.
create function cast_vote(p_matchup uuid, p_user uuid, p_winner uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update matchups
     set winner_ad = p_winner, skipped = (p_winner is null), decided_at = now()
   where id = p_matchup
     and voter_id = p_user
     and decided_at is null
     and (p_winner is null or p_winner in (ad_a, ad_b));
  return found;
end $$;

create function bump_visit(p_ad uuid) returns void
language sql security definer set search_path = public as $$
  update ads set visits = visits + 1 where id = p_ad and status = 'live';
$$;

create function bump_click(p_ad uuid) returns void
language sql security definer set search_path = public as $$
  update ads set clicks = clicks + 1 where id = p_ad and status = 'live';
$$;

-- Only the server (service role) may call these.
revoke execute on function hold_section(uuid, uuid) from public, anon, authenticated;
revoke execute on function complete_order(text) from public, anon, authenticated;
revoke execute on function expire_order(text) from public, anon, authenticated;
revoke execute on function next_matchup(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function cast_vote(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function bump_visit(uuid) from public, anon, authenticated;
revoke execute on function bump_click(uuid) from public, anon, authenticated;
revoke all on standings from anon, authenticated;
