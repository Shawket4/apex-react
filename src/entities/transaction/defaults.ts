/**
 * The ledger page's bare-navigation mount filters, extracted so the sidebar's
 * data warmer reproduces the EXACT first query keys (infinite list + stats).
 * fleet-expenses.tsx builds its state from the same pieces — one source.
 */

import { cairoMonthRange, cairoToday } from '@/shared/lib/cairo';
import type { TransactionFilters } from './schemas';

/** The month-to-now range the ledger mounts with when the URL carries none. */
export function defaultLedgerRange(): [string, string] {
  const today = cairoToday();
  return cairoMonthRange(today.y, today.m);
}

/** Mount filters of a bare navigation — every field explicit, as the page
 *  builds them, so the object shape inside the query key matches exactly. */
export function defaultLedgerFilters(): TransactionFilters {
  const [from, to] = defaultLedgerRange();
  return {
    from,
    to,
    category: undefined,
    company: undefined,
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
