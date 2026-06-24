// Field-type inference for the stage gate form (display only).
export const leafOf = (key) => (key.includes('.') ? key.split('.').pop() : key);

const ENUM_LEAVES = {
  program: 'programs',
  interest: 'interest',
  consent: 'consent',
  objection: 'objection',
  meetingMode: 'meetingModes',
};

const DATE_HINTS = ['date', 'at', 'expiry', 'duedate'];
const ARRAY_LEAVES = new Set(['docsRequested', 'missingDocs']);
const NUMBER_LEAVES = new Set(['confidence']);

export function inferFieldType(gateKey, enums = {}) {
  const leaf = leafOf(gateKey);
  if (ENUM_LEAVES[leaf] && enums[ENUM_LEAVES[leaf]]) {
    return { kind: 'select', options: enums[ENUM_LEAVES[leaf]] };
  }
  if (ARRAY_LEAVES.has(leaf)) return { kind: 'array' };
  if (NUMBER_LEAVES.has(leaf)) return { kind: 'number' };
  const low = leaf.toLowerCase();
  if (DATE_HINTS.some((h) => low.endsWith(h) || low.includes('date'))) return { kind: 'date' };
  return { kind: 'text' };
}
