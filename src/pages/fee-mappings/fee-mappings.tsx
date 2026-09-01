import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toast';
import { AlertCircle, Banknote, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { PageShell } from '@/shared/ui/page-shell';
import { extractErrorMessage } from '@/shared/api/errors';
import {
  useDeleteFeeMapping,
  useFeeMappings,
} from '@/entities/fee-mapping/queries';
import {
  calculateAccuracy,
  type FeeMapping,
} from '@/entities/fee-mapping/schemas';
import { FeeMappingsStats } from '@/widgets/fee-mappings/fee-mappings-stats';
import {
  FeeMappingsFilters,
  type FeeMappingsFilterState,
} from '@/widgets/fee-mappings/fee-mappings-filters';
import { FeeMappingsForm } from '@/widgets/fee-mappings/fee-mappings-form';
import { FeeMappingsTable } from '@/widgets/fee-mappings/fee-mappings-table';
import { FeeMappingRouteDialog } from '@/widgets/fee-mappings/fee-mapping-route-dialog';
import { FeeMappingsMobileList } from '@/widgets/fee-mappings/fee-mappings-mobile-list';
import { useIsMobile } from '@/shared/hooks/use-media-query';
import { exportFeeMappingsExcel } from '@/widgets/fee-mappings/fee-mappings-excel';

/**
 * Fee mappings admin page.
 *
 * Composes filter bar, stats strip, add/edit form, the data table, and
 * three dialogs (location picker, bulk-enrich results, delete confirm).
 * All server-state lives in the entity layer's queries; this component
 * only owns UI state.
 */
export function FeeMappingsPage() {
  const { t } = useTranslation();

  /* ---- Server data ---- */
  const { data: mappings = [], isLoading, isError, refetch } = useFeeMappings();
  const deleteMutation = useDeleteFeeMapping();

  /* ---- UI state ---- */
  const [filters, setFilters] = React.useState<FeeMappingsFilterState>({
    search: '',
    company: '',
    accuracy: 'all',
  });
  const isMobile = useIsMobile();
  const [editing, setEditing] = React.useState<FeeMapping | null>(null);
  // The map icon opens the ROUTE, not a pin editor. Pins are geography and
  // belong to the locations screen — editing one from here quietly changed
  // every other mapping sharing that drop-off.
  const [routeTarget, setRouteTarget] = React.useState<FeeMapping | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<FeeMapping | null>(null);

  /* ---- Filtering ---- */
  const filtered = React.useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return mappings.filter((m) => {
      if (filters.company && m.company !== filters.company) return false;
      if (filters.accuracy !== 'all') {
        const { kind } = calculateAccuracy(m.distance, m.osrmDistanceKm);
        if (kind !== filters.accuracy) return false;
      }
      if (search) {
        const haystack = `${m.company} ${m.terminal} ${m.dropOffPoint}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [mappings, filters]);

  /**
   * Build a human-readable summary of the active filters for the Excel
   * meta line. Skipped when no filters are active.
   */
  const filterMeta = React.useMemo(() => {
    const parts: string[] = [];
    if (filters.company) parts.push(t('feeMappings.export.filterCompany', { value: filters.company }));
    if (filters.accuracy !== 'all') {
      parts.push(
        t('feeMappings.export.filterAccuracy', {
          value: t(`feeMappings.accuracy.${filters.accuracy}`),
        }),
      );
    }
    if (filters.search) parts.push(t('feeMappings.export.filterSearch', { value: filters.search }));
    return parts.length ? parts.join(' · ') : undefined;
  }, [filters, t]);

  /* ---- Handlers ---- */

  const handleEdit = (m: FeeMapping) => {
    setEditing(m);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast.success(t('feeMappings.delete.success'));
      setPendingDelete(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('feeMappings.delete.failed')));
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error(t('feeMappings.export.empty'));
      return;
    }
    void exportFeeMappingsExcel(filtered, { filterMeta });
  };

  /* ---- Render ---- */

  const actions = (
    <>
      <Button
        size="sm"
        onClick={handleExport}
        disabled={filtered.length === 0}
      >
        <Download aria-hidden="true" />
        {t('feeMappings.actions.export')}
      </Button>
    </>
  );

  return (
    <PageShell
      title={t('feeMappings.pageTitle')}
      description={t('feeMappings.pageSubtitle')}
      icon={<Banknote className="h-5 w-5" aria-hidden="true" />}
      actions={actions}
    >

      {/* Error banner */}
      {isError && (
        <Card className="rounded-lg border border-dashed border-warning/40 bg-warning/10 shadow-none">
          <CardContent className="flex items-start gap-2 px-3 py-2.5 text-[12.5px]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p>{t('feeMappings.errors.loadFailed')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 gap-1.5 border-warning/40 px-2.5 text-xs text-warning hover:text-warning"
                onClick={() => void refetch()}
              >
                <RefreshCw aria-hidden="true" />
                {t('common.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <FeeMappingsStats mappings={mappings} />
      )}

      {/* Add/edit form */}
      <FeeMappingsForm
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />

      {/* Filters */}
      <FeeMappingsFilters
        state={filters}
        onChange={setFilters}
        mappings={mappings}
        filteredCount={filtered.length}
      />

      {/* Table */}
      {/* A six-column table with two distances does not survive a phone; the
          same rows render as cards there, as on trips, oil changes and cars. */}
      {isMobile ? (
        <FeeMappingsMobileList
          rows={filtered}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={(m) => setPendingDelete(m)}
          onShowRoute={(m) => setRouteTarget(m)}
        />
      ) : (
        <FeeMappingsTable
          mappings={filtered}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={(m) => setPendingDelete(m)}
          onShowRoute={(m) => setRouteTarget(m)}
        />
      )}

      {/* The same map dialog the trips list uses. */}
      <FeeMappingRouteDialog
        mapping={routeTarget}
        onOpenChange={(open) => !open && setRouteTarget(null)}
      />



      {/* Delete confirm */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        title={t('feeMappings.delete.confirmTitle')}
        description={
          pendingDelete
            ? t('feeMappings.delete.confirmDescription', {
                company: pendingDelete.company,
                dropoff: pendingDelete.dropOffPoint,
              })
            : undefined
        }
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PageShell>
  );
}

export default FeeMappingsPage;
