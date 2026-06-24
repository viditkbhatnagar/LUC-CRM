/**
 * workflow.config.js — THE SINGLE SOURCE OF TRUTH (02-WORKFLOW-SPEC, 06-AUTOMATION).
 *
 * Stages, phases, exit reasons, the transition matrix, per-stage required
 * fields + gates, SLAs (human + machine), automations and all enums are
 * defined ONCE here. The server validates against it; the client fetches it
 * via GET /api/meta/workflow. NEVER hard-code the stage list anywhere else.
 *
 * Adding a stage or changing an SLA is a single-file edit here.
 */

// ── Time helpers (machine SLA durations). v1 treats "working days" as
//    calendar days (06 §2 permits this); swap addWorkingDays() later.
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// ── Enums (03 enum reference + 02). The models import these. ──────────────
export const ENUMS = {
  roles: ['counsellor', 'team_lead', 'admin'],
  programs: ['Online MBA', 'Online BBA', 'DBA / Doctorate', 'Professional Certification'],
  sources: [
    'Google Ads',
    'Meta Ads',
    'Website / SEO',
    'WhatsApp',
    'Referral',
    'LinkedIn',
    'Instagram',
    'Walk-in',
  ],
  interest: ['High', 'Medium', 'Low', 'Needs more info'],
  consent: ['all', 'whatsapp', 'email', 'none'],
  objection: [
    'Not known yet',
    'Price / Budget',
    'Schedule / timing',
    'Employer approval',
    'Eligibility doubt',
    'Comparing options',
    'Needs family discussion',
    'Recognition / accreditation',
    'Resolved',
  ],
  lifecycleStatus: ['open', 'won', 'lost', 'on_hold'],
  paymentStatus: ['none', 'pending', 'paid'],
  taskTypes: [
    'first_contact',
    'follow_up',
    'qualify',
    'schedule_meeting',
    'meeting_prep',
    'post_meeting',
    'offer_follow_up',
    'collect_docs',
    'verify_docs',
    'payment_follow_up',
    'reschedule',
    'reengage',
  ],
  taskKinds: ['action', 'reminder'],
  activityTypes: [
    'note',
    'call',
    'whatsapp',
    'email',
    'stage_change',
    'automation',
    'system',
    'task',
    'onboarding_handoff',
  ],
  notificationTypes: ['sla_breach', 'assignment', 'escalation', 'no_show', 'payment_due', 'system'],
  meetingModes: ['Online', 'On-campus', 'Phone'],
};

// ── Phases (02 §1) ────────────────────────────────────────────────────────
export const PHASES = [
  { slug: 'capture', label: 'Capture & Qualify', color: '--blue' },
  { slug: 'meeting', label: 'Meeting', color: '--violet' },
  { slug: 'convert', label: 'Convert', color: '--amber' },
  { slug: 'close', label: 'Close', color: '--teal' },
];

// ── Exit / on-hold terminals (02 §2). bucket drives lifecycleStatus. ──────
export const EXIT_REASONS = [
  { slug: 'lost_not_interested', label: 'Lost - Not Interested', bucket: 'lost' },
  { slug: 'lost_price_budget', label: 'Lost - Price / Budget', bucket: 'lost' },
  { slug: 'lost_not_eligible', label: 'Lost - Not Eligible', bucket: 'lost' },
  { slug: 'lost_not_reachable', label: 'Lost - Not Reachable', bucket: 'lost' },
  { slug: 'lost_competitor', label: 'Lost - Competitor', bucket: 'lost' },
  { slug: 'no_show', label: 'No Show', bucket: 'on_hold' },
  { slug: 'deferred_future_intake', label: 'Deferred / Future Intake', bucket: 'on_hold' },
  { slug: 'duplicate_lead', label: 'Duplicate Lead', bucket: 'lost' },
  { slug: 'invalid_lead', label: 'Invalid Lead', bucket: 'lost' },
];

