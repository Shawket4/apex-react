import { decode as msgpackDecode } from '@msgpack/msgpack';
import { apiClientRust } from '@/shared/api/client';
import {
  tripStatisticsResponseSchema,
  type TripStatisticsParams,
  type TripStatisticsResponse,
} from './schemas';

/**
 * The Rust trip-statistics service supports both JSON and MessagePack.
 * MessagePack is ~3–5x smaller on the wire for these deeply nested payloads,
 * which is meaningful when a date range spans many thousands of trips.
 */

export const tripStatisticsApi = {
  async get(params: TripStatisticsParams): Promise<TripStatisticsResponse> {
    const query: Record<string, string> = { format: 'msgpack' };
    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;
    if (params.company) query.company = params.company;

    const response = await apiClientRust.get('/api/v1/trip-statistics', {
      params: query,
      responseType: 'arraybuffer',
      headers: { Accept: 'application/msgpack' },
    });

    const decoded = msgpackDecode(new Uint8Array(response.data as ArrayBuffer));
    return tripStatisticsResponseSchema.parse(decoded);
  },
};