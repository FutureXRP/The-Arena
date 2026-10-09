import { LIMITS } from './config';

const HEX = /^#[0-9a-fA-F]{6}$/;

function channel(hex: string, at: number): number {
  const v = parseInt(hex.slice(at, at + 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

// WCAG contrast ratio between two #rrggbb colors.
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type AdInput = {
  brand: string;
  kind: string;
  headline: string;
  url: string;
  image_url: string;
  bg: string;
  fg: string;
};

export function cleanAd(body: unknown): { ok: true; ad: AdInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const text = (k: string) => (typeof b[k] === 'string' ? (b[k] as string).trim() : '');
  const ad: AdInput = {
    brand: text('brand'),
    kind: text('kind'),
    headline: text('headline'),
    url: text('url'),
    image_url: text('image_url'),
    bg: text('bg'),
    fg: text('fg'),
  };

  if (!ad.brand) return { ok: false, error: 'Add a brand name.' };
  if (!ad.headline) return { ok: false, error: 'Add a headline.' };
  if (ad.brand.length > LIMITS.brand) return { ok: false, error: `Brand is limited to ${LIMITS.brand} characters.` };
  if (ad.kind.length > LIMITS.kind) return { ok: false, error: `Tagline is limited to ${LIMITS.kind} characters.` };
  if (ad.headline.length > LIMITS.headline) {
    return { ok: false, error: `Headline is limited to ${LIMITS.headline} characters.` };
  }
  if (ad.url.length > LIMITS.url) return { ok: false, error: 'That link is too long.' };

  let parsed: URL;
  try {
    parsed = new URL(ad.url);
  } catch {
    return { ok: false, error: 'Enter a full link starting with https://' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, error: 'The link must start with https://' };
  ad.url = parsed.toString();

  // The picture is optional. When present it must be an https link too.
  if (ad.image_url) {
    if (ad.image_url.length > LIMITS.url) return { ok: false, error: 'That image link is too long.' };
    let img: URL;
    try {
      img = new URL(ad.image_url);
    } catch {
      return { ok: false, error: 'The image link must be a full https:// address.' };
    }
    if (img.protocol !== 'https:') return { ok: false, error: 'The image link must start with https://' };
    ad.image_url = img.toString();
  }

  if (!HEX.test(ad.bg) || !HEX.test(ad.fg)) return { ok: false, error: 'Colors must be 6-digit hex values.' };
  if (contrast(ad.bg, ad.fg) < 4.5) {
    return { ok: false, error: 'Text and background are too close to read. Pick colors with more contrast.' };
  }
  return { ok: true, ad };
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

// Only allow same-site redirect targets.
export function safeNext(v: string | null | undefined): string {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return '/';
  return v;
}
