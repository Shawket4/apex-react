import { z } from 'zod';
import { receiptStepSchema, receiptStepLocationSchema, tripSchema } from '../trip/schemas';

/**
 * The receipt-steps API tracks the physical movement of a trip's paper receipt
 * through the organization: Garage → Office (in some order). Each trip can
 * have at most 2 steps.
 */

export { receiptStepSchema, receiptStepLocationSchema };
export type { ReceiptStep, ReceiptStepLocation } from '../trip/schemas';

// -----------------------------------------------------------------------------
// Trip + receipts response
// -----------------------------------------------------------------------------

export const tripReceiptsResponseSchema = z.object({
  message: z.string().optional(),
  trip: tripSchema,
  steps: z.array(receiptStepSchema).default([]),
});
export type TripReceiptsResponse = z.infer<typeof tripReceiptsResponseSchema>;

export const receiptStepResponseSchema = z.object({
  message: z.string().optional(),
  receipt_step: receiptStepSchema,
});
export type ReceiptStepResponse = z.infer<typeof receiptStepResponseSchema>;

// -----------------------------------------------------------------------------
// Step mutations
// -----------------------------------------------------------------------------

export const createReceiptStepInputSchema = z.object({
  trip_id: z.number().int(),
  location: receiptStepLocationSchema,
  received_by: z.string().min(1),
  stamped: z.boolean().default(false),
  notes: z.string().default(''),
});
export type CreateReceiptStepInput = z.infer<typeof createReceiptStepInputSchema>;

export const updateReceiptStepInputSchema = z.object({
  location: receiptStepLocationSchema.optional(),
  received_by: z.string().optional(),
  stamped: z.boolean().optional(),
  notes: z.string().optional(),
});
export type UpdateReceiptStepInput = z.infer<typeof updateReceiptStepInputSchema>;
