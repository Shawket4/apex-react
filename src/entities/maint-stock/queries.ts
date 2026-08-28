import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintStockApi } from './api';
import type { OilCreditInput, TireCreditInput } from './schemas';

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
    mutationFn: (input: TireCreditInput) => maintStockApi.creditTires(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.tires }),
  });
}

export function useCreditOil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OilCreditInput) => maintStockApi.creditOil(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.oil }),
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
