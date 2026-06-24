import mongoose from 'mongoose';

// Focused record of each stage/status change for funnel/aging/velocity (03 §5).
const stageTransitionSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    fromStage: { type: String, default: null },
    toStage: { type: String, default: null },
    fromStatus: { type: String },
    toStatus: { type: String },
    exitReason: { type: String, default: null },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String }, // optional free text
    msInPreviousStage: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stageTransitionSchema.index({ lead: 1, createdAt: 1 });
stageTransitionSchema.index({ toStage: 1 });
stageTransitionSchema.index({ toStatus: 1 });
stageTransitionSchema.index({ exitReason: 1 });

stageTransitionSchema.set('toJSON', { virtuals: true });

export const StageTransition = mongoose.model('StageTransition', stageTransitionSchema);
export default StageTransition;
