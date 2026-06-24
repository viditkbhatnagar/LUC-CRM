import { formatDateTime } from '../lib/format.js';

// Newest-first activity feed (notes, calls, stage changes, automations, system).
export default function Timeline({ activities = [] }) {
  if (activities.length === 0) return <div className="empty">No activity yet.</div>;
  return (
    <div className="timeline">
      {activities.map((a) => (
        <div className="tl-item" key={a._id}>
          <span className={`tl-dot ${a.type}`} aria-hidden="true" />
          <div>
            <div className="tl-msg">{a.message}</div>
            <div className="tl-meta">
              {a.actorLabel || 'system'} · {formatDateTime(a.createdAt)} · {a.type}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
