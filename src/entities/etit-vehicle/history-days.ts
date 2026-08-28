/**
 * Day-chunked history (§03 of the approved design).
 *
 * A range is fetched as N parallel per-day requests against the existing
 * `historyDay` cache keys, so the first trail paints in ~200 ms, days stream
 * in as they land, and a changed range refetches only the days it doesn't
 * already hold. Whole Cairo days are fetched and the merge trims to the
 * requested instants, so a 14:00–18:00 range still reuses the cached day.
 */

import * as React from 'react';
import { useQueries } from '@tanstack/react-query';
import { etitApi } from './api';
import { etitKeys } from './queries';
import { cairoStartOfDay, formatCairoDate } from './cairo';
import { decodePolyline } from './playback';
import type { EtitHistoryResponse } from './schemas';

export interface HistoryDaysArgs {
  vehicleId: string;
  from: Date;
  to: Date;
  /** Bypass the proxy's cache (long-press "force refresh"). */
  refresh?: boolean;
}

export type DayStatus = 'pending' | 'loaded' | 'error';

export interface HistoryDaysResult {
  /** Points/stops/sensors of every LOADED day, trimmed to [from, to], sorted. */
  merged: EtitHistoryResponse | null;
  /** The trail: per-day geometries decoded and concatenated, in day order. */
  route: Array<[number, number]>;
  /** The same trail split per day, for dimmed-past-days rendering. */
  dayRoutes: Array<{ label: string; path: Array<[number, number]> }>;
  /** One entry per Cairo day in the range, for the progress strip. */
  days: Array<{ day: Date; label: string; status: DayStatus }>;
  loadedCount: number;
  totalCount: number;
  /** True until the FIRST day lands — the map can draw from then on. */
  isLoading: boolean;
  /** True when every day failed; partial failures show in `days`. */
  isError: boolean;
}

const DAY_MS = 86_400_000;

function cairoDaysCovering(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  // Walk in UTC-day steps from the Cairo start-of-day containing `from`;
  // re-anchoring each step to Cairo start-of-day absorbs DST shifts.
  let cursor = cairoStartOfDay(from);
  const last = formatCairoDate(to);
  for (let i = 0; i < 400; i++) {
    days.push(cursor);
    if (formatCairoDate(cursor) === last) break;
    cursor = cairoStartOfDay(new Date(cursor.getTime() + DAY_MS + DAY_MS / 2));
  }
  return days;
}

export function useEtitHistoryDays(args: HistoryDaysArgs | null): HistoryDaysResult {
  const days = React.useMemo(
    () => (args ? cairoDaysCovering(args.from, args.to) : []),
    [args],
  );

  const queries = useQueries({
    queries: days.map((day) => ({
      queryKey: etitKeys.historyDay(args!.vehicleId, day.toISOString(), args!.refresh),
      queryFn: () => etitApi.historyForDay({ vehicleId: args!.vehicleId, day, refresh: args!.refresh }),
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });

  return React.useMemo(() => {
    const dayRows = days.map((day, i) => ({
      day,
      label: formatCairoDate(day),
      status: (queries[i]?.isError
        ? 'error'
        : queries[i]?.data
          ? 'loaded'
          : 'pending') as DayStatus,
    }));
    const loaded = queries.filter((q) => q.data);
    const loadedCount = loaded.length;

    if (!args || loadedCount === 0) {
      return {
        merged: null,
        route: [],
        dayRoutes: [],
        days: dayRows,
        loadedCount,
        totalCount: days.length,
        isLoading: days.length > 0 && loadedCount === 0 && !queries.every((q) => q.isError),
        isError: days.length > 0 && queries.every((q) => q.isError),
      };
    }

    const fromMs = args.from.getTime();
    const toMs = args.to.getTime();
    const inRange = (t: Date | null | undefined) =>
      t != null && t.getTime() >= fromMs && t.getTime() <= toMs;

    const points = queries
      .flatMap((q) => q.data?.points ?? [])
      .filter((p) => inRange(p.timestamp))
      .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());
    // A stop belongs to the view when its interval touches [from, to].
    const stops = queries
      .flatMap((q) => q.data?.stops ?? [])
      .filter((s) => s.to.getTime() >= fromMs && s.from.getTime() <= toMs);
    const sensors = queries
      .flatMap((q) => q.data?.sensors ?? [])
      .filter((s) => inRange(s.timestamp ?? null) || s.timestamp == null);
    const dayRoutes = days
      .map((day, i) => ({
        label: formatCairoDate(day),
        path: queries[i]?.data?.geometry ? decodePolyline(queries[i]!.data!.geometry) : [],
      }))
      .filter((d) => d.path.length > 0);
    const route = dayRoutes.flatMap((d) => d.path);

    return {
      merged: { points, stops, sensors, geometry: '' } as EtitHistoryResponse,
      route,
      dayRoutes,
      days: dayRows,
      loadedCount,
      totalCount: days.length,
      isLoading: false,
      isError: false,
    };
  }, [args, days, queries]);
}
