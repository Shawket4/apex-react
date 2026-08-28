import { decode as msgpackDecode } from '@msgpack/msgpack';
import { apiClient, apiClientRust } from '@/shared/api/client';
import {
  tripListResponseSchema,
  tripDetailsResponseSchema,
  parentContainersResponseSchema,
  duplicateDetectionResponseSchema,
  type TripListResponse,
  type TripDetailsResponse,
  type ParentContainersResponse,
  type TripListParams,
  type MultiContainerTripInput,
  type DuplicateDetectionResponse,
} from './schemas';

/**
 * Build query params for the trips list.
 *
 * The Go backend split this three ways — /api/trips, /api/trips/company/:c and
 * /api/trips/date — because each grew its own handler over time. The Rust
 * endpoint takes company and date range as ordinary optional filters, so all
 * three collapse into one call.
 *
 * The date range is not only a row filter: it also scopes the window the
 * allocated revenue is divided over. See `allocated_*` on the Trip schema.
 */
function listParams(params: TripListParams): Record<string, string | number> {
  const { page, limit, search, missingData, receiptStatus, company, startDate, endDate } = params;

  const query: Record<string, string | number> = { page, limit };
  if (search) query.search = search;
  if (missingData) query.missing_data = missingData;
  if (receiptStatus) query.receipt_status = receiptStatus;
  if (company) query.company = company;
  if (startDate) query.from = startDate;
  if (endDate) query.to = endDate;
  return query;
}

export const tripApi = {
  /**
   * List trips with filters, pagination, and optional full-text search.
   *
   * Served by apex-rust, which is where the revenue formulas live — that is the
   * whole reason this one call moved off Go while its siblings below did not.
   * Rows carry `revenue` and the `allocated_*` fields for permission 4 and
   * omit them entirely otherwise.
   *
   * MessagePack rather than JSON: every row nests its receipt steps and, for a
   * container, its parent header with that parent's scanned receipts, so the
   * keys repeat heavily and the binary encoding is markedly smaller. It also
   * round-trips floats exactly, where JSON loses the last bit of an f64 —
   * which matters for money.
   */
  async list(params: TripListParams): Promise<TripListResponse> {
    const response = await apiClientRust.get('/api/v1/trips', {
      params: { ...listParams(params), format: 'msgpack' },
      responseType: 'arraybuffer',
      headers: { Accept: 'application/msgpack' },
    });
    const decoded = msgpackDecode(new Uint8Array(response.data as ArrayBuffer));
    return tripListResponseSchema.parse(decoded);
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

  /**
   * Server-rendered trips export.
   *
   * The workbook is built in Go and returned as the response body. Two reasons
   * it is not built here any more: the client had to cap the fetch at 10,000
   * rows, so a wide filter silently produced a partial spreadsheet; and building
   * it in the browser meant downloading every row only to write it back out.
   *
   * Filters go on the query string so they match the list endpoints exactly.
   * The translated labels go in the body -- the server has no i18n bundle, and
   * a second set of English strings there would drift from these.
   */
  async exportExcel(
    params: Omit<TripListParams, 'page' | 'limit'>,
    labels: Record<string, string>,
  ): Promise<{ blob: Blob; filename: string }> {
    const query: Record<string, string> = {};
    if (params.search) query.search = params.search;
    if (params.missingData) query.missing_data = params.missingData;
    if (params.receiptStatus) query.receipt_status = params.receiptStatus;
    if (params.company) query.company = params.company;
    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;

    const response = await apiClient.post('/api/trips/export', labels, {
      params: query,
      responseType: 'blob',
    });

    const blob = new Blob([response.data as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    let filename = 'trips.xlsx';
    const disposition = response.headers?.['content-disposition'];
    if (typeof disposition === 'string') {
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match?.[1]) filename = match[1];
    }

    return { blob, filename };
  },
};