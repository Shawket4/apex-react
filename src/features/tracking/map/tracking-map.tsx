import * as React from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { STATUS_COLOR, statusGroup, type LiveStatus, type Vehicle } from '../schemas';
import { buildStaticLayers, buildTailLayer, type HistoryLayerInput } from './layers';
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
  setCursor(ms: number | null): void;
  setLive(data: LiveMarkerDatum[]): void;
  fitTo(coords: [number, number][]): void;
  flyTo(lng: number, lat: number, zoom?: number): void;
}

interface Props {
  onSelect: (vehicleId: string) => void;
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

/** The plate chip a live vehicle renders as. */
function chipElement(datum: LiveMarkerDatum): HTMLElement {
  const group = statusGroup(datum.live?.status ?? datum.vehicle.status);
  const color = STATUS_COLOR[group];
  const el = document.createElement('div');
  el.style.cssText = [
    'display:flex;align-items:center;gap:5px',
    'padding:3px 8px;border-radius:999px',
    'background:rgba(17,19,24,.92);color:#fff',
    `border:2px solid ${color}`,
    'font:600 11px ui-monospace,monospace;letter-spacing:.03em',
    'box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:pointer',
    datum.selected ? `outline:2px solid ${color};outline-offset:2px` : '',
    'transition:transform .12s',
  ].join(';');
  const dot = document.createElement('span');
  dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${color};flex:none`;
  el.append(dot, document.createTextNode(digits(datum.vehicle.plate)));
  return el;
}

/** The replay position marker — a directional arrow in trail blue. */
function replayElement(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText =
    'width:26px;height:26px;border-radius:50%;background:#1d4ed8;border:3px solid #fff;' +
    'box-shadow:0 2px 10px rgba(0,0,0,.4);display:grid;place-items:center';
  const arrow = document.createElement('div');
  arrow.dataset.arrow = '1';
  arrow.style.cssText =
    'width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;' +
    'border-bottom:9px solid #fff;transform-origin:50% 60%';
  el.appendChild(arrow);
  return el;
}

export const TrackingMap = React.forwardRef<TrackingMapHandle, Props>(
  function TrackingMap({ onSelect, onMapReady, className }, ref) {
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
    const onSelectRef = React.useRef(onSelect);
    React.useEffect(() => {
      onSelectRef.current = onSelect;
    });

    const pushLayers = React.useCallback(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const h = historyRef.current;
      if (!h) {
        overlay.setProps({ layers: [] });
        return;
      }
      const layers = buildStaticLayers(h);
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
          marker.addListener('click', () => onSelectRef.current(id));
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
          pushLayers();
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
      [applyLive, pushLayers],
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
        });
        const overlay = new GoogleMapsOverlay({});
        overlay.setMap(map);
        mapRef.current = map;
        overlayRef.current = overlay;
        readyRef.current = true;
        if (pendingLiveRef.current) {
          applyLive(pendingLiveRef.current);
          pendingLiveRef.current = null;
        }
        pushLayers();
        onMapReady?.();
      });
      return () => {
        cancelled = true;
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
