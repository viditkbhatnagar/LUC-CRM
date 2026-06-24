import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Overview', ico: '◧', end: true },
  { to: '/pipeline', label: 'Pipeline', ico: '▦' },
  { to: '/capture', label: 'New Lead', ico: '＋' },
  { to: '/reports', label: 'Dashboards', ico: '◔' },
  { to: '/flow', label: 'Flow Map', ico: '⇄' },
  { to: '/automation', label: 'Automation', ico: '⚡' },
];

const PHASES = [
  { label: 'Capture & Qualify', color: 'var(--blue)' },
  { label: 'Meeting', color: 'var(--violet)' },
  { label: 'Convert', color: 'var(--amber)' },
  { label: 'Close', color: 'var(--teal)' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="dot" />
        <div>
          LUC CRM
          <small>Learners Education</small>
        </div>
      </div>

      <nav className="nav" aria-label="Main navigation">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ico" aria-hidden="true">{n.ico}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="legend" aria-hidden="true">
        <div style={{ fontWeight: 600, color: '#a7c6b4', marginBottom: 2 }}>Phases</div>
        {PHASES.map((p) => (
          <div className="row" key={p.label}>
            <span className="swatch" style={{ background: p.color }} />
            {p.label}
          </div>
        ))}
      </div>
    </aside>
  );
}
