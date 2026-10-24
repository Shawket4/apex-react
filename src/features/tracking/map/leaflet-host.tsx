import * as React from 'react';
import { Deck } from '@deck.gl/core';
import type * as Leaflet from 'leaflet';
import { markerSize } from '@/shared/lib/maps/marker-svg';
import { cn } from '@/shared/lib/cn';
import { basemap, MAX_ZOOM } from '@/shared/lib/maps/tiles';
import { buildStaticLayers, buildTailLayer, legId, type HistoryLayerInput } from './layers';
import type { LegSegment } from '../use-history';
import { sampleAt } from '../playback';
import {
  chipElement,
  isLegLayer,
  pickInfoHtml,
  pickInfoLift,
  replayElement,
  vehicleInfoHtml,
} from './info-html';
import {
  FALLBACK_CENTER,
  type LiveMarkerDatum,
  type TrackingMapHandle,
  type TrackingMapProps,
} from './types';

/* -------------------------------------------------------------------------- */
/* The Leaflet host: what live tracking runs on when Google Maps doesn't work  */
/* (google-maps-health). Same handle and the same deck.gl layers as the        */
/* Google host, drawn by a standalone Deck whose camera follows Leaflet's:     */
/*                                                                            */
/*  - the Deck canvas sits in its own pane between Leaflet's overlays and its  */
/*    markers, pinned to the viewport and redrawn on every move;              */
/*  - pointer events stay with Leaflet; clicks and hovers are picked from the  */
/*    Deck by position;                                                        */
/*  - vehicles are Leaflet markers wearing the same DOM chips, tooltips are    */
/*    Leaflet popups with the same cards.                                      */
/* -------------------------------------------------------------------------- */

type LeafletNamespace = typeof import('leaflet');

/** Leaflet counts zoom on 256-px tiles, deck.gl on 512-px ones. */
const DECK_ZOOM_OFFSET = -1;

