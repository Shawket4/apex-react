import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MapView } from '@/shared/ui/map-view';
import { DEFAULT_MAP_CENTER } from '@/shared/lib/coords';
import type { MapMarker } from '@/shared/lib/maps/types';
import { formatCairo } from '@/entities/etit-vehicle/cairo';
import {
  classifyStatus,
  ETIT_STATUS_COLOR,
  type EtitLiveStatus,
  type EtitSensorEvent,
  type EtitStop,
  type EtitVehicle,
} from '@/entities/etit-vehicle/schemas';
import type { PlaybackState } from '@/entities/etit-vehicle/playback';

/* -------------------------------------------------------------------------- */
/* Marker colours / icons                                                      */
/* -------------------------------------------------------------------------- */

const PLAYBACK_MARKER_COLOR = '#2563EB'; // blue-600
const STOP_MARKER_COLOR = '#9333EA';     // purple-600
const SENSOR_MARKER_COLOR = '#0891B2';   // cyan-600

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface EtitMapProps {
  /** Full vehicle list — used to pluck plate/codename for popups. */
  vehicles: EtitVehicle[];

  /** Current live snapshot. Renders one marker per vehicle with a valid coord. */
  liveStatuses: EtitLiveStatus[];

  /** When set, renders only this vehicle's live marker (focus mode). */
  focusedVehicleId?: string | null;

  /**
   * Decoded polyline for the loaded history range (lat, lng pairs). Pass an
   * empty array (or omit) when no history is loaded.
   */
  route?: Array<[number, number]>;

  /** Stops to render as purple pins with popups. */
  stops?: EtitStop[];

  /** Sensor events (ignition on/off, etc.) — rendered as cyan pins. */
  sensors?: EtitSensorEvent[];

  /** Playback marker — when supplied, renders at the interpolated position. */
  playback?: PlaybackState | null;

  /**
   * Bumping this number forces the map to re-fit — the underlying MapView
   * already re-fits whenever the markers prop changes by reference, but
   * for the "click focus" UX we sometimes want to re-center to the same
   * marker that's already there. We mix the key into a sentinel marker
   * so the prop reference changes.
   */
  focusBump?: number;

  className?: string;
  height?: number | string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function EtitMap({
  vehicles,
  liveStatuses,
  focusedVehicleId = null,
  route = [],
  stops = [],
  sensors = [],
  playback = null,
  focusBump = 0,
  className,
  height = 600,
}: EtitMapProps) {
  const { t } = useTranslation();

  // Plate lookup so popups show "ABC 123" not the opaque uuid.
  const plateById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vehicles) {
      if (v.plate) m.set(v.id, v.plate);
      else if (v.codename) m.set(v.id, v.codename);
    }
    return m;
  }, [vehicles]);

  // Localized labels — capture once per render so popup builders are pure
  // strings and don't need to re-call the t() function on every keystroke.
  const labels = React.useMemo(
    () => ({
      speed: t('etit.map.popup.speed'),
      lastSeen: t('etit.map.popup.lastSeen'),
      from: t('etit.map.popup.from'),
      to: t('etit.map.popup.to'),
      time: t('etit.map.popup.time'),
      limit: t('etit.map.popup.limit'),
      stopHeading: t('etit.map.popup.stopHeading'),
      unknownLocation: t('etit.map.popup.unknownLocation'),
      playbackHeading: t('etit.map.popup.playback'),
      kmh: t('etit.units.kmh'),
    }),
    [t],
  );

  /* -------- Markers ---------------------------------------------------- */

  const markers = React.useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];

    // Live vehicles (filtered by focus when set)
    for (const s of liveStatuses) {
      if (focusedVehicleId && s.id !== focusedVehicleId) continue;
      // Skip vehicles with no real coord — backends sometimes emit (0,0).
      if (s.lat === 0 && s.lng === 0) continue;

      const group = classifyStatus(s.status);
      const plate = plateById.get(s.id) ?? s.plate ?? s.id;
      out.push({
        id: `live-${s.id}-${focusBump}`,
        lat: s.lat,
        lng: s.lng,
        color: ETIT_STATUS_COLOR[group],
        title: plate,
        popupHtml: buildLivePopup({
          plate,
          statusLabel: s.statusLabel,
          speed: s.speed,
          timestamp: s.timestamp,
          event: s.event ?? null,
          color: ETIT_STATUS_COLOR[group],
          labels,
        }),
      });
    }

    // Stops
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      out.push({
        id: `stop-${i}`,
        lat: s.lat,
        lng: s.lng,
        color: STOP_MARKER_COLOR,
        title: `${labels.stopHeading} · ${s.duration}`,
        popupHtml: buildStopPopup(s, labels),
      });
    }

    // Sensor events
    for (let i = 0; i < sensors.length; i++) {
      const s = sensors[i];
      out.push({
        id: `sensor-${i}`,
        lat: s.lat,
        lng: s.lng,
        color: SENSOR_MARKER_COLOR,
        title: s.typeName,
        popupHtml: buildSensorPopup(s),
      });
    }

    // Playback marker — drawn last so it sits above all the others.
    if (playback) {
      out.push({
        id: `playback-${focusBump}`,
        lat: playback.lat,
        lng: playback.lng,
        color: playback.speeding ? '#DC2626' : PLAYBACK_MARKER_COLOR,
        title: `${Math.round(playback.speed)} ${labels.kmh} · ${formatCairo(playback.timestamp, 'time')}`,
        popupHtml: buildPlaybackPopup(playback, labels),
      });
    }

    return out;
    // We intentionally include focusBump so a re-focus on the same vehicle
    // produces a new marker reference and the map re-fits.
  }, [liveStatuses, focusedVehicleId, plateById, stops, sensors, playback, focusBump, labels]);

  /* -------- Centre fallback ------------------------------------------- */

  const centerFallback = React.useMemo<[number, number]>(() => {
    // If we know where to go, use it. Otherwise default to Cairo.
    if (markers.length > 0) return [markers[0].lat, markers[0].lng];
    if (route.length > 0) return route[0];
    return DEFAULT_MAP_CENTER;
  }, [markers, route]);

  return (
    <MapView
      markers={markers}
      route={route}
      suppressRoute={route.length === 0}
      centerFallback={centerFallback}
      className={className}
      height={height}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Popup HTML builders                                                         */
/*                                                                             */
/* Inline strings so they pass through both the Google InfoWindow and the    */
/* Leaflet popup unchanged. Safe because every value we interpolate is        */
/* either numeric or has been escaped — see `escapeHtml` below.              */
/* -------------------------------------------------------------------------- */

interface PopupLabels {
  speed: string;
  lastSeen: string;
  from: string;
  to: string;
  time: string;
  limit: string;
  stopHeading: string;
  unknownLocation: string;
  playbackHeading: string;
  kmh: string;
}

interface LivePopupArgs {
  plate: string;
  statusLabel: string;
  speed: number;
  timestamp: Date | null;
  event: string | null;
  color: string;
  labels: PopupLabels;
}

function buildLivePopup({
  plate,
  statusLabel,
  speed,
  timestamp,
  event,
  color,
  labels,
}: LivePopupArgs): string {
  const time = timestamp ? formatCairo(timestamp, 'datetime') : '—';
  return `
    <div style="padding:14px 14px 12px;min-width:180px;font-family:inherit">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>
        <span style="font-size:13px;font-weight:600">${escapeHtml(plate)}</span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-bottom:8px">${escapeHtml(statusLabel)}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#52525b">
        <span>${escapeHtml(labels.speed)}</span><span style="font-weight:600;color:#27272a">${speed} ${escapeHtml(labels.kmh)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#52525b;margin-top:2px">
        <span>${escapeHtml(labels.lastSeen)}</span><span>${escapeHtml(time)}</span>
      </div>
      ${
        event
          ? `<div style="margin-top:8px;padding:4px 6px;background:#f4f4f5;border-radius:4px;font-size:10px;color:#3f3f46">${escapeHtml(event)}</div>`
          : ''
      }
    </div>
  `;
}

function buildStopPopup(stop: EtitStop, labels: PopupLabels): string {
  return `
    <div style="padding:14px 14px 12px;min-width:200px;font-family:inherit">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">${escapeHtml(labels.stopHeading)} · ${escapeHtml(stop.duration)}</div>
      <div style="font-size:11px;color:#52525b;margin-bottom:6px">${escapeHtml(stop.address || labels.unknownLocation)}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#71717a">
        <span>${escapeHtml(labels.from)}</span><span>${escapeHtml(formatCairo(stop.from, 'time'))}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#71717a">
        <span>${escapeHtml(labels.to)}</span><span>${escapeHtml(formatCairo(stop.to, 'time'))}</span>
      </div>
    </div>
  `;
}

function buildSensorPopup(s: EtitSensorEvent): string {
  return `
    <div style="padding:14px 14px 12px;min-width:160px;font-family:inherit">
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">${escapeHtml(s.typeName)}</div>
      <div style="font-size:11px;color:#71717a">${escapeHtml(formatCairo(s.timestamp, 'datetime'))}</div>
    </div>
  `;
}

function buildPlaybackPopup(p: PlaybackState, labels: PopupLabels): string {
  const speedColor = p.speeding ? '#dc2626' : '#27272a';
  return `
    <div style="padding:14px 14px 12px;min-width:160px;font-family:inherit">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">${escapeHtml(labels.playbackHeading)}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#52525b">
        <span>${escapeHtml(labels.speed)}</span><span style="font-weight:600;color:${speedColor}">${Math.round(p.speed)} ${escapeHtml(labels.kmh)}</span>
      </div>
      ${
        p.speedLimit > 0
          ? `<div style="display:flex;justify-content:space-between;font-size:11px;color:#52525b;margin-top:2px"><span>${escapeHtml(labels.limit)}</span><span>${p.speedLimit} ${escapeHtml(labels.kmh)}</span></div>`
          : ''
      }
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#71717a;margin-top:2px">
        <span>${escapeHtml(labels.time)}</span><span>${escapeHtml(formatCairo(p.timestamp, 'time'))}</span>
      </div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
