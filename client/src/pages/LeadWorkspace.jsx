import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Topbar from '../components/Topbar.jsx';
import Timeline from '../components/Timeline.jsx';
import LifecycleRail from '../components/LifecycleRail.jsx';
import GateList from '../components/GateList.jsx';
import StageDataAccordion from '../components/StageDataAccordion.jsx';
import ControlDeck from '../components/ControlDeck.jsx';
import DocsPaymentPanel from '../components/DocsPaymentPanel.jsx';
import { ScoreTag, StatusTag } from '../components/Tag.jsx';
import { useLead, useActivities, useUpdateLead } from '../hooks/useLeads.js';
import { useWorkflow } from '../hooks/useWorkflow.js';
import { useToast } from '../context/ToastContext.jsx';
import { isOverdue, dueLabel, formatDate } from '../lib/format.js';

export default function LeadWorkspace() {
  const { id } = useParams();
  const toast = useToast();
  const { data: lead, isLoading, isError } = useLead(id);
  const { data: activities } = useActivities(id);
  const { data: meta } = useWorkflow();
  const update = useUpdateLead(id);

  const stages = meta?.stages || [];
  const stage = useMemo(() => stages.find((s) => s.slug === lead?.stage), [stages, lead]);

  const [edit, setEdit] = useState(null);
  useEffect(() => {
    if (lead) {
      setEdit({
        objection: lead.objection || '',
        confidence: lead.confidence ?? 0,
        nextAction: lead.nextAction || '',
        nextActionDate: lead.nextActionDate ? lead.nextActionDate.slice(0, 10) : '',
        note: '',
      });
    }
  }, [lead]);

  if (isLoading || !edit) return <><Topbar title="Lead" /><div className="content"><div className="spinner">Loading…</div></div></>;
  if (isError || !lead) return <><Topbar title="Lead" /><div className="content"><div className="empty">Lead not found or access denied.</div></div></>;

  const stageNum = (stage?.index ?? 0) + 1;
  const isTerminal = lead.lifecycleStatus !== 'open';

  async function saveUpdate(e) {
    e.preventDefault();
    const body = {
      objection: edit.objection || undefined,
      confidence: Number(edit.confidence),
      nextAction: edit.nextAction || undefined,
      nextActionDate: edit.nextActionDate || undefined,
    };
    if (edit.note) body.note = edit.note;
    try {
      await update.mutateAsync(body);
      toast('Lead updated', { type: 'success' });
      setEdit((s) => ({ ...s, note: '' }));
    } catch {
      toast('Update failed', { type: 'error' });
    }
  }

  // Rule 1 checks (display; server is authority).
  const rule1 = [
    ['Owner', !!lead.owner],
    ['Stage', !!lead.stage],
    ['Open next task', !!lead.nextAction],
    ['Due date', !!lead.nextActionDate],
    ['Last activity', !!lead.lastActivityAt],
  ];

  return (
    <>
      <Topbar title={lead.name} subtitle={`${lead.leadCode} · ${lead.program || '—'}`} />
      <div className="content">
        {/* Header */}
        <div className="card" style={{ marginBottom: '1.2rem' }}>
          <div className="spread" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
              <ScoreTag score={lead.score} />
              <StatusTag status={lead.lifecycleStatus} />
              <span className="tag">{isTerminal ? `Exited @ ${stage?.label}` : `Stage ${stageNum}/13 · ${stage?.label}`}</span>
              <span className="muted">Owner: {lead.owner?.name || '—'}</span>
            </div>
            <span className="muted">{lead.email} · {lead.phone}</span>
          </div>
          <div style={{ marginTop: '0.9rem' }}>
            <LifecycleRail stages={stages} currentSlug={lead.stage} maxIndex={lead.maxStageReachedIndex ?? 0} />
          </div>
        </div>

        <div className="ws-grid">
          <div className="ws-main">
            {/* Control deck — forward/exit/navigate, gate enforcement, lost modal */}
            <ControlDeck lead={lead} stage={stage} meta={meta} />

            {/* Exit criteria / SLA for the current stage */}
            {!isTerminal && stage && (
              <div className="card">
                <span className="section-title">Exit criteria for this stage</span>
                <p style={{ fontSize: 13, margin: '0.2rem 0' }}>SLA: {stage.sla} · max age {stage.maxAge}</p>
              </div>
            )}

            {/* Documents & payment (Close phase) */}
            {(stage?.phase === 'close' || lead.docsReceived || lead.payment?.status !== 'none') && !isTerminal && (
              <DocsPaymentPanel lead={lead} />
            )}

            {/* Counsellor update */}
            <form className="card" onSubmit={saveUpdate}>
              <h3>Counsellor update</h3>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="obj">Objection</label>
                  <select id="obj" className="select" value={edit.objection} onChange={(e) => setEdit({ ...edit, objection: e.target.value })}>
                    <option value="">—</option>
                    {(meta?.enums?.objection || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="conf">Confidence: {edit.confidence}%</label>
                  <input id="conf" type="range" min="0" max="100" value={edit.confidence} onChange={(e) => setEdit({ ...edit, confidence: e.target.value })} />
                  <div className="confidence-bar"><span style={{ width: `${edit.confidence}%` }} /></div>
                </div>
                <div className="field">
                  <label htmlFor="na">Next action</label>
                  <input id="na" className="input" value={edit.nextAction} onChange={(e) => setEdit({ ...edit, nextAction: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="nad">Next action date</label>
                  <input id="nad" type="date" className="input" value={edit.nextActionDate} onChange={(e) => setEdit({ ...edit, nextActionDate: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="note">Add a note</label>
                <textarea id="note" className="textarea" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Logged to the timeline" />
              </div>
              <button className="btn btn-primary" type="submit" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save update'}
              </button>
            </form>

            {/* Captured stage data */}
            <div className="card">
              <StageDataAccordion lead={lead} fieldLabels={meta?.fieldLabels || {}} />
            </div>

            {/* Timeline */}
            <div className="card">
              <h3>Activity timeline</h3>
              <Timeline activities={activities || []} />
            </div>
          </div>

          {/* Side column */}
          <div className="ws-side">
            <div className="card">
              <h3>Next action</h3>
              <p style={{ fontWeight: 600 }}>{lead.nextAction || '—'}</p>
              <p className={isOverdue(lead.nextActionDate) && !isTerminal ? 'due-over' : 'muted'}>
                {dueLabel(lead.nextActionDate)} · {formatDate(lead.nextActionDate)}
              </p>
              <p className="muted" style={{ fontSize: 12 }}>Last activity: {formatDate(lead.lastActivityAt)}</p>
            </div>

            <div className="card">
              <h3>Required at this stage</h3>
              {isTerminal ? (
                <p className="muted">Lead is {lead.lifecycleStatus}.</p>
              ) : (
                <GateList stage={stage} lead={lead} fieldLabels={meta?.fieldLabels || {}} />
              )}
            </div>

            <div className="card">
              <h3>Operating-rule check</h3>
              {isTerminal ? (
                <div className="gate-item">
                  <span className="gate-dot chip-pass">✓</span> Exit reason: {lead.exitReason || '—'}
                </div>
              ) : (
                <div className="gate-list">
                  {rule1.map(([label, ok]) => (
                    <div className="gate-item" key={label}>
                      <span className={`gate-dot ${ok ? 'chip-pass' : 'chip-fail'}`}>{ok ? '✓' : '×'}</span>
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Decision state</h3>
              <div className="stack" style={{ fontSize: 13 }}>
                <div className="spread"><span className="muted">Interest</span><span>{lead.interest || '—'}</span></div>
                <div className="spread"><span className="muted">Objection</span><span>{lead.objection || '—'}</span></div>
                <div className="spread"><span className="muted">Source</span><span>{lead.source || '—'}</span></div>
                <div className="spread"><span className="muted">Offer</span><span>{lead.offerAmount || '—'}</span></div>
                <div>
                  <span className="muted">Confidence {lead.confidence || 0}%</span>
                  <div className="confidence-bar" style={{ marginTop: 4 }}><span style={{ width: `${lead.confidence || 0}%` }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
