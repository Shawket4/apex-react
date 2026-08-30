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
  SlidersHorizontal,
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
import { cn } from '@/shared/lib/cn';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useScope, useScopeCompany } from '@/shared/scope';
import { toDateOnly } from '@/shared/lib/format';
import {
  useTrips,
  useDeleteTrip,
  useDeleteParentTrip,
  useExportTrips,
  useExportWatanyaReport,
} from '@/entities/trip/queries';
import { extractErrorMessage } from '@/shared/api/errors';
import type {
  MissingDataFilter,
  ReceiptStatusFilter,
  TripListParams,
} from '@/entities/trip/schemas';

import { TripsTable } from '@/widgets/trips-table/trips-table';
import { TripsPagination } from '@/widgets/trips-table/trips-pagination';
import { useQueryClient } from '@tanstack/react-query';
import { intentProps, warmTripForm } from '@/shared/lib/prefetch';
import { prefetchTrips } from '@/entities/trip/queries';
import { prefetchTripStatistics } from '@/entities/trip-statistics/queries';
import {
  TripsMissingDataFilter,
  TripsReceiptStatusControl,
  parseMissing,
  parseReceiptStatus,
  serializeMissing,
  serializeReceiptStatus,
} from '@/widgets/trips-table/trips-filters';
import { TripReceiptDialog } from '@/widgets/trip-receipt-dialog/trip-receipt-dialog';
import { TripLocationDialog } from '@/widgets/trip-location-dialog/trip-location-dialog';
import { TripReceiptBatchDialog } from '@/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog';
import { TripsStatistics } from '@/widgets/trips-statistics/trips-statistics';
import {
  TRIPS_STORAGE_KEYS,
  isValidLimit,
  loadDefault,
} from '@/entities/trip/defaults';

