/* Pure arithmetic of a stock count: no React, no i18n. */

export type StockKind = 'tires' | 'oil';

/** The server refuses anything outside these. */
const MAX_COUNT: Record<StockKind, number> = { tires: 100_000, oil: 1_000_000 };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * What someone typed as "how many are there", as a number the server will
 * take: tires are whole, oil is liters to two places. null for anything else
 * (empty, negative, a fraction of a tire, too large).
 */
export function parseCounted(raw: string, kind: StockKind): number | null {
  // An Arabic keyboard types ٠-٩; they are the same figures.
  const trimmed = raw
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace('٫', '.');
  if (!/^\d+([.,]\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > MAX_COUNT[kind]) return null;
  if (kind === 'tires') return Number.isInteger(value) ? value : null;
  return round2(value);
}

export interface CountChange {
  /** What the count does to the book figure. */
  direction: 'add' | 'remove' | 'same';
  /** Always positive; zero for 'same'. */
  amount: number;
}

/** Book says `book`, the shelf holds `counted`: what will be put right. */
export function countChange(book: number, counted: number): CountChange {
  const diff = round2(counted - book);
  if (diff === 0) return { direction: 'same', amount: 0 };
  return { direction: diff > 0 ? 'add' : 'remove', amount: Math.abs(diff) };
}

export interface CountAttempt {
  /** What was submitted, as one string. */
  key: string;
  refId: string;
}

/**
 * The reference for a submission. Sending the same count again (a retry
 * after a lost answer) reuses the reference, so the server records it once.
 * A changed figure or note is a new count and gets a new reference: under
 * the old one the server would take it for the retry and drop it.
 */
export function attemptFor(
  previous: CountAttempt | null,
  key: string,
  makeId: () => string,
): CountAttempt {
  return previous && previous.key === key ? previous : { key, refId: makeId() };
}
