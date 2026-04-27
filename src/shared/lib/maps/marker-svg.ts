import type { MarkerKind } from './types';

/**
 * Build a marker SVG as a data URL.
 *
 * One factory, one visual language. Both Google and Leaflet render the
 * same SVG, so a fallback transition between providers is invisible.
 *
 * Every <defs> id is suffixed from the caller-supplied `filterId` —
 * multiple inline SVGs in one document with duplicate ids cause SVG to
 * apply each def only to the first match (silent rendering bug).
 */
export function buildMarkerSvg(
  color: string,
  filterId: string,
  kind: MarkerKind = 'pin',
  heading = 0,
): string {
  const builder = BUILDERS[kind] ?? BUILDERS.pin;
  const svg = builder(color, filterId, heading);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

type Builder = (color: string, id: string, heading: number) => string;

const BUILDERS: Record<MarkerKind, Builder> = {
  pin: pinSvg,
  vehicle: vehicleSvg,
  stop: stopSvg,
  'ignition-on': (c, id) => ignitionSvg(c, id, true),
  'ignition-off': (c, id) => ignitionSvg(c, id, false),
  'route-start': routeStartSvg,
  'route-end': routeEndSvg,
};

/* -------------------------------------------------------------------------- */
/* Shared visual ingredients                                                   */
/*                                                                             */
/* Centralising these is what gives the markers a coherent feel — every kind  */
/* gets the same shadow recipe and the same top-light sheen.                  */
/* -------------------------------------------------------------------------- */

function shadowDef(id: string): string {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="0" dy="1.4" stdDeviation="1.6" flood-color="#0b1620" flood-opacity="0.32"/>
  </filter>`;
}

/** Top-light gradient. Layered over a flat fill it gives a "molded" feel. */
function sheenDef(id: string): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="white" stop-opacity="0.32"/>
    <stop offset="55%" stop-color="white" stop-opacity="0"/>
    <stop offset="100%" stop-color="black" stop-opacity="0.18"/>
  </linearGradient>`;
}

/* -------------------------------------------------------------------------- */
/* Pin (teardrop, anchored at the tip)                                         */
/* -------------------------------------------------------------------------- */

function pinSvg(color: string, filterId: string): string {
  const sId = `${filterId}-s`;
  const gId = `${filterId}-g`;
  const body =
    'M13 1.5C6.65 1.5 1.5 6.65 1.5 13C1.5 21.5 13 32.5 13 32.5' +
    'C13 32.5 24.5 21.5 24.5 13C24.5 6.65 19.35 1.5 13 1.5Z';
  return `<svg width="26" height="34" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>${shadowDef(sId)}${sheenDef(gId)}</defs>
    <g filter="url(#${sId})">
      <path d="${body}" fill="${color}"/>
    </g>
    <path d="${body}" fill="url(#${gId})"/>
    <circle cx="13" cy="13" r="4.4" fill="white"/>
  </svg>`;
}

/* -------------------------------------------------------------------------- */
/* Vehicle (top-down tanker; rotates with heading around the centre)           */
/*                                                                             */
/* The silhouette is a single combined path so cab + tank read as one truck   */
/* rather than two floating boxes. Going clockwise from the cab top-left:     */
/*                                                                             */
/*   start ──┐                                                                 */
/*           ├── rounded cab top                                               */
/*           │                                                                 */
/*           ├── cab side, then a sharp step out to the wider tank            */
/*           │                                                                 */
/*           ╰── tank side, then a half-circle around the rear                */
/*                                                                             */
/* Front = up at heading 0 (north). Anchor is centre — that's the GPS fix.    */
/* -------------------------------------------------------------------------- */

function vehicleSvg(color: string, filterId: string, heading: number): string {
  const sId = `${filterId}-s`;
  const tId = `${filterId}-t`;
  const cId = `${filterId}-c`;
  const rotation = Number.isFinite(heading) ? heading : 0;

  // Single combined silhouette: rounded cab on top, step out to the wider
  // tank, half-circle rear. Drawn once for the white outline (stroke) and
  // again for the colour fill — avoids a visible seam at the cab/tank joint.
  const body =
    'M16.5 4 H23.5 ' +
    'A2.5 2.5 0 0 1 26 6.5 V12 ' +
    'H29 V27 ' +
    'A9 9 0 0 1 11 27 V12 ' +
    'H14 V6.5 ' +
    'A2.5 2.5 0 0 1 16.5 4 Z';

  return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      ${shadowDef(sId)}
      <linearGradient id="${cId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="white" stop-opacity="0.34"/>
        <stop offset="55%" stop-color="white" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.22"/>
      </linearGradient>
      <linearGradient id="${tId}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="white" stop-opacity="0"/>
        <stop offset="50%" stop-color="white" stop-opacity="0.20"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <g filter="url(#${sId})">
      <g transform="rotate(${rotation} 20 20)">
        <!-- white halo (outline) -->
        <path d="${body}" fill="white" stroke="white" stroke-width="3" stroke-linejoin="round"/>
        <!-- body fill -->
        <path d="${body}" fill="${color}"/>
        <!-- top-light molding -->
        <path d="${body}" fill="url(#${cId})"/>
        <!-- vertical highlight stripe down the tank suggests cylindrical curve -->
        <rect x="13.5" y="14" width="13" height="20" fill="url(#${tId})"/>
        <!-- windshield: the strongest "front" cue -->
        <rect x="15" y="6" width="10" height="2.6" rx="1.3" fill="white" fill-opacity="0.92"/>
        <!-- headlights -->
        <circle cx="16" cy="11" r="0.85" fill="white" fill-opacity="0.95"/>
        <circle cx="24" cy="11" r="0.85" fill="white" fill-opacity="0.95"/>
      </g>
    </g>
  </svg>`;
}

/* -------------------------------------------------------------------------- */
/* Stop (rounded square with pause glyph)                                      */
/*                                                                             */
/* Square instead of round so it reads differently from the vehicle marker    */
/* at a glance — important when both kinds appear on the same map.            */
/* -------------------------------------------------------------------------- */

function stopSvg(color: string, filterId: string): string {
  const sId = `${filterId}-s`;
  const gId = `${filterId}-g`;
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>${shadowDef(sId)}${sheenDef(gId)}</defs>
    <g filter="url(#${sId})">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="white"/>
    </g>
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.8" fill="${color}"/>
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.8" fill="url(#${gId})"/>
    <rect x="8" y="7.2" width="2.6" height="9.6" rx="0.9" fill="white"/>
    <rect x="13.4" y="7.2" width="2.6" height="9.6" rx="0.9" fill="white"/>
  </svg>`;
}

/* -------------------------------------------------------------------------- */
/* Ignition (universal power glyph; "off" gets a haloed slash)                 */
/*                                                                             */
/* The slash is drawn as a dark wide stroke beneath a thinner white stroke    */
/* — gives it a visible "knocked-out" edge against the power symbol so it     */
/* doesn't mush together with the glyph when colours don't contrast enough.   */
/* -------------------------------------------------------------------------- */

function ignitionSvg(color: string, filterId: string, on: boolean): string {
  const sId = `${filterId}-s`;
  const gId = `${filterId}-g`;
  const slash = on
    ? ''
    : `<line x1="6" y1="6" x2="18" y2="18" stroke="#0b1620" stroke-opacity="0.55" stroke-width="3.6" stroke-linecap="round"/>
       <line x1="6" y1="6" x2="18" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>`;
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>${shadowDef(sId)}${sheenDef(gId)}</defs>
    <g filter="url(#${sId})">
      <circle cx="12" cy="12" r="10" fill="white"/>
    </g>
    <circle cx="12" cy="12" r="8.6" fill="${color}"/>
    <circle cx="12" cy="12" r="8.6" fill="url(#${gId})"/>
    <path d="M8.4 8.6 A 5 5 0 1 0 15.6 8.6"
          stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
    <line x1="12" y1="6.6" x2="12" y2="12.4"
          stroke="white" stroke-width="2" stroke-linecap="round"/>
    ${slash}
  </svg>`;
}

/* -------------------------------------------------------------------------- */
/* Route endpoints                                                             */
/*                                                                             */
/* Pair design: start = play triangle, end = solid square. They mirror the    */
/* media-player metaphor everyone already knows, and stay legible when both   */
/* are dropped at zoomed-out map levels.                                      */
/* -------------------------------------------------------------------------- */

function routeStartSvg(color: string, filterId: string): string {
  const sId = `${filterId}-s`;
  const gId = `${filterId}-g`;
  return `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>${shadowDef(sId)}${sheenDef(gId)}</defs>
    <g filter="url(#${sId})">
      <circle cx="14" cy="14" r="12" fill="white"/>
    </g>
    <circle cx="14" cy="14" r="10.6" fill="${color}"/>
    <circle cx="14" cy="14" r="10.6" fill="url(#${gId})"/>
    <path d="M11.5 9.5 L19 14 L11.5 18.5 Z"
          fill="white" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;
}

function routeEndSvg(color: string, filterId: string): string {
  const sId = `${filterId}-s`;
  const gId = `${filterId}-g`;
  return `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>${shadowDef(sId)}${sheenDef(gId)}</defs>
    <g filter="url(#${sId})">
      <circle cx="14" cy="14" r="12" fill="white"/>
    </g>
    <circle cx="14" cy="14" r="10.6" fill="${color}"/>
    <circle cx="14" cy="14" r="10.6" fill="url(#${gId})"/>
    <rect x="9.5" y="9.5" width="9" height="9" rx="1.4" fill="white"/>
  </svg>`;
}

/* -------------------------------------------------------------------------- */
/* Per-kind sizing                                                             */
/* -------------------------------------------------------------------------- */

export interface MarkerSize {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

const SIZES: Record<MarkerKind, MarkerSize> = {
  pin: { width: 26, height: 34, anchorX: 13, anchorY: 34 },
  vehicle: { width: 40, height: 40, anchorX: 20, anchorY: 20 },
  stop: { width: 24, height: 24, anchorX: 12, anchorY: 12 },
  'ignition-on': { width: 24, height: 24, anchorX: 12, anchorY: 12 },
  'ignition-off': { width: 24, height: 24, anchorX: 12, anchorY: 12 },
  'route-start': { width: 28, height: 28, anchorX: 14, anchorY: 14 },
  'route-end': { width: 28, height: 28, anchorX: 14, anchorY: 14 },
};

export function markerSize(kind: MarkerKind = 'pin'): MarkerSize {
  return SIZES[kind] ?? SIZES.pin;
}

/** @deprecated use `markerSize(kind)` instead. Retained for back-compat. */
export const MARKER_SIZE = SIZES.pin;