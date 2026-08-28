import * as React from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { STATUS_COLOR, statusGroup, type LiveStatus, type Vehicle } from '../schemas';
import { buildStaticLayers, buildTailLayer, type HistoryLayerInput } from './layers';
import { buildMarkerSvg, markerSize } from '@/shared/lib/maps/marker-svg';
import type { SensorEvent, Stop, TripPin } from '../schemas';
import { sampleAt } from '../playback';

/* -------------------------------------------------------------------------- */
/* The map host. One Google vector map + one deck.gl overlay, driven          */
/* imperatively through a ref so replay frames never touch React:             */
/*                                                                            */
/*   setHistory(input)   — rebuild the static GPU layers (data changed)       */
/*   setCursor(ms)       — one uniform update + one DOM transform per frame   */
/*   setLive(vehicles)   — reconcile the 22 plate-chip markers                */
/*   fitTo / flyTo       — camera                                             */
/* -------------------------------------------------------------------------- */

export interface LiveMarkerDatum {
  vehicle: Vehicle;
  live: LiveStatus | null;
  selected: boolean;
  hidden: boolean;
}

export interface TrackingMapHandle {
  setHistory(input: HistoryLayerInput | null): void;
  /** Camera follows the replay marker while playing. */
  setFollow(on: boolean): void;
  /** Basemap: streets or satellite hybrid. */
  setMapType(type: 'roadmap' | 'hybrid'): void;
  setCursor(ms: number | null): void;
  setLive(data: LiveMarkerDatum[]): void;
  fitTo(coords: [number, number][]): void;
  flyTo(lng: number, lat: number, zoom?: number): void;
}

interface Props {
  onSelect: (vehicleId: string) => void;
  /** The user grabbed the map — the page usually turns follow off. */
  onUserPan?: () => void;
  onMapReady?: () => void;
  className?: string;
}

const FALLBACK_CENTER = { lat: 30.0444, lng: 31.2357 };

let loaderConfigured = false;
function configureLoader() {
  if (loaderConfigured) return;
  setOptions({ key: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ?? '', v: 'weekly' });
  loaderConfigured = true;
}

function digits(plate: string): string {
  const d = plate.replace(/\D/g, '');
  return d || plate.trim();
}

/** A live vehicle renders as the ORIGINAL vehicle marker SVG with the plate
 *  digits chip beneath it — the artwork the fleet already knows. */
function chipElement(datum: LiveMarkerDatum): HTMLElement {
  const group = statusGroup(datum.live?.status ?? datum.vehicle.status);
  const color = STATUS_COLOR[group];
  const size = markerSize('vehicle');
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer';
  const img = document.createElement('img');
  img.src = buildMarkerSvg(color, `trk-live-${datum.vehicle.id}`, 'vehicle');
  img.width = size.width;
  img.height = size.height;
  img.style.cssText = datum.selected ? 'filter:drop-shadow(0 0 6px rgba(31,58,95,.9))' : '';
  img.draggable = false;
  const label = document.createElement('span');
  label.textContent = digits(datum.vehicle.plate);
  label.style.cssText =
    'margin-top:1px;padding:0 5px;border-radius:6px;background:rgba(17,19,24,.85);color:#fff;' +
    'font:600 10px ui-monospace,monospace;letter-spacing:.03em;line-height:15px;' +
    (datum.selected ? `box-shadow:0 0 0 1.5px ${color}` : '');
  el.append(img, label);
  return el;
}

/** The replay position marker — the same vehicle artwork in trail blue. */
function replayElement(): HTMLElement {
  const size = markerSize('vehicle');
  const el = document.createElement('div');
  const img = document.createElement('img');
  img.src = buildMarkerSvg('#1d4ed8', 'trk-replay', 'vehicle');
  img.width = size.width;
  img.height = size.height;
  img.draggable = false;
  el.appendChild(img);
  return el;
}

const infoTimeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Cairo',
  hour12: false,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function vehicleInfoHtml(datum: LiveMarkerDatum): string {
  const live = datum.live;
  const rows = [
    `<div style="font:700 14px ui-monospace,monospace">${esc(datum.vehicle.plate)}</div>`,
    `<div>${esc(live?.statusLabel ?? datum.vehicle.statusLabel)}</div>`,
    live && live.speed > 0 ? `<div>${Math.round(live.speed)} km/h</div>` : '',
    live?.timestamp || datum.vehicle.lastLocationAt
      ? `<div style="color:#6b7280">${infoTimeFmt.format(
          (live?.timestamp ?? datum.vehicle.lastLocationAt)!,
        )}</div>`
      : '',
  ];
  return `<div style="font:12px system-ui;display:grid;gap:2px;min-width:120px;user-select:none">${rows.join('')}</div>`;
}

function stopInfoHtml(stop: Stop): string {
  return (
    `<div style="font:12px system-ui;display:grid;gap:2px;max-width:220px;user-select:none">` +
    `<div style="font-weight:700">${esc(stop.duration)}</div>` +
    (stop.address ? `<div>${esc(stop.address)}</div>` : '') +
    `<div style="color:#6b7280">${infoTimeFmt.format(stop.from)} → ${infoTimeFmt.format(stop.to)}</div>` +
    `</div>`
  );
}

function fmtDwell(secs: number): string {
  const h = Math.floor(secs / 3600);
  const mm = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}

function pinInfoHtml(pin: TripPin, kindLabel: string): string {
  const rows = [
    `<div style="font-weight:700">${esc(pin.name)}</div>`,
    `<div style="color:#6b7280">${esc(kindLabel)}${pin.parentTripId ? ` · #${pin.parentTripId}` : ''}</div>`,
    pin.arrive ? `<div>▾ ${infoTimeFmt.format(pin.arrive)}</div>` : '',
    pin.depart ? `<div>▴ ${infoTimeFmt.format(pin.depart)}</div>` : '',
    pin.dwellSecs != null && pin.dwellSecs > 0
      ? `<div style="font-weight:600">${fmtDwell(pin.dwellSecs)}</div>`
      : '',
  ];
  return `<div style="font:12px system-ui;display:grid;gap:2px;min-width:120px;user-select:none">${rows.join('')}</div>`;
}

function sensorInfoHtml(ev: SensorEvent): string {
  return (
    `<div style="font:12px system-ui;display:grid;gap:2px;user-select:none">` +
    `<div style="font-weight:700">${esc(ev.typeName)}</div>` +
    `<div style="color:#6b7280">${infoTimeFmt.format(ev.timestamp)}</div>` +
    `</div>`
  );
}

