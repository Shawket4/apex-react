import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Radar,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { NativeSelect } from '@/shared/ui/native-select';
import { SearchInput } from '@/shared/ui/search-input';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { cn } from '@/shared/lib/cn';
import { formatNumber, localDateISO, localToday, toDateOnly } from '@/shared/lib/format';
import { formatCairoDateTime } from '@/shared/lib/cairo';
import {
  useRunScan,
  useTripAuditRuns,
  useTripAuditSummary,
  useTripMatches,
} from '@/entities/trip-audit/queries';
import {
  TRIP_MATCH_STATUSES,
  type TripAuditSummary,
  type TripMatch,
  type TripMatchStatus,
} from '@/entities/trip-audit/schemas';
import { TripAuditQueue } from '@/widgets/trip-audit-queue';
import { TripAuditDetailDialog } from '@/widgets/trip-audit-detail-dialog';

const PAGE_SIZE = 25;

/* -------------------------------------------------------------------------- */
/* Date helpers                                                                */
/* -------------------------------------------------------------------------- */

/** Default range: last 7 days (inclusive of today), as ISO instants for the picker. */
function defaultRange(): { from: string; to: string } {
  const today = localToday();
  const startMs = new Date(today.y, today.m, today.d).getTime() - 7 * 86_400_000;
  const start = new Date(startMs);
  return {
    from: localDateISO(start.getFullYear(), start.getMonth(), start.getDate()),
    to: localDateISO(today.y, today.m, today.d, true),
  };
}

