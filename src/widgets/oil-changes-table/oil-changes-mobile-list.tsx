import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Car as CarIcon, Edit, History, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import { format, formatCurrency } from '@/shared/lib/format';
import { formatNumber } from '@/shared/lib/format-number';
import type { OilChangeView } from '@/entities/oil-change/schemas';
import { OilChangeFilterChips } from '@/entities/oil-change/filter-chips';
import { OilChangeStatusBadge } from './oil-change-status-badge';

/* -------------------------------------------------------------------------- */
/* Oil changes on a phone                                                      */
/*                                                                            */
/* Same model as the desktop table, different presentation — the split the     */
/* trips list uses, and for the same reason: two implementations of "what a    */
/* row means" drift, one model rendered twice cannot.                          */
/*                                                                            */
/* A nine-column table on a 390px screen is a horizontal scroll nobody does,   */
/* so the numbers that decide anything (km remaining, status) lead, and the    */
/* rest follows as a labelled grid.                                            */
/* -------------------------------------------------------------------------- */

export interface OilChangesMobileListProps {
  rows: OilChangeView[];
  loading?: boolean;
  /**
   * `fleet` leads each card with the vehicle; `history` is already scoped to
   * one truck, so it leads with the date instead of repeating the plate on
   * every card.
   */
  variant?: 'fleet' | 'history';
  onViewHistory?: (carNoPlate: string) => void;
  onEdit?: (row: OilChangeView) => void;
  onDelete?: (row: OilChangeView) => void;
  onSelect?: (row: OilChangeView) => void;
  emptyState?: React.ReactNode;
}

export function OilChangesMobileList({
  rows,
  loading,
  variant = 'fleet',
  onViewHistory,
  onEdit,
  onDelete,
  onSelect,
  emptyState,
}: OilChangesMobileListProps) {
  const { t } = useTranslation();

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) return <>{emptyState}</>;

  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <article
          key={row.ID}
          className={cn(
            'rounded-lg border bg-card p-3',
            onSelect && 'cursor-pointer transition-colors hover:bg-accent/40',
          )}
          onClick={onSelect ? () => onSelect(row) : undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {variant === 'fleet' ? (
                <p className="flex items-center gap-1.5 font-medium">
                  <CarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{row.car_no_plate}</span>
                </p>
              ) : (
                <p className="font-mono text-sm font-semibold tabular-nums">
                  {format(row.date, 'd MMM yyyy')}
                </p>
              )}
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {variant === 'fleet'
                  ? format(row.date, 'd MMM yyyy')
                  : row.driver_name || t('oilChanges.fields.driver')}
              </p>
            </div>
            <OilChangeStatusBadge kmRemaining={row.kmRemaining} showValue />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
            <Field label={t('oilChanges.fields.currentOdometer')}>
              {formatNumber(row.current_odometer, 0)} km
            </Field>
            <Field label={t('oilChanges.fields.odometerAtChange')}>
              {formatNumber(row.odometer_at_change, 0)} km
            </Field>
            <Field label={t('oilChanges.fields.kmUsed')}>
              {formatNumber(row.kmUsed, 0)} km
            </Field>
            <Field label={t('oilChanges.fields.cost')} money>
              {formatCurrency(row.cost)}
            </Field>
            {variant === 'fleet' && row.driver_name && (
              <Field label={t('oilChanges.fields.driver')} wide>
                {row.driver_name}
              </Field>
            )}
            {row.super_visor && (
              <Field label={t('oilChanges.fields.supervisor')} wide>
                {row.super_visor}
              </Field>
            )}
          </dl>

          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
            <OilChangeFilterChips
              flags={{
                oil: row.oil_filter_changed,
                fuel: row.fuel_filter_changed,
                water: row.water_filter_changed,
              }}
            />
            {/* Stop bubbling so the card's own onSelect doesn't fire when you
                hit one of these. */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {onViewHistory && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onViewHistory(row.car_no_plate)}
                  aria-label={t('oilChanges.actions.viewHistory')}
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(row)}
                  aria-label={t('common.edit')}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(row)}
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
  money,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  money?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          'truncate font-mono text-[12px] tabular-nums',
          money && 'font-semibold text-money',
        )}
      >
        {children}
      </dd>
    </div>
  );
}
