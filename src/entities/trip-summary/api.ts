import { apiClient } from '@/shared/api/client';
import {
  tripSummaryResponseSchema,
  type TripSummary,
  type TripSummaryResponse,
} from './schemas';

/**
 * Decode a Google-format encoded polyline into `[lat, lng]` pairs.
 * Used for rendering the OSRM-optimal route on the Leaflet map.
 *
 * Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

/**
 * Parse the JSON-encoded `container_ids` field on a delivery leg.
 * Returns an empty array for the return leg (which has no container_ids).
 */
export function parseContainerIds(leg: { container_ids?: string; trip_struct_id?: number | null }): number[] {
  if (leg.container_ids) {
    try {
      const parsed = JSON.parse(leg.container_ids);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'number');
    } catch {
      // fall through
    }
  }
  return leg.trip_struct_id ? [leg.trip_struct_id] : [];
}

export const tripSummaryApi = {
  /**
   * Fetch the route summary for a parent trip.
   *
   * Throws if the backend returns `success: false` — callers get either a
   * populated `TripSummary` or an exception.
   */
  async byParent(parentTripId: number): Promise<TripSummary> {
    const { data } = await apiClient.get<TripSummaryResponse>(
      `/api/parent-trips/${parentTripId}/summary`,
    );
    const parsed = tripSummaryResponseSchema.parse(data);
    if (!parsed.success || !parsed.data) {
      const err = new Error(parsed.message ?? 'Failed to load trip summary');
      // Attach the hint so the UI can show it inline
      (err as Error & { hint?: string }).hint = parsed.hint;
      throw err;
    }
    return parsed.data;
  },
};
