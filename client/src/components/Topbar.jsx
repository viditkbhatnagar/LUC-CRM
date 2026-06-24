import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../lib/format.js';
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
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/capture')}>
          ＋ New lead
        </button>
        <NotificationsBell />
        <div className="row">
          <span className="avatar" title={`${user?.name} · ${user?.role}`}>{initials(user?.name)}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </div>
    </header>
  );
}
