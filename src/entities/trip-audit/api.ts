import { z } from 'zod';
import { apiClientEtit } from '@/shared/api/client';
import {
  parseTripMatchesPage,
  scanResponseSchema,
  scanRunSchema,
  tripAuditSummarySchema,
  tripMatchDetailSchema,
  tripMatchReplayDetailSchema,
  type ScanResponse,
  type ScanRun,
  type TripAuditSummary,
  type TripMatchDetail,
  type TripMatchReplayDetail,
  type TripMatchStatus,
  type TripMatchesPage,
} from './schemas';

/**
 * GPS trip-audit endpoints on the etit proxy — same base + auth as the
 * zones entity (`apiClientEtit`, all under `/api/v1`).
 */

const PREFIX = 'api/v1/trip-audit';

export type TripMatchSort = 'severity' | 'date';

export interface TripMatchFilters {
  /** 'YYYY-MM-DD' inclusive. */
  from?: string;
  /** 'YYYY-MM-DD' inclusive. */
  to?: string;
  status?: TripMatchStatus | '';
  company?: string;
  /**
   * NEW: free-text search, matched server-side against plate / driver /
   * terminal. Sent as `q=<text>` alongside the existing params.
   */
  q?: string;
  flagged?: boolean;
  /** Only trips not yet marked reviewed. */
  unreviewed?: boolean;
  /** 'severity' = critical flags first, then excess km; 'date' = newest first. */
  sort?: TripMatchSort;
  /** 1-based page. */
  page?: number;
  /** Max 200 (proxy-enforced). */
  per_page?: number;
}

async function listMatches(filters: TripMatchFilters = {}): Promise<TripMatchesPage> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.status) params.set('status', filters.status);
  if (filters.company?.trim()) params.set('company', filters.company.trim());
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.flagged) params.set('flagged', 'true');
  if (filters.unreviewed) params.set('unreviewed', 'true');
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.per_page != null) params.set('per_page', String(filters.per_page));
  const qs = params.toString();
  const res = await apiClientEtit.get(`${PREFIX}/matches${qs ? `?${qs}` : ''}`);
  return parseTripMatchesPage(res.data);
}

export interface TripAuditSummaryFilters {
  /** 'YYYY-MM-DD' inclusive. */
  from?: string;
  /** 'YYYY-MM-DD' inclusive. */
  to?: string;
  company?: string;
}

/** Whole-window aggregates for the KPI strip — exact regardless of paging. */
async function getSummary(filters: TripAuditSummaryFilters = {}): Promise<TripAuditSummary> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.company?.trim()) params.set('company', filters.company.trim());
  const qs = params.toString();
  const res = await apiClientEtit.get(`${PREFIX}/summary${qs ? `?${qs}` : ''}`);
  return tripAuditSummarySchema.parse(res.data ?? {});
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

/**
 * NEW export for the trip-replay page: same `GET /matches/:id` endpoint,
 * parsed through the replay schema so `off_route_pct` (when the proxy
 * sends it) survives parsing. Kept separate from `tripAuditApi.getMatch`
 * so the existing detail dialog contract is untouched.
 */
export async function getTripMatchReplay(id: number): Promise<TripMatchReplayDetail> {
  const res = await apiClientEtit.get(`${PREFIX}/matches/${encodeURIComponent(id)}`);
  return tripMatchReplayDetailSchema.parse(res.data);
}

export const tripAuditApi = {
  listMatches,
  getSummary,
  getMatch,
  reviewMatch,
  listRuns,
  runScan,
} as const;
