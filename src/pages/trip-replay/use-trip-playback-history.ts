import * as React from 'react';
import { useHistoryDay } from '@/features/tracking/use-history';
import { cairoDay } from '@/features/tracking/api';
import type {
  HistoryPoint as EtitHistoryPoint,
  SensorEvent as EtitSensorEvent,
  Stop as EtitStop,
} from '@/features/tracking/schemas';

/* -------------------------------------------------------------------------- */
/* Vehicle history for the replay                                              */
/*                                                                             */
/* The trip window [start−15m, end+15m] decides which Cairo days of the      */
/* live-tracking history endpoint to fetch — EVERY day the window spans, up  */
/* to MAX_PLAYBACK_DAYS (open returns are capped at 72h, so 5 slots cover    */
/* any real trip). The original two-slot version (start day + end day only)  */
/* silently dropped the middle days of multi-day trips: a 4-day odyssey      */
/* rendered as a route that never visited its own drop-off. Any failure      */
/* degrades to the stored leg geometries.                                    */
/* -------------------------------------------------------------------------- */

/** Window padding around [start_ts, end_ts] for the playback trace. */
export const PLAYBACK_PAD_MS = 15 * 60_000;

/** Max Cairo days fetched for one replay (72h return cap ⇒ 5 covers all). */
const MAX_PLAYBACK_DAYS = 5;

export interface TripWindowSource {
  vehicle_id?: string | null;
  start_ts?: string | null;
  end_ts?: string | null;
}

export interface PlaybackHistory {
  points: EtitHistoryPoint[];
  stops: EtitStop[];
  sensors: EtitSensorEvent[];
  loading: boolean;
  /** True when history can't drive a scrubber (no window, error, <2 points). */
  unavailable: boolean;
}

/** Cairo 'YYYY-MM-DD' of an instant (midnight boundaries are Cairo's). */
function cairoDayKeyOf(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function useTripPlaybackHistory(
  detail: TripWindowSource | null,
  enabled: boolean,
): PlaybackHistory {
  const window = React.useMemo(() => {
    if (!detail?.vehicle_id || !detail.start_ts || !detail.end_ts) return null;
    const start = Date.parse(detail.start_ts);
    const end = Date.parse(detail.end_ts);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
    return {
      vehicleId: detail.vehicle_id,
      startMs: start - PLAYBACK_PAD_MS,
      endMs: end + PLAYBACK_PAD_MS,
    };
  }, [detail]);

  // Every Cairo calendar day the window touches (the proxy resolves `date=`
  // in its own timezone). Fixed slot count keeps the hook calls stable.
  const days = React.useMemo<(Date | null)[]>(() => {
    const out: (Date | null)[] = Array(MAX_PLAYBACK_DAYS).fill(null);
    if (!window) return out;
    const endKey = cairoDayKeyOf(new Date(window.endMs));
    const seen = new Set<string>();
    let cursor = window.startMs;
    let i = 0;
    while (i < MAX_PLAYBACK_DAYS) {
      const d = new Date(cursor);
      const key = cairoDayKeyOf(d);
      if (!seen.has(key)) {
        seen.add(key);
        out[i] = d;
        i += 1;
      }
      if (key === endKey) break;
      cursor += 12 * 60 * 60 * 1000; // half-day steps never skip a Cairo day
    }
    return out;
  }, [window]);

  const q0 = useHistoryDay(
    enabled && window && days[0] ? { vehicleId: window.vehicleId, day: cairoDay(days[0]) } : null,
  );
  const q1 = useHistoryDay(
    enabled && window && days[1] ? { vehicleId: window.vehicleId, day: cairoDay(days[1]) } : null,
  );
  const q2 = useHistoryDay(
    enabled && window && days[2] ? { vehicleId: window.vehicleId, day: cairoDay(days[2]) } : null,
  );
  const q3 = useHistoryDay(
    enabled && window && days[3] ? { vehicleId: window.vehicleId, day: cairoDay(days[3]) } : null,
  );
  const q4 = useHistoryDay(
    enabled && window && days[4] ? { vehicleId: window.vehicleId, day: cairoDay(days[4]) } : null,
  );
  const queries = [q0, q1, q2, q3, q4];

  return React.useMemo(() => {
    if (!window) {
      return { points: [], stops: [], sensors: [], loading: false, unavailable: true };
    }
    const active = queries.filter((_, i) => days[i] != null);
    const loading = active.some((q) => q.isLoading);
    const responses = active
      .map((q) => q.data)
      .filter((r): r is NonNullable<typeof r> => r != null);

    // Concatenate + de-duplicate by timestamp, then clamp to the trip window.
    const byMs = new Map<number, EtitHistoryPoint>();
    for (const res of responses) {
      for (const p of res.points) {
        const ms = p.timestamp?.getTime();
        if (ms == null || !Number.isFinite(ms)) continue;
        if (ms < window.startMs || ms > window.endMs) continue;
        byMs.set(ms, p);
      }
    }
    const points = [...byMs.values()].sort(
      (a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0),
    );

    const stops = responses
      .flatMap((r) => r.stops)
      .filter((s) => s.to.getTime() >= window.startMs && s.from.getTime() <= window.endMs);
    const sensors = responses
      .flatMap((r) => r.sensors)
      .filter(
        (s) => s.timestamp.getTime() >= window.startMs && s.timestamp.getTime() <= window.endMs,
      );

    return {
      points,
      stops,
      sensors,
      loading,
      unavailable: !loading && points.length < 2,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    window,
    days,
    q0.isLoading, q0.data,
    q1.isLoading, q1.data,
    q2.isLoading, q2.data,
    q3.isLoading, q3.data,
    q4.isLoading, q4.data,
  ]);
}
