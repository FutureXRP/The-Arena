import Link from 'next/link';
import { FinalsPanel } from '@/components/FinalsPanel';
import { StandingsTabs } from '@/components/StandingsTabs';
import { VotePanel } from '@/components/VotePanel';
import { PRIZE_CATEGORIES, TIERS, formatPrize, formatUsd, type PrizeCategory } from '@/lib/config';
import { finalists, getSeason, getSections, getStandings, isOpen, priceFor } from '@/lib/data';
import { db, getUser, isConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default async function Home() {
  if (!isConfigured()) {
    return (
      <main className="narrow stack">
        <h1 className="h2">Setup needed</h1>
        <p className="muted">Add the Supabase and Stripe keys from .env.example, then run the migration and seed.</p>
      </main>
    );
  }

  const season = await getSeason();
  if (!season) {
    return (
      <main className="narrow stack">
        <h1 className="h2">No season is running</h1>
        <p className="muted">Run supabase/seed.sql to create the first season.</p>
      </main>
    );
  }

  const [sections, user] = await Promise.all([getSections(season.id), getUser()]);
  const standings = await getStandings(season, sections);
  const top = finalists(standings);
  const topCodes = new Set(top.ad.map((r) => r.sectionCode));

  const prizes: Record<PrizeCategory, number> = {
    ad: season.prize_ad_xrp,
    platform: season.prize_platform_xrp,
    newcomer: season.prize_newcomer_xrp,
  };

  let picks: Partial<Record<PrizeCategory, string>> = {};
  const ownsSection = Boolean(user && sections.some((s) => s.owner_id === user.id));
  if (season.phase === 'finals' && user) {
    const { data } = await db()
      .from('final_votes')
      .select('category, ad_id')
      .eq('season_id', season.id)
      .eq('voter_id', user.id);
    picks = Object.fromEntries((data ?? []).map((v) => [v.category, v.ad_id]));
  }

  const strip = (rows: typeof top.ad) =>
    rows.map(({ ownerId, wins, judged, winBp, ...ad }) => ({ ...ad, mine: Boolean(user && ownerId === user.id) }));

  return (
    <>
      <div className="prizes">
        <div className="wrap">
          <span className="label">{season.name} prizes</span>
          {PRIZE_CATEGORIES.map((c) => (
            <span key={c.id}>
              <span className="muted">{c.label}</span> <b>{formatPrize(prizes[c.id])}</b>
            </span>
          ))}
          <span className="muted">
            {season.phase === 'open' && `Voting closes ${formatDate(season.ends_at)}`}
            {season.phase === 'finals' && 'Final vote in progress'}
            {season.phase === 'closed' && 'Season complete'}
          </span>
        </div>
      </div>

      <main className="wrap">
        {season.phase === 'finals' ? (
          <FinalsPanel
            finalists={{ ad: strip(top.ad), platform: strip(top.platform), newcomer: strip(top.newcomer) }}
            initialPicks={picks}
            canVote={ownsSection}
          />
        ) : (
          <VotePanel />
        )}

        <div className="split">
          <section id="standings" className="main">
            <h2 className="h2">Season standings</h2>
            <StandingsTabs standings={standings} />
            <p className="small muted" style={{ marginTop: 16 }}>
              Community votes pick the top five. Section owners decide the winner among those finalists.
            </p>
          </section>

          <section id="sections" className="side">
            <h2 className="h2" style={{ marginBottom: 20 }}>Claim a section</h2>
            <div className="panel">
              {TIERS.map((t) => (
                <div key={t.id}>
                  <div className="tier-label" style={t.id === 'field' ? { marginTop: 0 } : undefined}>{t.label}</div>
                  <div className="map" aria-hidden="true">
                    {sections
                      .filter((s) => s.tier === t.id)
                      .map((s) => (
                        <span
                          key={s.id}
                          className={
                            topCodes.has(s.code) ? 'cell top' : s.owner_id ? 'cell claimed' : isOpen(s) ? 'cell' : 'cell held'
                          }
                        />
                      ))}
                  </div>
                </div>
              ))}
              <div className="legend">
                <span><i style={{ background: '#C6F432', borderColor: '#C6F432' }} />Top five</span>
                <span><i style={{ background: '#5B6B7D', borderColor: '#5B6B7D' }} />Claimed</span>
                <span><i />Open</span>
              </div>
              <div style={{ marginTop: 20 }}>
                {TIERS.map((t) => (
                  <div className="tier" key={t.id}>
                    <div>
                      <b>{t.label}</b>
                      <div className="small muted">
                        {t.blurb}. {sections.filter((s) => s.tier === t.id && isOpen(s)).length} open.
                      </div>
                    </div>
                    <div className="price">{formatUsd(priceFor(season, t.id))}</div>
                  </div>
                ))}
              </div>
              <Link className="btn btn-block" href="/claim" style={{ marginTop: 8 }}>Pick your section</Link>
              <p className="small muted" style={{ marginTop: 12 }}>Sections reset when the season ends.</p>
            </div>
          </section>
        </div>

        <section className="steps">
          <h2 className="h2">How a season works</h2>
          <div className="grid">
            <div>
              <div className="n">01</div>
              <h3>Claim and build</h3>
              <p>Buy a section, write your ad and add your link. Every section shows its visits and outbound clicks.</p>
            </div>
            <div>
              <div className="n">02</div>
              <h3>The crowd judges</h3>
              <p>Voters see two random ads at a time and pick one. Rankings come from win rate, not raw vote totals.</p>
            </div>
            <div>
              <div className="n">03</div>
              <h3>Winners get XRP</h3>
              <p>The top five go to a final vote by section owners. Prizes are fixed before the season starts.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
