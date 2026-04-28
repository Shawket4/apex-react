import { z } from 'zod';

/**
 * Core User entity schema.
 */
export const userSchema = z.object({
  ID: z.number(),
  name: z.string().nullable().optional(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  permission: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  created_at: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;

/**
 * Payload for registering a new user.
 */
export const userCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email').trim(),
  phone: z.string().trim().optional(),
  permission: z.string(), // Backend expects string "1", "2", etc.
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

/**
 * Payload for updating an existing user.
 */
export const userUpdateSchema = z.object({
  id: z.number(),
  name: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  permission: z.number().optional(),
  password: z.string().optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
