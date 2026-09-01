import { useMutation, useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { receiptPileApi } from './api';
import type { PilePlanParams } from './schemas';

/* -------------------------------------------------------------------------- */
/* Query keys                                                                  */
/*                                                                            */
/* The whole parameter set is in the key: the plan is a pure function of       */
/* range + mode + pile count, so two different plans must never share a cache  */
/* entry, and flipping back to a mode already seen should be instant.          */
/* -------------------------------------------------------------------------- */

export const receiptPileKeys = {
  all: ['receipt-piles'] as const,
  plan: (p: PilePlanParams) =>
    [...receiptPileKeys.all, p.startDate, p.endDate, p.mode, p.piles ?? 'auto'] as const,
};

export function useReceiptPilePlan(params: PilePlanParams, enabled = true) {
  return useQuery({
    queryKey: receiptPileKeys.plan(params),
    queryFn: () => receiptPileApi.plan(params),
    // The paper for a closed month does not change. Keep it long enough that
    // stepping the pile count up and back is free.
    staleTime: 5 * 60_000,
    enabled: enabled && !!params.startDate && !!params.endDate,
  });
}

export function useExportReceiptPiles() {
  return useMutation({
    mutationFn: (params: PilePlanParams) => receiptPileApi.export(params),
  });
}

/** Warmed on hover of the pile-count stepper and the mode switch. */
export function prefetchReceiptPilePlan(qc: QueryClient, params: PilePlanParams): void {
  if (!params.startDate || !params.endDate) return;
  void qc.prefetchQuery({
    queryKey: receiptPileKeys.plan(params),
    queryFn: () => receiptPileApi.plan(params),
    staleTime: 5 * 60_000,
  });
}
