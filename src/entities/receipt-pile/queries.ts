import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { receiptPileApi } from './api';
import type { PilePlanParams } from './schemas';

/* -------------------------------------------------------------------------- */
/* Query keys — single source of truth for invalidation                        */
/*                                                                            */
/* The whole parameter set is in the key. The plan is a pure function of range */
/* + mode + box count, so two plans must never share an entry, and stepping    */
/* the count up and back should be free rather than a second request.          */
/* -------------------------------------------------------------------------- */

export const receiptPileKeys = {
  all: ['receipt-piles'] as const,
  plan: (p: PilePlanParams) =>
    [...receiptPileKeys.all, p.startDate, p.endDate, p.mode, p.piles ?? 'auto'] as const,
};

/** The paper for a closed month does not change; hold it for the visit. */
const PLAN_STALE_MS = 5 * 60_000;

export function useReceiptPilePlan(params: PilePlanParams) {
  return useQuery({
    queryKey: receiptPileKeys.plan(params),
    queryFn: () => receiptPileApi.plan(params),
    staleTime: PLAN_STALE_MS,
    enabled: !!params.startDate && !!params.endDate,
    // Changing the mode or the box count re-splits the SAME receipts. Without
    // this the page falls back to skeletons on every click, throwing away a
    // plan the user is reading to redraw one that differs by a few boundaries.
    placeholderData: keepPreviousData,
  });
}

export function useExportReceiptPiles() {
  return useMutation({
    mutationFn: (params: PilePlanParams) => receiptPileApi.export(params),
  });
}

/* -------------------------------------------------------------------------- */
/* Intent prefetch                                                             */
/* Warmed on hover/focus/touch of the mode switch and the box stepper.         */
/* MUST mirror the hook above key-for-key — a near-miss key is a wasted        */
/* request the page refetches anyway.                                          */
/* -------------------------------------------------------------------------- */

export function prefetchReceiptPilePlan(qc: QueryClient, params: PilePlanParams): void {
  if (!params.startDate || !params.endDate) return;
  void qc.prefetchQuery({
    queryKey: receiptPileKeys.plan(params),
    queryFn: () => receiptPileApi.plan(params),
    staleTime: PLAN_STALE_MS,
  });
}
