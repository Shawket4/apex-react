import {
  cairoInstantFromInputs,
  formatCairoDate,
  formatCairoTime,
} from '@/shared/lib/cairo';

/**
 * The before → after rows of a suggestion: every field either side names,
 * in the order the server wrote them (before's keys first, then any field
 * only `after` has), with `changed` marking the ones the change touches.
 * A field empty on both sides says nothing and is left out.
 */
export interface DiffRow {
  field: string;
  before: string;
  after: string;
  changed: boolean;
}

export const EMPTY_VALUE = '—';

/** Translate with a fallback; the shape of i18next's `t(key, default)`. */
export type Translate = (key: string, fallback: string) => string;

/** Renders one value for display; `field` picks how. */
export type ValueFormatter = (value: unknown, field: string) => string;

/** The maintenance categories maint-rust knows (record_service, service plans). */
export const MAINT_CATEGORIES = [
  'oil_change',
  'oil_filter',
  'air_filter',
  'fuel_filter',
  'brakes',
  'coolant',
  'transmission',
  'battery',
  'inspection',
  'greasing',
  'tires',
] as const;

const KNOWN_CATEGORIES = new Set<string>(MAINT_CATEGORIES);

/** Fields whose value is one maintenance category id, or a list of them. */
const CATEGORY_FIELDS = new Set(['tasks', 'category_id', 'categories']);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

/** `date`, `start_date`, `violation_date`…: a calendar day, never a time. */
function isDayField(field: string): boolean {
  return field === 'date' || field.endsWith('_date');
}

/** The plain, locale-free rendering: what a value is when nothing knows better. */
export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number')) {
    return value.length ? value.join(', ') : EMPTY_VALUE;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** "25 Oct 2026 · 10:36" in Cairo time, in the UI's language. */
export function formatInstant(instant: string, language: string): string {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return instant;
  return `${formatCairoDate(d, language)} · ${formatCairoTime(d, language)}`;
}

/** "25 Oct 2026" from a day key or the day part of a timestamp, no zone shift. */
export function formatDay(value: string, language: string): string {
  const day = value.slice(0, 10);
  if (!ISO_DAY.test(day)) return value;
  return formatCairoDate(cairoInstantFromInputs(day, '12:00'), language);
}

/**
 * The formatter the card uses: dates and timestamps in the user's locale
 * (Cairo wall clock), Yes/No, in/out, and maintenance categories by name.
 * Anything it does not recognise falls through to {@link formatDiffValue}.
 */
export function makeValueFormatter(t: Translate, language: string): ValueFormatter {
  const listSep = language.startsWith('ar') ? '، ' : ', ';
  const category = (id: string) =>
    t(`advisor.suggestion.categories.${id}`, humanizeField(id));

  return (value, field) => {
    if (value === null || value === undefined || value === '') return EMPTY_VALUE;
    if (typeof value === 'boolean') {
      return value ? t('advisor.suggestion.values.yes', 'Yes') : t('advisor.suggestion.values.no', 'No');
    }
    if (CATEGORY_FIELDS.has(field)) {
      const ids = Array.isArray(value)
        ? value.filter((v): v is string => typeof v === 'string')
        : typeof value === 'string'
          ? value.split(',').map((s) => s.trim()).filter(Boolean)
          : null;
      if (ids) return ids.length ? ids.map(category).join(listSep) : EMPTY_VALUE;
    }
    // A service record's default title is its categories joined ("oil_change, air_filter").
    if (field === 'title' && typeof value === 'string') {
      const ids = value.split(',').map((s) => s.trim());
      if (ids.every((id) => KNOWN_CATEGORIES.has(id))) return ids.map(category).join(listSep);
    }
    if (typeof value === 'string') {
      if (field === 'direction' && (value === 'in' || value === 'out')) {
        return t(`advisor.suggestion.values.direction.${value}`, value === 'in' ? 'In' : 'Out');
      }
      if (isDayField(field) && (ISO_DAY.test(value) || ISO_INSTANT.test(value))) {
        return formatDay(value, language);
      }
      if (ISO_INSTANT.test(value)) return formatInstant(value, language);
      if (ISO_DAY.test(value)) return formatDay(value, language);
    }
    return formatDiffValue(value);
  };
}

/** `driver_name` → `Driver name`, for fields with no translation. */
export function humanizeField(field: string): string {
  const spaced = field.replace(/[_-]+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : field;
}

export function suggestionDiffRows(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  format: ValueFormatter = formatDiffValue,
): DiffRow[] {
  const fields = [...Object.keys(before)];
  for (const k of Object.keys(after)) if (!(k in before)) fields.push(k);
  return fields.flatMap((field) => {
    const b = format(before[field], field);
    const a = format(after[field], field);
    if (b === EMPTY_VALUE && a === EMPTY_VALUE) return [];
    return [{ field, before: b, after: a, changed: b !== a }];
  });
}

/* -------------------------------------------------------------------------- */
/* What the target system answered                                             */
/* -------------------------------------------------------------------------- */

const MAX_RESULT = 300;

/** Keys that carry a readable reason, best first (RFC 7807 `detail` included). */
const REASON_KEYS = ['error', 'detail', 'message', 'title'] as const;
/** Where a wrapped upstream answer sits (maint-rust's conflict body). */
const NESTED_KEYS = ['response', 'body', 'result'] as const;

function clip(s: string): string {
  const t = s.trim();
  return t.length > MAX_RESULT ? `${t.slice(0, MAX_RESULT - 1)}…` : t;
}

/**
 * The readable reason inside an error body, or null. Strings that are
 * themselves JSON are read as JSON; markup and objects are never shown.
 */
export function readableReason(body: unknown, depth = 0): string | null {
  if (body === null || body === undefined || depth > 3) return null;
  if (typeof body === 'string') {
    const s = body.trim();
    if (!s) return null;
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        return readableReason(JSON.parse(s), depth + 1);
      } catch {
        return null;
      }
    }
    if (s.startsWith('<')) return null;
    return clip(s);
  }
  if (Array.isArray(body)) {
    for (const item of body) {
      const r = readableReason(item, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof body === 'object') {
    const r = body as Record<string, unknown>;
    for (const key of REASON_KEYS) {
      const v = r[key];
      if (typeof v === 'string' && v.trim()) return clip(v);
    }
    for (const key of NESTED_KEYS) {
      const found = readableReason(r[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * The line under a decided suggestion's status. An applied change says
 * nothing more (the status line already does; the stored record is not for
 * people). A failure gives the system's reason, or `fallback` when it gave
 * none worth reading — never a dumped object.
 */
export function describeResult(
  result: unknown,
  status: string,
  fallback: string,
): string | null {
  if (status !== 'failed') return null;
  return readableReason(result) ?? fallback;
}

/** Why the server's reset closed this suggestion, if it did. */
export function resetReason(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const reset = (result as { reset?: unknown }).reset;
  return typeof reset === 'string' && reset.trim() ? reset.trim() : null;
}

/** A failure whose HTTP status was 2xx: the request went through, an operation did not. */
export function isSuccessStatus(status: number | null | undefined): boolean {
  return typeof status === 'number' && status >= 200 && status < 300;
}