/** Yesterday's local calendar day as 'YYYY-MM-DD' — the default scan target. */
function yesterdayKey(): string {
  const today = localToday();
  return toDateOnly(new Date(new Date(today.y, today.m, today.d).getTime() - 86_400_000));
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Trip Audit — a review queue. Defaults to the trips that actually need
 * eyes (flagged, unreviewed, worst first); KPIs come from the whole-window
 * aggregate endpoint so they are exact regardless of pagination.
 */
export default function TripAuditPage() {
  const { t, i18n } = useTranslation();

  /* ---- Filters — queue defaults: flagged, unreviewed, severity-first ---- */
  const initialRange = React.useRef(defaultRange());
  const [from, setFrom] = React.useState<string | null>(initialRange.current.from);
  const [to, setTo] = React.useState<string | null>(initialRange.current.to);
  const [status, setStatus] = React.useState<TripMatchStatus | ''>('');
  const [company, setCompany] = React.useState('');
  const debouncedCompany = useDebounce(company, 300);
  const [flaggedOnly, setFlaggedOnly] = React.useState(true);
  const [unreviewedOnly, setUnreviewedOnly] = React.useState(true);
  const [sortBySeverity, setSortBySeverity] = React.useState(true);
  const [page, setPage] = React.useState(1);

  // Any filter change restarts from the first page.
  React.useEffect(() => {
    setPage(1);
  }, [from, to, status, debouncedCompany, flaggedOnly, unreviewedOnly, sortBySeverity]);

  const fromDay = from ? toDateOnly(from) : undefined;
  const toDay = to ? toDateOnly(to) : undefined;
  const companyFilter = debouncedCompany.trim() || undefined;

  const filters = React.useMemo(
    () => ({
      from: fromDay,
      to: toDay,
      status,
      company: companyFilter,
      flagged: flaggedOnly,
      unreviewed: unreviewedOnly,
      sort: (sortBySeverity ? 'severity' : 'date') as 'severity' | 'date',
      page,
      per_page: PAGE_SIZE,
    }),
    [fromDay, toDay, status, companyFilter, flaggedOnly, unreviewedOnly, sortBySeverity, page],
  );

  const matchesQuery = useTripMatches(filters);
  const matchesPage = matchesQuery.data;
  const matches = matchesPage?.items ?? [];
  const total = matchesPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ---- Whole-window KPIs (exact — dedicated aggregate endpoint) ---- */
  const summaryQuery = useTripAuditSummary({
    from: fromDay,
    to: toDay,
    company: companyFilter,
  });

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

  return (
    <PageShell
      title={t('tripAudit.title', 'Trip Audit')}
      description={t(
        'tripAudit.description',
        'Review GPS-audited trips — actual routes vs the OSRM optimal — and the flags raised.',
      )}
      actions={
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
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
                {lastRun.error && (
                  <span className="text-destructive"> · {lastRun.error}</span>
                )}
              </>
            ) : (
              t('tripAudit.scan.none', 'No scans yet')
            )}
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        {/* KPI strip — whole filter window */}
        <KpiStrip summary={summaryQuery.data ?? null} loading={summaryQuery.isLoading} />

        {/* Filters */}
        <div className="space-y-3">
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, tt) => {
              setFrom(f);
              setTo(tt);
            }}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={company}
              onChange={setCompany}
              placeholder={t('tripAudit.filters.companyPlaceholder', 'Filter by company…')}
              className="sm:max-w-xs"
            />
            <NativeSelect
              value={status}
              onChange={(e) => setStatus(e.target.value as TripMatchStatus | '')}
              className="sm:w-44"
              aria-label={t('tripAudit.filters.status', 'Status')}
            >
              <option value="">{t('tripAudit.filters.allStatuses', 'All statuses')}</option>
              {TRIP_MATCH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`tripAudit.status.${s}`, s)}
                </option>
              ))}
            </NativeSelect>
            {/* Queue chips — widen the default queue view */}
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip
                active={flaggedOnly}
                onClick={() => setFlaggedOnly((v) => !v)}
                label={t('tripAudit.filters.flaggedOnly', 'Flagged only')}
              />
              <FilterChip
                active={unreviewedOnly}
                onClick={() => setUnreviewedOnly((v) => !v)}
                label={t('tripAudit.filters.unreviewedOnly', 'Unreviewed only')}
              />
              <FilterChip
                active={sortBySeverity}
                onClick={() => setSortBySeverity((v) => !v)}
                label={
                  sortBySeverity
                    ? t('tripAudit.filters.sortSeverity', 'Worst first')
                    : t('tripAudit.filters.sortDate', 'Newest first')
                }
              />
            </div>
          </div>
        </div>

        {/* Queue */}
        <TripAuditQueue
          matches={matches}
          loading={matchesQuery.isLoading || matchesQuery.isPlaceholderData}
          onOpen={handleOpen}
        />

        {/* Server-side pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="tabular-nums">
              {t('tripAudit.queue.pageOf', {
                page,
                pages: totalPages,
                total,
                defaultValue: 'Page {{page}} of {{pages}} · {{total}} trips',
              })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || matchesQuery.isPlaceholderData}
                aria-label={t('common.previous', 'Previous')}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || matchesQuery.isPlaceholderData}
                aria-label={t('common.next', 'Next')}
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        )}
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
/* Filter chip                                                                 */
/* -------------------------------------------------------------------------- */

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* KPI strip                                                                   */
/* -------------------------------------------------------------------------- */

function KpiStrip({
  summary,
  loading,
}: {
  summary: TripAuditSummary | null;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const worst = summary?.worst_routes[0] ?? null;

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
      <KpiCard
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
        tone={summary && summary.critical > 0 ? 'destructive' : 'warning'}
      />
      <KpiCard
        label={t('tripAudit.kpi.unreviewed', 'Unreviewed')}
        value={summary ? formatNumber(summary.flagged_unreviewed) : loading ? '…' : '—'}
        sub={t('tripAudit.kpi.unreviewedSub', 'flagged trips awaiting review')}
        tone={summary && summary.flagged_unreviewed > 0 ? 'warning' : 'success'}
      />
      <KpiCard
        label={t('tripAudit.kpi.efficiency', 'Route efficiency')}
        value={
          summary?.efficiency_pct != null
            ? `${formatNumber(summary.efficiency_pct, 1)}%`
            : loading
              ? '…'
              : '—'
        }
        sub={t('tripAudit.kpi.efficiencySub', 'optimal km ÷ driven km')}
        tone={
          summary?.efficiency_pct == null
            ? undefined
            : summary.efficiency_pct >= 83
              ? 'success'
              : summary.efficiency_pct >= 66
                ? 'warning'
                : 'destructive'
        }
      />
      <KpiCard
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
        tone={summary && summary.excess_km > 0 ? 'warning' : 'success'}
      />
      <KpiCard
        label={t('tripAudit.kpi.worstRoute', 'Worst route')}
        value={
          worst ? (
            <span className="truncate text-base" dir="auto" title={worst.terminal_name}>
              {worst.destinations
                ? `${worst.terminal_name} ← ${worst.destinations}`
                : worst.terminal_name || '—'}
            </span>
          ) : loading ? (
            '…'
          ) : (
            '—'
          )
        }
        sub={
          worst
            ? t('tripAudit.kpi.worstRouteSub', {
                km: formatNumber(worst.excess_km),
                trips: worst.trips,
                defaultValue: '+{{km}} km over {{trips}} trips',
              })
            : undefined
        }
        tone={worst ? 'destructive' : undefined}
        className="col-span-2 lg:col-span-1"
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'success' | 'warning' | 'destructive';
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-3', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className={cn(
          'mt-0.5 truncate text-xl font-semibold tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {value}
      </div>
      {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
