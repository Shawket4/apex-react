import type { DueRow, FittedBattery, TirePosition, WorkOrderRow } from './schemas';

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
export const BATTERY_STATUSES = ['installed', 'in_stock_used', 'charging', 'warranty', 'scrapped'] as const;

/**
 * Tabs for a list: the known statuses, then any the server counts that this
 * build has never heard of, so a new status is reachable, not hidden.
 */
function statusTabs(known: readonly string[], counts: Record<string, number>): string[] {
  const extra = Object.keys(counts)
    .filter((status) => !known.includes(status))
    .sort();
  return [...known, ...extra];
}

export function tireStatusTabs(counts: Record<string, number>): string[] {
  return statusTabs(TIRE_STATUSES, counts);
}

export function batteryStatusTabs(counts: Record<string, number>): string[] {
  return statusTabs(BATTERY_STATUSES, counts);
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

/**
 * The task names of an order in the reader's language. English falls back to
 * the Arabic the garage wrote, so render it inside `dir="auto"`.
 */
export function workOrderSummary(
  row: Pick<WorkOrderRow, 'summary' | 'summary_en'>,
  language: string | undefined,
): string | null {
  return localName(row.summary, row.summary_en, language);
}

/** True for a string `new Date` can read. */
export function isReadableInstant(value: string | null | undefined): value is string {
  return !!value && Number.isFinite(new Date(value).getTime());
}

/* ----------------------------- Wheel positions ----------------------------- */

/** What the label needs to know about a wheel position. */
export type WheelWhere = Pick<
  TirePosition,
  'section' | 'axle_index' | 'is_steering' | 'side' | 'depth' | 'is_spare' | 'spare_index'
>;

/** A translator: `maintenance.wheel.*` keys in, words out. */
export type Translate = (key: string, vars?: Record<string, string>) => string;

/** Digits the way the reader writes them: ١ ٢ ٣ in Arabic, 1 2 3 otherwise. */
export function digits(value: number, language: string | undefined): string {
  return new Intl.NumberFormat(language?.startsWith('ar') ? 'ar-EG' : 'en', {
    useGrouping: false,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * A wheel position in words: "Front left", "Tractor axle 2 · right inner",
 * "Spare 1". Built only from what the server sent; a part it did not send (or
 * a value this build has never heard of) is left out rather than guessed, and
 * null means there is nothing to say, so the caller shows the code alone.
 */
export function wheelLabel(
  position: WheelWhere,
  tr: Translate,
  language: string | undefined,
): string | null {
  const K = 'maintenance.wheel';

  if (position.is_spare) {
    return position.spare_index !== null
      ? tr(`${K}.spareNumber`, { n: digits(position.spare_index, language) })
      : tr(`${K}.spare`);
  }

  const side =
    position.side === 'left' || position.side === 'right' ? tr(`${K}.side.${position.side}`) : null;
  const depth =
    position.depth === 'inner' || position.depth === 'outer'
      ? tr(`${K}.depth.${position.depth}`)
      : null;
  const section =
    position.section === 'tractor' || position.section === 'trailer' ? position.section : null;
  const axle = position.axle_index !== null && position.axle_index > 0 ? position.axle_index : null;

  // The steering axle is "the front" to everyone in the yard. A second
  // steering axle is named by its number like any other.
  if (position.is_steering && (axle === null || axle === 1) && depth === null) {
    return side ? tr(`${K}.frontSide`, { side }) : tr(`${K}.front`);
  }

  const where =
    axle !== null
      ? tr(`${K}.axle.${section ?? 'any'}`, { n: digits(axle, language) })
      : section
        ? tr(`${K}.section.${section}`)
        : null;
  const which =
    side && depth ? tr(`${K}.sideDepth`, { side, depth }) : (side ?? depth);

  const parts = [where, which].filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/* -------------------------------- Batteries -------------------------------- */

/** What names a battery's electrics; CCA rides along when it is known. */
export interface BatterySpecFields {
  capacity_ah: number | null;
  voltage: number | null;
  cca?: number | null;
}

/**
 * "100Ah · 12V", with " · 800 CCA" when asked for and known. Units stay Latin
 * in either language, as they are printed on the battery. null when nothing
 * is known, so the caller shows a dash or leaves the line out.
 */
export function batterySpec(
  spec: BatterySpecFields,
  { cca = false }: { cca?: boolean } = {},
): string | null {
  const parts = [
    spec.capacity_ah !== null ? `${spec.capacity_ah}Ah` : null,
    spec.voltage !== null ? `${spec.voltage}V` : null,
    cca && spec.cca !== null && spec.cca !== undefined ? `${spec.cca} CCA` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** True only for a warranty end that has passed; unknown is not "over". */
export function warrantyOver(until: string | null | undefined, now: Date = new Date()): boolean {
  if (!isReadableInstant(until)) return false;
  return new Date(until).getTime() < now.getTime();
}

/** The garage allows 12; past this a slot number is taken for a mistake. */
const MAX_SLOT = 24;

export interface BatterySlot {
  slot: number;
  /** null: the slot is empty. */
  install: FittedBattery | null;
}

/**
 * The truck's slots 1..n, each with the battery fitted in it. n is the
 * layout's count, or more when a battery sits in a higher slot. A fitted
 * battery with no usable slot number, or a second one in a slot, is kept
 * apart rather than dropped.
 */
export function batterySlots(
  slots: number | null,
  fitted: FittedBattery[],
): { slots: BatterySlot[]; unplaced: FittedBattery[] } {
  const bySlot = new Map<number, FittedBattery>();
  const unplaced: FittedBattery[] = [];
  for (const install of fitted) {
    const slot = install.slot;
    if (slot !== null && Number.isInteger(slot) && slot >= 1 && slot <= MAX_SLOT && !bySlot.has(slot)) {
      bySlot.set(slot, install);
    } else {
      unplaced.push(install);
    }
  }
  const layout =
    slots !== null && Number.isInteger(slots) && slots >= 1 ? Math.min(slots, MAX_SLOT) : 2;
  const count = Math.max(layout, ...bySlot.keys());
  return {
    slots: Array.from({ length: count }, (_, i) => ({ slot: i + 1, install: bySlot.get(i + 1) ?? null })),
    unplaced,
  };
}
