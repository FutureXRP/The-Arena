import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TIERS } from '@/lib/config';
import { getSeason, getSections, isOpen, priceFor } from '@/lib/data';
import { getUser, isConfigured } from '@/lib/supabase/server';
import { ClaimPicker } from './ClaimPicker';

export const metadata: Metadata = { title: 'Claim a section' };
export const dynamic = 'force-dynamic';

export default async function ClaimPage() {
  if (!isConfigured()) redirect('/');
  const user = await getUser();
  if (!user) redirect('/login?next=/claim');

  const season = await getSeason();
  if (!season || season.phase !== 'open') {
    return (
      <main className="narrow stack">
        <h1 className="h2">Sections are not on sale right now</h1>
        <p className="muted">New sections open when the next season starts.</p>
      </main>
    );
  }

  const sections = await getSections(season.id);
  const tiers = TIERS.map((t) => ({
    ...t,
    priceCents: priceFor(season, t.id),
    sections: sections
      .filter((s) => s.tier === t.id)
      .map((s) => ({ id: s.id, code: s.code, open: isOpen(s, user.id) })),
  }));

  return (
    <main className="narrow stack">
      <h1 className="h1">Claim a section</h1>
      <p className="muted">
        Pick an open section for {season.name}. After payment you build your ad, and it enters the matchup pool as
        soon as you publish it.
      </p>
      <ClaimPicker tiers={tiers} />
    </main>
  );
}
