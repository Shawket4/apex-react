import { apiClientRust } from '@/shared/api/client';
import {
  statisticsSchema,
  transactionPageSchema,
  transactionSchema,
  type ExpenseFormValues,
  type Transaction,
  type TransactionFilters,
  type TransactionPage,
  type TransactionStatistics,
} from './schemas';

/**
 * All calls hit apex-rust's `banksms` API under /api/v1/transactions.
 *
 * The legacy `/api/v1/fleet-expenses` endpoints are deliberately NOT used and
 * must not be reintroduced here: they read public.fleet_expenses, which this
 * module replaces. Those rows now live in banksms.transactions as
 * `source: 'import'`.
 */
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

/* ─── List (cursor-paginated) ─── */
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

/**
 * Walk every page for the current filters.
 *
 * The list endpoint is cursor-paginated and caps at 200 rows per request, but
 * the expenses view needs the full filtered set to chart and export it. Bounded
 * so a careless filter cannot spin forever.
 */
export async function getAllTransactions(
  filters: TransactionFilters,
  maxPages = 25,
): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let cursor: string | null | undefined = undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const result: TransactionPage = await getTransactions(filters, cursor, 200);
    all.push(...result.data);
    if (!result.next_cursor) return all;
    cursor = result.next_cursor;
  }

  return all;
}

/* ─── Single ─── */
export async function getTransaction(id: number): Promise<Transaction> {
  const response = await apiClientRust.get(`${BASE}/${id}`);
  return transactionSchema.parse(response.data);
}

/* ─── Aggregates ─── */
export async function getTransactionStatistics(
  filters: TransactionFilters,
): Promise<TransactionStatistics> {
  const response = await apiClientRust.get(`${BASE}/statistics`, {
    params: toParams(filters),
  });
  return statisticsSchema.parse(response.data);
}

/* ─── Create ─── */
export async function createTransaction(values: ExpenseFormValues): Promise<Transaction> {
  const response = await apiClientRust.post(BASE, {
    ...values,
    // Amount goes back as a string: the backend parses it into a Decimal, and
    // routing it through a JS float first is how cents go missing.
    amount: String(values.amount),
    // A date-only input means "that business day"; send it as an instant.
    occurred_at: toInstant(values.occurred_at),
  });
  return transactionSchema.parse(response.data);
}

/* ─── Update ─── */
/**
 * Partial update. `version` becomes the `If-Match` header — the server rejects
 * a stale one with 409 rather than silently overwriting a concurrent edit.
 *
 * Corrections to parser-owned fields (amount, counterparty, occurred_at, …) are
 * recorded as overrides server-side; the SMS's original reading is preserved and
 * visible under `parsed`.
 */
export async function updateTransaction(
  id: number,
  version: number,
  values: Partial<ExpenseFormValues> & {
    verified?: boolean;
    /** null clears the party; undefined leaves it alone. */
    driver_id?: number | null;
    employee_id?: number | null;
  },
): Promise<Transaction> {
  const payload: Record<string, unknown> = { ...values };
  if (values.amount !== undefined) payload.amount = String(values.amount);
  if (values.occurred_at) payload.occurred_at = toInstant(values.occurred_at);

  const response = await apiClientRust.patch(`${BASE}/${id}`, payload, {
    headers: { 'If-Match': String(version) },
  });
  return transactionSchema.parse(response.data);
}

/* ─── Soft delete ─── */
export async function deleteTransaction(id: number, version: number): Promise<void> {
  await apiClientRust.delete(`${BASE}/${id}`, {
    headers: { 'If-Match': String(version) },
  });
}

/* ─── Override history ─── */
export interface OverrideHistoryEntry {
  field: string;
  value: string | null;
  is_cleared: boolean;
  actor: string | null;
  set_at: string;
  superseded_at: string | null;
  is_current: boolean;
}

export async function getTransactionHistory(id: number): Promise<OverrideHistoryEntry[]> {
  const response = await apiClientRust.get<OverrideHistoryEntry[]>(`${BASE}/${id}/history`);
  return response.data ?? [];
}

/**
 * `<input type="date">` yields `YYYY-MM-DD`. Sent bare, the backend would read
 * it as midnight UTC, which lands on the previous day in Cairo (UTC+2/+3) and
 * silently shifts rows between months in reports. Anchoring at local midday
 * keeps the calendar date the user picked.
 */
function toInstant(dateOnly: string): string {
  if (!dateOnly) return dateOnly;
  if (dateOnly.includes('T')) return dateOnly;
  return new Date(`${dateOnly}T12:00:00`).toISOString();
}
