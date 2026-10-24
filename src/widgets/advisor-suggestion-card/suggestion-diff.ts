/**
 * The before → after rows of a suggestion: every field either side names,
 * in the order the server wrote them (before's keys first, then any field
 * only `after` has), with `changed` marking the ones the change touches.
 */
export interface DiffRow {
  field: string;
  before: string;
  after: string;
  changed: boolean;
}

export const EMPTY_VALUE = '—';

export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** `driver_name` → `Driver name`, for fields with no translation. */
export function humanizeField(field: string): string {
  const spaced = field.replace(/[_-]+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : field;
}

export function suggestionDiffRows(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): DiffRow[] {
  const fields = [...Object.keys(before)];
  for (const k of Object.keys(after)) if (!(k in before)) fields.push(k);
  return fields.map((field) => {
    const b = formatDiffValue(before[field]);
    const a = formatDiffValue(after[field]);
    return { field, before: b, after: a, changed: b !== a };
  });
}

/** A short line for what FalconGo answered, if it said anything readable. */
export function describeResult(result: unknown): string | null {
  if (result === null || result === undefined || result === '') return null;
  if (typeof result === 'string') return result;
  if (typeof result === 'object') {
    const r = result as { message?: unknown; error?: unknown };
    if (typeof r.error === 'string' && r.error) return r.error;
    if (typeof r.message === 'string' && r.message) return r.message;
  }
  return formatDiffValue(result);
}
