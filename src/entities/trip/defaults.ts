/**
 * The trips page's bare-navigation mount state, extracted so intent warmers
 * (sidebar hover, exception links) can reproduce the EXACT first query key.
 * trips.tsx imports these same helpers for its initial state — one source,
 * so the page and the warmer cannot drift apart.
 */

import {
  firstDayOfMonth,
  lastDayOfMonth,
  localDateISO,
  toDateOnly,
} from '@/shared/lib/format';
import { currentScopeSlice, readScopeCompany } from '@/shared/scope';
import type { TripListParams } from './schemas';

export const TRIPS_STORAGE_KEYS = {
  from: 'apex:trips:from',
  to: 'apex:trips:to',
  limit: 'apex:trips:limit',
} as const;

export function monthStartISO(): string {
  const d = firstDayOfMonth();
  return localDateISO(d.getFullYear(), d.getMonth(), d.getDate());
}
export function monthEndISO(): string {
  const d = lastDayOfMonth();
  return localDateISO(d.getFullYear(), d.getMonth(), d.getDate(), true);
}

/** localStorage read with validation — SSR-safe, garbage falls back. */
export function loadDefault<T>(
  key: string,
  fallback: T,
  validate: (v: string) => T | null,
): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  const valid = validate(raw);
  return valid !== null && valid !== undefined ? valid : fallback;
}

export const isValidLimit = (v: string): number | null => {
  const n = Number(v);
  return [10, 25, 50, 100].includes(n) ? n : null;
};

/** The list params (→ query key) of a navigation to /trips: dates + company
 *  come from the GLOBAL scope, exactly as the page reads them. */
export function defaultTripListParams(): TripListParams {
  const { range } = currentScopeSlice();
  return {
    page: 1,
    limit: loadDefault(TRIPS_STORAGE_KEYS.limit, 25, isValidLimit),
    search: '',
    company: readScopeCompany() ?? '',
    startDate: toDateOnly(range.from),
    endDate: toDateOnly(range.to),
    missingData: '',
    receiptStatus: '',
  };
}

/** The statistics tab's mount filters under the same scope. */
export function defaultStatisticsFilters(): {
  startDate?: string;
  endDate?: string;
  company?: string;
} {
  const { range } = currentScopeSlice();
  return {
    startDate: range.from,
    endDate: range.to,
    company: readScopeCompany() ?? undefined,
  };
}