// Human labels for gate fields (client GateList pass/fail chips).
export const FIELD_LABELS = {
  owner: 'Owner assigned',
  phone: 'Phone',
  email: 'Email',
  program: 'Program',
  interest: 'Interest level',
  intake: 'Preferred intake',
  consent: 'Consent / channel',
  objection: 'Key objection',
  confidence: 'Probability',
  nextAction: 'Next action',
  nextActionDate: 'Next follow-up date',
  meetingDate: 'Meeting date',
  offerSentAt: 'Offer sent date',
  offerAmount: 'Offer amount',
  discount: 'Discount',
  paymentPlan: 'Payment plan',
  offerExpiry: 'Offer expiry',
  docsRequested: 'Documents requested',
  docsReceived: 'Documents received status',
  missingDocs: 'Missing documents tracked',
  docsVerified: 'Documents verified',
  'payment.dueDate': 'Payment due date',
  'payment.reference': 'Payment reference',
  'payment.status': 'Payment status',
  'stageData.attemptMethod': 'Attempt method',
  'stageData.attemptAt': 'Attempt date/time',
  'stageData.callOutcome': 'Call outcome',
  'stageData.eligibility': 'Eligibility',
  'stageData.budgetReadiness': 'Budget readiness',
  'stageData.decisionTimeline': 'Decision timeline',
  'stageData.objective': 'Objective',
  'stageData.meetingMode': 'Meeting mode',
  'stageData.meetingTime': 'Meeting time',
  'stageData.meetingLink': 'Meeting link / location',
  'stageData.reminderStatus': 'Reminder status',
  'stageData.meetingCompletedAt': 'Meeting completed date',
  'stageData.meetingOutcome': 'Outcome note',
  'stageData.paymentDiscussed': 'Payment discussed',
  'stageData.followupNote': 'Follow-up note',
  'stageData.acceptedAt': 'Accepted date',
  'stageData.verificationOwner': 'Verification owner',
  'stageData.verifiedAt': 'Verification date',
  'stageData.verificationRemarks': 'Verification remarks',
  'stageData.approvalStatus': 'Approval status',
};

