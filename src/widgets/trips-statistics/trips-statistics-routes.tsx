import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatNumber, formatCurrency } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type {
  CompanyStat,
  RouteStat,
} from '@/entities/trip-statistics/schemas';

interface TripsStatisticsRoutesProps {
  companies: CompanyStat[];
  hasFinancialAccess: boolean;
}

/**
 * Routes sub-tab — analogous to the old dashboard's "Routes" tab.
 *
 * Shows a company selector (chip group) at top; clicking a company replaces
 * the table below with that company's `route_details[]` broken down by
 * route_name with all the financial columns.
 *
 * The currently-selected company is sticky during the session (state lives in
 * this component, resets when the parent unmounts). When `companies` changes
 * such that the selected company no longer exists, we fall back to the first
 * available company.
 */
export function TripsStatisticsRoutes({
  companies,
  hasFinancialAccess,
}: TripsStatisticsRoutesProps) {
  const { t } = useTranslation();
  const [selectedCompany, setSelectedCompany] = React.useState<string>(
    () => companies[0]?.company ?? '',
  );

  // If the selected company disappears (e.g. filter changes), fall back to the
  // first available
  React.useEffect(() => {
    if (
      !selectedCompany ||
      !companies.some((c) => c.company === selectedCompany)
    ) {
      setSelectedCompany(companies[0]?.company ?? '');
    }
  }, [companies, selectedCompany]);

  const activeCompany = companies.find((c) => c.company === selectedCompany);

  if (companies.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            lottieSrc="/animations/no_results.json"
            lottieWidth={100}
            lottieHeight={100}
            title={t('trips.statistics.routes.empty')}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Company chip selector */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            {t('trips.statistics.routes.selectCompany')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {companies.map((c) => (
              <Button
                key={c.company}
                size="sm"
                variant={c.company === selectedCompany ? 'default' : 'outline'}
                onClick={() => setSelectedCompany(c.company)}
                className={cn('h-9')}
              >
                {c.company}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Routes table for the selected company */}
      {activeCompany && (
        <RoutesTable
          company={activeCompany}
          hasFinancialAccess={hasFinancialAccess}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Routes table for a single company                                           */
/* -------------------------------------------------------------------------- */

function RoutesTable({
  company,
  hasFinancialAccess,
}: {
  company: CompanyStat;
  hasFinancialAccess: boolean;
}) {
  const { t } = useTranslation();
  const routes = company.route_details ?? [];

  const columns = React.useMemo<ColumnDef<RouteStat>[]>(() => {
    const base: ColumnDef<RouteStat>[] = [
      {
        accessorKey: 'route_name',
        header: () => t('trips.statistics.excel.cols.route'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.route_name}</span>
            {row.original.route_type && (
              <span className="text-[10px] text-muted-foreground">
                {row.original.route_type}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'total_trips',
        header: () => (
          <span className="block text-end">{t('trips.statistics.excel.cols.trips')}</span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums">
            {formatNumber(row.original.total_trips, 0)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'total_volume',
        header: () => (
          <span className="block text-end">{t('trips.statistics.excel.cols.volume')}</span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums">
            {formatNumber(row.original.total_volume, 2)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'total_distance',
        header: () => (
          <span className="block text-end">{t('trips.statistics.excel.cols.distance')}</span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums">
            {formatNumber(row.original.total_distance, 2)}
          </span>
        ),
        meta: { align: 'end' },
      },
    ];

    if (!hasFinancialAccess) return base;

    return [
      ...base,
      {
        accessorKey: 'total_revenue',
        header: () => (
          <span className="block text-end">{t('trips.statistics.excel.cols.revenue')}</span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-success">
            {formatCurrency(row.original.total_revenue)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'car_rental',
        header: () => (
          <span className="block text-end">{t('trips.statistics.excel.cols.carRent')}</span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-muted-foreground">
            {row.original.car_rental
              ? formatCurrency(row.original.car_rental)
              : '—'}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'vat',
        header: () => (
          <span className="block text-end">{t('trips.statistics.excel.cols.vat')}</span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-muted-foreground">
            {row.original.vat ? formatCurrency(row.original.vat) : '—'}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        id: 'total',
        header: () => (
          <span className="block text-end">{t('trips.statistics.excel.cols.totalAmount')}</span>
        ),
        cell: ({ row }) => (
          <span className="block text-end font-semibold tabular-nums">
            {formatCurrency(
              row.original.total_with_vat || row.original.total_revenue,
            )}
          </span>
        ),
        meta: { align: 'end' },
      },
    ];
  }, [t, hasFinancialAccess]);

  /* ---- Footer totals row ---- */

  const footer = React.useMemo(() => {
    if (!hasFinancialAccess) {
      return (rows: RouteStat[]) => [
        <span className="font-bold">{t('trips.statistics.carTable.totals')}</span>,
        formatNumber(
          rows.reduce((s, r) => s + (r.total_trips || 0), 0),
          0,
        ),
        formatNumber(
          rows.reduce((s, r) => s + (r.total_volume || 0), 0),
          2,
        ),
        formatNumber(
          rows.reduce((s, r) => s + (r.total_distance || 0), 0),
          2,
        ),
      ];
    }
    return (rows: RouteStat[]) => [
      <span className="font-bold">{t('trips.statistics.carTable.totals')}</span>,
      formatNumber(
        rows.reduce((s, r) => s + (r.total_trips || 0), 0),
        0,
      ),
      formatNumber(
        rows.reduce((s, r) => s + (r.total_volume || 0), 0),
        2,
      ),
      formatNumber(
        rows.reduce((s, r) => s + (r.total_distance || 0), 0),
        2,
      ),
      <span className="text-success">
        {formatCurrency(rows.reduce((s, r) => s + (r.total_revenue || 0), 0))}
      </span>,
      formatCurrency(rows.reduce((s, r) => s + (r.car_rental || 0), 0)),
      formatCurrency(rows.reduce((s, r) => s + (r.vat || 0), 0)),
      <span className="font-bold">
        {formatCurrency(
          rows.reduce(
            (s, r) => s + (r.total_with_vat || r.total_revenue || 0),
            0,
          ),
        )}
      </span>,
    ];
  }, [t, hasFinancialAccess]);

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="mb-3">
          <h3 className="text-base font-semibold">
            {t('trips.statistics.routes.headingFor', {
              company: company.company,
            })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('trips.statistics.routes.subtitle', { count: routes.length })}
          </p>
        </div>
        <DataTable
          columns={columns}
          data={routes}
          footer={routes.length > 0 ? footer : undefined}
          pageSize={50}
          emptyState={t('trips.statistics.routes.empty')}
        />
      </CardContent>
    </Card>
  );
}
