import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { formatNumber, formatCurrency } from '@/shared/lib/format';
import type { CarTotalsRow } from '@/entities/trip-statistics/schemas';

interface TripsStatisticsCarTableProps {
  carTotals: CarTotalsRow[];
  hasFinancialAccess: boolean;
}

/**
 * Cars sub-tab — fleet-wide per-vehicle metrics.
 *
 * Backed by the response's `carTotals` array (pre-aggregated by the backend).
 * Sortable columns; uses the shared `DataTable` with the new `footer` slot
 * to render a totals row at the bottom.
 *
 * The "Total" column is the sum of base revenue + VAT + rent — matches the
 * old dashboard's sort key for "Cars by Total" and the order rows appear in
 * by default.
 */
export function TripsStatisticsCarTable({
  carTotals,
  hasFinancialAccess,
}: TripsStatisticsCarTableProps) {
  const { t } = useTranslation();

  /* ---- Default sort: by total (rev + vat + rent) descending ---- */

  const sorted = React.useMemo(
    () =>
      [...carTotals].sort(
        (a, b) =>
          b.base_revenue + b.vat + b.rent - (a.base_revenue + a.vat + a.rent),
      ),
    [carTotals],
  );

  const columns = React.useMemo<ColumnDef<CarTotalsRow>[]>(() => {
    const base: ColumnDef<CarTotalsRow>[] = [
      {
        accessorKey: 'car_no_plate',
        header: () => t('trips.fields.vehicle'),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.car_no_plate}
          </span>
        ),
      },
      {
        accessorKey: 'liters',
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.liters')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums">
            {formatNumber(row.original.liters, 2)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'distance',
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.distance')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums">
            {formatNumber(row.original.distance, 2)}
          </span>
        ),
        meta: { align: 'end' },
      },
    ];

    if (!hasFinancialAccess) return base;

    return [
      ...base,
      {
        accessorKey: 'base_revenue',
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.baseRevenue')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-success">
            {formatCurrency(row.original.base_revenue)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'vat',
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.vat')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-muted-foreground">
            {row.original.vat > 0 ? formatCurrency(row.original.vat) : '—'}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'rent',
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.rent')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-muted-foreground">
            {row.original.rent > 0 ? formatCurrency(row.original.rent) : '—'}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        id: 'total',
        accessorFn: (row) => row.base_revenue + row.vat + row.rent,
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.total')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end font-semibold tabular-nums">
            {formatCurrency(
              row.original.base_revenue + row.original.vat + row.original.rent,
            )}
          </span>
        ),
        meta: { align: 'end' },
      },
    ];
  }, [t, hasFinancialAccess]);

  /* ---- Footer ---- */

  const footer = React.useMemo(() => {
    if (!hasFinancialAccess) {
      return (rows: CarTotalsRow[]) => [
        <span className="font-bold">{t('trips.statistics.carTable.totals')}</span>,
        formatNumber(
          rows.reduce((s, r) => s + (r.liters || 0), 0),
          2,
        ),
        formatNumber(
          rows.reduce((s, r) => s + (r.distance || 0), 0),
          2,
        ),
      ];
    }
    return (rows: CarTotalsRow[]) => [
      <span className="font-bold">{t('trips.statistics.carTable.totals')}</span>,
      formatNumber(
        rows.reduce((s, r) => s + (r.liters || 0), 0),
        2,
      ),
      formatNumber(
        rows.reduce((s, r) => s + (r.distance || 0), 0),
        2,
      ),
      <span className="text-success">
        {formatCurrency(rows.reduce((s, r) => s + (r.base_revenue || 0), 0))}
      </span>,
      formatCurrency(rows.reduce((s, r) => s + (r.vat || 0), 0)),
      formatCurrency(rows.reduce((s, r) => s + (r.rent || 0), 0)),
      <span className="font-bold">
        {formatCurrency(
          rows.reduce(
            (s, r) =>
              s + ((r.base_revenue || 0) + (r.vat || 0) + (r.rent || 0)),
            0,
          ),
        )}
      </span>,
    ];
  }, [t, hasFinancialAccess]);

  if (carTotals.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="mb-3">
          <h3 className="text-base font-semibold">
            {t('trips.statistics.carTable.title')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('trips.statistics.carTable.subtitle', {
              count: carTotals.length,
            })}
          </p>
        </div>
        <DataTable
          columns={columns}
          data={sorted}
          footer={footer}
          pageSize={50}
        />
      </CardContent>
    </Card>
  );
}
