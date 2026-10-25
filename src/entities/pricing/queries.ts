import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { pricingApi } from './api';
import type { PricingRuleInput, RepriceInput } from './schemas';

export const pricingKeys = {
  all: ['pricing'] as const,
  rules: () => [...pricingKeys.all, 'rules'] as const,
  truckMonths: (month: string, company: string) =>
    [...pricingKeys.all, 'truck-months', month, company] as const,
};

export function usePricingRules(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: pricingKeys.rules(),
    queryFn: () => pricingApi.listRules(),
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useTruckMonths(month: string, company: string) {
  return useQuery({
    queryKey: pricingKeys.truckMonths(month, company),
    queryFn: () => pricingApi.truckMonths(month, company || undefined),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PricingRuleInput) => pricingApi.createRule(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pricingKeys.rules() });
    },
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pricingApi.deleteRule(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pricingKeys.rules() });
    },
  });
}

export function useReprice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RepriceInput) => pricingApi.reprice(input),
    onSuccess: (outcome) => {
      if (outcome.kind !== 'ok') return;
      // Rental and trip revenue both moved; everything that shows them refetches.
      void qc.invalidateQueries({ queryKey: pricingKeys.all });
      void qc.invalidateQueries({ queryKey: ['trips'] });
      void qc.invalidateQueries({ queryKey: ['trip-statistics'] });
    },
  });
}

/** Mirrors usePricingRules key-for-key. */
export function prefetchPricingRules(qc: QueryClient): void {
  void qc.prefetchQuery({
    queryKey: pricingKeys.rules(),
    queryFn: () => pricingApi.listRules(),
    staleTime: 5 * 60_000,
  });
}
