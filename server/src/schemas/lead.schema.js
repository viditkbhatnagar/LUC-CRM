import { z } from 'zod';
import { ENUMS } from '../workflow/workflow.config.js';

// Capture (POST /leads). Strict — unknown fields rejected (05 §validation).
export const captureSchema = z
  .object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    program: z.enum(ENUMS.programs),
    source: z.enum(ENUMS.sources),
    whatsapp: z.string().optional(),
    city: z.string().optional(),
    intake: z.string().optional(),
    interest: z.enum(ENUMS.interest).optional(),
    objection: z.enum(ENUMS.objection).optional(),
    consent: z.enum(ENUMS.consent).optional(),
    owner: z.string().optional(), // ObjectId; assignment validated server-side
    campaignNotes: z.string().optional(),
  })
  .strict();

// Non-stage update (PATCH /leads/:id). All optional; never includes stage.
export const updateLeadSchema = z
  .object({
    objection: z.enum(ENUMS.objection).optional(),
    confidence: z.number().min(0).max(100).optional(),
    interest: z.enum(ENUMS.interest).optional(),
    nextAction: z.string().optional(),
    nextActionDate: z.coerce.date().optional(),
    offerAmount: z.string().optional(),
    discount: z.string().optional(),
    paymentPlan: z.string().optional(),
    offerExpiry: z.coerce.date().optional(),
    offerSentAt: z.coerce.date().optional(),
    meetingDate: z.coerce.date().optional(),
    docsRequested: z.array(z.string()).optional(),
    missingDocs: z.array(z.string()).optional(),
    campaignNotes: z.string().optional(),
    intake: z.string().optional(),
    city: z.string().optional(),
    stageData: z.record(z.any()).optional(),
    note: z.string().optional(), // appended as a note activity
  })
  .strict();

export const manualActivitySchema = z
  .object({
    type: z.enum(['note', 'call', 'whatsapp', 'email']),
    message: z.string().min(1),
  })
  .strict();
