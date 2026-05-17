import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Car as CarIcon,
  Clock,
  Download,
  Droplets,
  Edit,
  Gauge,
  Hash,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { StatCard } from '@/shared/ui/stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { DataTable } from '@/shared/ui/data-table';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import {
  useDeleteOilChange,
  useOilChanges,
} from '@/entities/oil-change/queries';
import { selectHistoryForCarPlate } from '@/entities/oil-change/api';
import type { OilChangeView } from '@/entities/oil-change/schemas';
import { format, formatCurrency, formatDateTime } from '@/shared/lib/format';
import { formatNumber, formatCompactCurrency } from '@/shared/lib/format-number';
import { OilChangeStatusBadge } from '@/widgets/oil-changes-table/oil-change-status-badge';
import { exportOilChangesHistory } from '@/widgets/oil-changes-table/oil-changes-excel';
import { cn } from '@/shared/lib/cn';

export default function OilChangeHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { carId } = useParams<{ carId: string }>();
  const carNoPlate = carId ? decodeURIComponent(carId) : '';

  const { data: records = [], isLoading, isError, refetch } = useOilChanges();
  const deleteMutation = useDeleteOilChange();
  const [pendingDelete, setPendingDelete] = React.useState<OilChangeView | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const history = React.useMemo(
    () => selectHistoryForCarPlate(records, carNoPlate),
    [records, carNoPlate],
  );

  /* ------------------------------------------------------------------------ */
  /* KPI stats                                                                 */
  /* ------------------------------------------------------------------------ */

  const stats = React.useMemo(() => {
    const totalCost = history.reduce((s, r) => s + r.cost, 0);
    const avgCost = history.length > 0 ? totalCost / history.length : 0;
    // Latest record sits at index 0 (sort is desc)
    const latest = history[0];
    return {
      count: history.length,
      totalCost,
      avgCost,
      latestInterval: latest?.mileage ?? 0,
      latestKmRemaining: latest?.kmRemaining ?? 0,
      latestStatus: latest?.status,
    };
  }, [history]);

  /* ------------------------------------------------------------------------ */
  /* Columns                                                                  */
  /* ------------------------------------------------------------------------ */

  const columns = React.useMemo<ColumnDef<OilChangeView>[]>(
    () => [
      {
        accessorKey: 'ID',
        header: '#',
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hash className="h-3 w-3 shrink-0" />
            {row.original.ID}
          </span>
        ),
        size: 60,
      },
      {
        accessorKey: 'date',
        header: t('oilChanges.fields.date'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {format(row.original.date, 'dd MMM yyyy')}
          </div>
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
        accessorKey: 'super_visor',
        header: t('oilChanges.fields.supervisor'),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.super_visor || '—'}</span>
        ),
      },
      {
        accessorKey: 'odometer_at_change',
        header: t('oilChanges.fields.odometerAtChange'),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {formatNumber(row.original.odometer_at_change, 0)} km
          </span>
        ),
        meta: { align: 'end' },
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
        accessorKey: 'mileage',
        header: t('oilChanges.fields.mileage'),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {formatNumber(row.original.mileage, 0)} km
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'kmRemaining',
        header: t('common.status'),
        cell: ({ row }) => (
          <OilChangeStatusBadge kmRemaining={row.original.kmRemaining} showValue />
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
            onClick={(e) => e.stopPropagation()}
          >
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
                  onClick={() => setPendingDelete(row.original)}
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
    [t, navigate],
  );

  /* ------------------------------------------------------------------------ */
  /* Handlers                                                                  */
  /* ------------------------------------------------------------------------ */

  const handleExport = async () => {
    if (history.length === 0) return;
    setExporting(true);
    try {
      await exportOilChangesHistory({ rows: history, carNoPlate, t });
    } finally {
      setExporting(false);
    }
  };

  const handleAddNew = () => {
    // Navigate to the create form pre-filling with whatever we know about
    // this car. The user just needs to enter the new odometer-at-change,
    // mileage, and cost.
    navigate('/oil-changes/new', {
      state: {
        initialValues: {
          // car_id isn't on `OilChangeView`; we can't infer it from the
          // history alone. The form's car-change effect will fill the
          // driver as soon as the user picks the car from the dropdown.
          driver_name: history[0]?.driver_name,
          supervisor: history[0]?.super_visor,
        },
      },
    });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteMutation.mutateAsync(pendingDelete.ID);
    setPendingDelete(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <PageShell
      title={
        <span className="flex items-center gap-3">
          {t('oilChanges.history.title')}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium">
            <CarIcon className="h-3.5 w-3.5" />
            {carNoPlate}
          </span>
        </span>
      }
      description={t('oilChanges.history.description')}
      icon={<Droplets className="h-5 w-5" />}
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/oil-changes')}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || history.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
          <Button onClick={handleAddNew} size="sm">
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
      ) : isLoading ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </>
      ) : history.length === 0 ? (
        <EmptyState
          lottieSrc="/animations/construction.lottie"
          lottieWidth={120}
          lottieHeight={120}
          title={t('oilChanges.history.empty.title', { plate: carNoPlate })}
          description={t('oilChanges.history.empty.description')}
          action={
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4" />
              {t('oilChanges.addNew')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <StatCard
              label={t('oilChanges.history.stats.totalRecords')}
              value={String(stats.count)}
              icon={Hash}
              tone="primary"
            />
            <StatCard
              label={t('oilChanges.history.stats.totalSpent')}
              value={{
                full: formatCurrency(stats.totalCost),
                compact: formatCompactCurrency(stats.totalCost),
              }}
              icon={Droplets}
              tone="primary"
            />
            <StatCard
              label={t('oilChanges.history.stats.avgCost')}
              value={{
                full: formatCurrency(stats.avgCost),
                compact: formatCompactCurrency(stats.avgCost),
              }}
              icon={User}
            />
            <StatCard
              label={t('oilChanges.history.stats.latestInterval')}
              value={`${formatNumber(stats.latestInterval, 0)} km`}
              subvalue={
                stats.latestStatus
                  ? t(`oilChanges.status.${stats.latestStatus}`)
                  : undefined
              }
              icon={Gauge}
              tone={
                stats.latestStatus === 'critical'
                  ? 'destructive'
                  : stats.latestStatus === 'warning'
                    ? 'warning'
                    : 'success'
              }
            />
          </div>

          <DataTable
            columns={columns}
            data={history}
            onRowClick={(row) => navigate(`/oil-changes/${row.ID}/edit`)}
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
            ? t('oilChanges.delete.descriptionRecord', {
                date: format(pendingDelete.date, 'dd MMM yyyy'),
              })
            : ''
        }
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageShell>
  );
}
