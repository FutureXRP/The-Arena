-- MOCK SEASON FOR TESTING. Do not run on a live site.
-- Requires 0001_init.sql, 0002_matchup_fixes.sql, 0003_ad_images.sql and seed.sql to have run,
-- and for you to have signed in to the site once with v_my_email.
--
-- What it does:
--   * Re-dates the current season so it is 40 days in, 20 to go (newcomers possible).
--   * Gives YOUR account sections F-01 and L-01 with live ads.
--   * Creates 16 fake advertisers (@mock.arena) owning sections with live ads,
--     4 of them "newcomers" claimed after the season midpoint.
--   * Creates 20 fake voters and backfills ~1,200 decided matchups over the
--     last 30 days, with hidden ad "strength" so the standings are not flat.
--   * Leaves YOUR account with no matchups, so you can vote fresh.
-- Remove it all with the RESET block at the bottom of this file.

do $$
declare
  v_my_email text := 'the5blairsworld@gmail.com';   -- the email you signed in with
  v_me uuid;
  v_season uuid;
  v_mid timestamptz;
  v_owner uuid;
  v_section uuid;
  v_ad uuid;
  r record;
  v_a uuid; v_b uuid; v_sa int; v_sb int; v_cat text; v_voter uuid; v_when timestamptz;
  i int;
  ads uuid[];
  strength int[];
  voters uuid[];
  n int;
