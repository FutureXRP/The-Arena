'use client';

import { useState } from 'react';
import { formatUsd } from '@/lib/config';

type TierView = {
  id: string;
  label: string;
  blurb: string;
  priceCents: number;
  sections: { id: string; code: string; open: boolean }[];
};

export function ClaimPicker({ tiers }: { tiers: TierView[] }) {
  const [selected, setSelected] = useState<{ id: string; code: string; tier: TierView } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function checkout() {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sectionId: selected.id }),
      });
      const body = await res.json();
      if (res.ok && body.url) {
        window.location.href = body.url;
        return;
      }
      setError(body.error ?? 'Could not start checkout.');
    } catch {
      setError('Could not start checkout.');
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      {tiers.map((t) => (
        <div className="panel" key={t.id}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <div>
              <b>{t.label}</b>
              <div className="small muted">{t.blurb}. {t.sections.filter((s) => s.open).length} open.</div>
            </div>
            <div className="mono" style={{ fontWeight: 600 }}>{formatUsd(t.priceCents)}</div>
          </div>
          <div className="map">
            {t.sections.map((s) =>
              s.open ? (
                <button
                  key={s.id}
                  type="button"
                  className={selected?.id === s.id ? 'cell pick selected' : 'cell pick'}
                  aria-label={`Section ${s.code}, open`}
                  aria-pressed={selected?.id === s.id}
                  title={s.code}
                  onClick={() => setSelected({ id: s.id, code: s.code, tier: t })}
                />
              ) : (
                <span key={s.id} className="cell claimed" title={`${s.code} (taken)`} />
              ),
            )}
          </div>
        </div>
      ))}

      <div className="panel stack" aria-live="polite">
        {selected ? (
          <div className="row between">
            <div>
              <b>Section {selected.code}</b>
              <div className="small muted">{selected.tier.label}</div>
            </div>
            <div className="mono" style={{ fontWeight: 600 }}>{formatUsd(selected.tier.priceCents)}</div>
          </div>
        ) : (
          <p className="muted">Select an open square above.</p>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="button" className="btn btn-block" disabled={!selected || busy} onClick={checkout}>
          {busy ? 'Opening checkout' : 'Continue to payment'}
        </button>
        <p className="small muted">Your section is held for 30 minutes while you pay. Payment is by card through Stripe.</p>
      </div>
    </div>
  );
}
