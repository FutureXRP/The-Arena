import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdCard } from '@/components/AdCard';
import { getSeason, type Ad } from '@/lib/data';
import { db, isConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function load(code: string): Promise<{ ad: Ad; code: string } | null> {
  if (!isConfigured() || !/^[A-Za-z]-\d{2,3}$/.test(code)) return null;
  const season = await getSeason();
  if (!season) return null;
  const { data: section } = await db()
    .from('sections')
    .select('id, code')
    .eq('season_id', season.id)
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (!section) return null;
  const { data: ad } = await db()
    .from('ads')
    .select('id, section_id, owner_id, brand, kind, headline, url, image_url, bg, fg, status, visits, clicks')
    .eq('section_id', section.id)
    .eq('status', 'live')
    .maybeSingle();
  if (!ad) return null;
  return { ad: ad as Ad, code: section.code as string };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const found = await load((await params).code);
  return found ? { title: `${found.ad.brand}, section ${found.code}`, description: found.ad.headline } : {};
}

export default async function SectionPage({ params }: { params: Promise<{ code: string }> }) {
  const found = await load((await params).code);
  if (!found) notFound();
  const { ad, code } = found;
  await db().rpc('bump_visit', { p_ad: ad.id });

  return (
    <main className="narrow stack">
      <div className="eyebrow">Section {code}</div>
      <AdCard ad={ad} image={ad.image_url} />
      <div className="row between">
        <div className="stats">
          <span>Visits <b>{ad.visits + 1}</b></span>
          <span>Outbound clicks <b>{ad.clicks}</b></span>
        </div>
        <a className="btn" href={`/out/${ad.id}`} rel="noopener noreferrer nofollow">Visit {ad.brand}</a>
      </div>
      <p className="muted">
        Think this ad deserves to win? <Link href="/#vote">Judge the matchups</Link> and move the standings.
      </p>
    </main>
  );
}