begin
  select id into v_me from auth.users where lower(email) = lower(v_my_email);
  if v_me is null then raise exception 'No user with email %. Sign in to the site first.', v_my_email; end if;

  select id into v_season from seasons where is_current;
  if v_season is null then raise exception 'No current season. Run seed.sql first.'; end if;
  if exists (select 1 from auth.users where email like '%@mock.arena') then
    raise exception 'Mock season already applied. Run the RESET block at the bottom of this file first.';
  end if;

  -- Season is 40 days old with 20 to go. Midpoint is 10 days ago.
  update seasons set starts_at = now() - interval '40 days', ends_at = now() + interval '20 days',
         phase = 'open', prize_ad_xrp = 5000, prize_platform_xrp = 3000, prize_newcomer_xrp = 1000
   where id = v_season;
  v_mid := now() - interval '10 days';

  -- Fake auth users. Empty strings instead of NULLs in the token columns keep
  -- the Supabase auth admin screens happy.
  for i in 1..36 loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token,
      is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      case when i <= 16 then format('advertiser%s@mock.arena', i) else format('voter%s@mock.arena', i - 16) end,
      '', now() - interval '45 days', now() - interval '45 days', now() - interval '45 days',
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '', '', '', '', '', '', '', '', false, false
    ) on conflict do nothing;
  end loop;

  -- Your two sections.
  for r in select * from (values ('F-01'), ('L-01')) t(code) loop
    select id into v_section from sections where season_id = v_season and code = r.code;
    update sections set owner_id = v_me, claimed_at = now() - interval '38 days', held_by = null, held_until = null
     where id = v_section;
    insert into orders (user_id, section_id, season_id, amount_cents, stripe_session_id, status)
    values (v_me, v_section, v_season, 0, 'mock_' || r.code, 'paid') on conflict do nothing;
    insert into ads (section_id, season_id, owner_id, brand, kind, headline, url, image_url, bg, fg, status)
    values (v_section, v_season, v_me,
      case r.code when 'F-01' then 'FutureXRP' else 'Blair Labs' end,
      case r.code when 'F-01' then 'XRP news and tools' else 'Indie software' end,
      case r.code when 'F-01' then 'The ledger never sleeps. Neither do we.' else 'Small tools. Sharp edges.' end,
      'https://example.com/',
      case r.code when 'F-01' then 'https://picsum.photos/seed/futurexrp/960/540' else 'https://picsum.photos/seed/blair-labs/960/540' end,
      case r.code when 'F-01' then '#0B1D3A' else '#F4F1EA' end,
      case r.code when 'F-01' then '#C6F432' else '#1A1A1A' end, 'live')
    on conflict (section_id) do nothing;
  end loop;

  -- Sixteen fake advertisers. The last four claimed after the midpoint (newcomers).
  i := 0;
  for r in select * from (values
    ('F-02','Nimbus Coffee','Specialty roasters','Wake up on the right side of the cup.','#2B1B12','#FFE8C2', 90),
    ('F-03','Orbit Fitness','Gyms and classes','Gravity is a suggestion.','#101828','#7DF9FF', 80),
    ('F-04','Paper Trail','Bookkeeping app','Receipts in. Calm out.','#F7F7F2','#1F2937', 70),
    ('F-05','Kelp & Co','Plant-based snacks','Snacks from the deep end.','#0E3B2E','#D9F99D', 75),
    ('L-02','Lantern Legal','Online legal help','We read the fine print so you never have to.','#1F1F1F','#F5D90A', 60),
    ('L-03','Hollow Oak','Furniture makers','Furniture your grandkids will argue over.','#3B2F2F','#F2E8DC', 65),
    ('L-04','Pixel Pantry','Meal-kit delivery','Dinner, solved by Tuesday.','#FFFFFF','#B91C1C', 55),
    ('L-05','Tidewater','Travel booking','Go where the map goes quiet.','#0B3954','#BFD7EA', 50),
    ('L-06','Sprocket','Bike repair','Fixed by Friday. Guaranteed.','#1C1C1C','#FF7A00', 45),
    ('L-07','Mossbank','Personal finance','Get rich the boring way.','#0F2A1D','#E0F2E9', 85),
    ('U-001','Quill','Writing assistant','Say it once. Say it well.','#2E1065','#EDE9FE', 40),
    ('U-002','Bramble','Gardening supplies','Dirt, with ambition.','#14532D','#FEF3C7', 35),
    ('U-003','Halo Audio','Headphones','Hear the room leave.','#111111','#E5E5E5', 95),
    ('U-004','Firefly Tutors','Online tutoring','Lights on for the hard subjects.','#FFFBEB','#7C2D12', 30),
    ('U-005','Northstar Pets','Pet insurance','Insurance for the one who cannot read the bill.','#1E3A8A','#DBEAFE', 25),
    ('U-006','Crumb','Bakery subscription','Bread arrives. Day improves.','#FDF2F8','#831843', 60)
  ) t(code, brand, kind, headline, bg, fg, str) loop
    i := i + 1;
    select id into v_owner from auth.users where email = format('advertiser%s@mock.arena', i);
    select id into v_section from sections where season_id = v_season and code = r.code;
    update sections set owner_id = v_owner,
           claimed_at = case when i > 12 then now() - interval '4 days' else now() - interval '36 days' end,
           held_by = null, held_until = null
     where id = v_section;
    insert into orders (user_id, section_id, season_id, amount_cents, stripe_session_id, status)
    select v_owner, v_section, v_season,
           case s.tier when 'field' then se.price_field_cents when 'lower' then se.price_lower_cents else se.price_upper_cents end,
           'mock_' || r.code, 'paid'
      from sections s join seasons se on se.id = s.season_id where s.id = v_section
    on conflict do nothing;
    insert into ads (section_id, season_id, owner_id, brand, kind, headline, url, image_url, bg, fg, status, visits, clicks)
    values (v_section, v_season, v_owner, r.brand, r.kind, r.headline, 'https://example.com/' || lower(r.brand),
            'https://picsum.photos/seed/' || regexp_replace(lower(r.brand), '[^a-z0-9]+', '-', 'g') || '/960/540',
            r.bg, r.fg, 'live',
            (random() * 400)::int + 20, (random() * 60)::int + 2)
    on conflict (section_id) do nothing;
  end loop;

  -- Hidden strength per live ad. Yours are 70 and 50.
  select array_agg(a.id order by a.id), array_agg(
           case a.brand when 'FutureXRP' then 70 when 'Blair Labs' then 50 else coalesce(m.str, 50) end order by a.id)
    into ads, strength
    from ads a
    left join (values
      ('Nimbus Coffee',90),('Orbit Fitness',80),('Paper Trail',70),('Kelp & Co',75),('Lantern Legal',60),
      ('Hollow Oak',65),('Pixel Pantry',55),('Tidewater',50),('Sprocket',45),('Mossbank',85),('Quill',40),
      ('Bramble',35),('Halo Audio',95),('Firefly Tutors',30),('Northstar Pets',25),('Crumb',60)
    ) m(brand, str) on m.brand = a.brand
   where a.season_id = v_season and a.status = 'live';
  n := array_length(ads, 1);

  select array_agg(id) into voters from auth.users where email like 'voter%@mock.arena';

  -- ~1,200 decided matchups spread over the last 30 days. Voters never judge
  -- their own ad (fake voters own nothing), and no pair repeats per voter/category.
  for i in 1..1200 loop
    v_a := ads[1 + floor(random() * n)];
    v_b := ads[1 + floor(random() * n)];
    continue when v_a = v_b;
    v_cat := case when random() < 0.5 then 'ad' else 'platform' end;
    v_voter := voters[1 + floor(random() * array_length(voters, 1))];
    continue when exists (select 1 from matchups where voter_id = v_voter and category = v_cat
                            and ((ad_a = v_a and ad_b = v_b) or (ad_a = v_b and ad_b = v_a)));
    v_sa := strength[array_position(ads, v_a)];
    v_sb := strength[array_position(ads, v_b)];
    v_when := now() - (random() * interval '30 days') - interval '1 hour';
    insert into matchups (season_id, voter_id, category, ad_a, ad_b, winner_ad, skipped, created_at, decided_at)
    values (v_season, v_voter, v_cat, v_a, v_b,
            case when random() < 0.08 then null
                 when random() * (v_sa + v_sb) < v_sa then v_a else v_b end,
            false, v_when, v_when + interval '20 seconds');
    update matchups set skipped = (winner_ad is null) where season_id = v_season and skipped = false and winner_ad is null;
  end loop;

  raise notice 'Mock season ready: % live ads, % decided matchups.', n,
    (select count(*) from matchups where season_id = v_season and decided_at is not null);
end $$;

-- ---------------------------------------------------------------------------
-- RESET: remove everything the mock created and return to a fresh Season 1.
-- Uncomment and run when you are done testing.
-- ---------------------------------------------------------------------------
-- delete from matchups;
-- delete from final_votes;
-- delete from orders;
-- delete from ads;
-- update sections set owner_id = null, claimed_at = null, held_by = null, held_until = null;
-- delete from auth.users where email like '%@mock.arena';
-- update seasons set starts_at = now(), ends_at = now() + interval '60 days', phase = 'open',
--        prize_ad_xrp = 0, prize_platform_xrp = 0, prize_newcomer_xrp = 0 where is_current;
