import { z } from 'zod';
import { apiClient } from '@/shared/api/client';
import {
  enrichmentResultSchema,
  feeMappingSchema,
  setLocationResponseSchema,
  type EnrichmentResult,
  type FeeMapping,
  type FeeMappingInput,
  type SetLocationResponse,
} from './schemas';

/* -------------------------------------------------------------------------- */
/* Common envelope shapes                                                      */
/* -------------------------------------------------------------------------- */

const listResponseSchema = z.object({
  data: z.array(feeMappingSchema),
});

const singleEnvelopeSchema = z.object({
  data: feeMappingSchema,
});

const setLocationEnvelopeSchema = z.object({
  data: setLocationResponseSchema,
});

const bulkEnrichResponseSchema = z.object({
  results: z.array(enrichmentResultSchema),
});

/* -------------------------------------------------------------------------- */
/* API surface                                                                 */
/* -------------------------------------------------------------------------- */

export const feeMappingApi = {
  /** `GET /api/mappings` — full list, no pagination on the backend. */
  async list(): Promise<FeeMapping[]> {
    const res = await apiClient.get('/api/mappings');
    return listResponseSchema.parse(res.data).data;
  },

  /** `POST /api/mappings` — create a new mapping. */
  async create(input: FeeMappingInput): Promise<FeeMapping> {
    const res = await apiClient.post('/api/mappings', input);
    return singleEnvelopeSchema.parse(res.data).data;
  },

  /** `PUT /api/mappings/{id}` — update an existing mapping. */
  async update(id: number, input: FeeMappingInput): Promise<FeeMapping> {
    const res = await apiClient.put(`/api/mappings/${id}`, input);
    return singleEnvelopeSchema.parse(res.data).data;
  },

  /** `DELETE /api/mappings/{id}`. */
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/mappings/${id}`);
  },

  /**
   * `POST /api/mappings/{id}/location` — set drop-off coordinates and
   * trigger an OSRM lookup. Returns the enriched data so the caller can
   * patch its cache without a full refetch.
   */
  async setLocation(
    id: number,
    coord: { lat: number; lng: number },
  ): Promise<SetLocationResponse> {
    const res = await apiClient.post(`/api/mappings/${id}/location`, coord);
    return setLocationEnvelopeSchema.parse(res.data).data;
  },

  /**
   * `POST /api/mappings/enrich-osrm` — bulk-recompute OSRM data for every
   * mapping that has a valid location. Per-row failures are reported in
   * the `error` field; the overall request still resolves successfully.
   */
  async bulkEnrich(): Promise<EnrichmentResult[]> {
    const res = await apiClient.post('/api/mappings/enrich-osrm');
    return bulkEnrichResponseSchema.parse(res.data).results;
  },
};
