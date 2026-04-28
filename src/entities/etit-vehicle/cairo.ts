/**
 * Cairo-locked time helpers.
 *
 * The etit-proxy backend interprets `from`/`to` query parameters as
 * wall-clock time in `Africa/Cairo`. The browser's local timezone is not
 * Cairo for every user, so we MUST format requests in Cairo regardless
 * of what the browser thinks "now" is. Likewise, every timestamp we
 * render back to the user is rendered in Cairo so the dashboard reads
 * the same for everyone.
 *
 * DST note: Egypt has irregular DST observance (currently resumed).
 * `cairoFromParts` uses single-iteration offset correction, which is
 * correct outside DST transition hours. Inside the transition hour
 * itself there's a 1-hour ambiguity we don't resolve — Cairo midnight
 * is far from the transition so it doesn't bite in practice.
 */

const CAIRO_TZ = 'Africa/Cairo';

export interface CairoParts {
  year: number;
  /** 1-indexed (matches `Intl` and human readability). */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extract Cairo wall-clock fields from any `Date`. Exported so widgets
 * can avoid reimplementing this — earlier in the project's life this
 * lived in three different files with subtly different signatures.
 */
export function cairoParts(date: Date): CairoParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  // `hour: '2-digit'` with `hour12: false` can emit "24" for midnight on
  // some runtimes — normalise to 0.
  const rawHour = get('hour');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: get('minute'),
    second: get('second'),
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Proxy's expected `YYYY-MM-DDTHH:MM:SS` reading the wall clock in Cairo. */
export function formatCairoForProxy(date: Date): string {
  const p = cairoParts(date);
  return (
    `${p.year}-${pad2(p.month)}-${pad2(p.day)}` +
    `T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`
  );
}

/** Cairo `YYYY-MM-DD` for the `date=` query shortcut. */
export function formatCairoDate(date: Date): string {
  const p = cairoParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

export function cairoStartOfDay(date: Date = new Date()): Date {
  const p = cairoParts(date);
  return cairoFromParts(p.year, p.month, p.day, 0, 0, 0);
}

export function cairoEndOfDay(date: Date = new Date()): Date {
  const p = cairoParts(date);
  return cairoFromParts(p.year, p.month, p.day, 23, 59, 59, 999);
}

/**
 * Reverse of `cairoParts` — given Cairo wall-clock fields, return the
 * UTC instant they refer to. `month` is 1-indexed.
 */
export function cairoFromParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  // First guess: pretend Cairo is UTC.
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute, second, ms);

  // Measure the offset of Africa/Cairo at that instant by reading the
  // same wall-clock fields back out and computing the diff.
  const cairo = cairoParts(new Date(guessUtc));
  const cairoUtcEquivalent = Date.UTC(
    cairo.year,
    cairo.month - 1,
    cairo.day,
    cairo.hour,
    cairo.minute,
    cairo.second,
  );

  const offsetMs = cairoUtcEquivalent - guessUtc;
  return new Date(guessUtc - offsetMs);
}

/**
 * Format a Cairo-zoned timestamp for display.
 *
 * Locale defaults to `en-GB` for stability across the dashboard. Pass
 * `'ar-EG'` to render in Arabic — note Arabic locales use Arabic-Indic
 * numerals by default. Pass `'ar-EG-u-nu-latn'` to keep Latin digits
 * if you need tabular alignment with mixed Latin numbers elsewhere.
 */
export function formatCairo(
  value: string | Date | number | null | undefined,
  style: 'datetime' | 'date' | 'time' = 'datetime',
  locale: string = 'en-GB',
): string {
  if (value == null) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  const opts: Intl.DateTimeFormatOptions = { timeZone: CAIRO_TZ };
  if (style === 'date' || style === 'datetime') {
    opts.day = '2-digit';
    opts.month = 'short';
    opts.year = 'numeric';
  }
  if (style === 'time' || style === 'datetime') {
    opts.hour = '2-digit';
    opts.minute = '2-digit';
    opts.hour12 = true;
    if (style === 'time') opts.second = '2-digit';
  }

  return new Intl.DateTimeFormat(locale, opts).format(date);
}

/** Cairo HH:MM:SS string from any Date / ISO / millis. */
export function formatCairoClock(value: string | Date | number | null | undefined): string {
  if (value == null) return '--:--:--';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '--:--:--';
  const p = cairoParts(date);
  const h12 = p.hour % 12 || 12;
  const ampm = p.hour >= 12 ? 'PM' : 'AM';
  return `${pad2(h12)}:${pad2(p.minute)}:${pad2(p.second)} ${ampm}`;
}

/** Default range producer (today in Cairo). Moved here from widgets layer. */
export function defaultCairoTodayRange(): { from: Date; to: Date } {
  const now = new Date();
  return { from: cairoStartOfDay(now), to: cairoEndOfDay(now) };
}