/* Defaults + storage keys live in entities/trip/defaults.ts, shared with the
   sidebar's data warmer so the warmed key can never drift from the mount key. */

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
  // Phone-only disclosure for the refinement filters. Kept in the page rather
  // than the widget because the widget is shared with the desktop toolbar,
  // which always shows them.
  const [showMoreFilters, setShowMoreFilters] = React.useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Dates + company come from the GLOBAL scope (the header bar) — this page
  // no longer owns them.
  const { range: scopeRange } = useScope();
  const { company: scopeCompany } = useScopeCompany();
  const from = scopeRange.from;
  const to = scopeRange.to;
  const company = scopeCompany ?? '';

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
    return loadDefault(TRIPS_STORAGE_KEYS.limit, 25, isValidLimit);
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
    setSearchParams(
      (prev) => {
        // Start from the CURRENT params so the global scope's keys
        // (preset/from/to/co) survive this page's own bookkeeping.
        const next = new URLSearchParams(prev);
        const setOrDelete = (k: string, v: string | null) =>
          v ? next.set(k, v) : next.delete(k);
        setOrDelete('tab', activeTab !== 'list' ? activeTab : null);
        setOrDelete('q', debouncedSearch || null);
        setOrDelete('md', serializeMissing(missingData));
        setOrDelete('rs', serializeReceiptStatus(receiptStatus));
        setOrDelete('p', page > 1 ? String(page) : null);
        setOrDelete('l', limit !== 25 ? String(limit) : null);
        return next;
      },
      { replace: true },
    );
  }, [activeTab, debouncedSearch, missingData, receiptStatus, page, limit, setSearchParams]);

  /* ------------------------------------------------------------------------ */
  /* Sync sticky bits → localStorage                                          */
  /* ------------------------------------------------------------------------ */

  React.useEffect(() => {
    window.localStorage.setItem(TRIPS_STORAGE_KEYS.limit, String(limit));
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

  const queryClient = useQueryClient();

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
    setMissingData('');
    setReceiptStatus('');
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
      // The server renders the workbook; the client only names the columns.
      // Sending the translated labels keeps both languages working without the
      // Go side carrying its own copy of the strings.
      const { blob, filename } = await exportTripsAll.mutateAsync({
        params: {
          search: debouncedSearch,
          company,
          startDate: from ? toDateOnly(from) : '',
          endDate: to ? toDateOnly(to) : '',
          missingData,
          receiptStatus,
        },
        labels: {
          title: t('trips.title'),
          subtitle: t('trips.subtitle'),
          sheet: t('trips.title'),
          summary: t('trips.export.summarySheet'),
          receipt_no: t('trips.fields.receiptNo'),
          date: t('trips.fields.date'),
          company: t('trips.fields.company'),
          terminal: t('trips.fields.terminal'),
          drop_off_point: t('trips.fields.dropOffPoint'),
          vehicle: t('trips.fields.vehicle'),
          driver: t('trips.fields.driver'),
          tank_capacity: t('trips.fields.tankCapacity'),
          distance: t('trips.fields.distance'),
          fee: t('trips.fields.fee'),
          in_garage: t('trips.fields.inGarage'),
          in_office: t('trips.fields.inOffice'),
          stamped: t('trips.fields.stamped'),
          garage_received_by: t('trips.fields.garageReceivedBy'),
          garage_date: t('trips.fields.garageDate'),
          office_received_by: t('trips.fields.officeReceivedBy'),
          office_date: t('trips.fields.officeDate'),
          total_trips: t('trips.stats.totalTrips'),
          total_volume: t('trips.stats.totalVolume'),
          total_distance: t('trips.stats.totalDistance'),
          total_fees: t('trips.stats.totalFees'),
          stamped_count: t('trips.stats.stamped'),
          totals: t('trips.export.totals'),
          yes: t('common.yes'),
          no: t('common.no'),
        },
      });
      saveAs(blob, filename);
    } catch (err) {
      // A 404 means the filters matched nothing -- say that rather than
      // reporting a failure, because nothing actually went wrong.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        toast.error(t('trips.export.empty'));
      } else {
        toast.error(extractErrorMessage(err, t('trips.export.failed')));
      }
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
  // What the badge on the phone's Filters button counts: only the filters that
  // toggle actually hides.
  const refinementCount = [receiptStatus, missingData].filter(Boolean).length;

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
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Download />
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
          <Loader2 className="animate-spin motion-reduce:animate-none" />
        ) : (
          <FileSpreadsheet />
        )}
        <span className="hidden sm:inline">
          {t('trips.actions.watanyaReport')}
        </span>
      </Button>
      <Button
        onClick={() => navigate('/trips/new')}
        size="sm"
        {...intentProps(() => warmTripForm(queryClient))}
      >
        <Plus />
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
          <TabsTrigger
            value="statistics"
            className="gap-1.5"
            {...intentProps(() => prefetchTripStatistics(queryClient, statisticsFilters))}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {t('trips.tabs.statistics')}
          </TabsTrigger>
        </TabsList>

        {/* Dates + company come from the global scope bar in the header. */}
        <div className="mt-3 space-y-2">
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 gap-1.5 sm:hidden"
                    aria-expanded={showMoreFilters}
                    onClick={() => setShowMoreFilters((v) => !v)}
                  >
                    <SlidersHorizontal />
                    {t('common.filters')}
                    {refinementCount > 0 && (
                      <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {refinementCount}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
              {/* Receipt status and missing-data are refinements, not the
                  primary filter, so on a phone they sit behind a toggle. They
                  cost ~150px of a 812px screen and pushed the first trip below
                  the fold. Always visible from sm up. */}
              <div
                className={cn(
                  'flex-wrap items-center gap-2',
                  showMoreFilters ? 'flex' : 'hidden sm:flex',
                )}
              >
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
                    <FilterX />
                    {t('common.clear')}
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  {t('trips.showingCount', { shown: trips.length, total })}
                </span>
              </div>
            </>
          )}

        </div>

        <TabsContent value="list" className="mt-3 md:mt-4">
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
                  <Button
                    onClick={() => navigate('/trips/new')}
                    {...intentProps(() => warmTripForm(queryClient))}
                  >
                    <Plus />
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
                // The warm mirrors the LIVE filters plus the intended page, so
                // the click renders from cache instead of a spinner.
                onIntendPage={(p) => prefetchTrips(queryClient, { ...listParams, page: p })}
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
