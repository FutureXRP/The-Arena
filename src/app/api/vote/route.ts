import { NextResponse } from 'next/server';
import { db, getUser } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to vote.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const matchupId = body?.matchupId;
  const winner = body?.winner ?? null;
  if (!isUuid(matchupId) || (winner !== null && !isUuid(winner))) {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  // The database checks that this matchup was dealt to this voter, is still
  // undecided, and that the winner is one of its two ads.
  const { data, error } = await db().rpc('cast_vote', {
    p_matchup: matchupId,
    p_user: user.id,
    p_winner: winner,
  });
  if (error) return NextResponse.json({ error: 'Could not record the vote.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'That matchup is no longer open.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
