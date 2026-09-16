import { z } from 'zod';

export const zoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  radius_m: z.number(),
  active: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
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

/**
 * One violation row a manual scan reports. The proxy has already resolved the
 * vehicle codename and the zone name and formatted the timestamps in the org
 * timezone, so a row renders without a second lookup.
 */
export const zoneViolationSchema = z.object({
  vehicle_id: z.string(),
  codename: z.string(),
  zone_id: z.number(),
  zone_name: z.string(),
  zone_lat: z.number(),
  zone_lng: z.number(),
  /** "YYYY-MM-DD HH:mm:ss", already local — display as-is, never re-parse as UTC. */
  entry_local: z.string(),
  exit_local: z.string(),
  dwell_secs: z.number(),
  point_count: z.number(),
});

export type ZoneViolation = z.infer<typeof zoneViolationSchema>;

export const zoneScanResponseSchema = z.object({
  // Numeric on the wire (`i64` in the proxy) — it was declared as a string
  // here, which made every scan response fail to parse.
  run_id: z.number(),
  status: z.string(),
  /**
   * "manual" when the scan ran over an explicit date range: it reports and
   * sends no WhatsApp alert, so `alerts_sent` is 0 by design and `violations`
   * carries the findings. "scheduled" is the nightly round, which alerts.
   */
  mode: z.string().default('scheduled'),
  /** Inclusive local days the run actually covered (YYYY-MM-DD). */
  from: z.string().default(''),
  to: z.string().default(''),
  days_scanned: z.number(),
  vehicles_scanned: z.number(),
  violations_found: z.number(),
  alerts_sent: z.number(),
  /** Populated for mode "manual" only. */
  violations: z.array(zoneViolationSchema).default([]),
  error: z.string().optional().nullable(),
});

export type ZoneScanResponse = z.infer<typeof zoneScanResponseSchema>;

/**
 * Inclusive local-day range for a manual scan. The proxy rejects a half range,
 * a backwards one, or a span over 92 days rather than falling back to the
 * alerting round.
 */
export const zoneScanRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ZoneScanRange = z.infer<typeof zoneScanRangeSchema>;

/** Longest manual range the proxy accepts, mirrored so the UI can say so. */
export const MAX_SCAN_RANGE_DAYS = 92;
