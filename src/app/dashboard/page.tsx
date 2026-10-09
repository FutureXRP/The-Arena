import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMyAds, getSeason, getSections } from '@/lib/data';
import { getUser, isConfigured } from '@/lib/supabase/server';
import { AdEditor } from './AdEditor';

export const metadata: Metadata = { title: 'My sections' };
export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  if (!isConfigured()) redirect('/');
  const user = await getUser();
  if (!user) redirect('/login?next=/dashboard');

  const sp = await searchParams;
  const season = await getSeason();
  const [ads, sections] = season
    ? await Promise.all([getMyAds(season.id, user.id), getSections(season.id)])
    : [[], []];
  const codes = new Map(sections.map((s) => [s.id, s.code]));

  return (
    <main className="narrow stack">
      <h1 className="h1">My sections</h1>
      {sp.paid && ads.length === 0 && (
        <div className="notice">Payment received. Your section will appear here in a few seconds. Refresh the page.</div>
      )}
      {ads.length === 0 && !sp.paid && (
        <p className="muted">
          You have no sections this season. <Link href="/claim">Claim one</Link> to enter the competition.
        </p>
      )}
      {ads.map((ad) => (
        <AdEditor key={ad.id} ad={ad} sectionCode={codes.get(ad.section_id) ?? ''} />
      ))}
    </main>
  );
}
