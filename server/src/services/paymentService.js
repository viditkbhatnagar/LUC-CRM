// Payment confirmation — the money gate before Won. RBAC-restricted to
// team_lead/admin (enforced at the route); this is the ONLY writer of
// payment.status='paid', so a counsellor cannot self-confirm to unlock Won.
import { loadOwnedLead } from './leadService.js';
import { logActivity } from './activityService.js';

export async function confirmPayment(leadId, { reference, amount, plan }, manager) {
  // managerOnly enforced by route RBAC; loadOwnedLead lets any manager act.
  const lead = await loadOwnedLead(leadId, manager, { managerOnly: true });

  lead.payment = {
    ...(lead.payment?.toObject?.() ?? lead.payment ?? {}),
    status: 'paid',
    reference,
    confirmedAt: new Date(),
    confirmedBy: manager._id,
  };
  if (plan) lead.paymentPlan = plan;
  if (amount) lead.offerAmount = lead.offerAmount || amount;
  lead.lastActivityAt = new Date();
  await lead.save();

  await logActivity(lead._id, {
    type: 'system',
    message: `Payment confirmed (ref ${reference}) by ${manager.name}`,
    actor: manager,
    actorLabel: manager.name,
    meta: { reference },
  });
  return lead;
}

export default { confirmPayment };
