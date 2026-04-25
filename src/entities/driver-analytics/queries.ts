import { keepPreviousData, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { driverAnalyticsApi } from './api';
import type {
  DriverAnalyticsParams,
  DriverAnalyticsResponse,
} from './schemas';

export const driverAnalyticsKeys = {
  all: ['driver-analytics'] as const,
  byParams: (params: DriverAnalyticsParams) =>
    [...driverAnalyticsKeys.all, params] as const,
};

export function useDriverAnalytics(
  params: DriverAnalyticsParams,
  options?: Partial<UseQueryOptions<DriverAnalyticsResponse>>,
) {
  return useQuery({
    queryKey: driverAnalyticsKeys.byParams(params),
    queryFn: () => driverAnalyticsApi.get(params),
    // Only fire once we have both dates
    enabled: !!params.startDate && !!params.endDate,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    ...options,
  });
}
