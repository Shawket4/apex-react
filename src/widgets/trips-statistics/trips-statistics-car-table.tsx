import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import type { CarTotalsRow } from '@/entities/trip-statistics/schemas';
import { matches } from '@/shared/lib/normalize';
import { TripsStatisticsTotalsTable } from './trips-statistics-totals-table';

interface TripsStatisticsCarTableProps {
  carTotals: CarTotalsRow[];
  hasFinancialAccess: boolean;
}

/** Spaces dropped, so "طقا1234" finds "ط ق ا 1234". */
const compact = (s: string) => s.replace(/\s+/g, '');

/** A plate answers its digits and letters with or without their spaces. */
function plateMatches(row: CarTotalsRow, query: string): boolean {
  return (
    matches(row.car_no_plate, query) ||
    matches(compact(row.car_no_plate), compact(query))
  );
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
      subtitle={(shown, total) =>
        shown === total
          ? t('trips.statistics.carTable.subtitle', { count: total })
          : t('trips.statistics.carTable.subtitleFiltered', { shown, count: total })
      }
      searchPlaceholder={t('trips.statistics.carTable.searchPlaceholder')}
      matchesSearch={plateMatches}
    />
  );
}
