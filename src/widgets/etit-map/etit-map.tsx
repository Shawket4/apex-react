import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MapView } from '@/shared/ui/map-view';
import { DEFAULT_MAP_CENTER, isValidCoordinate } from '@/shared/lib/coords';
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
/* Marker palette                                                              */
/* -------------------------------------------------------------------------- */

const PLAYBACK_NORMAL = '#2563EB';
const PLAYBACK_SPEEDING = '#DC2626';
const STOP_COLOR = '#9333EA';
const IGNITION_ON_COLOR = '#16A34A';
const IGNITION_OFF_COLOR = '#64748B';

/* -------------------------------------------------------------------------- */
/* Sensor classification                                                       */
/*                                                                             *
 * The proxy relays the upstream's sensor event names verbatim. We classify   *
 * by substring match on the localized + raw type name; anything that's      *
 * neither ignition-on nor ignition-off is treated as a generic event and    *
 * skipped (we don't want to render door/temperature/odometer sensors with  *
 * an ignition icon).                                                        *
 * -------------------------------------------------------------------------- */

type IgnitionKind = 'ignition-on' | 'ignition-off' | null;

function classifySensor(name: string): IgnitionKind {
  const s = name.toLowerCase();
  if (s.includes('ignition off') || s.includes('engine off') || s.includes('تشغيل المحرك')) {
    // Some Arabic feeds label the off event ambiguously — fall through.
  }
  if (s.includes('off') || s.includes('إيقاف')) return 'ignition-off';
  if (s.includes('on') || s.includes('تشغيل')) return 'ignition-on';
  return null;
}

/* -------------------------------------------------------------------------- */
/* Heading interpolation for the playback marker                               */
/* -------------------------------------------------------------------------- */

