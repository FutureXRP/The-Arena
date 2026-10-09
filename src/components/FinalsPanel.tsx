'use client';

import { useState } from 'react';
import { PRIZE_CATEGORIES, type PrizeCategory } from '@/lib/config';
import type { PublicAd } from '@/lib/data';
import { AdCard } from './AdCard';

type Props = {
  finalists: Record<PrizeCategory, (PublicAd & { mine: boolean })[]>;
  initialPicks: Partial<Record<PrizeCategory, string>>;
  canVote: boolean;
};

export function FinalsPanel({ finalists, initialPicks, canVote }: Props) {
  const [picks, setPicks] = useState(initialPicks);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pick(category: PrizeCategory, adId: string) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/final-vote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category, adId }),
      });
      const body = await res.json();
      if (!res.ok) setError(body.error ?? 'Could not record the vote.');
      else setPicks((p) => ({ ...p, [category]: adId }));
    } catch {
      setError('Could not record the vote.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="vote" className="vote">
      <div className="vote-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>The final</div>
          <h1 className="h1">Section owners pick the winners</h1>
        </div>
        <p>
          The crowd chose the top five in each category. Every section owner now gets one vote per category, and
          cannot vote for their own ad.
        </p>
      </div>
      {!canVote && <div className="notice">Only section owners vote in the final. Results post when it closes.</div>}
      {error && <p className="error" role="alert">{error}</p>}
      {PRIZE_CATEGORIES.map((c) => (
        <div key={c.id} style={{ marginTop: 32 }}>
          <h2 className="h2" style={{ marginBottom: 16 }}>{c.label}</h2>
          {finalists[c.id].length === 0 ? (
            <p className="muted">No finalists in this category.</p>
          ) : (
            <div className="pair">
              {finalists[c.id].map((ad) => (
                <div className="slot" key={ad.id}>
                  <AdCard ad={ad} image={ad.imageUrl} compact />
                  <div className="row between">
                    <span className="mono small muted">Section {ad.sectionCode}</span>
                    {canVote && !ad.mine && (
                      <button
                        type="button"
                        className={picks[c.id] === ad.id ? 'btn' : 'btn btn-ghost'}
                        disabled={busy}
                        aria-pressed={picks[c.id] === ad.id}
                        onClick={() => pick(c.id, ad.id)}
                      >
                        {picks[c.id] === ad.id ? 'Your pick' : 'Pick this one'}
                      </button>
                    )}
                    {ad.mine && <span className="small muted">Your ad</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
