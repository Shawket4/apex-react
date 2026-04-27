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
/* Vehicle (teardrop pin with a truck diagram in the head)                     */
/*                                                                             */
/* Custom artwork from Illustrator. Anchor is the tip of the teardrop.        */
/* The `heading` parameter is intentionally unused — the truck glyph is       */
/* drawn upright regardless of vehicle direction.                             */
/* -------------------------------------------------------------------------- */

function vehicleSvg(color: string, filterId: string, _heading: number): string {
  const sId = `${filterId}-s`;
  // Teardrop pin body — has a circular hole cut out (evenodd) so the white
  // circle behind shows through as the badge for the truck glyph.
  const body =
    'M21.29,53.05c-.39.28-.92.32-1.35.04-4.68-2.98-8.62-6.56-11.71-10.44' +
    'C3.97,37.3,1.28,31.36.36,25.65c-.94-5.79-.06-11.37,2.82-15.9,' +
    '1.14-1.79,2.59-3.42,4.36-4.83C11.61,1.68,16.26-.03,20.88,0' +
    'c4.46.03,8.86,1.7,12.66,5.17,1.34,1.21,2.46,2.61,3.38,4.11,' +
    '3.1,5.1,3.77,11.62,2.41,18.22-2.13,10.34-8.96,20.04-18.04,25.55h0Z' +
    'M20,4.65c8.62,0,15.6,6.99,15.6,15.6s-6.99,15.6-15.6,15.6' +
    '-15.6-6.99-15.6-15.6,6.99-15.6,15.6-15.6Z';
  // Truck glyph that sits inside the white badge.
  const truck =
    'M28.27,22.39c-1.33,0-2.41,1.08-2.41,2.41,0,1.33,1.08,2.41,2.41,2.41,' +
    '1.33,0,2.41-1.08,2.41-2.41,0,0,0,0,0,0,0-1.33-1.08-2.4-2.41-2.41Z' +
    'M14.47,19.48v.71s0,.01,0,.02c.01.37.27.51.61.39.02,0,.04-.02.05-.03' +
    '.86-.67,1.36-1.21,2.21-1.88h.01c.12-.1.18-.26.15-.42-.04-.12-.12-.23-.22-.3' +
    'l-2.01-1.72c-.41-.32-.83-.26-.83.33v.65h-1.94c-.11,0-.2.09-.2.2' +
    'v1.82c0,.11.09.2.2.2h1.97Z' +
    'M12.03,23.04c.97-.97,2.54-.97,3.5,0,.97.97.97,2.54,0,3.5-.97.97-2.54.97-3.5,0' +
    '-.47-.47-.73-1.1-.73-1.75,0-.66.26-1.29.73-1.75Z' +
    'M26.74,16.04l-4.14-.02v-1.5c0-.35-.14-.69-.38-.94l-.02-.02' +
    'c-.26-.26-.6-.4-.97-.41h-12.31c-.75,0-1.36.61-1.37,1.37v9.56' +
    'c0,.37.15.72.41.98.25.27.6.42.96.42h1.26c.23,0,.41-.18.41-.41' +
    's-.18-.41-.41-.41h-1.27c-.14,0-.27-.06-.37-.16-.11-.11-.17-.25-.17-.41' +
    'v-9.58c0-.3.24-.54.54-.54h12.31c.14,0,.28.06.39.16l.02.02' +
    'c.09.1.14.23.14.37v10.13h-4.27c-.23,0-.41.18-.41.41s.18.41.41.41' +
    'h4.68c.22,0,.41-.18.41-.41v-.41h2.69c.16-3.7,5.47-4.21,6.01,0h1.17' +
    'l-.15-1.56c-.24-2.66.25-2.17-2.21-3.06l-1.82-.7-1.53-3.3Z' +
    'M25.81,17.05l-2.39-.02v2.31h3.6l-1.22-2.29h0Z' +
    'M13.79,23.87c-.51,0-.93.41-.93.92,0,.51.41.93.92.93.51,0,.93-.41.93-.92' +
    ',0,0,0,0,0,0,0-.51-.41-.92-.92-.92h0Z' +
    'M28.27,23.87c-.51,0-.93.41-.93.92,0,.51.41.93.92.93.51,0,.93-.41.93-.92' +
    ',0,0,0,0,0,0,0-.51-.41-.92-.92-.92Z';

  return `<svg width="30" height="40" viewBox="0 0 40 53.28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>${shadowDef(sId)}</defs>
    <g filter="url(#${sId})">
      <circle cx="19.97" cy="20.27" r="15.6" fill="white"/>
      <path d="${body}" fill="${color}" fill-rule="evenodd"/>
      <path d="${truck}" fill="#0f172a" fill-rule="evenodd"/>
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
  vehicle: { width: 30, height: 40, anchorX: 15, anchorY: 40 },
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