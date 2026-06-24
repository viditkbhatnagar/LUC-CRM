/**
 * Seed script (npm run seed). Creates 1 admin + 1 team lead + 3 counsellors
 * and ~16 sample leads spread across stages and terminals (demo parity).
 * Open leads get an open action task + a creation activity so Rule 1 and the
 * dashboards reconcile. Safe: refuses to run against a non-luc_crm database.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { User, Lead, Task, Activity, StageTransition, Notification, Counter } from '../models/index.js';
import { generateLeadCode, generateAdmissionId, generateReceiptNo } from '../services/counterService.js';
import { normalizePhone, normalizeEmail } from '../lib/normalize.js';
import { computeScore, stageBySlug, stageIndex } from '../workflow/stateMachine.js';

const SEED_PASSWORD = 'password123'; // all seeded users; see RUNBOOK.

function assertSafeDb() {
  const name = mongoose.connection.name || '';
  if (!/luc_crm/i.test(name) || /agi_student_platform/i.test(name)) {
    throw new Error(`Refusing to seed database "${name}" — expected a luc_crm_* database.`);
  }
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const at = (deltaDays) => new Date(now + deltaDays * DAY);

// Task type appropriate to a stage (mirrors onEntry intent).
const STAGE_TASK = {
  new_lead: { type: 'first_contact', title: 'First contact (call / WhatsApp)' },
  contact_attempted: { type: 'follow_up', title: 'Second attempt today' },
  connected_intro: { type: 'qualify', title: 'Qualify the lead' },
  qualified: { type: 'schedule_meeting', title: 'Fix a meeting' },
  meeting_to_schedule: { type: 'schedule_meeting', title: 'Confirm meeting slot' },
  meeting_scheduled: { type: 'meeting_prep', title: 'Prepare for meeting' },
  meeting_done: { type: 'post_meeting', title: 'Send recognition + ROI pack' },
  post_meeting_followup: { type: 'follow_up', title: 'Handle objection & follow up' },
  offer_sent: { type: 'offer_follow_up', title: 'Offer follow-up (Day 1/3/7)' },
  offer_accepted_docs_pending: { type: 'collect_docs', title: 'Collect documents' },
  docs_received_verification: { type: 'verify_docs', title: 'Verify submitted documents' },
  payment_pending: { type: 'payment_follow_up', title: 'Payment follow-up' },
};

async function run() {
  await connectDb();
  assertSafeDb();

  // Clear our collections only (this is the dev database).
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    Task.deleteMany({}),
    Activity.deleteMany({}),
    StageTransition.deleteMany({}),
    Notification.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const mk = (name, email, role) => ({ name, email, passwordHash, role, active: true });

  const [admin, lead1, sara, nadia, ibrahim] = await User.create([
    mk('Aisha Admin', 'admin@learnerseducation.com', 'admin'),
    mk('Mariam Lead', 'mariam@learnerseducation.com', 'team_lead'),
    mk('Sara', 'sara@learnerseducation.com', 'counsellor'),
    mk('Nadia', 'nadia@learnerseducation.com', 'counsellor'),
    mk('Ibrahim', 'ibrahim@learnerseducation.com', 'counsellor'),
  ]);

  // ── Sample lead specs ─────────────────────────────────────────────────
  const specs = [
    { name: 'Omar Khan', phone: '+971501112233', email: 'omar.khan@example.com', city: 'Dubai, UAE', program: 'Online MBA', source: 'Google Ads', intake: 'Sep 2026', interest: 'High', owner: sara, stage: 'new_lead' },
    { name: 'Layla Hassan', phone: '+971502223344', email: 'layla.h@example.com', city: 'Sharjah, UAE', program: 'Online BBA', source: 'Meta Ads', intake: 'Sep 2026', interest: 'Medium', owner: nadia, stage: 'contact_attempted' },
    { name: 'Yusuf Ali', phone: '+971503334455', email: 'yusuf.ali@example.com', city: 'Dubai, UAE', program: 'Professional Certification', source: 'Website / SEO', intake: 'Jan 2027', interest: 'High', owner: ibrahim, stage: 'connected_intro' },
    { name: 'Hana Saeed', phone: '+971504445566', email: 'hana.saeed@example.com', city: 'Abu Dhabi, UAE', program: 'Online MBA', source: 'Referral', intake: 'Sep 2026', interest: 'High', owner: sara, stage: 'qualified', objection: 'Schedule / timing' },
    { name: 'Karim Nour', phone: '+971505556677', email: 'karim.nour@example.com', city: 'Dubai, UAE', program: 'DBA / Doctorate', source: 'LinkedIn', intake: 'Sep 2026', interest: 'Medium', owner: nadia, stage: 'meeting_to_schedule' },
    { name: 'Sofia Almeida', phone: '+971501234567', email: 'sofia@example.com', city: 'Dubai, UAE', program: 'DBA / Doctorate', source: 'LinkedIn', intake: 'Sep 2026', interest: 'High', objection: 'Employer approval', confidence: 62, owner: sara, stage: 'meeting_scheduled', meetingInDays: 1 },
    { name: 'Daniel Roy', phone: '+971506667788', email: 'daniel.roy@example.com', city: 'Dubai, UAE', program: 'Online MBA', source: 'Instagram', intake: 'Sep 2026', interest: 'High', objection: 'Price / Budget', confidence: 55, owner: ibrahim, stage: 'meeting_done' },
    { name: 'Mona Farah', phone: '+971507778899', email: 'mona.farah@example.com', city: 'Dubai, UAE', program: 'Online BBA', source: 'WhatsApp', intake: 'Sep 2026', interest: 'Medium', objection: 'Comparing options', confidence: 48, owner: nadia, stage: 'post_meeting_followup' },
    { name: 'Tariq Aziz', phone: '+971508889900', email: 'tariq.aziz@example.com', city: 'Dubai, UAE', program: 'Online MBA', source: 'Google Ads', intake: 'Sep 2026', interest: 'High', objection: 'Price / Budget', confidence: 64, owner: sara, stage: 'offer_sent', offerAmount: 'AED 32,000' },
    { name: 'Rania Saleh', phone: '+971509990011', email: 'rania.saleh@example.com', city: 'Dubai, UAE', program: 'Online MBA', source: 'Referral', intake: 'Sep 2026', interest: 'High', objection: 'Resolved', confidence: 72, owner: ibrahim, stage: 'offer_accepted_docs_pending', offerAmount: 'AED 30,000' },
    { name: 'Bilal Ahmed', phone: '+971501010101', email: 'bilal.ahmed@example.com', city: 'Dubai, UAE', program: 'Online MBA', source: 'Meta Ads', intake: 'Sep 2026', interest: 'High', objection: 'Eligibility doubt', confidence: 70, owner: nadia, stage: 'docs_received_verification', offerAmount: 'AED 28,000' },
    { name: 'Noor Hadid', phone: '+971502020202', email: 'noor.hadid@example.com', city: 'Dubai, UAE', program: 'DBA / Doctorate', source: 'LinkedIn', intake: 'Sep 2026', interest: 'High', objection: 'Resolved', confidence: 80, owner: sara, stage: 'payment_pending', offerAmount: 'AED 48,000' },
    // Won
    { name: 'Fatima Noor', phone: '+971503030303', email: 'fatima.noor@example.com', city: 'Dubai, UAE', program: 'Online MBA', source: 'Referral', intake: 'Sep 2026', interest: 'High', objection: 'Resolved', confidence: 95, owner: ibrahim, won: true, offerAmount: 'AED 30,000' },
    // Lost (retain exit stage)
    { name: 'Hassan Beydoun', phone: '+971504040404', email: 'hassan.b@example.com', city: 'Dubai, UAE', program: 'Online BBA', source: 'Google Ads', intake: 'Sep 2026', interest: 'Low', owner: nadia, lost: 'lost_price_budget', exitStage: 'meeting_done' },
    { name: 'Salma Idris', phone: '+971505050505', email: 'salma.idris@example.com', city: 'Dubai, UAE', program: 'Professional Certification', source: 'Instagram', intake: 'Sep 2026', interest: 'Low', owner: sara, lost: 'lost_not_reachable', exitStage: 'contact_attempted' },
    { name: 'Zaid Murad', phone: '+971506060606', email: 'zaid.murad@example.com', city: 'Dubai, UAE', program: 'Online MBA', source: 'Meta Ads', intake: 'Sep 2026', interest: 'Medium', owner: ibrahim, lost: 'lost_competitor', exitStage: 'offer_sent' },
    // On-hold
    { name: 'Dina Aziz', phone: '+971507070707', email: 'dina.aziz@example.com', city: 'Dubai, UAE', program: 'Online MBA', source: 'WhatsApp', intake: 'Jan 2027', interest: 'Medium', owner: nadia, onhold: 'deferred_future_intake', exitStage: 'qualified' },
    { name: 'Faisal Omar', phone: '+971508080808', email: 'faisal.omar@example.com', city: 'Dubai, UAE', program: 'Online BBA', source: 'Google Ads', intake: 'Sep 2026', interest: 'Medium', owner: sara, onhold: 'no_show', exitStage: 'meeting_scheduled' },
  ];

  let openCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let onHoldCount = 0;

  for (const s of specs) {
    const leadCode = await generateLeadCode();
    const isWon = !!s.won;
    const isLost = !!s.lost;
    const isOnHold = !!s.onhold;
    const activeStage = isWon ? 'admission_won' : isLost || isOnHold ? s.exitStage : s.stage;
    const lifecycleStatus = isWon ? 'won' : isLost ? 'lost' : isOnHold ? 'on_hold' : 'open';
    const exitReason = isLost ? s.lost : isOnHold ? s.onhold : null;

    const score = computeScore({ source: s.source, interest: s.interest, stage: activeStage });
    const stageDef = stageBySlug(activeStage);
    const meetingDate = s.meetingInDays != null ? at(s.meetingInDays) : undefined;

    // Plausible stageData so the workspace accordion shows captured info.
    const stageData = {
      attemptMethod: 'Call',
      attemptAt: at(-1),
      callOutcome: 'Reached / interested',
      eligibility: 'Eligible',
      budgetReadiness: 'Ready',
      decisionTimeline: 'This intake',
      objective: 'Career growth',
      meetingMode: 'Online',
      meetingTime: '15:00',
      meetingLink: 'https://meet.luc.edu/' + leadCode,
      reminderStatus: 'Scheduled',
      paymentDiscussed: 'Yes',
      followupNote: 'Following up on ROI pack',
      acceptedAt: at(-2),
      verificationOwner: s.owner.name,
      verifiedAt: at(0),
      verificationRemarks: 'All clear',
      approvalStatus: 'Approved',
    };

    const doc = {
      leadCode,
      name: s.name,
      phone: s.phone,
      whatsapp: s.phone,
      email: s.email,
      city: s.city,
      normalizedPhone: normalizePhone(s.phone),
      normalizedEmail: normalizeEmail(s.email),
      program: s.program,
      source: s.source,
      intake: s.intake,
      consent: 'all',
      owner: s.owner._id,
      stage: activeStage,
      lifecycleStatus,
      exitReason,
      stageEnteredAt: at(-1),
      maxStageReachedIndex: stageIndex(activeStage),
      score,
      interest: s.interest,
      objection: s.objection || 'Not known yet',
      confidence: s.confidence || 0,
      stageData,
      meetingDate,
      offerAmount: s.offerAmount,
      discount: s.offerAmount ? 'None' : undefined,
      paymentPlan: s.offerAmount ? '3 instalments' : undefined,
      offerExpiry: s.offerAmount ? at(7) : undefined,
      offerSentAt: s.offerAmount ? at(-2) : undefined,
      lastActivityAt: at(-1),
    };

    if (lifecycleStatus === 'open') {
      const task = STAGE_TASK[activeStage] || STAGE_TASK.new_lead;
      doc.nextAction = task.title;
      doc.nextActionDate = at(activeStage === 'new_lead' ? 0 : 1);
      doc.slaDueAt = new Date(doc.stageEnteredAt.getTime() + (stageDef?.slaMs || DAY));
      openCount += 1;
    }

    // Close-phase document/payment state
    if (['docs_received_verification', 'payment_pending'].includes(activeStage) || isWon) {
      doc.docsRequested = ['Passport', 'Degree', 'CV', 'ID'];
      doc.docsReceived = true;
      doc.missingDocs = [];
      doc.docsVerified = activeStage === 'payment_pending' || isWon;
    }
    if (activeStage === 'payment_pending') {
      doc.payment = { status: 'pending', reference: '', dueDate: at(3) };
    }
    if (isWon) {
      doc.payment = { status: 'paid', reference: 'PAY-' + leadCode, confirmedAt: at(-1), confirmedBy: admin._id };
      doc.admissionId = await generateAdmissionId();
      doc.receiptNo = await generateReceiptNo();
      doc.onboardingStatus = 'Welcome email sent';
      doc.docsVerified = true;
      wonCount += 1;
    }
    if (isLost) lostCount += 1;
    if (isOnHold) onHoldCount += 1;

    const lead = await Lead.create(doc);

    // Creation activity (audit) for every lead.
    await Activity.create({
      lead: lead._id,
      type: 'system',
      message: `Lead created at ${stageBySlug(activeStage)?.label || activeStage}`,
      actorLabel: 'system',
      meta: { seeded: true },
    });

    // Open action task for active leads (Rule 1).
    if (lifecycleStatus === 'open') {
      const task = STAGE_TASK[activeStage] || STAGE_TASK.new_lead;
      await Task.create({
        lead: lead._id,
        owner: s.owner._id,
        title: task.title,
        type: task.type,
        kind: 'action',
        dueDate: doc.nextActionDate,
        stageAtCreation: activeStage,
      });
    }

    // On-hold recovery tasks (reschedule / re-engage).
    if (isOnHold) {
      const recovery =
        exitReason === 'no_show'
          ? { type: 'reschedule', title: 'Reschedule meeting', due: at(1) }
          : { type: 'reengage', title: 'Re-engage before next intake', due: at(30) };
      await Task.create({
        lead: lead._id,
        owner: s.owner._id,
        title: recovery.title,
        type: recovery.type,
        kind: 'action',
        dueDate: recovery.due,
        stageAtCreation: activeStage,
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[seed] users: 1 admin, 1 team_lead, 3 counsellors · leads: ${specs.length} ` +
      `(open ${openCount}, won ${wonCount}, lost ${lostCount}, on_hold ${onHoldCount})`,
  );
  // eslint-disable-next-line no-console
  console.log(`[seed] login with any seeded email + password "${SEED_PASSWORD}"`);

  await disconnectDb();
}

run().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed:', err);
  await disconnectDb();
  process.exit(1);
});
