/**
 * The audit queue's bare-navigation mount filters, extracted so the sidebar's
 * data warmer reproduces the EXACT first query keys. trip-audit.tsx imports
 * these same helpers for its initial state — one source, no drift.
 */

import { localDateISO, localToday, toDateOnly } from '@/shared/lib/format';
import type { TripAuditSummaryFilters, TripMatchFilters } from './api';

export const AUDIT_STORAGE_KEY_LIMIT = 'apex:tripAudit:limit';
export const AUDIT_LIMIT_OPTIONS = [10, 25, 50, 100];

/** Default range: last 7 days (inclusive of today), as ISO instants for the picker. */
export function defaultAuditRange(): { from: string; to: string } {
  const today = localToday();
  const startMs = new Date(today.y, today.m, today.d).getTime() - 7 * 86_400_000;
  const start = new Date(startMs);
  return {
    from: localDateISO(start.getFullYear(), start.getMonth(), start.getDate()),
    to: localDateISO(today.y, today.m, today.d, true),
  };
}

export function loadStoredAuditLimit(): number {
  if (typeof window === 'undefined') return 25;
  const n = Number(window.localStorage.getItem(AUDIT_STORAGE_KEY_LIMIT));
  return AUDIT_LIMIT_OPTIONS.includes(n) ? n : 25;
}

/** Mount filters of a bare navigation (the needs_review queue view). */
export function defaultTripMatchFilters(): TripMatchFilters {
  const range = defaultAuditRange();
  return {
    from: toDateOnly(range.from),
    to: toDateOnly(range.to),
    q: undefined,
    company: undefined,
    status: '',
    flagged: true,
    unreviewed: true,
    sort: 'severity',
    page: 1,
    per_page: loadStoredAuditLimit(),
  };
}

export function defaultAuditSummaryFilters(): TripAuditSummaryFilters {
  const range = defaultAuditRange();
  return { from: toDateOnly(range.from), to: toDateOnly(range.to), company: undefined };
}
