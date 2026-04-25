import { z } from 'zod';
import { receiptBatchSchema, receiptBatchStatusSchema } from '../trip/schemas';

/**
 * Receipt batches are submitted by drivers through the mobile app. Each batch
 * contains one or more receipt images and is linked to a driver. Admins review
 * pending batches and either approve-and-attach-to-trip or reject.
 */

export { receiptBatchSchema, receiptBatchStatusSchema };
export type { ReceiptBatch, ReceiptBatchStatus, ReceiptImage } from '../trip/schemas';

export const pendingBatchesResponseSchema = z.object({
  data: z.array(receiptBatchSchema),
});
export type PendingBatchesResponse = z.infer<typeof pendingBatchesResponseSchema>;

/**
 * State passed via router navigation when "approving" a batch — the add-trip
 * page reads this to pre-fill the driver and link the new trip to the batch.
 */
export interface ApproveBatchNavState {
  receiptBatchId: number;
  driverId: number;
  driverName: string;
  setAsCurrentTrip: boolean;
}
