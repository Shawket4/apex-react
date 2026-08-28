import * as React from 'react';
import { useQueries, useQuery, type QueryClient } from '@tanstack/react-query';
import { cairoDay, trackingApi, trackingKeys } from './api';
import type { HistoryPoint, SensorEvent, Stop } from './schemas';

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
  /** Cairo day strings, inclusive. */
  from: string;
  to: string;
}

export type DayStatus = 'pending' | 'loaded' | 'error';

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
    () => (range ? daysCovering(range.from, range.to) : []),
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
        isLoading: days.length > 0 && !dayRows.every((d) => d.status === 'error'),
        isError: days.length > 0 && dayRows.every((d) => d.status === 'error'),
      };
    }

    const trails: DayTrail[] = [];
    const points: HistoryPoint[] = [];
    const stops: Stop[] = [];
    const sensors: SensorEvent[] = [];

    days.forEach((day, i) => {
      const data = queries[i]?.data;
      if (!data) return;
      if (data.geometry) {
        trails.push({ day, path: decodePolyline(data.geometry) });
      }
      for (const p of data.points) if (p.timestamp) points.push(p);
      stops.push(...data.stops);
      sensors.push(...data.sensors);
    });

    points.sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());

    let track: ReplayTrack | null = null;
    if (points.length >= 2) {
      const path: [number, number][] = new Array(points.length);
      const timesMs = new Float64Array(points.length);
      const speeds = new Float32Array(points.length);
      for (let i = 0; i < points.length; i++) {
        path[i] = [points[i].lng, points[i].lat];
        timesMs[i] = points[i].timestamp!.getTime();
        speeds[i] = points[i].speed;
      }
      track = { path, timesMs, speeds, startMs: timesMs[0], endMs: timesMs[points.length - 1] };
    }

    return {
      days: dayRows,
      loadedCount,
      totalCount: days.length,
      trails,
      track,
      stops,
      sensors,
      isLoading: false,
      isError: false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.vehicleId, range?.from, range?.to, days, fingerprint]);
}

export function useRangeSummary(range: HistoryRange | null) {
  return useQuery({
    queryKey: range
      ? trackingKeys.summary(range.vehicleId, range.from, range.to)
      : ['tracking', 'summary', 'disabled'],
    queryFn: () =>
      trackingApi.rangeSummary(
        range!.vehicleId,
        new Date(`${range!.from}T00:00:00+02:00`),
        new Date(Date.parse(`${range!.to}T00:00:00+02:00`) + DAY_MS - 1000),
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
  for (const day of daysCovering(from, to)) {
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
