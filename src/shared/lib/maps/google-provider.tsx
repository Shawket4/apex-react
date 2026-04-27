import * as React from 'react';
import { Locate, Mountain } from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { DEFAULT_MAP_CENTER } from '@/shared/lib/coords';
import { buildMarkerSvg, markerSize } from './marker-svg';
import type { MapMarker, MapViewProps } from './types';

/* -------------------------------------------------------------------------- */
/* Map styles                                                                  */
/* -------------------------------------------------------------------------- */

const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1c2333' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1c2333' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8892a4' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c9d1db' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#283044' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2030' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a90' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d4f6e' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a2030' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#a0aec0' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#222d40' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1724' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d5166' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1a2638' }] },
];

const lightMapStyle: google.maps.MapTypeStyle[] = [
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#d6d6d6' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d4e4f0' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
];

/* -------------------------------------------------------------------------- */
/* Info-window styles (idempotent injection)                                   */
/* -------------------------------------------------------------------------- */

function injectInfoWindowStyles() {
  const styleId = 'gmaps-info-window-styles-v1';
  if (typeof document === 'undefined' || document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .gm-style-iw-c {
      padding: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08) !important;
      border: 1px solid rgba(0,0,0,0.07) !important;
      overflow: hidden !important;
    }
    .dark .gm-style-iw-c {
      background-color: #1e2535 !important;
      border-color: rgba(255,255,255,0.07) !important;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5) !important;
    }
    .dark .gm-style-iw-tc::after { background: #1e2535 !important; }
    .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; }
    .gm-ui-hover-effect { top: 6px !important; right: 6px !important; opacity: 0.5 !important; }
    .gm-ui-hover-effect:hover { opacity: 1 !important; }
    .dark .gm-ui-hover-effect > span { background-color: #94a3b8 !important; }
  `;
  document.head.appendChild(style);
}

/* -------------------------------------------------------------------------- */
/* Loader                                                                      */
/* -------------------------------------------------------------------------- */

let loaderConfigured = false;
function configureLoader() {
  if (loaderConfigured) return;
  const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
  setOptions({ key, v: 'weekly' });
  loaderConfigured = true;
}

export function isGoogleMapsConfigured(): boolean {
  return !!(import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined);
}

/* -------------------------------------------------------------------------- */
/* Smooth fly-to                                                               */
/* -------------------------------------------------------------------------- */

interface FlyToken { cancelled: boolean; rafId: number | null }

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothFlyTo(
  map: google.maps.Map,
  target: { lat: number; lng: number },
  targetZoom: number,
  durationMs = 800,
): FlyToken {
  const token: FlyToken = { cancelled: false, rafId: null };
  const startCenter = map.getCenter();
  const startZoom = map.getZoom() ?? 11;
  if (!startCenter) {
    map.setCenter(target);
    map.setZoom(targetZoom);
    return token;
  }
  const startLat = startCenter.lat();
  const startLng = startCenter.lng();
  const startTime = performance.now();
  const hasMoveCamera =
    typeof (map as unknown as { moveCamera?: unknown }).moveCamera === 'function';

  const frame = (now: number) => {
    if (token.cancelled) return;
    const t = Math.min(1, (now - startTime) / durationMs);
    const eased = easeInOutCubic(t);
    const lat = startLat + (target.lat - startLat) * eased;
    const lng = startLng + (target.lng - startLng) * eased;
    const zoom = startZoom + (targetZoom - startZoom) * eased;
    if (hasMoveCamera) {
      (map as unknown as {
        moveCamera: (opts: { center: { lat: number; lng: number }; zoom: number }) => void;
      }).moveCamera({ center: { lat, lng }, zoom });
    } else {
      map.setCenter({ lat, lng });
      map.setZoom(zoom);
    }
    if (t < 1) token.rafId = requestAnimationFrame(frame);
  };

  token.rafId = requestAnimationFrame(frame);
  return token;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function buildIcon(info: MapMarker, filterId: string): google.maps.Icon {
  const kind = info.kind ?? 'pin';
  const size = markerSize(kind);
  return {
    url: buildMarkerSvg(info.color, filterId, kind, info.heading ?? 0),
    scaledSize: new google.maps.Size(size.width, size.height),
    anchor: new google.maps.Point(size.anchorX, size.anchorY),
  };
}

/**
 * Fingerprint of bounds-affecting markers + route. When this changes the
 * map should refit; when it doesn't, marker positions can update silently.
 */
function boundsFingerprint(markers: MapMarker[], route: Array<[number, number]>): string {
  const ids: string[] = [];
  for (const m of markers) if (m.affectsBounds !== false) ids.push(m.id);
  ids.sort();
  return `${ids.join(',')}|${route.length}`;
}

/* Z-index hierarchy — playback above vehicles above stops/sensors above pins. */
function zIndexFor(kind: MapMarker['kind']): number {
  switch (kind) {
    case 'playback': return 1000;
    case 'vehicle':  return 800;
    case 'stop':     return 600;
    case 'ignition-on':
    case 'ignition-off': return 600;
    default: return 400;
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

interface MarkerEntry {
  marker: google.maps.Marker;
  // Cached visual signature so we only call setIcon when the visual
  // actually changed (cheap shallow check vs. an Icon round-trip).
  signature: string;
  listeners: google.maps.MapsEventListener[];
  popupHtml?: string;
}

function markerSignature(m: MapMarker): string {
  return `${m.kind ?? 'pin'}|${m.color}|${Math.round(m.heading ?? 0)}|${m.draggable ? 1 : 0}`;
}

export function GoogleMapView({
  markers = [],
  route = [],
  suppressRoute = false,
  centerFallback = DEFAULT_MAP_CENTER,
  height = 400,
  className,
  onMapClick,
  onMarkerDragEnd,
  liveUpdates = false,
}: MapViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const infoWindowRef = React.useRef<google.maps.InfoWindow | null>(null);
  const markerEntriesRef = React.useRef<Map<string, MarkerEntry>>(new Map());
  const polylinesRef = React.useRef<google.maps.Polyline[]>([]);
  const mapListenersRef = React.useRef<google.maps.MapsEventListener[]>([]);
  const themeObserverRef = React.useRef<MutationObserver | null>(null);
  const flyTokenRef = React.useRef<FlyToken | null>(null);
  const boundsRef = React.useRef<google.maps.LatLngBounds | null>(null);
  const lastFingerprintRef = React.useRef<string>('');

  const [mapReady, setMapReady] = React.useState(false);
  const [isSatellite, setIsSatellite] = React.useState(false);

  const onMapClickRef = React.useRef(onMapClick);
  const onMarkerDragEndRef = React.useRef(onMarkerDragEnd);
  React.useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  React.useEffect(() => { onMarkerDragEndRef.current = onMarkerDragEnd; }, [onMarkerDragEnd]);

  /* -------- Init once --------------------------------------------------- */

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    injectInfoWindowStyles();
    configureLoader();

    const initMap = async () => {
      try {
        const [mapsLib] = await Promise.all([
          importLibrary('maps') as Promise<google.maps.MapsLibrary>,
          importLibrary('marker'),
        ]);
        if (cancelled || !containerRef.current) return;

        const isDark = document.documentElement.classList.contains('dark');
        const map = new mapsLib.Map(containerRef.current, {
          center: { lat: centerFallback[0], lng: centerFallback[1] },
          zoom: 11,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: isDark ? darkMapStyle : lightMapStyle,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
          gestureHandling: 'cooperative',
          keyboardShortcuts: false,
        });

        mapRef.current = map;
        infoWindowRef.current = new mapsLib.InfoWindow({ disableAutoPan: false });

        const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          onMapClickRef.current?.(e.latLng.lat(), e.latLng.lng());
        });
        mapListenersRef.current.push(clickListener);

        const observer = new MutationObserver(() => {
          if (!mapRef.current) return;
          if (mapRef.current.getMapTypeId() !== google.maps.MapTypeId.ROADMAP) return;
          const dark = document.documentElement.classList.contains('dark');
          mapRef.current.setOptions({ styles: dark ? darkMapStyle : lightMapStyle });
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });
        themeObserverRef.current = observer;

        if (!cancelled) setMapReady(true);
      } catch (err) {
        console.error('[GoogleMapView] init failed', err);
      }
    };

    void initMap();

    return () => {
      cancelled = true;
      if (flyTokenRef.current) {
        flyTokenRef.current.cancelled = true;
        if (flyTokenRef.current.rafId !== null) cancelAnimationFrame(flyTokenRef.current.rafId);
        flyTokenRef.current = null;
      }
      mapListenersRef.current.forEach((l) => l.remove());
      mapListenersRef.current = [];
      markerEntriesRef.current.forEach((entry) => {
        entry.listeners.forEach((l) => l.remove());
        entry.marker.setMap(null);
      });
      markerEntriesRef.current.clear();
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      if (themeObserverRef.current) {
        themeObserverRef.current.disconnect();
        themeObserverRef.current = null;
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- Sync polylines (always teardown + recreate; route changes are rare) -- */

  React.useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (route.length > 0 && !suppressRoute) {
      const isDark = document.documentElement.classList.contains('dark');
      const path = route.map(([lat, lng]) => ({ lat, lng }));
      const halo = new google.maps.Polyline({
        path, geodesic: true, strokeColor: '#3b82f6',
        strokeOpacity: 0.12, strokeWeight: 16, map,
      });
      const casing = new google.maps.Polyline({
        path, geodesic: true,
        strokeColor: isDark ? '#1e3a5f' : '#bfdbfe',
        strokeOpacity: 1, strokeWeight: 7, map,
      });
      const core = new google.maps.Polyline({
        path, geodesic: true, strokeColor: '#3b82f6',
        strokeOpacity: 0.95, strokeWeight: 4, map,
      });
      polylinesRef.current.push(halo, casing, core);
    }
  }, [mapReady, route, suppressRoute]);

  /* -------- Sync markers ------------------------------------------------ */
  /*                                                                            *
   * In `liveUpdates` mode we diff by id: existing markers update position     *
   * (and icon if visual changed) in place, new markers are added, missing     *
   * ones are removed. Auto-fit only fires on fingerprint change.              *
   *                                                                            *
   * In legacy (non-live) mode we keep the original teardown + recreate +      *
   * always-refit behavior so existing call sites are unaffected.              *
   * -------------------------------------------------------------------------- */

  React.useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;
    const entries = markerEntriesRef.current;

    if (!liveUpdates) {
      // Legacy path — teardown + recreate every change.
      entries.forEach((entry) => {
        entry.listeners.forEach((l) => l.remove());
        entry.marker.setMap(null);
      });
      entries.clear();
    }

    const incomingIds = new Set<string>();
    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;

    markers.forEach((info, idx) => {
      incomingIds.add(info.id);
      const position = { lat: info.lat, lng: info.lng };
      if (info.affectsBounds !== false) {
        bounds.extend(position);
        hasBounds = true;
      }

      const filterId = `mf-${info.id}-${idx}`;
      const sig = markerSignature(info);
      const existing = entries.get(info.id);

      if (existing && liveUpdates) {
        // Update in place
        const cur = existing.marker.getPosition();
        if (!cur || cur.lat() !== info.lat || cur.lng() !== info.lng) {
          existing.marker.setPosition(position);
        }
        if (existing.signature !== sig) {
          existing.marker.setIcon(buildIcon(info, filterId));
          existing.marker.setDraggable(!!info.draggable);
          existing.marker.setOptions({ zIndex: zIndexFor(info.kind) });
          existing.signature = sig;
        }
        if (existing.marker.getTitle() !== info.title) {
          existing.marker.setTitle(info.title ?? '');
        }
        existing.popupHtml = info.popupHtml;
        return;
      }

      // Create
      const marker = new google.maps.Marker({
        position,
        map,
        title: info.title,
        draggable: !!info.draggable,
        icon: buildIcon(info, filterId),
        zIndex: zIndexFor(info.kind),
        optimized: false,
      });

      const listeners: google.maps.MapsEventListener[] = [];

      const clickL = marker.addListener('click', () => {
        const html = entries.get(info.id)?.popupHtml;
        if (html && infoWindow) {
          infoWindow.setContent(html);
          infoWindow.open({ map, anchor: marker });
        }
      });
      listeners.push(clickL);

      const dblL = marker.addListener('dblclick', () => {
        if (infoWindow) infoWindow.close();
        if (flyTokenRef.current) {
          flyTokenRef.current.cancelled = true;
          if (flyTokenRef.current.rafId !== null) cancelAnimationFrame(flyTokenRef.current.rafId);
        }
        const cur = marker.getPosition();
        if (cur) flyTokenRef.current = smoothFlyTo(map, { lat: cur.lat(), lng: cur.lng() }, 17, 750);
      });
      listeners.push(dblL);

      if (info.draggable) {
        const dragL = marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          onMarkerDragEndRef.current?.(info.id, pos.lat(), pos.lng());
        });
        listeners.push(dragL);
      }

      entries.set(info.id, { marker, signature: sig, listeners, popupHtml: info.popupHtml });
    });

    // Remove gone markers (live mode only — legacy path already cleared)
    if (liveUpdates) {
      for (const [id, entry] of entries) {
        if (!incomingIds.has(id)) {
          entry.listeners.forEach((l) => l.remove());
          entry.marker.setMap(null);
          entries.delete(id);
        }
      }
    }

    // Bounds for the route (always, since route fits matter regardless)
    if (route.length > 0 && !suppressRoute) {
      route.forEach(([lat, lng]) => {
        bounds.extend({ lat, lng });
        hasBounds = true;
      });
    }

    boundsRef.current = hasBounds ? bounds : null;

    // Auto-fit policy
    const fp = boundsFingerprint(markers, suppressRoute ? [] : route);
    const fingerprintChanged = fp !== lastFingerprintRef.current;
    lastFingerprintRef.current = fp;

    const shouldAutoFit = liveUpdates ? fingerprintChanged && hasBounds : hasBounds;

    if (shouldAutoFit) {
      const boundsAffectingCount = markers.filter((m) => m.affectsBounds !== false).length;
      if (boundsAffectingCount === 1 && (route.length === 0 || suppressRoute)) {
        map.setCenter(bounds.getCenter());
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
      }
    }
  }, [mapReady, markers, route, suppressRoute, liveUpdates]);

  /* -------- Controls --------------------------------------------------- */

  const fitBounds = React.useCallback(() => {
    const map = mapRef.current;
    const bounds = boundsRef.current;
    if (!map || !bounds) return;
    map.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
  }, []);

  const toggleSatellite = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setIsSatellite((prev) => {
      const next = !prev;
      if (next) {
        map.setMapTypeId(google.maps.MapTypeId.HYBRID);
        map.setOptions({ styles: null });
      } else {
        const isDark = document.documentElement.classList.contains('dark');
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        map.setOptions({ styles: isDark ? darkMapStyle : lightMapStyle });
      }
      return next;
    });
  }, []);

  return (
    <div className={cn('relative', className)} style={{ height }}>
      <div ref={containerRef} className="h-full w-full rounded-lg" />

      {mapReady && (
        <div className="absolute end-3 top-3 z-10 flex flex-col gap-1.5">
          <Button
            size="icon"
            variant={isSatellite ? 'default' : 'secondary'}
            className="h-8 w-8 rounded-md shadow-md backdrop-blur-sm"
            onClick={toggleSatellite}
            title={isSatellite ? 'Road map' : 'Satellite'}
          >
            <Mountain className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-md shadow-md backdrop-blur-sm"
            onClick={fitBounds}
            title="Fit to content"
          >
            <Locate className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
