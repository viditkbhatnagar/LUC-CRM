// Atomic sequential IDs via the single-doc-per-sequence pattern (03 §7).
// findOneAndUpdate($inc, upsert) is race-free, so concurrent callers never
// collide on a human ID.
import { Counter } from '../models/Counter.js';

export async function nextSeq(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
}

// LUC-1001, LUC-1002, …
export async function generateLeadCode() {
  const seq = await nextSeq('leadCode');
  return `LUC-${1000 + seq}`;
}

// ADM-2026-0001 — counter keyed per-year so the sequence resets each year.
export async function generateAdmissionId(year = new Date().getUTCFullYear()) {
  const seq = await nextSeq(`admissionId-${year}`);
  return `ADM-${year}-${String(seq).padStart(4, '0')}`;
}

// RCPT-00001
export async function generateReceiptNo() {
  const seq = await nextSeq('receiptNo');
  return `RCPT-${String(seq).padStart(5, '0')}`;
}

// Round-robin pointer for owner assignment.
export async function nextAssignIndex() {
  return nextSeq('assignIndex');
}

export default { nextSeq, generateLeadCode, generateAdmissionId, generateReceiptNo, nextAssignIndex };
