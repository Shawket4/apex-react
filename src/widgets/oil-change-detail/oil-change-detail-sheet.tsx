import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets, Wrench } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { format, formatCurrency } from '@/shared/lib/format';
import { formatNumber } from '@/shared/lib/format-number';
import {
  FILTER_SERVICE_LIFE_CYCLES,
  oilFilterState,
  type OilFilterState,
} from '@/entities/oil-change/schemas';
import type { OilChangeDue } from '@/entities/dashboard/schemas';

/* -------------------------------------------------------------------------- */
/* One truck's oil-change detail                                               */
/*                                                                            */
/* Everything here arrives on the dashboard payload, so opening the sheet      */
/* costs no request and there is no loading state to design around.            */
/* -------------------------------------------------------------------------- */

type T = (key: string, opts?: Record<string, unknown>) => string;

export function OilChangeDetailSheet({
  row,
  onOpenChange,
}: {
  /** The row being inspected; null closes the sheet. */
  row: OilChangeDue | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-md">
        {row && <DetailBody row={row} t={t as T} />}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({ row, t }: { row: OilChangeDue; t: T }) {
  const overdue = row.km_left < 0;
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <SheetHeader className="space-y-1 text-start">
        <SheetTitle className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-semibold tabular-nums">{row.plate_no}</span>
          <span className="text-sm font-normal text-muted-foreground" dir="rtl">
            {row.plate_ar}
          </span>
        </SheetTitle>
        <p className={cn('text-sm font-medium', overdue ? 'text-destructive' : 'text-warning')}>
          {overdue
            ? t('dashboard.attention.kmOverdue', { km: formatNumber(-row.km_left, 0) })
            : t('dashboard.attention.kmLeft', { km: formatNumber(row.km_left, 0) })}
        </p>
      </SheetHeader>

      {/* ---- the arithmetic, so the figure can be checked against the dash ---- */}
      <section>
        <Eyebrow>{t('dashboard.oilDetail.reading')}</Eyebrow>
        <dl className="mt-2 divide-y rounded-lg border">
          <Line
            label={t('oilChanges.fields.odometerAtChange')}
            value={`${formatNumber(row.odometer_at_change, 0)} km`}
          />
          <Line
            label={t('oilChanges.fields.currentOdometer')}
            value={`${formatNumber(row.current_odometer, 0)} km`}
          />
          <Line label={t('oilChanges.fields.kmUsed')} value={`${formatNumber(row.km_since, 0)} km`} />
          <Line
            label={t('oilChanges.fields.mileage')}
            value={`${formatNumber(row.interval_km, 0)} km`}
          />
          <Line
            label={t('oilChanges.fields.kmRemaining')}
            value={`${formatNumber(row.km_left, 0)} km`}
            tone={overdue ? 'bad' : undefined}
            strong
          />
        </dl>
      </section>

      {/* ---- filters: the date behind each cycle count ---- */}
      <section>
        <Eyebrow>{t('oilChanges.fields.filters')}</Eyebrow>
        <dl className="mt-2 divide-y rounded-lg border">
          <FilterLine
            label={t('oilChanges.filters.oilLabel')}
            date={row.oil_filter_date ?? (row.oil_filter ? row.last_change_date : null)}
            cycles={row.oil_filter_cycles}
            state={oilFilterState(row.oil_filter, row.oil_filter_cycles)}
            t={t}
          />
          <FilterLine
            label={t('oilChanges.filters.fuelLabel')}
            date={row.fuel_filter_date ?? (row.fuel_filter ? row.last_change_date : null)}
            cycles={row.fuel_filter_cycles}
            state={oilFilterState(row.fuel_filter, row.fuel_filter_cycles)}
            t={t}
          />
          {/* The separator runs on its own schedule and accrues no cycles, so
              it reports only when it last went in. */}
          <FilterLine
            label={t('oilChanges.filters.waterLabel')}
            date={row.water_filter_date ?? (row.water_filter ? row.last_change_date : null)}
            cycles={null}
            state={row.water_filter ? 'replaced' : 'fitted'}
            t={t}
          />
        </dl>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {t('dashboard.oilDetail.filterRule', { count: FILTER_SERVICE_LIFE_CYCLES })}
        </p>
      </section>

      {/* ---- who did it and what it cost ---- */}
      <section>
        <Eyebrow>{t('dashboard.oilDetail.lastChange')}</Eyebrow>
        <dl className="mt-2 divide-y rounded-lg border">
          <Line
            label={t('oilChanges.fields.date')}
            value={row.last_change_date ? format(row.last_change_date, 'd MMM yyyy') : '—'}
          />
          <Line label={t('oilChanges.fields.driver')} value={row.driver_name || '—'} />
          <Line label={t('oilChanges.fields.supervisor')} value={row.super_visor || '—'} />
          <Line
            label={t('oilChanges.fields.cost')}
            value={row.cost ? formatCurrency(row.cost) : '—'}
            tone="money"
          />
        </dl>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline" className="flex-1">
          {/* The stored plate, not the display split — see plate_raw. */}
          <Link to={`/oil-changes/car/${encodeURIComponent(row.plate_raw || row.plate_no)}`}>
            <Wrench className="h-4 w-4" />
            {t('oilChanges.actions.viewHistory')}
          </Link>
        </Button>
        {/* Preselect the truck and carry over who last worked on it, so the
            form opens on the fields that actually need typing: the new
            odometer, the interval and the cost. `car_id` rather than a plate,
            because the plate on this row is a display split. */}
        <Button
          className="flex-1"
          onClick={() =>
            navigate('/oil-changes/new', {
              state: {
                initialValues: {
                  car_id: row.car_id || undefined,
                  driver_name: row.driver_name || undefined,
                  supervisor: row.super_visor || undefined,
                  mileage: row.interval_km || undefined,
                },
              },
            })
          }
        >
          <Droplets className="h-4 w-4" />
          {t('oilChanges.new.title')}
        </Button>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function Line({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: 'bad' | 'money';
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-mono text-[13px] tabular-nums',
          strong && 'font-semibold',
          tone === 'bad' && 'text-destructive',
          tone === 'money' && 'font-semibold text-money',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function FilterLine({
  label,
  date,
  cycles,
  state,
  t,
}: {
  label: string;
  date: string | null;
  cycles: number | null;
  state: OilFilterState;
  t: T;
}) {
  // An element replaced by this very change has its date on the change itself,
  // so the two can only disagree if the payload predates the per-filter dates.
  // Falling back to the change's own date keeps the sheet from saying
  // "Replaced" and "never replaced on record" in the same row.
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <dt className="min-w-0 text-xs">
        <span className="block">{label}</span>
        <span className="block text-[11px] text-muted-foreground">
          {date
            ? t('dashboard.oilDetail.lastReplaced', { date: format(date, 'd MMM yyyy') })
            : t('dashboard.oilDetail.neverReplaced')}
        </span>
      </dt>
      <dd className="shrink-0 text-end">
        <span
          className={cn(
            'text-[11px] font-semibold',
            state === 'due' && 'text-destructive',
            state === 'replaced' && 'text-primary',
            state === 'fitted' && 'text-muted-foreground',
          )}
        >
          {t(`dashboard.oilDetail.state.${state}`)}
        </span>
        {cycles !== null && (
          <span className="block font-mono text-[11px] tabular-nums text-muted-foreground">
            {t('dashboard.oilDetail.cycles', { count: cycles })}
          </span>
        )}
      </dd>
    </div>
  );
}
