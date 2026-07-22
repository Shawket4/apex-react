import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
