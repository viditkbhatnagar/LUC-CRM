import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../lib/format.js';
import Icon from './Icon.jsx';
import NotificationsBell from './NotificationsBell.jsx';

export default function Topbar({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      <div className="right">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/pipeline')}
          aria-label="Search leads"
          title="Search leads"
          style={{ color: 'var(--ink-3)' }}
        >
          <Icon name="search" size={16} /> <span className="kbd" style={{ marginLeft: 2 }}>⌘K</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/capture')}>
          <Icon name="capture" size={16} /> New lead
        </button>
        <NotificationsBell />
        <div className="row" style={{ gap: '0.5rem' }}>
          <span className="avatar" title={`${user?.name} · ${user?.role}`}>{initials(user?.name)}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout} aria-label="Sign out" title="Sign out">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
