import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { feeMappingApi, getFeeMappingRoute } from './api';
import type {
  EnrichmentResult,
  FeeMapping,
  FeeMappingInput,
  SetLocationResponse,
} from './schemas';
import type { QueryClient } from '@tanstack/react-query';

/* -------------------------------------------------------------------------- */
/* Query keys — single source of truth for invalidation                        */
/* -------------------------------------------------------------------------- */

export const feeMappingKeys = {
  all: ['fee-mappings'] as const,
  list: () => [...feeMappingKeys.all, 'list'] as const,
};

/* -------------------------------------------------------------------------- */
/* Queries                                                                     */
/* -------------------------------------------------------------------------- */

export function useFeeMappings() {
  return useQuery({
    queryKey: feeMappingKeys.list(),
    queryFn: () => feeMappingApi.list(),
  });
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/*                                                                             */
/* All mutations patch the list cache in-place when possible (avoids an       */
/* extra round-trip after every successful action). Set-location and bulk-    */
/* enrich both return enrichment data we can fold into existing rows.         */
/* -------------------------------------------------------------------------- */

export function useCreateFeeMapping(
  options?: UseMutationOptions<FeeMapping, unknown, FeeMappingInput>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => feeMappingApi.create(input),
    onSuccess: (created) => {
      qc.setQueryData<FeeMapping[]>(feeMappingKeys.list(), (prev) =>
        prev ? [...prev, created] : [created],
      );
    },
    ...options,
  });
}

export function useUpdateFeeMapping(
  options?: UseMutationOptions<
    FeeMapping,
    unknown,
    { id: number; input: FeeMappingInput }
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => feeMappingApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData<FeeMapping[]>(feeMappingKeys.list(), (prev) =>
        prev?.map((m) => (m.id === updated.id ? updated : m)) ?? [updated],
      );
    },
    ...options,
  });
}

export function useDeleteFeeMapping(
  options?: UseMutationOptions<void, unknown, number>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => feeMappingApi.remove(id),
    onSuccess: (_, id) => {
      qc.setQueryData<FeeMapping[]>(feeMappingKeys.list(), (prev) =>
        prev?.filter((m) => m.id !== id),
      );
    },
    ...options,
  });
}

export function useSetFeeMappingLocation(
  options?: UseMutationOptions<
    SetLocationResponse,
    unknown,
    { id: number; lat: number; lng: number }
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lat, lng }) => feeMappingApi.setLocation(id, { lat, lng }),
    onSuccess: (data) => {
      // Patch the row in-place — no need to refetch the entire list
      qc.setQueryData<FeeMapping[]>(feeMappingKeys.list(), (prev) =>
        prev?.map((m) =>
          m.id === data.id
            ? {
                ...m,
                lat: data.lat,
                lng: data.lng,
                osrmDistanceKm: data.osrm_distance_km ?? m.osrmDistanceKm,
                osrmDurationMin: data.osrm_duration_min ?? m.osrmDurationMin,
              }
            : m,
        ),
      );
    },
    ...options,
  });
}

export function useBulkEnrichFeeMappings(
  options?: UseMutationOptions<EnrichmentResult[], unknown, void>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => feeMappingApi.bulkEnrich(),
    onSuccess: (results) => {
      // Patch every successful row; leave the rest alone
      qc.setQueryData<FeeMapping[]>(feeMappingKeys.list(), (prev) => {
        if (!prev) return prev;
        const byId = new Map(results.filter((r) => !r.error).map((r) => [r.id, r]));
        return prev.map((m) => {
          const r = byId.get(m.id);
          if (!r) return m;
          return {
            ...m,
            osrmDistanceKm: r.osrm_distance_km ?? m.osrmDistanceKm,
            osrmDurationMin: r.osrm_duration_min ?? m.osrmDurationMin,
          };
        });
      });
    },
    ...options,
  });
}

/* -------------------------------------------------------------------------- */
/* Intent prefetch                                                             */
/* Warmed on hover/focus/touch by surfaces that know the click is coming.      */
/* MUST mirror the hook above key-for-key — a near-miss key is a wasted        */
/* request the page refetches anyway.                                          */
/* -------------------------------------------------------------------------- */

export function prefetchFeeMappings(qc: QueryClient): void {
  void qc.prefetchQuery({ queryKey: feeMappingKeys.list(), queryFn: () => feeMappingApi.list() });
}


/**
 * The road route for one mapping, for the map dialog.
 *
 * Only fetched while the dialog is open — routing costs an upstream call, and
 * the table renders hundreds of rows that must not each trigger one.
 */
export function useFeeMappingRoute(id: number | null) {
  return useQuery({
    queryKey: ['fee-mapping-route', id],
    queryFn: () => getFeeMappingRoute(id as number),
    enabled: id != null,
    staleTime: 5 * 60_000,
  });
}
