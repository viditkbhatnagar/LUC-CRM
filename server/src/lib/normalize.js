// Dedupe-key normalization (Rule 4). Phone → digits only (keep country code);
// email → lowercase + trim. Used at capture and by the seed.
export function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

export function normalizeEmail(email) {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}
