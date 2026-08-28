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
import type { TransactionFilters } from './schemas';

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

/** The ledger list adds the out-only direction on top of the base filters. */
export function defaultLedgerListFilters(): TransactionFilters & { direction: 'out' } {
  return { ...defaultLedgerFilters(), direction: 'out' };
}
