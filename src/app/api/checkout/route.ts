import { NextResponse } from 'next/server';
import { SITE_NAME, TIERS, siteUrl } from '@/lib/config';
import { getSeason, priceFor, type Section } from '@/lib/data';
import { stripe } from '@/lib/stripe';
import { db, getUser } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!isUuid(body?.sectionId)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const season = await getSeason();
  if (!season || season.phase !== 'open') {
    return NextResponse.json({ error: 'Sections are not on sale right now.' }, { status: 409 });
  }

  const { data: section } = await db()
    .from('sections')
    .select('id, code, tier, season_id')
    .eq('id', body.sectionId)
    .eq('season_id', season.id)
    .maybeSingle();
  if (!section) return NextResponse.json({ error: 'Section not found.' }, { status: 404 });

  const { data: held, error: holdError } = await db().rpc('hold_section', {
    p_section: section.id,
    p_user: user.id,
  });
  if (holdError) return NextResponse.json({ error: 'Could not reserve the section.' }, { status: 500 });
  if (!held) return NextResponse.json({ error: 'That section was just taken. Pick another.' }, { status: 409 });

  // The price always comes from the season row, never from the browser.
  const tier = (section as Pick<Section, 'tier'>).tier;
  const amount = priceFor(season, tier);
  const tierLabel = TIERS.find((t) => t.id === tier)?.label ?? tier;

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: { name: `${SITE_NAME} section ${section.code}`, description: `${tierLabel}, ${season.name}` },
        },
      },
    ],
    metadata: { section_id: section.id, user_id: user.id, season_id: season.id },
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    success_url: `${siteUrl()}/dashboard?paid=1`,
    cancel_url: `${siteUrl()}/claim`,
  });

  const { error } = await db().from('orders').insert({
    user_id: user.id,
    section_id: section.id,
    season_id: season.id,
    amount_cents: amount,
    stripe_session_id: session.id,
  });
  if (error || !session.url) {
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
