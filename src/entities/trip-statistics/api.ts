import { decode as msgpackDecode } from '@msgpack/msgpack';
import { apiClientRust } from '@/shared/api/client';
import {
  routeDaysResponseSchema,
  tripStatisticsResponseSchema,
  type RouteDay,
  type RouteDaysParams,
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

  /**
   * The day-by-day rows behind one route, aggregated server-side.
   *
   * Route matching mirrors the precedence the statistics query itself uses:
   * terminal plus drop-off point when both are known, then terminal alone,
   * then fee band, then a name that may be either.
   */
  async routeDays(params: RouteDaysParams): Promise<RouteDay[]> {
    const query: Record<string, string | number> = {
      company: params.company,
      start_date: params.startDate,
      end_date: params.endDate,
    };
    if (params.terminal) query.terminal = params.terminal;
    if (params.dropOffPoint) query.drop_off_point = params.dropOffPoint;
    if (params.fee != null) query.fee = params.fee;
    if (params.routeName) query.route_name = params.routeName;

    const { data } = await apiClientRust.get('/api/v1/trip-statistics/route-days', {
      params: query,
    });
    return routeDaysResponseSchema.parse(data).data;
  },
};