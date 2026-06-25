// Hand-drawn doodle accents (Front-style personality). stroke = currentColor.
// Use for highlights, annotations, decorative flourishes.
const D = {
  underline: { vb: '0 0 200 24', w: 200, h: 24, el: <path d="M4 14c34-9 92-12 160-8 12 .7 22 2 32 5" /> },
  underline2: { vb: '0 0 200 22', w: 200, h: 22, el: <path d="M4 10c30 8 70 10 110 7M118 16c28-3 50-6 78-12" /> },
  arrow: { vb: '0 0 80 80', w: 80, h: 80, el: <><path d="M8 18c20 34 42 46 60 44" /><path d="M52 54c8 2 14 4 16 8M68 62c0-7 1-13 3-19" /></> },
  arrowDown: { vb: '0 0 60 70', w: 60, h: 70, el: <><path d="M28 6c-6 24-4 42 2 56" /><path d="M16 48c5 8 10 13 14 16M30 64c5-5 10-9 16-12" /></> },
  star: { vb: '0 0 40 40', w: 40, h: 40, el: <path d="M20 4c1.5 9 6.5 14 16 16-9.5 2-14.5 7-16 16-1.5-9-6.5-14-16-16 9.5-2 14.5-7 16-16Z" /> },
  sparkle: { vb: '0 0 24 24', w: 24, h: 24, el: <path d="M12 3c.8 5 3.5 7.5 9 8.5-5.5 1-8.2 3.5-9 8.5-.8-5-3.5-7.5-9-8.5 5.5-1 8.2-3.5 9-8.5Z" /> },
  circle: { vb: '0 0 180 90', w: 180, h: 90, el: <path d="M92 6C44 4 12 22 9 45c-3 24 34 40 84 39 46-1 80-18 78-41C169 21 138 8 96 6" /> },
  squiggle: { vb: '0 0 90 20', w: 90, h: 20, el: <path d="M4 12c8-12 16 8 24-2s16 10 24 0 16 8 24-2" /> },
  loop: { vb: '0 0 60 50', w: 60, h: 50, el: <path d="M6 40c10 8 22 4 26-8s-6-22-16-16 0 26 18 28 22-18 18-34" /> },
  check: { vb: '0 0 40 40', w: 40, h: 40, el: <path d="M6 22c5 6 9 10 13 14 5-13 12-23 22-32" /> },
};

export default function Doodle({
  name = 'underline',
  size,
  color = 'currentColor',
  strokeWidth = 3,
  preserveAspectRatio,
  style,
  className,
}) {
  const d = D[name] || D.underline;
  const scale = size ? size / d.w : 1;
  return (
    <svg
      viewBox={d.vb}
      width={size || d.w}
      height={size ? d.h * scale : d.h}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden="true"
      className={className}
      style={style}
    >
      {d.el}
    </svg>
  );
}
