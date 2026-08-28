import * as React from 'react';
import { etitApi } from '@/entities/dashboard/api';
import { liveFeedSchema, type LiveVehicle } from '@/entities/dashboard/schemas';

/* -------------------------------------------------------------------------- */
/* The live fleet feed — SSE, no polling                                       */
/*                                                                            */
/* Protocol (etit-proxy stream.rs): on connect a full `snapshot`, then a whole */
/* snapshot again on every upstream refresh as `update`, and `lag` when we     */
/* fell behind. Because every event carries the WHOLE fleet, state is replaced */
/* wholesale — no merge logic, nothing to drift, and lag needs no resync: the  */
/* next update already repairs it.                                             */
/*                                                                            */
/* Failure ladder:                                                            */
/*   EventSource reconnects itself with backoff. After MAX_FAILURES straight   */
/*   failures we stop, take ONE snapshot over plain HTTP (which can Bearer-    */
/*   auth, unlike EventSource), and wait for a human — refresh() is the only   */
/*   way back. Nothing in this file ever sets a timer to refetch.              */
/*                                                                            */
/* Hidden tabs close the stream and reopen on visibility. That is connection   */
/* hygiene, not polling — the reopen starts with a fresh snapshot anyway.      */
/* -------------------------------------------------------------------------- */

export type EtitConnection = 'connecting' | 'live' | 'down';

export interface EtitLive {
  connection: EtitConnection;
  /** null until the first snapshot ever arrives. Keyed by vehicle id. */
  vehicles: Map<string, LiveVehicle> | null;
  /** True briefly after a `lag` event — cosmetic, the data self-heals. */
  lagged: boolean;
  /** Manual retry: one HTTP snapshot now, and the stream is attempted again. */
  refresh: () => void;
}

const MAX_FAILURES = 3;

export function useEtitLive(enabled: boolean): EtitLive {
  const [connection, setConnection] = React.useState<EtitConnection>('connecting');
  const [vehicles, setVehicles] = React.useState<Map<string, LiveVehicle> | null>(null);
  const [lagged, setLagged] = React.useState(false);

  const sourceRef = React.useRef<EventSource | null>(null);
  const failuresRef = React.useRef(0);
  const lagTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const applySnapshot = React.useCallback((raw: string) => {
    try {
      const parsed = liveFeedSchema.parse(JSON.parse(raw));
      setVehicles(new Map(parsed.map((v) => [v.id, v])));
    } catch {
      // A malformed frame is the proxy's bug, not a reason to blank the page;
      // keep the last good state and let the next frame try again.
    }
  }, []);

  const oneShot = React.useCallback(() => {
    etitApi
      .liveOnce()
      .then((list) => setVehicles(new Map(list.map((v) => [v.id, v]))))
      .catch(() => {
        // Even the one-shot failed. vehicles stays as-is (possibly null) and
        // the tiles fall back to the trip-record identity from apex.
      });
  }, []);

  const connect = React.useCallback(() => {
    const url = etitApi.streamUrl();
    if (!url) {
      setConnection('down');
      return;
    }
    sourceRef.current?.close();
    setConnection('connecting');

    // Cookie auth: EventSource cannot carry a Bearer header.
    const es = new EventSource(url, { withCredentials: true });
    sourceRef.current = es;

    es.addEventListener('snapshot', (e) => {
      failuresRef.current = 0;
      setConnection('live');
      applySnapshot((e as MessageEvent).data);
    });
    es.addEventListener('update', (e) => {
      failuresRef.current = 0;
      setConnection('live');
      applySnapshot((e as MessageEvent).data);
    });
    es.addEventListener('lag', () => {
      // Data self-heals on the next update; this is purely a badge blink.
      setLagged(true);
      if (lagTimerRef.current) clearTimeout(lagTimerRef.current);
      lagTimerRef.current = setTimeout(() => setLagged(false), 5_000);
    });
    es.onerror = () => {
      // A non-200 or wrong-MIME response closes the EventSource FATALLY —
      // readyState lands on CLOSED and the browser will never retry. Waiting
      // for three of those would wait forever, so a fatal close goes straight
      // to the fallback. Transient drops leave readyState on CONNECTING and
      // get the three-strikes treatment.
      const fatal = es.readyState === EventSource.CLOSED;
      failuresRef.current += 1;
      if (fatal || failuresRef.current >= MAX_FAILURES) {
        // Stop burning reconnects. One honest snapshot, then wait for a human.
        es.close();
        sourceRef.current = null;
        setConnection('down');
        oneShot();
      } else {
        setConnection('connecting'); // EventSource is retrying on its own.
      }
    };
  }, [applySnapshot, oneShot]);

  const refresh = React.useCallback(() => {
    failuresRef.current = 0;
    oneShot();
    connect();
  }, [connect, oneShot]);

  React.useEffect(() => {
    if (!enabled) return;
    connect();

    const onVisibility = () => {
      if (document.hidden) {
        sourceRef.current?.close();
        sourceRef.current = null;
      } else if (!sourceRef.current) {
        failuresRef.current = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      sourceRef.current?.close();
      sourceRef.current = null;
      if (lagTimerRef.current) clearTimeout(lagTimerRef.current);
    };
  }, [enabled, connect]);

  return { connection, vehicles, lagged, refresh };
}
