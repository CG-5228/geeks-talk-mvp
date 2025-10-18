import { z } from 'zod';

export const RegisterSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-zA-Z])(?=.*\d).+$/, 'Must contain letters and numbers'),
  confirmPassword: z.string().min(8),
  code: z.string().min(4).max(10).optional(),
  terms: z.literal(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
}).refine((data) => data.terms === true, {
  message: 'You must accept the terms',
  path: ['terms'],
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
