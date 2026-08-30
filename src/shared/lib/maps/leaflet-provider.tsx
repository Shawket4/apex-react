import * as React from 'react';
import { Locate } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { DEFAULT_MAP_CENTER } from '@/shared/lib/coords';
import { buildMarkerSvg, markerSize } from './marker-svg';
import type { MapMarker, MapViewProps } from './types';

type LeafletNamespace = typeof import('leaflet');
type LeafletMap = import('leaflet').Map;
type LeafletMarker = import('leaflet').Marker;
type LeafletPolyline = import('leaflet').Polyline;
type LeafletLayer = import('leaflet').Layer;
type LeafletDivIcon = import('leaflet').DivIcon;

/* -------------------------------------------------------------------------- */
/* Style injection                                                             */
/* -------------------------------------------------------------------------- */

function injectLeafletStyles() {
  const styleId = 'leaflet-custom-styles-v1';
  if (typeof document === 'undefined' || document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .custom-marker { background: transparent; border: none; }
    .custom-marker:hover {
      z-index: 1000;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      border: 1px solid hsl(var(--border));
      background: hsl(var(--popover)); color: hsl(var(--popover-foreground));
      font-family: inherit;
    }
    .leaflet-popup-tip {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      background: hsl(var(--popover)); color: hsl(var(--popover-foreground));
    }
    .leaflet-control-zoom {
      border: 1px solid hsl(var(--border)); border-radius: calc(var(--radius) - 2px); overflow: hidden;
      background: hsl(var(--card) / 0.9); backdrop-filter: blur(10px);
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }
    .leaflet-control-zoom a {
      background: transparent; border: none;
      border-bottom: 1px solid hsl(var(--border));
      color: hsl(var(--foreground)); font-weight: 600;
      transition: background-color 0.15s ease, color 0.15s ease;
      width: 40px; height: 40px; line-height: 40px; font-size: 18px;
    }
    .leaflet-control-zoom a:last-child { border-bottom: none; }
    .leaflet-control-zoom a:hover { background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }
    .leaflet-control-attribution {
      background: hsl(var(--card) / 0.8); backdrop-filter: blur(10px);
      color: hsl(var(--muted-foreground));
      border-radius: 6px; font-size: 10px; padding: 2px 6px;
    }
    .leaflet-container { background: hsl(var(--muted)); font-family: inherit; border-radius: 12px; }
    .leaflet-popup-close-button {
      color: inherit; opacity: 0.7; font-size: 18px; padding: 4px 8px;
      border-radius: 8px; transition: background-color 0.15s ease, color 0.15s ease;
    }
    .leaflet-popup-close-button:hover { opacity: 1; background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }

    .dark .leaflet-container { background: hsl(var(--muted)); }
    .dark .leaflet-control-zoom {
      background: hsl(var(--card) / 0.9);
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }
    .dark .leaflet-control-zoom a {
      color: hsl(var(--foreground)); border-bottom-color: hsl(var(--border));
    }
    .dark .leaflet-control-zoom a:hover { background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }
    .dark .leaflet-popup-content-wrapper, .dark .leaflet-popup-tip {
      background: hsl(var(--popover)); color: hsl(var(--popover-foreground)); border-color: hsl(var(--border));
    }
    .dark .leaflet-control-attribution {
      background: hsl(var(--card) / 0.85); color: hsl(var(--muted-foreground));
    }
    .dark .leaflet-control-attribution a { color: hsl(var(--primary)); }

    @media (max-width: 640px) {
      .leaflet-popup-content-wrapper { font-size: 12px; border-radius: 12px; }
      .leaflet-popup-content { margin: 8px 12px; }
      .leaflet-container { font-size: 12px; }
      .leaflet-control-zoom a {
        width: 36px; height: 36px; line-height: 36px; font-size: 16px;
      }
    }
  `;
  document.head.appendChild(style);
}

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function buildDivIcon(L: LeafletNamespace, info: MapMarker, filterId: string): LeafletDivIcon {
  const kind = info.kind ?? 'pin';
  const size = markerSize(kind);
  return L.divIcon({
    html: `<img src="${buildMarkerSvg(info.color, filterId, kind, info.heading ?? 0)}" width="${size.width}" height="${size.height}" alt="" />`,
    className: 'custom-marker',
    iconSize: [size.width, size.height],
    iconAnchor: [size.anchorX, size.anchorY],
    popupAnchor: [0, -size.anchorY + 4],
  });
}

function boundsFingerprint(markers: MapMarker[], route: Array<[number, number]>): string {
  const points: string[] = [];
  for (const m of markers) {
    if (m.affectsBounds !== false) {
      points.push(`${m.id}:${m.lat.toFixed(6)},${m.lng.toFixed(6)}`);
    }
  }
  points.sort();
  return `${points.join('|')}|${route.length}`;
}

function zIndexFor(kind: MapMarker['kind']): number {
  switch (kind) {
    case 'vehicle':  return 800;
    case 'stop':     return 600;
    case 'ignition-on':
    case 'ignition-off': return 600;
    case 'route-start':
    case 'route-end':   return 700;
    default: return 400;
  }
}

function markerSignature(m: MapMarker): string {
  return `${m.kind ?? 'pin'}|${m.color}|${Math.round(m.heading ?? 0)}|${m.draggable ? 1 : 0}`;
}

interface MarkerEntry {
  marker: LeafletMarker;
  signature: string;
  popupHtml?: string;
}

/** Marker IDs that trigger zoom-preserving auto-pan when their position changes. */
const PAN_FOLLOW_IDS = new Set(['playback-current']);

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function LeafletMapView({
  markers = [],
  circles = [],
  route = [],
  polylines = [],
  gpuTrail = [],
  suppressRoute = false,
  centerFallback = DEFAULT_MAP_CENTER,
  height = 400,
  className,
  onMapClick,
  onMarkerClick,
  onMarkerDoubleClick,
  onMarkerDragEnd,
  onSnapTimestamp,
  bottomOffset = 0,
  liveUpdates = false,
}: MapViewProps) {
  const { t } = useTranslation();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const LRef = React.useRef<LeafletNamespace | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const tileLayerRef = React.useRef<LeafletLayer | null>(null);
  const markerEntriesRef = React.useRef<Map<string, MarkerEntry>>(new Map());
  const circleEntriesRef = React.useRef<Map<string, import('leaflet').Circle>>(new Map());
  const polylinesRef = React.useRef<LeafletPolyline[]>([]);
  const extraPolylinesRef = React.useRef<LeafletPolyline[]>([]);
  const themeObserverRef = React.useRef<MutationObserver | null>(null);
  const lastFingerprintRef = React.useRef<string>('');
  const [mapReady, setMapReady] = React.useState(false);

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

  /* ---- Init map once -------------------------------------------------- */

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    injectLeafletStyles();

    const initMap = async () => {
      const L = await import('leaflet').then((m) => m.default ?? m);
      if (cancelled || !containerRef.current) return;

      LRef.current = L;
      const isDark = document.documentElement.classList.contains('dark');

      const map = L.map(containerRef.current, {
        center: centerFallback,
        zoom: 11,
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: true,
      });

      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
        attribution: TILE_ATTR, maxZoom: 19,
      }).addTo(map);
      tileLayerRef.current = tile;

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
      });

      const observer = new MutationObserver(() => {
        if (!mapRef.current || !LRef.current) return;
        const dark = document.documentElement.classList.contains('dark');
        if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current);
        const next = LRef.current.tileLayer(dark ? TILE_DARK : TILE_LIGHT, {
          attribution: TILE_ATTR, maxZoom: 19,
        }).addTo(mapRef.current);
        tileLayerRef.current = next;
      });
      observer.observe(document.documentElement, {
        attributes: true, attributeFilter: ['class'],
      });
      themeObserverRef.current = observer;

      mapRef.current = map;

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
      }

      if (!cancelled) setMapReady(true);
    };

    void initMap();

    // Captured at setup — see the same pattern in tracking-map.
    const markerEntries = markerEntriesRef.current;
    const circleEntries = circleEntriesRef.current;
    return () => {
      cancelled = true;
      if (themeObserverRef.current) {
        themeObserverRef.current.disconnect();
        themeObserverRef.current = null;
      }
      markerEntries.forEach((e) => e.marker.remove());
      markerEntries.clear();
      circleEntries.forEach((c) => c.remove());
      circleEntries.clear();
      polylinesRef.current.forEach((p) => p.remove());
      polylinesRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Sync polylines (rare changes; teardown + recreate is fine) ---- */

  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    polylinesRef.current.forEach((p) => p.remove());
    polylinesRef.current = [];

    if (route.length > 0 && !suppressRoute) {
      const isDark = document.documentElement.classList.contains('dark');
      const halo = L.polyline(route, { color: '#3b82f6', opacity: 0.12, weight: 16 }).addTo(map);
      const casing = L.polyline(route, {
        color: isDark ? '#1e3a5f' : '#bfdbfe', opacity: 1, weight: 7,
      }).addTo(map);
      const core = L.polyline(route, { color: '#3b82f6', opacity: 0.95, weight: 4 }).addTo(map);
      polylinesRef.current.push(halo, casing, core);
    }
  }, [mapReady, route, suppressRoute]);

  /* ---- Sync extra styled polylines (teardown + recreate) --------------- */

  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    extraPolylinesRef.current.forEach((p) => p.remove());
    extraPolylinesRef.current = [];

    // No WebGL path on Leaflet: GPU trails degrade to ordinary polylines
    // (canvas-rendered, fine at this provider's fallback scale).
    for (const p of [...polylines, ...gpuTrail]) {
      if (p.path.length < 2) continue;
      const line = L.polyline(p.path, {
        color: p.color ?? '#3b82f6',
        opacity: p.opacity ?? 0.85,
        weight: p.weight ?? 4,
        dashArray: p.dashed ? '6 10' : undefined,
      }).addTo(map);
      extraPolylinesRef.current.push(line);
    }
  }, [mapReady, polylines, gpuTrail]);

  /* ---- Sync markers --------------------------------------------------- */

  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;
    const entries = markerEntriesRef.current;

    if (!liveUpdates) {
      // Legacy path
      entries.forEach((e) => e.marker.remove());
      entries.clear();
    }

    const incomingIds = new Set<string>();
    const boundsPoints: Array<[number, number]> = [];

    markers.forEach((info, idx) => {
      incomingIds.add(info.id);
      if (info.affectsBounds !== false) boundsPoints.push([info.lat, info.lng]);

      const filterId = `mf-leaflet-${info.id}-${idx}`;
      const sig = markerSignature(info);
      const existing = entries.get(info.id);

      if (existing && liveUpdates) {
        const cur = existing.marker.getLatLng();
        if (cur.lat !== info.lat || cur.lng !== info.lng) {
          existing.marker.setLatLng([info.lat, info.lng]);
          if (liveUpdates && PAN_FOLLOW_IDS.has(info.id)) {
            map.panTo([info.lat, info.lng]);
          }
        }
        if (existing.signature !== sig) {
          existing.marker.setIcon(buildDivIcon(L, info, filterId));
          existing.marker.setZIndexOffset(zIndexFor(info.kind));
          existing.signature = sig;
        }
        if (info.popupHtml !== existing.popupHtml) {
          if (info.popupHtml) {
            existing.marker.bindPopup(info.popupHtml, {
              closeButton: true, autoPan: true, maxWidth: 240,
            });
          } else {
            existing.marker.unbindPopup();
          }
          existing.popupHtml = info.popupHtml;
        }
        return;
      }

      const marker = L.marker([info.lat, info.lng], {
        icon: buildDivIcon(L, info, filterId),
        title: info.title,
        draggable: !!info.draggable,
        zIndexOffset: zIndexFor(info.kind),
      }).addTo(map);

      marker.on('click', () => {
        onMarkerClickRef.current?.(info.id);
      });

      if (info.popupHtml) {
        marker.bindPopup(info.popupHtml, { closeButton: true, autoPan: true, maxWidth: 240 });
      }

      marker.on('dblclick', (e: import('leaflet').LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        onMarkerDoubleClickRef.current?.(info.id);
        map.closePopup();
        map.flyTo([info.lat, info.lng], 18, {
          duration: 0.75,
          animate: !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
        });
      });

      if (info.draggable) {
        marker.on('dragend', (e: import('leaflet').LeafletEvent) => {
          const target = e.target as LeafletMarker;
          const pos = target.getLatLng();
          onMarkerDragEndRef.current?.(info.id, pos.lat, pos.lng);
        });
      }

      entries.set(info.id, { marker, signature: sig, popupHtml: info.popupHtml });
    });

    if (liveUpdates) {
      for (const [id, entry] of entries) {
        if (!incomingIds.has(id)) {
          entry.marker.remove();
          entries.delete(id);
        }
      }
    }

    // sync circles
    const currentCircleIds = new Set(circles.map((c) => c.id));
    for (const [id, circle] of circleEntriesRef.current.entries()) {
      if (!currentCircleIds.has(id)) {
        circle.remove();
        circleEntriesRef.current.delete(id);
      }
    }
    for (const c of circles) {
      let circle = circleEntriesRef.current.get(c.id);
      if (!circle) {
        circle = L.circle([c.lat, c.lng], {
          radius: c.radius_m,
          color: c.color || '#3b82f6',
          fillOpacity: c.fillOpacity ?? 0.2,
          weight: 2,
        }).addTo(map);
        circleEntriesRef.current.set(c.id, circle);
      } else {
        circle.setLatLng([c.lat, c.lng]);
        circle.setRadius(c.radius_m);
        circle.setStyle({
          color: c.color || '#3b82f6',
          fillOpacity: c.fillOpacity ?? 0.2,
        });
      }
    }

    if (route.length > 0 && !suppressRoute) {
      boundsPoints.push(...route);
    }
    polylines.forEach((p) => boundsPoints.push(...p.path));

    const cIds = circles.map(c => c.id).sort().join(',');
    const cCoords = circles.map(c => `${c.lat.toFixed(6)},${c.lng.toFixed(6)},${c.radius_m}`).join('|');
    const pIds = polylines.map((p) => `${p.id}:${p.path.length}`).join(',');
    const fp = boundsFingerprint(markers, suppressRoute ? [] : route) + `|${cIds}|${cCoords}|${pIds}`;
    const fingerprintChanged = fp !== lastFingerprintRef.current;
    lastFingerprintRef.current = fp;

    circles.forEach((c) => {
      const latOffset = c.radius_m / 111320;
      const lngOffset = c.radius_m / (40075000 * Math.cos((c.lat * Math.PI) / 180) / 360);
      boundsPoints.push([c.lat + latOffset, c.lng + lngOffset]);
      boundsPoints.push([c.lat - latOffset, c.lng - lngOffset]);
    });

    const shouldAutoFit = liveUpdates ? fingerprintChanged && boundsPoints.length > 0 : boundsPoints.length > 0;

    if (shouldAutoFit) {
      if (boundsPoints.length === 1) {
        map.setView(boundsPoints[0], 18);
      } else {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40] });
      }
    }
  }, [mapReady, markers, circles, route, polylines, suppressRoute, liveUpdates]);

  /* ---- Fit-bounds button ---------------------------------------------- */

  const fitBounds = React.useCallback(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const points: Array<[number, number]> = [];
    if (route.length > 0 && !suppressRoute) points.push(...route);
    polylines.forEach((p) => points.push(...p.path));
    markers.forEach((m) => {
      if (m.affectsBounds !== false) points.push([m.lat, m.lng]);
    });
    circles.forEach((c) => {
      const latOffset = c.radius_m / 111320;
      const lngOffset = c.radius_m / (40075000 * Math.cos((c.lat * Math.PI) / 180) / 360);
      points.push([c.lat + latOffset, c.lng + lngOffset]);
      points.push([c.lat - latOffset, c.lng - lngOffset]);
    });
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 18);
    }
  }, [markers, circles, route, polylines, suppressRoute]);

  return (
    <div className={cn('relative', className)} style={{ height }}>
      <div ref={containerRef} className="h-full w-full rounded-lg" />

      {mapReady && (
        <div 
          className="absolute end-3 z-[1000] flex flex-col gap-2"
          style={{ bottom: 128 + bottomOffset }}
        >
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-md backdrop-blur-md"
            onClick={fitBounds}
            title={t('maps.centerOnMarkers', { defaultValue: 'Center map on markers' })}
            aria-label={t('maps.centerOnMarkers', { defaultValue: 'Center map on markers' })}
          >
            <Locate />
          </Button>
        </div>
      )}
    </div>
  );
}
