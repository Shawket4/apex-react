import { z } from 'zod';

export const zoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  radius_m: z.number(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Zone = z.infer<typeof zoneSchema>;

export const createZoneSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius_m: z.number().positive('Radius must be positive'),
  active: z.boolean().optional(),
});

export type CreateZonePayload = z.infer<typeof createZoneSchema>;

export const updateZoneSchema = createZoneSchema.partial();

export type UpdateZonePayload = z.infer<typeof updateZoneSchema>;

export const zoneScanResponseSchema = z.object({
  run_id: z.string(),
  status: z.string(),
  days_scanned: z.number(),
  vehicles_scanned: z.number(),
  violations_found: z.number(),
  alerts_sent: z.number(),
  error: z.string().optional().nullable(),
});

export type ZoneScanResponse = z.infer<typeof zoneScanResponseSchema>;
