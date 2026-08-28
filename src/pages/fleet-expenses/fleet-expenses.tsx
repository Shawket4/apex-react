import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { intentProps, preloadChunk, warmLedgerForm } from '@/shared/lib/prefetch';
import { prefetchMessagesFirstPage } from '@/entities/raw-message/queries';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import {
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Fuel,
  HandCoins,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { StatCard } from '@/shared/ui/stat-card';
import { ChartCard } from '@/shared/ui/chart-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';
import { NativeSelect } from '@/shared/ui/native-select';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { cn } from '@/shared/lib/cn';
import { formatMoney, addMoneyStrings } from '@/shared/lib/money';
import { localParts } from '@/shared/lib/format';
import {
  cairoDayRange,
  cairoInstant,
  cairoMonthRange,
  cairoParts,
  cairoToday,
  cairoYearRange,
  formatCairoDate,
  formatCairoDayShort,
  formatCairoMonth,
} from '@/shared/lib/cairo';
import { themedTooltipProps, themedAxisTickProps } from '@/shared/lib/chart-theme';
import { formatCompactNumber } from '@/shared/lib/format-number';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { defaultLedgerRange } from '@/entities/transaction/defaults';
import { usePermissions } from '@/shared/hooks/use-permissions';

import {
  useExportTransactions,
  useTransactionsPaged,
  useTransactionStatistics,
} from '@/entities/transaction/queries';
import {
  COMPANIES,
  PAYMENT_METHODS,
  TRANSACTION_SOURCES,
  type ByCategory,
  type ByDate,
  type TransactionFilters,
} from '@/entities/transaction/schemas';
import { categoryLabel, useCategories } from '@/entities/transaction/categories';
import { LedgerList } from '@/widgets/fleet-expenses-table/ledger-list';
import { CashInReview } from '@/widgets/fleet-expenses-table/cash-in-review';

/* -------------------------------------------------------------------------- */
/* Range presets — all boundaries are CAIRO calendar days (D6)                 */
/* -------------------------------------------------------------------------- */

type PresetKey = 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'all' | 'custom';

function presetRange(key: Exclude<PresetKey, 'custom'>): [string | null, string | null] {
  const today = cairoToday();
  switch (key) {
    case 'thisMonth':
      return cairoMonthRange(today.y, today.m);
    case 'lastMonth':
      return cairoMonthRange(today.y, today.m - 1);
    case 'last3Months': {
      const [from] = cairoMonthRange(today.y, today.m - 2);
      const [, to] = cairoMonthRange(today.y, today.m);
      return [from, to];
    }
    case 'thisYear':
      return cairoYearRange(today.y);
    case 'all':
      return [null, null];
  }
}

const PRESET_OPTIONS: Array<Exclude<PresetKey, 'custom'>> = [
  'thisMonth',
  'lastMonth',
  'last3Months',
  'thisYear',
  'all',
];

const ALL = '__all__';

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function FleetExpensesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { canManageExpenses } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  /* ── Range: month picker by default, presets + custom as the escape hatch.
        from/to URL params stay honored so shared links keep working. ── */
  const defaultRange = React.useMemo(() => defaultLedgerRange(), []);

  const [range, setRange] = React.useState<{ from: string | null; to: string | null }>(() => {
    if (searchParams.get('range') === 'all') return { from: null, to: null };
    return {
      from: searchParams.get('from') ?? defaultRange[0],
      to: searchParams.get('to') ?? defaultRange[1],
    };
  });

  const [category, setCategory] = React.useState(() => searchParams.get('category') ?? '');
  const [company, setCompany] = React.useState(() => searchParams.get('company') ?? ALL);
  const [paymentMethod, setPaymentMethod] = React.useState(
    () => searchParams.get('payment_method') ?? ALL,
  );
  const [source, setSource] = React.useState(() => searchParams.get('source') ?? ALL);
  const [search, setSearch] = React.useState(() => searchParams.get('q') ?? '');
  const [includeFuel, setIncludeFuel] = React.useState(
    () => searchParams.get('include_fuel') !== 'false',
  );
  const [includeLoans, setIncludeLoans] = React.useState(
    () => searchParams.get('include_loans') !== 'false',
  );
  /** The uncategorized-tile filter — a client-side view over loaded rows,
   *  since the wire contract has no server filter for a null category. */
  const [uncatOnly, setUncatOnly] = React.useState(() => searchParams.get('uncat') === '1');
  const [customMode, setCustomMode] = React.useState(false);
  /** The cash-in review pocket — sheet on phones, inline section on desktop. */
  const [cashInOpen, setCashInOpen] = React.useState(false);

  const debouncedSearch = useDebounce(search, 250);

  const filters: TransactionFilters = React.useMemo(
    () => ({
      from: range.from ?? undefined,
      to: range.to ?? undefined,
      category: category || undefined,
      company: company === ALL ? undefined : company,
      payment_method: paymentMethod === ALL ? undefined : paymentMethod,
      source: source === ALL ? undefined : source,
      q: debouncedSearch || undefined,
      include_fuel: includeFuel ? undefined : 'false',
      include_loans: includeLoans ? undefined : 'false',
    }),
    [
      range, category, company, paymentMethod, source, debouncedSearch,
      includeFuel, includeLoans,
    ],
  );

  // Keep the URL shareable — a filtered view can be sent to someone else.
  React.useEffect(() => {
    const next = new URLSearchParams();
    if (range.from && range.to) {
      next.set('from', range.from);
      next.set('to', range.to);
    } else {
      next.set('range', 'all');
    }
    if (category) next.set('category', category);
    if (company !== ALL) next.set('company', company);
    if (paymentMethod !== ALL) next.set('payment_method', paymentMethod);
    if (source !== ALL) next.set('source', source);
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (!includeFuel) next.set('include_fuel', 'false');
    if (!includeLoans) next.set('include_loans', 'false');
    if (uncatOnly) next.set('uncat', '1');
    setSearchParams(next, { replace: true });
  }, [
    range, category, company, paymentMethod, source, debouncedSearch,
    includeFuel, includeLoans, uncatOnly, setSearchParams,
  ]);

  // The LEDGER is cash-out only; incoming transfers live in the review
  // pocket until someone reclassifies or removes them. Statistics keep the
  // base filters — the new wire shape is already out-only and carries the
  // pending_in counter for the pocket badge.
  const listFilters = React.useMemo(
    () => ({ ...filters, direction: 'out' as const }),
    [filters],
  );

  const rowsQuery = useTransactionsPaged(listFilters);
  const statsQuery = useTransactionStatistics(filters);
  const categories = useCategories();
  const exportMutation = useExportTransactions();

  const rows = React.useMemo(
    () => rowsQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [rowsQuery.data],
  );
  const stats = statsQuery.data;

  const visibleRows = React.useMemo(
    () => (uncatOnly ? rows.filter((r) => !r.category) : rows),
    [rows, uncatOnly],
  );

  const dayTotals = React.useMemo(() => {
    const map = new Map<string, ByDate>();
    for (const b of stats?.by_date ?? []) map.set(b.date, b);
    return map;
  }, [stats]);

  const uncatCount = React.useMemo(
    () => (stats?.by_category ?? []).find((b) => b.key === null)?.count ?? 0,
    [stats],
  );

  const pendingIn = stats?.pending_in ?? { count: 0, total: '0' };

  /** Tile placeholder while /statistics is in flight. */
  const statSkeleton = {
    full: <Skeleton className="h-5 w-24" />,
    compact: <Skeleton className="h-5 w-16" />,
  };

  /* ── Which preset is active, and which month the strip shows ── */
  const activePreset: PresetKey = React.useMemo(() => {
    for (const key of PRESET_OPTIONS) {
      const [f, to] = presetRange(key);
      if (f === range.from && to === range.to) return key;
      if (key === 'all' && !range.from && !range.to) return 'all';
    }
    return 'custom';
  }, [range]);

  const stripMonth = React.useMemo(() => {
    if (!range.from) return null;
    const p = cairoParts(range.from);
    const [f, to] = cairoMonthRange(p.y, p.m);
    return f === range.from && to === range.to ? { y: p.y, m: p.m } : null;
  }, [range]);

  const shiftMonth = (delta: number) => {
    const base = stripMonth ?? (range.from ? cairoParts(range.from) : cairoToday());
    const [from, to] = cairoMonthRange(base.y, base.m + delta);
    setRange({ from, to });
    setCustomMode(false);
  };

  const rangeLabel = stripMonth
    ? formatCairoMonth(stripMonth.y, stripMonth.m, i18n.language)
    : !range.from
      ? t('fleetExpenses.range.all')
      : `${formatCairoDate(range.from, i18n.language)} – ${
          range.to ? formatCairoDate(range.to, i18n.language) : ''
        }`;

  /* ── Charts. Numbers below are chart GEOMETRY only (pixels are approximate
        by nature); every figure a human reads goes through formatMoney on the
        original decimal string. ── */
  const dailySeries = React.useMemo(
    () =>
      (stats?.by_date ?? []).map((b) => ({
        /** The Cairo day key itself — ticks and tooltips format the REAL
         *  date from it, never a bare index or day-of-month number. */
        date: b.date,
        value: Number(b.out),
        out: b.out,
        count: b.count,
      })),
    [stats],
  );

  const donut = React.useMemo(() => {
    const accents =
      resolvedTheme === 'dark' ? ['#3987e5', '#d95926'] : ['#2a78d6', '#eb6834'];
    const gray = resolvedTheme === 'dark' ? '#6C7A71' : '#8A968F';

    const categorized = (stats?.by_category ?? [])
      .filter((b): b is ByCategory & { key: string } => b.key !== null && b.out !== '0')
      .sort((a, b) => Number(b.out) - Number(a.out));
    const top = categorized.slice(0, 2);
    const rest = categorized.slice(2);

    const labelOf = (b: ByCategory) =>
      (i18n.language.startsWith('ar') && b.label_ar) || b.label || b.key || '';

    const slices = top.map((b, i) => ({
      name: labelOf(b),
      amount: b.out,
      value: Number(b.out),
      color: accents[i],
    }));
    if (rest.length) {
      const amount = addMoneyStrings(rest.map((r) => r.out));
      slices.push({
        name: t('fleetExpenses.charts.other'),
        amount,
        value: Number(amount),
        color: gray,
      });
    }
    return slices.filter((s) => s.value > 0);
  }, [stats, resolvedTheme, i18n.language, t]);

  const byCategoryList = React.useMemo(() => {
    const list = (stats?.by_category ?? []).slice();
    // Uncategorized last; the rest by spend, biggest first (ordering only).
    return list.sort((a, b) => {
      if (a.key === null) return 1;
      if (b.key === null) return -1;
      return Number(b.out) - Number(a.out);
    });
  }, [stats]);

  const isLoading = rowsQuery.isLoading || statsQuery.isLoading;
  const hasRows = visibleRows.length > 0;

  return (
    <PageShell
      title={t('fleetExpenses.title')}
      description={t('fleetExpenses.subtitle')}
      icon={<Receipt className="h-5 w-5" />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void rowsQuery.refetch();
              void statsQuery.refetch();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
          {/* Server-rendered XLSX over the CURRENT filters — whole set, uncapped. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMutation.mutate(filters)}
            disabled={exportMutation.isPending}
          >
            <Download className={cn('h-4 w-4', exportMutation.isPending && 'animate-pulse')} />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
          {canManageExpenses && (
            <Button
              size="sm"
              onClick={() => navigate('/fleet-expenses/new', { state: { from: 'ledger' } })}
              {...intentProps(() => warmLedgerForm(queryClient))}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('fleetExpenses.addExpense')}</span>
            </Button>
          )}
        </div>
      }
    >
      {/* ── Month strip + range escape hatch ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border bg-card px-1 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => shiftMonth(-1)}
            aria-label={t('fleetExpenses.range.previousMonth')}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <span className="min-w-28 px-1 text-center text-sm font-semibold">{rangeLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => shiftMonth(1)}
            aria-label={t('fleetExpenses.range.nextMonth')}
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>

        <NativeSelect
          className="w-40"
          value={customMode ? 'custom' : activePreset}
          aria-label={t('fleetExpenses.range.label')}
          onChange={(e) => {
            const key = e.target.value as PresetKey;
            if (key === 'custom') {
              setCustomMode(true);
              return;
            }
            setCustomMode(false);
            const [from, to] = presetRange(key);
            setRange({ from, to });
          }}
        >
          {PRESET_OPTIONS.map((key) => (
            <option key={key} value={key}>
              {t(`fleetExpenses.range.${key}`)}
            </option>
          ))}
          <option value="custom">{t('fleetExpenses.range.custom')}</option>
        </NativeSelect>

        {(customMode || activePreset === 'custom') && (
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={(from, to) => {
              // The picker hands back browser-local day boundaries; re-anchor
              // the picked calendar days to CAIRO before they hit the API.
              const f = from ? localParts(from) : null;
              const tp = to ? localParts(to) : null;
              setRange({
                from: f ? cairoInstant(f.y, f.m, f.d) : null,
                to: tp ? cairoDayRange(tp.y, tp.m, tp.d)[1] : null,
              });
            }}
          />
        )}
      </div>

      {/* ── Summary strip — cash-out only; inflows never make a tile ─────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          label={t('fleetExpenses.stats.spent')}
          value={
            statsQuery.isLoading
              ? statSkeleton
              : {
                  full: `${formatMoney(stats?.total_out)} EGP`,
                  // Compact tile figure only — approximate by design. No
                  // currency suffix: it truncates inside a narrow tile.
                  compact: formatCompactNumber(Number(stats?.total_out ?? 0)),
                }
          }
          subvalue={t('fleetExpenses.stats.records', { count: stats?.count ?? 0 })}
          icon={TrendingDown}
          tone="primary"
        />
        <StatCard
          label={t('fleetExpenses.stats.fees')}
          value={
            statsQuery.isLoading
              ? statSkeleton
              : {
                  full: `${formatMoney(stats?.total_fees)} EGP`,
                  compact: formatCompactNumber(Number(stats?.total_fees ?? 0)),
                }
          }
          subvalue={t('fleetExpenses.stats.feesHint')}
          icon={Wallet}
        />
        {/* The uncategorized tile IS the filter — one tap turns the backlog
            into a workable queue. */}
        <button
          type="button"
          onClick={() => {
            // The uncategorized view and a category chip are mutually
            // exclusive — combining them is always an empty list.
            setUncatOnly((v) => !v);
            setCategory('');
          }}
          className={cn(
            'col-span-2 rounded-xl text-start outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring lg:col-span-1',
            uncatOnly && 'ring-2 ring-warning',
          )}
          aria-pressed={uncatOnly}
        >
          <StatCard
            label={t('fleetExpenses.stats.uncategorized')}
            value={t('fleetExpenses.stats.rowsArrow', { count: uncatCount })}
            subvalue={
              uncatOnly
                ? t('fleetExpenses.stats.showingUncategorized')
                : t('fleetExpenses.stats.tapToFilter')
            }
            icon={Receipt}
            tone={uncatCount > 0 ? 'warning' : 'default'}
            className="h-full"
          />
        </button>
      </div>

      {/* ── Cash in — needs review. A quiet amber pocket that only exists
            while there is something in it. ─────────────────────────────────── */}
      {pendingIn.count > 0 && (
        <button
          type="button"
          onClick={() => setCashInOpen((v) => !v)}
          aria-expanded={cashInOpen}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-start outline-none transition-colors hover:bg-warning/15 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowDownLeft className="h-4 w-4 shrink-0 text-warning" />
          <span className="min-w-0 flex-1 text-sm font-medium">
            {t('fleetExpenses.cashIn.strip', { count: pendingIn.count })}
            <span className="ms-2 tabular-nums text-muted-foreground" dir="ltr">
              + {formatMoney(pendingIn.total)} EGP
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
        </button>
      )}
      <CashInReview
        open={cashInOpen}
        onOpenChange={setCashInOpen}
        filters={filters}
        canEdit={canManageExpenses}
      />

      {/* ── Charts (D10: daily spend + category donut survive) ───────────── */}
      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-60 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      )}
      {!isLoading && stats && stats.count > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title={t('fleetExpenses.charts.daily')}
            description={t('fleetExpenses.charts.dailyHint')}
            className="lg:col-span-2"
            height={240}
            padded={false}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="dailySpendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                {/* Real short dates on the axis — "9 Aug" (locale-aware), not
                    a 1, 2, 3… index. minTickGap thins them on narrow phones. */}
                <XAxis
                  dataKey="date"
                  tick={themedAxisTickProps}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tickFormatter={(d: string) => formatCairoDayShort(d, i18n.language)}
                />
                <YAxis
                  tick={themedAxisTickProps}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCompactNumber(v)}
                  width={48}
                />
                <RechartsTooltip
                  {...themedTooltipProps}
                  labelFormatter={(label: unknown) =>
                    formatCairoDate(String(label), i18n.language)
                  }
                  formatter={(...args: unknown[]) => {
                    // Exact figure from the server's decimal string, not the
                    // chart's float.
                    const item = args[2] as { payload?: { out?: string } } | undefined;
                    return [
                      `${formatMoney(item?.payload?.out)} EGP`,
                      t('fleetExpenses.stats.spent'),
                    ];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#dailySpendFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('fleetExpenses.charts.byCategory')} height="auto">
            {donut.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t('fleetExpenses.charts.nothingCategorized')}
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <PieChart width={120} height={120}>
                  <Pie
                    data={donut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={34}
                    outerRadius={56}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {donut.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                </PieChart>
                <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                  {donut.map((slice) => (
                    <li key={slice.name} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <i
                          className="h-2 w-2 shrink-0 rounded-sm"
                          style={{ background: slice.color }}
                        />
                        <span className="truncate" dir="auto">
                          {slice.name}
                        </span>
                      </span>
                      <span className="tabular-nums font-medium">{formatMoney(slice.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {uncatCount > 0 && (
              <p className="mt-3 text-xs text-warning">
                {t('fleetExpenses.charts.uncategorizedNote', { count: uncatCount })}
              </p>
            )}
          </ChartCard>
        </div>
      )}

      {/* ── Breakdowns: by-category list + advances-by-person rollup ─────── */}
      {!isLoading && stats && stats.count > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {byCategoryList.length > 0 && (
            <ChartCard title={t('fleetExpenses.charts.byCategoryList')} height="auto">
              <ul className="divide-y text-sm">
                {byCategoryList.map((b) => (
                  <li
                    key={b.key ?? '(none)'}
                    className="flex items-center justify-between gap-3 py-1.5"
                  >
                    <span
                      className={cn('min-w-0 truncate', b.key === null && 'text-muted-foreground')}
                      dir="auto"
                    >
                      {b.key === null
                        ? t('fleetExpenses.uncategorized')
                        : (i18n.language.startsWith('ar') && b.label_ar) || b.label || b.key}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground">×{b.count}</span>
                      <span className="tabular-nums font-medium">{formatMoney(b.out)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          )}

          {(stats.by_party.length > 0) && (
            <ChartCard title={t('fleetExpenses.charts.advancesByPerson')} height="auto">
              <ul className="divide-y text-sm">
                {stats.by_party.map((p) => (
                  <li
                    key={`${p.driver_id ?? 'e'}-${p.employee_id ?? 'd'}-${p.kind ?? ''}`}
                    className="flex items-center justify-between gap-3 py-1.5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium" dir="auto">
                        {p.name}
                      </span>
                      {p.kind && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {t(`fleetExpenses.loanKind.${p.kind}`, p.kind)}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground">×{p.count}</span>
                      <span className="tabular-nums font-medium">{formatMoney(p.total)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          )}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('fleetExpenses.searchPlaceholder')}
              className="ps-9"
              dir="auto"
            />
          </div>

          {/* On phones the selects ride a horizontal scroll row instead of
              stacking three-deep; on desktop they sit inline and wrap. */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 lg:flex-wrap lg:overflow-visible lg:pb-0">
            <NativeSelect
              className="w-36 shrink-0"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              aria-label={t('fleetExpenses.fields.source')}
            >
              <option value={ALL}>{t('fleetExpenses.allSources')}</option>
              {TRANSACTION_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t(`fleetExpenses.sources.${s}`, s)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              className="w-36 shrink-0"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              aria-label={t('fleetExpenses.fields.company')}
            >
              <option value={ALL}>{t('fleetExpenses.allCompanies')}</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              className="w-36 shrink-0"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              aria-label={t('fleetExpenses.fields.paymentMethod')}
            >
              <option value={ALL}>{t('fleetExpenses.allMethods')}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {/* Category chips — one tap, horizontally scrollable on phones. */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          <FilterChip
            active={!category && !uncatOnly}
            onClick={() => {
              setCategory('');
              setUncatOnly(false);
            }}
          >
            {t('fleetExpenses.allCategories')}
          </FilterChip>
          {(categories.data ?? []).map((c) => (
            <FilterChip
              key={c.key}
              active={category === c.key}
              onClick={() => {
                setCategory(category === c.key ? '' : c.key);
                setUncatOnly(false);
              }}
            >
              {categoryLabel(c, i18n.language)}
            </FilterChip>
          ))}
        </div>

        {/* Source toggles: they change WHICH LEDGERS are summed (D4). */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-amber-500" />
            <Label htmlFor="include-fuel" className="cursor-pointer text-sm">
              {t('fleetExpenses.includeFuel')}
            </Label>
            <Switch id="include-fuel" checked={includeFuel} onCheckedChange={setIncludeFuel} />
          </div>
          <div className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-sky-500" />
            <Label htmlFor="include-loans" className="cursor-pointer text-sm">
              {t('fleetExpenses.includeLoans')}
            </Label>
            <Switch id="include-loans" checked={includeLoans} onCheckedChange={setIncludeLoans} />
          </div>
        </div>
      </div>

      {/* ── The ledger ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !hasRows ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title={
            uncatOnly ? t('fleetExpenses.noUncategorized') : t('fleetExpenses.noExpenses')
          }
          description={
            uncatOnly
              ? t('fleetExpenses.noUncategorizedDescription')
              : t('fleetExpenses.noExpensesDescription')
          }
          action={
            canManageExpenses && !uncatOnly ? (
              <Button
                onClick={() => navigate('/fleet-expenses/new', { state: { from: 'ledger' } })}
              {...intentProps(() => warmLedgerForm(queryClient))}
              >
                <Plus className="h-4 w-4" />
                {t('fleetExpenses.addExpense')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <LedgerList rows={visibleRows} dayTotals={dayTotals} canEdit={canManageExpenses} />
      )}

      {/* Quiet link into Messages — replaces the amber queue badge. */}
      <div className="rounded-lg border bg-card px-3 py-2.5 text-xs text-muted-foreground">
        {t('fleetExpenses.ignoredMessages')}{' '}
        <Link
          to="/fleet-expenses/messages"
          {...intentProps(() => {
            preloadChunk('fleet-expenses-messages');
            prefetchMessagesFirstPage(queryClient);
          })}
          className="inline-block py-1 font-semibold text-primary hover:underline"
        >
          {t('fleetExpenses.reviewLink')} ›
        </Link>
      </div>

      {!isLoading && hasRows && (
        <div className="flex flex-col items-center gap-2 py-1">
          <p className="text-xs text-muted-foreground">
            {t('fleetExpenses.showingCount', {
              shown: visibleRows.length,
              total: stats?.count ?? rows.length,
            })}
          </p>
          {rowsQuery.hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void rowsQuery.fetchNextPage()}
              // Hovering "load more" IS the intent to read the next page, so
              // the fetch starts before the click. fetchNextPage dedupes, so
              // the click becomes a no-op that renders what's already coming.
              {...intentProps(() => {
                if (rowsQuery.hasNextPage && !rowsQuery.isFetchingNextPage)
                  void rowsQuery.fetchNextPage({ cancelRefetch: false });
              })}
              disabled={rowsQuery.isFetchingNextPage}
              className="w-full sm:w-auto"
            >
              {rowsQuery.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
            </Button>
          )}
        </div>
      )}
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Bits                                                                        */
/* -------------------------------------------------------------------------- */

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // 44px minimum tap height on touch widths; compact again with a
        // pointer at lg and up.
        'min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors lg:min-h-8 lg:px-3',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'bg-card text-muted-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}
