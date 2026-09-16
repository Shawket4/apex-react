import type { TFunction } from 'i18next';

/** Seconds of dwell as "2h 14m" / "14m" / "45s". */
export function formatDwell(t: TFunction, seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return t('zones.dwell.hm', { hours: h, minutes: m, defaultValue: '{{hours}}h {{minutes}}m' });
  if (m > 0) return t('zones.dwell.m', { minutes: m, defaultValue: '{{minutes}}m' });
  return t('zones.dwell.s', { seconds: total, defaultValue: '{{seconds}}s' });
}
