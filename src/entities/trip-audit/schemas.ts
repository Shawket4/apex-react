import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Enumerations                                                                */
/*                                                                             */
/* Statuses and severities gate UI colors, so they are parsed as enums with   */
/* a `.catch` fallback — an unknown value from a newer proxy build degrades   */
/* to a sane default instead of failing the whole page. Flag types and        */
/* unmatched reasons are open string sets (the proxy adds new codes over      */
/* time); the UI translates the known ones and echoes unknown codes verbatim. */
/* -------------------------------------------------------------------------- */

export const TRIP_MATCH_STATUSES = ['matched', 'partial', 'unmatched'] as const;
export type TripMatchStatus = (typeof TRIP_MATCH_STATUSES)[number];

export const FLAG_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type FlagSeverity = (typeof FLAG_SEVERITIES)[number];

/** Flag types the proxy raises today — used only for i18n label lookup. */
export const KNOWN_FLAG_TYPES = [
  'excess_distance',
  'excess_duration',
  'unplanned_stop',
  'route_deviation',
  'skipped_delivery',
  'no_return_data',
  'no_terminal_departure',
] as const;

/** Unmatched-reason codes mapped to readable i18n strings. */
export const KNOWN_UNMATCHED_REASONS = [
  'no_etit_car_id',
  'no_terminal_coords',
  'no_dropoff_coords',
  'no_gps_data',
  'no_terminal_departure',
  'no_dropoff_visits',
] as const;

export const LEG_TYPES = ['outbound', 'between', 'return'] as const;
export type LegType = (typeof LEG_TYPES)[number];

/* -------------------------------------------------------------------------- */
/* Trip match (list row)                                                       */
/* -------------------------------------------------------------------------- */

export const tripMatchSchema = z.object({
  id: z.number(),
  scan_run_id: z.number().nullish(),
  parent_trip_id: z.number().nullish(),
  day_local: z.string(),
  company: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  terminal_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  car_no_plate: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  vehicle_id: z.string().nullish(),
  driver_name: z.string().nullish(),
  status: z.enum(TRIP_MATCH_STATUSES).catch('unmatched'),
  unmatched_reason: z.string().nullish(),
  start_ts: z.string().nullish(),
  end_ts: z.string().nullish(),
  returned_to_terminal: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  deliveries_expected: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  deliveries_visited: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  actual_km: z.number().nullish(),
  osrm_km: z.number().nullish(),
  expected_km: z.number().nullish(),
  actual_secs: z.number().nullish(),
  osrm_secs: z.number().nullish(),
  distance_ratio: z.number().nullish(),
  duration_ratio: z.number().nullish(),
  reviewed_at: z.string().nullish(),
  review_note: z.string().nullish(),
  created_at: z.string().nullish(),
  flag_count: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  critical_count: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
});

export type TripMatch = z.infer<typeof tripMatchSchema>;

/**
 * Paginated envelope for `GET /trip-audit/matches`. Older proxy builds
 * returned a bare array — `parseTripMatchesPage` accepts both so a stale
 * proxy degrades to a single-page result instead of a blank screen.
 */
export const tripMatchesPageSchema = z.object({
  items: z
    .array(tripMatchSchema)
    .nullish()
    .transform((v) => v ?? []),
  total: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  page: z
    .number()
    .nullish()
    .transform((v) => v ?? 1),
  per_page: z
    .number()
    .nullish()
    .transform((v) => v ?? 25),
});

export type TripMatchesPage = z.infer<typeof tripMatchesPageSchema>;

export function parseTripMatchesPage(payload: unknown): TripMatchesPage {
  if (Array.isArray(payload)) {
    const items = z.array(tripMatchSchema).parse(payload);
    return { items, total: items.length, page: 1, per_page: Math.max(items.length, 1) };
  }
  return tripMatchesPageSchema.parse(payload ?? {});
}

/* -------------------------------------------------------------------------- */
/* Whole-window aggregate summary (KPI strip)                                  */
/* -------------------------------------------------------------------------- */

const countField = z
  .number()
  .nullish()
  .transform((v) => v ?? 0);

