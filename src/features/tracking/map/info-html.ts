import i18n from '@/shared/i18n';
import { buildMarkerSvg, markerSize } from '@/shared/lib/maps/marker-svg';
import { STATUS_COLOR, statusGroup } from '../schemas';
import type { SensorEvent, Stop } from '../schemas';
import type { LegSegment } from '../use-history';
import type { PinCluster } from './layers';
import type { LiveMarkerDatum } from './types';

/* -------------------------------------------------------------------------- */
/* What the tracking map draws in the DOM, whichever map is underneath: the    */
/* vehicle chips, the replay marker, and the one tooltip card every pick       */
/* opens. Shared by the Google host and the Leaflet host.                      */
/* -------------------------------------------------------------------------- */

function digits(plate: string): string {
  const d = plate.replace(/\D/g, '');
  return d || plate.trim();
}

/** A live vehicle renders as the ORIGINAL vehicle marker SVG with the plate
 *  digits chip beneath it — the artwork the fleet already knows. */
export function chipElement(datum: LiveMarkerDatum): HTMLElement {
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
export function replayElement(): HTMLElement {
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

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
const dimRow = (html: string) =>
  `<div style="color:hsl(var(--muted-foreground));line-height:1.45">${html}</div>`;

export function vehicleInfoHtml(datum: LiveMarkerDatum, lat: number, lng: number): string {
  const live = datum.live;
  return tipShell(
    `<span style="font:600 14px 'IBM Plex Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums">${esc(datum.vehicle.plate)}</span>`,
    [
      row(esc(live?.statusLabel ?? datum.vehicle.statusLabel)),
      live && live.speed > 0
        ? row(`${Math.round(live.speed)} ${esc(i18n.t('tracking.kmh', 'km/h'))}`)
        : '',
      live?.timestamp || datum.vehicle.lastLocationAt
        ? dimRow(infoTimeFmt.format((live?.timestamp ?? datum.vehicle.lastLocationAt)!))
        : '',
    ],
    lat,
    lng,
  );
}

export function stopInfoHtml(stop: Stop): string {
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
export function pinInfoHtml(cluster: PinCluster): string {
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

export function legInfoHtml(seg: LegSegment, lat: number, lng: number): string {
  const l = seg.leg;
  return tipShell(
    `${esc(l.fromName ?? '—')} → ${esc(l.toName ?? '—')}`,
    [
      dimRow(`${esc(l.legType)} · #${l.parentTripId}·${l.seq}`),
      row(
        `<span dir="ltr">${infoTimeFmt.format(l.depart)} → ${infoTimeFmt.format(l.arrive)}</span>`,
      ),
      l.actualKm != null
        ? row(`<b>${l.actualKm.toFixed(1)} ${esc(i18n.t('tracking.km', 'km'))}</b>`)
        : '',
      l.actualSecs != null ? row(fmtDwell(l.actualSecs)) : '',
      seg.cutStart || seg.cutEnd
        ? `<div style="color:hsl(var(--warning));line-height:1.45">⟷ ${esc(i18n.t('tracking.beyondRangeLine', 'continues beyond the loaded range'))}</div>`
        : '',
    ],
    lat,
    lng,
  );
}

export function sensorInfoHtml(ev: SensorEvent): string {
  return tipShell(esc(ev.typeName), [dimRow(infoTimeFmt.format(ev.timestamp))], ev.lat, ev.lng);
}

export function endpointInfoHtml(
  kind: 'route-start' | 'route-end',
  lat: number,
  lng: number,
): string {
  const label =
    kind === 'route-start'
      ? i18n.t('tracking.routeStart', 'Route start')
      : i18n.t('tracking.routeEnd', 'Route end');
  return tipShell(esc(label), [], lat, lng);
}

/**
 * The tooltip for a deck.gl pick on the history layers, by layer id; null for
 * layers that have none.
 */
export function pickInfoHtml(
  layerId: string,
  object: unknown,
  lat: number,
  lng: number,
): string | null {
  switch (layerId) {
    case 'stops':
      return stopInfoHtml(object as Stop);
    case 'sensors':
      return sensorInfoHtml(object as SensorEvent);
    case 'trip-pins':
      return pinInfoHtml(object as PinCluster);
    case 'endpoints':
      return endpointInfoHtml((object as { kind: 'route-start' | 'route-end' }).kind, lat, lng);
    case 'legs':
    case 'legs-garage':
      return legInfoHtml(object as LegSegment, lat, lng);
    default:
      return null;
  }
}

/** How far above the picked point its tooltip sits, clear of the artwork. */
export function pickInfoLift(layerId: string): number {
  return layerId === 'trip-pins' || layerId === 'endpoints' ? 30 : 14;
}

/** The leg layers: tapping one activates the leg. */
export function isLegLayer(layerId: string): boolean {
  return layerId === 'legs' || layerId === 'legs-garage';
}
