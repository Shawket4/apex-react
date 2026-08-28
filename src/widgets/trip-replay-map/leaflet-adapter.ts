import { buildMarkerSvg, markerSize } from '@/shared/lib/maps/marker-svg';
import type { MarkerKind } from '@/shared/lib/maps/types';
import {
  FOLLOW_THROTTLE_MS,
  GHOST_MARKER_OPACITY,
  PULSE_DURATION_MS,
  PULSE_MAX_RADIUS_M,
  type DynMarkerId,
  type ReplayMapAdapter,
  type ReplayScene,
} from './types';

type LeafletNamespace = typeof import('leaflet');
type LeafletMarker = import('leaflet').Marker;
type LeafletLayer = import('leaflet').Layer;

const TILE_LIGHT =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface DynEntry {
  marker: LeafletMarker;
  color: string;
  kind: MarkerKind;
  visible: boolean;
}

/**
 * Leaflet fallback adapter — same contract as the Google one, degrading
 * gracefully: `follow` uses a short animated pan, pulses are animated
 * circles, dashed lines use `dashArray`.
 */
export async function createLeafletReplayAdapter(
  container: HTMLElement,
  centerFallback: [number, number],
): Promise<ReplayMapAdapter> {
  const L: LeafletNamespace = await import('leaflet').then((m) => m.default ?? m);

  const isDark = () => document.documentElement.classList.contains('dark');
  const map = L.map(container, {
    center: centerFallback,
    zoom: 11,
    zoomControl: false,
    scrollWheelZoom: true,
    attributionControl: true,
    keyboard: false, // the replay owns the keyboard
  });
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  let tile = L.tileLayer(isDark() ? TILE_DARK : TILE_LIGHT, {
    attribution: TILE_ATTR,
    maxZoom: 19,
  }).addTo(map);

  const themeObserver = new MutationObserver(() => {
    map.removeLayer(tile);
    tile = L.tileLayer(isDark() ? TILE_DARK : TILE_LIGHT, {
      attribution: TILE_ATTR,
      maxZoom: 19,
    }).addTo(map);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  const SAT_TILE =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  let mapType: 'roadmap' | 'hybrid' = 'roadmap';
  const applyTile = () => {
    map.removeLayer(tile);
    tile = L.tileLayer(mapType === 'hybrid' ? SAT_TILE : isDark() ? TILE_DARK : TILE_LIGHT, {
      attribution: TILE_ATTR,
      maxZoom: 19,
    }).addTo(map);
  };

  const staticLayers: LeafletLayer[] = [];
  const dyn = new Map<DynMarkerId, DynEntry>();
  let pinClickHandler: ((pinId: string) => void) | null = null;
  let lastPan = 0;
  const pulseRafIds = new Set<number>();

  function divIcon(kind: MarkerKind, color: string, id: string) {
    const size = markerSize(kind);
    return L.divIcon({
      html: `<img src="${buildMarkerSvg(color, `replay-${id}`, kind)}" width="${size.width}" height="${size.height}" alt="" />`,
      className: 'custom-marker',
      iconSize: [size.width, size.height],
      iconAnchor: [size.anchorX, size.anchorY],
    });
  }

  function ensureDyn(id: DynMarkerId): DynEntry {
    let entry = dyn.get(id);
    if (!entry) {
      const kind: MarkerKind = 'vehicle';
      const color = id === 'truck' ? '#2563eb' : '#16a34a';
      const marker = L.marker(centerFallback, {
        icon: divIcon(kind, color, id),
        opacity: id === 'truck' ? 1 : GHOST_MARKER_OPACITY,
        zIndexOffset: id === 'truck' ? 1000 : 900,
        interactive: false,
      });
      entry = { marker, color, kind, visible: false };
      dyn.set(id, entry);
    }
    return entry;
  }

  return {
    setMapType(type: 'roadmap' | 'hybrid') {
      mapType = type;
      applyTile();
    },
    setScene(scene: ReplayScene) {
      staticLayers.forEach((l) => map.removeLayer(l));
      staticLayers.length = 0;

      for (const p of scene.polylines) {
        if (p.path.length < 2) continue;
        staticLayers.push(
          L.polyline(p.path, {
            color: p.color,
            opacity: p.opacity,
            weight: p.weight,
            dashArray: p.dashed ? '6 10' : undefined,
          }).addTo(map),
        );
      }
      for (const pin of scene.pins) {
        const marker = L.marker([pin.lat, pin.lng], {
          icon: divIcon(pin.kind, pin.color, pin.id),
          title: pin.title,
          zIndexOffset: 600,
        }).addTo(map);
        marker.on('click', () => pinClickHandler?.(pin.id));
        staticLayers.push(marker);
      }
      if (scene.bounds.length > 1) {
        map.fitBounds(L.latLngBounds(scene.bounds), { padding: [60, 60] });
      } else if (scene.bounds.length === 1) {
        map.setView(scene.bounds[0], 14);
      }
    },

    moveMarker(id, lat, lng) {
      const entry = ensureDyn(id);
      entry.marker.setLatLng([lat, lng]);
      if (!entry.visible) {
        entry.visible = true;
        entry.marker.addTo(map);
      }
    },

    setMarkerColor(id, color) {
      const entry = ensureDyn(id);
      if (entry.color === color) return;
      entry.color = color;
      entry.marker.setIcon(divIcon(entry.kind, color, id));
    },

    setMarkerVisible(id, visible) {
      const entry = ensureDyn(id);
      if (entry.visible === visible) return;
      entry.visible = visible;
      if (visible) entry.marker.addTo(map);
      else entry.marker.remove();
    },

    follow(lat, lng) {
      const now = performance.now();
      if (now - lastPan < FOLLOW_THROTTLE_MS) return;
      lastPan = now;
      map.panTo([lat, lng], { animate: true, duration: 0.25 });
    },

    fitPoints(points) {
      if (points.length === 0) return;
      if (points.length === 1) map.setView(points[0], 15);
      else map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
    },

    pulse(lat, lng, color = '#f59e0b') {
      const circle = L.circle([lat, lng], {
        radius: 1,
        color,
        opacity: 0.9,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        interactive: false,
      }).addTo(map);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / PULSE_DURATION_MS);
        circle.setRadius(Math.max(1, t * PULSE_MAX_RADIUS_M));
        circle.setStyle({ fillOpacity: 0.35 * (1 - t), opacity: 0.9 * (1 - t) });
        if (t < 1) {
          const id = requestAnimationFrame(step);
          pulseRafIds.add(id);
        } else {
          circle.remove();
        }
      };
      const id = requestAnimationFrame(step);
      pulseRafIds.add(id);
    },

    onPinClick(handler) {
      pinClickHandler = handler;
    },

    destroy() {
      pulseRafIds.forEach((id) => cancelAnimationFrame(id));
      pulseRafIds.clear();
      themeObserver.disconnect();
      staticLayers.forEach((l) => map.removeLayer(l));
      staticLayers.length = 0;
      dyn.forEach((e) => e.marker.remove());
      dyn.clear();
      map.remove();
    },
  };
}
