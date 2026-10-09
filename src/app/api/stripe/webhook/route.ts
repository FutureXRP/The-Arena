import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'Not configured.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'Bad signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid') {
      const { data, error } = await db().rpc('complete_order', { p_session: session.id });
      if (error) return NextResponse.json({ error: 'Database error.' }, { status: 500 });
      if (data === 'conflict') console.error(`Order conflict, refund needed: ${session.id}`);
    }
  }

  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { error } = await db().rpc('expire_order', { p_session: session.id });
    if (error) return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
