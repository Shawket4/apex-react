import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Status code → label mapping                                                 */
/*                                                                             */
/* Mirrors `domain::status_label` in the Rust proxy. Keeping a parallel copy  */
/* on the frontend means the dashboard can render badges/colours without     */
/* needing the backend's `statusLabel` field — useful when the proxy's       */
/* live snapshot is stale or partial.                                         */
/* -------------------------------------------------------------------------- */

export const ETIT_STATUS_GROUPS = {
  moving: [1, 4],
  stoppedIgnitionOff: [3],
  offline: [12],
  idling: [13],
  geofenceViolation: [17, 18],
} as const;

export type EtitStatusGroup = keyof typeof ETIT_STATUS_GROUPS;

export function classifyStatus(code: number): EtitStatusGroup | 'unknown' {
  for (const [group, codes] of Object.entries(ETIT_STATUS_GROUPS) as [
    EtitStatusGroup,
    readonly number[],
  ][]) {
    if (codes.includes(code)) return group;
  }
  return 'unknown';
}

export function isEtitOnline(status: number): boolean {
  return classifyStatus(status) !== 'offline';
}

/**
 * A single colour per status group, used by the map markers, the vehicle
 * list rows, and the playback player. Keep these in sync with the Tailwind
 * tokens used elsewhere — but the map itself takes raw hex (its SVG marker
 * builder doesn't read CSS variables), so we hardcode here.
 */
export const ETIT_STATUS_COLOR: Record<EtitStatusGroup | 'unknown', string> = {
  moving: '#16A34A',                // green-600
  stoppedIgnitionOff: '#6B7280',    // gray-500
  offline: '#52525B',               // zinc-600
  idling: '#F59E0B',                // amber-500
  geofenceViolation: '#DC2626',     // red-600
  unknown: '#94A3B8',               // slate-400
};

/* -------------------------------------------------------------------------- */
/* Vehicle                                                                     */
/*                                                                             */
/* The proxy serializes camelCase via `#[serde(rename_all = "camelCase")]`,   */
/* so most fields pass through unchanged. The only normalisation we do is    */
/* coerce `lastLocationAt` to `Date | null`.                                  */
/* -------------------------------------------------------------------------- */

const optionalIso = z
  .string()
  .nullish()
  .transform((s) => (s ? new Date(s) : null));

export const etitVehicleSchema = z.object({
  id: z.string(),
  codename: z.string(),
  plate: z.string(),
  speedLimit: z.number(),
  online: z.boolean(),
  speed: z.number(),
  status: z.number(),
  statusLabel: z.string(),
  lastLocationAt: optionalIso,
  lat: z.number().optional(),
  lng: z.number().optional(),
  // The proxy carries an `extra` map for forward-compat. Pass through so
  // we don't break when the upstream adds new columns.
  extra: z.record(z.unknown()).optional().default({}),
});

export type EtitVehicle = z.output<typeof etitVehicleSchema>;
export const etitVehiclesSchema = z.array(etitVehicleSchema);

/* -------------------------------------------------------------------------- */
/* Live status                                                                 */
/* -------------------------------------------------------------------------- */

export const etitLiveStatusSchema = z.object({
  id: z.string(),
  plate: z.string().nullish(),
  speed: z.number(),
  status: z.number(),
  statusLabel: z.string(),
  lat: z.number(),
  lng: z.number(),
  timestamp: optionalIso,
  event: z.string().nullish(),
  sensorData: z.string().nullish(),
});

export type EtitLiveStatus = z.output<typeof etitLiveStatusSchema>;
export const etitLiveListSchema = z.array(etitLiveStatusSchema);

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

export const etitHistoryPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: optionalIso,
  speed: z.number(),
  speedLimit: z.number(),
});

export type EtitHistoryPoint = z.output<typeof etitHistoryPointSchema>;

export const etitStopSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  from: z.string().transform((s) => new Date(s)),
  to: z.string().transform((s) => new Date(s)),
  duration: z.string(),
  address: z.string(),
});

export type EtitStop = z.output<typeof etitStopSchema>;

export const etitSensorEventSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string().transform((s) => new Date(s)),
  typeName: z.string(),
});

export type EtitSensorEvent = z.output<typeof etitSensorEventSchema>;

export const etitHistoryResponseSchema = z.object({
  vehicleId: z.string(),
  from: z.string().transform((s) => new Date(s)),
  to: z.string().transform((s) => new Date(s)),
  points: z.array(etitHistoryPointSchema),
  stops: z.array(etitStopSchema),
  sensors: z.array(etitSensorEventSchema),
  geometry: z.string(),
  cached: z.boolean(),
  fetchedAt: z.string().transform((s) => new Date(s)),
});

export type EtitHistoryResponse = z.output<typeof etitHistoryResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Trip summary                                                                */
/*                                                                             */
/* Every field arrives as a string from the legacy ETIT system, including    */
/* numeric counts — we leave them as strings for display and rely on the     */
/* proxy to have already done any normalisation. Consumers that need the    */
/* numeric version can `parseFloat` on the spot.                             */
/* -------------------------------------------------------------------------- */

export const etitTripSummarySchema = z.object({
  totalMileage: z.string(),
  totalActiveTime: z.string(),
  totalPassiveTime: z.string().optional(),
  totalIdleTime: z.string(),
  driverName: z.string(),
  numberOfStops: z.string(),
  totalDisconnectedTime: z.string().optional(),
  totalFuelConsumption: z.string(),
  ignitionOffCount: z.string().optional(),
  ignitionOnCount: z.string(),
});

export type EtitTripSummary = z.output<typeof etitTripSummarySchema>;
