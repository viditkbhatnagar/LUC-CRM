import { useState } from 'react';
import { formatDate } from '../lib/format.js';

// Captured stage data — fills in as the lead advances. Reads from lead.stageData
// + modeled fields, labelled via the workflow fieldLabels.
function val(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (v instanceof Date || /^\d{4}-\d\d-\d\dT/.test(v)) return formatDate(v);
  if (Array.isArray(v)) return v.join(', ') || '—';
  return String(v);
}

export default function StageDataAccordion({ lead, fieldLabels = {} }) {
  const [open, setOpen] = useState(false);
  const data = lead.stageData || {};
  const keys = Object.keys(data);

  const modeled = [
    ['program', lead.program],
    ['intake', lead.intake],
    ['offerAmount', lead.offerAmount],
    ['paymentPlan', lead.paymentPlan],
    ['offerExpiry', lead.offerExpiry],
    ['meetingDate', lead.meetingDate],
    ['docsVerified', lead.docsVerified],
  ].filter(([, v]) => v != null && v !== '');

  if (keys.length === 0 && modeled.length === 0) {
    return <p className="muted">No captured stage data yet.</p>;
  }

  return (
    <div className="accordion-item">
      <button className="accordion-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Captured stage data <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="accordion-body">
          <table className="table">
            <tbody>
              {modeled.map(([k, v]) => (
                <tr key={k}>
                  <td className="muted" style={{ width: '45%' }}>{fieldLabels[k] || k}</td>
                  <td>{val(v)}</td>
                </tr>
              ))}
              {keys.map((k) => (
                <tr key={k}>
                  <td className="muted">{fieldLabels[`stageData.${k}`] || k}</td>
                  <td>{val(data[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