// ── Stages (02 §1, §4 · 06 §1, §2). index 0-12. ───────────────────────────
// requiredFields  : presence-checked gate keys (resolved via getGateValue)
// gates           : predicate keys (value-equality hard gates) — see stateMachine
// slaMs           : follow-up SLA → drives slaDueAt on entry
// maxAgeMs        : "stuck" threshold → drives stage-aging report (not stored)
// onEntry/onExit  : automation handler keys (06) run by automationEngine
// suggestedExits  : exit reasons the workspace surfaces prominently (UI only)
export const STAGES = [
  {
    slug: 'new_lead',
    label: 'New Lead',
    index: 0,
    phase: 'capture',
    requiredFields: ['owner'], // phone/email enforced at capture (Zod)
    gates: [],
    sla: 'First contact 15 min – 1 hr',
    slaMs: 1 * HOUR,
    maxAge: '1 hour',
    maxAgeMs: 1 * HOUR,
    onEntry: [], // creation side effects run via onCreate
    suggestedExits: ['invalid_lead', 'duplicate_lead'],
  },
  {
    slug: 'contact_attempted',
    label: 'Contact Attempted',
    index: 1,
    phase: 'capture',
    requiredFields: [
      'stageData.attemptMethod',
      'stageData.attemptAt',
      'stageData.callOutcome',
      'nextActionDate',
    ],
    gates: [],
    sla: 'Second attempt same day',
    slaMs: 1 * DAY,
    maxAge: '1 day',
    maxAgeMs: 1 * DAY,
    onEntry: ['createTask:follow_up'],
    suggestedExits: ['lost_not_reachable'],
  },
  {
    slug: 'connected_intro',
    label: 'Connected / Introduction Done',
    index: 2,
    phase: 'capture',
    requiredFields: ['program', 'interest', 'intake', 'consent', 'stageData.eligibility', 'nextAction'],
    gates: [],
    sla: 'Qualify within 24 hrs',
    slaMs: 24 * HOUR,
    maxAge: '2 days',
    maxAgeMs: 2 * DAY,
    onEntry: ['createTask:qualify'],
    suggestedExits: ['lost_not_interested'],
  },
  {
    slug: 'qualified',
    label: 'Qualified',
    index: 3,
    phase: 'capture',
    requiredFields: [
      'stageData.eligibility',
      'stageData.budgetReadiness',
      'stageData.decisionTimeline',
      'intake',
      'stageData.objective',
      'objection',
    ],
    gates: [],
    sla: 'Meeting fixed within 48 hrs',
    slaMs: 48 * HOUR,
    maxAge: '2 days',
    maxAgeMs: 2 * DAY,
    onEntry: ['createTask:schedule_meeting'],
    suggestedExits: ['lost_not_eligible'],
  },
  {
    slug: 'meeting_to_schedule',
    label: 'Meeting To Be Scheduled',
    index: 4,
    phase: 'meeting',
    requiredFields: ['meetingDate', 'stageData.meetingMode', 'nextActionDate', 'owner'],
    gates: [],
    sla: 'Fix meeting within 48 hrs',
    slaMs: 48 * HOUR,
    maxAge: '2 days',
    maxAgeMs: 2 * DAY,
    onEntry: ['createTask:schedule_meeting'],
    suggestedExits: [],
  },
  {
    slug: 'meeting_scheduled',
    label: 'Meeting Scheduled',
    index: 5,
    phase: 'meeting',
    requiredFields: [
      'meetingDate',
      'stageData.meetingTime',
      'stageData.meetingMode',
      'stageData.meetingLink',
      'owner',
      'stageData.reminderStatus',
    ],
    gates: [],
    sla: 'Reminders 24h & 2h before',
    slaMs: 2 * DAY, // slaService overrides using meetingDate when present
    maxAge: 'until meeting date',
    maxAgeMs: 2 * DAY,
    onEntry: ['sendConfirmation', 'scheduleReminder:24h', 'scheduleReminder:2h', 'createTask:meeting_prep'],
    suggestedExits: ['no_show'],
  },
  {
    slug: 'meeting_done',
    label: 'Meeting Done',
    index: 6,
    phase: 'meeting',
    requiredFields: [
      'stageData.meetingCompletedAt',
      'stageData.meetingOutcome', // outcome note is mandatory (02 §4.7)
      'objection',
      'program',
      'stageData.paymentDiscussed',
      'nextActionDate',
    ],
    gates: [],
    sla: 'Follow-up within 24 hrs',
    slaMs: 24 * HOUR,
    maxAge: '1 day',
    maxAgeMs: 1 * DAY,
    onEntry: ['createTask:post_meeting'],
    suggestedExits: ['lost_not_interested'],
  },
  {
    slug: 'post_meeting_followup',
    label: 'Post-Meeting Follow-up',
    index: 7,
    phase: 'convert',
    requiredFields: [
      'objection',
      'stageData.followupNote',
      'nextActionDate',
      'confidence',
      'stageData.decisionTimeline',
    ],
    gates: [],
    sla: 'Active follow-up',
    slaMs: 2 * DAY,
    maxAge: '7 days',
    maxAgeMs: 7 * DAY,
    onEntry: ['createTask:follow_up'],
    suggestedExits: ['lost_price_budget'],
  },
  {
    slug: 'offer_sent',
    label: 'Offer & Payment Plan Sent',
    index: 8,
    phase: 'convert',
    requiredFields: ['offerSentAt', 'offerAmount', 'discount', 'paymentPlan', 'offerExpiry', 'consent'],
    gates: [],
    sla: 'Follow-up within 24 hrs · window 7 days',
    slaMs: 24 * HOUR,
    maxAge: '7 days',
    maxAgeMs: 7 * DAY,
    onEntry: ['sendOffer', 'scheduleFollowups:1,3,7', 'createTask:offer_follow_up'],
    suggestedExits: ['lost_price_budget'],
  },
  {
    slug: 'offer_accepted_docs_pending',
    label: 'Offer Accepted / Documents Pending',
    index: 9,
    phase: 'convert',
    requiredFields: ['stageData.acceptedAt', 'docsRequested', 'docsReceived', 'missingDocs', 'nextActionDate'],
    gates: [],
    sla: 'Follow-up every 2 working days',
    slaMs: 2 * DAY,
    maxAge: '5 working days',
    maxAgeMs: 5 * DAY,
    onEntry: ['generateDocChecklist', 'createTask:collect_docs'],
    suggestedExits: [],
  },
  {
    slug: 'docs_received_verification',
    label: 'Documents Received / Verification',
    index: 10,
    phase: 'close',
    requiredFields: [
      'stageData.verificationOwner',
      'stageData.verifiedAt',
      'stageData.verificationRemarks',
      'stageData.approvalStatus',
    ],
    gates: ['docsVerified'], // HARD GATE A: docsVerified === true to advance
    sla: 'Verify within 2 working days',
    slaMs: 2 * DAY,
    maxAge: '2 working days',
    maxAgeMs: 2 * DAY,
    onEntry: ['createTask:verify_docs'],
    suggestedExits: [],
  },
  {
    slug: 'payment_pending',
    label: 'Payment Pending',
    index: 11,
    phase: 'close',
    requiredFields: ['payment.dueDate', 'paymentPlan', 'payment.reference'],
    gates: ['closure'], // HARD GATE B: docsVerified && payment.status==='paid'
    sla: 'Daily until payment / expiry',
    slaMs: 1 * DAY,
    maxAge: '7 days',
    maxAgeMs: 7 * DAY,
    onEntry: ['sendPaymentReminder', 'createTask:payment_follow_up'],
    suggestedExits: [],
  },
  {
    slug: 'admission_won',
    label: 'Admission Closed - Won',
    index: 12,
    phase: 'close',
    requiredFields: [],
    gates: [],
    sla: '—',
    slaMs: null,
    maxAge: '—',
    maxAgeMs: null,
    onEntry: ['notifyOnboarding'], // admissionId/receipt generated inside the transition
    suggestedExits: [],
  },
];

