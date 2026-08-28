/**
 * Pure replay math. The clock is three numbers — no state cascades, no
 * per-frame React. Position is DERIVED from (track, cursorMs), so the map
 * marker and the scrubber can never desync.
 */

import type { ReplayTrack } from './use-history';
import type { HistoryPoint } from './schemas';

export const SPEEDS = [1, 4, 16, 64, 256] as const;

/** Index of the last point at or before `tMs` — O(log n). */
export function indexAt(times: Float64Array, tMs: number): number {
  let lo = 0;
  let hi = times.length - 1;
  if (tMs <= times[0]) return 0;
  if (tMs >= times[hi]) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= tMs) lo = mid;
    else hi = mid;
  }
  return lo;
}

export interface ReplaySample {
  lng: number;
  lat: number;
  /** km/h at the cursor. */
  speed: number;
  /** Bearing degrees of travel, for the marker arrow. */
  heading: number;
  index: number;
}

export function sampleAt(track: ReplayTrack, tMs: number): ReplaySample {
  const i = indexAt(track.timesMs, tMs);
  const j = Math.min(i + 1, track.path.length - 1);
  const t0 = track.timesMs[i];
  const t1 = track.timesMs[j];
  const f = t1 > t0 ? Math.min(1, Math.max(0, (tMs - t0) / (t1 - t0))) : 0;

  const [x0, y0] = track.path[i];
  const [x1, y1] = track.path[j];
  const lng = x0 + (x1 - x0) * f;
  const lat = y0 + (y1 - y0) * f;

  const heading =
    x1 !== x0 || y1 !== y0
      ? (Math.atan2(x1 - x0, y1 - y0) * 180) / Math.PI
      : 0;

  return { lng, lat, speed: track.speeds[i], heading: (heading + 360) % 360, index: i };
}

/** Build a GPU-ready track from timestamped points (must be sorted). */
export function buildTrack(points: HistoryPoint[]): ReplayTrack | null {
  const usable = points.filter((p) => p.timestamp);
  if (usable.length < 2) return null;
  const path: [number, number][] = new Array(usable.length);
  const timesMs = new Float64Array(usable.length);
  const speeds = new Float32Array(usable.length);
  const limits = new Float32Array(usable.length);
  for (let i = 0; i < usable.length; i++) {
    path[i] = [usable[i].lng, usable[i].lat];
    timesMs[i] = usable[i].timestamp!.getTime();
    speeds[i] = usable[i].speed;
    limits[i] = usable[i].speedLimit ?? 0;
  }
  return { path, timesMs, speeds, limits, startMs: timesMs[0], endMs: timesMs[usable.length - 1] };
}

/**
 * A synthetic track along a geometry with time spread proportionally to
 * segment length — the "optimal ghost": departs at `startMs`, arrives
 * `durationSecs` later, moving at the route's implied constant pace.
 * `path` is [lat, lng] pairs (polyline-decode order).
 */
export function ghostTrackFromPath(
  latLngPath: Array<[number, number]>,
  startMs: number,
  durationSecs: number,
): ReplayTrack | null {
  if (latLngPath.length < 2 || durationSecs <= 0) return null;
  const n = latLngPath.length;
  const cum = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const dx = latLngPath[i][1] - latLngPath[i - 1][1];
    const dy = latLngPath[i][0] - latLngPath[i - 1][0];
    cum[i] = cum[i - 1] + Math.hypot(dx, dy);
  }
  const total = cum[n - 1] || 1;
  const path: [number, number][] = new Array(n);
  const timesMs = new Float64Array(n);
  const kmh = 0; // ghost speed readout is derived below per segment
  const speeds = new Float32Array(n).fill(kmh);
  const limits = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    path[i] = [latLngPath[i][1], latLngPath[i][0]];
    timesMs[i] = startMs + (cum[i] / total) * durationSecs * 1000;
  }
  return { path, timesMs, speeds, limits, startMs, endMs: timesMs[n - 1] };
}
