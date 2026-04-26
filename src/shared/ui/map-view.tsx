// src/shared/ui/map-view.tsx
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Locate, Mountain } from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  title?: string;
  popupHtml?: string;
}

export interface MapViewProps {
  markers?: MapMarker[];
  route?: Array<[number, number]>;
  centerFallback?: [number, number];
  height?: string | number;
  className?: string;
  onError?: (err: unknown) => void;
}

// ─── Map Styles ────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────────

function injectInfoWindowStyles() {
  const styleId = 'gmaps-info-window-styles-v3';
  if (document.getElementById(styleId)) return;
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
    .gm-style-iw-d {
      overflow: hidden !important;
      padding: 0 !important;
    }
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

function buildMarkerSvg(color: string, filterId: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-40%" y="-20%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.28"/>
        </filter>
      </defs>
      <path
        d="M12 1C7.029 1 3 5.029 3 10C3 16.5 12 29 12 29C12 29 21 16.5 21 10C21 5.029 16.971 1 12 1Z"
        fill="${color}"
        filter="url(#${filterId})"
      />
      <circle cx="12" cy="10" r="4" fill="white" fill-opacity="0.92"/>
    </svg>
  `)}`;
}

/**
 * Custom animation function to simultaneously pan and zoom smoothly
 * Requires map option: isFractionalZoomEnabled: true
 */
function smoothFlyTo(map: google.maps.Map, target: google.maps.LatLngLiteral, targetZoom: number) {
  const startZoom = map.getZoom() ?? 11;
  const startCenter = map.getCenter();
  if (!startCenter) return;

  const startLat = startCenter.lat();
  const startLng = startCenter.lng();
  
  const startTime = performance.now();
  const duration = 800; // ms

  // easeInOutCubic for a natural feel
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = ease(progress);

    map.setZoom(startZoom + (targetZoom - startZoom) * easeProgress);
    map.setCenter({
      lat: startLat + (target.lat - startLat) * easeProgress,
      lng: startLng + (target.lng - startLng) * easeProgress,
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

let googleMapsLanguage: string | null = null;

// ─── Component ─────────────────────────────────────────────────────────────────

export function MapView({
  markers = [],
  route = [],
  centerFallback = [30.0444, 31.2357],
  height = 400,
  className,
  onError,
}: MapViewProps) {
  const { i18n } = useTranslation();
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Keep stable references to map entities so we don't recreate the map
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const infoWindowRef = React.useRef<google.maps.InfoWindow | null>(null);
  const entitiesRef = React.useRef<{
    markers: google.maps.Marker[];
    polylines: google.maps.Polyline[];
  }>({ markers: [], polylines: [] });
  
  const boundsRef = React.useRef<google.maps.LatLngBounds | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  const [isSatellite, setIsSatellite] = React.useState(false);

  // ── 1. Initialise Map Once ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    let isMounted = true;
    injectInfoWindowStyles();

    const lang = i18n.language || 'en';
    if (googleMapsLanguage !== lang) {
      setOptions({
        key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        v: 'weekly',
        language: lang,
      });
      googleMapsLanguage = lang;
    }

    const initMap = async () => {
      try {
        const [mapsLib] = await Promise.all([
          importLibrary('maps') as Promise<google.maps.MapsLibrary>,
          importLibrary('marker'),
        ]);

        if (!isMounted || !containerRef.current) return;

        const isDark = document.documentElement.classList.contains('dark');

        const map = new mapsLib.Map(containerRef.current, {
          center: { lat: centerFallback[0], lng: centerFallback[1] },
          zoom: 11,
          mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: isDark ? darkMapStyle : lightMapStyle,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
          gestureHandling: 'cooperative',
          keyboardShortcuts: false,
          isFractionalZoomEnabled: true, // Required for smooth animations
        });

        mapRef.current = map;
        infoWindowRef.current = new mapsLib.InfoWindow({ disableAutoPan: false });

        // Theme observer
        const observer = new MutationObserver(() => {
          if (map.getMapTypeId() === google.maps.MapTypeId.SATELLITE) return;
          const dark = document.documentElement.classList.contains('dark');
          map.setOptions({ styles: dark ? darkMapStyle : lightMapStyle });
        });
        
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });

        if (isMounted) setMapReady(true);
      } catch (err) {
        console.error('MapView: failed to initialize Google Maps', err);
        onError?.(err);
      }
    };

    void initMap();

    return () => {
      isMounted = false;
      // Note: We don't nullify mapRef on simple unmount to avoid 
      // tearing down if React StrictMode runs double-invocation
    };
  }, [centerFallback, i18n.language, onError]);

  // ── 2. Update Entities (Markers & Routes) ──────────────────────────────────
  React.useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;

    // Clear old entities
    entitiesRef.current.markers.forEach((m) => m.setMap(null));
    entitiesRef.current.polylines.forEach((p) => p.setMap(null));
    entitiesRef.current = { markers: [], polylines: [] };

    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;
    const isDark = document.documentElement.classList.contains('dark');

    // Draw route
    if (route.length > 0) {
      const path = route.map(([lat, lng]) => ({ lat, lng }));

      const halo = new google.maps.Polyline({ path, geodesic: true, strokeColor: '#3b82f6', strokeOpacity: 0.12, strokeWeight: 16, map });
      const casing = new google.maps.Polyline({ path, geodesic: true, strokeColor: isDark ? '#1e3a5f' : '#bfdbfe', strokeOpacity: 1, strokeWeight: 7, map });
      const core = new google.maps.Polyline({ path, geodesic: true, strokeColor: '#3b82f6', strokeOpacity: 0.95, strokeWeight: 4, map });

      entitiesRef.current.polylines.push(halo, casing, core);
      path.forEach((pt) => { bounds.extend(pt); hasBounds = true; });
    }

    // Draw markers
    markers.forEach((info, idx) => {
      const position = { lat: info.lat, lng: info.lng };
      const filterId = `mf${idx}`;

      const marker = new google.maps.Marker({
        position,
        map,
        title: info.title,
        icon: {
          url: buildMarkerSvg(info.color, filterId),
          scaledSize: new google.maps.Size(24, 30),
          anchor: new google.maps.Point(12, 30),
        },
        optimized: false,
      });

      entitiesRef.current.markers.push(marker);
      bounds.extend(position);
      hasBounds = true;

      if (info.popupHtml && infoWindow) {
        marker.addListener('click', () => {
          infoWindow.setContent(info.popupHtml!);
          infoWindow.open({ map, anchor: marker });
        });
      }

      // Smooth custom fly-in
      marker.addListener('dblclick', () => {
        if (infoWindow) infoWindow.close();
        smoothFlyTo(map, position, 18);
      });
    });

    boundsRef.current = hasBounds ? bounds : null;

    if (hasBounds) {
      if (markers.length === 1 && route.length === 0) {
        map.setCenter(bounds.getCenter());
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
      }
    }
  }, [mapReady, markers, route]);

  // ── 3. Controls ─────────────────────────────────────────────────────────────

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
        map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
      } else {
        const isDark = document.documentElement.classList.contains('dark');
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        map.setOptions({ styles: isDark ? darkMapStyle : lightMapStyle });
      }
      
      return next;
    });
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={cn('relative', className)} style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />

      {mapReady && (
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
          <Button
            size="icon"
            variant={isSatellite ? 'default' : 'secondary'}
            className="h-8 w-8 rounded-md shadow-md backdrop-blur-sm"
            onClick={toggleSatellite}
            title={isSatellite ? 'Switch to road map' : 'Switch to satellite'}
          >
            <Mountain className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-md shadow-md backdrop-blur-sm"
            onClick={fitBounds}
            title="Fit to route"
          >
            <Locate className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}