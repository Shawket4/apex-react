import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  ClipboardCheck,
  Filter,
  Loader2,
  Radar,
  SearchCheck,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { NativeSelect } from '@/shared/ui/native-select';
import { SearchInput } from '@/shared/ui/search-input';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { EmptyState } from '@/shared/ui/empty-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { cn } from '@/shared/lib/cn';
import { formatNumber, localToday, toDateOnly } from '@/shared/lib/format';
import { formatCairoDateTime } from '@/shared/lib/cairo';
import {
  useRunScan,
  useTripAuditRuns,
  useTripAuditSummary,
  useTripMatches,
} from '@/entities/trip-audit/queries';
import type { TripMatchSort } from '@/entities/trip-audit/api';
import {
  TRIP_MATCH_STATUSES,
  type TripAuditSummary,
  type TripMatch,
  type TripMatchStatus,
} from '@/entities/trip-audit/schemas';
import { useCompanies } from '@/entities/mapping/queries';
import { TripAuditQueue } from '@/widgets/trip-audit-queue';
import { TripAuditDetailDialog } from '@/widgets/trip-audit-detail-dialog';
import { TripsCompanyFilter } from '@/widgets/trips-table/trips-filters';
import { TripsPagination } from '@/widgets/trips-table/trips-pagination';
import {
  AUDIT_STORAGE_KEY_LIMIT,
  defaultAuditRange,
  loadStoredAuditLimit,
} from '@/entities/trip-audit/defaults';

/* -------------------------------------------------------------------------- */
/* Constants + date helpers                                                    */
/* -------------------------------------------------------------------------- */

/* Limit + range defaults live in entities/trip-audit/defaults.ts, shared with
   the sidebar's data warmer so the warmed keys can't drift from the mount. */

/** Yesterday's local calendar day as 'YYYY-MM-DD' — the default scan target. */
function yesterdayKey(): string {
  const today = localToday();
  return toDateOnly(new Date(new Date(today.y, today.m, today.d).getTime() - 86_400_000));
}



/* -------------------------------------------------------------------------- */
/* Views                                                                       */
/*                                                                             */
/* The page has exactly one job — "review what needs attention" — so instead   */
/* of a wall of filter chips there are three views behind one segmented        */
/* control. "Needs review" is the default and THE call to action.              */
/* -------------------------------------------------------------------------- */

type QueueView = 'needs_review' | 'all' | 'unmatched';

