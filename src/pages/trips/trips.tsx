import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import { saveAs } from 'file-saver';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FilterX,
  List,
  Loader2,
  Plus,
  Truck,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/tabs';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/search-input';
import { EmptyState } from '@/shared/ui/empty-state';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { useDebounce } from '@/shared/hooks/use-debounce';
import {
  firstDayOfMonth,
  lastDayOfMonth,
  localDateISO,
  toDateOnly,
} from '@/shared/lib/format';
import {
  useTrips,
  useDeleteTrip,
  useDeleteParentTrip,
  useExportTrips,
  useExportWatanyaReport,
} from '@/entities/trip/queries';
import { useCompanies } from '@/entities/mapping/queries';
import { extractErrorMessage } from '@/shared/api/errors';
import type {
  MissingDataFilter,
  ReceiptStatusFilter,
  TripListParams,
} from '@/entities/trip/schemas';

import { TripsTable } from '@/widgets/trips-table/trips-table';
import { TripsPagination } from '@/widgets/trips-table/trips-pagination';
import {
  TripsCompanyFilter,
  TripsMissingDataFilter,
  TripsReceiptStatusControl,
  parseMissing,
  parseReceiptStatus,
  serializeMissing,
  serializeReceiptStatus,
} from '@/widgets/trips-table/trips-filters';
import { exportTrips } from '@/widgets/trips-table/trips-excel';
import { TripReceiptDialog } from '@/widgets/trip-receipt-dialog/trip-receipt-dialog';
import { TripLocationDialog } from '@/widgets/trip-location-dialog/trip-location-dialog';
import { TripReceiptBatchDialog } from '@/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog';
import { TripsStatistics } from '@/widgets/trips-statistics/trips-statistics';

/* -------------------------------------------------------------------------- */
/* Storage keys (sticky filter prefs across reloads)                           */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY_DATE_FROM = 'apex:trips:from';
const STORAGE_KEY_DATE_TO = 'apex:trips:to';
const STORAGE_KEY_LIMIT = 'apex:trips:limit';

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

function monthStartISO(): string {
  const d = firstDayOfMonth();
  return localDateISO(d.getFullYear(), d.getMonth(), d.getDate());
}
function monthEndISO(): string {
  const d = lastDayOfMonth();
  return localDateISO(d.getFullYear(), d.getMonth(), d.getDate(), true);
}

function loadDefault<T>(
  key: string,
  fallback: T,
  validate: (v: string) => T | null,
): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  const valid = validate(raw);
  return valid !== null && valid !== undefined ? valid : fallback;
}

const isValidLimit = (v: string): number | null => {
  const n = Number(v);
  return [10, 25, 50, 100].includes(n) ? n : null;
};

type ActiveTab = 'list' | 'statistics';

