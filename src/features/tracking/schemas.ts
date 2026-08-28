import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Wire shapes — etit-proxy-rust, api/v1. Fresh module: nothing here is       */
/* shared with the old etit entities.                                          */
/* -------------------------------------------------------------------------- */

const iso = z
  .string()
  .nullish()
  .transform((s) => (s ? new Date(s) : null));

export const vehicleSchema = z.object({
  id: z.string(),
  codename: z.string(),
  plate: z.string(),
  speedLimit: z.number(),
  online: z.boolean(),
  speed: z.number(),
  status: z.number(),
  statusLabel: z.string(),
  lastLocationAt: iso,
  lat: z.number().optional(),
  lng: z.number().optional(),
  heading: z.number().optional(),
});
export type Vehicle = z.output<typeof vehicleSchema>;
export const vehicleListSchema = z.array(vehicleSchema);

export const liveStatusSchema = z.object({
  id: z.string(),
  plate: z.string().nullish(),
  speed: z.number(),
  status: z.number(),
  statusLabel: z.string(),
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  timestamp: iso,
  event: z.string().nullish(),
});
export type LiveStatus = z.output<typeof liveStatusSchema>;
export const liveListSchema = z.array(liveStatusSchema);

/** SSE deltas: everything optional EXCEPT id — an id-less delta cannot merge. */
export const liveDeltaSchema = liveStatusSchema.partial().extend({ id: z.string() });
export type LiveDelta = z.output<typeof liveDeltaSchema>;
export const liveDeltaListSchema = z.array(liveDeltaSchema);

export const historyPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: iso,
  speed: z.number(),
  speedLimit: z.number(),
});
export type HistoryPoint = z.output<typeof historyPointSchema>;

export const stopSchema = z.object({
  address: z.string(),
  duration: z.string(),
  lat: z.number(),
  lng: z.number(),
  from: z.string().transform((s) => new Date(s)),
  to: z.string().transform((s) => new Date(s)),
});
export type Stop = z.output<typeof stopSchema>;

export const sensorEventSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string().transform((s) => new Date(s)),
  typeName: z.string(),
});
export type SensorEvent = z.output<typeof sensorEventSchema>;

/** A place visit from the trip audit's matched legs — terminal departures,
 *  drop-off/garage dwells. Served inline with history so the tracking map
 *  and the audit can never disagree. */
export const tripPinSchema = z.object({
  name: z.string(),
  kind: z.string(),
  lat: z.number(),
  lng: z.number(),
  arrive: iso.optional(),
  depart: iso.optional(),
  dwellSecs: z.number().nullish(),
  parentTripId: z.number().nullish(),
});
export type TripPin = z.output<typeof tripPinSchema>;

/** A trip-audit leg — a TIME RANGE over the track (no geometry of its own;
 *  the segment is sliced from the response's points by [depart, arrive]).
 *  `osrmGeometry` appears only when the request adds include=optimal. */
export const tripLegSchema = z.object({
  parentTripId: z.number(),
  seq: z.number(),
  legType: z.string(),
  fromName: z.string().nullish(),
  toName: z.string().nullish(),
  depart: z.string().transform((v) => new Date(v)),
  arrive: z.string().transform((v) => new Date(v)),
  actualKm: z.number().nullish(),
  osrmKm: z.number().nullish(),
  actualSecs: z.number().nullish(),
  osrmSecs: z.number().nullish(),
  distanceRatio: z.number().nullish(),
  offRoutePct: z.number().nullish(),
  distanceMethod: z.string().nullish(),
  startsBeforeWindow: z.boolean().optional().default(false),
  endsAfterWindow: z.boolean().optional().default(false),
  osrmGeometry: z.string().nullish(),
});
export type TripLeg = z.output<typeof tripLegSchema>;

export const historyDaySchema = z.object({
  points: z.array(historyPointSchema),
  stops: z.array(stopSchema),
  sensors: z.array(sensorEventSchema),
  geometry: z.string(),
  pins: z.array(tripPinSchema).optional().default([]),
  legs: z.array(tripLegSchema).optional().default([]),
});
export type HistoryDay = z.output<typeof historyDaySchema>;

export const rangeSummarySchema = z.object({
  mileageKm: z.number(),
  distanceMethod: z.enum(['matched', 'raw']).catch('raw'),
  matchCoveragePct: z.number().optional(),
  activeSecs: z.number(),
  idleSecs: z.number(),
  passiveSecs: z.number(),
  disconnectedSecs: z.number(),
  stopCount: z.number(),
  ignitionOnCount: z.number(),
  ignitionOffCount: z.number(),
  pointCount: z.number(),
  from: z.string(),
  to: z.string(),
});
export type RangeSummary = z.output<typeof rangeSummarySchema>;

/* -------------------------------------------------------------------------- */
/* Status classification                                                       */
/* -------------------------------------------------------------------------- */

export const STATUS_GROUPS = {
  moving: [1, 4],
  idling: [13],
  stopped: [3],
  geofence: [17, 18],
  offline: [12],
} as const;

export type StatusGroup = keyof typeof STATUS_GROUPS | 'unknown';

export const STATUS_ORDER: StatusGroup[] = [
  'moving',
  'idling',
  'stopped',
  'geofence',
  'unknown',
  'offline',
];

export const STATUS_COLOR: Record<StatusGroup, string> = {
  moving: '#16a34a',
  idling: '#f59e0b',
  stopped: '#6b7280',
  geofence: '#dc2626',
  offline: '#52525b',
  unknown: '#94a3b8',
};

export function statusGroup(code: number): StatusGroup {
  for (const [group, codes] of Object.entries(STATUS_GROUPS)) {
    if ((codes as readonly number[]).includes(code)) return group as StatusGroup;
  }
  return 'unknown';
}
