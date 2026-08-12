import { apiClientRust } from '@/shared/api/client';
import { cairoInstantFromInputs } from '@/shared/lib/cairo';
import {
  statisticsSchema,
  transactionPageSchema,
  transactionSchema,
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
    params: toParams(filters),
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
