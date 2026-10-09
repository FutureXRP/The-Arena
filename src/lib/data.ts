import { db } from './supabase/server';
import { FINALIST_COUNT, MIN_JUDGED, type MatchCategory, type PrizeCategory, type Tier } from './config';

export type Season = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  phase: 'open' | 'finals' | 'closed';
  prize_ad_xrp: number;
  prize_platform_xrp: number;
  prize_newcomer_xrp: number;
  price_field_cents: number;
  price_lower_cents: number;
  price_upper_cents: number;
};

export type Section = {
  id: string;
  code: string;
  tier: Tier;
  position: number;
  owner_id: string | null;
  claimed_at: string | null;
  held_by: string | null;
  held_until: string | null;
};

export type Ad = {
  id: string;
  section_id: string;
  owner_id: string;
  brand: string;
  kind: string;
  headline: string;
  url: string;
  image_url: string;
  bg: string;
  fg: string;
  status: 'draft' | 'live' | 'hidden';
  visits: number;
  clicks: number;
};

// What the browser is allowed to see of an ad.
export type PublicAd = {
  id: string;
  brand: string;
  kind: string;
  headline: string;
  imageUrl: string;
  bg: string;
  fg: string;
  sectionCode: string;
};

export type StandingRow = PublicAd & { ownerId: string; wins: number; judged: number; winBp: number };
export type Standings = Record<PrizeCategory, StandingRow[]>;

const AD_COLS = 'id, section_id, owner_id, brand, kind, headline, url, image_url, bg, fg, status, visits, clicks';

export async function getSeason(): Promise<Season | null> {
  const { data, error } = await db().from('seasons').select('*').eq('is_current', true).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Season | null;
}

export async function getSections(seasonId: string): Promise<Section[]> {
  const { data, error } = await db()
    .from('sections')
    .select('id, code, tier, position, owner_id, claimed_at, held_by, held_until')
    .eq('season_id', seasonId)
    .order('position');
  if (error) throw new Error(error.message);
  return (data ?? []) as Section[];
}

export function priceFor(season: Season, tier: Tier): number {
  if (tier === 'field') return season.price_field_cents;
  if (tier === 'lower') return season.price_lower_cents;
  return season.price_upper_cents;
}

export function isOpen(section: Section, userId?: string): boolean {
  if (section.owner_id) return false;
  if (!section.held_until) return true;
  if (new Date(section.held_until).getTime() < Date.now()) return true;
  return section.held_by === userId;
}

export function toPublic(ad: Ad, sectionCode: string): PublicAd {
  return {
    id: ad.id,
    brand: ad.brand,
    kind: ad.kind,
    headline: ad.headline,
    imageUrl: ad.image_url,
    bg: ad.bg,
    fg: ad.fg,
    sectionCode,
  };
}

export async function getLiveAds(seasonId: string): Promise<Ad[]> {
  const { data, error } = await db().from('ads').select(AD_COLS).eq('season_id', seasonId).eq('status', 'live');
  if (error) throw new Error(error.message);
  return (data ?? []) as Ad[];
}

export async function getAdsByIds(ids: string[]): Promise<Ad[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db().from('ads').select(AD_COLS).in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as Ad[];
}

export async function getMyAds(seasonId: string, userId: string): Promise<Ad[]> {
  const { data, error } = await db().from('ads').select(AD_COLS).eq('season_id', seasonId).eq('owner_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Ad[];
}

function rank(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    const ap = a.judged >= MIN_JUDGED ? 1 : 0;
    const bp = b.judged >= MIN_JUDGED ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (a.winBp !== b.winBp) return b.winBp - a.winBp;
    if (a.wins !== b.wins) return b.wins - a.wins;
    return a.id < b.id ? -1 : 1;
  });
}

// Newcomer = a section claimed in the second half of the season, ranked on Best Ad votes.
export async function getStandings(season: Season, sections: Section[]): Promise<Standings> {
  const [ads, res] = await Promise.all([
    getLiveAds(season.id),
    db().from('standings').select('category, ad_id, wins, judged, win_bp').eq('season_id', season.id),
  ]);
  if (res.error) throw new Error(res.error.message);

  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const adById = new Map(ads.map((a) => [a.id, a]));
  const midpoint = (new Date(season.starts_at).getTime() + new Date(season.ends_at).getTime()) / 2;

  const out: Standings = { ad: [], platform: [], newcomer: [] };
  for (const r of res.data ?? []) {
    const ad = adById.get(r.ad_id as string);
    if (!ad) continue;
    const section = sectionById.get(ad.section_id);
    if (!section) continue;
    const row: StandingRow = {
      ...toPublic(ad, section.code),
      ownerId: ad.owner_id,
      wins: r.wins as number,
      judged: r.judged as number,
      winBp: r.win_bp as number,
    };
    const cat = r.category as MatchCategory;
    out[cat].push(row);
    if (cat === 'ad' && section.claimed_at && new Date(section.claimed_at).getTime() > midpoint) {
      out.newcomer.push(row);
    }
  }
  out.ad = rank(out.ad);
  out.platform = rank(out.platform);
  out.newcomer = rank(out.newcomer);
  return out;
}

export function finalists(standings: Standings): Standings {
  return {
    ad: standings.ad.slice(0, FINALIST_COUNT),
    platform: standings.platform.slice(0, FINALIST_COUNT),
    newcomer: standings.newcomer.slice(0, FINALIST_COUNT),
  };
}
