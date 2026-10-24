import { z } from 'zod';

/**
 * Core User entity schema.
 */
export const userSchema = z.object({
  // FalconGo's users table has no gorm.Model, so the key is lowercase `id`.
  id: z.number(),
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
  // Added by the dialog after validation, so not required of the form values.
  id: z.number().optional(),
  name: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  // The Select holds a string; UpdateUser binds an int.
  permission: z.coerce.number().int().min(1).max(4).optional(),
  password: z.string().optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
