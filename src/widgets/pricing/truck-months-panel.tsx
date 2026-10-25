import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronLeft, ChevronRight, Snowflake, Truck } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Label } from '@/shared/ui/label';
import { NativeSelect } from '@/shared/ui/native-select';
import { Skeleton } from '@/shared/ui/skeleton';
import { useIsMobile } from '@/shared/hooks/use-media-query';
import { extractErrorMessage } from '@/shared/api/errors';
import { formatCurrency, formatNumber } from '@/shared/lib/format';
import { useTruckMonths } from '@/entities/pricing/queries';
import type { TruckMonthRow, TruckMonthTotal } from '@/entities/pricing/schemas';
import { formatMonth, shiftMonth } from './pricing-format';

const MONTHS_BACK = 36;

interface Props {
  companies: string[];
  thisMonth: string;
}

/**
 * Car rental per truck per month (permission 3).
 *
 * TAQA rents per car-month, tapered by the days the car worked; Petromin per
 * car-day. A car that served two terminals has a row per terminal, splitting
 * its rental by the days each saw, so the rows of one car sum to its rental.
 * A frozen month is closed: its figures only move through a re-price that
 * explicitly re-opens it.
 */
export function TruckMonthsPanel({ companies, thisMonth }: Props) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const [month, setMonth] = React.useState(thisMonth);
  const [company, setCompany] = React.useState('');
  const { data, isLoading, isError, error, refetch } = useTruckMonths(month, company);

  const monthOptions = React.useMemo(
    () => Array.from({ length: MONTHS_BACK }, (_, i) => shiftMonth(thisMonth, -i)),
    [thisMonth],
  );

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? [];

  return (
    <div className="space-y-4" data-testid="truck-months">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="truck-month">{t('pricing.truckMonths.month')}</Label>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              aria-label={t('common.previousMonth')}
              disabled={month <= monthOptions[monthOptions.length - 1]}
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
            >
              <ChevronLeft className="rtl:rotate-180" />
            </Button>
            <NativeSelect
              id="truck-month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-44"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m, i18n.language)}
                </option>
              ))}
            </NativeSelect>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              aria-label={t('common.nextMonth')}
              disabled={month >= thisMonth}
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
            >
              <ChevronRight className="rtl:rotate-180" />
            </Button>
          </div>
        </div>
        <div className="grid min-w-[10rem] flex-1 gap-1.5 sm:max-w-xs sm:flex-none">
          <Label htmlFor="truck-company">{t('pricing.truckMonths.company')}</Label>
          <NativeSelect id="truck-company" value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">{t('pricing.reprice.allCompanies')}</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <Card className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
          <p className="text-sm">{extractErrorMessage(error, t('pricing.truckMonths.loadFailed'))}</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-6 w-6" />}
          title={t('pricing.truckMonths.empty', { month: formatMonth(month, i18n.language) })}
          description={t('pricing.truckMonths.emptyHint')}
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {totals.map((tot) => (
              <TotalCard key={tot.company} total={tot} />
            ))}
          </ul>
          {isMobile ? <MobileRows rows={rows} /> : <DesktopRows rows={rows} />}
        </>
      )}
    </div>
  );
}

function FrozenBadge() {
  const { t } = useTranslation();
  return (
    <Badge variant="secondary" className="gap-1 px-2 py-0 text-[10.5px]">
      <Snowflake className="h-3 w-3" aria-hidden />
      {t('pricing.truckMonths.frozen')}
    </Badge>
  );
}

