import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkNotifications } from '../hooks/useNotifications.js';
import { formatDateTime } from '../lib/format.js';

// Notifications bell + dropdown panel with unread badge (M5).
export default function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const { markOne, markAll } = useMarkNotifications();
  const unread = data?.unread || 0;
  const items = data?.notifications || [];

  return (
    <div className="notif-wrap">
      <button
        className="btn btn-ghost btn-sm"
        aria-label={`Notifications (${unread} unread)`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        🔔{unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <>
          <div className="notif-overlay" onClick={() => setOpen(false)} />
          <div className="notif-panel" role="dialog" aria-label="Notifications">
            <div className="spread" style={{ padding: '0.6rem 0.8rem', borderBottom: '1px solid var(--line)' }}>
              <strong style={{ fontSize: 14 }}>Notifications</strong>
              {unread > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => markAll.mutate()}>Mark all read</button>
              )}
            </div>
            <div className="notif-list">
              {items.length === 0 && <div className="empty" style={{ border: 'none' }}>No notifications</div>}
              {items.map((n) => (
                <button
                  key={n._id}
                  className={`notif-item ${n.read ? '' : 'unread'}`}
                  onClick={() => {
                    if (!n.read) markOne.mutate(n._id);
                    if (n.lead) {
                      navigate(`/leads/${n.lead}`);
                      setOpen(false);
                    }
                  }}
                >
                  <span className={`notif-dot type-${n.type}`} aria-hidden="true" />
                  <span>
                    <span className="notif-msg">{n.message}</span>
                    <span className="notif-time">{formatDateTime(n.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
