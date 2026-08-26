import { decodePolyline5 } from '@/shared/lib/polyline';
import { cairoParts, cairoInstant } from '@/shared/lib/cairo';
import {
  buildPlaybackTrack,
  indexAtTime,
  stateAtTime,
  type PlaybackTrack,
} from '@/entities/etit-vehicle/playback';
import type { EtitHistoryPoint } from '@/entities/etit-vehicle/schemas';
import {
  parseFlagDetails,
  type TripFlag,
  type TripMatchReplayDetail,
} from '@/entities/trip-audit/schemas';

/* -------------------------------------------------------------------------- */
/* Colors — one palette shared by the map, the timeline, and the leg rail.    */
/* -------------------------------------------------------------------------- */

export const LEG_COLORS: Record<string, string> = {
  outbound: '#3b82f6', // blue
  between: '#8b5cf6', // violet
  return: '#14b8a6', // teal
};
export const LEG_COLOR_FALLBACK = '#64748b';
export const OSRM_COLOR = '#16a34a';
export const TRUCK_COLOR = '#2563eb';
export const TRUCK_SPEEDING_COLOR = '#dc2626';
export const GHOST_COLOR = '#16a34a';
export const STOP_PIN_COLOR = '#f59e0b';
export const FLAG_PIN_COLOR = '#ef4444';
export const DELIVERY_PIN_COLOR = '#0ea5e9';

export function legColor(legType: string): string {
  return LEG_COLORS[legType] ?? LEG_COLOR_FALLBACK;
}

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                            */
/* -------------------------------------------------------------------------- */

const EARTH_R = 6_371_000;

