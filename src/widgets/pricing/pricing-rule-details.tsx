import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/shared/lib/format';
import type { PricingRule } from '@/entities/pricing/schemas';
import { formatVat, rentalSummary } from './pricing-format';

/**
 * One version's terms: how a trip is priced, VAT, and car rental.
 *
 * The band table is laid out in columns of figures so fifteen bands fit a
 * phone without a scroll: band number at the start, rate at the end.
 */
export function PricingRuleDetails({ rule }: { rule: PricingRule }) {
  const { t } = useTranslation();
  const bands = [...rule.bands].sort((a, b) => a.band - b.band);

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
        <Item label={t('pricing.rule.method')}>{t(`pricing.method.${rule.method}`)}</Item>
        {rule.method === 'per_km' && (
          <Item label={t('pricing.rule.perKmRate')}>
            <span className="tabular-nums">
              {t('pricing.rule.perKmValue', { rate: formatCurrency(rule.per_km_rate ?? 0) })}
            </span>
          </Item>
        )}
        {rule.method === 'per_1000l_fee' && (
          <Item label={t('pricing.rule.rate')}>
            <span className="text-muted-foreground">{t('pricing.rule.routeFeeHint')}</span>
          </Item>
        )}
        <Item label={t('pricing.rule.vat')}>
          <span className="font-mono tabular-nums">{formatVat(rule.vat_rate)}</span>
        </Item>
        <Item label={t('pricing.rule.rental')}>{rentalSummary(rule, t)}</Item>
      </dl>

      {rule.method === 'band_per_1000l' && bands.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('pricing.rule.bandTable')}
          </p>
          <ul className="grid grid-cols-1 gap-x-6 rounded-md border bg-muted/30 px-3 py-1.5 sm:grid-cols-2">
            {bands.map((b) => (
              <li
                key={b.band}
                className="flex items-baseline justify-between gap-3 border-b border-dashed py-1 text-[13px] last:border-b-0"
              >
                <span className="whitespace-nowrap text-muted-foreground">
                  {t('pricing.fee.band', { band: b.band })}
                </span>
                <span className="whitespace-nowrap font-mono tabular-nums">{formatCurrency(b.rate_per_1000l)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-muted-foreground">{t('pricing.rule.bandUnit')}</p>
        </div>
      )}

      {rule.notes && (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground" dir="auto">
          {rule.notes}
        </p>
      )}
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
