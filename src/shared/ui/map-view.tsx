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
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#283044' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2030' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a90' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d4f6e' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a2030' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#a0aec0' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#222d40' }] },
  { featureType: 'transit.station', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1724' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d5166' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1a2638' }] },
];

const lightMapStyle: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#d6d6d6' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d4e4f0' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function injectInfoWindowStyles() {
  const styleId = 'gmaps-info-window-styles-v2';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .gm-style-iw.gm-style-iw-c {
      padding: 0 !important;
      border-radius: 10px !important;
      box-shadow: 0 8px 30px rgba(0,0,0,0.18) !important;
      border: 1px solid rgba(0,0,0,0.08) !important;
    }
    .dark .gm-style-iw.gm-style-iw-c {
      background-color: #1e2535 !important;
      border-color: rgba(255,255,255,0.08) !important;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5) !important;
    }
    .dark .gm-style-iw-tc::after { background: #1e2535 !important; }
    .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; }
    .gm-ui-hover-effect { top: 4px !important; right: 4px !important; }
    .dark .gm-ui-hover-effect > span { background-color: #8892a4 !important; }
    .dark .gm-style .gm-style-iw-t::after { background: #1e2535 !important; }
  `;
  document.head.appendChild(style);
}

function buildMarkerSvg(color: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-30%" y="-10%" width="160%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
      <path d="M20 2C11.163 2 4 9.163 4 18C4 30 20 46 20 46C20 46 36 30 36 18C36 9.163 28.837 2 20 2Z"
        fill="${color}" filter="url(#shadow)"/>
      <circle cx="20" cy="18" r="6.5" fill="white" fill-opacity="0.95"/>
      <circle cx="20" cy="18" r="3.5" fill="${color}"/>
    </svg>
  `)}`;
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
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const boundsRef = React.useRef<google.maps.LatLngBounds | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  const [terrain, setTerrain] = React.useState(false);
  // Ref so the MutationObserver closure always sees the current value
  const terrainRef = React.useRef(false);

  // ── Initialise once ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;
    injectInfoWindowStyles();

    const lang = i18n.language || 'en';
    if (googleMapsLanguage !== lang) {
      setOptions({
        key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        v: 'weekly',
        language: lang,
        // mapIds is required for AdvancedMarkerElement
        mapIds: [import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'],
      });
      googleMapsLanguage = lang;
    }

    const init = async () => {
      try {
        const [mapsLib] = await Promise.all([
          importLibrary('maps') as Promise<google.maps.MapsLibrary>,
          importLibrary('marker'), // pre-warm; needed for future AdvancedMarkerElement
        ]);

        if (!isMounted || !containerRef.current) return;

        const isDark = document.documentElement.classList.contains('dark');

        const map = new mapsLib.Map(containerRef.current, {
          center: { lat: centerFallback[0], lng: centerFallback[1] },
          zoom: 11,
          styles: isDark ? darkMapStyle : lightMapStyle,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,   // We provide our own controls
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
          gestureHandling: 'cooperative',
          keyboardShortcuts: false,
        });

        mapRef.current = map;

        // ── React to theme changes ───────────────────────────────────────────
        const observer = new MutationObserver(() => {
          if (terrainRef.current) return; // terrain has no custom styles
          const dark = document.documentElement.classList.contains('dark');
          map.setOptions({ styles: dark ? darkMapStyle : lightMapStyle });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        // ── Draw route ───────────────────────────────────────────────────────
        const bounds = new google.maps.LatLngBounds();
        let hasBounds = false;

        if (route.length > 0) {
          const path = route.map(([lat, lng]) => ({ lat, lng }));

          // Casing layer (glow effect)
          new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: isDark ? '#3b82f6' : '#2563eb',
            strokeOpacity: 0.15,
            strokeWeight: 14,
            map,
          });

          // Outer stroke
          new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: isDark ? '#1e3a5f' : '#bfdbfe',
            strokeOpacity: 1.0,
            strokeWeight: 7,
            map,
          });

          // Main line
          new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.95,
            strokeWeight: 4,
            map,
          });

          path.forEach((pt) => { bounds.extend(pt); hasBounds = true; });
        }

        // ── Draw markers ─────────────────────────────────────────────────────
        const infoWindow = new google.maps.InfoWindow({ disableAutoPan: false });

        for (const info of markers) {
          const position = { lat: info.lat, lng: info.lng };

          // Use legacy Marker as safe fallback for all map configs
          // (AdvancedMarkerElement requires a cloud mapId which may not be set)
          const marker = new google.maps.Marker({
            position,
            map,
            title: info.title,
            icon: {
              url: buildMarkerSvg(info.color),
              scaledSize: new google.maps.Size(40, 48),
              anchor: new google.maps.Point(20, 48),
            },
            optimized: false,
          });

          bounds.extend(position);
          hasBounds = true;

          if (info.popupHtml) {
            marker.addListener('click', () => {
              infoWindow.setContent(info.popupHtml!);
              infoWindow.open({ map, anchor: marker });
            });
          }
        }

        boundsRef.current = hasBounds ? bounds : null;

        if (hasBounds) {
          if (markers.length === 1 && route.length === 0) {
            map.setCenter(bounds.getCenter());
            map.setZoom(14);
          } else {
            map.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
          }
        }

        if (isMounted) setMapReady(true);

        return () => observer.disconnect();
      } catch (err) {
        console.error('MapView: failed to initialize Google Maps', err);
        onError?.(err);
      }
    };

    void init();

    return () => {
      isMounted = false;
      mapRef.current = null;
      boundsRef.current = null;
      setMapReady(false);
    };
    // Re-initialize when markers/route data fundamentally changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, route, centerFallback, i18n.language]);

  const fitBounds = React.useCallback(() => {
    if (mapRef.current && boundsRef.current) {
      mapRef.current.fitBounds(boundsRef.current, { top: 64, right: 64, bottom: 64, left: 64 });
    }
  }, []);

  const toggleTerrain = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const next = !terrainRef.current;
    terrainRef.current = next;
    setTerrain(next);

    if (next) {
      // TERRAIN gives the richest topographic detail Google Maps offers.
      // Styles are intentionally cleared — custom styles are ignored on
      // non-roadmap types and clearing them avoids a console warning.
      map.setOptions({ mapTypeId: google.maps.MapTypeId.TERRAIN, styles: [] });
    } else {
      const isDark = document.documentElement.classList.contains('dark');
      map.setOptions({
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: isDark ? darkMapStyle : lightMapStyle,
      });
    }
  }, []);

  return (
    <div className={cn('relative', className)} style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Overlay controls — stacked vertically, bottom-right */}
      {mapReady && (
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
          <Button
            size="icon"
            variant={terrain ? 'default' : 'secondary'}
            className="h-8 w-8 rounded-md shadow-md backdrop-blur-sm"
            onClick={toggleTerrain}
            title={terrain ? 'Switch to road map' : 'Show terrain'}
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