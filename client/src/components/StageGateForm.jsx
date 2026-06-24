import { useState } from 'react';
import { getGateValue } from '../lib/gates.js';
import { leafOf, inferFieldType } from '../lib/gateFields.js';

// Collects the current stage's required (gate) fields as the transition payload
// before advancing. Pre-fills from the lead. docsVerified / payment.status are
// excluded here — they are set via the Documents/Payment panel.
export default function StageGateForm({ stage, lead, meta, onSubmit, submitting }) {
  const required = (stage?.requiredFields || []).filter(
    (k) => k !== 'owner' && k !== 'docsVerified' && k !== 'payment.status',
  );
  const enums = meta?.enums || {};
  const labels = meta?.fieldLabels || {};

  const [vals, setVals] = useState(() => {
    const init = {};
    required.forEach((k) => {
      const leaf = leafOf(k);
      const cur = getGateValue(lead, k);
      init[leaf] = cur == null ? '' : cur instanceof Object && cur.toISOString ? cur : cur;
    });
    return init;
  });

  function submit(e) {
    e.preventDefault();
    const payload = {};
    required.forEach((k) => {
      const leaf = leafOf(k);
      let v = vals[leaf];
      if (v === '' || v == null) return;
      const type = inferFieldType(k, enums);
      if (type.kind === 'array') v = String(v).split(',').map((s) => s.trim()).filter(Boolean);
      if (type.kind === 'number') v = Number(v);
      payload[leaf] = v;
    });
    onSubmit(payload);
  }

  if (required.length === 0) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({}); }}>
        <p className="muted">No additional fields required to advance.</p>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Advancing…' : 'Confirm & advance'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        {required.map((k) => {
          const leaf = leafOf(k);
          const type = inferFieldType(k, enums);
          const label = labels[k] || leaf;
          const id = `gate-${leaf}`;
          const value = vals[leaf] ?? '';
          const onChange = (e) => setVals((s) => ({ ...s, [leaf]: e.target.value }));
          return (
            <div className="field" key={k}>
              <label htmlFor={id}>{label}</label>
              {type.kind === 'select' ? (
                <select id={id} className="select" value={value} onChange={onChange}>
                  <option value="">Select…</option>
                  {type.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : type.kind === 'date' ? (
                <input id={id} type="date" className="input" value={typeof value === 'string' ? value.slice(0, 10) : ''} onChange={onChange} />
              ) : type.kind === 'number' ? (
                <input id={id} type="number" min="0" max="100" className="input" value={value} onChange={onChange} />
              ) : type.kind === 'array' ? (
                <input id={id} className="input" placeholder="comma,separated" value={Array.isArray(value) ? value.join(', ') : value} onChange={onChange} />
              ) : (
                <input id={id} className="input" value={value} onChange={onChange} />
              )}
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Advancing…' : 'Confirm & advance'}
      </button>
    </form>
  );
}
