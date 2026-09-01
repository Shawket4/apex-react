import * as Sentry from '@sentry/react';
import * as React from 'react';
import { Locate, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { importLibrary } from '@googlemaps/js-api-loader';
import { configureLoader } from './google-maps-config';
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
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
      border: 1px solid hsl(var(--border)) !important;
      overflow: hidden !important;
    }
    .dark .gm-style-iw-c {
      background-color: hsl(var(--card, 222 47% 11%)) !important;
      border-color: hsl(var(--border)) !important;
    }
    .dark .gm-style-iw-tc::after { background: hsl(var(--card, 222 47% 11%)) !important; }
    .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; }
    .gm-ui-hover-effect { top: 6px !important; inset-inline-end: 6px !important; opacity: 0.7 !important; }
    .gm-ui-hover-effect:hover { opacity: 1 !important; }
    .dark .gm-ui-hover-effect > span { background-color: hsl(var(--muted-foreground)) !important; }
  `;
  document.head.appendChild(style);
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
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    map.setCenter(target);
    map.setZoom(targetZoom);
    return token;
  }
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
  circles = [],
  route = [],
  polylines = [],
  gpuTrail = [],
  centerFallback = [30.0444, 31.2357],
  onMapClick,
  onMarkerClick,
  onMarkerDoubleClick,
  onMarkerDragEnd,
  onSnapTimestamp,
  bottomOffset = 0,
  suppressRoute,
  className,
}: MapViewProps) {
  const { t } = useTranslation();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const infoWindowRef = React.useRef<google.maps.InfoWindow | null>(null);

  const markerEntriesRef = React.useRef<Map<string, MarkerEntry>>(new Map());
  const circleEntriesRef = React.useRef<Map<string, google.maps.Circle>>(new Map());
  const polylinesRef = React.useRef<google.maps.Polyline[]>([]);
  const mapListenersRef = React.useRef<google.maps.MapsEventListener[]>([]);
  const themeObserverRef = React.useRef<MutationObserver | null>(null);
  const flyTokenRef = React.useRef<FlyToken | null>(null);
  const lastSentinelIdRef = React.useRef<string | null>(null);
  const lastRouteSignatureRef = React.useRef<string>('');
  const [mapReady, setMapReady] = React.useState(false);

  const [isSatellite, setIsSatellite] = React.useState(false);

  const onMapClickRef = React.useRef(onMapClick);
  const onMarkerClickRef = React.useRef(onMarkerClick);
  const onMarkerDoubleClickRef = React.useRef(onMarkerDoubleClick);
  const onMarkerDragEndRef = React.useRef(onMarkerDragEnd);
  const onSnapTimestampRef = React.useRef(onSnapTimestamp);
  React.useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  React.useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);
  React.useEffect(() => { onMarkerDoubleClickRef.current = onMarkerDoubleClick; }, [onMarkerDoubleClick]);
  React.useEffect(() => { onMarkerDragEndRef.current = onMarkerDragEnd; }, [onMarkerDragEnd]);
  React.useEffect(() => { onSnapTimestampRef.current = onSnapTimestamp; }, [onSnapTimestamp]);

  /* -------- Init via MapPool ------------------------------------------ */

  React.useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let claimedMap: google.maps.Map | null = null;
    injectInfoWindowStyles();
    configureLoader();

    const init = async () => {
      try {
        // Guarantee google.maps is loaded before constructing the map options object,
        // which evaluates namespaces like MapTypeId and ControlPosition synchronously.
        await Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
        ]);

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

        // Snap-to-time event delegation
        const container = containerRef.current;
        if (container) {
          const handleSnapClick = (e: MouseEvent) => {
            const btn = (e.target as HTMLElement).closest('.snap-timestamp-btn');
            if (btn instanceof HTMLElement) {
              const ts = Number(btn.dataset.timestamp);
              if (Number.isFinite(ts)) {
                onSnapTimestampRef.current?.(ts);
              }
            }
          };
          container.addEventListener('click', handleSnapClick);
          // Store for cleanup if needed, though the container itself goes away.
        }
      } catch (err) {
        // The map simply does not appear. Nothing else notices.
        Sentry.captureException(err, { tags: { source: 'google-map-init' } });
        console.error('[GoogleMapView] Failed to init map', err);
      }
    };

    init();

    // Captured at setup — see the same pattern in tracking-map.
    const markerEntries = markerEntriesRef.current;
    const circleEntries = circleEntriesRef.current;
    return () => {
      cancelled = true;
      setMapReady(false);
      lastRouteSignatureRef.current = '';
      lastSentinelIdRef.current = null;

      for (const entry of markerEntries.values()) {
        entry.listeners.forEach((l) => google.maps.event.removeListener(l));
        entry.marker.setMap(null);
      }
      markerEntries.clear();

      for (const circle of circleEntries.values()) {
        circle.setMap(null);
      }
      circleEntries.clear();

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

  /* -------- GPU trails (deck.gl WebGL overlay) -------------------------- */
  /* Wide history ranges render their trails on a deck.gl PathLayer instead
     of DOM/SVG polylines — flat cost at hundreds of thousands of vertices.
     The modules load lazily on first use, so pages that never pass gpuTrail
     never download deck.gl. */

  const gpuOverlayRef = React.useRef<{
    overlay: import('@deck.gl/google-maps').GoogleMapsOverlay;
    PathLayer: typeof import('@deck.gl/layers').PathLayer;
  } | null>(null);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    if (gpuTrail.length === 0) {
      gpuOverlayRef.current?.overlay.setProps({ layers: [] });
      return;
    }

    let cancelled = false;
    const render = async () => {
      if (!gpuOverlayRef.current) {
        const [{ GoogleMapsOverlay }, { PathLayer }] = await Promise.all([
          import('@deck.gl/google-maps'),
          import('@deck.gl/layers'),
        ]);
        if (cancelled) return;
        const overlay = new GoogleMapsOverlay({});
        overlay.setMap(map);
        gpuOverlayRef.current = { overlay, PathLayer };
      }
      const { overlay, PathLayer } = gpuOverlayRef.current;
      const hex = (c: string): [number, number, number] => {
        const v = c.replace('#', '');
        return [
          parseInt(v.slice(0, 2), 16),
          parseInt(v.slice(2, 4), 16),
          parseInt(v.slice(4, 6), 16),
        ];
      };
      overlay.setProps({
        layers: [
          new PathLayer({
            id: 'gpu-trails',
            data: gpuTrail.filter((p) => p.path.length > 1),
            getPath: (d: (typeof gpuTrail)[number]) =>
              d.path.map(([lat, lng]) => [lng, lat] as [number, number]),
            getColor: (d: (typeof gpuTrail)[number]) => {
              const [r, gg, b] = hex(d.color ?? '#3b82f6');
              return [r, gg, b, Math.round((d.opacity ?? 0.85) * 255)];
            },
            getWidth: (d: (typeof gpuTrail)[number]) => d.weight ?? 4,
            widthUnits: 'pixels',
            widthMinPixels: 2,
            capRounded: true,
            jointRounded: true,
          }),
        ],
      });
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [mapReady, gpuTrail]);

  React.useEffect(
    () => () => {
      gpuOverlayRef.current?.overlay.finalize();
      gpuOverlayRef.current = null;
    },
    [],
  );

  /* -------- Sync markers + polylines ----------------------------------- */

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
          onMarkerClickRef.current?.(m.id);
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
            onMarkerDoubleClickRef.current?.(m.id);
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

    // 3. Sync circles.
    const currentCircleIds = new Set(circles.map((c) => c.id));
    for (const [id, circle] of circleEntriesRef.current.entries()) {
      if (!currentCircleIds.has(id)) {
        circle.setMap(null);
        circleEntriesRef.current.delete(id);
      }
    }
    for (const c of circles) {
      let circle = circleEntriesRef.current.get(c.id);
      if (!circle) {
        circle = new google.maps.Circle({
          map,
          center: { lat: c.lat, lng: c.lng },
          radius: c.radius_m,
          fillColor: c.color || '#3b82f6',
          fillOpacity: c.fillOpacity ?? 0.2,
          strokeColor: c.color || '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 2,
        });
        circleEntriesRef.current.set(c.id, circle);
      } else {
        circle.setCenter({ lat: c.lat, lng: c.lng });
        circle.setRadius(c.radius_m);
        circle.setOptions({
          fillColor: c.color || '#3b82f6',
          fillOpacity: c.fillOpacity ?? 0.2,
          strokeColor: c.color || '#3b82f6',
        });
      }
    }

    // 4. Sync route polyline.
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    if (route.length > 1 && !suppressRoute) {
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

    // 5. Sync extra styled polylines. Dashed lines use the standard
    // Google Maps trick: transparent stroke + repeated line symbol.
    for (const p of polylines) {
      if (p.path.length < 2) continue;
      const path = p.path.map(([lat, lng]) => ({ lat, lng }));
      polylinesRef.current.push(
        new google.maps.Polyline({
          path,
          map,
          strokeColor: p.color ?? '#3b82f6',
          strokeOpacity: p.dashed ? 0 : (p.opacity ?? 0.85),
          strokeWeight: p.weight ?? 4,
          ...(p.dashed && {
            icons: [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: p.opacity ?? 0.85,
                  scale: (p.weight ?? 4) / 1.6,
                },
                offset: '0',
                repeat: '14px',
              },
            ],
          }),
        }),
      );
    }
  }, [mapReady, markers, circles, route, polylines, suppressRoute]);

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

    const boundsMarkers = markers.filter((m) => m.affectsBounds !== false);
    const mIds = boundsMarkers
      .map((m) => m.id)
      .sort()
      .join(',');
    const cIds = circles.map(c => c.id).sort().join(',');
    const rLen = route.length;
    const rStart = rLen > 0 ? route[0].join(',') : '';
    const rEnd = rLen > 0 ? route[rLen - 1].join(',') : '';
    const mCoords = boundsMarkers.map(m => `${m.lat.toFixed(6)},${m.lng.toFixed(6)}`).join('|');
    const cCoords = circles.map(c => `${c.lat.toFixed(6)},${c.lng.toFixed(6)},${c.radius_m}`).join('|');
    const pIds = polylines.map((p) => `${p.id}:${p.path.length}`).join(',');
    const signature = `${mIds}|${mCoords}|${cIds}|${cCoords}|${rLen}|${rStart}|${rEnd}|${pIds}|${suppressRoute ? 1 : 0}`;

    if (signature === lastRouteSignatureRef.current) return;
    lastRouteSignatureRef.current = signature;

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    if (rLen > 0 && !suppressRoute) {
      route.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
      hasPoints = true;
    } else {
      boundsMarkers.forEach((m) => {
        bounds.extend({ lat: m.lat, lng: m.lng });
        hasPoints = true;
      });
    }

    polylines.forEach((p) => {
      p.path.forEach(([lat, lng]) => {
        bounds.extend({ lat, lng });
        hasPoints = true;
      });
    });

    circles.forEach((c) => {
      // Rough approximation for extending bounds to circle edges
      const latOffset = c.radius_m / 111320;
      const lngOffset = c.radius_m / (40075000 * Math.cos((c.lat * Math.PI) / 180) / 360);
      bounds.extend({ lat: c.lat + latOffset, lng: c.lng + lngOffset });
      bounds.extend({ lat: c.lat - latOffset, lng: c.lng - lngOffset });
      hasPoints = true;
    });

    if (!hasPoints) return;

    if (rLen === 0 && boundsMarkers.length === 1 && circles.length === 0 && polylines.length === 0) {
      const m = boundsMarkers[0];
      map.setZoom(18);
      map.panTo({ lat: m.lat, lng: m.lng });
    } else {
      map.fitBounds(bounds, { top: 80, bottom: 80, left: 60, right: 60 });
    }
  }, [mapReady, markers, circles, route, polylines, suppressRoute]);

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
    circles.forEach((c) => {
      const latOffset = c.radius_m / 111320;
      const lngOffset = c.radius_m / (40075000 * Math.cos((c.lat * Math.PI) / 180) / 360);
      bounds.extend({ lat: c.lat + latOffset, lng: c.lng + lngOffset });
      bounds.extend({ lat: c.lat - latOffset, lng: c.lng - lngOffset });
    });
    if (!bounds.isEmpty()) {
      if (markers.filter(m => m.affectsBounds).length === 1 && circles.length === 0) {
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

      <div 
        className="absolute end-3 z-10 flex flex-col gap-2"
        style={{ bottom: 128 + bottomOffset }}
      >
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md backdrop-blur-md"
          onClick={centerOnMarkers}
          title={t('maps.centerOnMarkers', { defaultValue: 'Center map on markers' })}
          aria-label={t('maps.centerOnMarkers', { defaultValue: 'Center map on markers' })}
        >
          <Locate />
        </Button>
        <Button
          variant={isSatellite ? 'default' : 'outline'}
          size="icon"
          className={cn(
            'h-8 w-8 rounded-md backdrop-blur-md',
            !isSatellite && '',
          )}
          onClick={toggleSatellite}
          aria-pressed={isSatellite}
          title={t('maps.toggleSatellite', { defaultValue: 'Toggle satellite view' })}
          aria-label={t('maps.toggleSatellite', { defaultValue: 'Toggle satellite view' })}
        >
          <Layers />
        </Button>
      </div>
    </div>
  );
}