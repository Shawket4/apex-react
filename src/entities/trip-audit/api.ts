import { z } from 'zod';
import { apiClientEtit } from '@/shared/api/client';
import {
  scanResponseSchema,
  scanRunSchema,
  tripMatchDetailSchema,
  tripMatchSchema,
  type ScanResponse,
  type ScanRun,
  type TripMatch,
  type TripMatchDetail,
  type TripMatchStatus,
} from './schemas';

/**
 * GPS trip-audit endpoints on the etit proxy — same base + auth as the
 * zones entity (`apiClientEtit`, all under `/api/v1`).
 */

const PREFIX = 'api/v1/trip-audit';

export interface TripMatchFilters {
  /** 'YYYY-MM-DD' inclusive. */
  from?: string;
  /** 'YYYY-MM-DD' inclusive. */
  to?: string;
  status?: TripMatchStatus | '';
  company?: string;
  flagged?: boolean;
}

async function listMatches(filters: TripMatchFilters = {}): Promise<TripMatch[]> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.status) params.set('status', filters.status);
  if (filters.company?.trim()) params.set('company', filters.company.trim());
  if (filters.flagged) params.set('flagged', 'true');
  const qs = params.toString();
  const res = await apiClientEtit.get(`${PREFIX}/matches${qs ? `?${qs}` : ''}`);
  return z.array(tripMatchSchema).parse(res.data ?? []);
}

async function getMatch(id: number): Promise<TripMatchDetail> {
  const res = await apiClientEtit.get(`${PREFIX}/matches/${encodeURIComponent(id)}`);
  return tripMatchDetailSchema.parse(res.data);
}

async function reviewMatch(id: number, note?: string): Promise<void> {
  await apiClientEtit.post(
    `${PREFIX}/matches/${encodeURIComponent(id)}/review`,
    note?.trim() ? { note: note.trim() } : {},
  );
}

async function listRuns(): Promise<ScanRun[]> {
  const res = await apiClientEtit.get(`${PREFIX}/runs`);
  return z.array(scanRunSchema).parse(res.data ?? []);
}

/**
 * Kick off a scan. The proxy runs it synchronously and can take minutes,
 * so the default 15s axios timeout is overridden; the caller toasts "scan
 * started" immediately and refetches runs/matches when this resolves.
 */
async function runScan(dates?: string[]): Promise<ScanResponse> {
  const res = await apiClientEtit.post(
    `${PREFIX}/scan`,
    dates && dates.length > 0 ? { dates } : {},
    { timeout: 600_000 },
  );
  return scanResponseSchema.parse(res.data ?? {});
}

export const tripAuditApi = {
  listMatches,
  getMatch,
  reviewMatch,
  listRuns,
  runScan,
} as const;
