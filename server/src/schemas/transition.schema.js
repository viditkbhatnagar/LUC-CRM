import { z } from 'zod';
import { EXIT_REASONS } from '../workflow/workflow.config.js';

const exitSlugs = EXIT_REASONS.map((e) => e.slug);

// Transition envelope (strict). The payload is validated per-stage inside the
// service (applyPayload) against that stage's gate keys, so here it is a loose
// record — but the envelope rejects unknown top-level fields.
export const transitionSchema = z
  .object({
    action: z.string().min(1),
    payload: z.record(z.any()).optional(),
    exitReason: z.enum(exitSlugs).optional(),
    reason: z.string().optional(),
  })
  .strict();

export const documentsSchema = z
  .object({
    docsRequested: z.array(z.string()).optional(),
    docsReceived: z.boolean().optional(),
    docsVerified: z.boolean().optional(),
    missingDocs: z.array(z.string()).optional(),
  })
  .strict();

export const paymentConfirmSchema = z
  .object({
    reference: z.string().min(1),
    amount: z.string().optional(),
    plan: z.string().optional(),
  })
  .strict();

export const reassignSchema = z
  .object({
    owner: z.string().min(1),
  })
  .strict();
