import { z } from 'zod';
import { apiClient, apiClientEtit } from '@/shared/api/client';
import {
  dropOffPointSchema,
  locationsInboxSchema,
  pinSuggestionSchema,
  terminalSchema,
  type CreateDropoffPayload,
  type DropOffPoint,
  type LocationsInbox,
  type PinSuggestion,
  type SuggestionAckStatus,
  type Terminal,
  type UpdateDropoffPayload,
  type UpdateTerminalPayload,
} from './schemas';

/**
 * Locations live on FalconGo (same base + auth as fee-mappings — the JWT
 * interceptor on `apiClient` covers the Verify(3) requirement for writes).
 * The GPS pin suggestions live on the etit proxy (`apiClientEtit`), same
 * base as the zones entity.
 */

const BASE = '/api/locations';
const ETIT_PREFIX = 'api/v1/trip-audit';

/* ---- Envelopes ----------------------------------------------------------- */

const terminalsEnvelopeSchema = z.object({
  data: z
    .array(terminalSchema)
    .nullish()
    .transform((v) => v ?? []),
});

const dropoffsEnvelopeSchema = z.object({
  data: z
    .array(dropOffPointSchema)
    .nullish()
    .transform((v) => v ?? []),
});

/* ---- FalconGo: inbox ------------------------------------------------------ */

async function getInbox(): Promise<LocationsInbox> {
  const res = await apiClient.get(`${BASE}/inbox`);
  return locationsInboxSchema.parse(res.data);
}

/* ---- FalconGo: terminals + aliases ---------------------------------------- */

async function listTerminals(): Promise<Terminal[]> {
  const res = await apiClient.get(`${BASE}/terminals`);
  return terminalsEnvelopeSchema.parse(res.data).data;
}

async function updateTerminal(id: number, payload: UpdateTerminalPayload): Promise<void> {
  await apiClient.put(`${BASE}/terminals/${encodeURIComponent(id)}`, payload);
}

async function addTerminalAlias(terminalId: number, alias: string): Promise<void> {
  await apiClient.post(`${BASE}/terminals/${encodeURIComponent(terminalId)}/aliases`, {
    alias,
  });
}

async function deleteAlias(aliasId: number): Promise<void> {
  await apiClient.delete(`${BASE}/aliases/${encodeURIComponent(aliasId)}`);
}

/* ---- FalconGo: drop-off points -------------------------------------------- */

export interface DropoffFilters {
  q?: string;
  missing?: boolean;
}

async function listDropoffs(filters: DropoffFilters = {}): Promise<DropOffPoint[]> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.missing) params.set('missing', 'true');
  const qs = params.toString();
  const res = await apiClient.get(`${BASE}/dropoffs${qs ? `?${qs}` : ''}`);
  return dropoffsEnvelopeSchema.parse(res.data).data;
}

async function createDropoff(payload: CreateDropoffPayload): Promise<void> {
  await apiClient.post(`${BASE}/dropoffs`, payload);
}

async function updateDropoff(id: number, payload: UpdateDropoffPayload): Promise<void> {
  await apiClient.put(`${BASE}/dropoffs/${encodeURIComponent(id)}`, payload);
}

async function deleteDropoff(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/dropoffs/${encodeURIComponent(id)}`);
}

/* ---- Etit proxy: GPS pin suggestions --------------------------------------- */

async function listSuggestions(status = 'pending'): Promise<PinSuggestion[]> {
  const res = await apiClientEtit.get(
    `${ETIT_PREFIX}/suggestions?status=${encodeURIComponent(status)}`,
  );
  return z.array(pinSuggestionSchema).parse(res.data ?? []);
}

async function ackSuggestion(id: number, status: SuggestionAckStatus): Promise<void> {
  await apiClientEtit.post(`${ETIT_PREFIX}/suggestions/${encodeURIComponent(id)}/ack`, {
    status,
  });
}

export const locationApi = {
  getInbox,
  listTerminals,
  updateTerminal,
  addTerminalAlias,
  deleteAlias,
  listDropoffs,
  createDropoff,
  updateDropoff,
  deleteDropoff,
  listSuggestions,
  ackSuggestion,
} as const;
