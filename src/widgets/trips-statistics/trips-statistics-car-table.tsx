import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import type { CarTotalsRow } from '@/entities/trip-statistics/schemas';
import { TripsStatisticsTotalsTable } from './trips-statistics-totals-table';

interface TripsStatisticsCarTableProps {
  carTotals: CarTotalsRow[];
  hasFinancialAccess: boolean;
}

/** Vehicles sub-tab — fleet-wide per-vehicle metrics from `carTotals`. */
export function TripsStatisticsCarTable({
  carTotals,
  hasFinancialAccess,
}: TripsStatisticsCarTableProps) {
  const { t } = useTranslation();

  const keyColumn = React.useMemo<ColumnDef<CarTotalsRow>>(
    () => ({
      accessorKey: 'car_no_plate',
      header: () => t('trips.fields.vehicle'),
      cell: ({ row }) => (
        <span className="font-mono font-medium tabular-nums" dir="auto">
          {row.original.car_no_plate}
        </span>
      ),
    }),
    [t],
  );

  return (
    <TripsStatisticsTotalsTable
      rows={carTotals}
      hasFinancialAccess={hasFinancialAccess}
      keyColumn={keyColumn}
      title={t('trips.statistics.carTable.title')}
      subtitle={t('trips.statistics.carTable.subtitle', {
        count: carTotals.length,
      })}
    />
  );
}