export const tripAuditWorstRouteSchema = z.object({
  terminal_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  destinations: z.string().nullish(),
  trips: countField,
  excess_km: countField,
});

export type TripAuditWorstRoute = z.infer<typeof tripAuditWorstRouteSchema>;

/**
 * `GET /trip-audit/summary?from&to&company` — exact aggregates for the whole
 * filter window (independent of list pagination).
 */
export const tripAuditSummarySchema = z.object({
  total: countField,
  matched: countField,
  partial: countField,
  unmatched: countField,
  flagged: countField,
  critical: countField,
  flagged_unreviewed: countField,
  actual_km: z.number().nullish(),
  actual_km_compared: z.number().nullish(),
  osrm_km: z.number().nullish(),
  /** sum(osrm)/sum(actual) over compared trips, percent, 1 decimal. */
  efficiency_pct: z.number().nullish(),
  /** Total km driven over optimal in the window. */
  excess_km: countField,
  worst_routes: z
    .array(tripAuditWorstRouteSchema)
    .nullish()
    .transform((v) => v ?? []),
});

export type TripAuditSummary = z.infer<typeof tripAuditSummarySchema>;

/* -------------------------------------------------------------------------- */
/* Legs + flags (detail view)                                                  */
/* -------------------------------------------------------------------------- */

export const tripLegSchema = z.object({
  id: z.number(),
  match_id: z.number().nullish(),
  seq: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  leg_type: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  from_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  to_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  depart_ts: z.string().nullish(),
  arrive_ts: z.string().nullish(),
  night_window: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  actual_km: z.number().nullish(),
  osrm_km: z.number().nullish(),
  actual_secs: z.number().nullish(),
  osrm_secs: z.number().nullish(),
  distance_ratio: z.number().nullish(),
  max_deviation_m: z.number().nullish(),
  /** Encoded polyline5 of the actual GPS trace. */
  actual_geometry: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  /** Encoded polyline5 of the OSRM optimal — may be empty. */
  osrm_geometry: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
});

export type TripLeg = z.infer<typeof tripLegSchema>;

export const tripFlagSchema = z.object({
  id: z.number(),
  match_id: z.number().nullish(),
  leg_id: z.number().nullish(),
  flag_type: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  severity: z.enum(FLAG_SEVERITIES).catch('info'),
  /** Raw JSON payload; shape varies by `flag_type`. */
  details_json: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  created_at: z.string().nullish(),
});

export type TripFlag = z.infer<typeof tripFlagSchema>;

export const tripMatchDetailSchema = tripMatchSchema.extend({
  legs: z
    .array(tripLegSchema)
    .nullish()
    .transform((v) => v ?? []),
  flags: z
    .array(tripFlagSchema)
    .nullish()
    .transform((v) => v ?? []),
});

export type TripMatchDetail = z.infer<typeof tripMatchDetailSchema>;

/**
 * Parse a flag's `details_json` into a plain record. Never throws — invalid
 * or non-object JSON yields an empty record, and the UI falls back to a
 * generic key/value rendering.
 */
export function parseFlagDetails(flag: TripFlag): Record<string, unknown> {
  if (!flag.details_json) return {};
  try {
    const parsed: unknown = JSON.parse(flag.details_json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/* Scan runs                                                                   */
/* -------------------------------------------------------------------------- */

export const scanRunSchema = z.object({
  id: z.number(),
  started_at: z.string().nullish(),
  finished_at: z.string().nullish(),
  status: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  days_scanned: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  trips_scanned: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  trips_matched: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  trips_unmatched: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  flags_raised: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  suggestions_made: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  error: z.string().nullish(),
});

export type ScanRun = z.infer<typeof scanRunSchema>;

/**
 * `POST /trip-audit/scan` summary. The exact shape may evolve with the
 * proxy, so every field is optional and unknown extras pass through.
 */
export const scanResponseSchema = z
  .object({
    trips_scanned: z.number().nullish(),
    trips_matched: z.number().nullish(),
    trips_unmatched: z.number().nullish(),
    flags_raised: z.number().nullish(),
    suggestions_made: z.number().nullish(),
    error: z.string().nullish(),
  })
  .passthrough();

export type ScanResponse = z.infer<typeof scanResponseSchema>;
