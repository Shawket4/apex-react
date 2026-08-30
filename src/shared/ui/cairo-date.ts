import { cairoParts } from '@/shared/lib/cairo';

/* -------------------------------------------------------------------------- */
/* Day-parts helpers shared by the Cairo range calendar and its callers.       */
/* -------------------------------------------------------------------------- */

export type DayParts = { y: number; m: number; d: number };

export const toNum = (p?: DayParts | null) => (p ? p.y * 10000 + p.m * 100 + p.d : null);

export const dayIso = (p: DayParts) =>
  `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;

export function cairoTodayParts(): DayParts {
  const p = cairoParts(new Date());
  return { y: p.y, m: p.m, d: p.d };
}

export function partsOfDay(iso: string): DayParts {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

/** A Date whose CAIRO calendar fields are (y, m, d) — noon UTC is safely
 *  inside the same Cairo day at any offset. */
export function tzDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, 12));
}
