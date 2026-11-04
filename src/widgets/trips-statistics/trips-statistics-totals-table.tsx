import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { formatNumber, formatCurrency } from '@/shared/lib/format';

/** The figures a `carTotals` or `driverTotals` row carries. */
export interface TotalsRow {
  liters: number;
  distance: number;
  base_revenue: number;
  vat: number;
  rent: number;
}

interface TripsStatisticsTotalsTableProps<T extends TotalsRow> {
  rows: T[];
  hasFinancialAccess: boolean;
  /** The first column: what each row totals (a vehicle, a driver). Memoise it. */
  keyColumn: ColumnDef<T>;
  title: string;
  subtitle: string;
}

/**
 * The Vehicles and Drivers sub-tabs: one row per vehicle or driver, the same
 * columns either way.
 *
 * Backed by the response's pre-aggregated `carTotals` / `driverTotals`.
 * Sortable columns; uses the shared `DataTable` with the `footer` slot to
 * render a totals row at the bottom.
 *
 * The "Total" column is the sum of base revenue + VAT + rent — matches the
 * old dashboard's sort key for "Cars by Total" and the order rows appear in
 * by default.
 */
export function TripsStatisticsTotalsTable<T extends TotalsRow>({
  rows,
  hasFinancialAccess,
  keyColumn,
  title,
  subtitle,
}: TripsStatisticsTotalsTableProps<T>) {
  const { t } = useTranslation();

  /* ---- Default sort: by total (rev + vat + rent) descending ---- */

  const sorted = React.useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          b.base_revenue + b.vat + b.rent - (a.base_revenue + a.vat + a.rent),
      ),
    [rows],
  );

  const columns = React.useMemo<ColumnDef<T>[]>(() => {
    const base: ColumnDef<T>[] = [
      keyColumn,
      {
        id: 'liters',
        accessorFn: (row) => row.liters,
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.liters')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end font-mono tabular-nums">
            {formatNumber(row.original.liters, 2)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        id: 'distance',
        accessorFn: (row) => row.distance,
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.distance')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end font-mono tabular-nums">
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
        id: 'base_revenue',
        accessorFn: (row) => row.base_revenue,
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.baseRevenue')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end font-mono tabular-nums text-money">
            {formatCurrency(row.original.base_revenue)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        id: 'vat',
        accessorFn: (row) => row.vat,
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.vat')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end font-mono tabular-nums text-muted-foreground">
            {row.original.vat > 0 ? (
              formatCurrency(row.original.vat)
            ) : (
              <span className="opacity-40">—</span>
            )}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        id: 'rent',
        accessorFn: (row) => row.rent,
        header: () => (
          <span className="block text-end">
            {t('trips.statistics.carTable.rent')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end font-mono tabular-nums text-muted-foreground">
            {row.original.rent > 0 ? (
              formatCurrency(row.original.rent)
            ) : (
              <span className="opacity-40">—</span>
            )}
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
          <span className="block text-end font-mono font-semibold tabular-nums">
            {formatCurrency(
              row.original.base_revenue + row.original.vat + row.original.rent,
            )}
          </span>
        ),
        meta: { align: 'end' },
      },
    ];
  }, [t, hasFinancialAccess, keyColumn]);

  /* ---- Footer ---- */

  const footer = React.useMemo(() => {
    if (!hasFinancialAccess) {
      return (rows: T[]) => [
        <span className="font-semibold">{t('trips.statistics.carTable.totals')}</span>,
        <span className="font-mono tabular-nums">
          {formatNumber(
            rows.reduce((s, r) => s + (r.liters || 0), 0),
            2,
          )}
        </span>,
        <span className="font-mono tabular-nums">
          {formatNumber(
            rows.reduce((s, r) => s + (r.distance || 0), 0),
            2,
          )}
        </span>,
      ];
    }
    return (rows: T[]) => [
      <span className="font-semibold">{t('trips.statistics.carTable.totals')}</span>,
      <span className="font-mono tabular-nums">
        {formatNumber(
          rows.reduce((s, r) => s + (r.liters || 0), 0),
          2,
        )}
      </span>,
      <span className="font-mono tabular-nums">
        {formatNumber(
          rows.reduce((s, r) => s + (r.distance || 0), 0),
          2,
        )}
      </span>,
      <span className="font-mono tabular-nums text-money">
        {formatCurrency(rows.reduce((s, r) => s + (r.base_revenue || 0), 0))}
      </span>,
      <span className="font-mono tabular-nums">
        {formatCurrency(rows.reduce((s, r) => s + (r.vat || 0), 0))}
      </span>,
      <span className="font-mono tabular-nums">
        {formatCurrency(rows.reduce((s, r) => s + (r.rent || 0), 0))}
      </span>,
      <span className="font-mono tabular-nums font-semibold">
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

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="mb-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
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
