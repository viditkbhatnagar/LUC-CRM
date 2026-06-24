import { useState } from 'react';
import Modal from './Modal.jsx';

// Mandatory exit reason (Rule 3). Only lost-bucket reasons are selectable here;
// No Show / Defer are separate actions on the deck.
export default function LostReasonModal({ exitReasons, onClose, onConfirm, submitting }) {
  const lostReasons = (exitReasons || []).filter((r) => r.bucket === 'lost');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  return (
    <Modal
      title="Mark lead as lost"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" disabled={!reason || submitting} onClick={() => onConfirm(reason, note)}>
            {submitting ? 'Saving…' : 'Mark lost'}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="lost-reason">Reason (required)</label>
        <select id="lost-reason" className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select a reason…</option>
          {lostReasons.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="lost-note">Note (optional)</label>
        <textarea id="lost-note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}