/** Popups wear the app's card colours in either theme. Idempotent. */
function injectPopupStyles() {
  const id = 'trk-leaflet-styles-v1';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .trk-leaflet-marker { background: none; border: 0; }
    .trk-leaflet-popup .leaflet-popup-content-wrapper,
    .trk-leaflet-popup .leaflet-popup-tip {
      background: hsl(var(--card)); color: hsl(var(--card-foreground));
      box-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
    }
    .trk-leaflet-popup .leaflet-popup-content-wrapper { border-radius: 10px; }
    .trk-leaflet-popup .leaflet-popup-content { margin: 8px 10px; }
  `;
  document.head.appendChild(style);
}

/** A DOM marker anchored at its bottom centre, as Google's advanced markers are. */
function anchoredIcon(L: LeafletNamespace, content: HTMLElement): Leaflet.DivIcon {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-100%)';
  wrap.appendChild(content);
  return L.divIcon({
    html: wrap,
    className: 'trk-leaflet-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** How far above a vehicle's point its popup opens: the artwork plus the chip. */
const VEHICLE_LIFT = markerSize('vehicle').height + 20;

const LeafletTrackingHost = React.forwardRef<TrackingMapHandle, TrackingMapProps>(
  function LeafletTrackingHost({ onSelect, onUserPan, onActivateLeg, onMapReady, className }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const LRef = React.useRef<LeafletNamespace | null>(null);
    const mapRef = React.useRef<Leaflet.Map | null>(null);
    const deckRef = React.useRef<Deck | null>(null);
    const popupRef = React.useRef<Leaflet.Popup | null>(null);
    const markersRef = React.useRef<Map<string, { marker: Leaflet.Marker; fingerprint: string }>>(
      new Map(),
    );
    const replayMarkerRef = React.useRef<Leaflet.Marker | null>(null);
    const historyRef = React.useRef<HistoryLayerInput | null>(null);
    const cursorRef = React.useRef<number | null>(null);
    const readyRef = React.useRef(false);
    const pendingLiveRef = React.useRef<LiveMarkerDatum[] | null>(null);
    /** Vehicle whose popup is open — its content follows the live feed. */
    const openVehicleRef = React.useRef<string | null>(null);
    const latestLiveRef = React.useRef<Map<string, LiveMarkerDatum>>(new Map());
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

    const rebuildStatic = React.useCallback(() => {
      const h = historyRef.current;
      staticLayersRef.current = h ? buildStaticLayers(h) : [];
    }, []);

    /** Static layers + the replay tail, as the Google host pushes them. */
    const pushLayers = React.useCallback(() => {
      const deck = deckRef.current;
      if (!deck) return;
      const h = historyRef.current;
      if (!h) {
        deck.setProps({ layers: [] });
        return;
      }
      const layers = [...staticLayersRef.current];
      if (h.track && cursorRef.current !== null) {
        layers.push(buildTailLayer(h.track, cursorRef.current));
      }
      deck.setProps({ layers });
    }, []);

    const closeInfo = React.useCallback(() => {
      openVehicleRef.current = null;
      const map = mapRef.current;
      if (map && popupRef.current) map.closePopup(popupRef.current);
    }, []);

    /**
     * Open the one popup at a point, lifted clear of what was tapped. A live
     * refresh of an open vehicle popup (`follow`) moves it without panning
     * the map under the user.
     */
    const openInfo = React.useCallback(
      (html: string, lat: number, lng: number, lift: number, follow = false) => {
        const L = LRef.current;
        const map = mapRef.current;
        const popup = popupRef.current;
        if (!L || !map || !popup) return;
        if (!follow) pickAtRef.current = performance.now();
        popup.options.offset = L.point(0, 7 - lift);
        popup.options.autoPan = !follow;
        popup.setLatLng([lat, lng]).setContent(html);
        if (!map.hasLayer(popup)) popup.openOn(map);
        else popup.update();
      },
      [],
    );

    const applyLive = React.useCallback(
      (data: LiveMarkerDatum[]) => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map || !readyRef.current) {
          pendingLiveRef.current = data;
          return;
        }
        const markers = markersRef.current;
        const seen = new Set<string>();
        const latest = latestLiveRef.current;
        latest.clear();
        for (const datum of data) latest.set(datum.vehicle.id, datum);
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
            if (existing.fingerprint !== fingerprint) {
              existing.marker.setLatLng([lat, lng]);
              existing.marker.setIcon(anchoredIcon(L, chipElement(datum)));
              existing.marker.setZIndexOffset(datum.selected ? 2000 : 1000);
              existing.fingerprint = fingerprint;
            }
            if (openVehicleRef.current === id) {
              openInfo(vehicleInfoHtml(datum, lat, lng), lat, lng, VEHICLE_LIFT, true);
            }
            continue;
          }
          const marker = L.marker([lat, lng], {
            icon: anchoredIcon(L, chipElement(datum)),
            zIndexOffset: datum.selected ? 2000 : 1000,
            keyboard: false,
          }).addTo(map);
          marker.on('click', () => {
            const now = performance.now();
            const isDouble =
              lastPickRef.current.key === `v:${id}` && now - lastPickRef.current.at < 350;
            lastPickRef.current = { key: `v:${id}`, at: now };
            const pos = marker.getLatLng();
            if (isDouble) {
              closeInfo();
              map.setView(pos, Math.max(map.getZoom(), 16));
              return;
            }
            onSelectRef.current(id);
            openVehicleRef.current = id;
            // Render from the newest datum, not the one the click captured.
            const current = latestLiveRef.current.get(id) ?? datum;
            openInfo(vehicleInfoHtml(current, pos.lat, pos.lng), pos.lat, pos.lng, VEHICLE_LIFT);
          });
          markers.set(id, { marker, fingerprint });
        }
        for (const [id, entry] of markers) {
          if (!seen.has(id)) {
            if (openVehicleRef.current === id) closeInfo();
            entry.marker.remove();
            markers.delete(id);
          }
        }
      },
      [closeInfo, openInfo],
    );

    /* Basemap: streets in the app's theme, or imagery with labels. */
    const mapTypeRef = React.useRef<'roadmap' | 'hybrid'>('roadmap');
    const baseLayerRef = React.useRef<Leaflet.LayerGroup | null>(null);
    const applyBase = React.useCallback(() => {
      const L = LRef.current;
      const map = mapRef.current;
      if (!L || !map) return;
      baseLayerRef.current?.remove();
      baseLayerRef.current = basemap(
        L,
        mapTypeRef.current === 'hybrid' ? 'satellite' : 'streets',
      ).addTo(map);
    }, []);

    React.useImperativeHandle(
      ref,
      (): TrackingMapHandle => ({
        setHistory(input) {
          historyRef.current = input;
          if (!input?.track) {
            cursorRef.current = null;
            replayMarkerRef.current?.remove();
            replayMarkerRef.current = null;
          }
          rebuildStatic();
          pushLayers();
        },
        setFollow(on) {
          followRef.current = on;
        },
        setMapType(type) {
          mapTypeRef.current = type;
          applyBase();
        },
        setCursor(ms) {
          cursorRef.current = ms;
          const h = historyRef.current;
          if (!h?.track || ms === null) return;
          pushLayers();
          const L = LRef.current;
          const map = mapRef.current;
          if (!L || !map) return;
          const sample = sampleAt(h.track, ms);
          const now = performance.now();
          if (followRef.current && now - lastPanRef.current > 350) {
            lastPanRef.current = now;
            map.panTo([sample.lat, sample.lng], { animate: true, duration: 0.3 });
          }
          if (!replayMarkerRef.current) {
            replayMarkerRef.current = L.marker([sample.lat, sample.lng], {
              icon: anchoredIcon(L, replayElement()),
              zIndexOffset: 3000,
              interactive: false,
              keyboard: false,
            }).addTo(map);
          } else {
            replayMarkerRef.current.setLatLng([sample.lat, sample.lng]);
          }
          const arrow = replayMarkerRef.current
            .getElement()
            ?.querySelector('[data-arrow]') as HTMLElement | null;
          if (arrow) arrow.style.transform = `rotate(${sample.heading}deg)`;
        },
        setLive: applyLive,
        fitTo(coords) {
          const L = LRef.current;
          const map = mapRef.current;
          if (!L || !map || coords.length === 0) return;
          map.fitBounds(
            L.latLngBounds(coords.map(([lng, lat]) => [lat, lng] as [number, number])),
            {
              padding: [64, 64],
            },
          );
        },
        flyTo(lng, lat, zoom = 15) {
          mapRef.current?.setView([lat, lng], zoom);
        },
      }),
      [applyBase, applyLive, pushLayers, rebuildStatic],
    );

    React.useEffect(() => {
      let cancelled = false;
      const container = containerRef.current;
      let themeObserver: MutationObserver | null = null;
      let resizeObserver: ResizeObserver | null = null;

      void import('leaflet')
        .then(
          (m) =>
            (m as unknown as { default?: LeafletNamespace }).default ?? (m as LeafletNamespace),
        )
        .then((L) => {
          if (cancelled || !container) return;
          injectPopupStyles();
          LRef.current = L;
          const map = L.map(container, {
            center: [FALLBACK_CENTER.lat, FALLBACK_CENTER.lng],
            zoom: 8,
            maxZoom: MAX_ZOOM,
            zoomControl: false,
            attributionControl: true,
            // Double-press on a picked object flies in instead (see click).
            doubleClickZoom: false,
          });
          L.control.zoom({ position: 'bottomright' }).addTo(map);
          mapRef.current = map;
          applyBase();

          // Theme: the street tiles follow light/dark.
          themeObserver = new MutationObserver(() => {
            if (mapTypeRef.current === 'roadmap') applyBase();
          });
          themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
          });

          // Leaflet only hears window resizes; the sidebar collapsing resizes
          // this map without one. invalidateSize fires 'resize', which the
          // Deck canvas follows (see sync below).
          resizeObserver = new ResizeObserver(() => map.invalidateSize());
          resizeObserver.observe(container);

          // The Deck canvas: its own pane above the paths Leaflet draws and
          // below the markers, pinned to the viewport.
          const pane = map.createPane('trk-deck');
          pane.style.zIndex = '450';
          pane.style.pointerEvents = 'none';
          const canvas = document.createElement('canvas');
          canvas.style.position = 'absolute';
          canvas.style.pointerEvents = 'none';
          pane.appendChild(canvas);

          const viewState = () => {
            const c = map.getCenter();
            return {
              longitude: c.lng,
              latitude: c.lat,
              zoom: map.getZoom() + DECK_ZOOM_OFFSET,
              pitch: 0,
              bearing: 0,
            };
          };
          const size0 = map.getSize();
          const deck = new Deck({
            canvas,
            width: size0.x,
            height: size0.y,
            viewState: viewState(),
            controller: false,
            layers: [],
          });
          deckRef.current = deck;

          const sync = () => {
            const size = map.getSize();
            L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
            deck.setProps({ width: size.x, height: size.y, viewState: viewState() });
          };
          sync();
          map.on('move resize viewreset', sync);
          // Leaflet animates a zoom by scaling its tiles; the GPU layers
          // step aside for those 250 ms and return at the new zoom.
          map.on('zoomstart', () => {
            canvas.style.visibility = 'hidden';
          });
          map.on('zoomend', () => {
            sync();
            canvas.style.visibility = '';
          });

          popupRef.current = L.popup({
            closeButton: false,
            autoPan: true,
            autoPanPadding: [24, 24],
            maxWidth: 280,
            className: 'trk-leaflet-popup',
          });

          const pick = (p: Leaflet.Point, radius: number) => {
            try {
              return deck.pickObject({ x: p.x, y: p.y, radius }) as {
                object?: unknown;
                layer?: { id: string } | null;
                coordinate?: number[];
              } | null;
            } catch {
              return null; // picking unavailable — ignore
            }
          };

          map.on('click', (e: Leaflet.LeafletMouseEvent) => {
            const info = pick(e.containerPoint, 6);
            if (!info?.object || !info.layer || !info.coordinate) {
              // An empty spot closes the popup — unless a marker just opened it.
              if (performance.now() - pickAtRef.current > 250) closeInfo();
              return;
            }
            const [lng, lat] = info.coordinate;
            const key = `${info.layer.id}:${lng.toFixed(6)},${lat.toFixed(6)}`;
            const now = performance.now();
            const isDouble = lastPickRef.current.key === key && now - lastPickRef.current.at < 350;
            lastPickRef.current = { key, at: now };
            if (isDouble) {
              closeInfo();
              map.setView([lat, lng], Math.max(map.getZoom(), 16));
              return;
            }
            if (isLegLayer(info.layer.id)) {
              onActivateLegRef.current?.(legId(info.object as LegSegment));
            }
            const html = pickInfoHtml(info.layer.id, info.object, lat, lng);
            if (html) {
              openVehicleRef.current = null;
              openInfo(html, lat, lng, pickInfoLift(info.layer.id));
            }
          });

          // A pointer over a pickable object reads as clickable.
          let hoverFrame = 0;
          map.on('mousemove', (e: Leaflet.LeafletMouseEvent) => {
            if (hoverFrame) return;
            const p = e.containerPoint;
            hoverFrame = window.requestAnimationFrame(() => {
              hoverFrame = 0;
              container.style.cursor = pick(p, 2)?.object ? 'pointer' : '';
            });
          });
          map.on('dragstart', () => onUserPanRef.current?.());

          readyRef.current = true;
          rebuildStatic();
          if (pendingLiveRef.current) {
            applyLive(pendingLiveRef.current);
            pendingLiveRef.current = null;
          }
          pushLayers();
          onMapReady?.();
        });

      const markers = markersRef.current;
      return () => {
        cancelled = true;
        themeObserver?.disconnect();
        resizeObserver?.disconnect();
        openVehicleRef.current = null;
        for (const { marker } of markers.values()) marker.remove();
        markers.clear();
        replayMarkerRef.current?.remove();
        replayMarkerRef.current = null;
        deckRef.current?.finalize();
        deckRef.current = null;
        mapRef.current?.remove();
        mapRef.current = null;
        popupRef.current = null;
        baseLayerRef.current = null;
        readyRef.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // `isolate`: Leaflet's panes and controls (z-index 400-1000) stay inside
    // the map, under the page's own overlays (as on Google).
    return <div ref={containerRef} className={cn('isolate', className)} />;
  },
);

export default LeafletTrackingHost;
