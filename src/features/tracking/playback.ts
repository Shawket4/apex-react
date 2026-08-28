/**
 * Pure replay math. The clock is three numbers — no state cascades, no
 * per-frame React. Position is DERIVED from (track, cursorMs), so the map
 * marker and the scrubber can never desync.
 */

import type { ReplayTrack } from './use-history';

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
