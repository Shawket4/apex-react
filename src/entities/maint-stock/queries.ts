import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintStockApi } from './api';
import type { OilCountInput, OilCreditInput, TireCountInput, TireCreditInput } from './schemas';

const keys = {
  tires: ['maint-stock', 'tires'] as const,
  oil: ['maint-stock', 'oil'] as const,
};

export function useTireStock() {
  return useQuery({ queryKey: keys.tires, queryFn: maintStockApi.listTires });
}

export function useOilStock() {
  return useQuery({ queryKey: keys.oil, queryFn: maintStockApi.listOil });
}

export function useCreditTires() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, refId }: { input: TireCreditInput; refId: string }) =>
      maintStockApi.creditTires(input, refId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.tires }),
  });
}

export function useCreditOil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, refId }: { input: OilCreditInput; refId: string }) =>
      maintStockApi.creditOil(input, refId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.oil }),
  });
}

/**
 * The stock shown on the page is Falcon's; a count lands in the garage system
 * first and is mirrored up in the background. Re-read at once (the mirror is
 * usually that quick) and once more a few seconds later for when it is not.
 */
const MIRROR_GRACE_MS = 5_000;

function rereadStock(qc: QueryClient): void {
  const reread = () => void qc.invalidateQueries({ queryKey: ['maint-stock'] });
  reread();
  setTimeout(reread, MIRROR_GRACE_MS);
}

export function useCountTires() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['maint-stock', 'count', 'tires'],
    mutationFn: (input: TireCountInput) => maintStockApi.countTires(input),
    onSuccess: () => rereadStock(qc),
  });
}

export function useCountOil() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['maint-stock', 'count', 'oil'],
    mutationFn: (input: OilCountInput) => maintStockApi.countOil(input),
    onSuccess: () => rereadStock(qc),
  });
}

/* -------------------------------------------------------------------------- */
/* Intent prefetch                                                             */
/* Warmed on hover/focus/touch by surfaces that know the click is coming.      */
/* MUST mirror the hook above key-for-key — a near-miss key is a wasted        */
/* request the page refetches anyway.                                          */
/* -------------------------------------------------------------------------- */

export function prefetchMaintStock(qc: QueryClient): void {
  void qc.prefetchQuery({ queryKey: keys.tires, queryFn: maintStockApi.listTires });
  void qc.prefetchQuery({ queryKey: keys.oil, queryFn: maintStockApi.listOil });
}