export function haversineM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function bearingDeg(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(bLng - aLng);
  const y = Math.sin(dLng) * Math.cos(toRad(bLat));
  const x =
    Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
    Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Cumulative meters along a path; `cum[i]` = meters from start to point i. */
function cumulativeMeters(path: Array<[number, number]>): number[] {
  const cum = new Array<number>(path.length);
  let total = 0;
  for (let i = 0; i < path.length; i++) {
    if (i > 0) {
      total += haversineM(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
    }
    cum[i] = total;
  }
  return cum;
}

/** Point (and local bearing) at `meters` along a path with cumulative array. */
export function pointAlong(
  path: Array<[number, number]>,
  cum: number[],
  meters: number,
): { lat: number; lng: number; bearing: number } | null {
  const n = path.length;
  if (n === 0) return null;
  if (n === 1 || meters <= 0) {
    const b = n > 1 ? bearingDeg(path[0][0], path[0][1], path[1][0], path[1][1]) : 0;
    return { lat: path[0][0], lng: path[0][1], bearing: b };
  }
  const total = cum[n - 1];
  if (meters >= total) {
    const b = bearingDeg(path[n - 2][0], path[n - 2][1], path[n - 1][0], path[n - 1][1]);
    return { lat: path[n - 1][0], lng: path[n - 1][1], bearing: b };
  }
  // Binary search for the segment containing `meters`.
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (cum[mid] <= meters) lo = mid;
    else hi = mid - 1;
  }
  const segLen = cum[lo + 1] - cum[lo] || 1;
  const t = (meters - cum[lo]) / segLen;
  const a = path[lo];
  const b = path[lo + 1];
  return {
    lat: a[0] + (b[0] - a[0]) * t,
    lng: a[1] + (b[1] - a[1]) * t,
    bearing: bearingDeg(a[0], a[1], b[0], b[1]),
  };
}

/* -------------------------------------------------------------------------- */
/* Model types                                                                 */
/* -------------------------------------------------------------------------- */

export interface ReplayLeg {
  id: number;
  index: number;
  seq: number;
  legType: string;
  fromName: string;
  toName: string;
  departMs: number | null;
  arriveMs: number | null;
  night: boolean;
  actualKm: number | null;
  osrmKm: number | null;
  actualSecs: number | null;
  osrmSecs: number | null;
  offRoutePct: number | null;
  actualPath: Array<[number, number]>;
  osrmPath: Array<[number, number]>;
  osrmCum: number[];
  osrmLenM: number;
  /** True when both timeline bounds are known and sane. */
  timed: boolean;
}

export type PinKind = 'delivery' | 'stop' | 'flag';

export interface ReplayEventPin {
  id: string;
  kind: PinKind;
  ms: number;
  label: string;
  lat: number | null;
  lng: number | null;
  color: string;
}

export interface DwellInterval {
  startMs: number;
  endMs: number;
  durationMs: number;
  lat: number;
  lng: number;
}

export interface ReplayModel {
  startMs: number;
  endMs: number;
  spanMs: number;
  legs: ReplayLeg[];
  /** Legs with usable timeline bounds, in playback order. */
  timedLegs: ReplayLeg[];
  /** Clipped night-permit intervals (20:00–07:00 Cairo) inside the trip window. */
  nightIntervals: Array<[number, number]>;
  pins: ReplayEventPin[];
  dwells: DwellInterval[];
  track: PlaybackTrack;
  /** Cumulative km driven at each track point (parallel to track.times). */
  cumKm: number[];
  /** Prefix optimal seconds before each timed leg (legs w/o geometry count 0). */
  optPrefixSecs: number[];
  totalOptimalSecs: number;
  /** True when the GPS track can drive a scrubber. */
  playable: boolean;
}

/* -------------------------------------------------------------------------- */
/* Dwell detection — clusters of fixes within ~60m lasting >90s.               */
/* -------------------------------------------------------------------------- */

const DWELL_RADIUS_M = 60;
const DWELL_MIN_MS = 90_000;

export function detectDwells(track: PlaybackTrack): DwellInterval[] {
  const pts = track.points;
  const out: DwellInterval[] = [];
  let i = 0;
  while (i < pts.length - 1) {
    const anchor = pts[i];
    let j = i + 1;
    while (
      j < pts.length &&
      haversineM(anchor.lat, anchor.lng, pts[j].lat, pts[j].lng) < DWELL_RADIUS_M
    ) {
      j++;
    }
    const startMs = track.times[i];
    const endMs = track.times[j - 1];
    if (endMs - startMs > DWELL_MIN_MS) {
      out.push({
        startMs,
        endMs,
        durationMs: endMs - startMs,
        lat: anchor.lat,
        lng: anchor.lng,
      });
      i = j;
    } else {
      i++;
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Night intervals — 20:00 → 07:00 Africa/Cairo, clipped to the trip window.  */
/* -------------------------------------------------------------------------- */

export function nightIntervals(startMs: number, endMs: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  // Start from the Cairo day *before* the window so a window that begins at
  // 03:00 still gets the tail of the previous night.
  const p = cairoParts(new Date(startMs));
  for (let d = -1; ; d++) {
    const nightStart = Date.parse(cairoInstant(p.y, p.m, p.d + d, 20, 0, 0));
    const nightEnd = Date.parse(cairoInstant(p.y, p.m, p.d + d + 1, 7, 0, 0));
    if (nightStart > endMs) break;
    const s = Math.max(nightStart, startMs);
    const e = Math.min(nightEnd, endMs);
    if (e > s) out.push([s, e]);
    if (d > 40) break; // hard safety bound
  }
  return out;
}

export function isNight(model: ReplayModel, ms: number): boolean {
  for (const [s, e] of model.nightIntervals) {
    if (ms >= s && ms <= e) return true;
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/* Flag pins                                                                   */
/* -------------------------------------------------------------------------- */

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asMs(v: unknown): number | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/** Nearest track timestamp to a coordinate — linear scan, run once per flag. */
function nearestTrackMs(track: PlaybackTrack, lat: number, lng: number): number | null {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < track.points.length; i++) {
    const p = track.points[i];
    const dLat = p.lat - lat;
    const dLng = p.lng - lng;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best >= 0 ? track.times[best] : null;
}

function flagPin(
  flag: TripFlag,
  track: PlaybackTrack,
  legsById: Map<number, ReplayLeg>,
  clampMs: (ms: number) => number,
): ReplayEventPin | null {
  const details = parseFlagDetails(flag);
  const lat = asNumber(details.lat);
  const lng = asNumber(details.lng);
  let ms =
    asMs(details.from_ts) ??
    asMs(details.ts) ??
    asMs(details.start_ts) ??
    null;
  if (ms == null && lat != null && lng != null && track.points.length > 0) {
    ms = nearestTrackMs(track, lat, lng);
  }
  if (ms == null && flag.leg_id != null) {
    const leg = legsById.get(flag.leg_id);
    ms = leg?.arriveMs ?? leg?.departMs ?? null;
  }
  if (ms == null) return null;
  const isStop = flag.flag_type === 'unplanned_stop';
  return {
    id: `flag-${flag.id}`,
    kind: isStop ? 'stop' : 'flag',
    ms: clampMs(ms),
    label: flag.flag_type,
    lat,
    lng,
    color: isStop ? STOP_PIN_COLOR : FLAG_PIN_COLOR,
  };
}

/* -------------------------------------------------------------------------- */
/* Model builder                                                               */
/* -------------------------------------------------------------------------- */

export function buildReplayModel(
  detail: TripMatchReplayDetail,
  points: EtitHistoryPoint[],
): ReplayModel {
  const track = buildPlaybackTrack(points);
  const playable = track.points.length >= 2;

  const legs: ReplayLeg[] = [...detail.legs]
    .sort((a, b) => a.seq - b.seq)
    .map((leg, index) => {
      const departMs = leg.depart_ts ? Date.parse(leg.depart_ts) : NaN;
      const arriveMs = leg.arrive_ts ? Date.parse(leg.arrive_ts) : NaN;
      const timed =
        Number.isFinite(departMs) && Number.isFinite(arriveMs) && arriveMs > departMs;
      const actualPath = decodePolyline5(leg.actual_geometry);
      const osrmPath = decodePolyline5(leg.osrm_geometry);
      const osrmCum = cumulativeMeters(osrmPath);
      return {
        id: leg.id,
        index,
        seq: leg.seq,
        legType: leg.leg_type,
        fromName: leg.from_name,
        toName: leg.to_name,
        departMs: timed ? departMs : null,
        arriveMs: timed ? arriveMs : null,
        night: leg.night_window === 1,
        actualKm: leg.actual_km ?? null,
        osrmKm: leg.osrm_km ?? null,
        actualSecs: leg.actual_secs ?? null,
        osrmSecs: leg.osrm_secs ?? null,
        offRoutePct: leg.off_route_pct ?? null,
        actualPath,
        osrmPath,
        osrmCum,
        osrmLenM: osrmCum.length > 0 ? osrmCum[osrmCum.length - 1] : 0,
        timed,
      };
    });

  const timedLegs = legs.filter((l) => l.timed);

  // Trip window: prefer start/end_ts, fall back to leg bounds, then the track.
  let startMs = detail.start_ts ? Date.parse(detail.start_ts) : NaN;
  let endMs = detail.end_ts ? Date.parse(detail.end_ts) : NaN;
  if (!Number.isFinite(startMs) && timedLegs.length > 0) startMs = timedLegs[0].departMs!;
  if (!Number.isFinite(endMs) && timedLegs.length > 0) {
    endMs = timedLegs[timedLegs.length - 1].arriveMs!;
  }
  if (!Number.isFinite(startMs) && playable) startMs = track.startMs;
  if (!Number.isFinite(endMs) && playable) endMs = track.endMs;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    startMs = playable ? track.startMs : 0;
    endMs = playable ? track.endMs : 1;
  }

  const clampMs = (ms: number) => Math.min(endMs, Math.max(startMs, ms));

  // Cumulative km along the GPS trace.
  const cumKm = new Array<number>(track.points.length);
  let acc = 0;
  for (let i = 0; i < track.points.length; i++) {
    if (i > 0) {
      const a = track.points[i - 1];
      const b = track.points[i];
      acc += haversineM(a.lat, a.lng, b.lat, b.lng) / 1000;
    }
    cumKm[i] = acc;
  }

  // Prefix optimal seconds across timed legs (empty geometry ⇒ 0 duration —
  // the optimal journey skips them instead of stalling).
  const optPrefixSecs: number[] = [];
  let optAcc = 0;
  for (const leg of timedLegs) {
    optPrefixSecs.push(optAcc);
    if (leg.osrmPath.length > 1 && (leg.osrmSecs ?? 0) > 0) optAcc += leg.osrmSecs!;
  }

  // Event pins: delivery arrivals at leg boundaries + flags.
  const pins: ReplayEventPin[] = [];
  for (const leg of timedLegs) {
    const end =
      leg.actualPath.length > 0
        ? leg.actualPath[leg.actualPath.length - 1]
        : leg.osrmPath.length > 0
          ? leg.osrmPath[leg.osrmPath.length - 1]
          : null;
    pins.push({
      id: `arrive-${leg.id}`,
      kind: 'delivery',
      ms: clampMs(leg.arriveMs!),
      label: leg.toName,
      lat: end ? end[0] : null,
      lng: end ? end[1] : null,
      color: DELIVERY_PIN_COLOR,
    });
  }
  const legsById = new Map(legs.map((l) => [l.id, l]));
  for (const flag of detail.flags) {
    const pin = flagPin(flag, track, legsById, clampMs);
    if (pin) pins.push(pin);
  }
  pins.sort((a, b) => a.ms - b.ms);

  return {
    startMs,
    endMs,
    spanMs: Math.max(1, endMs - startMs),
    legs,
    timedLegs,
    nightIntervals: nightIntervals(startMs, endMs),
    pins,
    dwells: playable ? detectDwells(track) : [],
    track,
    cumKm,
    optPrefixSecs,
    totalOptimalSecs: optAcc,
    playable,
  };
}

/* -------------------------------------------------------------------------- */
/* Time-indexed lookups (all O(log n) via binary search)                       */
/* -------------------------------------------------------------------------- */

export interface ActualState {
  lat: number;
  lng: number;
  bearing: number;
  speed: number;
  speeding: boolean;
}

/** Interpolated GPS state (position + bearing between fixes) at `ms`. */
export function actualStateAt(model: ReplayModel, ms: number): ActualState | null {
  const { track } = model;
  if (track.points.length === 0) return null;
  const s = stateAtTime(track, ms);
  if (!s) return null;
  const i = Math.max(0, indexAtTime(track.times, ms));
  const a = track.points[Math.min(i, track.points.length - 1)];
  const b = track.points[Math.min(i + 1, track.points.length - 1)];
  const bearing =
    a === b ? 0 : bearingDeg(a.lat, a.lng, b.lat, b.lng);
  return { lat: s.lat, lng: s.lng, bearing, speed: s.speed, speeding: s.speeding };
}

/** Km driven along the GPS trace up to `ms`. */
export function kmDrivenAt(model: ReplayModel, ms: number): number {
  const { track, cumKm } = model;
  if (track.points.length === 0) return 0;
  if (ms <= track.startMs) return 0;
  if (ms >= track.endMs) return cumKm[cumKm.length - 1];
  const i = indexAtTime(track.times, ms);
  if (i < 0) return 0;
  if (i >= track.times.length - 1) return cumKm[cumKm.length - 1];
  const span = track.times[i + 1] - track.times[i] || 1;
  const t = (ms - track.times[i]) / span;
  return cumKm[i] + (cumKm[i + 1] - cumKm[i]) * t;
}

/** Index of the timed leg containing `ms`, or -1 (dwell gap / outside). */
export function timedLegIndexAt(model: ReplayModel, ms: number): number {
  for (let i = 0; i < model.timedLegs.length; i++) {
    const leg = model.timedLegs[i];
    if (ms >= leg.departMs! && ms <= leg.arriveMs!) return i;
  }
  return -1;
}

/** Latest timed leg whose departure is <= ms (for "current/previous leg"). */
export function lastDepartedLegIndex(model: ReplayModel, ms: number): number {
  let out = -1;
  for (let i = 0; i < model.timedLegs.length; i++) {
    if (model.timedLegs[i].departMs! <= ms) out = i;
    else break;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Optimal journey mapping                                                     */
/*                                                                             */
/* The optimal journey runs legs back-to-back with zero dwell, each leg       */
/* paced by its `osrm_secs`. `oMs` is elapsed ms on that virtual clock.       */
/* Real↔optimal mapping keeps the timeline playhead meaningful in Optimal    */
/* mode: while the optimal marker is inside leg k, the playhead is at the     */
/* proportional position inside leg k's real segment.                         */
/* -------------------------------------------------------------------------- */

function legOptMs(leg: ReplayLeg): number {
  return leg.osrmPath.length > 1 && (leg.osrmSecs ?? 0) > 0 ? leg.osrmSecs! * 1000 : 0;
}

export function totalOptimalMs(model: ReplayModel): number {
  return model.totalOptimalSecs * 1000;
}

/** Optimal-clock position for a real timeline instant. */
export function realToOptimalMs(model: ReplayModel, tMs: number): number {
  let o = 0;
  for (let i = 0; i < model.timedLegs.length; i++) {
    const leg = model.timedLegs[i];
    const dur = legOptMs(leg);
    if (tMs >= leg.arriveMs!) {
      o += dur;
      continue;
    }
    if (tMs > leg.departMs!) {
      const frac = (tMs - leg.departMs!) / (leg.arriveMs! - leg.departMs!);
      o += dur * frac;
    }
    break;
  }
  return o;
}

/** Real timeline instant for an optimal-clock position (inverse mapping). */
export function optimalToRealMs(model: ReplayModel, oMs: number): number {
  let rest = oMs;
  for (let i = 0; i < model.timedLegs.length; i++) {
    const leg = model.timedLegs[i];
    const dur = legOptMs(leg);
    if (dur <= 0) continue;
    if (rest <= dur) {
      const frac = rest / dur;
      return leg.departMs! + frac * (leg.arriveMs! - leg.departMs!);
    }
    rest -= dur;
  }
  const last = model.timedLegs[model.timedLegs.length - 1];
  return last ? last.arriveMs! : model.endMs;
}

export interface OptimalState {
  lat: number;
  lng: number;
  bearing: number;
  legIndex: number;
  km: number;
}

/** Position along the whole optimal journey at optimal-clock `oMs`. */
export function optimalStateAt(model: ReplayModel, oMs: number): OptimalState | null {
  let rest = oMs;
  let km = 0;
  let lastWithGeom: { leg: ReplayLeg; i: number } | null = null;
  for (let i = 0; i < model.timedLegs.length; i++) {
    const leg = model.timedLegs[i];
    const dur = legOptMs(leg);
    if (dur <= 0) continue;
    if (rest <= dur) {
      const frac = Math.min(1, Math.max(0, rest / dur));
      const pos = pointAlong(leg.osrmPath, leg.osrmCum, frac * leg.osrmLenM);
      if (!pos) return null;
      km += (leg.osrmKm ?? leg.osrmLenM / 1000) * frac;
      return { ...pos, legIndex: i, km };
    }
    rest -= dur;
    km += leg.osrmKm ?? leg.osrmLenM / 1000;
    lastWithGeom = { leg, i };
  }
  if (!lastWithGeom) return null;
  const { leg, i } = lastWithGeom;
  const pos = pointAlong(leg.osrmPath, leg.osrmCum, leg.osrmLenM);
  return pos ? { ...pos, legIndex: i, km } : null;
}

export interface GhostState {
  lat: number;
  lng: number;
  bearing: number;
  /** True once the ghost has reached the leg's destination. */
  arrived: boolean;
}

/**
 * Race-mode ghost position inside one leg: departs with the real truck at
 * the leg's `departMs` and reaches the destination after `osrm_secs`.
 * Returns null when the leg has no OSRM geometry (ghost hidden).
 */
export function ghostStateInLeg(
  leg: ReplayLeg,
  tMs: number,
): GhostState | null {
  if (leg.osrmPath.length < 2 || (leg.osrmSecs ?? 0) <= 0 || !leg.timed) return null;
  const elapsed = tMs - leg.departMs!;
  const durMs = leg.osrmSecs! * 1000;
  const frac = Math.min(1, Math.max(0, elapsed / durMs));
  const pos = pointAlong(leg.osrmPath, leg.osrmCum, frac * leg.osrmLenM);
  if (!pos) return null;
  return { ...pos, arrived: frac >= 1 };
}

/** Optimal km "so far" for a real timeline instant (used in Actual/Race). */
export function kmOptimalAt(model: ReplayModel, tMs: number): number {
  let km = 0;
  for (let i = 0; i < model.timedLegs.length; i++) {
    const leg = model.timedLegs[i];
    const legKm = leg.osrmKm ?? leg.osrmLenM / 1000;
    if (tMs >= leg.arriveMs!) {
      km += legKm;
      continue;
    }
    if (tMs > leg.departMs!) {
      km += legKm * ((tMs - leg.departMs!) / (leg.arriveMs! - leg.departMs!));
    }
    break;
  }
  return km;
}

/** Dwell interval containing `ms`, or null. */
export function dwellAt(model: ReplayModel, ms: number): DwellInterval | null {
  for (const d of model.dwells) {
    if (ms >= d.startMs && ms < d.endMs) return d;
  }
  return null;
}
