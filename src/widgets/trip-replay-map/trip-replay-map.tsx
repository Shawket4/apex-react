import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { DEFAULT_MAP_CENTER } from '@/shared/lib/coords';
import { isGoogleMapsConfigured } from '@/shared/lib/maps/google-provider';
import type { DynMarkerId, ReplayMapAdapter, ReplayScene } from './types';

/* -------------------------------------------------------------------------- */
/* TripReplayMap                                                               */
/*                                                                             */
/* React wrapper around the imperative adapters. React renders the container  */
/* exactly once; everything that moves goes through the ref handle so the     */
/* rAF loop never touches React state. Provider cascade mirrors MapView:      */
/* Google when configured (8s budget), otherwise/on failure Leaflet.          */
/* -------------------------------------------------------------------------- */

const GOOGLE_INIT_TIMEOUT_MS = 8_000;

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

    /* ---- Init once ---------------------------------------------------- */

    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      let cancelled = false;
      let adapter: ReplayMapAdapter | null = null;

      const init = async () => {
        if (isGoogleMapsConfigured()) {
          try {
            const { createGoogleReplayAdapter } = await import('./google-adapter');
            adapter = await Promise.race([
              createGoogleReplayAdapter(container, DEFAULT_MAP_CENTER),
              new Promise<never>((_, reject) =>
                window.setTimeout(
                  () => reject(new Error('google init timeout')),
                  GOOGLE_INIT_TIMEOUT_MS,
                ),
              ),
            ]);
          } catch (err) {
            console.warn('[TripReplayMap] Google init failed — using Leaflet', err);
            adapter = null;
          }
        }
        if (!adapter) {
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
      <div className={cn('relative h-full w-full', className)}>
        <div ref={containerRef} className="h-full w-full" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />
          </div>
        )}
      </div>
    );
  },
);
