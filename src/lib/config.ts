export const SITE_NAME = 'The Arena';

export type Tier = 'field' | 'lower' | 'upper';
export type MatchCategory = 'ad' | 'platform';
export type PrizeCategory = 'ad' | 'platform' | 'newcomer';

export const TIERS: { id: Tier; label: string; blurb: string }[] = [
  { id: 'field', label: 'Field level', blurb: 'Largest ad, front of every view' },
  { id: 'lower', label: 'Lower bowl', blurb: 'Standard ad with link and stats' },
  { id: 'upper', label: 'Upper deck', blurb: 'Entry spot, still in every matchup pool' },
];

export const PRIZE_CATEGORIES: { id: PrizeCategory; label: string }[] = [
  { id: 'ad', label: 'Best Ad' },
  { id: 'platform', label: 'Best Platform' },
  { id: 'newcomer', label: 'Best Newcomer' },
];

// The stated judging criterion for each matchup type. Shown to every voter.
export const QUESTIONS: Record<MatchCategory, string> = {
  ad: 'Which ad is more creative?',
  platform: 'Which product looks more useful?',
};

// Matchups (votes plus skips) one account may be dealt in 24 hours.
export const DAILY_MATCHUP_CAP = 150;
// An ad needs this many judged matchups before it ranks above unproven ads.
export const MIN_JUDGED = 10;
export const FINALIST_COUNT = 5;

export const LIMITS = { brand: 40, kind: 40, headline: 70, url: 300 };

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

// Integer cents to a display string. No floating point.
export function formatUsd(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const rem = cents % 100;
  const whole = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return rem === 0 ? `$${whole}` : `$${whole}.${rem.toString().padStart(2, '0')}`;
}

// Basis points to a whole percent, rounded half up, integer math.
export function bpToPercent(bp: number): number {
  return Math.trunc((bp + 50) / 100);
}

export function formatPrize(xrp: number): string {
  return xrp > 0 ? `${xrp.toLocaleString('en-US')} XRP` : 'TBA';
}
