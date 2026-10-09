'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { QUESTIONS, type MatchCategory } from '@/lib/config';
import type { PublicAd } from '@/lib/data';
import { AdCard } from './AdCard';

type Matchup =
  | { state: 'loading' | 'closed' | 'empty' | 'error' }
  | { state: 'done'; voted: number }
  | { state: 'preview'; category: MatchCategory; a: PublicAd; b: PublicAd }
  | { state: 'vote'; id: string; category: MatchCategory; a: PublicAd; b: PublicAd; voted: number };

export function VotePanel() {
  const [m, setM] = useState<Matchup>({ state: 'loading' });
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/matchup', { cache: 'no-store' });
      setM(await res.json());
    } catch {
      setM({ state: 'error' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(winner: PublicAd | null) {
    if (m.state !== 'vote' || busy) return;
    setBusy(true);
    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ matchupId: m.id, winner: winner ? winner.id : null }),
      });
      setLast(winner ? winner.brand : '');
      await load();
    } finally {
      setBusy(false);
    }
  }

  const hasPair = m.state === 'vote' || m.state === 'preview';
  const category: MatchCategory = hasPair ? m.category : 'ad';

  return (
    <section id="vote" className="vote">
      <div className="vote-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {category === 'ad' ? 'Best Ad' : 'Best Platform'}
          </div>
          <h1 className="h1">{QUESTIONS[category]}</h1>
        </div>
        <p>Two ads, picked at random. Judge the ad, not the brand. Your vote moves the season standings.</p>
      </div>

      {m.state === 'loading' && <p className="muted">Loading the next matchup.</p>}
      {m.state === 'error' && <p className="error">Could not load a matchup. Refresh to try again.</p>}
      {m.state === 'closed' && <div className="notice">Voting is not open right now.</div>}
      {m.state === 'empty' && (
        <div className="notice">
          No ads to judge yet. <Link href="/claim">Claim a section</Link> and be the first in the pool.
        </div>
      )}
      {m.state === 'done' && (
        <div className="notice">
          No more matchups for you right now. You have judged {m.voted} this season. Check back tomorrow.
        </div>
      )}

      {hasPair && (
        <>
          <div className="pair">
            {[m.a, m.b].map((ad) => (
              <div className="slot" key={ad.id}>
                <AdCard ad={ad} />
                <div className="row between">
                  <a className="mono small" href={`/out/${ad.id}`} target="_blank" rel="noopener noreferrer nofollow">
                    Visit section {ad.sectionCode}
                  </a>
                  {m.state === 'vote' ? (
                    <button type="button" className="btn" disabled={busy} onClick={() => decide(ad)}>
                      Vote for this ad
                    </button>
                  ) : (
                    <Link className="btn" href="/login?next=/%23vote">Sign in to vote</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="vote-foot">
            <span aria-live="polite">
              {m.state === 'vote' && last ? (
                <>Vote counted for <strong>{last}</strong>. You have judged {m.voted} matchups this season.</>
              ) : (
                <>One vote per verified account. You never see a matchup that includes your own ad.</>
              )}
            </span>
            {m.state === 'vote' && (
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => decide(null)}>
                Skip this matchup
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
