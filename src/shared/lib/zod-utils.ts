import { z } from 'zod';

/** Accepts either a string or a number, coerces to number, validates positive */
export const zNumericPositive = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
  .refine((v) => Number.isFinite(v) && v > 0, { message: 'Must be a positive number' });

/** Accepts either a string or a number, coerces to number, validates non-negative */
export const zNumericNonNegative = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
  .refine((v) => Number.isFinite(v) && v >= 0, { message: 'Must be zero or greater' });

/** Accepts either a string or a number, coerces to integer, validates non-negative */
export const zIntegerNonNegative = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : Math.floor(v)))
  .refine((v) => Number.isFinite(v) && v >= 0, { message: 'Must be zero or greater' });

/** ISO date string YYYY-MM-DD */
export const zDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date' });
