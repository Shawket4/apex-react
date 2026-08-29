import * as React from 'react';
import { useQueries, useQuery, type QueryClient } from '@tanstack/react-query';
import { cairoDay, parseCairoWall, trackingApi, trackingKeys } from './api';
import { buildTrack, indexAt } from './playback';
import type { SensorEvent, Stop, TripLeg, TripPin } from './schemas';
import type { HistoryPoint } from './schemas';

/* -------------------------------------------------------------------------- */
/* Day-chunked history.                                                        */
/*                                                                            */
/* A range is N parallel per-day requests on stable per-day cache keys: the   */
/* first day paints the trail in one round-trip, days stream in, and any      */
/* other range touching the same days reuses them. The merge also builds the  */
/* GPU-ready buffers: per-day decoded paths for trails and a timestamped      */
/* path for the replay layer — computed once per data change, never per       */
/* frame.                                                                     */
/* -------------------------------------------------------------------------- */

export interface HistoryRange {
  vehicleId: string;
  /** Cairo wall strings — `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`, inclusive. */
  from: string;
  to: string;
}

export type DayStatus = 'pending' | 'loaded' | 'error';

export interface LegSegment {
  leg: TripLeg;
  /** The leg's slice of the drawn track — [lng, lat], possibly empty. */
  path: [number, number][];
  /** True when the leg extends beyond the LOADED RANGE (recomputed here —
   *  the per-day fetch makes the server's per-window flags meaningless for
   *  multi-day ranges). */
  cutStart: boolean;
  cutEnd: boolean;
}

export interface DayTrail {
  day: string;
  /** [lng, lat] pairs — deck.gl's native order. */
  path: [number, number][];
}

export interface ReplayTrack {
  /** [lng, lat] per point, aligned with `timesMs`. */
  path: [number, number][];
  /** Epoch ms per point, sorted ascending. */
  timesMs: Float64Array;
  /** Speed km/h per point, for the HUD. */
  speeds: Float32Array;
  /** Speed limit km/h per point (0 = unknown), for speeding tint. */
  limits: Float32Array;
  startMs: number;
  endMs: number;
}

export interface HistoryData {
  days: Array<{ day: string; status: DayStatus }>;
  loadedCount: number;
  totalCount: number;
  /** Per-day trails for the PathLayer (dimmed past days etc.). */
  trails: DayTrail[];
  /** The replay track — raw points as GPU-ready parallel buffers. */
  track: ReplayTrack | null;
  stops: Stop[];
  sensors: SensorEvent[];
  /** Audit-matched place visits (terminals, drop-offs, garages). */
  pins: TripPin[];
  /** Audit legs over the range, with their sliced track segments. */
  legs: LegSegment[];
  /** True until the FIRST day lands. */
  isLoading: boolean;
  isError: boolean;
}

const DAY_MS = 86_400_000;

