import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { trackingApi, trackingKeys } from './api';
import {
  liveDeltaListSchema,
  liveListSchema,
  type LiveStatus,
  type Vehicle,
} from './schemas';

/* -------------------------------------------------------------------------- */
/* The live fleet: static vehicle metadata + an SSE position feed.             */
/*                                                                            */
/* SSE is the ONLY live channel — no interval, ever. `snapshot` frames        */
/* REPLACE the cache (vehicles gone upstream must not ghost), `update`        */
/* frames MERGE by id. A 60s application heartbeat catches silently-dead      */
/* sockets; reconnects back off exponentially with jitter. When the stream    */
/* is down the page keeps the last honest snapshot and offers refresh();      */
/* returning to the tab reconnects and refetches once.                        */
/* -------------------------------------------------------------------------- */

export type Connection = 'connecting' | 'live' | 'down';

export interface LiveFleet {
  vehicles: Vehicle[];
  vehiclesLoading: boolean;
  /** Latest live status per vehicle id. */
  live: Map<string, LiveStatus>;
  connection: Connection;
  /** Manual retry: one REST snapshot now + a fresh stream attempt. */
  refresh: () => void;
}

const HEARTBEAT_MS = 60_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const MAX_STRAIGHT_FAILURES = 4;

export function useLiveFleet(enabled = true): LiveFleet {
  const qc = useQueryClient();

  const vehiclesQuery = useQuery({
    queryKey: trackingKeys.vehicles(),
    queryFn: trackingApi.vehicles,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    enabled,
  });

  const liveQuery = useQuery<LiveStatus[]>({
    queryKey: trackingKeys.live(),
    queryFn: trackingApi.liveOnce,
    // The stream owns freshness; this query is the seed + manual fallback.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled,
  });

  const [connection, setConnection] = React.useState<Connection>('connecting');
  const [epoch, setEpoch] = React.useState(0); // bumped by refresh()

  React.useEffect(() => {
    if (!enabled) return;
    const url = trackingApi.streamUrl();
    if (!url) {
      setConnection('down');
      return;
    }

    let es: EventSource | null = null;
    let retryTimer: number | null = null;
    let heartbeat: number | null = null;
    let attempt = 0;
    let cancelled = false;

    const armHeartbeat = () => {
      if (heartbeat !== null) window.clearTimeout(heartbeat);
      heartbeat = window.setTimeout(() => {
        es?.close();
        es = null;
        setConnection('connecting');
        scheduleRetry();
      }, HEARTBEAT_MS);
    };

    const frameList = (raw: string): unknown[] | null => {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && 'vehicles' in parsed) {
          const v = (parsed as { vehicles: unknown }).vehicles;
          return Array.isArray(v) ? v : null;
        }
        return parsed && typeof parsed === 'object' ? [parsed] : null;
      } catch {
        return null;
      }
    };

    const onSnapshot = (raw: string) => {
      const list = frameList(raw);
      if (!list) return;
      const parsed = liveListSchema.safeParse(list);
      if (!parsed.success) return;
      qc.setQueryData<LiveStatus[]>(trackingKeys.live(), parsed.data);
    };

    const onDelta = (raw: string) => {
      const list = frameList(raw);
      if (!list) return;
      const parsed = liveDeltaListSchema.safeParse(list);
      if (!parsed.success || parsed.data.length === 0) return;
      qc.setQueryData<LiveStatus[]>(trackingKeys.live(), (prev) => {
        const next = prev ? prev.slice() : [];
        const index = new Map(next.map((s, i) => [s.id, i] as const));
        for (const u of parsed.data) {
          const i = index.get(u.id);
          if (i === undefined) {
            const full = liveListSchema.safeParse([u]);
            if (full.success) {
              index.set(u.id, next.length);
              next.push(full.data[0]);
            }
          } else {
            next[i] = { ...next[i], ...u };
          }
        }
        return next;
      });
    };

    const open = () => {
      if (cancelled) return;
      es = new EventSource(url, { withCredentials: true });
      es.onopen = () => {
        attempt = 0;
        setConnection('live');
        armHeartbeat();
      };
      es.onerror = () => {
        // Fatal closes (401, wrong MIME) land on CLOSED and never retry on
        // their own; transient drops keep the browser retrying, but WE own
        // backoff, so both paths route through scheduleRetry.
        es?.close();
        es = null;
        if (heartbeat !== null) window.clearTimeout(heartbeat);
        scheduleRetry();
      };
      es.addEventListener('snapshot', (e) => {
        armHeartbeat();
        setConnection('live');
        onSnapshot((e as MessageEvent).data);
      });
      es.addEventListener('update', (e) => {
        armHeartbeat();
        setConnection('live');
        onDelta((e as MessageEvent).data);
      });
      es.onmessage = (e) => {
        armHeartbeat();
        onDelta(e.data);
      };
    };

    const scheduleRetry = () => {
      if (cancelled) return;
      attempt += 1;
      if (attempt > MAX_STRAIGHT_FAILURES) {
        // Stop burning reconnects: one honest snapshot, then wait for a
        // human (refresh button) or a tab-visibility return.
        setConnection('down');
        void qc.refetchQueries({ queryKey: trackingKeys.live() });
        return;
      }
      setConnection('connecting');
      const base = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** attempt);
      retryTimer = window.setTimeout(open, base / 2 + Math.random() * (base / 2));
    };

    const onVisibility = () => {
      if (document.hidden) {
        es?.close();
        es = null;
        if (heartbeat !== null) window.clearTimeout(heartbeat);
      } else if (!es) {
        attempt = 0;
        void qc.refetchQueries({ queryKey: trackingKeys.live() });
        open();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    open();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      if (heartbeat !== null) window.clearTimeout(heartbeat);
      es?.close();
    };
  }, [enabled, epoch, qc]);

  const refresh = React.useCallback(() => {
    void qc.refetchQueries({ queryKey: trackingKeys.live() });
    setEpoch((e) => e + 1); // tears down + reopens the stream effect
  }, [qc]);

  const live = React.useMemo(() => {
    const m = new Map<string, LiveStatus>();
    for (const s of liveQuery.data ?? []) m.set(s.id, s);
    return m;
  }, [liveQuery.data]);

  return {
    vehicles: vehiclesQuery.data ?? [],
    vehiclesLoading: vehiclesQuery.isLoading,
    live,
    connection,
    refresh,
  };
}
