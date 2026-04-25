import { keepPreviousData, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { tripStatisticsApi } from './api';
import type {
    TripStatisticsParams,
    TripStatisticsResponse,
} from './schemas';

export const tripStatisticsKeys = {
    all: ['trip-statistics'] as const,
    byParams: (params: TripStatisticsParams) =>
        [...tripStatisticsKeys.all, params] as const,
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