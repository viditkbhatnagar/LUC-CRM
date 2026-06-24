import { z } from 'zod';
import { ENUMS } from '../workflow/workflow.config.js';

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export const createUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(ENUMS.roles),
  })
  .strict();