const VIEWS: QueueView[] = ['needs_review', 'all', 'unmatched'];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function TripAuditPage() {
  const { t, i18n } = useTranslation();

  /* ---- View + filters ---- */
  const [view, setView] = React.useState<QueueView>('needs_review');

  const initialRange = React.useRef(defaultAuditRange());
  const [from, setFrom] = React.useState<string | null>(initialRange.current.from);
  const [to, setTo] = React.useState<string | null>(initialRange.current.to);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [company, setCompany] = React.useState('');
  const [status, setStatus] = React.useState<TripMatchStatus | ''>('');
  // null = each view's natural order (severity for the queue, date elsewhere).
  const [sortOverride, setSortOverride] = React.useState<TripMatchSort | null>(null);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<number>(loadStoredAuditLimit);

  const effectiveSort: TripMatchSort =
    sortOverride ?? (view === 'needs_review' ? 'severity' : 'date');

  // Any filter change restarts from the first page.
  React.useEffect(() => {
    setPage(1);
  }, [view, debouncedSearch, company, from, to, status, sortOverride]);

  React.useEffect(() => {
    window.localStorage.setItem(AUDIT_STORAGE_KEY_LIMIT, String(limit));
  }, [limit]);

  const fromDay = from ? toDateOnly(from) : undefined;
  const toDay = to ? toDateOnly(to) : undefined;
  const companyFilter = company.trim() || undefined;
  const q = debouncedSearch.trim() || undefined;

  const filters = React.useMemo(
    () => ({
      from: fromDay,
      to: toDay,
      q,
      company: companyFilter,
      status: (view === 'unmatched' ? 'unmatched' : view === 'all' ? status : '') as
        | TripMatchStatus
        | '',
      flagged: view === 'needs_review',
      unreviewed: view === 'needs_review',
      sort: effectiveSort,
      page,
      per_page: limit,
    }),
    [fromDay, toDay, q, companyFilter, view, status, effectiveSort, page, limit],
  );

  const matchesQuery = useTripMatches(filters);
  const matchesPage = matchesQuery.data;
  const matches = matchesPage?.items ?? [];
  const total = matchesPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  /* ---- Whole-window KPIs (exact — dedicated aggregate endpoint) ---- */
  const summaryQuery = useTripAuditSummary({
    from: fromDay,
    to: toDay,
    company: companyFilter,
  });
  const summary = summaryQuery.data ?? null;
  const needsReviewCount = summary?.flagged_unreviewed ?? null;

  /* ---- Company dropdown — same source as the trips module ---- */
  const { data: companiesResp } = useCompanies();
  const companies = companiesResp?.data ?? [];

  /* ---- Scan runs ---- */
  const runsQuery = useTripAuditRuns();
  const lastRun = React.useMemo(() => {
    const runs = runsQuery.data ?? [];
    if (runs.length === 0) return null;
    return [...runs].sort((a, b) =>
      (b.started_at ?? '').localeCompare(a.started_at ?? ''),
    )[0];
  }, [runsQuery.data]);

  const runScan = useRunScan();
  const handleRunScan = () => {
    runScan.mutate([yesterdayKey()]);
  };

  /* ---- Detail dialog ---- */
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const handleOpen = (match: TripMatch) => setSelectedId(match.id);

  /* ---- Secondary filters (behind the Filters button) ---- */
  const dateChanged =
    from !== initialRange.current.from || to !== initialRange.current.to;
  const activeFilterCount =
    (dateChanged ? 1 : 0) + (view === 'all' && status ? 1 : 0) + (sortOverride ? 1 : 0);

  const resetSecondaryFilters = () => {
    setFrom(initialRange.current.from);
    setTo(initialRange.current.to);
    setStatus('');
    setSortOverride(null);
  };

  const startReview = () => {
    setView('needs_review');
    setSearch('');
    setStatus('');
    setSortOverride(null);
  };

  const viewLabel = (v: QueueView): string => {
    switch (v) {
      case 'needs_review':
        return t('tripAudit.views.needsReview', 'Needs review');
      case 'all':
        return t('tripAudit.views.all', 'All trips');
      case 'unmatched':
        return t('tripAudit.views.unmatched', 'Unmatched');
    }
  };

  return (
    <PageShell
      title={t('tripAudit.title', 'Trip Audit')}
      description={t(
        'tripAudit.description',
        'Review GPS-audited trips — actual routes vs the OSRM optimal — and the flags raised.',
      )}
      icon={<SearchCheck className="h-5 w-5" />}
      actions={
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScan}
            disabled={runScan.isPending}
            className="gap-2"
          >
            {runScan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radar className="h-4 w-4" />
            )}
            {t('tripAudit.scan.run', 'Run scan')}
          </Button>
          <p className="text-xs text-muted-foreground">
            {lastRun ? (
              <>
                {t('tripAudit.scan.last', 'Last scan')}:{' '}
                <span className={cn(lastRun.error && 'text-destructive')}>
                  {lastRun.status || '—'}
                </span>
                {lastRun.started_at && (
                  <> · {formatCairoDateTime(lastRun.started_at, i18n.language)}</>
                )}
              </>
            ) : (
              t('tripAudit.scan.none', 'No scans yet')
            )}
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 1. KPI strip — flagged_unreviewed is THE number */}
        <KpiStrip
          summary={summary}
          loading={summaryQuery.isLoading}
          reviewing={view === 'needs_review'}
          onStartReview={startReview}
        />

        {/* 2. One prominent segmented control + quiet secondary filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as QueueView)}>
              <TabsList>
                {VIEWS.map((v) => (
                  <TabsTrigger key={v} value={v} className="gap-1.5">
                    {viewLabel(v)}
                    {v === 'needs_review' && needsReviewCount != null && (
                      <span
                        className={cn(
                          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                          needsReviewCount > 0
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-success/15 text-success',
                        )}
                      >
                        {formatNumber(needsReviewCount)}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={t(
                  'tripAudit.filters.searchPlaceholder',
                  'Search plate, driver or terminal…',
                )}
                className="min-w-[180px] max-w-xs"
              />
              <TripsCompanyFilter
                value={company}
                onChange={setCompany}
                companies={companies}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={activeFilterCount > 0 ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 gap-1.5"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {t('tripAudit.filters.more', 'Filters')}
                    </span>
                    {activeFilterCount > 0 && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] font-semibold text-primary">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[340px] space-y-4 p-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('tripAudit.filters.dateRange', 'Date range')}
                    </p>
                    <DateRangePicker
                      from={from}
                      to={to}
                      onChange={(f, tt) => {
                        setFrom(f);
                        setTo(tt);
                      }}
                    />
                  </div>
                  {view === 'all' && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('tripAudit.filters.status', 'Status')}
                      </p>
                      <NativeSelect
                        value={status}
                        onChange={(e) => setStatus(e.target.value as TripMatchStatus | '')}
                        aria-label={t('tripAudit.filters.status', 'Status')}
                      >
                        <option value="">
                          {t('tripAudit.filters.allStatuses', 'All statuses')}
                        </option>
                        {TRIP_MATCH_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`tripAudit.status.${s}`, s)}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('tripAudit.filters.sort', 'Sort')}
                    </p>
                    <NativeSelect
                      value={effectiveSort}
                      onChange={(e) => setSortOverride(e.target.value as TripMatchSort)}
                      aria-label={t('tripAudit.filters.sort', 'Sort')}
                    >
                      <option value="severity">
                        {t('tripAudit.filters.sortSeverity', 'Worst first')}
                      </option>
                      <option value="date">
                        {t('tripAudit.filters.sortDate', 'Newest first')}
                      </option>
                    </NativeSelect>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={resetSecondaryFilters}
                    >
                      {t('common.clearFilters', 'Clear filters')}
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* 3. The queue */}
        {matchesQuery.isError ? (
          <EmptyState
            title={t('errors.generic', 'Something went wrong')}
            action={
              <Button variant="outline" onClick={() => void matchesQuery.refetch()}>
                {t('common.retry', 'Retry')}
              </Button>
            }
          />
        ) : (
          <TripAuditQueue
            matches={matches}
            loading={matchesQuery.isLoading || matchesQuery.isPlaceholderData}
            onOpen={handleOpen}
            empty={
              view === 'needs_review' && !q && !companyFilter ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-6 w-6 text-success" />}
                  title={t('tripAudit.queue.caughtUp', 'All caught up')}
                  description={t(
                    'tripAudit.queue.caughtUpDesc',
                    'No flagged trips are awaiting review in this range.',
                  )}
                  action={
                    <Button variant="outline" onClick={() => setView('all')}>
                      {t('tripAudit.queue.browseAll', 'Browse all trips')}
                    </Button>
                  }
                />
              ) : undefined
            }
          />
        )}

        {/* 4. Server-side pagination — same strip as the trips module */}
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
          loading={matchesQuery.isPlaceholderData}
        />
      </div>

      <TripAuditDetailDialog
        matchId={selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* KPI strip                                                                   */
/*                                                                             */
/* One hero number — flagged trips awaiting review — with the page's single    */
/* call to action, plus three quiet context tiles. One accent color total.     */
/* -------------------------------------------------------------------------- */

function KpiStrip({
  summary,
  loading,
  reviewing,
  onStartReview,
}: {
  summary: TripAuditSummary | null;
  loading?: boolean;
  /** True while the queue view is already "needs review" — the CTA then reads as a scroll cue, not a switch. */
  reviewing?: boolean;
  onStartReview: () => void;
}) {
  const { t } = useTranslation();
  const pending = summary?.flagged_unreviewed ?? null;
  const allClear = pending != null && pending === 0;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
      {/* Hero — THE number */}
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border p-4 sm:col-span-2 lg:col-span-1',
          allClear
            ? 'border-success/30 bg-success/5'
            : 'border-primary/30 bg-primary/5',
        )}
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {t('tripAudit.kpi.needsReview', 'Awaiting review')}
          </p>
          <p
            className={cn(
              'mt-0.5 text-3xl font-bold tabular-nums leading-tight',
              allClear ? 'text-success' : 'text-primary',
            )}
          >
            {pending != null ? formatNumber(pending) : loading ? '…' : '—'}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {allClear
              ? t('tripAudit.kpi.allClearSub', 'nothing needs your attention')
              : t('tripAudit.kpi.needsReviewSub', 'flagged trips need a decision')}
          </p>
        </div>
        {!allClear && pending != null && (
          <Button size="sm" className="shrink-0 gap-1.5" onClick={onStartReview}>
            <ClipboardCheck className="h-4 w-4" />
            {reviewing
              ? t('tripAudit.kpi.reviewing', 'Reviewing')
              : t('tripAudit.kpi.startReview', 'Start review')}
          </Button>
        )}
      </div>

      <KpiTile
        label={t('tripAudit.kpi.flagged', 'Flagged trips')}
        value={summary ? formatNumber(summary.flagged) : loading ? '…' : '—'}
        sub={
          summary
            ? t('tripAudit.kpi.flaggedSub', {
                total: formatNumber(summary.total),
                critical: formatNumber(summary.critical),
                defaultValue: 'of {{total}} trips · {{critical}} critical',
              })
            : undefined
        }
      />
      <KpiTile
        label={t('tripAudit.kpi.efficiency', 'Route efficiency')}
        value={
          summary?.efficiency_pct != null
            ? `${formatNumber(summary.efficiency_pct, 1)}%`
            : loading
              ? '…'
              : '—'
        }
        sub={t('tripAudit.kpi.efficiencySub', 'optimal km ÷ driven km')}
      />
      <KpiTile
        label={t('tripAudit.kpi.excessKm', 'Excess distance')}
        value={
          summary
            ? t('tripAudit.kpi.excessKmValue', {
                km: formatNumber(summary.excess_km),
                defaultValue: '+{{km}} km',
              })
            : loading
              ? '…'
              : '—'
        }
        sub={t('tripAudit.kpi.excessKmSub', 'driven over optimal in this window')}
      />
    </div>
  );
}

/** Quiet context tile — neutral foreground number, muted label. */
function KpiTile({
  label,
  value,
  sub,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 truncate text-xl font-semibold tabular-nums">{value}</div>
      {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
