# The Arena: project context

Ad-space competition. Advertisers buy a section per season, visitors judge ads head to head, section owners vote in
the final, winners get a fixed XRP prize. See README.md for setup and season operations.

## Architecture

- Next.js App Router, TypeScript, plain CSS in `src/app/globals.css` (tokens on `:root`, no Tailwind).
- Supabase: magic-link auth through `@supabase/ssr`; all table access through the service role client `db()` in
  `src/lib/supabase/server.ts`. RLS is on with no policies, so never query tables from the browser.
- Stripe Checkout for section purchases. The webhook (`/api/stripe/webhook`) is the only thing that assigns a section.
- Game rules that must be atomic live in Postgres functions under `supabase/migrations/` (0001 defines them, later files replace some):
  `hold_section`, `complete_order`, `expire_order`, `next_matchup`, `cast_vote`, `bump_visit`, `bump_click`.

## Rules to keep

- Integer math for money and rankings: cents, whole XRP, win rate in basis points. No floats.
- Prices and prizes come from the `seasons` row, never from the client and never hard-coded.
- The voter never chooses a matchup pair. Votes are never weighted by spend and never for sale.
- Prizes are fixed per season, not a share of sales. Never describe sections as investments.
- Client components may import from `src/lib/config.ts` and types only from `src/lib/data.ts`.
- New schema changes go in a new numbered file under `supabase/migrations/`.

## Not built yet

XRP section payments, admin screen, ad images, ad moderation queue, CAPTCHA or stronger voter verification,
automated season rollover, results page.
