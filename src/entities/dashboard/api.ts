import { decode as msgpackDecode } from '@msgpack/msgpack';
import { z } from 'zod';
import { fuelEventSchema as fuelEventWireSchema } from '@/entities/fuel-event/schemas';
import { apiClientEtit, apiClientRust } from '@/shared/api/client';
import { env } from '@/shared/config/env';
import {
  advancesDrawerSchema,
  fuelDrawerSchema,
  cashOutDrawerSchema,
  dashboardSchema,
  liveFeedSchema,
  revenueDrawerSchema,
  tripsDrawerSchema,
  vehicleDaySummarySchema,
  type AdvancesDrawer,
  type FuelDrawer,
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

export interface DashboardScope {
  /** Explicit window (YYYY-MM-DD, inclusive). Null/absent = current month. */
  from?: string | null;
  to?: string | null;
  /** Trips-side company scope; cash-out and owed money ignore it. */
  company?: string | null;
}
import { DOCUMENT_EXPIRY_WARNING_DAYS } from '@/entities/car/expiry';

async function getPacked(url: string, scope?: DashboardScope): Promise<unknown> {
  const response = await apiClientRust.get(url, {
    params: {
      ...(scope?.from && scope?.to ? { from: scope.from, to: scope.to } : {}),
      ...(scope?.company ? { company: scope.company } : {}),
      // The expiry window travels with the request so the rule has exactly one
      // definition, in entities/car/expiry.ts, rather than a constant here and
      // another in the Rust handler quietly drifting apart.
      doc_horizon_days: DOCUMENT_EXPIRY_WARNING_DAYS,
      format: 'msgpack',
    },
    responseType: 'arraybuffer',
    headers: { Accept: 'application/msgpack' },
  });
  return msgpackDecode(new Uint8Array(response.data as ArrayBuffer));
}

export const dashboardApi = {
  async get(scope?: DashboardScope): Promise<Dashboard> {
    return dashboardSchema.parse(await getPacked('/api/v1/dashboard', scope));
  },
  async revenue(scope?: DashboardScope): Promise<RevenueDrawer> {
    return revenueDrawerSchema.parse(await getPacked('/api/v1/dashboard/revenue', scope));
  },
  async cashOut(scope?: DashboardScope): Promise<CashOutDrawer> {
    return cashOutDrawerSchema.parse(await getPacked('/api/v1/dashboard/cash-out', scope));
  },
  async trips(scope?: DashboardScope): Promise<TripsDrawer> {
    return tripsDrawerSchema.parse(await getPacked('/api/v1/dashboard/trips', scope));
  },
  async advances(): Promise<AdvancesDrawer> {
    return advancesDrawerSchema.parse(await getPacked('/api/v1/dashboard/advances'));
  },
  async fuel(scope?: DashboardScope): Promise<FuelDrawer> {
    return fuelDrawerSchema.parse(await getPacked('/api/v1/dashboard/fuel', scope));
  },
  /** One page of the window's fuel events, newest first — the Go wire shape
   *  the fuel-events page already parses, so its components render these
   *  untouched. */
  async fuelEvents(
    scope: DashboardScope | undefined,
    page: number,
    limit: number,
  ): Promise<FuelEventsPage> {
    const response = await apiClientRust.get('/api/v1/dashboard/fuel-events', {
      params: {
        ...(scope?.from && scope?.to ? { from: scope.from, to: scope.to } : {}),
        page,
        limit,
        format: 'msgpack',
      },
      responseType: 'arraybuffer',
      headers: { Accept: 'application/msgpack' },
    });
    return fuelEventsPageSchema.parse(
      msgpackDecode(new Uint8Array(response.data as ArrayBuffer)),
    );
  },
};

export const fuelEventsPageSchema = z.object({
  items: z.array(fuelEventWireSchema).default([]),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type FuelEventsPage = z.infer<typeof fuelEventsPageSchema>;

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
      {
        params: { date, format: 'msgpack' },
        responseType: 'arraybuffer',
        headers: { Accept: 'application/msgpack' },
      },
    );
    return vehicleDaySummarySchema.parse(msgpackDecode(new Uint8Array(data as ArrayBuffer)));
  },
};
