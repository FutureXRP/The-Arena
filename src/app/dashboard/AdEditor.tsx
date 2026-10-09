'use client';

import { useState } from 'react';
import { AdCard } from '@/components/AdCard';
import { LIMITS } from '@/lib/config';
import type { Ad } from '@/lib/data';

export function AdEditor({ ad, sectionCode }: { ad: Ad; sectionCode: string }) {
  const [form, setForm] = useState({
    brand: ad.brand,
    kind: ad.kind,
    headline: ad.headline,
    url: ad.url,
    image_url: ad.image_url,
    bg: ad.bg,
    fg: ad.fg,
  });
  const [status, setStatus] = useState(ad.status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const uid = ad.id.slice(0, 8);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/ad', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adId: ad.id, ...form }),
      });
      const body = await res.json();
      if (res.ok) {
        setStatus(body.status);
        setMessage({ ok: true, text: body.status === 'live' ? 'Saved. Your ad is in the matchup pool.' : 'Saved.' });
      } else {
        setMessage({ ok: false, text: body.error ?? 'Could not save.' });
      }
    } catch {
      setMessage({ ok: false, text: 'Could not save.' });
    }
    setBusy(false);
  }

  return (
    <div className="panel stack">
      <div className="row between">
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Section {sectionCode}</h2>
        <span className="tag">
          {status === 'live' ? 'Live' : status === 'hidden' ? 'Hidden by admin' : 'Draft, not yet in the pool'}
        </span>
      </div>
      <div className="stats">
        <span>Visits <b>{ad.visits}</b></span>
        <span>Outbound clicks <b>{ad.clicks}</b></span>
        {status === 'live' && <a href={`/s/${sectionCode}`}>View public page</a>}
      </div>
      <div className="editor">
        <form className="stack" onSubmit={save}>
          <div className="field">
            <label htmlFor={`brand-${uid}`}>Brand name</label>
            <input id={`brand-${uid}`} type="text" required maxLength={LIMITS.brand} value={form.brand} onChange={(e) => set('brand', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`kind-${uid}`}>Short tagline (what you are)</label>
            <input id={`kind-${uid}`} type="text" maxLength={LIMITS.kind} value={form.kind} onChange={(e) => set('kind', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`headline-${uid}`}>Headline</label>
            <input id={`headline-${uid}`} type="text" required maxLength={LIMITS.headline} value={form.headline} onChange={(e) => set('headline', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`url-${uid}`}>Link (https)</label>
            <input id={`url-${uid}`} type="url" required maxLength={LIMITS.url} placeholder="https://" value={form.url} onChange={(e) => set('url', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`img-${uid}`}>Picture link (https, optional)</label>
            <input id={`img-${uid}`} type="url" maxLength={LIMITS.url} placeholder="https://" value={form.image_url} onChange={(e) => set('image_url', e.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor={`bg-${uid}`}>Background</label>
              <input id={`bg-${uid}`} type="color" value={form.bg} onChange={(e) => set('bg', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor={`fg-${uid}`}>Text</label>
              <input id={`fg-${uid}`} type="color" value={form.fg} onChange={(e) => set('fg', e.target.value)} />
            </div>
          </div>
          {message && (
            <p className={message.ok ? 'small' : 'error'} role="status">{message.text}</p>
          )}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving' : status === 'draft' ? 'Publish ad' : 'Save changes'}
          </button>
        </form>
        <div>
          <div className="tier-label" style={{ marginTop: 0 }}>Preview</div>
          <AdCard ad={form} image={form.image_url} />
        </div>
      </div>
    </div>
  );
}
