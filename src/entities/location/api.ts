import { z } from 'zod';
import { apiClient, apiClientEtit } from '@/shared/api/client';
import {
  dropOffPointSchema,
  locationsInboxSchema,
  pinSuggestionSchema,
  receiptPatternSchema,
  resolveTerminalResponseSchema,
  terminalSchema,
  type CreateDropoffPayload,
  type DropOffPoint,
  type LocationsInbox,
  type PinSuggestion,
  type ReceiptPattern,
  type ResolveTerminalPayload,
  type ResolveTerminalResponse,
  type SuggestionAckStatus,
  type Terminal,
  type UpdateDropoffPayload,
  type UpdateTerminalPayload,
  type UpsertReceiptPatternPayload,
} from './schemas';

/**
 * Locations live on FalconGo (same base + auth as fee-mappings — the JWT
 * interceptor on `apiClient` covers the Verify(3) requirement for writes).
 * The GPS pin suggestions live on the etit proxy (`apiClientEtit`), same
 * base as the zones entity.
 *
 * Terminals moved to the new picked-by-id endpoints under `/api/terminals`
 * (per-company allowlists + receipt patterns); pin/radius/address edits stay
 * on the older `/api/locations/terminals/:id` endpoint.
 */

const BASE = '/api/locations';
const TERMINALS_BASE = '/api/terminals';
const ETIT_PREFIX = 'api/v1/trip-audit';

/* ---- Envelopes ----------------------------------------------------------- */

/** The backend sometimes wraps lists in `{ data: [...] }` — accept both. */
function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}

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

/* ---- FalconGo: terminals -------------------------------------------------- */

/**
 * List terminals. With `company`, returns the terminals allowed for that
 * company (each with its resolved `receipt_pattern`); without, returns all
 * terminals with their `allowed_companies`.
 */
async function listTerminals(company?: string): Promise<Terminal[]> {
  const qs = company?.trim() ? `?company=${encodeURIComponent(company.trim())}` : '';
  const res = await apiClient.get(`${TERMINALS_BASE}${qs}`);
  return z.array(terminalSchema).parse(unwrapList(res.data));
}

/**
 * Resolve-or-create-or-extend: if a terminal with this name exists, `company`
 * is added to its allowlist (`created: false, extended: true`); otherwise a
 * new pinless terminal is created (`created: true`).
 */
async function resolveTerminal(
  payload: ResolveTerminalPayload,
): Promise<ResolveTerminalResponse> {
  const res = await apiClient.post(TERMINALS_BASE, payload);
  return resolveTerminalResponseSchema.parse(res.data);
}

async function updateTerminal(id: number, payload: UpdateTerminalPayload): Promise<void> {
  await apiClient.put(`${BASE}/terminals/${encodeURIComponent(id)}`, payload);
}

/* ---- FalconGo: receipt patterns ------------------------------------------- */

async function listReceiptPatterns(terminalId: number): Promise<ReceiptPattern[]> {
  const res = await apiClient.get(
    `${TERMINALS_BASE}/${encodeURIComponent(terminalId)}/receipt-patterns`,
  );
  return z.array(receiptPatternSchema).parse(unwrapList(res.data));
}

/** Upsert keyed on (terminal, company) — empty company = "all companies". */
async function upsertReceiptPattern(
  terminalId: number,
  payload: UpsertReceiptPatternPayload,
): Promise<void> {
  await apiClient.put(
    `${TERMINALS_BASE}/${encodeURIComponent(terminalId)}/receipt-patterns`,
    payload,
  );
}

async function deleteReceiptPattern(terminalId: number, company: string): Promise<void> {
  await apiClient.delete(
    `${TERMINALS_BASE}/${encodeURIComponent(terminalId)}/receipt-patterns?company=${encodeURIComponent(company)}`,
  );
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
  resolveTerminal,
  updateTerminal,
  listReceiptPatterns,
  upsertReceiptPattern,
  deleteReceiptPattern,
  listDropoffs,
  createDropoff,
  updateDropoff,
  deleteDropoff,
  listSuggestions,
  ackSuggestion,
} as const;