const isValidTab = (v: string | null): v is ActiveTab =>
  v === 'list' || v === 'statistics';

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function TripsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ------------------------------------------------------------------------ */
  /* Tab state — URL-synced via ?tab=                                          */
  /*                                                                           */
  /* The original module had statistics as an in-page tab (not a separate      */
  /* route) so a user could flip between viewing trips and the analytics view  */
  /* without losing their date filters. We mirror that.                        */
  /* ------------------------------------------------------------------------ */

  const [activeTab, setActiveTab] = React.useState<ActiveTab>(() => {
    const url = searchParams.get('tab');
    return isValidTab(url) ? url : 'list';
  });

  /* ------------------------------------------------------------------------ */
  /* Filter state (initial values: URL > localStorage > defaults)              */
  /* ------------------------------------------------------------------------ */

  const [search, setSearch] = React.useState(() => searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(search, 300);

  const [from, setFrom] = React.useState<string | null>(() => {
    const url = searchParams.get('from');
    if (url) return url;
    return (
      loadDefault(STORAGE_KEY_DATE_FROM, null as string | null, (v) => v) ??
      monthStartISO()
    );
  });
  const [to, setTo] = React.useState<string | null>(() => {
    const url = searchParams.get('to');
    if (url) return url;
    return (
      loadDefault(STORAGE_KEY_DATE_TO, null as string | null, (v) => v) ??
      monthEndISO()
    );
  });

  const [company, setCompany] = React.useState<string>(
    () => searchParams.get('co') ?? '',
  );
  const [missingData, setMissingData] = React.useState<MissingDataFilter>(() =>
    parseMissing(searchParams.get('md')),
  );
  const [receiptStatus, setReceiptStatus] = React.useState<ReceiptStatusFilter>(
    () => parseReceiptStatus(searchParams.get('rs')),
  );

  const [page, setPage] = React.useState<number>(() => {
    const url = Number(searchParams.get('p'));
    return Number.isFinite(url) && url >= 1 ? url : 1;
  });
  const [limit, setLimit] = React.useState<number>(() => {
    const url = searchParams.get('l');
    if (url && isValidLimit(url) != null) return Number(url);
    return loadDefault(STORAGE_KEY_LIMIT, 25, isValidLimit);
  });

  // Dialog state
  const [receiptTripId, setReceiptTripId] = React.useState<number | null>(null);
  const [mapTripId, setMapTripId] = React.useState<number | null>(null);
  const [batchParentId, setBatchParentId] = React.useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<
    | { type: 'single'; id: number }
    | { type: 'parent'; id: number; count: number }
    | null
  >(null);

  const [isExporting, setIsExporting] = React.useState(false);
  const [isExportingWatanya, setIsExportingWatanya] = React.useState(false);

  /* ------------------------------------------------------------------------ */
  /* Sync state → URL                                                          */
  /* ------------------------------------------------------------------------ */

  React.useEffect(() => {
    const next = new URLSearchParams();
    if (activeTab !== 'list') next.set('tab', activeTab);
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    if (company) next.set('co', company);
    const md = serializeMissing(missingData);
    if (md) next.set('md', md);
    const rs = serializeReceiptStatus(receiptStatus);
    if (rs) next.set('rs', rs);
    if (page > 1) next.set('p', String(page));
    if (limit !== 25) next.set('l', String(limit));
    setSearchParams(next, { replace: true });
  }, [
    activeTab,
    debouncedSearch,
    from,
    to,
    company,
    missingData,
    receiptStatus,
    page,
    limit,
    setSearchParams,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Sync sticky bits → localStorage                                          */
  /* ------------------------------------------------------------------------ */

  React.useEffect(() => {
    if (from) window.localStorage.setItem(STORAGE_KEY_DATE_FROM, from);
    if (to) window.localStorage.setItem(STORAGE_KEY_DATE_TO, to);
  }, [from, to]);
  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY_LIMIT, String(limit));
  }, [limit]);

  /* ------------------------------------------------------------------------ */
  /* Reset page to 1 when filters change                                       */
  /*                                                                           */
  /* (Without this, a user paginating to page 5 then narrowing the search      */
  /* would land on a page that may not exist in the new result set.)           */
  /* ------------------------------------------------------------------------ */

  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, from, to, company, missingData, receiptStatus]);

  /* ------------------------------------------------------------------------ */
  /* Build query params (server-side filtering)                               */
  /* ------------------------------------------------------------------------ */

  const listParams: TripListParams = {
    page,
    limit,
    search: debouncedSearch,
    company,
    startDate: from ? toDateOnly(from) : '',
    endDate: to ? toDateOnly(to) : '',
    missingData,
    receiptStatus,
  };

  // Trip list — only fetched when the list tab is active. Statistics has its
  // own query that hits the Rust microservice with a different parameter
  // shape, so there's no benefit to fetching the list when it isn't visible.
  const { data, isLoading, isError, refetch } = useTrips(listParams, {
    enabled: activeTab === 'list',
  });
  const { data: companiesResp } = useCompanies();
  const companies = companiesResp?.data ?? [];

  const trips = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.pages ?? 1;
  const total = meta?.total ?? 0;

  /* ------------------------------------------------------------------------ */
  /* Mutations                                                                 */
  /* ------------------------------------------------------------------------ */

  const deleteTrip = useDeleteTrip();
  const deleteParent = useDeleteParentTrip();
  const exportTripsAll = useExportTrips();
  const watanyaExport = useExportWatanyaReport();

  /* ------------------------------------------------------------------------ */
  /* Handlers                                                                  */
  /* ------------------------------------------------------------------------ */

  const handleResetFilters = () => {
    setSearch('');
    setCompany('');
    setMissingData('');
    setReceiptStatus('');
    setFrom(monthStartISO());
    setTo(monthEndISO());
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'single') {
        await deleteTrip.mutateAsync(confirmDelete.id);
        toast.success(t('trips.delete.successSingle'));
      } else {
        await deleteParent.mutateAsync(confirmDelete.id);
        toast.success(
          t('trips.delete.successParent', { count: confirmDelete.count }),
        );
      }
      setConfirmDelete(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('trips.delete.failed')));
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const allTrips = await exportTripsAll.mutateAsync({
        search: debouncedSearch,
        company,
        startDate: from ? toDateOnly(from) : '',
        endDate: to ? toDateOnly(to) : '',
        missingData,
        receiptStatus,
      });
      if (allTrips.length === 0) {
        toast.error(t('trips.export.empty'));
        return;
      }
      await exportTrips({ trips: allTrips, t });
    } catch (err) {
      toast.error(extractErrorMessage(err, t('trips.export.failed')));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWatanya = async () => {
    if (!from || !to) {
      toast.error(t('trips.export.watanyaNeedsDates'));
      return;
    }
    setIsExportingWatanya(true);
    try {
      const { blob, filename } = await watanyaExport.mutateAsync({
        start_date: toDateOnly(from),
        end_date: toDateOnly(to),
      });
      saveAs(blob, filename);
      toast.success(t('trips.export.watanyaSuccess'));
    } catch (err) {
      toast.error(extractErrorMessage(err, t('trips.export.watanyaFailed')));
    } finally {
      setIsExportingWatanya(false);
    }
  };

  const anyFilterActive =
    !!debouncedSearch || !!company || !!missingData || !!receiptStatus;

  /* ------------------------------------------------------------------------ */
  /* Action buttons (top-right of PageShell)                                   */
  /*                                                                           */
  /* The action set differs slightly between tabs:                             */
  /*   - List view: Excel + Watanya + Add Trip                                 */
  /*   - Statistics: Watanya + Add Trip (Excel comes from inside statistics    */
  /*     widget — different sheets, different shape)                           */
  /* Add Trip stays visible on both tabs because it's the primary CTA of the   */
  /* whole page.                                                               */
  /* ------------------------------------------------------------------------ */

  const actions = (
    <>
      {activeTab === 'list' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleExportExcel()}
          disabled={isExporting || total === 0}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t('common.export')}</span>
        </Button>
      )}
      {/* Watanya export — TODO: gate on permission level >= 3 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleExportWatanya()}
        disabled={isExportingWatanya || !from || !to}
      >
        {isExportingWatanya ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {t('trips.actions.watanyaReport')}
        </span>
      </Button>
      <Button onClick={() => navigate('/trips/new')} size="sm">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">{t('trips.actions.add')}</span>
      </Button>
    </>
  );

  /* ------------------------------------------------------------------------ */
  /* Statistics filters — projected from the page-level filter state           */
  /* ------------------------------------------------------------------------ */

  const statisticsFilters = {
    startDate: from || undefined,
    endDate: to || undefined,
    company: company || undefined,
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <PageShell
      title={t('trips.title')}
      description={t('trips.subtitle')}
      icon={<Truck className="h-5 w-5" />}
      actions={actions}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ActiveTab)}
      >
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="h-3.5 w-3.5" />
            {t('trips.tabs.list')}
          </TabsTrigger>
          <TabsTrigger value="statistics" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {t('trips.tabs.statistics')}
          </TabsTrigger>
        </TabsList>

        {/* Shared filter toolbar — both tabs respect the same date range and
            company filter so the user keeps their context when flipping. */}
        <div className="mt-3 space-y-2">
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, tt) => {
              setFrom(f);
              setTo(tt);
            }}
          />

          {/* List-only filters */}
          {activeTab === 'list' && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder={t('trips.searchPlaceholder')}
                  className="max-w-sm"
                />
                <TripsCompanyFilter
                  value={company}
                  onChange={setCompany}
                  companies={companies}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TripsReceiptStatusControl
                  value={receiptStatus}
                  onChange={setReceiptStatus}
                />
                <TripsMissingDataFilter
                  value={missingData}
                  onChange={setMissingData}
                />
                {anyFilterActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9 gap-1.5"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    {t('common.clear')}
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  {t('trips.showingCount', { shown: trips.length, total })}
                </span>
              </div>
            </>
          )}

          {/* Statistics-only filter — just company. Date range is shared above. */}
          {activeTab === 'statistics' && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <TripsCompanyFilter
                value={company}
                onChange={setCompany}
                companies={companies}
              />
              {!!company && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCompany('')}
                  className="h-9 gap-1.5"
                >
                  <FilterX className="h-3.5 w-3.5" />
                  {t('common.clear')}
                </Button>
              )}
            </div>
          )}
        </div>

        <TabsContent value="list" className="mt-3 md:mt-4">
          {isError ? (
            <EmptyState
              icon={<Truck className="h-5 w-5" />}
              title={t('errors.generic')}
              action={
                <Button onClick={() => void refetch()} variant="outline">
                  {t('common.retry')}
                </Button>
              }
            />
          ) : (
            <>
              <TripsTable
                trips={trips}
                loading={isLoading}
                onDelete={(id) => setConfirmDelete({ type: 'single', id })}
                onOpenReceipt={(id) => setReceiptTripId(id)}
                onOpenMap={(id) => setMapTripId(id)}
                onDeleteParent={(id, count) =>
                  setConfirmDelete({ type: 'parent', id, count })
                }
                onOpenReceiptBatch={(id) => setBatchParentId(id)}
                emptyAction={
                  <Button onClick={() => navigate('/trips/new')}>
                    <Plus className="h-4 w-4" />
                    {t('trips.actions.add')}
                  </Button>
                }
              />
              <TripsPagination
                page={page}
                pages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                loading={isLoading}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="mt-3 md:mt-4">
          <TripsStatistics filters={statisticsFilters} />
        </TabsContent>
      </Tabs>

      {/* Dialogs - mounted at page level so they survive tab switches */}
      <TripReceiptDialog
        tripId={receiptTripId}
        open={receiptTripId !== null}
        onOpenChange={(open) => !open && setReceiptTripId(null)}
      />
      <TripLocationDialog
        tripId={mapTripId}
        open={mapTripId !== null}
        onOpenChange={(open) => !open && setMapTripId(null)}
      />
      <TripReceiptBatchDialog
        parentId={batchParentId}
        open={batchParentId !== null}
        onOpenChange={(open) => !open && setBatchParentId(null)}
      />
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={
          confirmDelete?.type === 'parent'
            ? t('trips.delete.titleParent')
            : t('trips.delete.titleSingle')
        }
        description={
          confirmDelete?.type === 'parent'
            ? t('trips.delete.descriptionParent', {
                count: confirmDelete.count,
              })
            : t('trips.delete.descriptionSingle')
        }
        variant="destructive"
        loading={deleteTrip.isPending || deleteParent.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageShell>
  );
}
