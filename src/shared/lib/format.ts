import { format as dateFnsFormat, isValid, parseISO as dateFnsParseISO } from 'date-fns';
import { DEFAULT_CURRENCY } from '@/shared/config/constants';

export function parseISO(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : dateFnsParseISO(value);
  return isValid(date) ? date : null;
}

export function format(date: Date | string | null | undefined, pattern = 'PPP'): string {
  const parsed = parseISO(date);
  if (!parsed) return '';
  return dateFnsFormat(parsed, pattern);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return format(date, 'PPp');
}

export function formatNumber(value: number | string | null | undefined, decimals = 0): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency = DEFAULT_CURRENCY,
): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(num)) return `0 ${currency}`;
  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)} ${currency}`;
}

export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text.toString().toLowerCase().trim();
}

export function toInputDate(date: Date | string | null | undefined): string {
  const parsed = parseISO(date);
  if (!parsed) return new Date().toISOString().split('T')[0];
  return parsed.toISOString().split('T')[0];
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function firstDayOfMonth(date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function lastDayOfMonth(date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function daysBetween(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1);
}

/* -------------------------------------------------------------------------- */
/* Local-timezone helpers (used by the date-range picker)                     */
/* -------------------------------------------------------------------------- */

/** Calendar parts in the browser's local timezone */
export interface LocalParts {
  y: number;
  m: number; // 0-indexed
  d: number;
}

/** Return today's calendar parts in the browser's local timezone */
export function localToday(): LocalParts {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

/**
 * Build a UTC ISO timestamp that represents the start (or end) of a given
 * local calendar day. This is what the backend expects when the user picks
 * "Apr 23" in their timezone.
 */
export function localDateISO(year: number, month: number, day: number, endOfDay = false): string {
  const d = endOfDay
    ? new Date(year, month, day, 23, 59, 59, 999)
    : new Date(year, month, day, 0, 0, 0, 0);
  return d.toISOString();
}

/** Extract local calendar parts {y, m, d} from an ISO string */
export function localParts(iso: string): LocalParts {
  const d = new Date(iso);
  return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
}

/** Short human date — "23 Apr 2026" */
export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/**
 * Convert any ISO timestamp to a plain `YYYY-MM-DD` string using the local
 * calendar day — *not* UTC. Important for backends that compare with DATE()
 * against local dates.
 */
export function toDateOnly(iso: string | Date | null | undefined): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (!d || !(d instanceof Date) || !Number.isFinite(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}