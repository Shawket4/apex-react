import type { LegacyStats, UnmatchedPage, UnmatchedRow } from './schemas';

/* Pure reading of the review list: no React, no i18n. */

/** Old lines still waiting for someone: neither recognised nor ignored. */
export function waitingLines(stats: LegacyStats): number {
  return Math.max(0, stats.lines - stats.recognised - stats.ignored);
}

/**
 * The page as it will read once a decision lands: the wording leaves the
 * list and its lines move to "recognised" or "ignored". A wording that is
 * not in the list changes nothing.
 */
export function applyDecision(
  page: UnmatchedPage,
  normText: string,
  categoryId: string | null,
): UnmatchedPage {
  const row = page.rows.find((candidate) => candidate.norm_text === normText);
  if (!row) return page;
  const stats = { ...page.stats };
  if (categoryId === null) stats.ignored += row.lines;
  else stats.recognised += row.lines;
  return { ...page, rows: page.rows.filter((candidate) => candidate !== row), stats };
}

/** Fold what makes two spellings of one Arabic word look different. */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ]/g, '') // harakat, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rows whose wording holds every word of the search, in any order. */
export function searchWordings(rows: UnmatchedRow[], query: string): UnmatchedRow[] {
  const words = fold(query).split(' ').filter(Boolean);
  if (words.length === 0) return rows;
  return rows.filter((row) => {
    const haystack = fold(`${row.text ?? ''} ${row.norm_text}`);
    return words.every((word) => haystack.includes(word));
  });
}
