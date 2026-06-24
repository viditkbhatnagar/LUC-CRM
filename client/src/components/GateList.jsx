import { getGateValue, isPresent, hardGatePasses } from '../lib/gates.js';

// Required-at-this-stage pass/fail chips (Rule 2). Display mirrors the server
// gate; the server still enforces on transition.
export default function GateList({ stage, lead, fieldLabels = {} }) {
  if (!stage) return null;
  const required = stage.requiredFields || [];
  const gates = stage.gates || [];

  const rows = [
    ...required.map((key) => ({
      key,
      label: fieldLabels[key] || key,
      pass: isPresent(getGateValue(lead, key)),
    })),
    ...gates.map((key) => ({
      key,
      label: key === 'closure' ? 'Docs verified AND payment paid' : fieldLabels[key] || 'Documents verified',
      pass: hardGatePasses(key, lead),
      hard: true,
    })),
  ];

  if (rows.length === 0) return <p className="muted">No required fields to advance.</p>;

  return (
    <div className="gate-list">
      {rows.map((r) => (
        <div className="gate-item" key={r.key}>
          <span className={`gate-dot ${r.pass ? 'chip-pass' : 'chip-fail'}`} aria-hidden="true">
            {r.pass ? '✓' : '×'}
          </span>
          <span style={{ fontWeight: r.hard ? 700 : 500 }}>{r.label}</span>
          <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
            {r.pass ? 'OK' : 'Missing'}
          </span>
        </div>
      ))}
    </div>
  );
}