function TotalCard({ total }: { total: TruckMonthTotal }) {
  const { t } = useTranslation();
  return (
    <li>
      <Card className="space-y-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold" dir="auto">
            {total.company}
          </span>
          {total.frozen ? (
            <FrozenBadge />
          ) : (
            <Badge variant="outline" className="px-2 py-0 text-[10.5px]">
              {t('pricing.truckMonths.open')}
            </Badge>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
          <dt className="text-muted-foreground">{t('pricing.truckMonths.cars')}</dt>
          <dd className="text-end font-mono tabular-nums">{formatNumber(total.cars, 0)}</dd>
          <dt className="text-muted-foreground">{t('pricing.truckMonths.carDays')}</dt>
          <dd className="text-end font-mono tabular-nums">{formatNumber(total.car_days, 0)}</dd>
          <dt className="text-muted-foreground">{t('pricing.truckMonths.rental')}</dt>
          <dd className="text-end font-mono tabular-nums">{formatCurrency(total.rental)}</dd>
          <dt className="text-muted-foreground">{t('pricing.truckMonths.vat')}</dt>
          <dd className="text-end font-mono tabular-nums">{formatCurrency(total.rental_vat)}</dd>
          <dt className="font-medium">{t('pricing.truckMonths.total')}</dt>
          <dd className="text-end font-mono font-semibold tabular-nums text-money">
            {formatCurrency(total.rental + total.rental_vat)}
          </dd>
        </dl>
      </Card>
    </li>
  );
}

function DesktopRows({ rows }: { rows: TruckMonthRow[] }) {
  const { t } = useTranslation();
  const th = 'px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground';
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className={`${th} text-start`}>{t('pricing.truckMonths.plate')}</th>
            <th className={`${th} text-start`}>{t('pricing.truckMonths.company')}</th>
            <th className={`${th} text-start`}>{t('pricing.truckMonths.terminal')}</th>
            <th className={`${th} text-end`}>{t('pricing.truckMonths.daysWorked')}</th>
            <th className={`${th} text-end`}>{t('pricing.truckMonths.chargeableDays')}</th>
            <th className={`${th} text-end`}>{t('pricing.truckMonths.rental')}</th>
            <th className={`${th} text-end`}>{t('pricing.truckMonths.vat')}</th>
            <th className={`${th} text-center`}>{t('common.status')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/30">
              <td className="px-3 py-2 font-mono" dir="auto">
                {r.car_no_plate}
              </td>
              <td className="px-3 py-2" dir="auto">
                {r.company}
              </td>
              <td className="px-3 py-2" dir="auto">
                {r.terminal}
              </td>
              <td className="px-3 py-2 text-end font-mono tabular-nums">
                {formatNumber(r.days_worked, 0)}
                {r.month_days_worked !== r.days_worked && (
                  <span className="text-muted-foreground">
                    {' '}
                    {t('pricing.truckMonths.ofMonth', { n: formatNumber(r.month_days_worked, 0) })}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-end font-mono tabular-nums">
                {formatNumber(r.chargeable_days, r.chargeable_days % 1 ? 2 : 0)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-end font-mono tabular-nums">
                {formatCurrency(r.rental)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-end font-mono tabular-nums">
                {formatCurrency(r.rental_vat)}
              </td>
              <td className="px-3 py-2 text-center">{r.frozen_at ? <FrozenBadge /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function MobileRows({ rows }: { rows: TruckMonthRow[] }) {
  const { t } = useTranslation();
  return (
    <Card>
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.id} className="space-y-1.5 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-mono text-[13.5px] font-medium" dir="auto">
                {r.car_no_plate}
              </span>
              <span className="whitespace-nowrap font-mono text-[13.5px] font-semibold tabular-nums text-money">
                {formatCurrency(r.rental)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              <span className="truncate" dir="auto">
                {r.company} · {r.terminal}
              </span>
              <span className="whitespace-nowrap font-mono tabular-nums">
                {t('pricing.truckMonths.vatShort', { amount: formatCurrency(r.rental_vat) })}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
              <span className="tabular-nums">
                {t('pricing.truckMonths.daysLine', {
                  worked: formatNumber(r.days_worked, 0),
                  chargeable: formatNumber(r.chargeable_days, r.chargeable_days % 1 ? 2 : 0),
                })}
              </span>
              {r.frozen_at && <FrozenBadge />}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
