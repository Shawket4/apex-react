import type { FuelEvent, FuelMethod } from '@/entities/fuel-event/schemas';
import { normaliseMethod } from '@/entities/fuel-event/schemas';
import type { EfficiencyMap } from '@/shared/lib/fuel';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type FuelEventStatusFilter = 'good' | 'average' | 'poor' | 'excluded' | 'paired';

export type FuelEventMethodFilter = 'all' | FuelMethod;

export type FuelEventSortKey = 'date' | 'rate' | 'cost' | 'liters';
export type SortDirection = 'asc' | 'desc';

export const ALL_FILTERS: FuelEventStatusFilter[] = [
  'good',
  'average',
  'poor',
  'paired',
  'excluded',
];

/* -------------------------------------------------------------------------- */
/* Helpers — apply to analysed events                                          */
/* -------------------------------------------------------------------------- */

export function applyStatusFilter(
  events: FuelEvent[],
  map: EfficiencyMap,
  active: Set<FuelEventStatusFilter>,
): FuelEvent[] {
  if (active.size === 0) return events;
  return events.filter((e) => {
    const a = map.get(e.ID);
    return !!a && active.has(a.status as FuelEventStatusFilter);
  });
}

/**
 * Filter by method. Runs AFTER pair analysis so pairing stays holistic
 * across methods — a Manual undershoot can pair with a PetroApp overshoot
 * for the same vehicle and both get flagged as paired regardless of which
 * method filter is active afterwards.
 */
export function applyMethodFilter(
  events: FuelEvent[],
  method: FuelEventMethodFilter,
): FuelEvent[] {
  if (method === 'all') return events;
  return events.filter((e) => normaliseMethod(e.method) === method);
}

/** Count events per method in a set — powers the badge counts on the tabs. */
export function countByMethod(events: FuelEvent[]): {
  all: number;
  PetroApp: number;
  Manual: number;
} {
  let petroApp = 0;
  let manual = 0;
  for (const e of events) {
    if (normaliseMethod(e.method) === 'PetroApp') petroApp++;
    else manual++;
  }
  return { all: events.length, PetroApp: petroApp, Manual: manual };
}

/**
 * Parse a 12-hour time string like "3:07 PM" into minutes since midnight.
 * Returns null for empty strings, malformed input, or any non-parseable value
 * — callers should fall through to a different tiebreaker when null.
 */
function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const meridiem = m[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  // 12 AM = 00:xx, 12 PM = 12:xx, otherwise add 12 for PM
  if (hours === 12) hours = 0;
  if (meridiem === 'PM') hours += 12;
  return hours * 60 + minutes;
}

/**
 * Sort events by the chosen key and direction.
 *
 * Ties are broken with a deterministic chain: date → time → odometer_before
 * → ID. This gives same-day events a sensible order by fueling time when
 * available, falls back to odometer_before (which monotonically increases
 * per vehicle), and lastly to ID (which guarantees stable ordering for
 * events with no better distinguisher). Tiebreakers follow the user's chosen
 * direction — sorting newest-first also breaks ties newest-first.
 *
 * `rate` uses the pair-aware effective rate so paired events sort by their
 * combined rate rather than the raw out-of-band one. Date primary sort is
 * string-comparable since we use ISO date strings.
 */
export function applySort(
  events: FuelEvent[],
  map: EfficiencyMap,
  key: FuelEventSortKey,
  direction: SortDirection,
): FuelEvent[] {
  const mult = direction === 'asc' ? 1 : -1;
  const sorted = [...events];

  sorted.sort((a, b) => {
    // Primary — whichever column the user picked
    let av: number | string;
    let bv: number | string;
    switch (key) {
      case 'rate':
        av = map.get(a.ID)?.effectiveRate ?? a.fuel_rate;
        bv = map.get(b.ID)?.effectiveRate ?? b.fuel_rate;
        break;
      case 'cost':
        av = a.price;
        bv = b.price;
        break;
      case 'liters':
        av = a.liters;
        bv = b.liters;
        break;
      case 'date':
      default:
        av = a.date;
        bv = b.date;
        break;
    }
    if (av < bv) return -1 * mult;
    if (av > bv) return 1 * mult;

    // Tiebreak 1 — date (skipped when date was the primary sort)
    if (key !== 'date') {
      if (a.date < b.date) return -1 * mult;
      if (a.date > b.date) return 1 * mult;
    }

    // Tiebreak 2 — time of day, if both events have parseable times
    const at = parseTimeToMinutes(a.time);
    const bt = parseTimeToMinutes(b.time);
    if (at !== null && bt !== null && at !== bt) {
      return (at - bt) * mult;
    }

    // Tiebreak 3 — odometer_before, monotonic per vehicle
    if (a.odometer_before !== b.odometer_before) {
      return (a.odometer_before - b.odometer_before) * mult;
    }

    // Tiebreak 4 — ID as the final stable fallback
    return (a.ID - b.ID) * mult;
  });

  return sorted;
}

/* -------------------------------------------------------------------------- */
/* URL <-> state serialization                                                 */
/* -------------------------------------------------------------------------- */

export function serializeFilters(active: Set<FuelEventStatusFilter>): string | null {
  if (active.size === 0) return null;
  return ALL_FILTERS.filter((k) => active.has(k)).join(',');
}

export function parseFilters(raw: string | null): Set<FuelEventStatusFilter> {
  const set = new Set<FuelEventStatusFilter>();
  if (!raw) return set;
  for (const part of raw.split(',')) {
    const trimmed = part.trim() as FuelEventStatusFilter;
    if (ALL_FILTERS.includes(trimmed)) set.add(trimmed);
  }
  return set;
}

export function serializeMethod(method: FuelEventMethodFilter): string | null {
  if (method === 'all') return null;
  if (method === 'PetroApp') return 'p';
  if (method === 'Manual') return 'm';
  return null;
}

export function parseMethod(raw: string | null): FuelEventMethodFilter {
  if (raw === 'p') return 'PetroApp';
  if (raw === 'm') return 'Manual';
  return 'all';
}
