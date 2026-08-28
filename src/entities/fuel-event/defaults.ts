/**
 * The fuel-events page's bare-navigation mount range, extracted so the
 * sidebar's data warmer reproduces the EXACT first query key. The page
 * imports these same helpers for its initial state — one source, no drift.
 */

import { currentScopeSlice } from '@/shared/scope';

export const FUEL_STORAGE_KEYS = {
  grouping: 'apex:fuel-events:grouping',
} as const;

/** The range the page mounts with — the GLOBAL scope's, exactly. */
export function defaultFuelRange(): { from: string; to: string } {
  return currentScopeSlice().range;
}
