import * as React from 'react';
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { env } from '@/shared/config/env';
import {
  etitApi,
  buildEtitLiveStreamUrl,
  type HistoryDayArgs,
  type HistoryRangeArgs,
} from './api';
import {
  etitLiveDeltaListSchema,
  etitLiveListSchema,
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
  historyRange: (id: string, fromIso: string, toIso: string, refresh?: boolean) =>
    [...etitKeys.all, 'history', id, 'range', fromIso, toIso, refresh ? 'refresh' : 'cached'] as const,
  historyDay: (id: string, dayIso: string, refresh?: boolean) =>
    [...etitKeys.all, 'history', id, 'day', dayIso, refresh ? 'refresh' : 'cached'] as const,
  summary: (id: string, fromIso: string, toIso: string, refresh?: boolean) =>
    [...etitKeys.all, 'summary', id, fromIso, toIso, refresh ? 'refresh' : 'cached'] as const,
} as const;

/* -------------------------------------------------------------------------- */
/* Vehicles + history (unchanged contracts)                                    */
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

export interface UseEtitLiveOptions
  extends Omit<UseQueryOptions<EtitLiveStatus[]>, 'queryKey' | 'queryFn'> {
  streamConnected?: boolean;
}

export function useEtitLive({ streamConnected, ...options }: UseEtitLiveOptions = {}) {
  return useQuery<EtitLiveStatus[]>({
    queryKey: etitKeys.live(),
    queryFn: () => etitApi.listLive(),
    refetchInterval: streamConnected ? false : 30_000,
    refetchOnWindowFocus: !streamConnected,
    staleTime: streamConnected ? Infinity : 10_000,
    ...options,
  });
}

export function useEtitHistoryRange(
  args: HistoryRangeArgs | null,
  options?: Omit<UseQueryOptions<EtitHistoryResponse>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  const enabled = args !== null;
  return useQuery<EtitHistoryResponse>({
    queryKey: enabled
      ? etitKeys.historyRange(args.vehicleId, args.from.toISOString(), args.to.toISOString(), args.refresh)
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
      ? etitKeys.historyDay(args.vehicleId, args.day.toISOString(), args.refresh)
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
      ? etitKeys.summary(args.vehicleId, args.from.toISOString(), args.to.toISOString(), args.refresh)
      : ['etit', 'summary', 'disabled'],
    queryFn: () => etitApi.historySummary(args!),
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    ...options,
  });
}

/* -------------------------------------------------------------------------- */
/* Live stream (SSE) — three correctness improvements:                        */
/*                                                                            */
/* 1. Schema gates `id` as required for deltas. The old code used            */
/*    `etitLiveStatusSchema.partial()`, which silently corrupted the cache   */
/*    on malformed payloads (`Map.get(undefined)` retrieves whichever       */
/*    object was first appended with no id, then deltas trample it).         */
/*                                                                            */
/* 2. `snapshot` events REPLACE the cache; `update` and unnamed `message`   */
/*    events MERGE. Treating both as merge means vehicles removed from the   */
/*    upstream linger as ghosts after a reconnect.                          */
/*                                                                            */
/* 3. Application-level heartbeat: any `error` is detectable, but a         */
/*    silently-stalled connection (NAT timeout, TLS half-open) isn't. We    */
/*    rearm a 60s timeout on every message; if it fires, we force-close     */
/*    and reconnect.                                                        */
/*                                                                            */
/* Visibility hook: when the tab returns from background, force a one-shot  */
/* REST refetch to recover from arbitrarily-stale state.                    */
/* -------------------------------------------------------------------------- */

export interface UseEtitLiveStreamResult {
  connected: boolean;
  error: Error | null;
}

