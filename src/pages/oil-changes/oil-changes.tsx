import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Droplets,
  Plus,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { StatCard } from '@/shared/ui/stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import {
  useOilChanges,
  useDeleteOilChange,
} from '@/entities/oil-change/queries';
import { selectLatestPerCar } from '@/entities/oil-change/api';
import type { OilChangeView } from '@/entities/oil-change/schemas';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { matches } from '@/shared/lib/normalize';
import { formatCurrency } from '@/shared/lib/format';
import { formatCompactCurrency } from '@/shared/lib/format-number';
import { OilChangesTable } from '@/widgets/oil-changes-table/oil-changes-table';
import {
  OilChangesFilters,
  type StatusFilterValue,
} from '@/widgets/oil-changes-table/oil-changes-filters';
import { exportOilChangesFleet } from '@/widgets/oil-changes-table/oil-changes-excel';

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                 */
/* -------------------------------------------------------------------------- */

function isStatusFilter(v: string | null): v is StatusFilterValue {
  return v === 'all' || v === 'good' || v === 'warning' || v === 'critical';
}

export default function OilChangesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = React.useState(() => searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(search, 200);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilterValue>(() => {
    const url = searchParams.get('status');
    return isStatusFilter(url) ? url : 'all';
  });

  const [pendingDelete, setPendingDelete] = React.useState<OilChangeView | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const { data: records = [], isLoading, isError, refetch } = useOilChanges();
  const deleteMutation = useDeleteOilChange();

  /* ------------------------------------------------------------------------ */
  /* Sync state → URL                                                         */
  /* ------------------------------------------------------------------------ */

  React.useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (statusFilter !== 'all') next.set('status', statusFilter);
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, statusFilter, setSearchParams]);

  /* ------------------------------------------------------------------------ */
  /* Pipeline: fetched → latest-per-car → search → status                     */
  /* ------------------------------------------------------------------------ */

  const latestPerCar = React.useMemo(
    () => selectLatestPerCar(records),
    [records],
  );

  const searched = React.useMemo(() => {
    if (!debouncedSearch.trim()) return latestPerCar;
    return latestPerCar.filter(
      (r) =>
        matches(r.car_no_plate, debouncedSearch) ||
        matches(r.super_visor, debouncedSearch) ||
        matches(r.driver_name, debouncedSearch),
    );
  }, [latestPerCar, debouncedSearch]);

  const filtered = React.useMemo(() => {
    if (statusFilter === 'all') return searched;
    return searched.filter((r) => r.status === statusFilter);
  }, [searched, statusFilter]);

  /* ------------------------------------------------------------------------ */
  /* Counts (derived from the SEARCH result, before status filter applies)    */
  /* This way the status tabs always show how many items would appear if you  */
  /* clicked them.                                                            */
  /* ------------------------------------------------------------------------ */

  const counts = React.useMemo(() => {
    const c = { all: searched.length, good: 0, warning: 0, critical: 0 };
    for (const r of searched) c[r.status]++;
    return c;
  }, [searched]);

  /* ------------------------------------------------------------------------ */
  /* KPI stats — computed from latest-per-car (NOT the filtered set), so the  */
  /* fleet-wide picture stays stable while the table reflects the filter.    */
  /* ------------------------------------------------------------------------ */

  const stats = React.useMemo(() => {
    const totalCost = latestPerCar.reduce((s, r) => s + r.cost, 0);
    const good = latestPerCar.filter((r) => r.status === 'good').length;
    const warning = latestPerCar.filter((r) => r.status === 'warning').length;
    const critical = latestPerCar.filter((r) => r.status === 'critical').length;
    return {
      totalVehicles: latestPerCar.length,
      good,
      warning,
      critical,
      totalCost,
    };
  }, [latestPerCar]);

  /* ------------------------------------------------------------------------ */
  /* Handlers                                                                 */
  /* ------------------------------------------------------------------------ */

  const handleViewHistory = React.useCallback(
    (carNoPlate: string) => {
      // The history page reads the plate from the URL — encode it so plates
      // with spaces or Arabic glyphs survive the round-trip.
      navigate(`/oil-changes/car/${encodeURIComponent(carNoPlate)}`);
    },
    [navigate],
  );

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteMutation.mutateAsync(pendingDelete.ID);
    setPendingDelete(null);
  };

  const handleExport = async () => {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      await exportOilChangesFleet({ rows: filtered, t });
    } finally {
      setExporting(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  const showEmptyState = !isLoading && latestPerCar.length === 0;

  return (
    <PageShell
      title={t('oilChanges.title')}
      description={t('oilChanges.subtitle')}
      icon={<Droplets className="h-5 w-5" />}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
          <Button onClick={() => navigate('/oil-changes/new')} size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('oilChanges.addNew')}</span>
          </Button>
        </>
      }
    >
      {isError ? (
        <EmptyState
          lottieSrc="/animations/warning.lottie"
          lottieWidth={100}
          lottieHeight={100}
          title={t('errors.generic')}
          action={
            <Button onClick={() => void refetch()} variant="outline">
              {t('common.retry')}
            </Button>
          }
        />
      ) : showEmptyState ? (
        <EmptyState
          lottieSrc="/animations/construction.lottie"
          lottieWidth={120}
          lottieHeight={120}
          title={t('oilChanges.empty.title')}
          description={t('oilChanges.empty.description')}
          action={
            <Button onClick={() => navigate('/oil-changes/new')}>
              <Plus className="h-4 w-4" />
              {t('oilChanges.addNew')}
            </Button>
          }
        />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label={t('oilChanges.stats.totalVehicles')}
              value={String(stats.totalVehicles)}
              icon={Truck}
              tone="primary"
            />
            <StatCard
              label={t('oilChanges.status.good')}
              value={String(stats.good)}
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              label={t('oilChanges.status.warning')}
              value={String(stats.warning)}
              icon={AlertTriangle}
              tone="warning"
            />
            <StatCard
              label={t('oilChanges.status.critical')}
              value={String(stats.critical)}
              icon={AlertCircle}
              tone="destructive"
            />
            <StatCard
              label={t('oilChanges.stats.totalCost')}
              value={{
                full: formatCurrency(stats.totalCost),
                compact: formatCompactCurrency(stats.totalCost),
              }}
              icon={Droplets}
              tone="primary"
            />
          </div>

          {/* Filters */}
          <OilChangesFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            counts={counts}
          />

          {/* Filter-aware count line */}
          {(debouncedSearch || statusFilter !== 'all') && (
            <p className="text-xs text-muted-foreground">
              {t('oilChanges.filters.showingCount', {
                shown: filtered.length,
                total: latestPerCar.length,
              })}
            </p>
          )}

          {/* Table */}
          <OilChangesTable
            rows={filtered}
            loading={isLoading}
            onViewHistory={handleViewHistory}
            onDelete={(row) => setPendingDelete(row)}
            emptyState={
              <div className="flex flex-col items-center gap-2 py-8 text-sm">
                <span className="text-muted-foreground">
                  {t('oilChanges.empty.noMatches')}
                </span>
                {(debouncedSearch || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                    }}
                  >
                    {t('common.clearFilters')}
                  </Button>
                )}
              </div>
            }
          />
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t('oilChanges.delete.title')}
        description={
          pendingDelete
            ? t('oilChanges.delete.description', { plate: pendingDelete.car_no_plate })
            : ''
        }
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageShell>
  );
}
