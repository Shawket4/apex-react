import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Wire shapes — GET /api/v1/dashboard (apex-rust) and etit-proxy live         */
/*                                                                            */
/* Money crosses as decimal STRINGS and is parsed to numbers only at the       */
/* moment of display. The `money` block is ABSENT below permission 4 — never   */
/* zeroed — so the schema must not default it into existence.                  */
/* -------------------------------------------------------------------------- */

export const dashboardMonthSchema = z.object({
  trips: z.number(),
  trucks: z.number(),
  litres: z.number(),
});

export const categoryOutSchema = z.object({
  key: z.string(),
  out: z.string(),
});

export const owedBlockSchema = z.object({
  driver_advances: z.string(),
  driver_advances_count: z.number(),
  driver_loans: z.string(),
  driver_loans_count: z.number(),
  employee_advances: z.string(),
  employee_advances_count: z.number(),
  employee_loans: z.string(),
  employee_loans_count: z.number(),
  total: z.string(),
});
export type OwedBlock = z.infer<typeof owedBlockSchema>;

export const dashboardMoneySchema = z.object({
  revenue: z.string(),
  /** Same span of the previous month, for a like-for-like delta. */
  revenue_prev: z.string(),
  /** Grand total out: bank ledger + cash fuel + advances/loans issued. */
  cash_out: z.string(),
  cash_out_bank: z.string(),
  cash_out_fuel: z.string(),
  cash_out_advances: z.string(),
  /** Outstanding debt as of now — never window-scoped. */
  owed: owedBlockSchema,
  by_category: z.array(categoryOutSchema).default([]),
});

export const fleetEntrySchema = z.object({
  /** null = untracked service vehicle. Also the join key to etit's live feed. */
  etit_id: z.string().nullable(),
  /** The digits — how the fleet says a truck out loud. */
  plate_no: z.string(),
  /** The Arabic letters, secondary on the tile. */
  plate_ar: z.string(),
  last_trip_date: z.string().nullable(),
  days_idle: z.number().nullable(),
  /** Absent below permission 4, like the money block. */
  revenue_today: z.string().optional(),
  revenue_yesterday: z.string().optional(),
});
export type FleetEntry = z.infer<typeof fleetEntrySchema>;

export const dashboardExceptionSchema = z.object({
  key: z.string(),
  severity: z.string(),
  count: z.number(),
  href: z.string(),
});
export type DashboardException = z.infer<typeof dashboardExceptionSchema>;

export const dashboardSchema = z.object({
  as_of: z.string(),
  month: dashboardMonthSchema,
  money: dashboardMoneySchema.optional(),
  fleet: z.array(fleetEntrySchema).default([]),
  exceptions: z.array(dashboardExceptionSchema).default([]),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

/* ─── Drawers ─── */

export const revenueDrawerSchema = z.object({
  companies: z.array(z.object({ name: z.string(), amount: z.string() })).default([]),
  daily: z.array(z.object({ date: z.string(), amount: z.string() })).default([]),
});
export type RevenueDrawer = z.infer<typeof revenueDrawerSchema>;

export const cashOutDrawerSchema = z.object({
  by_category: z.array(z.object({ name: z.string(), amount: z.string() })).default([]),
  largest: z
    .array(
      z.object({
        occurred_at: z.string(),
        label: z.string(),
        category: z.string().nullable().optional(),
        amount: z.string(),
      }),
    )
    .default([]),
});
export type CashOutDrawer = z.infer<typeof cashOutDrawerSchema>;

export const tripsDrawerSchema = z.object({
  companies: z.array(z.object({ name: z.string(), trips: z.number() })).default([]),
  daily: z.array(z.object({ date: z.string(), trips: z.number() })).default([]),
});
export type TripsDrawer = z.infer<typeof tripsDrawerSchema>;

export const advancesDrawerSchema = z.object({
  parties: z
    .array(
      z.object({
        name: z.string(),
        kind: z.string().nullable().optional(),
        audience: z.enum(['driver', 'employee']).catch('driver'),
        total: z.string(),
        count: z.number(),
      }),
    )
    .default([]),
});
export type AdvancesDrawer = z.infer<typeof advancesDrawerSchema>;

/* -------------------------------------------------------------------------- */
/* etit-proxy — LiveVehicleStatus and the day summary                          */
/* Contract: etit-proxy-rust API.md §2.2 / §2.6. Field names are camelCase on  */
/* that service.                                                               */
/* -------------------------------------------------------------------------- */

export const liveVehicleSchema = z.object({
  id: z.string(),
  plate: z.string().nullable().optional(),
  lat: z.number().optional().default(0),
  lng: z.number().optional().default(0),
  speed: z.number().optional().default(0),
  status: z.number().optional().default(0),
  statusLabel: z.string().optional().default(''),
  timestamp: z.string().nullable().optional(),
  event: z.string().nullable().optional(),
});
export type LiveVehicle = z.infer<typeof liveVehicleSchema>;

/** SSE `snapshot` / `update` / one-shot `/vehicles/live` payloads. The stream
 *  wraps the array in `{count, vehicles}`; the REST endpoint returns the bare
 *  array. Accept both. */
export const liveFeedSchema = z.union([
  z.array(liveVehicleSchema),
  z.object({ vehicles: z.array(liveVehicleSchema) }).transform((v) => v.vehicles),
]);

/** Computed by the proxy from the day's GPS points — deterministic, never
 *  ETIT's lagging upstream summary. */
export const vehicleDaySummarySchema = z.object({
  mileageKm: z.number(),
  distanceMethod: z.enum(['matched', 'raw']).catch('raw'),
  activeSecs: z.number(),
  idleSecs: z.number(),
  disconnectedSecs: z.number().optional().default(0),
  stopCount: z.number(),
  ignitionOnCount: z.number(),
});
export type VehicleDaySummary = z.infer<typeof vehicleDaySummarySchema>;

/** 5025 -> "1h 24m"; sub-minute -> "<1m"; 0 -> "0m". */
export function formatDrawerDuration(secs: number): string {
  if (secs <= 0) return '0m';
  if (secs < 60) return '<1m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* -------------------------------------------------------------------------- */
/* Derived                                                                     */
/* -------------------------------------------------------------------------- */

/** Tile state, in the order the legend shows it. `untracked` is the two
 *  service vehicles; `unknown` is a tracked truck the feed said nothing about. */
export type TileStatus =
  | 'moving'
  | 'idling'
  | 'stopped'
  | 'offline'
  | 'unknown'
  | 'untracked';

export function tileStatus(entry: FleetEntry, live: LiveVehicle | undefined): TileStatus {
  if (entry.etit_id === null) return 'untracked';
  if (!live) return 'unknown';
  const label = (live.statusLabel || '').toLowerCase();
  if (label.includes('mov') || live.speed > 3) return 'moving';
  if (label.includes('idl')) return 'idling';
  if (label.includes('off')) return 'offline';
  return 'stopped';
}
