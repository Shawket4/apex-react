/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

/** Translated unit letters for {@link formatDurationShort}. */
export interface DurationUnits {
  h: string;
  m: string;
  s: string;
}

const DEFAULT_DURATION_UNITS: DurationUnits = { h: 'h', m: 'm', s: 's' };

/** "1h 24m" / "4m 12s" — dwell badges and the skipped-dwell chip. */
export function formatDurationShort(ms: number, units?: DurationUnits): string {
  const u = units ?? DEFAULT_DURATION_UNITS;
  const secs = Math.round(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}${u.h} ${m}${u.m}`;
  if (m > 0) return s > 0 ? `${m}${u.m} ${s}${u.s}` : `${m}${u.m}`;
  return `${s}${u.s}`;
}

/** "2:41:07" — trip-local elapsed clock. */
export function formatElapsed(ms: number): string {
  const secs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
