import * as React from 'react';
import { Locate } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { DEFAULT_MAP_CENTER } from '@/shared/lib/coords';
import { buildMarkerSvg, MARKER_SIZE } from './marker-svg';
import type { MapViewProps } from './types';

/* -------------------------------------------------------------------------- */
/* Leaflet types — imported lazily so the bundle doesn't pay the cost when    */
/* Google is being used. We use `import type` for TypeScript only.            */
/* -------------------------------------------------------------------------- */

type LeafletNamespace = typeof import('leaflet');
type LeafletMap = import('leaflet').Map;
type LeafletMarker = import('leaflet').Marker;
type LeafletPolyline = import('leaflet').Polyline;
type LeafletLayer = import('leaflet').Layer;

/* -------------------------------------------------------------------------- */
/* Style injection — the polished Leaflet look you specified                  */
/* -------------------------------------------------------------------------- */

function injectLeafletStyles() {
  const styleId = 'leaflet-custom-styles-v1';
  if (typeof document === 'undefined' || document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .custom-marker { background: transparent; border: none; }
    .custom-marker:hover {
      transform: scale(1.1);
      transition: transform 0.2s ease;
      z-index: 1000;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.05);
      font-family: inherit;
    }
    .leaflet-popup-tip { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .leaflet-control-zoom {
      border: none;
      border-radius: 8px;
      overflow: hidden;
      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .leaflet-control-zoom a {
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      color: #374151;
      font-weight: 600;
      transition: all 0.2s ease;
      width: 40px;
      height: 40px;
      line-height: 40px;
      font-size: 18px;
    }
    .leaflet-control-zoom a:last-child { border-bottom: none; }
    .leaflet-control-zoom a:hover {
      background: rgba(59, 130, 246, 0.1);
      color: #2563EB;
    }
    .leaflet-control-attribution {
      background: rgba(255,255,255,0.8);
      backdrop-filter: blur(10px);
      border-radius: 6px;
      font-size: 10px;
      padding: 2px 6px;
    }
    .leaflet-container {
      background: #f8fafc;
      font-family: inherit;
      border-radius: 12px;
    }
    .leaflet-popup-close-button {
      color: #6b7280;
      font-size: 18px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    .leaflet-popup-close-button:hover {
      background: rgba(239,68,68,0.1);
      color: #dc2626;
    }

    /* Dark-mode overrides */
    .dark .leaflet-container { background: #0f172a; }
    .dark .leaflet-control-zoom {
      background: rgba(30,37,53,0.9);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4);
    }
    .dark .leaflet-control-zoom a {
      color: #cbd5e1;
      border-bottom-color: rgba(255,255,255,0.08);
    }
    .dark .leaflet-control-zoom a:hover {
      background: rgba(59,130,246,0.15);
      color: #60a5fa;
    }
    .dark .leaflet-popup-content-wrapper,
    .dark .leaflet-popup-tip {
      background: #1e2535;
      color: #e2e8f0;
      border-color: rgba(255,255,255,0.07);
    }
    .dark .leaflet-control-attribution {
      background: rgba(30,37,53,0.85);
      color: #94a3b8;
    }
    .dark .leaflet-control-attribution a { color: #93c5fd; }

    @media (max-width: 640px) {
      .leaflet-popup-content-wrapper { font-size: 12px; border-radius: 12px; }
      .leaflet-popup-content { margin: 8px 12px; }
      .leaflet-container { font-size: 12px; }
      .leaflet-control-zoom a {
        width: 36px;
        height: 36px;
        line-height: 36px;
        font-size: 16px;
      }
    }
  `;
  document.head.appendChild(style);
}

/* -------------------------------------------------------------------------- */
/* Tile providers — Carto for light, Carto dark for dark mode. Free, no key. */
/* -------------------------------------------------------------------------- */

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function LeafletMapView({
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
  const LRef = React.useRef<LeafletNamespace | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const tileLayerRef = React.useRef<LeafletLayer | null>(null);
  const entitiesRef = React.useRef<{
    markers: LeafletMarker[];
    polylines: LeafletPolyline[];
  }>({ markers: [], polylines: [] });
  const themeObserverRef = React.useRef<MutationObserver | null>(null);
  const [mapReady, setMapReady] = React.useState(false);

  const onMapClickRef = React.useRef(onMapClick);
  const onMarkerDragEndRef = React.useRef(onMarkerDragEnd);
  React.useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  React.useEffect(() => { onMarkerDragEndRef.current = onMarkerDragEnd; }, [onMarkerDragEnd]);

  /* ---- Init map once -------------------------------------------------- */

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    injectLeafletStyles();

    const initMap = async () => {
      // Lazy-import Leaflet + its CSS — pays bundle cost only when this
      // provider actually mounts (i.e. Google failed or wasn't configured).
      const [L] = await Promise.all([
        import('leaflet').then((m) => m.default ?? m),
        import('leaflet/dist/leaflet.css').catch(() => undefined),
      ]);
      if (cancelled || !containerRef.current) return;

      LRef.current = L;
      const isDark = document.documentElement.classList.contains('dark');

      const map = L.map(containerRef.current, {
        center: centerFallback,
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      });

      const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
        attribution: TILE_ATTR,
        maxZoom: 19,
      }).addTo(map);
      tileLayerRef.current = tile;

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
      });

      // Theme observer — swap tile layer when dark-mode class flips
      const observer = new MutationObserver(() => {
        if (!mapRef.current || !LRef.current) return;
        const dark = document.documentElement.classList.contains('dark');
        if (tileLayerRef.current) {
          mapRef.current.removeLayer(tileLayerRef.current);
        }
        const next = LRef.current.tileLayer(dark ? TILE_DARK : TILE_LIGHT, {
          attribution: TILE_ATTR,
          maxZoom: 19,
        }).addTo(mapRef.current);
        tileLayerRef.current = next;
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      themeObserverRef.current = observer;

      mapRef.current = map;
      if (!cancelled) setMapReady(true);
    };

    void initMap();

    return () => {
      cancelled = true;
      if (themeObserverRef.current) {
        themeObserverRef.current.disconnect();
        themeObserverRef.current = null;
      }
      entitiesRef.current.markers.forEach((m) => m.remove());
      entitiesRef.current.polylines.forEach((p) => p.remove());
      entitiesRef.current = { markers: [], polylines: [] };
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Sync markers + route ------------------------------------------- */

  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    // Clear previous
    entitiesRef.current.markers.forEach((m) => m.remove());
    entitiesRef.current.polylines.forEach((p) => p.remove());
    entitiesRef.current.markers = [];
    entitiesRef.current.polylines = [];

    const points: Array<[number, number]> = [];
    const isDark = document.documentElement.classList.contains('dark');

    // Route — multi-line stack (halo + casing + core), matching Google
    if (route.length > 0 && !suppressRoute) {
      const halo = L.polyline(route, {
        color: '#3b82f6', opacity: 0.12, weight: 16,
      }).addTo(map);
      const casing = L.polyline(route, {
        color: isDark ? '#1e3a5f' : '#bfdbfe', opacity: 1, weight: 7,
      }).addTo(map);
      const core = L.polyline(route, {
        color: '#3b82f6', opacity: 0.95, weight: 4,
      }).addTo(map);
      entitiesRef.current.polylines.push(halo, casing, core);
      points.push(...route);
    }

    // Markers — same SVG as Google so they look identical
    markers.forEach((info, idx) => {
      const filterId = `mf-leaflet-${info.id}-${idx}`;
      const icon = L.divIcon({
        html: `<img src="${buildMarkerSvg(info.color, filterId)}" width="${MARKER_SIZE.width}" height="${MARKER_SIZE.height}" alt="" />`,
        className: 'custom-marker',
        iconSize: [MARKER_SIZE.width, MARKER_SIZE.height],
        iconAnchor: [MARKER_SIZE.anchorX, MARKER_SIZE.anchorY],
        popupAnchor: [0, -MARKER_SIZE.anchorY + 4],
      });

      const marker = L.marker([info.lat, info.lng], {
        icon,
        title: info.title,
        draggable: !!info.draggable,
      }).addTo(map);

      if (info.popupHtml) {
        marker.bindPopup(info.popupHtml, {
          closeButton: true,
          autoPan: true,
          maxWidth: 240,
        });
      }

      // Smooth flyTo on dblclick — Leaflet has it built-in
      marker.on('dblclick', () => {
        map.closePopup();
        map.flyTo([info.lat, info.lng], 17, { duration: 0.75 });
      });

      if (info.draggable) {
        marker.on('dragend', (e: import('leaflet').LeafletEvent) => {
          const target = e.target as LeafletMarker;
          const pos = target.getLatLng();
          onMarkerDragEndRef.current?.(info.id, pos.lat, pos.lng);
        });
      }

      entitiesRef.current.markers.push(marker);
      points.push([info.lat, info.lng]);
    });

    // Auto-fit
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [mapReady, markers, route, suppressRoute]);

  /* ---- Fit-bounds button ---------------------------------------------- */

  const fitBounds = React.useCallback(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const points: Array<[number, number]> = [];
    if (route.length > 0 && !suppressRoute) points.push(...route);
    markers.forEach((m) => points.push([m.lat, m.lng]));
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [markers, route, suppressRoute]);

  return (
    <div className={cn('relative', className)} style={{ height }}>
      <div ref={containerRef} className="h-full w-full rounded-lg" />

      {mapReady && (
        <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1.5">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-md shadow-md"
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