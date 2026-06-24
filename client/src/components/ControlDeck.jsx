import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';
import GateList from './GateList.jsx';
import StageGateForm from './StageGateForm.jsx';
import LostReasonModal from './LostReasonModal.jsx';
import { useTransition } from '../hooks/useLeads.js';
import { useToast } from '../context/ToastContext.jsx';
import { ApiError } from '../lib/api.js';

// The workspace decision deck: forward/branch advances (with gate form),
// navigate (back/reopen/reactivate), and any-stage exits (lost/no-show/defer).
// The server enforces every rule; this UI only surfaces allowed actions.
export default function ControlDeck({ lead, stage, meta }) {
  const navigate = useNavigate();
  const toast = useToast();
  const transition = useTransition(lead._id);
  const [advanceTo, setAdvanceTo] = useState(null); // transition descriptor
  const [showLost, setShowLost] = useState(false);
  const [gateError, setGateError] = useState(null);

  const isOpen = lead.lifecycleStatus === 'open';
  const isTerminal = !isOpen;
  const forwards = (meta?.transitions?.[lead.stage] || []).filter((t) => t.kind === 'forward' || t.kind === 'branch');

  async function run(body, { onDone } = {}) {
    setGateError(null);
    try {
      await transition.mutateAsync(body);
      toast('Stage updated', { type: 'success' });
      onDone?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setGateError(err);
      } else if (err instanceof ApiError) {
        toast(err.message, { type: 'error' });
      } else {
        toast('Transition failed', { type: 'error' });
      }
    }
  }

  const stageLabel = (slug) => meta?.stages?.find((s) => s.slug === slug)?.label || slug;

  return (
    <div className="card">
      <div className="card-h"><h3>Decision & transitions</h3></div>

      {isTerminal ? (
        <div className="deck-row">
          <span className="label">Reactivate</span>
          <button className="btn btn-primary" disabled={transition.isPending} onClick={() => run({ action: 'reopen' })}>
            ↻ Reopen as New Lead
          </button>
          {lead.exitReason === 'deferred_future_intake' && (
            <button className="btn btn-ghost" disabled={transition.isPending} onClick={() => run({ action: 'reactivate' })}>
              Reactivate
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Forward / outcome */}
          <div className="deck-row">
            <span className="label">Forward / outcome</span>
            {forwards.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Terminal stage — no forward move.</span>}
            {forwards.map((t) => (
              <button
                key={t.action}
                className={t.kind === 'branch' ? 'btn btn-ghost' : 'btn btn-primary'}
                onClick={() => { setGateError(null); setAdvanceTo(t); }}
              >
                {t.kind === 'branch' ? '↘ ' : '→ '}{stageLabel(t.to)}
              </button>
            ))}
          </div>

          {/* Navigate */}
          <div className="deck-row">
            <span className="label">Navigate</span>
            {(stage?.index ?? 0) > 0 && (
              <button className="btn btn-ghost btn-sm" disabled={transition.isPending} onClick={() => run({ action: 'back' })}>
                ← Previous stage
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/flow')}>Show on flow map</button>
          </div>

          {/* Any-stage exits */}
          <div className="deck-row">
            <span className="label">Exit</span>
            <button className="btn btn-danger btn-sm" onClick={() => setShowLost(true)}>Mark lost…</button>
            <button className="btn btn-ghost btn-sm" disabled={transition.isPending} onClick={() => run({ action: 'no_show' })}>No show</button>
            <button className="btn btn-ghost btn-sm" disabled={transition.isPending} onClick={() => run({ action: 'defer' })}>Defer intake</button>
          </div>
        </>
      )}

      {/* Advance modal with gate form */}
      {advanceTo && (
        <Modal title={`Advance → ${stageLabel(advanceTo.to)}`} onClose={() => setAdvanceTo(null)}>
          {advanceTo.gate && (
            <div className="alert" style={{ background: 'var(--amber-w)', color: 'var(--amber)' }}>
              Hard gate: {advanceTo.gate === 'closure' ? 'documents verified AND payment confirmed' : 'documents verified'} required.
            </div>
          )}
          <div style={{ marginBottom: '0.8rem' }}>
            <span className="section-title">Required to leave this stage</span>
            <GateList stage={stage} lead={lead} fieldLabels={meta?.fieldLabels || {}} />
          </div>
          {gateError && (
            <div className="alert alert-error">
              {gateError.message}
              {gateError.details?.missing && <div>Missing: {gateError.details.missing.join(', ')}</div>}
            </div>
          )}
          <StageGateForm
            stage={stage}
            lead={lead}
            meta={meta}
            submitting={transition.isPending}
            onSubmit={(payload) => run({ action: advanceTo.action, payload }, { onDone: () => setAdvanceTo(null) })}
          />
        </Modal>
      )}

      {/* Lost reason modal */}
      {showLost && (
        <LostReasonModal
          exitReasons={meta?.exitReasons}
          submitting={transition.isPending}
          onClose={() => setShowLost(false)}
          onConfirm={(reason, note) =>
            run({ action: 'exit', exitReason: reason, reason: note }, { onDone: () => setShowLost(false) })
          }
        />
      )}
    </div>
  );
}
