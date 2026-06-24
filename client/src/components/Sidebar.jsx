import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

const NAV = [
  { to: '/', label: 'Overview', icon: 'overview', end: true },
  { to: '/pipeline', label: 'Pipeline', icon: 'pipeline' },
  { to: '/capture', label: 'New Lead', icon: 'capture' },
  { to: '/reports', label: 'Dashboards', icon: 'reports' },
];
const REF = [
  { to: '/flow', label: 'Flow Map', icon: 'flow' },
  { to: '/automation', label: 'Automation', icon: 'automation' },
];

const PHASES = [
  { label: 'Capture & Qualify', color: 'var(--blue)' },
  { label: 'Meeting', color: 'var(--violet)' },
  { label: 'Convert', color: 'var(--amber)' },
  { label: 'Close', color: 'var(--teal)' },
];

const link = ({ isActive }) => (isActive ? 'active' : '');

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="dot">L</span>
        <div>
          LUC CRM
          <small>Learners Education</small>
        </div>
      </div>

      <nav className="nav" aria-label="Main navigation">
        <span className="nav-label">Workspace</span>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={link}>
            <span className="ico"><Icon name={n.icon} /></span>
            {n.label}
          </NavLink>
        ))}
        <span className="nav-label">Reference</span>
        {REF.map((n) => (
          <NavLink key={n.to} to={n.to} className={link}>
            <span className="ico"><Icon name={n.icon} /></span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="legend" aria-hidden="true">
        <div style={{ fontWeight: 600, color: 'var(--dark-ink)', marginBottom: 2, fontSize: '0.66rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Phases
        </div>
        {PHASES.map((p) => (
          <div className="row" key={p.label}>
            <span className="swatch" style={{ background: p.color, color: p.color }} />
            {p.label}
          </div>
        ))}
      </div>
    </aside>
  );
}
