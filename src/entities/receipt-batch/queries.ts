import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { receiptBatchApi } from './api';
import type { PendingBatchesResponse, ReceiptBatch } from './schemas';

export const receiptBatchKeys = {
  all: ['receipt-batches'] as const,
  pending: () => [...receiptBatchKeys.all, 'pending'] as const,
};

export function usePendingReceiptBatches(
  options?: Partial<UseQueryOptions<PendingBatchesResponse>>,
) {
  return useQuery({
    queryKey: receiptBatchKeys.pending(),
    queryFn: () => receiptBatchApi.listPending(),
    staleTime: 15_000,
    ...options,
  });
}

export function useRejectReceiptBatch() {
  const qc = useQueryClient();
  return useMutation<
    void,
    unknown,
    number,
    { previous?: PendingBatchesResponse }
  >({
    mutationFn: (batchId) => receiptBatchApi.reject(batchId),
    // Optimistically drop the batch from the pending list so the row animates
    // out immediately. Rolls back on error.
    onMutate: async (batchId) => {
      await qc.cancelQueries({ queryKey: receiptBatchKeys.pending() });
      const previous = qc.getQueryData<PendingBatchesResponse>(receiptBatchKeys.pending());
      if (previous) {
        qc.setQueryData<PendingBatchesResponse>(receiptBatchKeys.pending(), {
          ...previous,
          data: previous.data.filter(
            (b: ReceiptBatch) => (b.ID ?? b.id) !== batchId,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _batchId, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(receiptBatchKeys.pending(), ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: receiptBatchKeys.pending() });
    },
  });
}
