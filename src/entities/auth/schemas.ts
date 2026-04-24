import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.object({
  jwt: z.string(),
  permission: z.union([z.string(), z.number()]).transform((v) => Number(v) || 0),
  name: z.string().optional().nullable(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
