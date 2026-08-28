import { decode as msgpackDecode } from '@msgpack/msgpack';
import { apiClientEtit, apiClientRust } from '@/shared/api/client';
import { env } from '@/shared/config/env';
import {
  advancesDrawerSchema,
  cashOutDrawerSchema,
  dashboardSchema,
  liveFeedSchema,
  revenueDrawerSchema,
  tripsDrawerSchema,
  vehicleDaySummarySchema,
  type AdvancesDrawer,
  type CashOutDrawer,
  type Dashboard,
  type LiveVehicle,
  type RevenueDrawer,
  type TripsDrawer,
  type VehicleDaySummary,
} from './schemas';

/* -------------------------------------------------------------------------- */
/* apex-rust — the entry point payload and its drawers                         */
/* All MessagePack: the encoding the rest of the app already speaks, and the   */
/* one that round-trips an f64 exactly.                                        */
/* -------------------------------------------------------------------------- */

async function getPacked(url: string, month?: string): Promise<unknown> {
  const response = await apiClientRust.get(url, {
    params: { ...(month ? { month } : {}), format: 'msgpack' },
    responseType: 'arraybuffer',
    headers: { Accept: 'application/msgpack' },
  });
  return msgpackDecode(new Uint8Array(response.data as ArrayBuffer));
}

export const dashboardApi = {
  async get(month?: string): Promise<Dashboard> {
    return dashboardSchema.parse(await getPacked('/api/v1/dashboard', month));
  },
  async revenue(month?: string): Promise<RevenueDrawer> {
    return revenueDrawerSchema.parse(await getPacked('/api/v1/dashboard/revenue', month));
  },
  async cashOut(month?: string): Promise<CashOutDrawer> {
    return cashOutDrawerSchema.parse(await getPacked('/api/v1/dashboard/cash-out', month));
  },
  async trips(month?: string): Promise<TripsDrawer> {
    return tripsDrawerSchema.parse(await getPacked('/api/v1/dashboard/trips', month));
  },
  async advances(): Promise<AdvancesDrawer> {
    return advancesDrawerSchema.parse(await getPacked('/api/v1/dashboard/advances'));
  },
};

/* -------------------------------------------------------------------------- */
/* etit-proxy — called straight from the browser, never through apex-rust,     */
/* so neither service's latency or outage becomes the other's.                 */
/* -------------------------------------------------------------------------- */

export const etitApi = {
  /**
   * The SSE endpoint's absolute-ish URL. `EventSource` cannot send an
   * Authorization header, so this leg authenticates by the `jwt` cookie —
   * `withCredentials` on the EventSource carries it. (The one-shot fallback
   * goes through axios and can use the Bearer header like everything else.)
   */
  streamUrl(): string | null {
    const base = env.VITE_API_BASE_URL_ETIT;
    if (!base) return null;
    return `${base.replace(/\/$/, '')}/api/v1/stream/live`;
  },

  /** One snapshot, for when the stream cannot be had. Bearer-authenticated. */
  async liveOnce(): Promise<LiveVehicle[]> {
    if (!apiClientEtit) throw new Error('etit not configured');
    const { data } = await apiClientEtit.get('/api/v1/vehicles/live');
    return liveFeedSchema.parse(data);
  },

  /** The truck drawer: one day of one vehicle, summarised upstream. */
  async daySummary(vehicleId: string, date: string): Promise<VehicleDaySummary> {
    if (!apiClientEtit) throw new Error('etit not configured');
    const { data } = await apiClientEtit.get(
      `/api/v1/vehicles/${encodeURIComponent(vehicleId)}/history/summary`,
      { params: { date } },
    );
    return vehicleDaySummarySchema.parse(data);
  },
};
