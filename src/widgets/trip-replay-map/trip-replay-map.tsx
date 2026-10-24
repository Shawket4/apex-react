import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { DEFAULT_MAP_CENTER } from '@/shared/lib/coords';
import { reportGoogleMapsFailure } from '@/shared/lib/maps/google-maps-health';
import { useMapProvider } from '@/shared/lib/maps/use-map-provider';
import type { DynMarkerId, ReplayMapAdapter, ReplayScene } from './types';

/* -------------------------------------------------------------------------- */
/* TripReplayMap                                                               */
/*                                                                             */
/* React wrapper around the imperative adapters. React renders the container  */
/* exactly once; everything that moves goes through the ref handle so the     */
/* rAF loop never touches React state. The provider is the app-wide one        */
/* (google-maps-health): Google until it fails anywhere, then Leaflet — and   */
/* a failure while this map is up swaps the adapter and re-applies the scene. */
/* -------------------------------------------------------------------------- */

/** Long enough for a slow SDK download: running out means Google fails app-wide. */
const GOOGLE_INIT_TIMEOUT_MS = 15_000;

export interface TripReplayMapHandle {
  moveMarker(id: DynMarkerId, lat: number, lng: number): void;
  setMarkerColor(id: DynMarkerId, color: string): void;
  setMarkerVisible(id: DynMarkerId, visible: boolean): void;
  follow(lat: number, lng: number): void;
  fitPoints(points: Array<[number, number]>): void;
  pulse(lat: number, lng: number, color?: string): void;
  setMapType(type: 'roadmap' | 'hybrid'): void;
}

export interface TripReplayMapProps {
  scene: ReplayScene | null;
  onPinClick?: (pinId: string) => void;
  onReady?: () => void;
  className?: string;
}

export const TripReplayMap = React.forwardRef<TripReplayMapHandle, TripReplayMapProps>(
  function TripReplayMap({ scene, onPinClick, onReady, className }, ref) {
    const { t } = useTranslation();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const adapterRef = React.useRef<ReplayMapAdapter | null>(null);
    const [ready, setReady] = React.useState(false);

    const onPinClickRef = React.useRef(onPinClick);
    const onReadyRef = React.useRef(onReady);
    React.useEffect(() => {
      onPinClickRef.current = onPinClick;
      adapterRef.current?.onPinClick(onPinClick ?? null);
    }, [onPinClick]);
    React.useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    /* ---- Init once per provider -------------------------------------- */

    const provider = useMapProvider();

    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      let cancelled = false;
      let adapter: ReplayMapAdapter | null = null;

      const init = async () => {
        if (provider === 'google') {
          let pending: Promise<ReplayMapAdapter> | null = null;
          let timer = 0;
          try {
            const { createGoogleReplayAdapter } = await import('./google-adapter');
            pending = createGoogleReplayAdapter(container, DEFAULT_MAP_CENTER);
            adapter = await Promise.race([
              pending,
              new Promise<never>((_, reject) => {
                timer = window.setTimeout(
                  () => reject(new Error('google init timeout')),
                  GOOGLE_INIT_TIMEOUT_MS,
                );
              }),
            ]);
            window.clearTimeout(timer);
          } catch (err) {
            window.clearTimeout(timer);
            // A Google adapter that turns up after we gave up must not keep
            // its claim on the shared map.
            void pending?.then((late) => late.destroy()).catch(() => {});
            // Every map moves to Leaflet; this effect runs again with it.
            if (!cancelled) {
              const timedOut = err instanceof Error && err.message === 'google init timeout';
              reportGoogleMapsFailure(timedOut ? 'timeout' : 'error', err);
            }
            return;
          }
        } else {
          const { createLeafletReplayAdapter } = await import('./leaflet-adapter');
          adapter = await createLeafletReplayAdapter(container, DEFAULT_MAP_CENTER);
        }
        if (cancelled) {
          adapter.destroy();
          return;
        }
        adapterRef.current = adapter;
        adapter.onPinClick(onPinClickRef.current ?? null);
        setReady(true);
        onReadyRef.current?.();
      };

      void init().catch((err) => console.error('[TripReplayMap] init failed', err));

      return () => {
        cancelled = true;
        adapterRef.current?.destroy();
        adapterRef.current = null;
        setReady(false);
      };
    }, [provider]);

    /* ---- Static scene (built once per scene identity) ------------------ */

    React.useEffect(() => {
      if (!ready || !scene) return;
      adapterRef.current?.setScene(scene);
    }, [ready, scene]);

    /* ---- Imperative handle -------------------------------------------- */

    React.useImperativeHandle(
      ref,
      (): TripReplayMapHandle => ({
        moveMarker: (id, lat, lng) => adapterRef.current?.moveMarker(id, lat, lng),
        setMarkerColor: (id, color) => adapterRef.current?.setMarkerColor(id, color),
        setMarkerVisible: (id, visible) =>
          adapterRef.current?.setMarkerVisible(id, visible),
        follow: (lat, lng) => adapterRef.current?.follow(lat, lng),
        fitPoints: (points) => adapterRef.current?.fitPoints(points),
        pulse: (lat, lng, color) => adapterRef.current?.pulse(lat, lng, color),
        setMapType: (type) => adapterRef.current?.setMapType(type),
      }),
      [],
    );

    return (
      // `isolate`: a Leaflet map's panes (z-index 400+) stay under the page's
      // overlays, as Google's do.
      <div className={cn('relative isolate h-full w-full', className)}>
        <div ref={containerRef} className="h-full w-full" />
        {!ready && (
          <div
            role="status"
            aria-label={t('common.loading', 'Loading…')}
            className="absolute inset-0 flex items-center justify-center bg-muted/40"
          >
            <Loader2
              className="h-7 w-7 animate-spin text-primary"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    );
  },
);
