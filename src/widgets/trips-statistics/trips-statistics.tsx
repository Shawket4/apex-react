import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import {
  BarChart3,
  Car as CarIcon,
  Download,
  LayoutDashboard,
  Loader2,
  Route as RouteIcon,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/tabs';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Card, CardContent } from '@/shared/ui/card';
import { useTripStatistics } from '@/entities/trip-statistics/queries';
import type { TripStatisticsParams } from '@/entities/trip-statistics/schemas';
import { extractErrorMessage } from '@/shared/api/errors';
import { fmtDate } from '@/shared/lib/format';

import { TripsStatisticsSummary } from './trips-statistics-summary';
import { TripsStatisticsTimeline } from './trips-statistics-timeline';
import { TripsStatisticsCompanies } from './trips-statistics-companies';
import { TripsStatisticsRoutes } from './trips-statistics-routes';
import { TripsStatisticsCarTable } from './trips-statistics-car-table';
import { exportTripStatistics } from './trips-statistics-excel';

interface TripsStatisticsProps {
  filters: TripStatisticsParams;
}

type SubTab = 'overview' | 'routes' | 'cars';

/**
 * Statistics view with three sub-tabs:
 *
 *   - Overview — summary KPIs, daily timeline, per-company breakdown (the
 *     long-scroll layout from earlier iterations)
 *   - Routes   — company selector + route-level metrics table
 *   - Cars     — fleet-wide per-vehicle metrics table
 *
 * All three tabs share the same date / company filters from the parent page.
 */
export function TripsStatistics({ filters }: TripsStatisticsProps) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = React.useState<SubTab>('overview');
  const { data, isLoading, isFetching, isError, error, refetch } =
    useTripStatistics(filters);

  /* ---- Export ---------------------------------------------------------- */

  const handleExport = async () => {
    if (!data) return;
    try {
      const metaParts: string[] = [];
      if (filters.startDate && filters.endDate) {
        metaParts.push(
          `${fmtDate(filters.startDate)} – ${fmtDate(filters.endDate)}`,
        );
      }
      if (filters.company) metaParts.push(filters.company);
      await exportTripStatistics({
        data,
        t,
        meta: metaParts.join(' · ') || undefined,
      });
      toast.success(t('trips.statistics.exportSuccess'));
    } catch (err) {
      toast.error(
        extractErrorMessage(err, t('trips.statistics.exportFailed')),
      );
    }
  };

  /* ---- Loading state --------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[360px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  /* ---- Error state ----------------------------------------------------- */

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title={t('trips.statistics.errorTitle')}
            description={extractErrorMessage(
              error,
              t('trips.statistics.errorDescription'),
            )}
            action={
              <Button onClick={() => refetch()} variant="outline">
                {t('common.retry')}
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  /* ---- Empty state ----------------------------------------------------- */

  const hasAnyData =
    data &&
    (data.data.length > 0 ||
      data.statsByDate.length > 0 ||
      data.carTotals.length > 0);

  if (!hasAnyData) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title={t('trips.statistics.empty.title')}
            description={t('trips.statistics.empty.description')}
          />
        </CardContent>
      </Card>
    );
  }



  /* ---- Render --------------------------------------------------------- */

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header strip with export button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('common.refreshing')}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleExport()}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {t('trips.statistics.exportExcel')}
          </span>
        </Button>
      </div>

      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            {t('trips.statistics.subtabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="routes" className="gap-1.5">
            <RouteIcon className="h-3.5 w-3.5" />
            {t('trips.statistics.subtabs.routes')}
          </TabsTrigger>
          <TabsTrigger value="cars" className="gap-1.5">
            <CarIcon className="h-3.5 w-3.5" />
            {t('trips.statistics.subtabs.cars')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-3 md:mt-4 md:space-y-4">
          <TripsStatisticsSummary
            companies={data.data}
            daily={data.statsByDate}
            carTotals={data.carTotals}
            hasFinancialAccess={data.hasFinancialAccess}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
          <TripsStatisticsTimeline
            daily={data.statsByDate}
            hasFinancialAccess={data.hasFinancialAccess}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
          <TripsStatisticsCompanies
            companies={data.data}
            hasFinancialAccess={data.hasFinancialAccess}
          />
        </TabsContent>

        <TabsContent value="routes" className="mt-3 md:mt-4">
          <TripsStatisticsRoutes
            companies={data.data}
            hasFinancialAccess={data.hasFinancialAccess}
          />
        </TabsContent>

        <TabsContent value="cars" className="mt-3 md:mt-4">
          <TripsStatisticsCarTable
            carTotals={data.carTotals}
            hasFinancialAccess={data.hasFinancialAccess}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
