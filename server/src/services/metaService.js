// Serializes workflow.config for the client (GET /api/meta/workflow), so the
// SPA never hard-codes the workflow. Ships the COMPLETE payload (transitions
// with kind, gates, exit reasons, enums, field labels) from M3 onward, even
// though the transition endpoint lands in M4.
import {
  STAGES,
  PHASES,
  EXIT_REASONS,
  TRANSITIONS,
  ANY_STAGE_EXITS,
  NAV_ACTIONS,
  FIELD_LABELS,
  ENUMS,
} from '../workflow/workflow.config.js';

export function buildWorkflowMeta() {
  return {
    stages: STAGES.map((s) => ({
      slug: s.slug,
      label: s.label,
      index: s.index,
      phase: s.phase,
      requiredFields: s.requiredFields,
      gates: s.gates,
      sla: s.sla,
      maxAge: s.maxAge,
      onEntry: s.onEntry,
      suggestedExits: s.suggestedExits,
    })),
    phases: PHASES.map((p) => ({
      ...p,
      stages: STAGES.filter((s) => s.phase === p.slug).map((s) => s.slug),
    })),
    exitReasons: EXIT_REASONS,
    transitions: TRANSITIONS,
    anyStageExits: ANY_STAGE_EXITS,
    navActions: NAV_ACTIONS,
    fieldLabels: FIELD_LABELS,
    enums: ENUMS,
  };
}

export default { buildWorkflowMeta };