function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface EtitMapProps {
  vehicles: EtitVehicle[];
  liveStatuses: EtitLiveStatus[];
  /** Vehicles to render as markers on the map (multi-select from the list). */
  visibleIds: Set<string>;
  /** Optional: vehicle whose route is currently being investigated. */
  activeVehicleId?: string | null;
  /** Optional: vehicle to camera-fly to when `focusBump` increments. */
  focusedVehicleId?: string | null;
  /** Bump this to re-focus the camera on the focused vehicle. */
  focusBump?: number;
  /** Decoded polyline for the loaded history range. */
  route?: Array<[number, number]>;
  /** Stops — rendered as purple stop badges when `showStops` is true. */
  stops?: EtitStop[];
  /** Sensor events — rendered as ignition badges when `showIgnitions` is true. */
  sensors?: EtitSensorEvent[];
  /** Conditional overlays. */
  showStops?: boolean;
  showIgnitions?: boolean;
  /** Playback marker — rendered above all others when supplied. */
  playback?: PlaybackState | null;
  /** Optional previous playback state for heading interpolation. */
  playbackPrev?: { lat: number; lng: number } | null;
  className?: string;
  height?: number | string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

function EtitMapBase({
  vehicles,
  liveStatuses,
  visibleIds,
  activeVehicleId = null,
  focusedVehicleId = null,
  focusBump = 0,
  route = [],
  stops = [],
  sensors = [],
  showStops = true,
  showIgnitions = false,
  playback = null,
  playbackPrev = null,
  className,
  height = 600,
}: EtitMapProps) {
  const { t } = useTranslation();

  const plateById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vehicles) {
      if (v.plate) m.set(v.id, v.plate);
      else if (v.codename) m.set(v.id, v.codename);
    }
    return m;
  }, [vehicles]);

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

  /* -------- Camera focus via fingerprint sentinel ----------------------- */
  /*
   * The map only refits when its bounds fingerprint changes. To force a
   * re-focus when the user clicks a crosshair (even on the same vehicle),
   * we mix the `focusBump` into a sentinel marker id that has zero size
   * and `affectsBounds: true`. The fingerprint changes → fitBounds runs.
   */
  const focusSentinel = React.useMemo<MapMarker | null>(() => {
    if (!focusedVehicleId) return null;
    const live = liveStatuses.find((s) => s.id === focusedVehicleId);
    if (!live) return null;
    if (!isValidCoordinate(live.lat, live.lng)) return null;
    return {
      id: `focus-sentinel-${focusBump}`,
      lat: live.lat,
      lng: live.lng,
      color: 'transparent',
      kind: 'invisible',
      title: '',
      // When focusing, this sentinel should be the ONLY thing affecting bounds
      // if we want a clean snap-to-vehicle. 
      affectsBounds: true,
    };
  }, [focusedVehicleId, focusBump, liveStatuses]);

  /* -------- Vehicle markers (only the ones the user toggled on) -------- */

  const markers = React.useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];

    for (const s of liveStatuses) {
      if (!visibleIds.has(s.id)) continue;
      if (!isValidCoordinate(s.lat, s.lng)) continue;

      // When a route is displayed, the "live" marker for the active vehicle 
      // (the one the route belongs to) is often confusing.
      if (route.length > 0 && s.id === activeVehicleId) continue;

      const group = classifyStatus(s.status);
      const plate = plateById.get(s.id) ?? s.plate ?? s.id;
      const heading =
        typeof (s as { heading?: number }).heading === 'number'
          ? ((s as { heading?: number }).heading ?? 0)
          : 0;
      out.push({
        id: `live-${s.id}`,
        lat: s.lat,
        lng: s.lng,
        color: ETIT_STATUS_COLOR[group],
        kind: 'vehicle',
        heading,
        // If we are focusing, we suppress other markers' contribution to bounds
        // so the camera snaps tightly to the sentinel.
        affectsBounds: !focusSentinel,
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

    // Route endpoints
    if (route.length > 0) {
      out.push({
        id: 'route-start',
        lat: route[0][0],
        lng: route[0][1],
        color: '#16A34A',
        kind: 'route-start',
        affectsBounds: !focusSentinel,
      });
      out.push({
        id: 'route-end',
        lat: route[route.length - 1][0],
        lng: route[route.length - 1][1],
        color: '#DC2626',
        kind: 'route-end',
        affectsBounds: !focusSentinel,
      });
    }

    // Stops
    if (showStops) {
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        if (!isValidCoordinate(s.lat, s.lng)) continue;
        out.push({
          id: `stop-${i}`,
          lat: s.lat,
          lng: s.lng,
          color: STOP_COLOR,
          kind: 'stop',
          affectsBounds: !focusSentinel,
          title: `${labels.stopHeading} · ${s.duration}`,
          popupHtml: buildStopPopup(s, labels),
        });
      }
    }

    // Sensor events (ignition only)
    if (showIgnitions) {
      for (let i = 0; i < sensors.length; i++) {
        const s = sensors[i];
        if (!isValidCoordinate(s.lat, s.lng)) continue;
        const kind = classifySensor(s.typeName);
        if (!kind) continue;
        out.push({
          id: `sensor-${i}`,
          lat: s.lat,
          lng: s.lng,
          color: kind === 'ignition-on' ? IGNITION_ON_COLOR : IGNITION_OFF_COLOR,
          kind,
          affectsBounds: !focusSentinel,
          title: s.typeName,
          popupHtml: buildSensorPopup(s),
        });
      }
    }

    // Playback marker — never affects bounds, never sorts into auto-fit.
    if (playback) {
      const heading = playbackPrev
        ? bearing(playbackPrev, { lat: playback.lat, lng: playback.lng })
        : 0;
      out.push({
        id: 'playback-current',
        lat: playback.lat,
        lng: playback.lng,
        color: playback.speeding ? PLAYBACK_SPEEDING : PLAYBACK_NORMAL,
        kind: 'vehicle',
        heading,
        affectsBounds: false,
        title: `${Math.round(playback.speed)} ${labels.kmh} · ${formatCairo(playback.timestamp, 'time')}`,
        popupHtml: buildPlaybackPopup(playback, labels),
      });
    }

    if (focusSentinel) out.push(focusSentinel);

    return out;
  }, [
    liveStatuses,
    visibleIds,
    plateById,
    showStops,
    stops,
    showIgnitions,
    sensors,
    playback,
    playbackPrev,
    focusSentinel,
    labels,
  ]);

  const centerFallback = React.useMemo<[number, number]>(() => {
    // If we have a route, the user is likely investigating it; center on start.
    if (route.length > 0) return route[0];
    if (markers.length > 0) return [markers[0].lat, markers[0].lng];
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
      liveUpdates
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Popup builders                                                              */
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
    <div style="padding:14px 14px 12px;min-width:200px;font-family:inherit">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>
        <span style="font-size:13px;font-weight:600">${escapeHtml(plate)}</span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-bottom:8px">${escapeHtml(statusLabel)}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#52525b">
        <span>${escapeHtml(labels.speed)}</span>
        <span style="font-weight:600;color:#27272a">${speed} ${escapeHtml(labels.kmh)}</span>
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
        <span>${escapeHtml(labels.speed)}</span>
        <span style="font-weight:600;color:${speedColor}">${Math.round(p.speed)} ${escapeHtml(labels.kmh)}</span>
      </div>
      ${
        p.speedLimit > 0
          ? `<div style="display:flex;justify-content:space-between;font-size:11px;color:#52525b;margin-top:2px">
              <span>${escapeHtml(labels.limit)}</span><span>${p.speedLimit} ${escapeHtml(labels.kmh)}</span>
            </div>`
          : ''
      }
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#71717a;margin-top:2px">
        <span>${escapeHtml(labels.time)}</span><span>${escapeHtml(formatCairo(p.timestamp, 'time'))}</span>
      </div>
    </div>
  `;
}
export const EtitMap = React.memo(EtitMapBase);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
