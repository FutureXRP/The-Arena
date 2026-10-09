type Props = {
  ad: { brand: string; kind: string; headline: string; bg: string; fg: string };
  image?: string;
  compact?: boolean;
};

export function AdCard({ ad, image, compact }: Props) {
  const cls = ['ad', compact ? 'compact' : '', image ? 'has-img' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{ background: ad.bg, color: ad.fg }}>
      {image && <img className="ad-img" src={image} alt="" loading="lazy" />}
      <div className="ad-body">
        <div className="ad-kind">{ad.kind}</div>
        <div className="ad-headline">{ad.headline || 'Your headline here'}</div>
        <div className="ad-brand">{ad.brand || 'Your brand'}</div>
      </div>
    </div>
  );
}
