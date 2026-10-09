import { NextResponse } from 'next/server';
import { db, getUser } from '@/lib/supabase/server';
import { cleanAd, isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!isUuid(body?.adId)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const checked = cleanAd(body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  // An admin-hidden ad stays hidden; everything else goes live once it is complete.
  const { data, error } = await db()
    .from('ads')
    .update({ ...checked.ad, updated_at: new Date().toISOString() })
    .eq('id', body.adId)
    .eq('owner_id', user.id)
    .select('id, status')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Ad not found.' }, { status: 404 });

  if (data.status === 'draft') {
    await db().from('ads').update({ status: 'live' }).eq('id', data.id).eq('status', 'draft');
  }
  return NextResponse.json({ ok: true, status: data.status === 'hidden' ? 'hidden' : 'live' });
}
