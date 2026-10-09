-- Season 1 seed. EDIT BEFORE RUNNING:
--   * starts_at / ends_at
--   * prize_*_xrp   (0 shows as "TBA" on the site)
--   * price_*_cents (the values below are PLACEHOLDERS, not a pricing recommendation)

with s as (
  insert into seasons (
    name, starts_at, ends_at, phase, is_current,
    prize_ad_xrp, prize_platform_xrp, prize_newcomer_xrp,
    price_field_cents, price_lower_cents, price_upper_cents
  ) values (
    'Season 1', now(), now() + interval '60 days', 'open', true,
    0, 0, 0,
    25000, 10000, 2500
  )
  returning id
)
insert into sections (season_id, code, tier, position)
select s.id, 'F-' || lpad(n::text, 2, '0'), 'field', n from s, generate_series(1, 12) n
union all
select s.id, 'L-' || lpad(n::text, 2, '0'), 'lower', n from s, generate_series(1, 48) n
union all
select s.id, 'U-' || lpad(n::text, 3, '0'), 'upper', n from s, generate_series(1, 120) n;
