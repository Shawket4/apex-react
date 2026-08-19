import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Radar } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { NativeSelect } from '@/shared/ui/native-select';
import { SearchInput } from '@/shared/ui/search-input';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { cn } from '@/shared/lib/cn';
import { localDateISO, localToday, toDateOnly } from '@/shared/lib/format';
import { formatCairoDateTime } from '@/shared/lib/cairo';
import {
  useRunScan,
  useTripAuditRuns,
  useTripMatches,
} from '@/entities/trip-audit/queries';
import {
  TRIP_MATCH_STATUSES,
  type TripMatch,
  type TripMatchStatus,
} from '@/entities/trip-audit/schemas';
import { TripAuditMatchesTable } from '@/widgets/trip-audit-matches-table';
import { TripAuditDetailDialog } from '@/widgets/trip-audit-detail-dialog';

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
 * Trip Audit — fleet managers review GPS-audited trips (actual route vs the
 * OSRM optimal) and the flags raised. Data comes from the etit-proxy
 * trip-audit endpoints.
 */
export default function TripAuditPage() {
  const { t, i18n } = useTranslation();

  /* ---- Filters ---- */
  const initialRange = React.useRef(defaultRange());
  const [from, setFrom] = React.useState<string | null>(initialRange.current.from);
  const [to, setTo] = React.useState<string | null>(initialRange.current.to);
  const [status, setStatus] = React.useState<TripMatchStatus | ''>('');
  const [company, setCompany] = React.useState('');
  const debouncedCompany = useDebounce(company, 300);
  const [flaggedOnly, setFlaggedOnly] = React.useState(false);

  const filters = React.useMemo(
    () => ({
      from: from ? toDateOnly(from) : undefined,
      to: to ? toDateOnly(to) : undefined,
      status,
      company: debouncedCompany.trim() || undefined,
      flagged: flaggedOnly,
    }),
    [from, to, status, debouncedCompany, flaggedOnly],
  );

  const matchesQuery = useTripMatches(filters);
  const matches = matchesQuery.data ?? [];

  /* ---- Summary chips (computed from loaded rows) ---- */
  const summary = React.useMemo(() => {
    let matched = 0;
    let partial = 0;
    let unmatched = 0;
    let flagged = 0;
    for (const m of matches) {
      if (m.status === 'matched') matched += 1;
      else if (m.status === 'partial') partial += 1;
      else unmatched += 1;
      if (m.flag_count > 0) flagged += 1;
    }
    return { total: matches.length, matched, partial, unmatched, flagged };
  }, [matches]);

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
  const handleRowClick = (match: TripMatch) => setSelectedId(match.id);

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            <div className="flex items-center gap-2">
              <Switch
                id="flagged-only"
                checked={flaggedOnly}
                onCheckedChange={setFlaggedOnly}
              />
              <Label htmlFor="flagged-only" className="cursor-pointer text-sm">
                {t('tripAudit.filters.flaggedOnly', 'Flagged only')}
              </Label>
            </div>
          </div>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <SummaryChip label={t('tripAudit.summary.total', 'Total')} value={summary.total} />
          <SummaryChip
            label={t('tripAudit.summary.matched', 'Matched')}
            value={summary.matched}
            tone="success"
          />
          <SummaryChip
            label={t('tripAudit.summary.partial', 'Partial')}
            value={summary.partial}
            tone="warning"
          />
          <SummaryChip
            label={t('tripAudit.summary.unmatched', 'Unmatched')}
            value={summary.unmatched}
            tone="destructive"
          />
          <SummaryChip
            label={t('tripAudit.summary.flagged', 'Flagged')}
            value={summary.flagged}
            tone="warning"
          />
        </div>

        {/* Matches */}
        <TripAuditMatchesTable
          matches={matches}
          loading={matchesQuery.isLoading}
          onRowClick={handleRowClick}
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
/* Summary chip                                                                */
/* -------------------------------------------------------------------------- */

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: number;
  tone?: 'success' | 'warning' | 'destructive';
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  );
}
