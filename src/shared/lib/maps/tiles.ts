/* -------------------------------------------------------------------------- */
/* Leaflet basemaps: one set of tiles for every Leaflet map in the app.        */
/*                                                                            */
/* Esri's ArcGIS Online basemaps, which serve without a key. CARTO's basemaps  */
/* (used until 2026-10) now answer every tile with an "API KEY REQUIRED"       */
/* placeholder, so a Leaflet map on them showed no streets at all.             */
/*                                                                            */
/* Each basemap is a stack: a base, and for the dark and satellite views a     */
/* labels layer over it. Canvas and reference tiles stop at zoom 16; Leaflet   */
/* scales them up past that (`maxNativeZoom`).                                 */
/* -------------------------------------------------------------------------- */

type LeafletNamespace = typeof import('leaflet');
type LeafletLayerGroup = import('leaflet').LayerGroup;

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

interface TileSpec {
  url: string;
  /** Deepest zoom the service has real tiles for. */
  native: number;
}

/** Esri World Street Map: streets, light theme (to z19). */
const STREETS: TileSpec = {
  url: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
  native: 19,
};
/** Esri Dark Gray Canvas, base + labels: streets, dark theme. */
const DARK_BASE: TileSpec = {
  url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  native: 16,
};
const DARK_LABELS: TileSpec = {
  url: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  native: 16,
};
/** Esri World Imagery + place labels: the satellite ("hybrid") view. */
const IMAGERY: TileSpec = { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, native: 19 };
const IMAGERY_LABELS: TileSpec = {
  url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
  native: 16,
};

export const TILE_ATTR =
  '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors';
export const TILE_SATELLITE_ATTR =
  'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics';

/** Deepest zoom a Leaflet map offers (tiles past their native zoom are scaled). */
export const MAX_ZOOM = 19;

export type BasemapKind = 'streets' | 'satellite';

export function isDarkTheme(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/**
 * The basemap for a view and theme, as one layer group: add it to the map,
 * and remove it to swap (theme change, satellite toggle).
 */
export function basemap(
  L: LeafletNamespace,
  kind: BasemapKind,
  dark: boolean = isDarkTheme(),
): LeafletLayerGroup {
  const specs =
    kind === 'satellite' ? [IMAGERY, IMAGERY_LABELS] : dark ? [DARK_BASE, DARK_LABELS] : [STREETS];
  const attribution = kind === 'satellite' ? TILE_SATELLITE_ATTR : TILE_ATTR;
  return L.layerGroup(
    specs.map((s, i) =>
      L.tileLayer(s.url, {
        // Credited once per stack.
        attribution: i === 0 ? attribution : undefined,
        maxZoom: MAX_ZOOM,
        maxNativeZoom: s.native,
      }),
    ),
  );
}