// ── Transition matrix (02 §5). Action name = target slug for forward/branch.
//    Anything not listed here (plus the any-stage exits below) is ILLEGAL.
export const TRANSITIONS = {
  new_lead: [{ action: 'contact_attempted', to: 'contact_attempted', kind: 'forward' }],
  contact_attempted: [{ action: 'connected_intro', to: 'connected_intro', kind: 'forward' }],
  connected_intro: [{ action: 'qualified', to: 'qualified', kind: 'forward' }],
  qualified: [{ action: 'meeting_to_schedule', to: 'meeting_to_schedule', kind: 'forward' }],
  meeting_to_schedule: [{ action: 'meeting_scheduled', to: 'meeting_scheduled', kind: 'forward' }],
  meeting_scheduled: [{ action: 'meeting_done', to: 'meeting_done', kind: 'forward' }],
  meeting_done: [
    { action: 'offer_sent', to: 'offer_sent', kind: 'forward' },
    { action: 'post_meeting_followup', to: 'post_meeting_followup', kind: 'branch' },
  ],
  post_meeting_followup: [{ action: 'offer_sent', to: 'offer_sent', kind: 'forward' }],
  offer_sent: [
    { action: 'offer_accepted_docs_pending', to: 'offer_accepted_docs_pending', kind: 'forward' },
  ],
  offer_accepted_docs_pending: [
    { action: 'docs_received_verification', to: 'docs_received_verification', kind: 'forward' },
  ],
  docs_received_verification: [
    { action: 'payment_pending', to: 'payment_pending', kind: 'forward', gate: 'docsVerified' },
    // branch back to collect more documents when verification is incomplete
    { action: 'offer_accepted_docs_pending', to: 'offer_accepted_docs_pending', kind: 'branch' },
  ],
  payment_pending: [
    { action: 'admission_won', to: 'admission_won', kind: 'forward', gate: 'closure' },
  ],
  admission_won: [], // terminal success — no forward transition
};

// ── Any-stage exits (02 §5) — available from any OPEN stage (index 0-11). ──
//    `exit` accepts any exitReason whose bucket is 'lost'. no_show / defer
//    are fixed on-hold terminals that auto-create a recovery task.
export const ANY_STAGE_EXITS = [
  { action: 'exit', kind: 'exit' }, // requires exitReason ∈ lost-bucket reasons
  {
    action: 'no_show',
    kind: 'no_show',
    exitReason: 'no_show',
    task: { type: 'reschedule', title: 'Reschedule meeting', dueInDays: 1 },
  },
  {
    action: 'defer',
    kind: 'defer',
    exitReason: 'deferred_future_intake',
    task: { type: 'reengage', title: 'Re-engage before next intake', dueInDays: 30 },
  },
];

// Navigation actions available across the workspace (always logged).
export const NAV_ACTIONS = {
  back: { action: 'back', kind: 'back' }, // one step to previous stage; no gate
  reopen: { action: 'reopen', kind: 'reopen', to: 'new_lead' }, // from any terminal
  reactivate: { action: 'reactivate', kind: 'reactivate', to: 'new_lead' }, // from deferred
};

// ── Lifecycle event automations (06 §1) read by automationEngine. ─────────
export const LIFECYCLE_AUTOMATIONS = {
  onCreate: ['acknowledge', 'createTask:first_contact'],
  onExitLost: ['stopFollowups'],
};

// ── Lead scoring (02 §8) — deterministic, rule-based. ─────────────────────
export const SCORING = {
  base: { referralOrGoogle: 68, highInterest: 66, other: 58, fallback: 60 },
  // score = clamp(base + round(confidence*0.1) + min(stageIndex,10), 0, 100)
};

// Counter ID formatters (03 §7). admissionId counter is keyed per-year.
export const COUNTERS = {
  leadCode: { id: 'leadCode', format: (seq) => `LUC-${1000 + seq}` },
  admissionId: {
    id: (year) => `admissionId-${year}`,
    format: (seq, year) => `ADM-${year}-${String(seq).padStart(4, '0')}`,
  },
  receiptNo: { id: 'receiptNo', format: (seq) => `RCPT-${String(seq).padStart(5, '0')}` },
  assignIndex: { id: 'assignIndex' }, // round-robin pointer
};

export const TIME = { MIN, HOUR, DAY };

// The full config object (also serialized to the client via /api/meta/workflow).
export const workflowConfig = {
  stages: STAGES,
  phases: PHASES,
  exitReasons: EXIT_REASONS,
  transitions: TRANSITIONS,
  anyStageExits: ANY_STAGE_EXITS,
  navActions: NAV_ACTIONS,
  lifecycleAutomations: LIFECYCLE_AUTOMATIONS,
  fieldLabels: FIELD_LABELS,
  enums: ENUMS,
  scoring: SCORING,
};

export default workflowConfig;
