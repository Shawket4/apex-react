/**
 * Precision-5 polyline decoder (Google encoded polyline algorithm format).
 *
 * Mirrors the etit-proxy's server-side `encode_polyline` (see
 * `src/domain/history.rs` in that repo) and is compatible with
 * `google.maps.geometry.encoding.decodePath`. The proxy encodes geometries
 * server-side, so the client only ever needs a decoder.
 *
 * Returns `[lat, lng]` pairs. An empty or malformed tail yields the points
 * decoded so far — never throws.
 */
export function decodePolyline5(encoded: string): Array<[number, number]> {
  if (!encoded) return [];
  const out: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const len = encoded.length;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      if (index >= len) return out;
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      if (index >= len) return out;
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}
