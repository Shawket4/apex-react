import { apiClientEtit } from '@/shared/api/client';
import { formatCairoDate, formatCairoForProxy } from './cairo';
import {
  etitHistoryResponseSchema,
  etitLiveListSchema,
  etitLiveStatusSchema,
  etitTripSummarySchema,
  etitVehicleSchema,
  etitVehiclesSchema,
  type EtitHistoryResponse,
  type EtitLiveStatus,
  type EtitTripSummary,
  type EtitVehicle,
} from './schemas';

/**
 * The etit-proxy is reached through the dedicated `apiClientEtit` axios
 * instance, whose base URL (`VITE_API_BASE_URL_ETIT`) resolves to the
 * proxy's public mount point — e.g. `https://apextransport.ddns.net/api/etit`.
 * The proxy's stable endpoints live under `/api/v1/...` *inside* that
 * mount, so the full URL on the wire is
 * `https://apextransport.ddns.net/api/etit/api/v1/vehicles`. We pass
 * the bare `/api/v1/...` path here and let axios resolve against the
 * base URL.
 *
 * Auth: `apiClientEtit` shares the request interceptor that attaches
 * `Authorization: Bearer <jwt>` from localStorage and is configured
 * with `withCredentials: true`. SSE consumers rely on the same cookie/
 * Authorization combo — see `subscribeLive` in `queries.ts`.
 */
const PREFIX = '/api/v1';

/* -------------------------------------------------------------------------- */
/* Vehicles + live                                                             */
/* -------------------------------------------------------------------------- */

async function listVehicles(): Promise<EtitVehicle[]> {
  const res = await apiClientEtit.get(`${PREFIX}/vehicles`);
  return etitVehiclesSchema.parse(res.data);
}

async function getVehicle(id: string): Promise<EtitVehicle> {
  const res = await apiClientEtit.get(`${PREFIX}/vehicles/${encodeURIComponent(id)}`);
  return etitVehicleSchema.parse(res.data);
}

async function listLive(): Promise<EtitLiveStatus[]> {
  const res = await apiClientEtit.get(`${PREFIX}/vehicles/live`);
  return etitLiveListSchema.parse(res.data);
}

async function getLive(id: string): Promise<EtitLiveStatus> {
  const res = await apiClientEtit.get(`${PREFIX}/vehicles/${encodeURIComponent(id)}/live`);
  return etitLiveStatusSchema.parse(res.data);
}

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

export interface HistoryRangeArgs {
  vehicleId: string;
  /** UTC `Date` representing the start of the range — formatted to Cairo wall-clock for the proxy. */
  from: Date;
  /** UTC `Date` representing the end of the range. */
  to: Date;
}

export interface HistoryDayArgs {
  vehicleId: string;
  /** UTC `Date` whose Cairo calendar day will be queried. */
  day: Date;
}

/** Range query — uses `from` + `to` (both Cairo wall-clock). */
async function historyForRange(args: HistoryRangeArgs): Promise<EtitHistoryResponse> {
  const params = new URLSearchParams({
    from: formatCairoForProxy(args.from),
    to: formatCairoForProxy(args.to),
  });
  const res = await apiClientEtit.get(
    `${PREFIX}/vehicles/${encodeURIComponent(args.vehicleId)}/history?${params}`,
  );
  return etitHistoryResponseSchema.parse(res.data);
}

/** Day query — uses `date=YYYY-MM-DD`. The proxy resolves the bounds in its tz. */
async function historyForDay(args: HistoryDayArgs): Promise<EtitHistoryResponse> {
  const params = new URLSearchParams({ date: formatCairoDate(args.day) });
  const res = await apiClientEtit.get(
    `${PREFIX}/vehicles/${encodeURIComponent(args.vehicleId)}/history?${params}`,
  );
  return etitHistoryResponseSchema.parse(res.data);
}

/** Trip summary — same `from`/`to` semantics as the range history call. */
async function historySummary(args: HistoryRangeArgs): Promise<EtitTripSummary> {
  const params = new URLSearchParams({
    from: formatCairoForProxy(args.from),
    to: formatCairoForProxy(args.to),
  });
  const res = await apiClientEtit.get(
    `${PREFIX}/vehicles/${encodeURIComponent(args.vehicleId)}/history/summary?${params}`,
  );
  return etitTripSummarySchema.parse(res.data);
}

/* -------------------------------------------------------------------------- */
/* Public surface                                                              */
/* -------------------------------------------------------------------------- */

export const etitApi = {
  listVehicles,
  getVehicle,
  listLive,
  getLive,
  historyForRange,
  historyForDay,
  historySummary,
} as const;

/**
 * Path used by the SSE subscription. Kept here so the queries layer can
 * build a full URL by concatenating with the base — `EventSource` needs
 * an absolute URL when the dashboard origin and the proxy origin differ
 * (or when `VITE_API_BASE_URL_ETIT` is itself absolute, which it is in
 * production).
 */
export const ETIT_LIVE_STREAM_PATH = `${PREFIX}/stream/live`;
