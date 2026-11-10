import { DOCUMENT_EXPIRY_WARNING_DAYS } from '@/entities/car/expiry';
import { cairoDayKey } from '@/shared/lib/cairo';
import type { DocumentType, DocumentVersion, OwnerDocument } from './schemas';

/**
 * Where a document stands against its expiry date.
 *
 * `undated` is not a fault: nothing about a document is required, and a photo
 * or a paper that never lapses simply has no expiry date.
 */
export type DocumentStatus = 'valid' | 'expiring' | 'expired' | 'undated';

/** Most urgent first: the order lists and summaries sort by. */
export const DOCUMENT_STATUSES: readonly DocumentStatus[] = [
  'expired',
  'expiring',
  'valid',
  'undated',
];

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayNumber(dayKey: string): number | null {
  const m = DAY_KEY.exec(dayKey);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
}

/**
 * Whole days from today (the fleet's day, Cairo) to a `YYYY-MM-DD` date;
 * negative once it has passed, null when there is no date.
 */
export function daysUntilDay(
  dayKey: string | null | undefined,
  today: string = cairoDayKey(new Date()),
): number | null {
  if (!dayKey) return null;
  const then = dayNumber(dayKey);
  const now = dayNumber(today);
  if (then === null || now === null) return null;
  return then - now;
}

/**
 * The window is the cars screen's and the dashboard's: one definition
 * (entities/car/expiry.ts), so no two surfaces name different papers as
 * expiring.
 */
export function documentStatus(
  expiryDate: string | null | undefined,
  today?: string,
): DocumentStatus {
  const days = daysUntilDay(expiryDate, today);
  if (days === null) return 'undated';
  if (days < 0) return 'expired';
  if (days <= DOCUMENT_EXPIRY_WARNING_DAYS) return 'expiring';
  return 'valid';
}

/** The version in force: the visible one with the highest id. */
export function currentVersion(document: OwnerDocument): DocumentVersion | null {
  if (document.current_version_id == null) return null;
  return document.versions.find((v) => v.id === document.current_version_id) ?? null;
}

/**
 * Whether an owner carries this type at all. Only a tanker carries a tank
 * licence, so a van is not missing one. A type with no list applies to all.
 */
export function typeApplies(type: DocumentType, carType?: string | null): boolean {
  if (!type.car_types || type.car_types.length === 0) return true;
  return !!carType && type.car_types.includes(carType);
}

export function isImage(contentType: string): boolean {
  return contentType.startsWith('image/');
}
