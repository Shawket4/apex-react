import * as React from 'react';
import { reportGoogleMapsFailure } from '@/shared/lib/maps/google-maps-health';
import { useMapProvider } from '@/shared/lib/maps/use-map-provider';
import type { HistoryLayerInput } from './layers';
import type { LiveMarkerDatum, TrackingMapHandle, TrackingMapProps } from './types';

export type { LiveMarkerDatum, TrackingMapHandle } from './types';

/* -------------------------------------------------------------------------- */
/* Live tracking's map. The provider is the app-wide one (google-maps-health): */
/* the Google host while Google Maps works, the Leaflet host when it doesn't.  */
/* Both take the same imperative handle.                                       */
/*                                                                            */
/* The shell keeps the last of every call, so a host that takes over in the   */
/* middle of a session (Google failed while the page was open) starts where   */
/* the other left off: same history, vehicles, cursor, basemap and camera.    */
/* -------------------------------------------------------------------------- */

const GoogleTrackingHost = React.lazy(() => import('./google-host'));
const LeafletTrackingHost = React.lazy(() => import('./leaflet-host'));

type Camera =
  | { kind: 'fit'; coords: [number, number][] }
  | { kind: 'fly'; lng: number; lat: number; zoom?: number };

interface LastCalls {
  history?: HistoryLayerInput | null;
  follow?: boolean;
  mapType?: 'roadmap' | 'hybrid';
  cursor?: number | null;
  live?: LiveMarkerDatum[];
  camera?: Camera;
}

export const TrackingMap = React.forwardRef<TrackingMapHandle, TrackingMapProps>(
  function TrackingMap({ onMapReady, className, ...props }, ref) {
    const provider = useMapProvider();
    const hostRef = React.useRef<TrackingMapHandle>(null);
    const last = React.useRef<LastCalls>({});

    React.useImperativeHandle(
      ref,
      (): TrackingMapHandle => ({
        setHistory(input) {
          last.current.history = input;
          hostRef.current?.setHistory(input);
        },
        setFollow(on) {
          last.current.follow = on;
          hostRef.current?.setFollow(on);
        },
        setMapType(type) {
          last.current.mapType = type;
          hostRef.current?.setMapType(type);
        },
        setCursor(ms) {
          last.current.cursor = ms;
          hostRef.current?.setCursor(ms);
        },
        setLive(data) {
          last.current.live = data;
          hostRef.current?.setLive(data);
        },
        fitTo(coords) {
          last.current.camera = { kind: 'fit', coords };
          hostRef.current?.fitTo(coords);
        },
        flyTo(lng, lat, zoom) {
          last.current.camera = { kind: 'fly', lng, lat, zoom };
          hostRef.current?.flyTo(lng, lat, zoom);
        },
      }),
      [],
    );

    /** A host is up: give it everything the page has said so far. */
    const handleReady = React.useCallback(() => {
      const host = hostRef.current;
      const s = last.current;
      if (host) {
        if (s.follow !== undefined) host.setFollow(s.follow);
        if (s.mapType) host.setMapType(s.mapType);
        if (s.history !== undefined) host.setHistory(s.history);
        if (s.live) host.setLive(s.live);
        if (s.cursor != null) host.setCursor(s.cursor);
        if (s.camera?.kind === 'fit') host.fitTo(s.camera.coords);
        else if (s.camera?.kind === 'fly') host.flyTo(s.camera.lng, s.camera.lat, s.camera.zoom);
      }
      onMapReady?.();
    }, [onMapReady]);

    const Host = provider === 'google' ? GoogleTrackingHost : LeafletTrackingHost;
    return (
      <HostBoundary key={provider} provider={provider} className={className}>
        <React.Suspense fallback={<div className={className} />}>
          <Host ref={hostRef} {...props} onMapReady={handleReady} className={className} />
        </React.Suspense>
      </HostBoundary>
    );
  },
);

/** The Google host's chunk failing to load, or the host throwing, moves every map to Leaflet. */
class HostBoundary extends React.Component<
  { provider: string; className?: string; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
    if (this.props.provider === 'google') reportGoogleMapsFailure('error', err);
  }

  render() {
    return this.state.failed ? <div className={this.props.className} /> : this.props.children;
  }
}
