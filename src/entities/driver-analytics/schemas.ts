import { z } from 'zod';

/**
 * Driver analytics is a Watanya-specific endpoint that returns per-driver
 * performance metrics plus fleet-wide global stats for a given date range.
 *
 * Permission-gated: requires permission level >= 3 (enforced backend-side).
 * The response's `hasFinancialAccess` flag controls whether financial fields
 * are populated.
 */

// -----------------------------------------------------------------------------
// Per-driver route distribution entry
// -----------------------------------------------------------------------------

export const driverRouteEntrySchema = z.object({
  Terminal: z.string().optional(),
  DropOffPoint: z.string().optional(),
  count: z.number().default(0),
  percentage: z.number().optional(),
  distance: z.number().optional(),
  // Some responses include a pre-formatted `route` field
  route: z.string().optional(),
}).passthrough();
export type DriverRouteEntry = z.infer<typeof driverRouteEntrySchema>;

// -----------------------------------------------------------------------------
// Activity heatmap (per-day trip count)
// -----------------------------------------------------------------------------

export const driverActivityDaySchema = z.object({
  date: z.string(),
  count: z.number().default(0),
  revenue: z.number().optional(),
}).passthrough();
export type DriverActivityDay = z.infer<typeof driverActivityDaySchema>;

// -----------------------------------------------------------------------------
// Per-driver stat block
// -----------------------------------------------------------------------------

export const driverStatSchema = z.object({
  driver_name: z.string(),
  total_trips: z.number().default(0),
  total_distance: z.number().default(0),
  total_volume: z.number().default(0),
  working_days: z.number().default(0),

  // Some responses use total_fees, some total_revenue
  total_fees: z.number().optional(),
  total_revenue: z.number().optional(),

  avg_trips_per_day: z.number().optional().default(0),
  avg_km_per_day: z.number().optional().default(0),
  avg_volume_per_km: z.number().optional().default(0),
  avg_fees_per_day: z.number().optional().default(0),

  // Normalized efficiency score (1.0 = fleet average)
  efficiency: z.number().optional().default(0),

  route_distribution: z.array(driverRouteEntrySchema).optional().default([]),
  activity_heatmap: z.array(driverActivityDaySchema).optional().default([]),
}).passthrough();
export type DriverStat = z.infer<typeof driverStatSchema>;

// -----------------------------------------------------------------------------
// Fleet-wide global stats
// -----------------------------------------------------------------------------

export const driverGlobalStatsSchema = z.object({
  avg_trips_per_driver: z.number().default(0),
  avg_distance_per_driver: z.number().default(0),
  avg_trips_per_day: z.number().default(0),
  avg_km_per_day: z.number().default(0),
  avg_volume_per_km: z.number().default(0),

  total_trips: z.number().default(0),
  total_distance: z.number().default(0),
  total_volume: z.number().default(0),
  total_revenue: z.number().optional().default(0),

  top_drivers: z.array(z.string()).default([]),
}).passthrough();
export type DriverGlobalStats = z.infer<typeof driverGlobalStatsSchema>;

// -----------------------------------------------------------------------------
// Top-level response
// -----------------------------------------------------------------------------

export const driverAnalyticsResponseSchema = z.object({
  data: z.object({
    drivers: z.array(driverStatSchema).default([]),
    global_stats: driverGlobalStatsSchema,
  }),
  hasFinancialAccess: z.boolean().default(false),
});
export type DriverAnalyticsResponse = z.infer<typeof driverAnalyticsResponseSchema>;

// -----------------------------------------------------------------------------
// Query params
// -----------------------------------------------------------------------------

export const driverAnalyticsParamsSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});
export type DriverAnalyticsParams = z.infer<typeof driverAnalyticsParamsSchema>;
