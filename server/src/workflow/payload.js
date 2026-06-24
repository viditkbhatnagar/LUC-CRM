/**
 * Per-stage transition payload handling. The payload supplies values for the
 * SOURCE stage's gate fields (05 example uses leaf names: { eligibility, ... }).
 * We map each leaf back to its gate key and write it to the resolved location
 * (top-level / payment.* / stageData.*). Strict: unknown keys are rejected, and
 * forbidden keys (payment.status, docsVerified) can NEVER be set via a payload —
 * those are set only by /payment/confirm and /documents (closure-gate integrity).
 */
import { requiredFields } from './stateMachine.js';
import { Unprocessable } from '../lib/errors.js';

const FORBIDDEN_LEAVES = new Set(['status', 'docsVerified', 'owner']); // status = payment.status

export const leafOf = (key) => (key.includes('.') ? key.split('.').pop() : key);

// Allowed payload leaf names for advancing from a stage (gate leaves minus
// owner, which is never set via the transition payload).
export function allowedPayloadLeaves(stageSlug) {
  const leaves = requiredFields(stageSlug)
    .map(leafOf)
    .filter((l) => l !== 'owner');
  return new Set(leaves);
}

// Map a gate key + value onto the lead document.
function setGateValue(lead, key, value) {
  if (key.startsWith('stageData.')) {
    const leaf = key.slice(10);
    lead.stageData = { ...(lead.stageData || {}), [leaf]: value };
    lead.markModified('stageData');
    return;
  }
  if (key.startsWith('payment.')) {
    const leaf = key.slice(8);
    if (leaf === 'status') return; // forbidden via payload
    lead.payment = { ...(lead.payment?.toObject?.() ?? lead.payment ?? {}), [leaf]: value };
    return;
  }
  if (FORBIDDEN_LEAVES.has(key)) return;
  lead[key] = value;
}

// Validate + apply a transition payload for advancing from `stageSlug`.
// Throws 422 on unknown / forbidden keys. Returns the keys written.
export function applyPayload(lead, stageSlug, payload = {}) {
  const allowed = allowedPayloadLeaves(stageSlug);
  const keys = Object.keys(payload || {});

  const unknown = keys.filter((k) => !allowed.has(k) || FORBIDDEN_LEAVES.has(k));
  if (unknown.length) {
    throw Unprocessable('Unknown or forbidden payload fields for this stage', { unknown });
  }

  const gateKeys = requiredFields(stageSlug);
  const written = [];
  for (const gateKey of gateKeys) {
    const leaf = leafOf(gateKey);
    if (payload[leaf] !== undefined) {
      setGateValue(lead, gateKey, payload[leaf]);
      written.push(gateKey);
    }
  }
  return written;
}

export default { leafOf, allowedPayloadLeaves, applyPayload };
