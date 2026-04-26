/**
 * Coordinate validation and normalisation helpers.
 *
 * The backend has historically returned `0` for missing lat/lng instead of
 * `null`, which silently places markers at the equator. These helpers
 * centralise the rejection logic so every consumer treats invalid coords
 * the same way.
 *
 * Accepts a slightly permissive input shape (number | string | null |
 * undefined) so we don't litter the codebase with `Number(...)` casts.
 */

export type RawCoord = number | string | null | undefined;

/**
 * Returns true when (lat, lng) is a usable real-world coordinate.
 *
 * Rejects:
 *   - null / undefined
 *   - NaN (after coercion)
 *   - exact 0 / 0 (the most common bad-data case in this codebase)
 *   - values outside the valid lat/lng ranges
 *
 * Note: legitimate (0, 0) is in the Atlantic Ocean, no real fleet location
 * lives there. Treating it as invalid is a deliberate trade-off.
 */
export function isValidCoordinate(lat: RawCoord, lng: RawCoord): boolean {
  if (lat == null || lng == null) return false;
  const a = typeof lat === 'string' ? Number(lat) : lat;
  const b = typeof lng === 'string' ? Number(lng) : lng;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a === 0 && b === 0) return false;
  if (a < -90 || a > 90) return false;
  if (b < -180 || b > 180) return false;
  return true;
}

/**
 * Coerce raw coords to numbers if (and only if) they're valid; otherwise
 * return null. Convenient at API boundaries where the consumer wants
 * `[number, number] | null`.
 */
export function asValidCoord(
  lat: RawCoord,
  lng: RawCoord,
): [number, number] | null {
  if (!isValidCoordinate(lat, lng)) return null;
  return [Number(lat), Number(lng)];
}

/**
 * Build a Google Maps "search" URL pointing at a single coordinate.
 * Used for "Open in Google Maps" buttons on terminal/drop-off markers.
 */
export function googleMapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Build a Google Maps "directions" URL between two coordinates. Falls
 * through gracefully — if either coord is invalid, returns null.
 */
export function googleMapsDirectionsUrl(
  origin: [number, number] | null,
  destination: [number, number] | null,
): string | null {
  if (!origin || !destination) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}`;
}

/** Cairo as a sane default centre for Egyptian fleet maps. */
export const DEFAULT_MAP_CENTER: [number, number] = [30.0444, 31.2357];
