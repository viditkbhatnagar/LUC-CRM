import mongoose from 'mongoose';

// Atomic sequential IDs (03 §7). One document per sequence name.
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String }, // sequence name: 'leadCode' | 'admissionId-2026' | 'receiptNo' | 'assignIndex'
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
export default Counter;
