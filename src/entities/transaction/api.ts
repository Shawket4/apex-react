import { apiClientRust } from '@/shared/api/client';
import { cairoInstantFromInputs } from '@/shared/lib/cairo';
import {
  splitSetSchema,
  statisticsSchema,
  transactionPageSchema,
  transactionSchema,
  type SplitPartInput,
  type SplitSet,
  type Transaction,
  type TransactionFilters,
  type TransactionFormValues,
  type TransactionPage,
  type TransactionStatistics,
  type TransactionWriteExtras,
} from './schemas';

const BASE = '/api/v1/transactions';

/** Drop empty strings so they don't become `?category=` and match nothing. */
function toParams(filters: TransactionFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = String(value);
  }
  return params;
}

/* ─── List (cursor-paginated, occurred_at DESC keyset) ─── */
export async function getTransactions(
  filters: TransactionFilters,
  cursor?: string | null,
  limit = 100,
): Promise<TransactionPage> {
  const response = await apiClientRust.get(BASE, {
    params: { ...toParams(filters), ...(cursor ? { cursor } : {}), limit },
  });
  return transactionPageSchema.parse(response.data);
}

/* ─── Single (carries raw_body/raw_wa_timestamp for whatsapp rows) ─── */
export async function getTransaction(id: number): Promise<Transaction> {
  const response = await apiClientRust.get(`${BASE}/${id}`);
  return transactionSchema.parse(response.data);
}

/* ─── Aggregates — the only place totals come from ─── */
export async function getTransactionStatistics(
  filters: TransactionFilters,
): Promise<TransactionStatistics> {
  const response = await apiClientRust.get(`${BASE}/statistics`, {
    params: toParams(filters),
  });
  return statisticsSchema.parse(response.data);
}

/* ─── Export — the server renders the workbook over the whole filtered set ─── */
export async function exportTransactions(
  filters: TransactionFilters,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClientRust.get(`${BASE}/export`, {
    // The workbook mirrors the ledger, and the ledger is cash-out only.
    params: { ...toParams(filters), direction: 'out' },
    responseType: 'blob',
    // A wide range takes longer than an API call; don't trip the 15s default.
    timeout: 60_000,
  });

  const blob = new Blob([response.data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  let filename = 'expenses.xlsx';
  const disposition = response.headers?.['content-disposition'];
  if (typeof disposition === 'string') {
    const match = disposition.match(/filename="?([^";]+)"?/i);
    if (match?.[1]) filename = match[1];
  }
  return { blob, filename };
}

/* ─── Payload assembly ─── */

/**
 * Form values → wire body. The amount goes through VERBATIM as a string;
 * date + time inputs (Cairo wall clock) combine into one RFC3339 instant.
 * `nullEmpty` controls what happens to cleared optional text: POST omits it,
 * PATCH sends null so the server actually clears the column.
 */
function toPayload(
  values: Partial<TransactionFormValues> & TransactionWriteExtras,
  nullEmpty: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const text = (key: keyof TransactionFormValues) => {
    const v = values[key];
    if (v === undefined) return;
    const trimmed = String(v).trim();
    if (trimmed === '') {
      if (nullEmpty) payload[key] = null;
      return;
    }
    payload[key] = trimmed;
  };

  if (values.direction !== undefined) payload.direction = values.direction;
  if (values.amount !== undefined) payload.amount = values.amount.trim();
  text('currency');
  if (values.occurred_date) {
    payload.occurred_at = cairoInstantFromInputs(values.occurred_date, values.occurred_time);
  }
  text('category');
  text('account');
  text('counterparty');
  text('reference');
  text('description');
  text('payment_method');
  text('company');
  text('paid_by');

  if (values.car_id !== undefined) payload.car_id = values.car_id;
  if (values.driver_id !== undefined) payload.driver_id = values.driver_id;
  if (values.employee_id !== undefined) payload.employee_id = values.employee_id;
  if (values.raw_message_id !== undefined) payload.raw_message_id = values.raw_message_id;

  return payload;
}

/* ─── Create (raw_message_id present = promotion of an ignored message) ─── */
export async function createTransaction(
  values: TransactionFormValues & TransactionWriteExtras,
): Promise<Transaction> {
  const response = await apiClientRust.post(BASE, toPayload(values, false));
  return transactionSchema.parse(response.data);
}

/* ─── Update (If-Match; 409 = concurrent edit or settled loan) ─── */
export async function updateTransaction(
  id: number,
  version: number,
  values: Partial<TransactionFormValues> & TransactionWriteExtras,
): Promise<Transaction> {
  const response = await apiClientRust.patch(`${BASE}/${id}`, toPayload(values, true), {
    headers: { 'If-Match': String(version) },
  });
  return transactionSchema.parse(response.data);
}

/* ─── Soft delete (also soft-deletes a linked unpaid loan) ─── */
export async function deleteTransaction(id: number, version: number): Promise<void> {
  await apiClientRust.delete(`${BASE}/${id}`, {
    headers: { 'If-Match': String(version) },
  });
}

/* -------------------------------------------------------------------------- */
/* Splits                                                                      */
/*                                                                            */
/* The parent's `version` is ALWAYS the If-Match token — a split is an edit of  */
/* the parent, whichever row the sheet was opened from. Part amounts travel    */
/* verbatim as strings and must sum exactly to the parent amount; the server   */
/* is the arbiter and its 400/409 messages are surfaced to the user as-is.     */
/* -------------------------------------------------------------------------- */

/** Drop undefined fields so the wire body carries only what was set. */
function toPartsBody(parts: SplitPartInput[]): { parts: Record<string, unknown>[] } {
  return {
    parts: parts.map((part) => {
      const out: Record<string, unknown> = { amount: part.amount.trim() };
      if (part.category !== undefined) out.category = part.category;
      if (part.description !== undefined) out.description = part.description;
      if (part.driver_id !== undefined) out.driver_id = part.driver_id;
      if (part.employee_id !== undefined) out.employee_id = part.employee_id;
      if (part.paid_by !== undefined) out.paid_by = part.paid_by;
      if (part.car_id !== undefined) out.car_id = part.car_id;
      return out;
    }),
  };
}

/* ─── Read the set — id may be the parent OR any child ─── */
export async function getTransactionSplit(id: number): Promise<SplitSet> {
  const response = await apiClientRust.get(`${BASE}/${id}/split`);
  return splitSetSchema.parse(response.data);
}

/* ─── Create a split of an unsplit cash-out row ─── */
export async function createTransactionSplit(
  id: number,
  version: number,
  parts: SplitPartInput[],
): Promise<SplitSet> {
  const response = await apiClientRust.post(`${BASE}/${id}/split`, toPartsBody(parts), {
    headers: { 'If-Match': String(version) },
  });
  return splitSetSchema.parse(response.data);
}

/* ─── Replace an existing part set (id = parent) ─── */
export async function replaceTransactionSplit(
  id: number,
  version: number,
  parts: SplitPartInput[],
): Promise<SplitSet> {
  const response = await apiClientRust.put(`${BASE}/${id}/split`, toPartsBody(parts), {
    headers: { 'If-Match': String(version) },
  });
  return splitSetSchema.parse(response.data);
}

/* ─── Dissolve — 409 if any part's registered loan is already settled ─── */
export async function unsplitTransaction(id: number, version: number): Promise<void> {
  await apiClientRust.post(`${BASE}/${id}/unsplit`, undefined, {
    headers: { 'If-Match': String(version) },
  });
}
