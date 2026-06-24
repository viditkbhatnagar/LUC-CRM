/**
 * stateMachine.js — pure helpers over workflow.config (no DB, no I/O).
 * Used by transitionService, the meta endpoint, and the seed/tests.
 * The transition matrix and gates live in the config; this module only
 * interprets them. No second copy of the stage list.
 */
import {
  STAGES,
  PHASES,
  EXIT_REASONS,
  TRANSITIONS,
  ANY_STAGE_EXITS,
  NAV_ACTIONS,
  SCORING,
} from './workflow.config.js';

const STAGE_BY_SLUG = new Map(STAGES.map((s) => [s.slug, s]));
const EXIT_BY_SLUG = new Map(EXIT_REASONS.map((e) => [e.slug, e]));
const LAST_INDEX = STAGES.length - 1;
export const WON_SLUG = 'admission_won';

// ── Stage lookups ─────────────────────────────────────────────────────────
export const stageBySlug = (slug) => STAGE_BY_SLUG.get(slug) || null;
export const stageIndex = (slug) => (STAGE_BY_SLUG.get(slug)?.index ?? -1);
export const phaseOf = (slug) => STAGE_BY_SLUG.get(slug)?.phase ?? null;
export const isWonStage = (slug) => slug === WON_SLUG;
export const exitReasonBySlug = (slug) => EXIT_BY_SLUG.get(slug) || null;
export const isLostReason = (slug) => EXIT_BY_SLUG.get(slug)?.bucket === 'lost';
export const isOnHoldReason = (slug) => EXIT_BY_SLUG.get(slug)?.bucket === 'on_hold';

// ── Value presence + nested resolution ────────────────────────────────────
// A gate field is "present" if defined, non-null and not an empty string.
// Booleans (incl. false) and arrays (incl. empty) count as present.
export function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

// Resolve a gate key against the lead: top-level → payment.* → stageData[key].
export function getGateValue(lead, key) {
  if (!lead) return undefined;
  if (key.startsWith('stageData.')) return lead.stageData?.[key.slice(10)];
  if (key.startsWith('payment.')) return lead.payment?.[key.slice(8)];
  return lead[key];
}

// ── Hard-gate predicates (value-equality, not presence). The ONLY place
//    these are defined. A payload cannot satisfy them by sending false. ─────
export const GATE_PREDICATES = {
  docsVerified: {
    key: 'docsVerified',
    test: (lead) => lead?.docsVerified === true,
    message: 'Documents must be verified before advancing.',
  },
  closure: {
    key: 'closure',
    test: (lead) => lead?.docsVerified === true && lead?.payment?.status === 'paid',
    message: 'Blocked — verify documents and confirm payment first.',
  },
};

// Predicates that apply when advancing FROM a stage (for UI hard-gate display).
export function gatesFor(slug) {
  const stage = stageBySlug(slug);
  if (!stage) return [];
  return (stage.gates || []).map((g) => GATE_PREDICATES[g]).filter(Boolean);
}

// ── Required-field gate check (Rule 2) ────────────────────────────────────
export function requiredFields(slug) {
  return stageBySlug(slug)?.requiredFields ?? [];
}

// Returns { ok, missing: [keys] } for advancing from a stage given a lead.
export function checkRequiredFields(lead, slug) {
  const missing = requiredFields(slug).filter((key) => !isPresent(getGateValue(lead, key)));
  return { ok: missing.length === 0, missing };
}

// ── Allowed actions / resolution ──────────────────────────────────────────
// All actions valid from an OPEN lead at `slug` (forward/branch + any-stage
// exits + back). Terminal leads expose reopen/reactivate instead.
export function allowedActions(slug) {
  const matrix = TRANSITIONS[slug] || [];
  const actions = matrix.map((t) => ({ ...t }));
  // any-stage exits available from every open, non-won stage
  if (slug !== WON_SLUG) {
    for (const ex of ANY_STAGE_EXITS) actions.push({ ...ex });
    if (stageIndex(slug) > 0) actions.push({ ...NAV_ACTIONS.back });
  }
  return actions;
}

// Resolve a requested action from `slug` → transition descriptor or null.
// Handles forward/branch (matrix), exit/no_show/defer (any-stage), back (nav).
export function resolveAction(slug, action) {
  if (slug === WON_SLUG) return null; // terminal success: no moves
  const matrix = TRANSITIONS[slug] || [];
  const forward = matrix.find((t) => t.action === action);
  if (forward) return { ...forward };

  const anyExit = ANY_STAGE_EXITS.find((t) => t.action === action);
  if (anyExit) return { ...anyExit };

  if (action === 'back' && stageIndex(slug) > 0) {
    const prev = STAGES[stageIndex(slug) - 1];
    return { ...NAV_ACTIONS.back, to: prev.slug };
  }
  return null;
}

// Reopen/reactivate from a terminal lifecycle (lost / on_hold).
export function resolveTerminalAction(lifecycleStatus, exitReason, action) {
  if (lifecycleStatus !== 'lost' && lifecycleStatus !== 'on_hold') return null;
  if (action === 'reopen') return { ...NAV_ACTIONS.reopen };
  if (action === 'reactivate' && exitReason === 'deferred_future_intake') {
    return { ...NAV_ACTIONS.reactivate };
  }
  return null;
}

// ── Scoring (02 §8) — deterministic. ──────────────────────────────────────
export function computeScore({ source, interest, stage } = {}) {
  const b = SCORING.base;
  let base;
  if (source === 'Referral' || source === 'Google Ads') base = b.referralOrGoogle;
  else if (interest === 'High') base = b.highInterest;
  else base = b.other;
  if (base == null) base = b.fallback;

  const idx = stage ? Math.max(0, stageIndex(stage)) : 0;
  const score = base + Math.min(idx, 10);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Nudge by confidence when known (kept deterministic and capped).
export function scoreWithConfidence(base, confidence) {
  const c = Number.isFinite(confidence) ? confidence : 0;
  return Math.max(0, Math.min(100, Math.round(base + c * 0.1)));
}

export const META = { stages: STAGES, phases: PHASES, exitReasons: EXIT_REASONS };
export { STAGES, PHASES, EXIT_REASONS };
