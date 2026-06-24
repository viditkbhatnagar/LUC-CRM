import { scoreTagClass, scoreLabel, phaseTagClass } from '../lib/format.js';

export function ScoreTag({ score }) {
  return <span className={`tag ${scoreTagClass(score)}`}>{scoreLabel(score)} · {score}</span>;
}

export function PhaseTag({ phase, label }) {
  return <span className={`tag ${phaseTagClass(phase)}`}>{label}</span>;
}

export function OverdueTag() {
  return <span className="tag tag-overdue">Overdue</span>;
}

export function StatusTag({ status }) {
  const map = {
    open: ['tag-info', 'Open'],
    won: ['tag-success', 'Won'],
    lost: ['tag-overdue', 'Lost'],
    on_hold: ['tag-warm', 'On hold'],
  };
  const [cls, label] = map[status] || ['', status];
  return <span className={`tag ${cls}`}>{label}</span>;
}
