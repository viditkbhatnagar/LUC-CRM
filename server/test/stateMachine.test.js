// M1 unit invariants for the state machine (02 §5, §10). Pure — no DB.
import { describe, it, expect } from 'vitest';
import {
  allowedActions,
  resolveAction,
  resolveTerminalAction,
  requiredFields,
  checkRequiredFields,
  gatesFor,
  getGateValue,
  isPresent,
  stageIndex,
  phaseOf,
  isWonStage,
  computeScore,
  GATE_PREDICATES,
} from '../src/workflow/stateMachine.js';
import { STAGES, TRANSITIONS } from '../src/workflow/workflow.config.js';

describe('M1 · transition matrix', () => {
  it('allowedActions includes exactly the §5 forward/branch moves for each open stage', () => {
    for (const stage of STAGES) {
      const matrix = (TRANSITIONS[stage.slug] || []).map((t) => t.action).sort();
      const allowedForward = allowedActions(stage.slug)
        .filter((a) => a.kind === 'forward' || a.kind === 'branch')
        .map((a) => a.action)
        .sort();
      expect(allowedForward).toEqual(matrix);
    }
  });

  it('open non-won stages also expose any-stage exits (exit/no_show/defer)', () => {
    const actions = allowedActions('qualified').map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['exit', 'no_show', 'defer', 'back']));
  });

  it('the won stage exposes no forward/exit actions', () => {
    expect(allowedActions('admission_won')).toEqual([]);
    expect(resolveAction('admission_won', 'back')).toBeNull();
  });

  it('resolveAction returns descriptors for legal moves and null for illegal ones', () => {
    expect(resolveAction('new_lead', 'contact_attempted')).toMatchObject({
      to: 'contact_attempted',
      kind: 'forward',
    });
    // illegal: cannot jump New Lead → Qualified
    expect(resolveAction('new_lead', 'qualified')).toBeNull();
    // illegal: no backward from the first stage
    expect(resolveAction('new_lead', 'back')).toBeNull();
    // legal backward from a later stage resolves to the previous slug
    expect(resolveAction('qualified', 'back')).toMatchObject({ kind: 'back', to: 'connected_intro' });
  });

  it('docs→payment carries the docsVerified gate; payment→won carries the closure gate', () => {
    expect(resolveAction('docs_received_verification', 'payment_pending').gate).toBe('docsVerified');
    expect(resolveAction('payment_pending', 'admission_won').gate).toBe('closure');
  });

  it('reopen/reactivate only resolve from terminal lifecycles', () => {
    expect(resolveTerminalAction('lost', 'lost_price_budget', 'reopen')).toMatchObject({ to: 'new_lead' });
    expect(resolveTerminalAction('on_hold', 'deferred_future_intake', 'reactivate')).toMatchObject({
      to: 'new_lead',
    });
    expect(resolveTerminalAction('on_hold', 'no_show', 'reactivate')).toBeNull(); // only deferred
    expect(resolveTerminalAction('open', null, 'reopen')).toBeNull();
  });
});

describe('M1 · required fields & gates', () => {
  it('returns the documented gate keys per stage', () => {
    expect(requiredFields('new_lead')).toEqual(['owner']);
    expect(requiredFields('meeting_done')).toContain('stageData.meetingOutcome');
    expect(requiredFields('offer_sent')).toEqual(
      expect.arrayContaining(['offerAmount', 'offerExpiry', 'paymentPlan']),
    );
  });

  it('checkRequiredFields reports the missing keys', () => {
    const lead = { stageData: {}, nextActionDate: null };
    const res = checkRequiredFields(lead, 'contact_attempted');
    expect(res.ok).toBe(false);
    expect(res.missing).toEqual(
      expect.arrayContaining(['stageData.attemptMethod', 'nextActionDate']),
    );

    const ready = {
      stageData: { attemptMethod: 'Call', attemptAt: new Date(), callOutcome: 'Reached' },
      nextActionDate: new Date(),
    };
    expect(checkRequiredFields(ready, 'contact_attempted').ok).toBe(true);
  });

  it('getGateValue resolves top-level, payment.*, and stageData.* keys', () => {
    const lead = { owner: 'u1', payment: { status: 'paid' }, stageData: { eligibility: 'Eligible' } };
    expect(getGateValue(lead, 'owner')).toBe('u1');
    expect(getGateValue(lead, 'payment.status')).toBe('paid');
    expect(getGateValue(lead, 'stageData.eligibility')).toBe('Eligible');
  });

  it('isPresent treats false and empty arrays as present, but undefined/null/"" as absent', () => {
    expect(isPresent(false)).toBe(true);
    expect(isPresent([])).toBe(true);
    expect(isPresent(0)).toBe(true);
    expect(isPresent('')).toBe(false);
    expect(isPresent(null)).toBe(false);
    expect(isPresent(undefined)).toBe(false);
  });

  it('hard gates are value-equality predicates that false payloads cannot satisfy', () => {
    expect(GATE_PREDICATES.docsVerified.test({ docsVerified: false })).toBe(false);
    expect(GATE_PREDICATES.docsVerified.test({ docsVerified: true })).toBe(true);
    expect(GATE_PREDICATES.closure.test({ docsVerified: true, payment: { status: 'pending' } })).toBe(false);
    expect(GATE_PREDICATES.closure.test({ docsVerified: false, payment: { status: 'paid' } })).toBe(false);
    expect(GATE_PREDICATES.closure.test({ docsVerified: true, payment: { status: 'paid' } })).toBe(true);
    expect(gatesFor('payment_pending').map((g) => g.key)).toContain('closure');
  });
});

describe('M1 · helpers', () => {
  it('stageIndex / phaseOf / isWonStage', () => {
    expect(stageIndex('new_lead')).toBe(0);
    expect(stageIndex('admission_won')).toBe(12);
    expect(phaseOf('qualified')).toBe('capture');
    expect(phaseOf('payment_pending')).toBe('close');
    expect(isWonStage('admission_won')).toBe(true);
  });

  it('computeScore is deterministic (02 §8)', () => {
    expect(computeScore({ source: 'Referral', interest: 'Low', stage: 'new_lead' })).toBe(68);
    expect(computeScore({ source: 'Google Ads', interest: 'Low', stage: 'new_lead' })).toBe(68);
    expect(computeScore({ source: 'Meta Ads', interest: 'High', stage: 'new_lead' })).toBe(66);
    expect(computeScore({ source: 'Meta Ads', interest: 'Low', stage: 'new_lead' })).toBe(58);
    // stage progress nudges, capped at +10; result clamped to 100
    expect(computeScore({ source: 'Referral', interest: 'High', stage: 'admission_won' })).toBe(78);
  });
});
