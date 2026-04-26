import * as React from 'react';
import { Locate, Mountain } from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { DEFAULT_MAP_CENTER } from '@/shared/lib/coords';
import { buildMarkerSvg, MARKER_SIZE } from './marker-svg';
import type { MapViewProps } from './types';

/* -------------------------------------------------------------------------- */
/* Map styles — applied via the inline `styles` array on Map options          */
/*                                                                             */
/* We deliberately do NOT use a cloud-based mapId. mapId-based maps ignore    */
/* inline `styles`, forcing all theming to live in Google Cloud Console;     */
/* keeping styles in code means dark/light just works and is version-        */
/* controlled. The trade-off is we use classic Marker (not                  */
/* AdvancedMarkerElement) — fine for our use case, classic markers are not   */
/* actually being removed despite some doc rephrasings.                      */
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
/* Info-window styles — injected once, idempotent across mounts               */
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
    .gm-ui-hover-effect {
      top: 6px !important;
      right: 6px !important;
      opacity: 0.5 !important;
    }
    .gm-ui-hover-effect:hover { opacity: 1 !important; }
    .dark .gm-ui-hover-effect > span { background-color: #94a3b8 !important; }
  `;
  document.head.appendChild(style);
}

/* -------------------------------------------------------------------------- */
/* Loader — single setOptions call, key gated on env                          */
/* -------------------------------------------------------------------------- */

let loaderConfigured = false;
function configureLoader() {
  if (loaderConfigured) return;
  const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
  setOptions({ key, v: 'weekly' });
  loaderConfigured = true;
}

/**
 * Returns true if the Google Maps API key is configured. Called by the
 * unified `MapView` shell to decide whether to even attempt loading
 * Google before falling through to Leaflet.
 */
export function isGoogleMapsConfigured(): boolean {
  return !!(import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined);
}

/* -------------------------------------------------------------------------- */
/* Smooth fly-to animation                                                    */
/*                                                                             */
/* Google Maps lacks a built-in `flyTo`. We synthesise one with rAF + cubic   */
/* easing, updating center+zoom together via `moveCamera` (vector maps) or   */
/* falling back to setCenter+setZoom on raster maps. Cancellable via the     */
/* returned token so a second dblclick mid-fly aborts the first.             */
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

  // moveCamera is undocumented but real on vector maps; on raster maps it's
  // missing, so fall back to setCenter + setZoom each frame
  const hasMoveCamera = typeof (map as unknown as { moveCamera?: unknown }).moveCamera === 'function';

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

    if (t < 1) {
      token.rafId = requestAnimationFrame(frame);
    }
  };

  token.rafId = requestAnimationFrame(frame);
  return token;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function GoogleMapView({
  markers = [],
  route = [],
  suppressRoute = false,
  centerFallback = DEFAULT_MAP_CENTER,
  height = 400,
  className,
  onMapClick,
  onMarkerDragEnd,
}: MapViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const infoWindowRef = React.useRef<google.maps.InfoWindow | null>(null);
  const entitiesRef = React.useRef<{
    markers: google.maps.Marker[];
    polylines: google.maps.Polyline[];
    listeners: google.maps.MapsEventListener[];
  }>({ markers: [], polylines: [], listeners: [] });
  const themeObserverRef = React.useRef<MutationObserver | null>(null);
  const flyTokenRef = React.useRef<FlyToken | null>(null);
  const boundsRef = React.useRef<google.maps.LatLngBounds | null>(null);

  const [mapReady, setMapReady] = React.useState(false);
  const [isSatellite, setIsSatellite] = React.useState(false);

  const onMapClickRef = React.useRef(onMapClick);
  const onMarkerDragEndRef = React.useRef(onMarkerDragEnd);
  React.useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  React.useEffect(() => { onMarkerDragEndRef.current = onMarkerDragEnd; }, [onMarkerDragEnd]);

  /* -------- Initialise map once ----------------------------------------- */

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
          // No mapId — we want inline `styles` to apply, which requires
          // classic Marker (which we use). mapId + AdvancedMarkerElement
          // would force all styling into Cloud Console.
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

        // Map click → forward to consumer (used by location-picker dialogs)
        const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          onMapClickRef.current?.(e.latLng.lat(), e.latLng.lng());
        });
        entitiesRef.current.listeners.push(clickListener);

        // Theme observer — swaps styles when the user toggles dark mode at
        // runtime. Skipped while satellite is active (satellite ignores
        // styles anyway and our style array would clobber labels).
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
        // Surface to console — the parent MapView shell handles fallback to
        // Leaflet via its own load-timeout mechanism, so we don't double-
        // toast here.
        console.error('[GoogleMapView] init failed', err);
      }
    };

    void initMap();

    return () => {
      cancelled = true;
      // Tear down listeners, observer, and the map itself — failing to do
      // this leaks the MutationObserver across every dialog open/close.
      if (flyTokenRef.current) {
        flyTokenRef.current.cancelled = true;
        if (flyTokenRef.current.rafId !== null) {
          cancelAnimationFrame(flyTokenRef.current.rafId);
        }
        flyTokenRef.current = null;
      }
      entitiesRef.current.listeners.forEach((l) => l.remove());
      entitiesRef.current.markers.forEach((m) => m.setMap(null));
      entitiesRef.current.polylines.forEach((p) => p.setMap(null));
      entitiesRef.current = { markers: [], polylines: [], listeners: [] };
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

  /* -------- Sync entities (markers + route) ----------------------------- */

  React.useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;

    // Clear previous entities
    entitiesRef.current.markers.forEach((m) => m.setMap(null));
    entitiesRef.current.polylines.forEach((p) => p.setMap(null));
    entitiesRef.current.markers = [];
    entitiesRef.current.polylines = [];

    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;
    const isDark = document.documentElement.classList.contains('dark');

    // Route — drawn first so markers sit above
    if (route.length > 0 && !suppressRoute) {
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
      entitiesRef.current.polylines.push(halo, casing, core);
      path.forEach((pt) => { bounds.extend(pt); hasBounds = true; });
    }

    // Markers
    markers.forEach((info, idx) => {
      const position = { lat: info.lat, lng: info.lng };
      const filterId = `mf-${info.id}-${idx}`;

      const marker = new google.maps.Marker({
        position,
        map,
        title: info.title,
        draggable: !!info.draggable,
        icon: {
          url: buildMarkerSvg(info.color, filterId),
          scaledSize: new google.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height),
          anchor: new google.maps.Point(MARKER_SIZE.anchorX, MARKER_SIZE.anchorY),
        },
        optimized: false,
      });

      entitiesRef.current.markers.push(marker);
      bounds.extend(position);
      hasBounds = true;

      if (info.popupHtml && infoWindow) {
        const l = marker.addListener('click', () => {
          infoWindow.setContent(info.popupHtml!);
          infoWindow.open({ map, anchor: marker });
        });
        entitiesRef.current.listeners.push(l);
      }

      // Smooth flyTo on dblclick — cancels any prior fly so rapid double-
      // dblclicks don't end up in undefined-zoom territory
      const dblL = marker.addListener('dblclick', () => {
        if (infoWindow) infoWindow.close();
        if (flyTokenRef.current) {
          flyTokenRef.current.cancelled = true;
          if (flyTokenRef.current.rafId !== null) {
            cancelAnimationFrame(flyTokenRef.current.rafId);
          }
        }
        flyTokenRef.current = smoothFlyTo(map, position, 17, 750);
      });
      entitiesRef.current.listeners.push(dblL);

      // Drag → forward to consumer
      if (info.draggable) {
        const dragL = marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          onMarkerDragEndRef.current?.(info.id, pos.lat(), pos.lng());
        });
        entitiesRef.current.listeners.push(dragL);
      }
    });

    boundsRef.current = hasBounds ? bounds : null;

    if (hasBounds) {
      if (markers.length === 1 && (route.length === 0 || suppressRoute)) {
        map.setCenter(bounds.getCenter());
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
      }
    }
  }, [mapReady, markers, route, suppressRoute]);

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
        // HYBRID gives satellite + labels. Custom styles must be cleared
        // since hybrid ignores them and they'd otherwise interfere with
        // label rendering.
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
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
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
