// Lead ingestion webhook (05 — should-have). External lead-ad payloads → the
// same capture + dedupe + assign path. Key-protected (not a user session).
// Intentionally lenient at this external boundary: maps common field aliases
// and drops unknown marketing fields before strict validation.
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { captureSchema } from '../schemas/lead.schema.js';
import { createLead } from '../services/leadService.js';
import { env } from '../config/env.js';
import { Unauthorized } from '../lib/errors.js';

const router = Router();

function ingestAuth(req, _res, next) {
  const key = req.get('X-Ingest-Key');
  if (!env.ingestApiKey || key !== env.ingestApiKey) return next(Unauthorized('Invalid ingest key'));
  next();
}

// Normalize provider field aliases → capture shape; drop everything else.
function mapToCapture(req, _res, next) {
  const b = req.body || {};
  req.body = {
    name: b.name || b.full_name || b.fullName || b.fullname,
    phone: b.phone || b.phone_number || b.phoneNumber || b.mobile,
    email: b.email,
    program: b.program || b.course,
    source: b.source || 'Meta Ads', // most lead-ads come from Meta/Google
    ...(b.whatsapp ? { whatsapp: b.whatsapp } : {}),
    ...(b.city ? { city: b.city } : {}),
    ...(b.intake ? { intake: b.intake } : {}),
    ...(b.interest ? { interest: b.interest } : {}),
    ...(b.campaignNotes || b.campaign || b.utm_campaign
      ? { campaignNotes: b.campaignNotes || b.campaign || b.utm_campaign }
      : {}),
  };
  next();
}

// POST /api/webhooks/leads
router.post('/leads', ingestAuth, mapToCapture, validate(captureSchema), async (req, res, next) => {
  try {
    const lead = await createLead(req.body, null, {}); // system actor; round-robin owner
    res.status(201).json({ lead });
  } catch (err) {
    if (err.code === 'CONFLICT' && err.details?.existingLead) {
      return res
        .status(409)
        .json({ error: { code: 'CONFLICT', message: err.message }, existingLead: err.details.existingLead });
    }
    next(err);
  }
});

export default router;
