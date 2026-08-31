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
  /** Advances/loans issued in the window (payroll recovers them monthly). */
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

export const fuelEventSchema = z.object({
  id: z.number(),
  plate_no: z.string(),
  plate_ar: z.string(),
  driver_name: z.string(),
  date: z.string(),
  time: z.string(),
  liters: z.number(),
  price_per_liter: z.string(),
  price: z.string(),
  method: z.string(),
  fuel_rate: z.number(),
});
export type DashboardFuelEvent = z.infer<typeof fuelEventSchema>;

/** Consumption view — every event counts regardless of payment method. */
export const fuelBlockSchema = z.object({
  today: z.string(),
  today_liters: z.number(),
  today_events: z.number(),
  recent: z.array(fuelEventSchema).default([]),
});

/* ─── Attention: dated obligations ─── */

/** `kind` is a key, not a label — the wording and its Arabic live in i18n. */
export const expiringDocumentSchema = z.object({
  plate_no: z.string(),
  plate_ar: z.string().default(''),
  kind: z.enum(['license', 'calibration', 'tank_license']).catch('license'),
  expires_on: z.string(),
  /** Negative once the paper has lapsed. */
  days_left: z.number(),
});
export type ExpiringDocument = z.infer<typeof expiringDocumentSchema>;

export const oilChangeDueSchema = z.object({
  plate_no: z.string(),
  plate_ar: z.string().default(''),
  last_change_date: z.string().nullable().default(null),
  interval_km: z.number(),
  km_since: z.number(),
  /** Negative once overdue. */
  km_left: z.number(),
  /**
   * Which filters went in with the last oil change. Defaulted, so a frontend
   * deployed ahead of the API that added them renders "unknown" rather than
   * failing the whole payload.
   */
  oil_filter: z.boolean().default(false),
  fuel_filter: z.boolean().default(false),
  water_filter: z.boolean().default(false),
  /**
   * Oil changes the fitted element has served, this one included. The dashboard
   * is the only oil surface without the history to count this itself, so the
   * API sends the number and the frontend still owns what it means.
   * Defaulted to 1 — "just fitted" — so a frontend ahead of the API shows no
   * due rather than a false one.
   */
  oil_filter_cycles: z.number().default(1),
  fuel_filter_cycles: z.number().default(1),
  /**
   * Detail the row's sheet opens on. All defaulted, so a frontend deployed
   * ahead of the API shows an emptier sheet rather than failing the payload.
   */
  odometer_at_change: z.number().default(0),
  current_odometer: z.number().default(0),
  /** When each element was last replaced; null means never, in what we hold. */
  oil_filter_date: z.string().nullable().default(null),
  fuel_filter_date: z.string().nullable().default(null),
  water_filter_date: z.string().nullable().default(null),
  driver_name: z.string().default(''),
  super_visor: z.string().default(''),
  cost: z.number().default(0),
  /**
   * The plate as stored. `plate_no`/`plate_ar` are a display split that cannot
   * be reassembled — some plates are recorded digits-first — so links to the
   * vehicle use this.
   */
  plate_raw: z.string().default(''),
});
export type OilChangeDue = z.infer<typeof oilChangeDueSchema>;

/**
 * Both lists arrive complete — the panel decides how much to show at once and
 * scrolls the rest. The totals are the same counts, kept so the header can
 * state them without walking the arrays.
 */
export const attentionSchema = z.object({
  documents: z.array(expiringDocumentSchema).default([]),
  documents_total: z.number().default(0),
  oil_changes: z.array(oilChangeDueSchema).default([]),
  oil_changes_total: z.number().default(0),
});
export type Attention = z.infer<typeof attentionSchema>;

export const dashboardSchema = z.object({
  as_of: z.string(),
  month: dashboardMonthSchema,
  money: dashboardMoneySchema.optional(),
  fuel: fuelBlockSchema.optional(),
  fleet: z.array(fleetEntrySchema).default([]),
  exceptions: z.array(dashboardExceptionSchema).default([]),
  // Older builds of apex-rust predate this block; an absent one is an empty
  // one, so the panel renders "nothing due" rather than throwing.
  attention: attentionSchema.default({
    documents: [],
    documents_total: 0,
    oil_changes: [],
    oil_changes_total: 0,
  }),
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

export const fuelDrawerSchema = z.object({
  window_spend: z.string(),
  window_liters: z.number(),
  window_events: z.number(),
  by_method: z
    .array(z.object({ method: z.string(), spend: z.string(), liters: z.number() }))
    .default([]),
  events: z.array(fuelEventSchema).default([]),
});
export type FuelDrawer = z.infer<typeof fuelDrawerSchema>;

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
