import type { TFunction } from 'i18next';
import { cairoParts } from '@/shared/lib/cairo';
import { formatCurrency, formatNumber } from '@/shared/lib/format';
import { vatFractionToPercent } from '@/entities/pricing/form';
import type { PricingRule } from '@/entities/pricing/schemas';

/** Today in Cairo, YYYY-MM-DD — the calendar FalconGo prices against. */
export function cairoToday(): string {
  const p = cairoParts(new Date());
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** This month in Cairo, YYYY-MM. */
export function cairoThisMonth(): string {
  return cairoToday().slice(0, 7);
}

/** "2026-10" ± n months. */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + by;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

function localeOf(lang: string): string {
  // Latin digits, like every other figure on the page (formatNumber).
  return lang.startsWith('ar') ? 'ar-EG-u-nu-latn' : 'en-GB';
}

/** "2026-11-01" → "1 Nov 2026" / "1 نوفمبر 2026", without a timezone shifting the day. */
export function formatDay(day: string, lang: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!m) return day;
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
}

/** "2026-10" (or "2026-10-01") → "October 2026". */
export function formatMonth(month: string, lang: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(month);
  if (!m) return month;
  return new Intl.DateTimeFormat(localeOf(lang), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)));
}

/** "14%" */
export function formatVat(fraction: number): string {
  return `${formatNumber(vatFractionToPercent(fraction), vatFractionToPercent(fraction) % 1 ? 1 : 0)}%`;
}

/** The headline rate of a rule, in one line. */
export function rateSummary(rule: PricingRule, t: TFunction): string {
  switch (rule.method) {
    case 'per_km':
      return t('pricing.rule.perKmValue', { rate: formatCurrency(rule.per_km_rate ?? 0) });
    case 'band_per_1000l':
      return t('pricing.rule.bandsValue', { count: rule.bands.length });
    case 'per_1000l_fee':
      return t('pricing.rule.routeFeeValue');
  }
}

/** The rental of a rule, in one line. */
export function rentalSummary(rule: PricingRule, t: TFunction): string {
  switch (rule.rental_mode) {
    case 'monthly_taper':
      return t('pricing.rule.rentalTaperValue', {
        amount: formatCurrency(rule.rental_amount ?? 0),
        days: rule.rental_full_days ?? 0,
      });
    case 'per_car_day':
      return t('pricing.rule.rentalPerDayValue', {
        amount: formatCurrency(rule.rental_amount ?? 0),
      });
    case 'none':
      return t('pricing.rule.rentalNone');
  }
}

export type VersionStatus = 'current' | 'scheduled' | 'past';

export function versionStatus(
  rule: PricingRule,
  currentRuleId: number,
  today: string,
): VersionStatus {
  if (rule.id === currentRuleId) return 'current';
  return rule.effective_from > today ? 'scheduled' : 'past';
}
