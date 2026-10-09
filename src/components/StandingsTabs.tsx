'use client';

import { useState } from 'react';
import { PRIZE_CATEGORIES, bpToPercent, type PrizeCategory } from '@/lib/config';
import type { Standings } from '@/lib/data';

export function StandingsTabs({ standings }: { standings: Standings }) {
  const [tab, setTab] = useState<PrizeCategory>('ad');
  const rows = standings[tab].slice(0, 10);

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Prize category">
        {PRIZE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === c.id}
            onClick={() => setTab(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="muted">No votes counted in this category yet.</p>
      ) : (
        <div className="scroll-x">
          <div className="table">
            <div className="tr head">
              <div>Rank</div>
              <div>Advertiser</div>
              <div>Section</div>
              <div>Win rate</div>
            </div>
            {rows.map((r, i) => {
              const pct = bpToPercent(r.winBp);
              return (
                <div className="tr" key={r.id}>
                  <div className={i === 0 ? 'rank first' : 'rank'}>{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <a className="name" href={`/s/${r.sectionCode}`}>{r.brand}</a>
                    <div className="small muted">{r.judged} matchups judged</div>
                  </div>
                  <div className="mono muted" style={{ fontSize: 14 }}>{r.sectionCode}</div>
                  <div className="bar">
                    <div className="track"><div className="fill" style={{ width: `${pct}%` }} /></div>
                    <div className="pct">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
