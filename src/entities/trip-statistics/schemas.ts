import { z } from 'zod';

/**
 * Trip statistics are served by a separate Rust microservice and delivered as
 * MessagePack for speed. Field names are snake_case but the envelope keys
 * occasionally arrive as camelCase (`statsByDate`, `hasFinancialAccess`,
 * `carTotals`). The schema accepts both.
 *
 * Real-world response sample (truncated): see /docs in the backend repo.
 * Notable shapes the schema MUST tolerate:
 *
 *   - Petrol Arrows has no VAT — `total_vat` and per-row `vat` are absent.
 *   - TAQA has a single group "Suez" with a single route "Suez" — both
 *     wrappers are valid but degenerate.
 *   - Watanya has an "Unmapped" group/route (fee_category 0) with non-zero
 *     volume but zero distance and zero revenue.
 *   - `statsByDate` skips dates with zero activity (no padding done backend-
 *     side); the timeline view fills gaps client-side.
 */

// -----------------------------------------------------------------------------
// Per-car aggregate (used inside route_details.cars / details.cars / cars_by_terminal)
// -----------------------------------------------------------------------------

export const carStatSchema = z
  .object({
    car_no_plate: z.string(),
    total_trips: z.number().default(0),
    total_volume: z.number().default(0),
    total_distance: z.number().default(0),
    total_revenue: z.number().default(0),
    working_days: z.number().default(0),
    vat: z.number().optional().default(0),
    car_rental: z.number().optional().default(0),
    total_with_vat: z.number().optional().default(0),

    // Optional per-car fields that some responses include
    first_trip_date: z.string().optional(),
    last_trip_date: z.string().optional(),
    trip_count: z.number().optional(),
    drop_off_points: z.array(z.string()).optional(),
  })
  .passthrough();
export type CarStat = z.infer<typeof carStatSchema>;

// -----------------------------------------------------------------------------
// Top-level fleet-wide per-car aggregate (`carTotals` array)
//
// This is pre-computed by the backend by walking every nesting layer and
// summing per plate. We use this directly for the "all cars" table instead of
// re-aggregating client-side from route_details / details / cars_by_terminal
// (the original approach risked double-counting when a plate appeared in
// multiple routes).
//
// Field names differ from CarStat — `liters` not `total_volume`, `distance`
// not `total_distance`, `base_revenue` not `total_revenue`, `rent` not
// `car_rental`. Don't try to unify them; they're different views of the data.
// -----------------------------------------------------------------------------

export const carTotalsRowSchema = z
  .object({
    car_no_plate: z.string(),
    liters: z.number().default(0),
    distance: z.number().default(0),
    base_revenue: z.number().default(0),
    vat: z.number().default(0),
    rent: z.number().default(0),

    // Some builds include trip count / working days at this layer too
    total_trips: z.number().optional(),
    working_days: z.number().optional(),
  })
  .passthrough();
export type CarTotalsRow = z.infer<typeof carTotalsRowSchema>;

// -----------------------------------------------------------------------------
// Route aggregate
// -----------------------------------------------------------------------------

export const routeStatSchema = z
  .object({
    route_name: z.string(),
    /** "terminal-dropoff" | "terminal" | "fee" — informs how the route renders */
    route_type: z.string().optional(),
    total_trips: z.number().default(0),
    total_volume: z.number().default(0),
    total_distance: z.number().default(0),
    total_revenue: z.number().default(0),
    vat: z.number().optional().default(0),
    car_rental: z.number().optional().default(0),
    total_with_vat: z.number().optional().default(0),
    fee: z.number().optional(),
    /** Watanya routes have a numeric fee category (0 for "Unmapped", 1-9 for tiers) */
    fee_category: z.number().optional(),
    /** terminal-dropoff and terminal types fill these in */
    terminal: z.string().optional(),
    drop_off_point: z.string().optional(),
    cars: z.array(carStatSchema).optional().default([]),
  })
  .passthrough();
export type RouteStat = z.infer<typeof routeStatSchema>;

// -----------------------------------------------------------------------------
// Group-level detail (inside companyStat.details)
// -----------------------------------------------------------------------------

