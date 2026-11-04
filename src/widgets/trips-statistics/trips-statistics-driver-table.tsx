import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import type { DriverTotalsRow } from '@/entities/trip-statistics/schemas';
import { TripsStatisticsTotalsTable } from './trips-statistics-totals-table';

interface TripsStatisticsDriverTableProps {
  driverTotals: DriverTotalsRow[];
  hasFinancialAccess: boolean;
}

/**
 * Drivers sub-tab — the Vehicles table grouped by the driver on the trip
 * instead of the plate, from `driverTotals`. Both add up to the same totals;
 * trips that recorded no driver share one row.
 */
export function TripsStatisticsDriverTable({
  driverTotals,
  hasFinancialAccess,
}: TripsStatisticsDriverTableProps) {
  const { t } = useTranslation();

  const keyColumn = React.useMemo<ColumnDef<DriverTotalsRow>>(
    () => ({
      accessorKey: 'driver_name',
      header: () => t('trips.fields.driver'),
      cell: ({ row }) =>
        row.original.driver_name ? (
          <span className="font-medium" dir="auto">
            {row.original.driver_name}
          </span>
        ) : (
          <span className="italic text-muted-foreground">
            {t('trips.statistics.driverTable.noDriver')}
          </span>
        ),
    }),
    [t],
  );

  return (
    <TripsStatisticsTotalsTable
      rows={driverTotals}
      hasFinancialAccess={hasFinancialAccess}
      keyColumn={keyColumn}
      title={t('trips.statistics.driverTable.title')}
      subtitle={t('trips.statistics.driverTable.subtitle', {
        count: driverTotals.length,
      })}
    />
  );
}
