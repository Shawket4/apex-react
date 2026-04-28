import * as React from 'react';
import { Locate, Layers } from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { buildMarkerSvg, markerSize } from './marker-svg';
import { getSharedMap, releaseSharedMap } from './map-pool';
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
/* Info-window styles (idempotent)                                             */
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
      background-color: hsl(var(--card, 222 47% 11%)) !important;
      border-color: rgba(255,255,255,0.07) !important;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5) !important;
    }
    .dark .gm-style-iw-tc::after { background: hsl(var(--card, 222 47% 11%)) !important; }
    .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; }
    .gm-ui-hover-effect { top: 6px !important; inset-inline-end: 6px !important; opacity: 0.5 !important; }
    .gm-ui-hover-effect:hover { opacity: 1 !important; }
    .dark .gm-ui-hover-effect > span { background-color: #94a3b8 !important; }
  `;
  document.head.appendChild(style);
}

/* -------------------------------------------------------------------------- */
/* Loader configuration                                                        */
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
/* EAGER PRELOAD — fixes the Leaflet-fallback-on-slow-network bug             */
/*                                                                             */
/* MapView.tsx does a top-level import from this module to get               */
/* `isGoogleMapsConfigured`, which means this module evaluates the moment   */
/* MapView mounts — well before `GoogleMapView` is lazy-loaded. Kicking     */
/* off the SDK load here means by the time `getSharedMap()` awaits          */
/* `importLibrary`, the libraries are usually cached.                       */
/*                                                                             */
/* Without this, on slower connections the SDK download takes longer than   */
/* MapView's 3s `fallbackTimeoutMs`. MapView sees no `.gm-style` element,   */
/* assumes Google failed, and switches to Leaflet permanently — even       */
/* though the API key is valid and Google would have succeeded a moment    */
/* later. The eager preload moves the network race to a window before     */
/* the timer is even armed.                                                 */
/* -------------------------------------------------------------------------- */

if (typeof window !== 'undefined' && isGoogleMapsConfigured()) {
  configureLoader();
  void Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
  ]).catch(() => {
    /* errors are surfaced inside init() when the component actually mounts */
  });
}

/* -------------------------------------------------------------------------- */
/* Smooth fly-to (manual focus, preserves caller's chosen zoom)                */
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
/* Marker helpers                                                              */
/* -------------------------------------------------------------------------- */

function buildMarkerContent(m: MapMarker): string {
  const rotation = m.kind === 'vehicle' ? m.heading ?? 0 : 0;
  return buildMarkerSvg(m.color, `m-${m.id}`, m.kind || 'pin', rotation);
}

function iconKey(m: MapMarker): string {
  return `${m.kind ?? 'pin'}|${m.color}|${m.kind === 'vehicle' ? m.heading ?? 0 : 0}`;
}

interface MarkerEntry {
  id: string;
  marker: google.maps.Marker;
  listeners: google.maps.MapsEventListener[];
  lastIconKey: string;
  spec: MapMarker;
}

/** Marker IDs that trigger zoom-preserving auto-pan when their position changes. */
const PAN_FOLLOW_IDS = new Set(['playback-current']);

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function GoogleMapView({
  markers = [],
  route = [],
  centerFallback = [30.0444, 31.2357],
  onMapClick,
  onMarkerDragEnd,
  className,
}: MapViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const infoWindowRef = React.useRef<google.maps.InfoWindow | null>(null);

  const markerEntriesRef = React.useRef<Map<string, MarkerEntry>>(new Map());
  const polylinesRef = React.useRef<google.maps.Polyline[]>([]);
  const mapListenersRef = React.useRef<google.maps.MapsEventListener[]>([]);
  const themeObserverRef = React.useRef<MutationObserver | null>(null);
  const flyTokenRef = React.useRef<FlyToken | null>(null);
  const lastSentinelIdRef = React.useRef<string | null>(null);
  const lastRouteSignatureRef = React.useRef<string>('');
  const [mapReady, setMapReady] = React.useState(false);

  const [isSatellite, setIsSatellite] = React.useState(false);

  const onMapClickRef = React.useRef(onMapClick);
  const onMarkerDragEndRef = React.useRef(onMarkerDragEnd);
  React.useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  React.useEffect(() => { onMarkerDragEndRef.current = onMarkerDragEnd; }, [onMarkerDragEnd]);

  /* -------- Init via MapPool ------------------------------------------ */

  React.useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let claimedMap: google.maps.Map | null = null;
    injectInfoWindowStyles();
    configureLoader();

    const init = async () => {
      try {
        const isDark = document.documentElement.classList.contains('dark');
        const handle = await getSharedMap(containerRef.current!, {
          center: { lat: centerFallback[0], lng: centerFallback[1] },
          zoom: 11,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: isDark ? darkMapStyle : lightMapStyle,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
          gestureHandling: 'greedy',
          keyboardShortcuts: false,
        });
        if (cancelled) {
          releaseSharedMap(handle.map);
          return;
        }
        claimedMap = handle.map;
        mapRef.current = handle.map;
        infoWindowRef.current = handle.infoWindow;

        const clickListener = handle.map.addListener(
          'click',
          (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            onMapClickRef.current?.(e.latLng.lat(), e.latLng.lng());
          },
        );
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

        setMapReady(true);
      } catch (err) {
        console.error('[GoogleMapView] Failed to init map', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      setMapReady(false);
      lastRouteSignatureRef.current = '';
      lastSentinelIdRef.current = null;

      for (const entry of markerEntriesRef.current.values()) {
        entry.listeners.forEach((l) => google.maps.event.removeListener(l));
        entry.marker.setMap(null);
      }
      markerEntriesRef.current.clear();

      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];

      mapListenersRef.current.forEach((l) => google.maps.event.removeListener(l));
      mapListenersRef.current = [];

      if (themeObserverRef.current) {
        themeObserverRef.current.disconnect();
        themeObserverRef.current = null;
      }

      if (flyTokenRef.current) {
        flyTokenRef.current.cancelled = true;
        if (flyTokenRef.current.rafId) cancelAnimationFrame(flyTokenRef.current.rafId);
      }

      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }

      if (claimedMap) releaseSharedMap(claimedMap);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- Sync markers + polylines ----------------------------------- */
  /*                                                                       */
  /* This is also where AUTO-PAN happens. When a marker whose id is in     */
  /* PAN_FOLLOW_IDS (currently only `playback-current`) updates its       */
  /* position, we call `map.panTo(...)`. `panTo` preserves the current    */
  /* zoom and animates smoothly via the Maps API's internal compositor —  */
  /* exactly the "follow without zooming" behavior asked for during      */
  /* timeline scrubbing.                                                 */
  /* -------------------------------------------------------------------- */

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const currentIds = new Set(markers.map((m) => m.id));

    // 1. Remove deleted.
    for (const [id, entry] of markerEntriesRef.current.entries()) {
      if (!currentIds.has(id)) {
        entry.listeners.forEach((l) => google.maps.event.removeListener(l));
        entry.marker.setMap(null);
        markerEntriesRef.current.delete(id);
      }
    }

    // 2. Add or update.
    for (const m of markers) {
      const sz = markerSize(m.kind || 'pin');
      const anchor = new google.maps.Point(sz.anchorX, sz.anchorY);
      const newIconKey = iconKey(m);
      let entry = markerEntriesRef.current.get(m.id);

      if (!entry) {
        const marker = new google.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map,
          title: m.title,
          draggable: !!m.draggable,
          icon: { url: buildMarkerContent(m), anchor },
        });

        const listeners: google.maps.MapsEventListener[] = [];

        const clickListener = marker.addListener('click', () => {
          const live = markerEntriesRef.current.get(m.id);
          if (!live || !live.spec.popupHtml || !infoWindowRef.current) return;
          infoWindowRef.current.setContent(live.spec.popupHtml);
          infoWindowRef.current.open(map, live.marker);
        });
        listeners.push(clickListener);

        if (m.draggable) {
          listeners.push(
            marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
              if (e.latLng) onMarkerDragEndRef.current?.(m.id, e.latLng.lat(), e.latLng.lng());
            }),
          );
        }

        listeners.push(
          marker.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
            e.stop(); // Prevent map zoom
            if (flyTokenRef.current) {
              flyTokenRef.current.cancelled = true;
              if (flyTokenRef.current.rafId) cancelAnimationFrame(flyTokenRef.current.rafId);
            }
            const pos = marker.getPosition();
            if (pos) {
              flyTokenRef.current = smoothFlyTo(map, { lat: pos.lat(), lng: pos.lng() }, 18);
            }
          }),
        );

        entry = { id: m.id, marker, listeners, lastIconKey: newIconKey, spec: m };
        markerEntriesRef.current.set(m.id, entry);

        // First-render auto-pan: when playback-current first appears,
        // pan to it so the user starts following from frame zero.
        if (PAN_FOLLOW_IDS.has(m.id)) {
          map.panTo({ lat: m.lat, lng: m.lng });
        }
      } else {
        const cur = entry.marker.getPosition();
        const moved = !cur || cur.lat() !== m.lat || cur.lng() !== m.lng;
        if (moved) {
          entry.marker.setPosition({ lat: m.lat, lng: m.lng });
          if (PAN_FOLLOW_IDS.has(m.id)) {
            // Zoom-preserving follow. The Maps API smooth-animates
            // panTo internally when the delta is small.
            map.panTo({ lat: m.lat, lng: m.lng });
          }
        }
        if (entry.lastIconKey !== newIconKey) {
          entry.marker.setIcon({ url: buildMarkerContent(m), anchor });
          entry.lastIconKey = newIconKey;
        }
        entry.spec = m;
      }
    }

    // 3. Sync route polyline.
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    if (route.length > 1) {
      const path = route.map(([lat, lng]) => ({ lat, lng }));
      polylinesRef.current.push(
        new google.maps.Polyline({
          path,
          map,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.85,
          strokeWeight: 4,
        }),
      );
    }
  }, [mapReady, markers, route]);

  /* -------- fitBounds — fires only when the route IDENTITY changes ----- */
  /*                                                                       */
  /* Previously this was lumped into the same effect as marker sync, so   */
  /* a playback frame (which changes `markers` but not `route`) re-ran    */
  /* fitBounds and undid every panTo from the auto-follow logic. Splitting */
  /* fixes that. We use a string signature of the route so unrelated     */
  /* `route` array identity changes (which shouldn't happen with the      */
  /* useMemo upstream, but defense in depth) don't refit.                 */
  /* -------------------------------------------------------------------- */

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (route.length < 2) {
      lastRouteSignatureRef.current = '';
      return;
    }
    const signature = `${route.length}|${route[0].join(',')}|${route[route.length - 1].join(',')}`;
    if (signature === lastRouteSignatureRef.current) return;
    lastRouteSignatureRef.current = signature;

    const bounds = new google.maps.LatLngBounds();
    route.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, { top: 80, bottom: 80, left: 60, right: 60 });
  }, [mapReady, route]);

  /* -------- Sentinel-driven flyTo (manual focus button) ---------------- */
  /*                                                                       */
  /* Splits sentinel handling from the rest of the marker effect so it    */
  /* fires only when the sentinel id genuinely changes — not on every   */
  /* unrelated marker mutation.                                           */
  /* -------------------------------------------------------------------- */

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const sentinel = markers.find((m) => m.id.startsWith('focus-sentinel-'));
    const newId = sentinel?.id ?? null;
    if (newId === lastSentinelIdRef.current) return;
    lastSentinelIdRef.current = newId;

    if (!sentinel) return;

    if (flyTokenRef.current) {
      flyTokenRef.current.cancelled = true;
      if (flyTokenRef.current.rafId) cancelAnimationFrame(flyTokenRef.current.rafId);
    }
    flyTokenRef.current = smoothFlyTo(map, { lat: sentinel.lat, lng: sentinel.lng }, 18);
  }, [mapReady, markers]);

  /* -------- Render ---------------------------------------------------- */

  const toggleSatellite = () => {
    const next = !isSatellite;
    setIsSatellite(next);
    mapRef.current?.setMapTypeId(
      next ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP,
    );
  };

  const centerOnMarkers = () => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => {
      if (m.affectsBounds) bounds.extend({ lat: m.lat, lng: m.lng });
    });
    if (!bounds.isEmpty()) {
      if (markers.filter(m => m.affectsBounds).length === 1) {
        const m = markers.find(m => m.affectsBounds)!;
        map.setZoom(18);
        map.panTo({ lat: m.lat, lng: m.lng });
      } else {
        map.fitBounds(bounds, 40);
      }
    }
  };

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute bottom-32 end-3 z-10 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-full shadow-lg backdrop-blur-md bg-card/90 hover:bg-card"
          onClick={centerOnMarkers}
          title="Center on markers"
          aria-label="Center map on markers"
        >
          <Locate className="h-4 w-4" />
        </Button>
        <Button
          variant={isSatellite ? 'default' : 'secondary'}
          size="icon"
          className={cn(
            'h-9 w-9 rounded-full shadow-lg backdrop-blur-md',
            !isSatellite && 'bg-card/90 hover:bg-card',
          )}
          onClick={toggleSatellite}
          title="Toggle satellite"
          aria-label="Toggle satellite view"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}