const SSE_HEARTBEAT_MS = 60_000;
const SSE_BACKOFF_BASE_MS = 1_000;
const SSE_BACKOFF_MAX_MS = 30_000;

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
    let heartbeatTimer: number | null = null;
    let attempt = 0;
    let cancelled = false;

    const clearHeartbeat = () => {
      if (heartbeatTimer !== null) {
        window.clearTimeout(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const armHeartbeat = () => {
      clearHeartbeat();
      heartbeatTimer = window.setTimeout(() => {
        // The browser will not fire `error` for a silently-dead socket.
        console.warn('[etit-stream] heartbeat timeout, reconnecting');
        if (es) { es.close(); es = null; }
        setConnected(false);
        scheduleRetry(new Error('SSE heartbeat timeout'));
      }, SSE_HEARTBEAT_MS);
    };

    const parseEnvelope = (raw: string): unknown[] | null => {
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { return null; }
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && 'vehicles' in parsed) {
        const list = (parsed as { vehicles: unknown }).vehicles;
        return Array.isArray(list) ? list : null;
      }
      return parsed && typeof parsed === 'object' ? [parsed] : null;
    };

    const applySnapshot = (raw: string) => {
      const list = parseEnvelope(raw);
      if (!list) return;
      const result = etitLiveListSchema.safeParse(list);
      if (!result.success) {
        console.warn('[etit-stream] snapshot rejected', result.error.issues.slice(0, 3));
        return;
      }
      // REPLACE — anything not in the snapshot is gone upstream.
      queryClient.setQueryData<EtitLiveStatus[]>(etitKeys.live(), result.data);
    };

    const applyDelta = (raw: string) => {
      const list = parseEnvelope(raw);
      if (!list) return;
      const result = etitLiveDeltaListSchema.safeParse(list);
      if (!result.success) {
        console.warn('[etit-stream] delta rejected', result.error.issues[0]);
        return;
      }
      if (result.data.length === 0) return;

      queryClient.setQueryData<EtitLiveStatus[]>(etitKeys.live(), (prev) => {
        const next = prev ? prev.slice() : [];
        const indexById = new Map<string, number>();
        next.forEach((s, i) => indexById.set(s.id, i));

        for (const u of result.data) {
          const i = indexById.get(u.id);
          if (i === undefined) {
            // Delta for an unknown vehicle: only accept when it has the
            // full shape needed to render. Otherwise drop and wait for
            // the next snapshot to introduce it cleanly.
            const safe = etitLiveListSchema.safeParse([u]);
            if (!safe.success) continue;
            indexById.set(u.id, next.length);
            next.push(safe.data[0]);
          } else {
            next[i] = { ...next[i], ...u };
          }
        }
        return next;
      });
    };

    const open = () => {
      if (cancelled) return;
      const url = buildEtitLiveStreamUrl(baseUrl);

      try {
        // Cookie-based auth — no tokens in the URL.
        es = new EventSource(url.toString(), { withCredentials: true });
      } catch (err) {
        scheduleRetry(err);
        return;
      }

      es.onopen = () => {
        attempt = 0;
        setConnected(true);
        setError(null);
        armHeartbeat();
      };

      es.onerror = () => {
        setConnected(false);
        clearHeartbeat();
        scheduleRetry(new Error('SSE connection lost'));
      };

      es.addEventListener('snapshot', (e: MessageEvent) => {
        armHeartbeat();
        applySnapshot(e.data);
      });

      es.addEventListener('update', (e: MessageEvent) => {
        armHeartbeat();
        applyDelta(e.data);
      });

      // Backward-compat with older proxy builds that always emit unnamed.
      es.onmessage = (e) => {
        armHeartbeat();
        applyDelta(e.data);
      };
    };

    const scheduleRetry = (err: unknown) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      if (es) { es.close(); es = null; }
      clearHeartbeat();
      if (cancelled) return;

      // Exponential backoff with jitter ([base/2, base)) prevents a
      // thundering herd of tabs reconnecting on a proxy restart.
      const base = Math.min(SSE_BACKOFF_MAX_MS, SSE_BACKOFF_BASE_MS * 2 ** attempt);
      const delay = base / 2 + Math.random() * (base / 2);
      attempt += 1;
      retryTimer = window.setTimeout(open, delay);
    };

    // Visibility recovery: when the tab returns from background, the
    // stream may still be connected but the cache can be wildly stale.
    // Force a one-shot REST refetch.
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      queryClient.invalidateQueries({ queryKey: etitKeys.live() });
    };
    document.addEventListener('visibilitychange', onVisibility);

    open();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      clearHeartbeat();
      if (es) es.close();
      setConnected(false);
    };
  }, [queryClient]);

  return { connected, error };
}

/* -------------------------------------------------------------------------- */
/* Fleet hook (consolidated)                                                   */
/* -------------------------------------------------------------------------- */

export function useEtitFleet() {
  const metadata = useEtitVehicles();
  const liveStream = useEtitLiveStream();
  const snapshots = useEtitLive({ streamConnected: liveStream.connected });

  const fleet = React.useMemo(() => {
    if (!metadata.data) return [];

    const liveMap = new Map<string, EtitLiveStatus>();
    if (snapshots.data) {
      for (const s of snapshots.data) liveMap.set(s.id, s);
    }

    return metadata.data.map((v) => {
      const live = liveMap.get(v.id);
      if (!live) return v;
      return {
        ...v,
        speed: live.speed,
        status: live.status,
        statusLabel: live.statusLabel,
        lat: live.lat,
        lng: live.lng,
        heading: live.heading ?? v.heading,
      };
    });
  }, [metadata.data, snapshots.data]);

  return {
    fleet,
    loading: metadata.isLoading || snapshots.isLoading,
    isLoading: metadata.isLoading || snapshots.isLoading,
    error: metadata.error || snapshots.error,
    liveConnected: liveStream.connected,
    liveError: liveStream.error,
    refreshMetadata: () => metadata.refetch(),
    liveStatuses: snapshots.data ?? [],
    isError: metadata.isError || snapshots.isError,
  };
}
