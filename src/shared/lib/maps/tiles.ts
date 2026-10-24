/* -------------------------------------------------------------------------- */
/* Leaflet basemaps: one set of tiles for every Leaflet map in the app.        */
/* -------------------------------------------------------------------------- */

/** CARTO Voyager: streets, light theme. */
export const TILE_LIGHT =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
/** CARTO Dark Matter: streets, dark theme. */
export const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
/** Esri World Imagery: the satellite view (no labels of its own). */
export const TILE_SATELLITE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
/** CARTO labels only, laid over the imagery for a "hybrid" view. */
export const TILE_LABELS =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';

export const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
export const TILE_SATELLITE_ATTR = 'Imagery &copy; Esri';

/** The street tiles for the current theme. */
export function streetTiles(): string {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ? TILE_DARK
    : TILE_LIGHT;
}
