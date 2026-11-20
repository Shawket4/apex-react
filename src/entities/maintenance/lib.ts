import type { DueRow, TirePosition } from './schemas';

/* -------------------------------------------------------------------------- */
/* Pure reading of maintenance rows: no React, no i18n                         */
/* -------------------------------------------------------------------------- */

export type Tone = 'destructive' | 'warning' | 'success' | 'secondary';

/**
 * How loud a due status is. `never_done` and `unknown` are warnings, not
 * "fine": nobody knows where the truck stands. A status this build has never
 * heard of is neutral rather than green.
 */
export function dueTone(status: string): Tone {
  switch (status) {
    case 'overdue':
      return 'destructive';
    case 'never_done':
    case 'due_soon':
    case 'unknown':
      return 'warning';
    case 'ok':
      return 'success';
    default:
      return 'secondary';
  }
}

export interface Remaining {
  /** True when the figure is how far PAST due the truck is. */
  late: boolean;
  /** Always positive. */
  amount: number;
}

function remaining(value: number | null): Remaining | null {
  if (value === null) return null;
  return { late: value < 0, amount: Math.abs(Math.round(value)) };
}

/**
 * What is left on a plan, by distance and by time. Either side is null when
 * the plan does not count that way or the server could not work it out (a km
 * plan on a truck with no odometer reading).
 */
export function dueRemaining(row: Pick<DueRow, 'km_remaining' | 'days_remaining'>): {
  km: Remaining | null;
  days: Remaining | null;
} {
  return { km: remaining(row.km_remaining), days: remaining(row.days_remaining) };
}

export interface TireGroups {
  tractor: TirePosition[];
  trailer: TirePosition[];
  spares: TirePosition[];
  /** Positions on an axle with no section recorded. */
  other: TirePosition[];
}

/** Wheel positions by where they sit, in the order the server sent them. */
export function groupTirePositions(positions: TirePosition[]): TireGroups {
  const groups: TireGroups = { tractor: [], trailer: [], spares: [], other: [] };
  for (const position of positions) {
    if (position.is_spare) groups.spares.push(position);
    else if (position.section === 'tractor') groups.tractor.push(position);
    else if (position.section === 'trailer') groups.trailer.push(position);
    else groups.other.push(position);
  }
  return groups;
}

/** The statuses the garage uses, in the order the tabs show them. */
export const TIRE_STATUSES = ['mounted', 'in_stock_used', 'in_repair', 'retreading', 'scrapped'] as const;

/**
 * Tabs for the tire list: the known statuses, then any the server counts that
 * this build has never heard of, so a new status is reachable, not hidden.
 */
export function tireStatusTabs(counts: Record<string, number>): string[] {
  const known: readonly string[] = TIRE_STATUSES;
  const extra = Object.keys(counts)
    .filter((status) => !known.includes(status))
    .sort();
  return [...known, ...extra];
}

export function totalOf(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/** Pages for a server-paged list; never fewer than one. */
export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** A name in the reader's language, falling back to the other one. */
export function localName(
  ar: string | null | undefined,
  en: string | null | undefined,
  language: string | undefined,
): string | null {
  const first = language?.startsWith('ar') ? ar : en;
  const second = language?.startsWith('ar') ? en : ar;
  return first?.trim() || second?.trim() || null;
}

/** True for a string `new Date` can read. */
export function isReadableInstant(value: string | null | undefined): value is string {
  return !!value && Number.isFinite(new Date(value).getTime());
}
