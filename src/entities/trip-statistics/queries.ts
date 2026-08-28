import { keepPreviousData, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { tripStatisticsApi } from './api';
import type {
    RouteDaysParams,
    TripStatisticsParams,
    TripStatisticsResponse,
} from './schemas';

export const tripStatisticsKeys = {
    all: ['trip-statistics'] as const,
    byParams: (params: TripStatisticsParams) =>
        [...tripStatisticsKeys.all, params] as const,
    routeDays: (params: RouteDaysParams) =>
        [...tripStatisticsKeys.all, 'route-days', params] as const,
};

export function useTripStatistics(
    params: TripStatisticsParams,
    options?: Partial<UseQueryOptions<TripStatisticsResponse>>,
) {
    return useQuery({
        queryKey: tripStatisticsKeys.byParams(params),
        queryFn: () => tripStatisticsApi.get(params),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
        ...options,
    });
}

/**
 * The daily breakdown behind one route row.
 *
 * Keyed by the route as well as the filters, so expanding a second route does
 * not evict the first — each panel is a small aggregate rather than the shared
 * ten-thousand-row download this replaced. `enabled` keeps it from firing until
 * a panel is actually opened.
 */
export function useRouteDays(
    params: RouteDaysParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: tripStatisticsKeys.routeDays(params),
        queryFn: () => tripStatisticsApi.routeDays(params),
        staleTime: 60_000,
        enabled: (options?.enabled ?? true) && !!params.company,
    });
}
