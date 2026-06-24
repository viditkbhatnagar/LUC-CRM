// Display helpers shared across screens.

export function formatDate(value, opts = { dateStyle: 'medium' }) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}

export function formatDateTime(value) {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
}

// Relative-ish due label.
export function dueLabel(value) {
  if (!value) return '—';
  const d = new Date(value);
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (Number.isNaN(days)) return '—';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

export function isOverdue(value) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

// Score → semantic tag class (07 §1: hot ≥80, warm ≥60, info <60).
export function scoreTagClass(score) {
  if (score >= 80) return 'tag-hot';
  if (score >= 60) return 'tag-warm';
  return 'tag-info';
}

export function scoreLabel(score) {
  if (score >= 80) return 'Hot';
  if (score >= 60) return 'Warm';
  return 'Info';
}

export const phaseTagClass = (phase) => `tag-phase-${phase}`;

export function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
