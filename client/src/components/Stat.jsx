import { useCountUp } from '../hooks/useCountUp.js';

// KPI card with an animated count-up for numeric values.
export default function Stat({ label, value, suffix = '', brand, danger }) {
  const isNum = typeof value === 'number';
  const animated = useCountUp(isNum ? value : 0);
  const shown = isNum ? animated : value ?? '–';
  const color = brand ? 'var(--brand)' : danger && value ? 'var(--rose)' : undefined;
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value kpi-num" style={{ color }}>
        {shown}
        {value != null && suffix}
      </div>
    </div>
  );
}
