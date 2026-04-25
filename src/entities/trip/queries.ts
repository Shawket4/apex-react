import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { tripApi } from './api';
import type {
  MultiContainerTripInput,
  TripDetailsResponse,
  TripListParams,
  TripListResponse,
  ParentContainersResponse,
} from './schemas';

// -----------------------------------------------------------------------------
// Query keys
// -----------------------------------------------------------------------------

export const tripKeys = {
  all: ['trips'] as const,
  lists: () => [...tripKeys.all, 'list'] as const,
  list: (params: TripListParams) => [...tripKeys.lists(), params] as const,
  details: () => [...tripKeys.all, 'details'] as const,
  detail: (id: number) => [...tripKeys.details(), id] as const,
  parents: () => [...tripKeys.all, 'parent'] as const,
  parent: (parentId: number) => [...tripKeys.parents(), parentId] as const,
};

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

export function useTrips(
  params: TripListParams,
  options?: Partial<UseQueryOptions<TripListResponse>>,
) {
  return useQuery({
    queryKey: tripKeys.list(params),
    queryFn: () => tripApi.list(params),
    placeholderData: keepPreviousData, // smooth pagination / filter changes
    staleTime: 30_000,
    ...options,
  });
}

export function useTripDetails(
  id: number | null,
  options?: Partial<UseQueryOptions<TripDetailsResponse>>,
) {
  return useQuery({
    queryKey: tripKeys.detail(id ?? 0),
    queryFn: () => tripApi.details(id as number),
    enabled: id != null && id > 0,
    staleTime: 60_000,
    ...options,
  });
}

export function useParentContainers(
  parentId: number | null,
  options?: Partial<UseQueryOptions<ParentContainersResponse>>,
) {
  return useQuery({
    queryKey: tripKeys.parent(parentId ?? 0),
    queryFn: () => tripApi.parentContainers(parentId as number),
    enabled: parentId != null && parentId > 0,
    staleTime: 30_000,
    ...options,
  });
}

// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tripApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useDeleteParentTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parentId: number) => tripApi.deleteParent(parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useCreateMultiContainerTrip() {
  const qc = useQueryClient();
  return useMutation<ParentContainersResponse, unknown, MultiContainerTripInput>({
    mutationFn: (input) => tripApi.createMultiContainer(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useUpdateMultiContainerTrip() {
  const qc = useQueryClient();
  return useMutation<
    ParentContainersResponse,
    unknown,
    { parentId: number; input: MultiContainerTripInput }
  >({
    mutationFn: ({ parentId, input }) => tripApi.updateMultiContainer(parentId, input),
    onSuccess: (_data, { parentId }) => {
      qc.invalidateQueries({ queryKey: tripKeys.all });
      qc.invalidateQueries({ queryKey: tripKeys.parent(parentId) });
    },
  });
}

/**
 * Fetch-all hook for Excel export. Triggered imperatively via `mutate` /
 * `mutateAsync` rather than living permanently in the cache — the result set
 * can be huge and is only needed at click time.
 */
export function useExportTrips() {
  return useMutation({
    mutationFn: (params: Omit<TripListParams, 'page' | 'limit'>) =>
      tripApi.listAll(params),
  });
}

export function useExportWatanyaReport() {
  return useMutation({
    mutationFn: (params: { start_date: string; end_date: string }) =>
      tripApi.exportWatanyaReport(params),
  });
}