import type { Trip, TripListItem } from '@/entities/trip/schemas';
import { sumRevenue } from './revenue-breakdown';

/* -------------------------------------------------------------------------- */
/* One row, described once                                                     */
/*                                                                            */
/* The table and the mobile list render the same trips and had drifted into    */
/* disagreeing about them — one said "Multi-container #4295 · 2 containers"    */
/* where the other said "#884568 · 2 drops", and only one of them counted a    */
/* group of one as a group. Both now derive from this, so a change to what a   */
/* row MEANS happens in one place and a change to how it LOOKS happens in the  */
/* component.                                                                  */
/* -------------------------------------------------------------------------- */

export interface TripRow {
  /** Stable React key across both surfaces. */
  key: string;
  /** The row's containers. A standalone trip is a group of one. */
  containers: Trip[];
  /** The container whose fields represent the row: receipt, date, driver, car. */
  head: Trip;

  /**
   * True only for a genuine multi-drop trip.
   *
   * Every trip in 2026 belongs to a parent and 69% of those parents hold
   * exactly ONE container, so "has a parent" is not the same question as "is a
   * group" — treating them as the same is what produced rows labelled
   * "Multi-container … 1 container".
   */
  isGroup: boolean;
  /** Present when the row is a parent group, for parent-level actions. */
  parentId?: number;

  date: string;
  company: string;
  /** Where it started. */
  origin: string;
  /** Distinct drop-offs, in order. One entry for the common case. */
  drops: string[];

  /**
   * The row's receipt number, or undefined for a real multi-drop group.
   *
   * A parent trip has NO receipt of its own — each container carries one. The
   * first container's number is not the group's identity, and presenting it as
   * such shows one arbitrary child's paperwork as though it covered the whole
   * trip. Groups show a count instead and list the actual numbers on expand.
   */
  receiptNo?: string;

  litres: number;
  km: number;

  /** Undefined below permission 4 — never zero, which would read as "earned nothing". */
  revenue?: number;
  /** The fee mapping value, summed. A rate, or a band number, depending on company. */
  fee: number;
}

/** Arabic comma — these are Arabic place names, and the ASCII one reads wrong. */
export const DROP_SEPARATOR = '، ';

export function toRow(item: TripListItem): TripRow | null {
  const containers = item.type === 'standalone' ? [item.trip] : item.containers;
  const head = containers[0];
  if (!head) return null;

  return {
    key: item.type === 'standalone' ? `s-${item.trip.ID}` : `p-${item.parentId}`,
    containers,
    head,
    isGroup: containers.length > 1,
    parentId: item.type === 'parent' ? item.parentId : undefined,

    date: (head.date ?? '').slice(0, 10),
    company: head.company ?? '',
    origin: head.terminal ?? '',
    drops: [...new Set(containers.map((c) => c.drop_off_point).filter(Boolean))],

    receiptNo: containers.length === 1 ? head.receipt_no || undefined : undefined,

    litres: containers.reduce((sum, c) => sum + (c.tank_capacity || 0), 0),
    km: containers.reduce((sum, c) => sum + (c.mileage || c.distance || 0), 0),

    revenue: sumRevenue(containers, 'allocated_total'),
    fee: containers.reduce((sum, c) => sum + (c.fee || 0), 0),
  };
}

/** Consecutive runs of the same date, preserving the server's ordering. */
export function groupByDate(rows: TripRow[]): { date: string; rows: TripRow[] }[] {
  const days: { date: string; rows: TripRow[] }[] = [];
  for (const row of rows) {
    const last = days[days.length - 1];
    if (last && last.date === row.date) last.rows.push(row);
    else days.push({ date: row.date, rows: [row] });
  }
  return days;
}