/** Cairo day strings covering [from, to] inclusive. */
export function daysCovering(from: string, to: string): string[] {
  const days: string[] = [];
  // Noon UTC of the named day is safely inside the same Cairo day.
  let t = Date.parse(`${from}T12:00:00Z`);
  const end = Date.parse(`${to}T12:00:00Z`);
  for (let i = 0; i < 400 && t <= end; i++, t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

export function useHistory(range: HistoryRange | null): HistoryData {
  const days = React.useMemo(
    () => (range ? daysCovering(range.from.slice(0, 10), range.to.slice(0, 10)) : []),
    [range?.from, range?.to], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const queries = useQueries({
    queries: days.map((day) => ({
      queryKey: trackingKeys.day(range!.vehicleId, day),
      queryFn: () => trackingApi.historyDay(range!.vehicleId, day),
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });

  // Recompute only when the set of loaded results actually changes.
  const fingerprint = queries.map((q) => (q.data ? '1' : q.isError ? 'x' : '0')).join('');

  return React.useMemo<HistoryData>(() => {
    const dayRows = days.map((day, i) => ({
      day,
      status: (queries[i]?.isError
        ? 'error'
        : queries[i]?.data
          ? 'loaded'
          : 'pending') as DayStatus,
    }));
    const loadedCount = dayRows.filter((d) => d.status === 'loaded').length;

    if (!range || loadedCount === 0) {
      return {
        days: dayRows,
        loadedCount,
        totalCount: days.length,
        trails: [],
        track: null,
        stops: [],
        sensors: [],
        pins: [],
        legs: [],
        isLoading: days.length > 0 && !dayRows.every((d) => d.status === 'error'),
        isError: days.length > 0 && dayRows.every((d) => d.status === 'error'),
      };
    }

    const trails: DayTrail[] = [];
    const points: HistoryPoint[] = [];
    const stops: Stop[] = [];
    const sensors: SensorEvent[] = [];
    const pins: TripPin[] = [];
    const pinSeen = new Set<string>();
    const legById = new Map<string, TripLeg>();

    days.forEach((day, i) => {
      const data = queries[i]?.data;
      if (!data) return;
      if (data.geometry) {
        trails.push({ day, path: decodePolyline(data.geometry) });
      }
      for (const p of data.points) if (p.timestamp) points.push(p);
      stops.push(...data.stops);
      sensors.push(...data.sensors);
      // A leg spanning midnight arrives in both day responses describing the
      // same full leg — keep one copy per (trip, seq).
      for (const leg of data.legs) {
        legById.set(`${leg.parentTripId}:${leg.seq}`, leg);
      }
      // A visit can straddle two fetched days — dedupe by identity.
      for (const pin of data.pins) {
        const key = `${pin.parentTripId ?? ''}:${pin.kind}:${pin.name}:${pin.arrive?.getTime() ?? ''}:${pin.depart?.getTime() ?? ''}`;
        if (pinSeen.has(key)) continue;
        pinSeen.add(key);
        pins.push(pin);
      }
    });

    // Whole days are fetched for cacheability; a sub-day range trims here.
    const fromMs = parseCairoWall(range.from).getTime();
    const toMs = parseCairoWall(range.to, true).getTime();
    const trimmedPoints = points.filter((p) => {
      const t = p.timestamp!.getTime();
      return t >= fromMs && t <= toMs;
    });
    const trimmedStops = stops.filter(
      (s2) => s2.to.getTime() >= fromMs && s2.from.getTime() <= toMs,
    );
    const trimmedSensors = sensors.filter((s2) => {
      const t = s2.timestamp.getTime();
      return t >= fromMs && t <= toMs;
    });
    trimmedPoints.sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());

    let track: ReplayTrack | null = null;
    if (trimmedPoints.length >= 2) {
      track = buildTrack(trimmedPoints);
    }

    // Slice each leg's segment from the track by its time range. Range-edge
    // flags are recomputed against OUR range — the server's are per-day.
    const legs: LegSegment[] = [...legById.values()]
      .sort((a, b) => a.parentTripId - b.parentTripId || a.seq - b.seq)
      .map((leg) => {
        let path: [number, number][] = [];
        if (track) {
          const a = leg.depart.getTime();
          const b = leg.arrive.getTime();
          const i0 = indexAt(track.timesMs, a);
          const i1 = indexAt(track.timesMs, b);
          const start = track.timesMs[i0] < a ? i0 + 1 : i0;
          path = track.path.slice(Math.max(0, start), Math.min(track.path.length, i1 + 1));
        }
        return {
          leg,
          path,
          cutStart: leg.depart.getTime() < fromMs,
          cutEnd: leg.arrive.getTime() > toMs,
        };
      });

    return {
      days: dayRows,
      loadedCount,
      totalCount: days.length,
      trails,
      track,
      stops: trimmedStops,
      sensors: trimmedSensors,
      pins,
      legs,
      isLoading: false,
      isError: false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.vehicleId, range?.from, range?.to, days, fingerprint]);
}

/**
 * The ACTIVE leg's complete window — its own day queries (same cache keys as
 * the range, so fully-covered legs cost nothing) merged and trimmed to
 * [depart, arrive]. This is how a leg cut by the loaded range shows whole:
 * activation fetches only the missing days.
 */
export interface LegWindow {
  path: [number, number][];
  stops: Stop[];
  sensors: SensorEvent[];
  pins: TripPin[];
  /** False while a missing day is still in flight. */
  complete: boolean;
}

export function useLegWindow(
  vehicleId: string | null,
  leg: TripLeg | null,
): LegWindow | null {
  const days = React.useMemo(
    () =>
      vehicleId && leg
        ? daysCovering(cairoDay(leg.depart), cairoDay(leg.arrive))
        : [],
    [vehicleId, leg],
  );
  const queries = useQueries({
    queries: days.map((day) => ({
      queryKey: trackingKeys.day(vehicleId!, day),
      queryFn: () => trackingApi.historyDay(vehicleId!, day),
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const fingerprint = queries.map((q) => (q.data ? '1' : '0')).join('');
  return React.useMemo(() => {
    if (!leg || days.length === 0) return null;
    const a = leg.depart.getTime();
    const b = leg.arrive.getTime();
    const points: HistoryPoint[] = [];
    const stops: Stop[] = [];
    const sensors: SensorEvent[] = [];
    const pins: TripPin[] = [];
    for (const q of queries) {
      if (!q.data) continue;
      for (const p of q.data.points) {
        const t = p.timestamp?.getTime();
        if (t != null && t >= a && t <= b) points.push(p);
      }
      stops.push(...q.data.stops.filter((s) => s.to.getTime() >= a && s.from.getTime() <= b));
      sensors.push(
        ...q.data.sensors.filter((s) => {
          const t = s.timestamp.getTime();
          return t >= a && t <= b;
        }),
      );
      pins.push(
        ...q.data.pins.filter(
          (p2) => p2.parentTripId === leg.parentTripId,
        ),
      );
    }
    points.sort((x, y) => x.timestamp!.getTime() - y.timestamp!.getTime());
    // Day-straddling dedupe for stops/pins by identity.
    const stopSeen = new Set<string>();
    const uniqStops = stops.filter((s) => {
      const k = `${s.from.getTime()}:${s.to.getTime()}`;
      if (stopSeen.has(k)) return false;
      stopSeen.add(k);
      return true;
    });
    const pinSeen = new Set<string>();
    const uniqPins = pins.filter((p2) => {
      const k = `${p2.kind}:${p2.name}:${p2.arrive?.getTime() ?? ''}:${p2.depart?.getTime() ?? ''}`;
      if (pinSeen.has(k)) return false;
      pinSeen.add(k);
      return true;
    });
    return {
      path: points.map((p) => [p.lng, p.lat] as [number, number]),
      stops: uniqStops,
      sensors,
      pins: uniqPins,
      complete: queries.every((q) => !!q.data || q.isError),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leg, days, fingerprint]);
}

/**
 * Optimal (OSRM) geometries for the range's legs — fetched only when a leg
 * is activated (`enabled`), on separately keyed day queries so the initial
 * paint never pays for them. Returns polyline5 strings by leg identity.
 */
export function useOptimalLegs(
  range: HistoryRange | null,
  enabled: boolean,
): Map<string, string> {
  const days = React.useMemo(
    () =>
      range && enabled ? daysCovering(range.from.slice(0, 10), range.to.slice(0, 10)) : [],
    [range?.from, range?.to, enabled], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const queries = useQueries({
    queries: days.map((day) => ({
      queryKey: trackingKeys.day(range!.vehicleId, day, true),
      queryFn: () => trackingApi.historyDay(range!.vehicleId, day, { optimal: true }),
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const fingerprint = queries.map((q) => (q.data ? '1' : '0')).join('');
  return React.useMemo(() => {
    const m = new Map<string, string>();
    for (const q of queries) {
      for (const leg of q.data?.legs ?? []) {
        if (leg.osrmGeometry) m.set(`${leg.parentTripId}:${leg.seq}`, leg.osrmGeometry);
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);
}

/** One Cairo day of history — for consumers (audit replay) that window a
 *  trip rather than browse a range. Shares the range cache day-for-day. */
export function useHistoryDay(args: { vehicleId: string; day: string } | null) {
  return useQuery({
    queryKey: args ? trackingKeys.day(args.vehicleId, args.day) : ['tracking', 'day', 'disabled'],
    queryFn: () => trackingApi.historyDay(args!.vehicleId, args!.day),
    enabled: args !== null,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useRangeSummary(range: HistoryRange | null) {
  return useQuery({
    queryKey: range
      ? trackingKeys.summary(range.vehicleId, range.from, range.to)
      : ['tracking', 'summary', 'disabled'],
    queryFn: () =>
      trackingApi.rangeSummary(
        range!.vehicleId,
        parseCairoWall(range!.from),
        parseCairoWall(range!.to, true),
      ),
    enabled: range !== null,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Warm every day of a range on intent — the click renders from cache. */
export function prefetchHistoryDays(
  qc: QueryClient,
  vehicleId: string,
  from: string,
  to: string,
): void {
  for (const day of daysCovering(from.slice(0, 10), to.slice(0, 10))) {
    void qc.prefetchQuery({
      queryKey: trackingKeys.day(vehicleId, day),
      queryFn: () => trackingApi.historyDay(vehicleId, day),
      staleTime: 5 * 60_000,
    });
  }
}

export function prefetchTrackingFleet(qc: QueryClient): void {
  void qc.prefetchQuery({
    queryKey: trackingKeys.vehicles(),
    queryFn: trackingApi.vehicles,
    staleTime: 30 * 60_000,
  });
}

/* -------------------------------------------------------------------------- */
/* Google encoded polyline → [lng, lat][] (deck.gl order).                     */
/* -------------------------------------------------------------------------- */

export function decodePolyline(encoded: string): [number, number][] {
  const out: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const which of [0, 1] as const) {
      let result = 0;
      let shift = 0;
      let b: number;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += delta;
      else lng += delta;
    }
    out.push([lng / 1e5, lat / 1e5]);
  }
  return out;
}

/** Cairo day of an epoch instant — for highlighting the cursor's day trail. */
export function dayOfMs(ms: number): string {
  return cairoDay(new Date(ms));
}
