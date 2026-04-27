import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { etitApi, type HistoryDayArgs, type HistoryRangeArgs } from './api';
import type {
  EtitHistoryResponse,
  EtitLiveStatus,
  EtitTripSummary,
  EtitVehicle,
} from './schemas';

/* -------------------------------------------------------------------------- */
/* Query keys                                                                  */
/* -------------------------------------------------------------------------- */

export const etitKeys = {
  all: ['etit'] as const,
  vehicles: () => [...etitKeys.all, 'vehicles'] as const,
  vehicle: (id: string) => [...etitKeys.all, 'vehicle', id] as const,
  live: () => [...etitKeys.all, 'live'] as const,
  liveOne: (id: string) => [...etitKeys.all, 'live', id] as const,
  historyRange: (id: string, fromIso: string, toIso: string) =>
    [...etitKeys.all, 'history', id, 'range', fromIso, toIso] as const,
  historyDay: (id: string, dayIso: string) =>
    [...etitKeys.all, 'history', id, 'day', dayIso] as const,
  summary: (id: string, fromIso: string, toIso: string) =>
    [...etitKeys.all, 'summary', id, fromIso, toIso] as const,
} as const;

/* -------------------------------------------------------------------------- */
/* Vehicles list                                                               */
/*                                                                             */
/* The proxy's Tier A poller refreshes this once a day. We give the cache a   */
/* matching staleTime so a navigating user doesn't trigger refetches when     */
/* hopping between dashboard pages.                                            */
/* -------------------------------------------------------------------------- */

export function useEtitVehicles(
  options?: Omit<UseQueryOptions<EtitVehicle[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<EtitVehicle[]>({
    queryKey: etitKeys.vehicles(),
    queryFn: () => etitApi.listVehicles(),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    ...options,
  });
}

/* -------------------------------------------------------------------------- */
/* Live status                                                                 */
/*                                                                             */
/* Two ways to get live data:                                                 */
/*                                                                             */
/*   1. The SSE stream at `/api/v1/stream/live` — real-time deltas. Wired in */
/*      the page via `useEtitLiveStream` below.                               */
/*   2. The snapshot endpoint at `/api/v1/vehicles/live` — a one-shot fetch  */
/*      we use to seed the cache on mount, and as a fallback when SSE fails. */
/*                                                                             */
/* The query below is the snapshot fallback. We poll at 60s — this matches   */
/* the proxy's Tier B refresh, so the freshness floor is identical to SSE   */
/* in the worst case. When SSE is healthy, the page disables this query     */
/* via `enabled: false` to avoid duplicate requests.                          */
/* -------------------------------------------------------------------------- */

export function useEtitLive(
  options?: Omit<UseQueryOptions<EtitLiveStatus[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<EtitLiveStatus[]>({
    queryKey: etitKeys.live(),
    queryFn: () => etitApi.listLive(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    ...options,
  });
}

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/*                                                                             */
/* History is large (hundreds to thousands of points). We DO NOT auto-       */
/* refetch — the user has explicitly chosen a time window and we don't       */
/* want a surprise reload mid-playback. The proxy's Tier C poller keeps     */
/* today/yesterday fresh on the server side anyway, so a manual reload     */
/* gets the latest.                                                          */
/* -------------------------------------------------------------------------- */

export function useEtitHistoryRange(
  args: HistoryRangeArgs | null,
  options?: Omit<UseQueryOptions<EtitHistoryResponse>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  const enabled = args !== null;
  return useQuery<EtitHistoryResponse>({
    queryKey: enabled
      ? etitKeys.historyRange(args.vehicleId, args.from.toISOString(), args.to.toISOString())
      : ['etit', 'history', 'disabled'],
    queryFn: () => etitApi.historyForRange(args!),
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useEtitHistoryDay(
  args: HistoryDayArgs | null,
  options?: Omit<UseQueryOptions<EtitHistoryResponse>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  const enabled = args !== null;
  return useQuery<EtitHistoryResponse>({
    queryKey: enabled
      ? etitKeys.historyDay(args.vehicleId, args.day.toISOString())
      : ['etit', 'history', 'disabled'],
    queryFn: () => etitApi.historyForDay(args!),
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useEtitTripSummary(
  args: HistoryRangeArgs | null,
  options?: Omit<UseQueryOptions<EtitTripSummary>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  const enabled = args !== null;
  return useQuery<EtitTripSummary>({
    queryKey: enabled
      ? etitKeys.summary(args.vehicleId, args.from.toISOString(), args.to.toISOString())
      : ['etit', 'summary', 'disabled'],
    queryFn: () => etitApi.historySummary(args!),
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    ...options,
  });
}
