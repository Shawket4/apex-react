import * as React from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import i18n from '@/shared/i18n';
import { STATUS_COLOR, statusGroup, type LiveStatus, type Vehicle } from '../schemas';
import { buildStaticLayers, buildTailLayer, type HistoryLayerInput } from './layers';
import { buildMarkerSvg, markerSize } from '@/shared/lib/maps/marker-svg';
import type { SensorEvent, Stop } from '../schemas';
import type { LegSegment } from '../use-history';
import { legId, type PinCluster } from './layers';
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
  /** A leg segment was tapped on the map. */
  onActivateLeg?: (legId: string) => void;
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
    "font:600 10px 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.03em;line-height:15px;" +
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

const infoTimeFmts = new Map<string, Intl.DateTimeFormat>();
const infoTimeFmt = {
  format(d: Date): string {
    const locale = (i18n.language ?? '').startsWith('ar') ? 'ar-EG' : 'en-GB';
    let f = infoTimeFmts.get(locale);
    if (!f) {
      f = new Intl.DateTimeFormat(locale, {
        timeZone: 'Africa/Cairo',
        hour12: false,
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      infoTimeFmts.set(locale, f);
    }
    return f.format(d);
  },
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The one tooltip shell every marker uses: a left-aligned card with the
 * title row, the detail rows, and a footer button that opens the exact
 * coordinate in Google Maps. Direction-aware; text is never selectable.
 */
function tipShell(title: string, rows: string[], lat: number, lng: number): string {
  const mapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
  const body = rows.filter(Boolean).join('');
  return (
    `<div dir="auto" style="font:12px 'IBM Plex Sans Arabic','IBM Plex Sans',system-ui,sans-serif;display:grid;gap:3px;min-width:150px;max-width:250px;` +
    `user-select:none;text-align:start;padding:2px 2px 0">` +
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">` +
    `<div style="font-weight:600;min-width:0">${title}</div>` +
    `<a href="${mapsUrl}" target="_blank" rel="noopener" title="Google Maps" aria-label="Google Maps" translate="no" ` +
    `style="flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:6px;` +
    `border:1px solid hsl(var(--border));color:hsl(var(--primary));text-decoration:none;background:hsl(var(--card))">` +
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>` +
    `<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>` +
    `</a>` +
    `</div>` +
    body +
    `</div>`
  );
}

const row = (html: string) => `<div style="line-height:1.45">${html}</div>`;
const dimRow = (html: string) => `<div style="color:hsl(var(--muted-foreground));line-height:1.45">${html}</div>`;

function vehicleInfoHtml(datum: LiveMarkerDatum, lat: number, lng: number): string {
  const live = datum.live;
  return tipShell(
    `<span style="font:600 14px 'IBM Plex Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums">${esc(datum.vehicle.plate)}</span>`,
    [
      row(esc(live?.statusLabel ?? datum.vehicle.statusLabel)),
      live && live.speed > 0 ? row(`${Math.round(live.speed)} ${esc(i18n.t('tracking.kmh', 'km/h'))}`) : '',
      live?.timestamp || datum.vehicle.lastLocationAt
        ? dimRow(infoTimeFmt.format((live?.timestamp ?? datum.vehicle.lastLocationAt)!))
        : '',
    ],
    lat,
    lng,
  );
}

function stopInfoHtml(stop: Stop): string {
  return tipShell(
    esc(stop.duration),
    [
      stop.address ? row(esc(stop.address)) : '',
      dimRow(`${infoTimeFmt.format(stop.from)} → ${infoTimeFmt.format(stop.to)}`),
    ],
    stop.lat,
    stop.lng,
  );
}

function fmtDwell(secs: number): string {
  const h = Math.floor(secs / 3600);
  const mm = Math.floor((secs % 3600) / 60);
  const uh = esc(i18n.t('tracking.unit.h', 'h'));
  const um = esc(i18n.t('tracking.unit.m', 'm'));
  return h > 0 ? `${h}${uh} ${mm}${um}` : `${mm}${um}`;
}

/** One marker can stand for several back-to-back visits — list them all. */
function pinInfoHtml(cluster: PinCluster): string {
  const head = cluster.visits[0];
  return tipShell(
    esc(head.name),
    [
      dimRow(esc(cluster.kind)),
      ...cluster.visits.map((pin) => {
        const bits = [
          pin.parentTripId ? `#${pin.parentTripId}` : '',
          pin.arrive ? `▾ ${infoTimeFmt.format(pin.arrive)}` : '',
          pin.depart ? `▴ ${infoTimeFmt.format(pin.depart)}` : '',
          pin.dwellSecs != null && pin.dwellSecs > 0 ? `<b>${fmtDwell(pin.dwellSecs)}</b>` : '',
        ].filter(Boolean);
        return row(`<span dir="ltr">${bits.join(' · ')}</span>`);
      }),
    ],
    cluster.lat,
    cluster.lng,
  );
}

