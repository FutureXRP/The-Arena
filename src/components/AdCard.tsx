type Props = {
  ad: { brand: string; kind: string; headline: string; bg: string; fg: string };
  compact?: boolean;
};

export function AdCard({ ad, compact }: Props) {
  return (
    <div className={compact ? 'ad compact' : 'ad'} style={{ background: ad.bg, color: ad.fg }}>
      <div className="ad-kind">{ad.kind}</div>
      <div className="ad-headline">{ad.headline || 'Your headline here'}</div>
      <div className="ad-brand">{ad.brand || 'Your brand'}</div>
    </div>
  );
}
