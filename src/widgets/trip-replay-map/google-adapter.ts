import { loadGoogleMaps } from '@/shared/lib/maps/google-maps-health';
import { darkMapStyle, lightMapStyle } from '@/shared/lib/maps/google-styles';
import { getSharedMap, releaseSharedMap } from '@/shared/lib/maps/map-pool';
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

/* -------------------------------------------------------------------------- */
/* Adapter                                                                     */
/* -------------------------------------------------------------------------- */

interface DynEntry {
  marker: google.maps.Marker;
  color: string;
  kind: MarkerKind;
  opacity: number;
  visible: boolean;
}

export async function createGoogleReplayAdapter(
  container: HTMLElement,
  centerFallback: [number, number],
): Promise<ReplayMapAdapter> {
  if (!(await loadGoogleMaps())) throw new Error('Google Maps is unavailable');

  const isDark = () => document.documentElement.classList.contains('dark');
  const handle = await getSharedMap(container, {
    center: { lat: centerFallback[0], lng: centerFallback[1] },
    zoom: 11,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    styles: isDark() ? darkMapStyle : lightMapStyle,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
    gestureHandling: 'greedy',
    keyboardShortcuts: false, // the replay owns the keyboard
  });
  const map = handle.map;

  const themeObserver = new MutationObserver(() => {
    if (map.getMapTypeId() !== google.maps.MapTypeId.ROADMAP) return;
    map.setOptions({ styles: isDark() ? darkMapStyle : lightMapStyle });
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  const staticOverlays: Array<google.maps.Polyline | google.maps.Marker> = [];
  const dyn = new Map<DynMarkerId, DynEntry>();
  const pinListeners: google.maps.MapsEventListener[] = [];
  let pinClickHandler: ((pinId: string) => void) | null = null;
  let lastPan = 0;
  const pulseRafIds = new Set<number>();

  function icon(kind: MarkerKind, color: string, id: string): google.maps.Icon {
    const sz = markerSize(kind);
    return {
      url: buildMarkerSvg(color, `replay-${id}`, kind),
      anchor: new google.maps.Point(sz.anchorX, sz.anchorY),
    };
  }

  function ensureDyn(id: DynMarkerId): DynEntry {
    let entry = dyn.get(id);
    if (!entry) {
      const kind: MarkerKind = 'vehicle';
      const color = id === 'truck' ? '#2563eb' : '#16a34a';
      const opacity = id === 'truck' ? 1 : GHOST_MARKER_OPACITY;
      const marker = new google.maps.Marker({
        map: null,
        icon: icon(kind, color, id),
        opacity,
        zIndex: id === 'truck' ? 1000 : 900,
        clickable: false,
        optimized: true,
      });
      entry = { marker, color, kind, opacity, visible: false };
      dyn.set(id, entry);
    }
    return entry;
  }

  return {
    setMapType(type: 'roadmap' | 'hybrid') {
      map.setMapTypeId(
        type === 'hybrid' ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP,
      );
      if (type === 'roadmap') {
        map.setOptions({ styles: isDark() ? darkMapStyle : lightMapStyle });
      }
    },
    setScene(scene: ReplayScene) {
      staticOverlays.forEach((o) => o.setMap(null));
      staticOverlays.length = 0;
      pinListeners.forEach((l) => google.maps.event.removeListener(l));
      pinListeners.length = 0;

      for (const p of scene.polylines) {
        if (p.path.length < 2) continue;
        staticOverlays.push(
          new google.maps.Polyline({
            path: p.path.map(([lat, lng]) => ({ lat, lng })),
            map,
            strokeColor: p.color,
            strokeOpacity: p.dashed ? 0 : p.opacity,
            strokeWeight: p.weight,
            ...(p.dashed && {
              icons: [
                {
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: p.opacity,
                    scale: p.weight / 1.6,
                  },
                  offset: '0',
                  repeat: '14px',
                },
              ],
            }),
          }),
        );
      }
      for (const pin of scene.pins) {
        const marker = new google.maps.Marker({
          position: { lat: pin.lat, lng: pin.lng },
          map,
          title: pin.title,
          icon: icon(pin.kind, pin.color, pin.id),
        });
        pinListeners.push(
          marker.addListener('click', () => pinClickHandler?.(pin.id)),
        );
        staticOverlays.push(marker);
      }
      if (scene.bounds.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        scene.bounds.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
        map.fitBounds(bounds, { top: 80, bottom: 80, left: 60, right: 60 });
      }
    },

    moveMarker(id, lat, lng) {
      const entry = ensureDyn(id);
      entry.marker.setPosition({ lat, lng });
      if (!entry.visible) {
        entry.visible = true;
        entry.marker.setMap(map);
      }
    },

    setMarkerColor(id, color) {
      const entry = ensureDyn(id);
      if (entry.color === color) return;
      entry.color = color;
      entry.marker.setIcon(icon(entry.kind, color, id));
    },

    setMarkerVisible(id, visible) {
      const entry = ensureDyn(id);
      if (entry.visible === visible) return;
      entry.visible = visible;
      entry.marker.setMap(visible ? map : null);
    },

    follow(lat, lng) {
      const now = performance.now();
      if (now - lastPan < FOLLOW_THROTTLE_MS) return;
      lastPan = now;
      // panTo animates small deltas natively — the eased follow-cam.
      map.panTo({ lat, lng });
    },

    fitPoints(points) {
      if (points.length === 0) return;
      const bounds = new google.maps.LatLngBounds();
      points.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
      map.fitBounds(bounds, { top: 80, bottom: 80, left: 60, right: 60 });
    },

    pulse(lat, lng, color = '#f59e0b') {
      const circle = new google.maps.Circle({
        map,
        center: { lat, lng },
        radius: 1,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        clickable: false,
      });
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / PULSE_DURATION_MS);
        circle.setRadius(Math.max(1, t * PULSE_MAX_RADIUS_M));
        circle.setOptions({
          fillOpacity: 0.35 * (1 - t),
          strokeOpacity: 0.9 * (1 - t),
        });
        if (t < 1) {
          const id = requestAnimationFrame(step);
          pulseRafIds.add(id);
        } else {
          circle.setMap(null);
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
      pinListeners.forEach((l) => google.maps.event.removeListener(l));
      pinListeners.length = 0;
      staticOverlays.forEach((o) => o.setMap(null));
      staticOverlays.length = 0;
      dyn.forEach((e) => e.marker.setMap(null));
      dyn.clear();
      releaseSharedMap(map);
    },
  };
}
