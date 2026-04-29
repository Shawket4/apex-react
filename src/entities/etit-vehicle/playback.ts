import type { EtitHistoryPoint, EtitSensorEvent, EtitStop } from './schemas';

/* -------------------------------------------------------------------------- */
/* Polyline decoder                                                            */
/*                                                                             */
/* Mirrors `encode_polyline` in `src/domain/history.rs`. Precision-5,         */
/* compatible with `google.maps.geometry.encoding.decodePath`.                 */
/*                                                                             */
/* The proxy already encodes the simplified polyline server-side, so we      */
/* only need a decoder. Returns `[lat, lng]` pairs.                            */
/* -------------------------------------------------------------------------- */

export function decodePolyline(encoded: string): Array<[number, number]> {
  if (!encoded) return [];
  const out: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const len = encoded.length;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      if (index >= len) return out;
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      if (index >= len) return out;
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Time-indexed playback                                                       */
/*                                                                             */
/* The proxy returns `points` sorted ascending by timestamp, but a few of    */
/* the points may have `timestamp: null` (the upstream's row-level metadata */
/* sometimes lacks it). We pre-filter to keep only points with parseable     */
/* timestamps, sort defensively, and snapshot start/end millis for cheap    */
/* boundary checks during scrubbing.                                         */
/* -------------------------------------------------------------------------- */

export interface PlaybackTrack {
  /** Points with a non-null timestamp, sorted ascending. */
  points: Array<EtitHistoryPoint & { timestamp: Date }>;
  /** Cached `points[i].timestamp.getTime()` for hot-path binary search. */
  times: number[];
  /** First / last timestamps in millis. Equal when `points.length === 1`. */
  startMs: number;
  endMs: number;
  /** Total span in millis. Zero when there's <2 points. */
  spanMs: number;
}

export function buildPlaybackTrack(points: EtitHistoryPoint[]): PlaybackTrack {
  const filtered = points.filter(
    (p): p is EtitHistoryPoint & { timestamp: Date } =>
      p.timestamp instanceof Date && Number.isFinite(p.timestamp.getTime()),
  );
  filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const times = filtered.map((p) => p.timestamp.getTime());
  const startMs = times[0] ?? 0;
  const endMs = times[times.length - 1] ?? 0;
  return {
    points: filtered,
    times,
    startMs,
    endMs,
    spanMs: Math.max(0, endMs - startMs),
  };
}

/* -------------------------------------------------------------------------- */
/* Lookup                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Index of the latest point whose timestamp is `<= ms`. Returns -1 when
 * `ms` precedes every point. Binary search; O(log n).
 */
export function indexAtTime(times: number[], ms: number): number {
  if (times.length === 0 || ms < times[0]) return -1;
  if (ms >= times[times.length - 1]) return times.length - 1;

  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (times[mid] <= ms) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/* -------------------------------------------------------------------------- */
/* Interpolated state                                                          */
/*                                                                             */
/* Returns the vehicle's interpolated position at `ms`. We linearly         */
/* interpolate between the two surrounding points so the marker glides     */
/* between samples instead of teleporting. Speed is taken from the *prior* */
/* point — speed is reported in km/h *at* the sample, not between samples, */
/* so interpolating it would invent values that didn't happen.             */
/*                                                                             */
/* When `ms` is before the first point or there's only one point, we      */
/* return the first/only point as-is.                                       */
/* -------------------------------------------------------------------------- */

export interface PlaybackState {
  lat: number;
  lng: number;
  /** km/h at the most recent sample. */
  speed: number;
  /** km/h limit at the most recent sample. */
  speedLimit: number;
  /** Wall-clock time being shown. */
  timestamp: Date;
  /** Whether `timestamp` is over the speed limit (>0 limit && speed > limit). */
  speeding: boolean;
}

export function stateAtTime(track: PlaybackTrack, ms: number): PlaybackState | null {
  if (track.points.length === 0) return null;
  if (ms <= track.startMs) {
    const p = track.points[0];
    return {
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      speedLimit: p.speedLimit,
      timestamp: p.timestamp,
      speeding: p.speedLimit > 0 && p.speed > p.speedLimit,
    };
  }
  if (ms >= track.endMs) {
    const p = track.points[track.points.length - 1];
    return {
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      speedLimit: p.speedLimit,
      timestamp: p.timestamp,
      speeding: p.speedLimit > 0 && p.speed > p.speedLimit,
    };
  }

  const i = indexAtTime(track.times, ms);
  // i is guaranteed to be in range now (we handled both ends above).
  const a = track.points[i];
  const b = track.points[i + 1] ?? a;

  const span = track.times[i + 1] - track.times[i] || 1;
  const t = (ms - track.times[i]) / span;

  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    // Speed is held from the prior sample — see comment above.
    speed: a.speed,
    speedLimit: a.speedLimit,
    timestamp: new Date(ms),
    speeding: a.speedLimit > 0 && a.speed > a.speedLimit,
  };
}

/**
 * Returns interpolated state at a fractional index.
 * index 0.5 is halfway between points[0] and points[1].
 */
export function stateAtIndex(track: PlaybackTrack, index: number): PlaybackState | null {
  const points = track.points;
  const len = points.length;
  if (len === 0) return null;

  if (index <= 0) {
    const p = points[0];
    return {
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      speedLimit: p.speedLimit,
      timestamp: p.timestamp,
      speeding: p.speedLimit > 0 && p.speed > p.speedLimit,
    };
  }

  if (index >= len - 1) {
    const p = points[len - 1];
    return {
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      speedLimit: p.speedLimit,
      timestamp: p.timestamp,
      speeding: p.speedLimit > 0 && p.speed > p.speedLimit,
    };
  }

  const i = Math.floor(index);
  const t = index - i;
  const a = points[i];
  const b = points[i + 1];

  const timeA = a.timestamp.getTime();
  const timeB = b.timestamp.getTime();

  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    speed: a.speed,
    speedLimit: a.speedLimit,
    timestamp: new Date(timeA + (timeB - timeA) * t),
    speeding: a.speedLimit > 0 && a.speed > a.speedLimit,
  };
}

/* -------------------------------------------------------------------------- */
/* Stops + sensor events near a moment                                         */
/*                                                                             */
/* Used by the player's "what's happening now" panel. Returns the current   */
/* stop (if `ms` is between any stop's from/to), and the most recent sensor */
/* event within a reasonable window — by default 5 minutes.                 */
/* -------------------------------------------------------------------------- */

const RECENT_SENSOR_WINDOW_MS = 5 * 60_000;

export function activeStop(stops: EtitStop[], ms: number): EtitStop | null {
  for (const s of stops) {
    if (s.from.getTime() <= ms && ms <= s.to.getTime()) return s;
  }
  return null;
}

export function recentSensor(
  sensors: EtitSensorEvent[],
  ms: number,
  windowMs = RECENT_SENSOR_WINDOW_MS,
): EtitSensorEvent | null {
  let latest: EtitSensorEvent | null = null;
  for (const s of sensors) {
    const t = s.timestamp.getTime();
    if (t <= ms && ms - t <= windowMs) {
      if (!latest || s.timestamp > latest.timestamp) latest = s;
    }
  }
  return latest;
}
