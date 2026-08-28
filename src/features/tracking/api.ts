import { decode as msgpackDecode } from '@msgpack/msgpack';
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

/**
 * Parse a Cairo wall string — `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` — to the
 * UTC instant it names. Day-only strings resolve to the day's start, or its
 * last second when `end` is set. Guess-and-correct absorbs DST.
 */
export function parseCairoWall(wall: string, end = false): Date {
  const [dayPart, timePart] = wall.split('T');
  const [y, mo, d] = dayPart.split('-').map(Number);
  const [hh, mm, ss] = timePart
    ? [...timePart.split(':').map(Number), 0]
    : end
      ? [23, 59, 59]
      : [0, 0, 0];
  const wanted = Date.UTC(y, mo - 1, d, hh, mm, ss ?? 0);
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const p = cairoWall(new Date(guess));
    const seen = Date.UTC(
      Number(p.slice(0, 4)),
      Number(p.slice(5, 7)) - 1,
      Number(p.slice(8, 10)),
      Number(p.slice(11, 13)),
      Number(p.slice(14, 16)),
      Number(p.slice(17, 19)),
    );
    guess += wanted - seen;
  }
  return new Date(guess);
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

  /** One Cairo calendar day of history — the unit of caching and fetching.
   *  MessagePack on the wire: a day is ~64 KB as JSON, much less packed. */
  async historyDay(vehicleId: string, day: string, refresh?: boolean): Promise<HistoryDay> {
    const params = new URLSearchParams({ date: day, format: 'msgpack' });
    if (refresh) params.set('refresh', 'true');
    const res = await apiClientEtit.get(
      `${PREFIX}/vehicles/${encodeURIComponent(vehicleId)}/history?${params}`,
      { responseType: 'arraybuffer', headers: { Accept: 'application/msgpack' } },
    );
    return historyDaySchema.parse(msgpackDecode(new Uint8Array(res.data as ArrayBuffer)));
  },

  async rangeSummary(vehicleId: string, from: Date, to: Date): Promise<RangeSummary> {
    const params = new URLSearchParams({
      from: cairoWall(from),
      to: cairoWall(to),
      format: 'msgpack',
    });
    const res = await apiClientEtit.get(
      `${PREFIX}/vehicles/${encodeURIComponent(vehicleId)}/history/summary?${params}`,
      { responseType: 'arraybuffer', headers: { Accept: 'application/msgpack' } },
    );
    return rangeSummarySchema.parse(msgpackDecode(new Uint8Array(res.data as ArrayBuffer)));
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
