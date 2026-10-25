import i18n from '@/shared/i18n';

import { statusGroup, type LiveStatus, type StatusGroup, type Vehicle } from './schemas';

/** A fix older than this is "no signal" — the same 30 minutes the dashboard uses. */
export const STALE_FIX_MS = 30 * 60 * 1000;

export interface LiveDisplay {
  group: StatusGroup;
  /** Localised status, or "No signal" when the last fix is stale. */
  label: string;
  /** When the tracker last reported. */
  at: Date | null;
  stale: boolean;
}

/**
 * What the popup and the side card say about a truck. ETIT's `statusLabel`
 * is English-only and keeps its last value when a tracker goes quiet, so the
 * label comes from the numeric code, and an old fix reads as "No signal ·
 * last seen …" instead of looking current.
 */
export function liveDisplay(vehicle: Vehicle, live: LiveStatus | null, now = Date.now()): LiveDisplay {
  const group = statusGroup(live?.status ?? vehicle.status);
  const at = live?.timestamp ?? vehicle.lastLocationAt ?? null;
  const stale = group !== 'offline' && (!at || now - at.getTime() > STALE_FIX_MS);
  const label = stale
    ? i18n.t('tracking.noSignal', 'No signal')
    : i18n.t(`tracking.group.${group}`, group);
  return { group, label, at, stale };
}
