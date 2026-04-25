import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { receiptApi } from './api';
import { tripKeys } from '../trip/queries';
import type {
  CreateReceiptStepInput,
  ReceiptStep,
  TripReceiptsResponse,
  UpdateReceiptStepInput,
} from './schemas';

export const receiptKeys = {
  all: ['receipts'] as const,
  byTrips: () => [...receiptKeys.all, 'by-trip'] as const,
  byTrip: (tripId: number) => [...receiptKeys.byTrips(), tripId] as const,
};

/**
 * Receipt mutations invalidate BOTH the receipt cache and the trip list cache
 * — the trip row renders a receipt-status badge derived from `receipt_steps`,
 * so those badges need to update after any step change.
 */
function useInvalidateReceiptAndTrips(tripId?: number) {
  const qc = useQueryClient();
  return () => {
    if (tripId != null) {
      qc.invalidateQueries({ queryKey: receiptKeys.byTrip(tripId) });
    }
    qc.invalidateQueries({ queryKey: receiptKeys.all });
    qc.invalidateQueries({ queryKey: tripKeys.all });
  };
}

export function useTripReceipts(
  tripId: number | null,
  options?: Partial<UseQueryOptions<TripReceiptsResponse>>,
) {
  return useQuery({
    queryKey: receiptKeys.byTrip(tripId ?? 0),
    queryFn: () => receiptApi.byTrip(tripId as number),
    enabled: tripId != null && tripId > 0,
    staleTime: 15_000,
    ...options,
  });
}

export function useCreateReceiptStep() {
  const qc = useQueryClient();
  return useMutation<ReceiptStep, unknown, CreateReceiptStepInput>({
    mutationFn: (input) => receiptApi.createStep(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: receiptKeys.byTrip(variables.trip_id) });
      qc.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useUpdateReceiptStep(tripId?: number) {
  const invalidate = useInvalidateReceiptAndTrips(tripId);
  return useMutation<
    ReceiptStep,
    unknown,
    { stepId: number; input: UpdateReceiptStepInput }
  >({
    mutationFn: ({ stepId, input }) => receiptApi.updateStep(stepId, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteReceiptStep(tripId?: number) {
  const invalidate = useInvalidateReceiptAndTrips(tripId);
  return useMutation<void, unknown, number>({
    mutationFn: (stepId) => receiptApi.deleteStep(stepId),
    onSuccess: () => invalidate(),
  });
}
