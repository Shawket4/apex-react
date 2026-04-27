import * as React from 'react';
import { Locate, Layers } from 'lucide-react';
import { setOptions } from '@googlemaps/js-api-loader';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { buildMarkerSvg, markerSize } from './marker-svg';
import type { MapMarker, MapViewProps } from './types';

/* -------------------------------------------------------------------------- */
/* Map styles                                                                 */
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

function injectInfoWindowStyles() {
  const styleId = 'gmaps-info-window-styles-v1';
  if (typeof document === 'undefined' || document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .gm-style-iw-c { padding: 0 !important; border-radius: 12px !important; box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08) !important; border: 1px solid rgba(0,0,0,0.07) !important; overflow: hidden !important; }
    .dark .gm-style-iw-c { background-color: #1e2535 !important; border-color: rgba(255,255,255,0.07) !important; box-shadow: 0 4px 24px rgba(0,0,0,0.5) !important; }
    .dark .gm-style-iw-tc::after { background: #1e2535 !important; }
    .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; }
    .gm-ui-hover-effect { top: 6px !important; right: 6px !important; opacity: 0.5 !important; }
    .gm-ui-hover-effect:hover { opacity: 1 !important; }
    .dark .gm-ui-hover-effect > span { background-color: #94a3b8 !important; }
  `;
  document.head.appendChild(style);
}

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

interface FlyToken { cancelled: boolean; rafId: number | null }
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothFlyTo(map: google.maps.Map, target: { lat: number; lng: number }, targetZoom: number, durationMs = 800): FlyToken {
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
  const hasMoveCamera = typeof (map as unknown as { moveCamera?: unknown }).moveCamera === 'function';

  const frame = (now: number) => {
    if (token.cancelled) return;
    const t = Math.min(1, (now - startTime) / durationMs);
    const eased = easeInOutCubic(t);
    const lat = startLat + (target.lat - startLat) * eased;
    const lng = startLng + (target.lng - startLng) * eased;
    const zoom = startZoom + (targetZoom - startZoom) * eased;
    if (hasMoveCamera) {
      (map as unknown as { moveCamera: (opts: { center: { lat: number; lng: number }; zoom: number }) => void; }).moveCamera({ center: { lat, lng }, zoom });
    } else {
      map.setCenter({ lat, lng });
      map.setZoom(zoom);
    }
    if (t < 1) token.rafId = requestAnimationFrame(frame);
  };
  token.rafId = requestAnimationFrame(frame);
  return token;
}

function buildMarkerContent(m: MapMarker): string {
  const rotation = m.kind === 'vehicle' ? m.heading ?? 0 : 0;
  return buildMarkerSvg(m.color, `m-${m.id}`, m.kind || 'pin', rotation);
}

interface MarkerEntry {
  id: string;
  marker: google.maps.Marker;
  listeners: google.maps.MapsEventListener[];
  iconUrl: string; // Used to prevent setIcon thrashing
}

export function GoogleMapView({ markers = [], route = [], centerFallback = [30.0444, 31.2357], onMapClick, onMarkerDragEnd, className }: MapViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const infoWindowRef = React.useRef<google.maps.InfoWindow | null>(null);

  const markerEntriesRef = React.useRef<Map<string, MarkerEntry>>(new Map());
  const currentMarkersDataRef = React.useRef<Map<string, MapMarker>>(new Map());
  const polylinesRef = React.useRef<google.maps.Polyline[]>([]);
  const mapListenersRef = React.useRef<google.maps.MapsEventListener[]>([]);
  const flyTokenRef = React.useRef<FlyToken | null>(null);

  const [isSatellite, setIsSatellite] = React.useState(false);
  const onMapClickRef = React.useRef(onMapClick);
  const onMarkerDragEndRef = React.useRef(onMarkerDragEnd);

  React.useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  React.useEffect(() => { onMarkerDragEndRef.current = onMarkerDragEnd; }, [onMarkerDragEnd]);

  // Update latest marker data ref for closures
  React.useEffect(() => {
    const dataMap = new Map<string, MapMarker>();
    markers.forEach(m => dataMap.set(m.id, m));
    currentMarkersDataRef.current = dataMap;
  }, [markers]);

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let observer: MutationObserver | null = null;
    injectInfoWindowStyles();
    configureLoader();

    const initMap = async () => {
      try {
        const { importLibrary } = await import('@googlemaps/js-api-loader');
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
          gestureHandling: 'greedy',
          keyboardShortcuts: false,
        });

        mapRef.current = map;
        infoWindowRef.current = new mapsLib.InfoWindow({ disableAutoPan: false });

        const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          onMapClickRef.current?.(e.latLng.lat(), e.latLng.lng());
        });
        mapListenersRef.current.push(clickListener);

        observer = new MutationObserver(() => {
          if (!mapRef.current) return;
          if (mapRef.current.getMapTypeId() !== google.maps.MapTypeId.ROADMAP) return;
          const dark = document.documentElement.classList.contains('dark');
          mapRef.current.setOptions({ styles: dark ? darkMapStyle : lightMapStyle });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        syncMarkers();
      } catch (err) {
        console.error('[GoogleMapView] Failed to init map', err);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect(); // Fix Observer leak
      mapListenersRef.current.forEach((l) => google.maps.event.removeListener(l));
      mapListenersRef.current = [];
      if (flyTokenRef.current) {
        flyTokenRef.current.cancelled = true;
        if (flyTokenRef.current.rafId) cancelAnimationFrame(flyTokenRef.current.rafId);
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncMarkers = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(markers.map((m) => m.id));

    // 1. Remove deleted
    for (const [id, entry] of markerEntriesRef.current.entries()) {
      if (!currentIds.has(id)) {
        entry.marker.setMap(null);
        entry.listeners.forEach((l) => google.maps.event.removeListener(l));
        markerEntriesRef.current.delete(id);
      }
    }

    // 2. Add or update
    for (const m of markers) {
      let entry = markerEntriesRef.current.get(m.id);
      const position = { lat: m.lat, lng: m.lng };
      const newIconUrl = buildMarkerContent(m);

      if (!entry) {
        const marker = new google.maps.Marker({
          position,
          map,
          title: m.title,
          draggable: !!m.draggable,
          icon: {
            url: newIconUrl,
            anchor: new google.maps.Point(markerSize(m.kind || 'pin').anchorX, markerSize(m.kind || 'pin').anchorY),
          },
        });

        const listeners: google.maps.MapsEventListener[] = [];
        // Stale popup fix: Read dynamically from ref
        listeners.push(
          marker.addListener('click', () => {
            if (infoWindowRef.current) {
              const latestM = currentMarkersDataRef.current.get(m.id);
              if (latestM?.popupHtml) {
                infoWindowRef.current.setContent(latestM.popupHtml);
                infoWindowRef.current.open(map, marker);
              }
            }
          })
        );

        if (m.draggable) {
          listeners.push(
            marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
              if (e.latLng) onMarkerDragEndRef.current?.(m.id, e.latLng.lat(), e.latLng.lng());
            }),
          );
        }

        entry = { id: m.id, marker, listeners, iconUrl: newIconUrl };
        markerEntriesRef.current.set(m.id, entry);
      } else {
        // Update existing position
        entry.marker.setPosition(position);
        
        // Prevent Icon Thrash
        if (entry.iconUrl !== newIconUrl) {
          entry.marker.setIcon({
            url: newIconUrl,
            anchor: new google.maps.Point(markerSize(m.kind || 'pin').anchorX, markerSize(m.kind || 'pin').anchorY),
          });
          entry.iconUrl = newIconUrl;
        }
      }
    }

    // 3. Sync Route Polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    if (route.length > 1) {
      const path = route.map(([lat, lng]) => ({ lat, lng }));
      const poly = new google.maps.Polyline({ path, map, strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 4 });
      polylinesRef.current.push(poly);
    }
  }, [markers, route]);

  React.useEffect(() => { syncMarkers(); }, [syncMarkers]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sentinel = markers.find((m) => m.id.startsWith('focus-sentinel-'));
    if (sentinel) {
      if (flyTokenRef.current) {
        flyTokenRef.current.cancelled = true;
        if (flyTokenRef.current.rafId) cancelAnimationFrame(flyTokenRef.current.rafId);
      }
      flyTokenRef.current = smoothFlyTo(map, { lat: sentinel.lat, lng: sentinel.lng }, 16);
      return;
    }

    if (route.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      route.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
      map.fitBounds(bounds, { top: 100, bottom: 100, left: 100, right: 100 });
    }
  }, [markers, route]);

  const toggleSatellite = () => {
    const next = !isSatellite;
    setIsSatellite(next);
    mapRef.current?.setMapTypeId(next ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP);
  };

  const centerOnMarkers = () => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => {
      if (m.affectsBounds) bounds.extend({ lat: m.lat, lng: m.lng });
    });
    if (!bounds.isEmpty()) map.fitBounds(bounds, 40);
  };

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute bottom-32 right-3 z-10 flex flex-col gap-2">
        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full shadow-lg" onClick={centerOnMarkers} title="Center on markers">
          <Locate className="h-4 w-4" />
        </Button>
        <Button variant={isSatellite ? 'default' : 'secondary'} size="icon" className="h-9 w-9 rounded-full shadow-lg" onClick={toggleSatellite} title="Toggle Hybrid">
          <Layers className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}