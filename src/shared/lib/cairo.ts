/**
 * Africa/Cairo calendar helpers.
 *
 * Every calendar boundary this feature sends or renders is a CAIRO day (D6 in
 * the rebuild proposal), regardless of the browser's timezone. The API takes
 * RFC3339 instants and returns `by_date` keys that are Cairo calendar days,
 * so the client must be able to convert both ways without a tz library:
 * `Intl.DateTimeFormat` with `timeZone: 'Africa/Cairo'` is that library.
 */

export const CAIRO_TZ = 'Africa/Cairo';

export interface CairoParts {
  y: number;
  m: number; // 0-indexed, like Date
  d: number;
  hh: number;
  mm: number;
  ss: number;
}

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: CAIRO_TZ,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Cairo wall-clock parts of a UTC instant. */
export function cairoParts(instant: string | Date): CairoParts {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  const parts = partsFmt.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    y: get('year'),
    m: get('month') - 1,
    d: get('day'),
    // Some engines render midnight as "24" with hour12: false.
    hh: get('hour') % 24,
    mm: get('minute'),
    ss: get('second'),
  };
}

/** Cairo's UTC offset (ms) at a given instant — +2h EET or +3h EEST. */
function cairoOffsetMs(at: Date): number {
  const p = cairoParts(at);
  const wallAsUTC = Date.UTC(p.y, p.m, p.d, p.hh, p.mm, p.ss);
  return wallAsUTC - (at.getTime() - at.getMilliseconds());
}

/**
 * The UTC instant of a Cairo wall-clock time, as an ISO string.
 *
 * Two passes: guess using the offset "now at that UTC time", then correct
 * with the offset at the guessed instant. This settles correctly on either
 * side of a DST switch.
 */
export function cairoInstant(
  y: number,
  m: number,
  d: number,
  hh = 0,
  mm = 0,
  ss = 0,
  ms = 0,
): string {
  const asUTC = Date.UTC(y, m, d, hh, mm, ss, ms);
  let guess = asUTC - cairoOffsetMs(new Date(asUTC));
  guess = asUTC - cairoOffsetMs(new Date(guess));
  return new Date(guess).toISOString();
}

/** Today's Cairo calendar date. */
export function cairoToday(): { y: number; m: number; d: number } {
  const p = cairoParts(new Date());
  return { y: p.y, m: p.m, d: p.d };
}

/**
 * [first instant, last ms] of a Cairo calendar month. `m` may overflow or
 * underflow (12 → January next year) — Date.UTC normalises it.
 */
export function cairoMonthRange(y: number, m: number): [string, string] {
  const from = cairoInstant(y, m, 1);
  const to = new Date(Date.parse(cairoInstant(y, m + 1, 1)) - 1).toISOString();
  return [from, to];
}

/** [first instant, last ms] of a Cairo calendar year. */
export function cairoYearRange(y: number): [string, string] {
  const from = cairoInstant(y, 0, 1);
  const to = new Date(Date.parse(cairoInstant(y + 1, 0, 1)) - 1).toISOString();
  return [from, to];
}

/** [start of day, end of day] instants for one Cairo calendar day. */
export function cairoDayRange(y: number, m: number, d: number): [string, string] {
  const from = cairoInstant(y, m, d);
  const to = new Date(Date.parse(cairoInstant(y, m, d + 1)) - 1).toISOString();
  return [from, to];
}

/** 'YYYY-MM-DD' Cairo calendar day of an instant — matches `by_date.date`. */
export function cairoDayKey(instant: string | Date): string {
  const p = cairoParts(instant);
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** `<input type="date">` value for an instant, in Cairo. */
export function cairoDateInput(instant: string | Date): string {
  return cairoDayKey(instant);
}

/** `<input type="time">` value for an instant, in Cairo. */
export function cairoTimeInput(instant: string | Date): string {
  const p = cairoParts(instant);
  return `${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`;
}

/** Combine date ('YYYY-MM-DD') and time ('HH:mm') inputs into an instant. */
export function cairoInstantFromInputs(date: string, time?: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '12:00').split(':').map(Number);
  return cairoInstant(y, (m ?? 1) - 1, d ?? 1, hh ?? 12, mm ?? 0);
}

/* ─── Display formatting (locale-aware, always Cairo wall clock) ─── */

const fmtCache = new Map<string, Intl.DateTimeFormat>();

function getFmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(opts);
  let fmt = fmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { timeZone: CAIRO_TZ, ...opts });
    fmtCache.set(key, fmt);
  }
  return fmt;
}

function localeOf(language?: string): string {
  return language?.startsWith('ar') ? 'ar-EG' : 'en-GB';
}

/** "Wed 12 Aug" from a 'YYYY-MM-DD' day key (or any instant). */
export function formatCairoDay(dayKeyOrInstant: string, language?: string): string {
  const instant = /^\d{4}-\d{2}-\d{2}$/.test(dayKeyOrInstant)
    ? cairoInstantFromInputs(dayKeyOrInstant, '12:00')
    : dayKeyOrInstant;
  return getFmt(localeOf(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(instant));
}

/** "9 Aug" — compact axis ticks from a 'YYYY-MM-DD' day key (or instant). */
export function formatCairoDayShort(dayKeyOrInstant: string, language?: string): string {
  const instant = /^\d{4}-\d{2}-\d{2}$/.test(dayKeyOrInstant)
    ? cairoInstantFromInputs(dayKeyOrInstant, '12:00')
    : dayKeyOrInstant;
  return getFmt(localeOf(language), { day: 'numeric', month: 'short' }).format(
    new Date(instant),
  );
}

/** "19:52" — Cairo wall-clock time of an instant. */
export function formatCairoTime(instant: string | Date, language?: string): string {
  return getFmt(localeOf(language), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(typeof instant === 'string' ? new Date(instant) : instant);
}

/** "Tue 11 Aug · 09:02" — message envelope timestamps. */
export function formatCairoDateTime(instant: string | Date, language?: string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return `${formatCairoDay(d.toISOString(), language)} · ${formatCairoTime(d, language)}`;
}

/** "12 Aug 2026" — dates on chips and notes. */
export function formatCairoDate(instant: string | Date, language?: string): string {
  return getFmt(localeOf(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(typeof instant === 'string' ? new Date(instant) : instant);
}

/** "August 2026" — the month strip label. */
export function formatCairoMonth(y: number, m: number, language?: string): string {
  return getFmt(localeOf(language), { month: 'long', year: 'numeric' }).format(
    new Date(cairoInstant(y, m, 15)),
  );
}
