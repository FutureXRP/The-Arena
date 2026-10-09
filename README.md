# The Arena

Advertisers buy a section for the season and build an ad. Visitors judge ads two at a time. The top five in each
category go to a final vote by section owners, and the winners are paid a fixed XRP prize.

Stack: Next.js (App Router), Supabase (auth + Postgres), Stripe Checkout, Vercel.

## Setup

1. **Supabase.** Create a project. In the SQL editor run each file in `supabase/migrations/` in order, then edit and run
   `supabase/seed.sql` (dates, prizes and section prices are placeholders).
2. **Supabase auth.** Authentication > URL configuration: set the Site URL to your domain and add
   `https://YOUR_DOMAIN/auth/callback` (and `http://localhost:3000/auth/callback`) to the redirect URLs.
3. **Stripe.** Add a webhook endpoint at `https://YOUR_DOMAIN/api/stripe/webhook` listening for
   `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` and
   `checkout.session.async_payment_failed`.
4. **Env.** Copy `.env.example` to `.env.local` and fill it in. Add the same variables in Vercel.
5. `npm install && npm run dev`

Local webhook testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Running a season

There is no admin screen yet. These are done in the Supabase table editor:

| Task | How |
| --- | --- |
| Set prizes, prices, dates | Edit the current row in `seasons` |
| Start the final | Set `seasons.phase` to `finals` |
| End the season | Set `seasons.phase` to `closed` |
| Pull an ad | Set `ads.status` to `hidden` |
| Final results | Count rows in `final_votes` by `category`, `ad_id` |
| Refund a double sale | Orders with `status = 'conflict'` were paid but lost the section. Refund in Stripe |

XRP prizes are paid by hand at season end. Section payments are card-only through Stripe for now.

## How voting is protected

- The server deals each matchup (`next_matchup` in Postgres). A vote is only accepted for a matchup that was dealt
  to that voter, is still open, and names one of its two ads.
- One open matchup per voter, so reloading does not re-roll the pair.
- A voter never gets a pair containing their own ad.
- Daily cap per account (`DAILY_MATCHUP_CAP` in `src/lib/config.ts`). Skips count toward it.
- Rank is win rate in integer basis points, with a minimum number of judged matchups (`MIN_JUDGED`).
- Every table has RLS on with no policies. The browser never reads or writes tables directly.

Known gap: accounts are email magic links, so one person with many inboxes can still make many accounts. Turn on
Supabase CAPTCHA and consider phone or wallet verification before real prizes are attached.

## Before launch

- Have a promotions attorney review the official rules. `/rules` is a draft that describes the software.
- Set the real prizes and prices in `seasons`.
- Ad copy is not reviewed before it goes live. Decide whether to moderate first.
