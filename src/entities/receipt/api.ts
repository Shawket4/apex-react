import { apiClient } from '@/shared/api/client';
import {
  receiptStepResponseSchema,
  tripReceiptsResponseSchema,
  type CreateReceiptStepInput,
  type ReceiptStep,
  type TripReceiptsResponse,
  type UpdateReceiptStepInput,
} from './schemas';

export const receiptApi = {
  /** Fetch a trip together with its receipt steps. */
  async byTrip(tripId: number): Promise<TripReceiptsResponse> {
    const { data } = await apiClient.get(`/api/receipts/trip/${tripId}`);
    return tripReceiptsResponseSchema.parse(data);
  },

  async createStep(input: CreateReceiptStepInput): Promise<ReceiptStep> {
    const { data } = await apiClient.post('/api/receipts/step', input);
    return receiptStepResponseSchema.parse(data).receipt_step;
  },

  async updateStep(stepId: number, input: UpdateReceiptStepInput): Promise<ReceiptStep> {
    const { data } = await apiClient.put(`/api/receipts/step/${stepId}`, input);
    return receiptStepResponseSchema.parse(data).receipt_step;
  },

  /** Delete a receipt step. */
  async deleteStep(stepId: number): Promise<void> {
    await apiClient.delete(`/api/receipts/step/${stepId}`);
  },
};
