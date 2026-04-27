import type { MarkerKind } from './types';

/**
 * Build a marker SVG as a data URL.
 *
 * One factory for all marker kinds keeps the visual language consistent
 * across providers — Google and Leaflet both render the same SVG, so a
 * fallback transition is invisible to the user.
 *
 * The filter ID must be unique per marker — multiple markers in one
 * document with duplicate filter IDs cause SVG rendering bugs (filter
 * only applies to the first marker).
 */
export function buildMarkerSvg(
  color: string,
  filterId: string,
  kind: MarkerKind = 'pin',
  heading = 0,
): string {
  let svg: string;
  switch (kind) {
    case 'vehicle':
      svg = vehicleSvg(color, filterId, heading);
      break;
    case 'stop':
      svg = stopSvg(color, filterId);
      break;
    case 'ignition-on':
      svg = ignitionSvg(color, filterId, true);
      break;
    case 'ignition-off':
      svg = ignitionSvg(color, filterId, false);
      break;
    case 'playback':
      svg = playbackSvg(color, filterId);
      break;
    case 'route-start':
      svg = routeStartSvg(color, filterId);
      break;
    case 'route-end':
      svg = routeEndSvg(color, filterId);
      break;
    case 'pin':
    default:
      svg = pinSvg(color, filterId);
      break;
  }
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/* -------------------------------------------------------------------------- */
/* Pin (classic teardrop, used by stops/forms/one-shot displays)               */
/* -------------------------------------------------------------------------- */

function pinSvg(color: string, filterId: string): string {
  return `
    <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-40%" y="-20%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.28"/>
        </filter>
      </defs>
      <path
        d="M12 1C7.029 1 3 5.029 3 10C3 16.5 12 29 12 29C12 29 21 16.5 21 10C21 5.029 16.971 1 12 1Z"
        fill="${color}"
        filter="url(#${filterId})"
      />
      <circle cx="12" cy="10" r="4" fill="white" fill-opacity="0.92"/>
    </svg>
  `;
}

/* -------------------------------------------------------------------------- */
/* Vehicle (round badge with tanker silhouette + heading arrow)                */
/*                                                                             */
/* Anchors at the centre of the badge — that's where the GPS coordinate is.   */
/* The heading arrow rotates with `heading` (degrees from north). When the    */
/* heading is zero or unknown, no arrow is drawn.                             */
/* -------------------------------------------------------------------------- */

function vehicleSvg(color: string, filterId: string, heading: number): string {
  const showArrow = Number.isFinite(heading) && heading !== 0;
  const arrow = showArrow
    ? `
      <g transform="rotate(${heading} 18 18)">
        <path d="M18 4 L21 9 L18 8 L15 9 Z" fill="${color}" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
      </g>`
    : '';
  return `
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.32"/>
        </filter>
      </defs>
      <circle cx="18" cy="18" r="11" fill="white" filter="url(#${filterId})"/>
      <circle cx="18" cy="18" r="10" fill="${color}"/>
      <circle cx="18" cy="18" r="10" fill="white" fill-opacity="0.08"/>
      <!-- Tanker silhouette: cab + cylindrical tank -->
      <g fill="white" fill-opacity="0.95">
        <rect x="10.5" y="15" width="11" height="6" rx="1.6"/>
        <rect x="20.8" y="15.7" width="3.2" height="4.6" rx="0.8"/>
        <circle cx="13.2" cy="22" r="1.2" fill="${color}"/>
        <circle cx="18.6" cy="22" r="1.2" fill="${color}"/>
        <circle cx="22.6" cy="22" r="1" fill="${color}"/>
      </g>
      ${arrow}
    </svg>
  `;
}

/* -------------------------------------------------------------------------- */
/* Stop (rounded square with pause glyph)                                      */
/* -------------------------------------------------------------------------- */

function stopSvg(color: string, filterId: string): string {
  return `
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#000000" flood-opacity="0.28"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="18" height="18" rx="6" fill="white" filter="url(#${filterId})"/>
      <rect x="3" y="3" width="16" height="16" rx="5" fill="${color}"/>
      <rect x="7.5" y="6.8" width="2.4" height="8.4" rx="0.8" fill="white"/>
      <rect x="12.1" y="6.8" width="2.4" height="8.4" rx="0.8" fill="white"/>
    </svg>
  `;
}

/* -------------------------------------------------------------------------- */
/* Ignition (lightning bolt; "off" gets a slash overlay)                       */
/* -------------------------------------------------------------------------- */

function ignitionSvg(color: string, filterId: string, on: boolean): string {
  const slash = on
    ? ''
    : '<line x1="5" y1="5" x2="19" y2="19" stroke="white" stroke-width="2.4" stroke-linecap="round"/>';
  return `
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#000000" flood-opacity="0.28"/>
        </filter>
      </defs>
      <circle cx="11" cy="11" r="9.5" fill="white" filter="url(#${filterId})"/>
      <circle cx="11" cy="11" r="8.5" fill="${color}"/>
      <path d="M12 4 L7 12 L10.5 12 L9 18 L15 9.5 L11.5 9.5 L13 4 Z" fill="white"/>
      ${slash}
    </svg>
  `;
}

/* -------------------------------------------------------------------------- */
/* Playback (concentric ring — sits above other markers; drawn small)          */
/* -------------------------------------------------------------------------- */

function playbackSvg(color: string, filterId: string): string {
  return `
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-color="#000000" flood-opacity="0.32"/>
        </filter>
      </defs>
      <circle cx="13" cy="13" r="11" fill="${color}" fill-opacity="0.18"/>
      <circle cx="13" cy="13" r="7.5" fill="white" filter="url(#${filterId})"/>
      <circle cx="13" cy="13" r="6.5" fill="${color}"/>
      <circle cx="13" cy="13" r="2.6" fill="white"/>
    </svg>
  `;
}

/* -------------------------------------------------------------------------- */
/* Route Endpoints (start = play/green, end = stop/red)                       */
/* -------------------------------------------------------------------------- */

function routeStartSvg(color: string, filterId: string): string {
  return `
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#000000" flood-opacity="0.28"/>
        </filter>
      </defs>
      <circle cx="11" cy="11" r="9.5" fill="white" filter="url(#${filterId})"/>
      <circle cx="11" cy="11" r="8.5" fill="${color}"/>
      <path d="M9 7.5 L15 11 L9 14.5 Z" fill="white"/>
    </svg>
  `;
}

function routeEndSvg(color: string, filterId: string): string {
  return `
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#000000" flood-opacity="0.28"/>
        </filter>
      </defs>
      <circle cx="11" cy="11" r="9.5" fill="white" filter="url(#${filterId})"/>
      <circle cx="11" cy="11" r="8.5" fill="${color}"/>
      <rect x="7.5" y="7.5" width="7" height="7" rx="1" fill="white"/>
    </svg>
  `;
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
  pin: { width: 24, height: 30, anchorX: 12, anchorY: 30 },
  vehicle: { width: 36, height: 36, anchorX: 18, anchorY: 18 },
  stop: { width: 22, height: 22, anchorX: 11, anchorY: 11 },
  'ignition-on': { width: 22, height: 22, anchorX: 11, anchorY: 11 },
  'ignition-off': { width: 22, height: 22, anchorX: 11, anchorY: 11 },
  playback: { width: 26, height: 26, anchorX: 13, anchorY: 13 },
  'route-start': { width: 22, height: 22, anchorX: 11, anchorY: 11 },
  'route-end': { width: 22, height: 22, anchorX: 11, anchorY: 11 },
};

export function markerSize(kind: MarkerKind = 'pin'): MarkerSize {
  return SIZES[kind] ?? SIZES.pin;
}

/** @deprecated use `markerSize(kind)` instead. Retained for back-compat. */
export const MARKER_SIZE = SIZES.pin;