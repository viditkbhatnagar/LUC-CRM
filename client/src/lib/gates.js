// Client mirror of the server gate resolution (display only — the server is
// the authority). Resolves a gate key against a lead: top-level → payment.* →
// stageData.*; presence = defined, non-null, non-empty-string.
export function getGateValue(lead, key) {
  if (!lead) return undefined;
  if (key.startsWith('stageData.')) return lead.stageData?.[key.slice(10)];
  if (key.startsWith('payment.')) return lead.payment?.[key.slice(8)];
  return lead[key];
}

export function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

// Hard-gate display predicates (mirror stateMachine.GATE_PREDICATES).
export function hardGatePasses(key, lead) {
  if (key === 'docsVerified') return lead?.docsVerified === true;
  if (key === 'closure') return lead?.docsVerified === true && lead?.payment?.status === 'paid';
  return true;
}
