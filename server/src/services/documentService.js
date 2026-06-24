// Document tracking + file uploads. Setting docsVerified=true is what unlocks
// the docs→payment transition (the hard gate reads it; a transition payload
// can never set it). Files go through the storage adapter (stub → S3 later).
import { loadOwnedLead } from './leadService.js';
import { logActivity } from './activityService.js';
import { upload } from '../adapters/storage.js';

export async function updateDocuments(leadId, body, user) {
  const lead = await loadOwnedLead(leadId, user); // owner/team_lead/admin
  const before = lead.docsVerified;

  if (body.docsRequested !== undefined) lead.docsRequested = body.docsRequested;
  if (body.docsReceived !== undefined) lead.docsReceived = body.docsReceived;
  if (body.missingDocs !== undefined) lead.missingDocs = body.missingDocs;
  if (body.docsVerified !== undefined) lead.docsVerified = body.docsVerified;
  lead.lastActivityAt = new Date();
  await lead.save();

  const bits = [];
  if (body.docsReceived !== undefined) bits.push(`received=${lead.docsReceived}`);
  if (body.docsVerified !== undefined) bits.push(`verified=${lead.docsVerified}`);
  await logActivity(lead._id, {
    type: 'system',
    message: `Documents updated${bits.length ? ` (${bits.join(', ')})` : ''}`,
    actor: user,
    actorLabel: user.name,
  });
  if (!before && lead.docsVerified === true) {
    await logActivity(lead._id, {
      type: 'system',
      message: 'Documents verified — docs→payment unlocked',
      actor: user,
      actorLabel: user.name,
    });
  }
  return lead;
}

export async function uploadDocument(leadId, file, user) {
  const lead = await loadOwnedLead(leadId, user);
  const stored = await upload({
    buffer: file.buffer,
    filename: file.originalname,
    contentType: file.mimetype,
    leadId: String(lead._id),
  });
  const entry = {
    name: file.originalname,
    key: stored.key,
    url: stored.url,
    size: stored.size,
    contentType: stored.contentType,
    uploadedBy: user._id,
    uploadedAt: new Date(),
  };
  lead.documents = [...(lead.documents || []), entry];
  lead.docsReceived = true;
  lead.lastActivityAt = new Date();
  await lead.save();

  await logActivity(lead._id, {
    type: 'system',
    message: `Document uploaded: ${file.originalname}`,
    actor: user,
    actorLabel: user.name,
    meta: { key: stored.key },
  });
  return lead;
}

export default { updateDocuments, uploadDocument };
