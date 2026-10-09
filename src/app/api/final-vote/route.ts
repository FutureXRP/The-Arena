import { NextResponse } from 'next/server';
import { PRIZE_CATEGORIES } from '@/lib/config';
import { finalists, getSeason, getSections, getStandings } from '@/lib/data';
import { db, getUser } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to vote.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const category = PRIZE_CATEGORIES.find((c) => c.id === body?.category)?.id;
  const adId = body?.adId;
  if (!category || !isUuid(adId)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const season = await getSeason();
  if (!season || season.phase !== 'finals') {
    return NextResponse.json({ error: 'The final vote is not open.' }, { status: 409 });
  }

  const sections = await getSections(season.id);
  if (!sections.some((s) => s.owner_id === user.id)) {
    return NextResponse.json({ error: 'Only section owners vote in the final.' }, { status: 403 });
  }

  const top = finalists(await getStandings(season, sections))[category];
  const pick = top.find((r) => r.id === adId);
  if (!pick) return NextResponse.json({ error: 'That ad is not a finalist.' }, { status: 400 });
  if (pick.ownerId === user.id) {
    return NextResponse.json({ error: 'You cannot vote for your own ad.' }, { status: 403 });
  }

  const { error } = await db()
    .from('final_votes')
    .upsert({ season_id: season.id, voter_id: user.id, category, ad_id: adId });
  if (error) return NextResponse.json({ error: 'Could not record the vote.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
