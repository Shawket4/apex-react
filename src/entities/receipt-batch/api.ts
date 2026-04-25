import { apiClient } from '@/shared/api/client';
import {
  pendingBatchesResponseSchema,
  type PendingBatchesResponse,
} from './schemas';

export const receiptBatchApi = {
  /** List all batches awaiting admin review. */
  async listPending(): Promise<PendingBatchesResponse> {
    const { data } = await apiClient.get('/api/receipts/pending');
    return pendingBatchesResponseSchema.parse(data);
  },

  /** Reject a batch — the driver will need to resubmit. */
  async reject(batchId: number): Promise<void> {
    await apiClient.patch(`/api/receipts/batch/${batchId}/reject`);
  },

  /**
   * Build a full URL for a receipt image path.
   *
   * The backend stores relative paths; images are served from `${baseURL}/receipts/`.
   * Reads the base URL from the configured axios instance so callers don't
   * have to plumb env vars through the component tree — same place every
   * other request resolves against.
   */
  imageUrl(imagePath: string): string {
    const base = (apiClient.defaults.baseURL ?? '').replace(/\/+$/, '');
    const path = imagePath.replace(/^\/+/, '');
    return `${base}/receipts/${path}`;
  },
};