function legInfoHtml(seg: LegSegment, lat: number, lng: number): string {
  const l = seg.leg;
  return tipShell(
    `${esc(l.fromName ?? '—')} → ${esc(l.toName ?? '—')}`,
    [
      dimRow(`${esc(l.legType)} · #${l.parentTripId}·${l.seq}`),
      row(`<span dir="ltr">${infoTimeFmt.format(l.depart)} → ${infoTimeFmt.format(l.arrive)}</span>`),
      l.actualKm != null ? row(`<b>${l.actualKm.toFixed(1)} ${esc(i18n.t('tracking.km', 'km'))}</b>`) : '',
      l.actualSecs != null ? row(fmtDwell(l.actualSecs)) : '',
      seg.cutStart || seg.cutEnd
        ? `<div style="color:hsl(var(--warning));line-height:1.45">⟷ ${esc(i18n.t('tracking.beyondRangeLine', 'continues beyond the loaded range'))}</div>`
        : '',
    ],
    lat,
    lng,
  );
}

function sensorInfoHtml(ev: SensorEvent): string {
  return tipShell(esc(ev.typeName), [dimRow(infoTimeFmt.format(ev.timestamp))], ev.lat, ev.lng);
}

function endpointInfoHtml(kind: 'route-start' | 'route-end', lat: number, lng: number): string {
  const label =
    kind === 'route-start'
      ? i18n.t('tracking.routeStart', 'Route start')
      : i18n.t('tracking.routeEnd', 'Route end');
  return tipShell(esc(label), [], lat, lng);
}

export const TrackingMap = React.forwardRef<TrackingMapHandle, Props>(
  function TrackingMap({ onSelect, onUserPan, onActivateLeg, onMapReady, className }, ref) {
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
    const onActivateLegRef = React.useRef(onActivateLeg);
    React.useEffect(() => {
      onSelectRef.current = onSelect;
      onUserPanRef.current = onUserPan;
      onActivateLegRef.current = onActivateLeg;
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
            // Without this the marker neither receives clicks nor shows a
            // pointer cursor — taps fall through to the map beneath it.
            gmpClickable: true,
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
              // Guard against the map click that follows — it was closing
              // this tooltip the instant it opened.
              pickAtRef.current = now;
              const latN = typeof pos.lat === 'function' ? (pos.lat as () => number)() : pos.lat;
              const lngN = typeof pos.lng === 'function' ? (pos.lng as () => number)() : pos.lng;
              infoRef.current.setContent(vehicleInfoHtml(datum, latN, lngN));
              infoRef.current.setOptions({ pixelOffset: new google.maps.Size(0, 0) });
              // Anchoring to the marker aligns the window above the artwork.
              infoRef.current.open({ map, anchor: marker });
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
            if (info.layer.id === 'legs' || info.layer.id === 'legs-garage') {
              onActivateLegRef.current?.(legId(info.object as LegSegment));
            }
            const html =
              info.layer.id === 'stops'
                ? stopInfoHtml(info.object as Stop)
                : info.layer.id === 'sensors'
                  ? sensorInfoHtml(info.object as SensorEvent)
                  : info.layer.id === 'trip-pins'
                    ? pinInfoHtml(info.object as PinCluster)
                    : info.layer.id === 'endpoints'
                      ? endpointInfoHtml(
                          (info.object as { kind: 'route-start' | 'route-end' }).kind,
                          lat,
                          lng,
                        )
                      : info.layer.id === 'legs' || info.layer.id === 'legs-garage'
                        ? legInfoHtml(info.object as LegSegment, lat, lng)
                        : null;
            if (html && infoRef.current) {
              pickAtRef.current = performance.now();
              infoRef.current.setContent(html);
              infoRef.current.setPosition({ lat, lng });
              // Lift the window clear of the icon artwork beneath it.
              infoRef.current.setOptions({
                pixelOffset: new google.maps.Size(
                  0,
                  info.layer.id === 'trip-pins' || info.layer.id === 'endpoints' ? -30 : -14,
                ),
              });
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
