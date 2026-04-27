/**
 * Cairo-locked time helpers.
 *
 * The etit-proxy backend interprets `from` / `to` query parameters as
 * **wall-clock time in `Africa/Cairo`** (configurable via env, but Cairo
 * in our deployment). The Rust side converts that back to UTC and on to
 * the legacy ETIT system, which itself thinks in Cairo time.
 *
 * The browser's local timezone is not Cairo for every user — drivers and
 * managers travel — so we MUST format requests in Cairo regardless of
 * what the browser thinks "now" is. Likewise, every timestamp we render
 * back to the user is rendered in Cairo so the dashboard reads the same
 * for everyone.
 *
 * No external date library is needed for this; `Intl.DateTimeFormat`
 * with `timeZone: 'Africa/Cairo'` does it all.
 */

const CAIRO_TZ = 'Africa/Cairo';

/* -------------------------------------------------------------------------- */
/* Internal: extract Cairo wall-clock parts from any Date                      */
/* -------------------------------------------------------------------------- */

interface CairoParts {
  year: number;
  month: number; // 1-indexed for human readability (matches Intl)
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function cairoParts(date: Date): CairoParts {
  // `formatToParts` returns the same calendar fields the user would see on
  // a Cairo wall clock, regardless of the runtime's local timezone.
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

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Format a Date as the proxy's expected `YYYY-MM-DDTHH:MM:SS` string,
 * reading the wall clock in Africa/Cairo. The proxy parses this back as
 * Cairo local time on the server.
 *
 * Example: a `Date` whose UTC instant is 12:00 UTC on a winter day
 * becomes "...T14:00:00" (Cairo is UTC+2 in winter).
 */
export function formatCairoForProxy(date: Date): string {
  const p = cairoParts(date);
  return (
    `${p.year}-${pad2(p.month)}-${pad2(p.day)}` +
    `T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`
  );
}

/**
 * Cairo `YYYY-MM-DD` for a given Date. Used by the `date=` query
 * shortcut, where the proxy resolves the boundaries itself.
 */
export function formatCairoDate(date: Date): string {
  const p = cairoParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/**
 * "Today" in Cairo as a JS Date pointing to the *Cairo midnight* instant.
 *
 * We don't trust `new Date()` to land at the right calendar day on a
 * browser configured to a non-Cairo TZ; instead we read today's Cairo
 * date parts and reconstruct an instant that — when re-formatted back
 * through Cairo — yields 00:00:00.
 */
export function cairoStartOfDay(date: Date = new Date()): Date {
  const p = cairoParts(date);
  return cairoFromParts(p.year, p.month, p.day, 0, 0, 0);
}

/** End-of-day in Cairo (23:59:59.999). */
export function cairoEndOfDay(date: Date = new Date()): Date {
  const p = cairoParts(date);
  return cairoFromParts(p.year, p.month, p.day, 23, 59, 59, 999);
}

/**
 * Reverse of `cairoParts` — given Cairo wall-clock fields, return the
 * UTC instant they refer to. Iteratively corrects for DST: the naïve
 * `Date.UTC(...)` is treated as UTC, then we measure the timezone delta
 * at that instant and shift.
 *
 * `month` here is 1-indexed (matches every other function in this file).
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

  // Measure offset of Africa/Cairo at that instant by reading the same
  // wall-clock fields back out and computing the diff between the
  // intended fields and what Cairo reports.
  const guessDate = new Date(guessUtc);
  const cairo = cairoParts(guessDate);
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
 * Format a UTC ISO timestamp (or Date / millis) as a human-readable
 * Cairo string.
 *
 * Used everywhere we surface backend timestamps to the user:
 *   - "23 Apr 2026, 16:42"   (default)
 *   - "16:42:18"              (when `style: 'time'`)
 *   - "23 Apr 2026"           (when `style: 'date'`)
 */
export function formatCairo(
  value: string | Date | number | null | undefined,
  style: 'datetime' | 'date' | 'time' = 'datetime',
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

  return new Intl.DateTimeFormat('en-GB', opts).format(date);
}

/**
 * Cairo time-of-day string (HH:MM:SS) from any Date / ISO / millis —
 * handy for the playback player's clock readout.
 */
export function formatCairoClock(value: string | Date | number | null | undefined): string {
  if (value == null) return '--:--:--';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '--:--:--';
  const p = cairoParts(date);
  const h12 = p.hour % 12 || 12;
  const ampm = p.hour >= 12 ? 'PM' : 'AM';
  return `${pad2(h12)}:${pad2(p.minute)}:${pad2(p.second)} ${ampm}`;
}
