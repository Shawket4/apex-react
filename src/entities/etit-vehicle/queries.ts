import * as React from 'react';
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { env } from '@/shared/config/env';
import { STORAGE_KEYS } from '@/shared/config/constants';
import {
  etitApi,
  ETIT_LIVE_STREAM_PATH,
  type HistoryDayArgs,
  type HistoryRangeArgs,
} from './api';
import {
  etitLiveStatusSchema,
  type EtitHistoryResponse,
  type EtitLiveStatus,
  type EtitTripSummary,
  type EtitVehicle,
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
/* Vehicles                                                                    */
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
/* Live snapshot                                                               */
/*                                                                             *
 * The page combines two sources for live data:                              *
 *   1. SSE stream (`useEtitLiveStream`) — preferred, deltas in real time     *
 *   2. Snapshot poll (`useEtitLive`)    — seed + safety net                  *
 *                                                                             *
 * When the stream is healthy we let the snapshot back off to a long          *
 * interval (5 min) so we don't pay for duplicate work; when the stream       *
 * disconnects we tighten back to 30s.                                        *
 * -------------------------------------------------------------------------- */

export interface UseEtitLiveOptions
  extends Omit<UseQueryOptions<EtitLiveStatus[]>, 'queryKey' | 'queryFn'> {
  streamConnected?: boolean;
}

export function useEtitLive({ streamConnected, ...options }: UseEtitLiveOptions = {}) {
  return useQuery<EtitLiveStatus[]>({
    queryKey: etitKeys.live(),
    queryFn: () => etitApi.listLive(),
    refetchInterval: streamConnected ? 5 * 60_000 : 30_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    ...options,
  });
}

/* -------------------------------------------------------------------------- */
/* History                                                                     */
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

/* -------------------------------------------------------------------------- */
/* Live stream (SSE)                                                           */
/*                                                                             *
 * Wires the proxy's SSE endpoint into the same `etitKeys.live()` cache the   *
 * snapshot poll uses, so consumers (vehicle list, map) read one source.      *
 *                                                                             *
 * Reconnect strategy: on any error we close the EventSource and schedule a   *
 * reopen with exponential backoff (1s → 30s capped). EventSource has its    *
 * own auto-reconnect, but it does not fire on permanent close states and    *
 * skips the close/open `onerror` cycle, so we manage it manually for        *
 * deterministic behaviour.                                                   *
 *                                                                             *
 * Auth: the proxy sits on the same origin and accepts the same JWT cookie   *
 * as the REST endpoints. We append `?token=...` as a fallback because       *
 * EventSource cannot set a custom `Authorization` header.                   *
 * -------------------------------------------------------------------------- */

export interface UseEtitLiveStreamResult {
  /** Whether the stream is currently open and receiving events. */
  connected: boolean;
  /** Last error encountered (best-effort; cleared on next successful open). */
  error: Error | null;
}

export function useEtitLiveStream(): UseEtitLiveStreamResult {
  const queryClient = useQueryClient();
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    const baseUrl = env.VITE_API_BASE_URL_ETIT ?? env.VITE_API_BASE_URL;
    if (!baseUrl) return;

    let es: EventSource | null = null;
    let retryTimer: number | null = null;
    let attempt = 0;
    let cancelled = false;

    const open = () => {
      if (cancelled) return;
      const token = (() => {
        try {
          return localStorage.getItem(STORAGE_KEYS.JWT);
        } catch {
          return null;
        }
      })();
      const url = new URL(ETIT_LIVE_STREAM_PATH, baseUrl);
      if (token) url.searchParams.set('token', token);

      try {
        es = new EventSource(url.toString(), { withCredentials: true });
      } catch (err) {
        scheduleRetry(err);
        return;
      }

      es.onopen = () => {
        attempt = 0;
        setConnected(true);
        setError(null);
      };

      es.onerror = () => {
        // EventSource's onerror does not include details — synthesise.
        setConnected(false);
        scheduleRetry(new Error('SSE connection lost'));
      };

      // The proxy emits one named "live" event per delta. We also tolerate
      // the default unnamed `message` event for back-compat.
      const handleMessage = (e: MessageEvent) => {
        applyDelta(e.data);
      };
      es.addEventListener('live', handleMessage);
      es.addEventListener('message', handleMessage);
    };

    const applyDelta = (raw: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      const updates = etitLiveStatusSchema.array().safeParse(
        Array.isArray(parsed) ? parsed : [parsed],
      );
      if (!updates.success || updates.data.length === 0) return;

      queryClient.setQueryData<EtitLiveStatus[]>(etitKeys.live(), (prev) => {
        const next = prev ? [...prev] : [];
        const indexById = new Map<string, number>();
        next.forEach((s, i) => indexById.set(s.id, i));

        for (const u of updates.data) {
          const existing = indexById.get(u.id);
          if (existing === undefined) {
            indexById.set(u.id, next.length);
            next.push(u);
          } else {
            // Merge so we don't drop fields the delta omitted.
            next[existing] = { ...next[existing], ...u };
          }
        }
        return next;
      });
    };

    const scheduleRetry = (err: unknown) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      if (es) {
        es.close();
        es = null;
      }
      if (cancelled) return;
      const delay = Math.min(30_000, 1000 * 2 ** attempt);
      attempt += 1;
      retryTimer = window.setTimeout(open, delay);
    };

    open();

    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (es) {
        es.close();
        es = null;
      }
      setConnected(false);
    };
  }, [queryClient]);

  return { connected, error };
}
