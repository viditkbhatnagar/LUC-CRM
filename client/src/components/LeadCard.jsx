import { useNavigate } from 'react-router-dom';
import { ScoreTag, OverdueTag } from './Tag.jsx';
import { isOverdue, dueLabel } from '../lib/format.js';

// Kanban / queue card. Shows name, score, program, stage chip, owner, next action.
export default function LeadCard({ lead, stageLabel }) {
  const navigate = useNavigate();
  const overdue = lead.lifecycleStatus === 'open' && isOverdue(lead.nextActionDate);
  const ownerName = lead.owner?.name || '—';

  return (
    <article
      className="lead-card"
      tabIndex={0}
      role="button"
      onClick={() => navigate(`/leads/${lead._id}`)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/leads/${lead._id}`)}
    >
      <div className="spread">
        <strong className="lead-card-name">{lead.name}</strong>
        <ScoreTag score={lead.score} />
      </div>
      <div className="muted lead-card-meta">{lead.program} · {lead.leadCode}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        <span className="tag">{stageLabel || lead.stage}</span>
        {overdue && <OverdueTag />}
      </div>
      <div className="lead-card-next">
        <span className="muted">{lead.nextAction || 'No next action'}</span>
        <span className={overdue ? 'due-over' : 'due'}>{dueLabel(lead.nextActionDate)}</span>
      </div>
      <div className="lead-card-owner muted">👤 {ownerName}</div>
    </article>
  );
}
