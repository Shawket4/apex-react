import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { tripSummaryApi } from './api';
import type { TripSummary } from './schemas';

export const tripSummaryKeys = {
  all: ['trip-summary'] as const,
  byParent: (parentTripId: number) =>
    [...tripSummaryKeys.all, parentTripId] as const,
};

export function useTripSummary(
  parentTripId: number | null,
  options?: Partial<UseQueryOptions<TripSummary>>,
) {
  return useQuery({
    queryKey: tripSummaryKeys.byParent(parentTripId ?? 0),
    queryFn: () => tripSummaryApi.byParent(parentTripId as number),
    enabled: parentTripId != null && parentTripId > 0,
    staleTime: 30_000,
    ...options,
  });
}
