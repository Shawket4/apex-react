import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Status code → label mapping                                                 */
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

export const ETIT_STATUS_COLOR: Record<EtitStatusGroup | 'unknown', string> = {
  moving: '#16A34A',
  stoppedIgnitionOff: '#6B7280',
  offline: '#52525B',
  idling: '#F59E0B',
  geofenceViolation: '#DC2626',
  unknown: '#94A3B8',
};

/* -------------------------------------------------------------------------- */
/* Vehicle                                                                     */
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
  /** Bearing in degrees (0-359). Optional — older proxies don't surface it. */
  heading: z.number().optional(),
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
  heading: z.number().optional(),
  timestamp: optionalIso,
  event: z.string().nullish(),
  sensorData: z.string().nullish(),
});

export type EtitLiveStatus = z.output<typeof etitLiveStatusSchema>;
export const etitLiveListSchema = z.array(etitLiveStatusSchema);

/**
 * Delta schema for SSE updates. Every field is optional EXCEPT `id` —
 * without an id we cannot merge a partial into the cache without trampling
 * other vehicles' state. Built explicitly rather than `partial()` because
 * `.partial()` would lose the id requirement.
 */
export const etitLiveDeltaSchema = etitLiveStatusSchema.partial().extend({
  id: z.string(),
});
export type EtitLiveDelta = z.output<typeof etitLiveDeltaSchema>;
export const etitLiveDeltaListSchema = z.array(etitLiveDeltaSchema);

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
