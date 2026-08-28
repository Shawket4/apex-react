import { apiClientEtit } from '@/shared/api/client';
import { env } from '@/shared/config/env';
import {
  historyDaySchema,
  liveListSchema,
  rangeSummarySchema,
  vehicleListSchema,
  type HistoryDay,
  type LiveStatus,
  type RangeSummary,
  type Vehicle,
} from './schemas';

const PREFIX = 'api/v1';

/** Cairo wall-clock `YYYY-MM-DDTHH:MM:SS` — the notation the proxy speaks. */
const wallFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo',
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function cairoWall(date: Date): string {
  const p = Object.fromEntries(wallFmt.formatToParts(date).map((x) => [x.type, x.value]));
  const hh = p.hour === '24' ? '00' : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hh}:${p.minute}:${p.second}`;
}

/** Cairo calendar day `YYYY-MM-DD` of an instant. */
export function cairoDay(date: Date): string {
  return cairoWall(date).slice(0, 10);
}

export const trackingApi = {
  async vehicles(): Promise<Vehicle[]> {
    const res = await apiClientEtit.get(`${PREFIX}/vehicles`);
    return vehicleListSchema.parse(res.data);
  },

  async liveOnce(): Promise<LiveStatus[]> {
    const res = await apiClientEtit.get(`${PREFIX}/vehicles/live`);
    return liveListSchema.parse(res.data);
  },

  streamUrl(): string | null {
    const base = env.VITE_API_BASE_URL_ETIT ?? env.VITE_API_BASE_URL;
    if (!base) return null;
    return new URL(
      `${PREFIX}/stream/live`,
      base.endsWith('/') ? base : `${base}/`,
    ).toString();
  },

  /** One Cairo calendar day of history — the unit of caching and fetching. */
  async historyDay(vehicleId: string, day: string, refresh?: boolean): Promise<HistoryDay> {
    const params = new URLSearchParams({ date: day });
    if (refresh) params.set('refresh', 'true');
    const res = await apiClientEtit.get(
      `${PREFIX}/vehicles/${encodeURIComponent(vehicleId)}/history?${params}`,
    );
    return historyDaySchema.parse(res.data);
  },

  async rangeSummary(vehicleId: string, from: Date, to: Date): Promise<RangeSummary> {
    const params = new URLSearchParams({ from: cairoWall(from), to: cairoWall(to) });
    const res = await apiClientEtit.get(
      `${PREFIX}/vehicles/${encodeURIComponent(vehicleId)}/history/summary?${params}`,
    );
    return rangeSummarySchema.parse(res.data);
  },
};

/* -------------------------------------------------------------------------- */
/* Query keys — the module's own namespace, mirrored by its prefetchers.       */
/* -------------------------------------------------------------------------- */

export const trackingKeys = {
  all: ['tracking'] as const,
  vehicles: () => [...trackingKeys.all, 'vehicles'] as const,
  live: () => [...trackingKeys.all, 'live'] as const,
  day: (vehicleId: string, day: string) =>
    [...trackingKeys.all, 'day', vehicleId, day] as const,
  summary: (vehicleId: string, from: string, to: string) =>
    [...trackingKeys.all, 'summary', vehicleId, from, to] as const,
};
