import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/*                                                                             */
/* The list endpoint returns the column `long` (legacy field name) for        */
/* longitude. The set-location endpoint returns `lng`. Both are normalised    */
/* to `lng` at this layer so the rest of the app sees one consistent shape.   */
/* -------------------------------------------------------------------------- */

/**
 * Backend response row for `GET /api/mappings`.
 * Mirrors the raw shape — `long` field name preserved for the parser to
 * convert to `lng` on read.
 */
const feeMappingRawSchema = z.object({
  ID: z.number(),
  company: z.string(),
  terminal: z.string(),
  drop_off_point: z.string(),
  distance: z.number(),
  fee: z.number(),
  // Coordinates — backend uses 0 to mean "unset"; the `coords.ts` helpers
  // treat exact (0, 0) as invalid throughout the app
  lat: z.number().nullish(),
  long: z.number().nullish(),
  // OSRM enrichment columns — null until the row's location has been set
  // and the OSRM lookup has succeeded
  osrm_distance: z.number().nullish(),
  osrm_duration: z.number().nullish(),
});

export const feeMappingSchema = feeMappingRawSchema.transform((row) => ({
  id: row.ID,
  company: row.company,
  terminal: row.terminal,
  dropOffPoint: row.drop_off_point,
  distance: row.distance,
  fee: row.fee,
  lat: row.lat ?? null,
  lng: row.long ?? null,
  osrmDistanceKm: row.osrm_distance ?? null,
  osrmDurationMin: row.osrm_duration ?? null,
}));

export type FeeMapping = z.output<typeof feeMappingSchema>;

/**
 * `POST /api/mappings/{id}/location` response.
 * Notice this endpoint correctly uses `lng` (newer convention).
 */
export const setLocationResponseSchema = z.object({
  id: z.number(),
  lat: z.number(),
  lng: z.number(),
  osrm_distance_km: z.number().nullish(),
  osrm_duration_min: z.number().nullish(),
});

export type SetLocationResponse = z.output<typeof setLocationResponseSchema>;

/**
 * One row of the bulk OSRM enrichment response. Errors are per-row — a
 * mapping can fail (e.g. OSRM couldn't route between the points) without
 * killing the whole batch.
 */
export const enrichmentResultSchema = z.object({
  id: z.number(),
  drop_off_point: z.string(),
  osrm_distance_km: z.number().nullish(),
  osrm_duration_min: z.number().nullish(),
  discrepancy_km: z.number().nullish(),
  error: z.string().nullish(),
});

export type EnrichmentResult = z.output<typeof enrichmentResultSchema>;

/* -------------------------------------------------------------------------- */
/* Form input shapes                                                           */
/* -------------------------------------------------------------------------- */

export const feeMappingInputSchema = z.object({
  company: z.string().min(1),
  terminal: z.string().min(1),
  drop_off_point: z.string().min(1),
  distance: z.number().positive(),
  fee: z.number().nonnegative(),
});

export type FeeMappingInput = z.input<typeof feeMappingInputSchema>;

/* -------------------------------------------------------------------------- */
/* Accuracy classification                                                     */
/* -------------------------------------------------------------------------- */

export type AccuracyKind = 'accurate' | 'conservative' | 'overestimate' | 'unknown';

export interface AccuracyResult {
  /** Signed difference in km (manual − osrm). Zero when osrm is missing. */
  diffKm: number;
  /** Classification bucket, used for badges + filters. */
  kind: AccuracyKind;
  /** Absolute percentage divergence — for tooltip text only. */
  percentage: number;
}

/**
 * Compare manually-entered distance vs OSRM-computed distance.
 *
 * - Within ±5% of OSRM           → "accurate"
 * - Manual is shorter than OSRM  → "conservative" (safer billing-wise)
 * - Manual is longer than OSRM   → "overestimate" (we're charging extra)
 * - OSRM unavailable             → "unknown"
 */
export function calculateAccuracy(
  manualKm: number,
  osrmKm: number | null | undefined,
): AccuracyResult {
  if (!osrmKm || osrmKm === 0) {
    return { diffKm: 0, kind: 'unknown', percentage: 0 };
  }
  const diff = manualKm - osrmKm;
  const pct = Math.abs(diff / osrmKm) * 100;
  let kind: AccuracyKind;
  if (pct <= 5) kind = 'accurate';
  else if (diff < 0) kind = 'conservative';
  else kind = 'overestimate';
  return {
    diffKm: Number(diff.toFixed(2)),
    kind,
    percentage: Number(pct.toFixed(1)),
  };
}
