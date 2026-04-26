/**
 * Build a teardrop marker pin SVG as a data URL.
 *
 * Used by both the Google Maps and Leaflet providers so the user sees an
 * identical pin regardless of which provider rendered the map. Keeping
 * the SVG source in one place avoids visual drift between providers.
 *
 * The filter ID is parameterised because multiple markers in one document
 * with duplicate filter IDs cause SVG rendering bugs (filter only applies
 * to the first marker).
 */
export function buildMarkerSvg(color: string, filterId: string): string {
  const svg = `
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
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Pin dimensions — kept consistent across providers. */
export const MARKER_SIZE = { width: 24, height: 30, anchorX: 12, anchorY: 30 };
