import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { receiptPileApi } from './api';
import type { DropOffDetailParams, PilePlanParams } from './schemas';

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

/**
 * One drop-off's per-terminal tables. Enabled only once a drop-off is chosen,
 * so opening the screen costs nothing extra and the drawer fetches on open.
 */
export function useDropOffDetail(params: DropOffDetailParams | null) {
  return useQuery({
    queryKey: params
      ? [...receiptPileKeys.all, 'drop-off', params.startDate, params.endDate, params.dropOffPoint]
      : [...receiptPileKeys.all, 'drop-off', 'idle'],
    queryFn: () => receiptPileApi.dropOff(params!),
    staleTime: PLAN_STALE_MS,
    enabled: !!params,
  });
}

/** Warmed on hover of a drop-off row — the click is decided before the tap. */
export function prefetchDropOffDetail(qc: QueryClient, params: DropOffDetailParams): void {
  void qc.prefetchQuery({
    queryKey: [
      ...receiptPileKeys.all,
      'drop-off',
      params.startDate,
      params.endDate,
      params.dropOffPoint,
    ],
    queryFn: () => receiptPileApi.dropOff(params),
    staleTime: PLAN_STALE_MS,
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
