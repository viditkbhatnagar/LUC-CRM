import mongoose from 'mongoose';
import { ENUMS } from '../workflow/workflow.config.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ENUMS.roles, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });
userSchema.index({ active: 1 });

// Never leak the password hash in JSON responses.
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
export default User;