export const groupStatSchema = z
  .object({
    group_name: z.string(),
    total_trips: z.number().default(0),
    total_volume: z.number().default(0),
    total_distance: z.number().default(0),
    total_revenue: z.number().default(0),
    fee: z.number().optional().default(0),
    vat: z.number().optional().default(0),
    car_rental: z.number().optional().default(0),
    distinct_cars: z.number().optional().default(0),
    distinct_days: z.number().optional().default(0),
    /** TAQA-specific: total car-days across the period */
    car_days: z.number().optional(),
    total_with_vat: z.number().optional().default(0),
    cars: z.array(carStatSchema).optional().default([]),
  })
  .passthrough();
export type GroupStat = z.infer<typeof groupStatSchema>;

// -----------------------------------------------------------------------------
// Per-company stat
// -----------------------------------------------------------------------------

export const companyStatSchema = z
  .object({
    company: z.string(),
    total_trips: z.number().default(0),
    total_volume: z.number().default(0),
    total_distance: z.number().default(0),
    total_revenue: z.number().default(0),
    total_vat: z.number().optional().default(0),
    total_car_rent: z.number().optional().default(0),
    total_amount: z.number().optional().default(0),
    /** Some builds expose total_with_vat at the company level — alias for total_amount */
    total_with_vat: z.number().optional(),

    details: z.array(groupStatSchema).optional().default([]),
    route_details: z.array(routeStatSchema).optional().default([]),

    // TAQA-specific aggregation by terminal (used by the Excel exporter)
    cars_by_terminal: z.record(z.string(), z.array(carStatSchema)).optional(),
  })
  .passthrough();
export type CompanyStat = z.infer<typeof companyStatSchema>;

// -----------------------------------------------------------------------------
// Daily aggregate (for the timeline chart)
//
// `company_details` is now exposed with the full set of monetary fields so the
// timeline can render multi-series-by-company for revenue, not just for trips
// and volume. Earlier the schema only had `trips` and `volume` which forced
// the revenue toggle to fall back to a single-series view.
// -----------------------------------------------------------------------------

export const dailyCompanyDetailSchema = z
  .object({
    company: z.string(),
    total_trips: z.number().optional(),
    total_volume: z.number().optional(),
    total_distance: z.number().optional(),
    total_revenue: z.number().optional(),
    vat: z.number().optional(),
    car_rental: z.number().optional(),
    total_with_vat: z.number().optional(),
  })
  .passthrough();
export type DailyCompanyDetail = z.infer<typeof dailyCompanyDetailSchema>;

export const dailyStatSchema = z
  .object({
    date: z.string(),
    total_trips: z.number().default(0),
    total_volume: z.number().default(0),
    total_distance: z.number().default(0),
    total_revenue: z.number().default(0),
    company_details: z.array(dailyCompanyDetailSchema).optional().default([]),
  })
  .passthrough();
export type DailyStat = z.infer<typeof dailyStatSchema>;

// -----------------------------------------------------------------------------
// Top-level response
// -----------------------------------------------------------------------------

/**
 * Normalize the camelCase / snake_case envelope inconsistency before parsing.
 * The Rust service uses camelCase for envelope keys in some builds. Also
 * normalises `carTotals` since the backend response we tested actually
 * delivers it as camelCase regardless of build.
 */
function normalizeEnvelope(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  return {
    data: r.data ?? [],
    statsByDate: r.statsByDate ?? r.stats_by_date ?? [],
    hasFinancialAccess:
      r.hasFinancialAccess ?? r.has_financial_access ?? false,
    carTotals: r.carTotals ?? r.car_totals ?? [],
  };
}

export const tripStatisticsResponseSchema = z.preprocess(
  normalizeEnvelope,
  z.object({
    data: z.array(companyStatSchema),
    statsByDate: z.array(dailyStatSchema),
    hasFinancialAccess: z.boolean(),
    carTotals: z.array(carTotalsRowSchema).default([]),
  }),
);
export type TripStatisticsResponse = z.infer<typeof tripStatisticsResponseSchema>;

// -----------------------------------------------------------------------------
// Query params
// -----------------------------------------------------------------------------

export const tripStatisticsParamsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  company: z.string().optional(),
});
export type TripStatisticsParams = z.infer<typeof tripStatisticsParamsSchema>;