export const TrackingMap = React.forwardRef<TrackingMapHandle, Props>(
  function TrackingMap({ onSelect, onUserPan, onMapReady, className }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const mapRef = React.useRef<google.maps.Map | null>(null);
    const overlayRef = React.useRef<GoogleMapsOverlay | null>(null);
    const markersRef = React.useRef<
      Map<string, { marker: google.maps.marker.AdvancedMarkerElement; fingerprint: string }>
    >(new Map());
    const replayMarkerRef = React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const historyRef = React.useRef<HistoryLayerInput | null>(null);
    const cursorRef = React.useRef<number | null>(null);
    const readyRef = React.useRef(false);
    const pendingLiveRef = React.useRef<LiveMarkerDatum[] | null>(null);
    const infoRef = React.useRef<google.maps.InfoWindow | null>(null);
    const followRef = React.useRef(true);
    const lastPanRef = React.useRef(0);
    const lastPickRef = React.useRef<{ key: string; at: number }>({ key: '', at: 0 });
    const pickAtRef = React.useRef(0);
    const onSelectRef = React.useRef(onSelect);
    const onUserPanRef = React.useRef(onUserPan);
    React.useEffect(() => {
      onSelectRef.current = onSelect;
      onUserPanRef.current = onUserPan;
    });

    const staticLayersRef = React.useRef<ReturnType<typeof buildStaticLayers>>([]);

    /** Recompute the static layers (data/toggles/cursor-day changed). */
    const rebuildStatic = React.useCallback(() => {
      const h = historyRef.current;
      staticLayersRef.current = h ? buildStaticLayers(h) : [];
    }, []);

    /** Push static + tail. Per replay frame only the tail layer is new —
     *  the cached statics diff to no-ops inside deck. */
    const pushLayers = React.useCallback(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const h = historyRef.current;
      if (!h) {
        overlay.setProps({ layers: [] });
        return;
      }
      const layers = [...staticLayersRef.current];
      if (h.track && cursorRef.current !== null) {
        layers.push(buildTailLayer(h.track, cursorRef.current));
      }
      overlay.setProps({ layers });
    }, []);

    const applyLive = React.useCallback((data: LiveMarkerDatum[]) => {
      const map = mapRef.current;
      if (!map || !readyRef.current) {
        pendingLiveRef.current = data;
        return;
      }
      const markers = markersRef.current;
      const seen = new Set<string>();
      for (const datum of data) {
        const id = datum.vehicle.id;
        const lat = datum.live?.lat ?? datum.vehicle.lat;
        const lng = datum.live?.lng ?? datum.vehicle.lng;
        if (datum.hidden || lat == null || lng == null || (lat === 0 && lng === 0)) continue;
        seen.add(id);
        const fingerprint = [
          lat.toFixed(5),
          lng.toFixed(5),
          datum.live?.status ?? datum.vehicle.status,
          datum.selected ? 's' : '',
        ].join('|');
        const existing = markers.get(id);
        if (existing) {
          if (existing.fingerprint === fingerprint) continue;
          existing.marker.position = { lat, lng };
          existing.marker.content = chipElement(datum);
          existing.fingerprint = fingerprint;
        } else {
          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat, lng },
            content: chipElement(datum),
            zIndex: datum.selected ? 20 : 10,
          });
          marker.addListener('click', () => {
            const now = performance.now();
            const isDouble =
              lastPickRef.current.key === `v:${id}` && now - lastPickRef.current.at < 350;
            lastPickRef.current = { key: `v:${id}`, at: now };
            const pos = marker.position as google.maps.LatLngLiteral | null;
            if (isDouble && pos) {
              infoRef.current?.close();
              map.panTo(pos);
              map.setZoom(Math.max(map.getZoom() ?? 0, 16));
              return;
            }
            onSelectRef.current(id);
            if (infoRef.current && pos) {
              infoRef.current.setContent(vehicleInfoHtml(datum));
              infoRef.current.setPosition(pos);
              infoRef.current.open({ map });
            }
          });
          markers.set(id, { marker, fingerprint });
        }
      }
      for (const [id, entry] of markers) {
        if (!seen.has(id)) {
          entry.marker.map = null;
          markers.delete(id);
        }
      }
    }, []);

    React.useImperativeHandle(
      ref,
      (): TrackingMapHandle => ({
        setHistory(input) {
          historyRef.current = input;
          if (!input?.track) {
            cursorRef.current = null;
            if (replayMarkerRef.current) replayMarkerRef.current.map = null;
            replayMarkerRef.current = null;
          }
          rebuildStatic();
          pushLayers();
        },
        setFollow(on) {
          followRef.current = on;
        },
        setMapType(type) {
          mapRef.current?.setMapTypeId(type);
        },
        setCursor(ms) {
          cursorRef.current = ms;
          const h = historyRef.current;
          if (!h?.track || ms === null) return;
          // One uniform update on the GPU tail…
          pushLayers();
          // …and one DOM transform on the marker.
          const map = mapRef.current;
          if (!map) return;
          const sample = sampleAt(h.track, ms);
          // Auto-follow: keep the runner centred, panning at most ~3×/s so
          // the camera glides instead of jittering.
          const now = performance.now();
          if (followRef.current && now - lastPanRef.current > 350) {
            lastPanRef.current = now;
            map.panTo({ lat: sample.lat, lng: sample.lng });
          }
          if (!replayMarkerRef.current) {
            replayMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
              map,
              position: { lat: sample.lat, lng: sample.lng },
              content: replayElement(),
              zIndex: 30,
            });
          } else {
            replayMarkerRef.current.position = { lat: sample.lat, lng: sample.lng };
          }
          const arrow = (replayMarkerRef.current.content as HTMLElement | null)?.querySelector(
            '[data-arrow]',
          ) as HTMLElement | null;
          if (arrow) arrow.style.transform = `rotate(${sample.heading}deg)`;
        },
        setLive: applyLive,
        fitTo(coords) {
          const map = mapRef.current;
          if (!map || coords.length === 0) return;
          const bounds = new google.maps.LatLngBounds();
          for (const [lng, lat] of coords) bounds.extend({ lat, lng });
          map.fitBounds(bounds, 64);
        },
        flyTo(lng, lat, zoom = 15) {
          const map = mapRef.current;
          if (!map) return;
          map.panTo({ lat, lng });
          map.setZoom(zoom);
        },
      }),
      [applyLive, pushLayers, rebuildStatic],
    );

    React.useEffect(() => {
      let cancelled = false;
      configureLoader();
      void Promise.all([importLibrary('maps'), importLibrary('marker')]).then(() => {
        if (cancelled || !containerRef.current) return;
        const map = new google.maps.Map(containerRef.current, {
          center: FALLBACK_CENTER,
          zoom: 8,
          mapId: (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string) || 'DEMO_MAP_ID',
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
          disableDoubleClickZoom: true,
        });
        const overlay = new GoogleMapsOverlay({
          onClick: (info: {
            object?: unknown;
            layer?: { id: string } | null;
            coordinate?: number[];
          }) => {
            if (!info.object || !info.layer || !info.coordinate) return;
            const [lng, lat] = info.coordinate;
            const key = `${info.layer.id}:${lng.toFixed(6)},${lat.toFixed(6)}`;
            const now = performance.now();
            const isDouble =
              lastPickRef.current.key === key && now - lastPickRef.current.at < 350;
            lastPickRef.current = { key, at: now };
            if (isDouble) {
              infoRef.current?.close();
              map.panTo({ lat, lng });
              map.setZoom(Math.max(map.getZoom() ?? 0, 16));
              return;
            }
            const html =
              info.layer.id === 'stops'
                ? stopInfoHtml(info.object as Stop)
                : info.layer.id === 'sensors'
                  ? sensorInfoHtml(info.object as SensorEvent)
                  : info.layer.id === 'trip-pins'
                    ? pinInfoHtml(info.object as TripPin, (info.object as TripPin).kind)
                    : null;
            if (html && infoRef.current) {
              pickAtRef.current = performance.now();
              infoRef.current.setContent(html);
              infoRef.current.setPosition({ lat, lng });
              infoRef.current.open({ map });
            }
          },
          onHover: (info: { object?: unknown }) => {
            // A pointer over a pickable object reads as clickable.
            mapRef.current?.setOptions({
              draggableCursor: info.object ? 'pointer' : null,
            });
          },
        });
        overlay.setMap(map);
        infoRef.current = new google.maps.InfoWindow({ headerDisabled: true });
        map.addListener('click', () => {
          // The map click that accompanies a deck pick must not close the
          // tooltip the pick just opened.
          if (performance.now() - pickAtRef.current > 250) infoRef.current?.close();
        });
        map.addListener('dragstart', () => onUserPanRef.current?.());
        // Double-press on a picked object flies in (native dblclick zoom is
        // off, and Google swallows the second click, so we pick manually).
        map.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
          const dom = e.domEvent as MouseEvent | undefined;
          const el = containerRef.current;
          if (!dom || !el) return;
          const rect = el.getBoundingClientRect();
          try {
            const picked = overlay.pickObject({
              x: dom.clientX - rect.left,
              y: dom.clientY - rect.top,
              radius: 12,
            }) as { coordinate?: number[] } | null;
            if (picked?.coordinate) {
              infoRef.current?.close();
              const [lng, lat] = picked.coordinate;
              map.panTo({ lat, lng });
              map.setZoom(Math.max(map.getZoom() ?? 0, 16));
            }
          } catch {
            /* picking unavailable — ignore */
          }
        });
        mapRef.current = map;
        overlayRef.current = overlay;
        readyRef.current = true;
        rebuildStatic();
        if (pendingLiveRef.current) {
          applyLive(pendingLiveRef.current);
          pendingLiveRef.current = null;
        }
        pushLayers();
        onMapReady?.();
      });
      return () => {
        cancelled = true;
        infoRef.current?.close();
        infoRef.current = null;
        overlayRef.current?.finalize();
        overlayRef.current = null;
        for (const { marker } of markersRef.current.values()) marker.map = null;
        markersRef.current.clear();
        if (replayMarkerRef.current) replayMarkerRef.current.map = null;
        replayMarkerRef.current = null;
        mapRef.current = null;
        readyRef.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={containerRef} className={className} />;
  },
);
