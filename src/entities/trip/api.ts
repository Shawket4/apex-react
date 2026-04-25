import { apiClient } from '@/shared/api/client';
import {
  tripListResponseSchema,
  tripDetailsResponseSchema,
  parentContainersResponseSchema,
  duplicateDetectionResponseSchema,
  type Trip,
  type TripListResponse,
  type TripDetailsResponse,
  type ParentContainersResponse,
  type TripListParams,
  type MultiContainerTripInput,
  type DuplicateDetectionResponse,
} from './schemas';

/**
 * Build query params for the trip-list endpoints.
 *
 * The backend splits list endpoints three ways:
 *   - /api/trips                         (no company, no date range)
 *   - /api/trips/company/:company        (company only)
 *   - /api/trips/date                    (date range, optionally filtered by company)
 *
 * This helper picks the right URL + params to match the active filter set.
 */
function resolveListEndpoint(params: TripListParams): {
  url: string;
  params: Record<string, string | number>;
} {
  const { page, limit, search, missingData, receiptStatus, company, startDate, endDate } = params;

  const query: Record<string, string | number> = { page, limit };
  if (search) query.search = search;
  if (missingData) query.missing_data = missingData;
  if (receiptStatus) query.receipt_status = receiptStatus;

  // Date range wins — the date endpoint accepts an optional company filter.
  if (startDate && endDate) {
    query.start_date = startDate;
    query.end_date = endDate;
    if (company) query.company = company;
    return { url: '/api/trips/date', params: query };
  }

  if (company) {
    return { url: `/api/trips/company/${encodeURIComponent(company)}`, params: query };
  }

  return { url: '/api/trips', params: query };
}

export const tripApi = {
  /** List trips with filters, pagination, and optional full-text search. */
  async list(params: TripListParams): Promise<TripListResponse> {
    const { url, params: query } = resolveListEndpoint(params);
    const { data } = await apiClient.get(url, { params: query });
    return tripListResponseSchema.parse(data);
  },

  /**
   * Fetch *all* trips matching the current filters in a single call.
   * Used by the Excel exporter — the backend supports `limit=10000`.
   */
  async listAll(params: Omit<TripListParams, 'page' | 'limit'>): Promise<Trip[]> {
    const { url, params: query } = resolveListEndpoint({
      ...params,
      page: 1,
      limit: 10000,
    });
    const { data } = await apiClient.get(url, { params: query });
    const parsed = tripListResponseSchema.parse(data);
    return parsed.data;
  },

  /** Fetch a single trip + its route/terminal coordinates for the map dialog. */
  async details(id: number): Promise<TripDetailsResponse> {
    const { data } = await apiClient.get(`/api/trips/${id}/details`);
    return tripDetailsResponseSchema.parse(data);
  },

  /** Fetch the parent trip + all its containers. */
  async parentContainers(parentId: number): Promise<ParentContainersResponse> {
    const { data } = await apiClient.get(`/api/trips/parent/${parentId}/containers`);
    return parentContainersResponseSchema.parse(data);
  },

  /** Delete a single (standalone or container) trip. */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/trips/${id}`);
  },

  /** Delete a parent trip and all its containers. */
  async deleteParent(parentId: number): Promise<void> {
    await apiClient.delete(`/api/trips/parent/${parentId}`);
  },

  /**
   * Create a multi-container trip.
   *
   * If the backend detects receipt-number collisions it returns 409 with a
   * `DuplicateDetectionResponse` body. Callers should catch that, present the
   * conflict, and retry with `force_create: true` if the user confirms.
   */
  async createMultiContainer(
    input: MultiContainerTripInput,
  ): Promise<ParentContainersResponse> {
    const { data } = await apiClient.post('/api/trips/multi-container', input);
    const payload = data?.data ?? data?.trip ?? data;
    return parentContainersResponseSchema.passthrough().parse(payload);
  },

  /**
   * Update an existing multi-container trip.
   * Supports the same 409/force_update conflict flow as creation.
   */
  async updateMultiContainer(
    parentId: number,
    input: MultiContainerTripInput,
  ): Promise<ParentContainersResponse> {
    const { data } = await apiClient.put(`/api/trips/parent/${parentId}`, input);
    const payload = data?.data ?? data?.trip ?? data;
    return parentContainersResponseSchema.passthrough().parse(payload);
  },

  /**
   * Parse a 409 duplicate-detection response. Call this inside a mutation's
   * error handler before surfacing the error to the user.
   *
   * Returns null if the error is not a duplicate-detection 409, so the caller
   * can fall back to generic error handling.
   */
  parseDuplicateError(error: unknown): DuplicateDetectionResponse | null {
    if (!error || typeof error !== 'object') return null;

    // Handle transformed ApiError (from our axios interceptor)
    const apiErr = error as { status?: number; payload?: any };
    if (apiErr.status === 409 && apiErr.payload) {
      const payload = apiErr.payload?.data ?? apiErr.payload?.trip ?? apiErr.payload;
      const parsed = duplicateDetectionResponseSchema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    }

    // Handle raw Axios error
    const axErr = error as { response?: { status?: number; data?: any } };
    if (axErr.response?.status === 409 && axErr.response.data) {
      const payload = axErr.response.data?.data ?? axErr.response.data?.trip ?? axErr.response.data;
      const parsed = duplicateDetectionResponseSchema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    }

    return null;
  },

  /**
   * Download the Watanya report as an Excel blob.
   * Permission-gated on the backend (requires permission level >= 3).
   */
  async exportWatanyaReport(params: {
    start_date: string;
    end_date: string;
  }): Promise<{ blob: Blob; filename: string }> {
    const response = await apiClient.post('/api/trips/watanya/export_report', params, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Pull filename out of Content-Disposition if the server sets one.
    let filename = 'watanya_report.xlsx';
    const disposition = response.headers?.['content-disposition'];
    if (typeof disposition === 'string') {
      const match = disposition.match(/filename="?([^"]+)"?/i);
      if (match?.[1]) filename = match[1];
    }

    return { blob, filename };
  },
};