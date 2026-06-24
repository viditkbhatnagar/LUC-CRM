import { useMemo } from 'react';
import Topbar from '../components/Topbar.jsx';
import LeadCard from '../components/LeadCard.jsx';
import Stat from '../components/Stat.jsx';
import { useLeads } from '../hooks/useLeads.js';
import { useWorkflow } from '../hooks/useWorkflow.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isOverdue } from '../lib/format.js';

// Overview: today's priority queue (overdue first, then score). The full KPI
// strip + 5 reports live on /reports (M6); a quick stat row is shown here.
export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useLeads({ status: 'open', limit: 100, sort: 'nextActionDate' });
  const { data: meta } = useWorkflow();

  const stageLabel = useMemo(() => {
    const m = {};
    (meta?.stages || []).forEach((s) => (m[s.slug] = s.label));
    return m;
  }, [meta]);

  const leads = data?.leads || [];
  const queue = useMemo(
    () =>
      [...leads].sort((a, b) => {
        const ao = isOverdue(a.nextActionDate) ? 1 : 0;
        const bo = isOverdue(b.nextActionDate) ? 1 : 0;
        if (ao !== bo) return bo - ao; // overdue first
        return (b.score || 0) - (a.score || 0); // then score desc
      }),
    [leads],
  );

  const stats = useMemo(
    () => ({
      active: leads.length,
      overdue: leads.filter((l) => isOverdue(l.nextActionDate)).length,
      hot: leads.filter((l) => (l.score || 0) >= 80).length,
    }),
    [leads],
  );

  return (
    <>
      <Topbar title={`Welcome, ${user?.name?.split(' ')[0] || ''}`} subtitle="Today's priority queue" />
      <div className="content">
        <div className="grid-kpi" style={{ marginBottom: '1.6rem' }}>
          <Stat label="Active leads" value={stats.active} brand />
          <Stat label="Overdue" value={stats.overdue} danger />
          <Stat label="Hot · ≥80" value={stats.hot} />
        </div>

        <h2 className="section-title">Priority queue · overdue first, then score</h2>
        {isLoading && <div className="spinner">Loading…</div>}
        {!isLoading && queue.length === 0 && <div className="empty">No active leads. Capture one to get started.</div>}
        <div className="queue">
          {queue.map((lead) => (
            <LeadCard key={lead._id} lead={lead} stageLabel={stageLabel[lead.stage]} />
          ))}
        </div>
      </div>
    </>
  );
}
