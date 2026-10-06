/**
 * The ledger page's bare-navigation mount filters, extracted so the sidebar's
 * data warmer reproduces the EXACT first query keys (infinite list + stats).
 * fleet-expenses.tsx builds its state from the same pieces — one source.
 */

import {
  currentScopeSlice,
  readScopeCompany,
  scopeRangeToInstants,
} from '@/shared/scope';
import {
  DEFAULT_TRANSACTION_SORT,
  UNCATEGORIZED_KEY,
  type TransactionFilters,
  type TransactionSort,
} from './schemas';

/** Mount filters of a navigation — the GLOBAL scope's range as Cairo
 *  day-boundary instants + its company, every field explicit so the object
 *  shape inside the query key matches the page exactly. */
export function defaultLedgerFilters(): TransactionFilters {
  const { from, to } = scopeRangeToInstants(currentScopeSlice().range);
  return {
    from,
    to,
    category: undefined,
    company: readScopeCompany() ?? undefined,
    payment_method: undefined,
    source: undefined,
    q: undefined,
    include_fuel: undefined,
    include_loans: undefined,
  };
}

/** The default view is the work queue: the statistics key adds the
 *  uncategorized filter to the base filters and drops the company (the queue
 *  spans every company) — same shape the page builds. */
export function defaultLedgerStatsFilters(): TransactionFilters {
  return { ...defaultLedgerFilters(), company: undefined, category: UNCATEGORIZED_KEY };
}

/** The queue's list adds the out-only direction and its sort on top. */
export function defaultLedgerListFilters(): TransactionFilters & {
  direction: 'out';
  sort: TransactionSort;
} {
  return { ...defaultLedgerStatsFilters(), direction: 'out', sort: DEFAULT_TRANSACTION_SORT };
}
