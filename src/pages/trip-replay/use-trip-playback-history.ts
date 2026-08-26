import * as React from 'react';
import { useEtitHistoryDay } from '@/entities/etit-vehicle/queries';
import type {
  EtitHistoryPoint,
  EtitSensorEvent,
  EtitStop,
} from '@/entities/etit-vehicle/schemas';

/* -------------------------------------------------------------------------- */
/* Vehicle history for the replay                                              */
/*                                                                             */
/* Extracted copy of `useTripPlaybackHistory` from                             */
/* `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx` (that  */
/* widget doesn't export the hook, and it is being reworked in parallel, so   */
/* the replay page owns its copy). Same behavior: the trip window             */
/* [start−15m, end+15m] decides which Cairo day(s) of the live-tracking       */
/* history endpoint to fetch; a window crossing Cairo midnight fetches both   */
/* days and concatenates. Any failure degrades to the stored leg geometries.  */
/* -------------------------------------------------------------------------- */

/** Window padding around [start_ts, end_ts] for the playback trace. */
export const PLAYBACK_PAD_MS = 15 * 60_000;

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

  const startDay = React.useMemo(
    () => (window ? new Date(window.startMs) : null),
    [window],
  );
  const endDay = React.useMemo(() => (window ? new Date(window.endMs) : null), [window]);

  // Compare Cairo calendar days, not browser-local ones — the proxy resolves
  // `date=` in its own timezone.
  const crossesMidnight =
    startDay != null && endDay != null && cairoDayKeyOf(startDay) !== cairoDayKeyOf(endDay);

  const firstQuery = useEtitHistoryDay(
    enabled && window && startDay ? { vehicleId: window.vehicleId, day: startDay } : null,
  );
  const secondQuery = useEtitHistoryDay(
    enabled && window && crossesMidnight && endDay
      ? { vehicleId: window.vehicleId, day: endDay }
      : null,
  );

  return React.useMemo(() => {
    if (!window) {
      return { points: [], stops: [], sensors: [], loading: false, unavailable: true };
    }
    const loading = firstQuery.isLoading || (crossesMidnight && secondQuery.isLoading);
    const responses = [firstQuery.data, crossesMidnight ? secondQuery.data : undefined].filter(
      (r): r is NonNullable<typeof r> => r != null,
    );

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
  }, [
    window,
    crossesMidnight,
    firstQuery.isLoading,
    firstQuery.data,
    secondQuery.isLoading,
    secondQuery.data,
  ]);
}
