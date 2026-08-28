/**
 * The fuel-events page's bare-navigation mount range, extracted so the
 * sidebar's data warmer reproduces the EXACT first query key. The page
 * imports these same helpers for its initial state — one source, no drift.
 */

import { loadDefault, monthEndISO, monthStartISO } from '@/entities/trip/defaults';

export const FUEL_STORAGE_KEYS = {
  grouping: 'apex:fuel-events:grouping',
  from: 'apex:fuel-events:from',
  to: 'apex:fuel-events:to',
} as const;

/** The date range the page mounts with when the URL carries none. */
export function defaultFuelRange(): { from: string; to: string } {
  return {
    from:
      loadDefault(FUEL_STORAGE_KEYS.from, null as string | null, (v) => v) ??
      monthStartISO(),
    to:
      loadDefault(FUEL_STORAGE_KEYS.to, null as string | null, (v) => v) ??
      monthEndISO(),
  };
}
