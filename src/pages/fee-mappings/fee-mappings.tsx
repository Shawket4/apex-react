import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertCircle, Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { extractErrorMessage } from '@/shared/api/errors';
import {
  useBulkEnrichFeeMappings,
  useDeleteFeeMapping,
  useFeeMappings,
} from '@/entities/fee-mapping/queries';
import {
  calculateAccuracy,
  type EnrichmentResult,
  type FeeMapping,
} from '@/entities/fee-mapping/schemas';
import { FeeMappingsStats } from '@/widgets/fee-mappings/fee-mappings-stats';
import {
  FeeMappingsFilters,
  type FeeMappingsFilterState,
} from '@/widgets/fee-mappings/fee-mappings-filters';
import { FeeMappingsForm } from '@/widgets/fee-mappings/fee-mappings-form';
import { FeeMappingsTable } from '@/widgets/fee-mappings/fee-mappings-table';
import { FeeMappingLocationDialog } from '@/widgets/fee-mappings/fee-mappings-location-dialog';
import { BulkEnrichDialog } from '@/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog';
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
  const bulkEnrich = useBulkEnrichFeeMappings();

  /* ---- UI state ---- */
  const [filters, setFilters] = React.useState<FeeMappingsFilterState>({
    search: '',
    company: '',
    accuracy: 'all',
  });
  const [editing, setEditing] = React.useState<FeeMapping | null>(null);
  const [locationTarget, setLocationTarget] = React.useState<FeeMapping | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<FeeMapping | null>(null);
  const [enrichResults, setEnrichResults] = React.useState<EnrichmentResult[] | null>(null);

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
    if (filters.company) parts.push(`Company: ${filters.company}`);
    if (filters.accuracy !== 'all') {
      parts.push(`Accuracy: ${t(`feeMappings.accuracy.${filters.accuracy}`)}`);
    }
    if (filters.search) parts.push(`Search: "${filters.search}"`);
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

  const handleBulkEnrich = async () => {
    try {
      const results = await bulkEnrich.mutateAsync();
      setEnrichResults(results);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('feeMappings.bulkEnrich.failed')));
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

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {t('feeMappings.pageTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('feeMappings.pageSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleBulkEnrich()}
            disabled={bulkEnrich.isPending}
            className="gap-1.5"
          >
            {bulkEnrich.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t('feeMappings.actions.bulkEnrich')}
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {t('feeMappings.actions.export')}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 text-sm">
              <p className="font-medium">{t('feeMappings.errors.loadFailed')}</p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => void refetch()}
              >
                {t('common.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
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
      <FeeMappingsTable
        mappings={filtered}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={(m) => setPendingDelete(m)}
        onSetLocation={(m) => setLocationTarget(m)}
      />

      {/* Location dialog */}
      <FeeMappingLocationDialog
        mapping={locationTarget}
        onOpenChange={(open) => !open && setLocationTarget(null)}
      />

      {/* Bulk enrich results */}
      <BulkEnrichDialog
        results={enrichResults}
        onOpenChange={(open) => !open && setEnrichResults(null)}
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
    </div>
  );
}

export default FeeMappingsPage;
