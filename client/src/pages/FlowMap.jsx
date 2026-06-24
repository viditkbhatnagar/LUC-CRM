import { useState, useMemo } from 'react';
import Topbar from '../components/Topbar.jsx';
import { useWorkflow } from '../hooks/useWorkflow.js';
import { useFunnel } from '../hooks/useReports.js';
import { STAGE_REFERENCE } from '../lib/stageReference.js';

const PHASE_COLORS = { capture: 'var(--blue)', meeting: 'var(--violet)', convert: 'var(--amber)', close: 'var(--teal)' };

// Read-only reference: 4 phase lanes, 13 stage nodes (live counts), 9 exit
// chips, and a node detail panel — all built from /api/meta/workflow + funnel.
export default function FlowMap() {
  const { data: meta } = useWorkflow();
  const { data: funnel } = useFunnel();
  const [selected, setSelected] = useState(null);

  const counts = useMemo(() => Object.fromEntries((funnel || []).map((s) => [s.stage, s.count])), [funnel]);
  const stages = meta?.stages || [];
  const sel = stages.find((s) => s.slug === selected);
  const ref = selected ? STAGE_REFERENCE[selected] : null;

  return (
    <>
      <Topbar title="Flow Map" subtitle="The 13-stage lifecycle · live counts" />
      <div className="content">
        <div className="kanban">
          {(meta?.phases || []).map((phase) => (
            <section className="kcol" key={phase.slug}>
              <div className="kcol-accent" style={{ background: PHASE_COLORS[phase.slug] }} />
              <div className="kcol-head"><span className="name">{phase.label}</span></div>
              <div className="kcol-body">
                {phase.stages.map((slug) => {
                  const s = stages.find((x) => x.slug === slug);
                  return (
                    <button
                      key={slug}
                      className={`flow-node ${selected === slug ? 'active' : ''}`}
                      onClick={() => setSelected(slug)}
                      style={{ borderLeftColor: PHASE_COLORS[phase.slug] }}
                    >
                      <span>{s.index + 1}. {s.label}</span>
                      <span className="count">{counts[slug] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Exit chips */}
        <h2 className="section-title" style={{ marginTop: '1.6rem' }}>Exit & on-hold paths</h2>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {(meta?.exitReasons || []).map((e) => (
            <span key={e.slug} className={`tag ${e.bucket === 'lost' ? 'tag-overdue' : 'tag-warm'}`}>{e.label}</span>
          ))}
        </div>

        {/* Node detail */}
        {sel && (
          <section className="card" style={{ marginTop: '1.4rem' }}>
            <div className="spread">
              <h3 style={{ margin: 0 }}>{sel.index + 1}. {sel.label}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <p>{ref?.purpose}</p>
            <div className="form-grid">
              <div>
                <span className="section-title">Exit criteria</span>
                <p style={{ fontSize: 13 }}>{ref?.exit}</p>
                <span className="section-title">SLA</span>
                <p style={{ fontSize: 13 }}>{sel.sla} · max age {sel.maxAge}</p>
              </div>
              <div>
                <span className="section-title">Required to advance</span>
                <ul style={{ fontSize: 13, paddingLeft: 18 }}>
                  {(sel.requiredFields || []).map((f) => <li key={f}>{meta.fieldLabels[f] || f}</li>)}
                  {sel.requiredFields?.length === 0 && <li className="muted">—</li>}
                </ul>
                <span className="section-title">Automations on entry</span>
                <ul style={{ fontSize: 13, paddingLeft: 18 }}>
                  {(sel.onEntry || []).map((a) => <li key={a}>{a}</li>)}
                  {sel.onEntry?.length === 0 && <li className="muted">—</li>}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
