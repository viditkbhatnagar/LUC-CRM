import mongoose from 'mongoose';
import { ENUMS, STAGES, EXIT_REASONS } from '../workflow/workflow.config.js';

const STAGE_SLUGS = STAGES.map((s) => s.slug);
const EXIT_SLUGS = EXIT_REASONS.map((e) => e.slug);

// Uploaded document file (key/url come from the storage adapter — S3 later).
const documentFileSchema = new mongoose.Schema(
  {
    name: String,
    key: String,
    url: String,
    size: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const leadSchema = new mongoose.Schema(
  {
    leadCode: { type: String, unique: true }, // LUC-#### from counters

    // Contact
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true }, // defaults to phone if blank (service)
    email: { type: String, required: true, trim: true },
    city: { type: String, trim: true },

    // Normalized dedupe keys (Rule 4)
    normalizedPhone: { type: String, index: true },
    normalizedEmail: { type: String, index: true },

    // Classification
    program: { type: String, enum: ENUMS.programs },
    source: { type: String, enum: ENUMS.sources },
    intake: { type: String, trim: true },
    consent: { type: String, enum: ENUMS.consent, default: 'none' },
    campaignNotes: { type: String, trim: true },

    // Ownership & lifecycle
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    stage: { type: String, enum: STAGE_SLUGS, default: 'new_lead' },
    lifecycleStatus: { type: String, enum: ENUMS.lifecycleStatus, default: 'open' },
    exitReason: { type: String, enum: EXIT_SLUGS, default: null },
    stageEnteredAt: { type: Date, default: Date.now }, // for stage-aging / velocity
    maxStageReachedIndex: { type: Number, default: 0 },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },

    // Sales signals
    score: { type: Number, default: 60 },
    interest: { type: String, enum: ENUMS.interest },
    objection: { type: String, enum: ENUMS.objection },
    confidence: { type: Number, default: 0 }, // 0-100

    // Stage-specific capture fields (gate keys not modeled top-level).
    stageData: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    // Next-action cache (mirrors the open action task; Rule 1)
    nextAction: { type: String, default: '' },
    nextActionDate: { type: Date, default: null },
    lastActivityAt: { type: Date, default: Date.now },

    // SLA (Rule 5)
    slaDueAt: { type: Date, default: null },
    slaBreached: { type: Boolean, default: false },

    // Offer / convert
    offerAmount: { type: String },
    discount: { type: String },
    paymentPlan: { type: String },
    offerExpiry: { type: Date },
    offerSentAt: { type: Date },
    meetingDate: { type: Date }, // promoted top-level: drives meeting-stage SLA

    // Documents
    docsRequested: { type: [String], default: undefined },
    docsReceived: { type: Boolean, default: false },
    docsVerified: { type: Boolean, default: false },
    missingDocs: { type: [String], default: undefined },
    documents: { type: [documentFileSchema], default: undefined }, // uploaded files (S3)

    // Payment
    payment: {
      status: { type: String, enum: ENUMS.paymentStatus, default: 'none' },
      reference: { type: String },
      dueDate: { type: Date },
      confirmedAt: { type: Date },
      confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    // Won record
    admissionId: { type: String },
    receiptNo: { type: String },
    onboardingStatus: { type: String },
  },
  { timestamps: true },
);

// Indexes (03 §2)
leadSchema.index({ owner: 1, lifecycleStatus: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ lifecycleStatus: 1 });
leadSchema.index({ nextActionDate: 1 });
leadSchema.index({ slaDueAt: 1, slaBreached: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ program: 1 });
leadSchema.index({ createdAt: -1 });

leadSchema.set('toJSON', { virtuals: true });

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
export default Lead;
