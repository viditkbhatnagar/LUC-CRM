import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar.jsx';
import LeadCard from '../components/LeadCard.jsx';
import { StatusTag } from '../components/Tag.jsx';
import { useLeads } from '../hooks/useLeads.js';
import { useWorkflow } from '../hooks/useWorkflow.js';

const PHASE_COLORS = {
  capture: 'var(--blue)',
  meeting: 'var(--violet)',
  convert: 'var(--amber)',
  close: 'var(--teal)',
};

// Kanban grouped by the 4 phases + an exited/on-hold strip below.
export default function Pipeline() {
  const navigate = useNavigate();
  const { data: meta } = useWorkflow();
  const { data: openData, isLoading } = useLeads({ status: 'open', limit: 100 });
  const { data: lostData } = useLeads({ status: 'lost', limit: 100 });
  const { data: holdData } = useLeads({ status: 'on_hold', limit: 100 });

  const stageLabel = useMemo(() => {
    const m = {};
    (meta?.stages || []).forEach((s) => (m[s.slug] = s.label));
    return m;
  }, [meta]);
  const phaseOf = useMemo(() => {
    const m = {};
    (meta?.stages || []).forEach((s) => (m[s.slug] = s.phase));
    return m;
  }, [meta]);

  const columns = useMemo(() => {
    const cols = (meta?.phases || []).map((p) => ({ ...p, leads: [] }));
    const byPhase = Object.fromEntries(cols.map((c) => [c.slug, c]));
    (openData?.leads || []).forEach((l) => {
      const ph = phaseOf[l.stage];
      if (byPhase[ph]) byPhase[ph].leads.push(l);
    });
    return cols;
  }, [meta, openData, phaseOf]);

  const exited = [...(lostData?.leads || []), ...(holdData?.leads || [])];

  return (
    <>
      <Topbar title="Pipeline" subtitle="Kanban by phase" />
      <div className="content">
        {isLoading && <div className="spinner">Loading…</div>}
        <div className="kanban">
          {columns.map((col) => (
            <section className="kcol" key={col.slug} aria-label={col.label}>
              <div className="kcol-accent" style={{ background: PHASE_COLORS[col.slug] }} />
              <div className="kcol-head">
                <span className="name">{col.label}</span>
                <span className="count">{col.leads.length}</span>
              </div>
              <div className="kcol-body">
                {col.leads.map((lead) => (
                  <LeadCard key={lead._id} lead={lead} stageLabel={stageLabel[lead.stage]} />
                ))}
                {col.leads.length === 0 && <div className="muted" style={{ fontSize: 13, padding: 6 }}>—</div>}
              </div>
            </section>
          ))}
        </div>

        {exited.length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: '1.8rem' }}>Exited & on-hold</h2>
            <div className="exited-strip">
              {exited.map((l) => (
                <div
                  key={l._id}
                  className="card"
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer', padding: '0.75rem 0.85rem' }}
                  onClick={() => navigate(`/leads/${l._id}`)}
                  onKeyDown={(e) => (e.key === 'Enter' ? navigate(`/leads/${l._id}`) : null)}
                >
                  <div className="spread">
                    <strong style={{ fontSize: 14 }}>{l.name}</strong>
                    <StatusTag status={l.lifecycleStatus} />
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {l.leadCode} · exited at {stageLabel[l.stage] || l.stage}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Reason: {(meta?.exitReasons || []).find((e) => e.slug === l.exitReason)?.label || l.exitReason}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
