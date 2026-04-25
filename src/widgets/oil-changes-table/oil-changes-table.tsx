import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Car as CarIcon,
  Edit,
  History,
  Trash2,
  Clock,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/cn';
import { format, formatDateTime, formatCurrency } from '@/shared/lib/format';
import { formatNumber } from '@/shared/lib/format-number';
import type { OilChangeView } from '@/entities/oil-change/schemas';
import { OilChangeStatusBadge } from './oil-change-status-badge';

interface OilChangesTableProps {
  rows: OilChangeView[];
  loading?: boolean;
  /** Called when the user clicks the "View history" action on a row */
  onViewHistory?: (carNoPlate: string) => void;
  /** Called when the user clicks the delete action on a row */
  onDelete?: (row: OilChangeView) => void;
  /**
   * Empty-state node rendered inside the table when there are no rows.
   * The page passes an action-rich placeholder here.
   */
  emptyState?: React.ReactNode;
}

/**
 * Fleet status board — one row per vehicle showing the latest oil-change
 * record. Sorting is handled by the underlying `DataTable`; the footer
 * row sums every numeric column the data has.
 *
 * Row click navigates to the per-car history view; per-row buttons
 * (edit / delete) live in a sticky end-aligned actions cell so they don't
 * compete with the click target.
 */
export function OilChangesTable({
  rows,
  loading,
  onViewHistory,
  onDelete,
  emptyState,
}: OilChangesTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = React.useMemo<ColumnDef<OilChangeView>[]>(
    () => [
      {
        accessorKey: 'car_no_plate',
        header: t('oilChanges.fields.carPlate'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-medium">
            <CarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {row.original.car_no_plate}
          </div>
        ),
      },
      {
        accessorKey: 'date',
        header: t('oilChanges.fields.date'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {format(row.original.date, 'dd MMM yyyy')}
          </div>
        ),
      },
      {
        accessorKey: 'super_visor',
        header: t('oilChanges.fields.supervisor'),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.super_visor || '—'}</span>
        ),
      },
      {
        accessorKey: 'driver_name',
        header: t('oilChanges.fields.driver'),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.driver_name || '—'}</span>
        ),
      },
      {
        accessorKey: 'current_odometer',
        header: t('oilChanges.fields.currentOdometer'),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {formatNumber(row.original.current_odometer, 0)} km
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'kmRemaining',
        header: t('oilChanges.fields.kmRemaining'),
        cell: ({ row }) => (
          <OilChangeStatusBadge
            kmRemaining={row.original.kmRemaining}
            showValue
          />
        ),
      },
      {
        accessorKey: 'cost',
        header: t('oilChanges.fields.cost'),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {formatCurrency(row.original.cost)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'lastUpdated',
        header: t('oilChanges.fields.lastUpdated'),
        cell: ({ row }) =>
          row.original.lastUpdated ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {formatDateTime(row.original.lastUpdated)}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('common.actions')}</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div
            className="flex items-center justify-end gap-1"
            // Stop bubbling so the row's onRowClick doesn't fire when you
            // hit one of the action buttons.
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onViewHistory?.(row.original.car_no_plate)}
                  aria-label={t('oilChanges.actions.viewHistory')}
                >
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('oilChanges.actions.viewHistory')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate(`/oil-changes/${row.original.ID}/edit`)}
                  aria-label={t('common.edit')}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('common.edit')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8 text-destructive hover:text-destructive')}
                  onClick={() => onDelete?.(row.original)}
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('common.delete')}</TooltipContent>
            </Tooltip>
          </div>
        ),
        meta: { align: 'end' },
      },
    ],
    [t, navigate, onDelete, onViewHistory],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      loading={loading}
      emptyState={emptyState}
      onRowClick={(row) => onViewHistory?.(row.car_no_plate)}
      footer={(data) => {
        // Footer cells must align 1:1 with the columns array above. The
        // tally line skips columns that don't reduce sensibly (text,
        // status badges, action buttons).
        const totalCost = data.reduce((s, r) => s + r.cost, 0);
        const avgKmRemaining =
          data.length > 0
            ? data.reduce((s, r) => s + r.kmRemaining, 0) / data.length
            : 0;
        return [
          // car_no_plate
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('oilChanges.fields.totals')}
          </span>,
          // date
          '',
          // supervisor
          '',
          // driver
          '',
          // current_odometer
          '',
          // kmRemaining (avg)
          <span className="text-xs text-muted-foreground">
            {t('oilChanges.fields.avgRemaining')}:{' '}
            <span className="font-semibold text-foreground">
              {formatNumber(avgKmRemaining, 0)} km
            </span>
          </span>,
          // cost (sum)
          <span className="font-semibold tabular-nums">
            {formatCurrency(totalCost)}
          </span>,
          // lastUpdated
          '',
          // actions
          '',
        ];
      }}
    />
  );
}
