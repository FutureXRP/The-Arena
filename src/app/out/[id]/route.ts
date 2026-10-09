import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/config';
import { db } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

// Counts an outbound click, then sends the visitor to the advertiser.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.redirect(siteUrl());

  const { data } = await db().from('ads').select('url, status').eq('id', id).maybeSingle();
  if (!data || data.status !== 'live' || !data.url.startsWith('https://')) {
    return NextResponse.redirect(siteUrl());
  }
  await db().rpc('bump_click', { p_ad: id });
  return NextResponse.redirect(data.url, 302);
}
