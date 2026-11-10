import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import type { DriverTotalsRow } from '@/entities/trip-statistics/schemas';
import { matches } from '@/shared/lib/normalize';
import { TripsStatisticsTotalsTable } from './trips-statistics-totals-table';

interface TripsStatisticsDriverTableProps {
  driverTotals: DriverTotalsRow[];
  hasFinancialAccess: boolean;
}

/**
 * Drivers sub-tab — the Vehicles table grouped by driver instead of plate,
 * from `driverTotals`. Both add up to the same totals. A renamed driver is one
 * row under their current name, the names their trips recorded before listed
 * beneath it; trips that recorded no driver share one row.
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
      cell: ({ row }) => {
        const { driver_name, other_names } = row.original;
        return (
          <div>
            {driver_name ? (
              <span className="font-medium" dir="auto">
                {driver_name}
              </span>
            ) : (
              <span className="italic text-muted-foreground">
                {t('trips.statistics.driverTable.noDriver')}
              </span>
            )}
            {other_names.length > 0 && (
              <div className="text-xs text-muted-foreground" dir="auto">
                {t('trips.statistics.driverTable.alsoRecordedAs', {
                  names: other_names,
                })}
              </div>
            )}
          </div>
        );
      },
    }),
    [t],
  );

  // A renamed driver answers to their old names too, and the row of trips
  // with no driver to its label.
  const noDriver = t('trips.statistics.driverTable.noDriver');
  const driverMatches = React.useCallback(
    (row: DriverTotalsRow, query: string) =>
      matches(row.driver_name || noDriver, query) ||
      row.other_names.some((name) => matches(name, query)),
    [noDriver],
  );

  return (
    <TripsStatisticsTotalsTable
      rows={driverTotals}
      hasFinancialAccess={hasFinancialAccess}
      keyColumn={keyColumn}
      title={t('trips.statistics.driverTable.title')}
      subtitle={(shown, total) =>
        shown === total
          ? t('trips.statistics.driverTable.subtitle', { count: total })
          : t('trips.statistics.driverTable.subtitleFiltered', { shown, count: total })
      }
      searchPlaceholder={t('trips.statistics.driverTable.searchPlaceholder')}
      matchesSearch={driverMatches}
    />
  );
}
