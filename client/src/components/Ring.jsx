import { useId, useEffect, useState } from 'react';

// Animated SVG progress ring / donut. Center content via children.
export default function Ring({
  value = 0,
  size = 120,
  stroke = 12,
  track = 'var(--surface-3)',
  children,
}) {
  const id = useId().replace(/:/g, '');
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const target = circ * (1 - pct / 100);
    if (reduce) {
      setOffset(target);
      return;
    }
    const t = setTimeout(() => setOffset(target), 60);
    return () => clearTimeout(t);
  }, [pct, circ]);

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-2)" />
            <stop offset="60%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-3)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#g${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s var(--ease)' }}
        />
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}
