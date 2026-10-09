import { NextResponse } from 'next/server';
import { DAILY_MATCHUP_CAP } from '@/lib/config';
import { getAdsByIds, getLiveAds, getSeason, toPublic, type Ad, type PublicAd } from '@/lib/data';
import { db, getUser, isConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function publicAds(ads: Ad[]): Promise<Map<string, PublicAd>> {
  const { data, error } = await db()
    .from('sections')
    .select('id, code')
    .in('id', ads.map((a) => a.section_id));
  if (error) throw new Error(error.message);
  const codes = new Map((data ?? []).map((s) => [s.id as string, s.code as string]));
  return new Map(ads.map((a) => [a.id, toPublic(a, codes.get(a.section_id) ?? '')]));
}

export async function GET() {
  if (!isConfigured()) return NextResponse.json({ state: 'closed' });
  const season = await getSeason();
  if (!season || season.phase !== 'open') return NextResponse.json({ state: 'closed' });

  const user = await getUser();

  // Signed-out visitors see a real pair but cannot vote on it.
  if (!user) {
    const live = await getLiveAds(season.id);
    if (live.length < 2) return NextResponse.json({ state: 'empty' });
    const i = Math.floor(Math.random() * live.length);
    let j = Math.floor(Math.random() * (live.length - 1));
    if (j >= i) j += 1;
    const map = await publicAds([live[i], live[j]]);
    return NextResponse.json({ state: 'preview', category: 'ad', a: map.get(live[i].id), b: map.get(live[j].id) });
  }

  const { data, error } = await db().rpc('next_matchup', {
    p_user: user.id,
    p_season: season.id,
    p_daily_cap: DAILY_MATCHUP_CAP,
  });
  if (error) return NextResponse.json({ state: 'error' }, { status: 500 });

  const { count } = await db()
    .from('matchups')
    .select('id', { count: 'exact', head: true })
    .eq('voter_id', user.id)
    .eq('season_id', season.id)
    .not('winner_ad', 'is', null);

  const m = Array.isArray(data) ? data[0] : null;
  if (!m) return NextResponse.json({ state: 'done', voted: count ?? 0 });

  const ads = await getAdsByIds([m.ad_a, m.ad_b]);
  const map = await publicAds(ads);
  const a = map.get(m.ad_a);
  const b = map.get(m.ad_b);
  if (!a || !b) return NextResponse.json({ state: 'done', voted: count ?? 0 });

  return NextResponse.json({ state: 'vote', id: m.id, category: m.category, a, b, voted: count ?? 0 });
}
