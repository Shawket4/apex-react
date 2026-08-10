import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Receipt,
  Wallet,
  Activity,
  TrendingDown,
  Download,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  Inbox,
  Fuel,
  HandCoins,
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
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { RankedList } from '@/shared/ui/ranked-list';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { cn } from '@/shared/lib/cn';
import { formatCurrency, firstDayOfMonth, localDateISO } from '@/shared/lib/format';
import { formatCompactCurrency } from '@/shared/lib/format-number';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useReviewQueue } from '@/entities/raw-message/queries';
import { usePermissions } from '@/shared/hooks/use-permissions';

import {
  useTransactionsPaged,
  useTransactionStatistics,
  useDeleteTransaction,
} from '@/entities/transaction/queries';
import {
  COMPANIES,
  EXPENSE_TYPES,
  PAYMENT_METHODS,
  TRANSACTION_SOURCES,
  type Transaction,
  type TransactionFilters,
} from '@/entities/transaction/schemas';
import { FleetExpensesTable } from '@/widgets/fleet-expenses-table/fleet-expenses-table';
import { exportFleetExpenses } from '@/widgets/fleet-expenses-table/fleet-expenses-excel';
import { getAllTransactions } from '@/entities/transaction/api';

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

const CHART_COLORS = [
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#10B981',
  '#EF4444',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
];

const ALL = '__all__';

/**
 * Recharts styles its tooltip inline and defaults to a white surface with dark
 * text. In dark mode that made the label row (the date) black-on-dark and
 * unreadable. Driving it from the theme's CSS variables makes it correct in both
 * themes instead of correct in one and broken in the other.
 */
const TOOLTIP_STYLES = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--popover-foreground))',
    boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
  },
  labelStyle: { color: 'hsl(var(--popover-foreground))', fontWeight: 600 },
  itemStyle: { color: 'hsl(var(--popover-foreground))' },
  cursor: { fill: 'hsl(var(--muted))', fillOpacity: 0.3 },
} as const;

function monthStartISO(): string {
  const d = firstDayOfMonth();
  return localDateISO(d.getFullYear(), d.getMonth(), d.getDate());
}
function todayISO(): string {
  const d = new Date();
  return localDateISO(d.getFullYear(), d.getMonth(), d.getDate(), true);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function FleetExpensesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canManageExpenses } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const [from, setFrom] = React.useState<string | null>(
    () => searchParams.get('from') ?? monthStartISO(),
  );
  const [to, setTo] = React.useState<string | null>(() => searchParams.get('to') ?? todayISO());

  const [category, setCategory] = React.useState(() => searchParams.get('category') ?? ALL);
  const [company, setCompany] = React.useState(() => searchParams.get('company') ?? ALL);
  const [paymentMethod, setPaymentMethod] = React.useState(
    () => searchParams.get('payment_method') ?? ALL,
  );
  const [source, setSource] = React.useState(() => searchParams.get('source') ?? ALL);
  const [search, setSearch] = React.useState(() => searchParams.get('q') ?? '');
  const [grouped, setGrouped] = React.useState(true);
  // Default on, matching the legacy costs view which unioned all three sources.
  const [includeFuel, setIncludeFuel] = React.useState(
    () => searchParams.get('include_fuel') !== 'false',
  );
  const [includeLoans, setIncludeLoans] = React.useState(
    () => searchParams.get('include_loans') !== 'false',
  );

  const debouncedSearch = useDebounce(search, 250);

  /**
   * Server-side filters. `q` is included so the backend does the text search
   * across counterparty, description and reference — filtering only the current
   * page client-side would silently hide matches on later pages.
   */
  const filters: TransactionFilters = React.useMemo(
    () => ({
      from: from ?? undefined,
      to: to ?? undefined,
      category: category === ALL ? undefined : category,
      company: company === ALL ? undefined : company,
      payment_method: paymentMethod === ALL ? undefined : paymentMethod,
      source: source === ALL ? undefined : source,
      q: debouncedSearch || undefined,
      include_fuel: includeFuel ? undefined : 'false',
      include_loans: includeLoans ? undefined : 'false',
    }),
    [
      from, to, category, company, paymentMethod, source, debouncedSearch,
      includeFuel, includeLoans,
    ],
  );

  // Keep the URL shareable — a filtered view can be sent to someone else.
  React.useEffect(() => {
    const next = new URLSearchParams();
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    if (category !== ALL) next.set('category', category);
    if (company !== ALL) next.set('company', company);
    if (paymentMethod !== ALL) next.set('payment_method', paymentMethod);
    if (source !== ALL) next.set('source', source);
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (!includeFuel) next.set('include_fuel', 'false');
    if (!includeLoans) next.set('include_loans', 'false');
    setSearchParams(next, { replace: true });
  }, [
    from, to, category, company, paymentMethod, source, debouncedSearch,
    includeFuel, includeLoans, setSearchParams,
  ]);

  const rowsQuery = useTransactionsPaged(filters);
  const statsQuery = useTransactionStatistics(filters);
  const deleteMutation = useDeleteTransaction();
  const reviewQueue = useReviewQueue();

  const [pendingDelete, setPendingDelete] = React.useState<Transaction | null>(null);

  // Flatten the loaded pages. Totals come from the statistics endpoint, so
  // they describe the whole filtered set regardless of how much is on screen.
  const rows = React.useMemo(
    () => rowsQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [rowsQuery.data],
  );
  const stats = statsQuery.data;

  const dailySeries = React.useMemo(
    () =>
      (stats?.by_date ?? []).map((b) => ({
        date: b.key,
        label: b.key.slice(5),
        amount: b.total_amount,
        count: b.count,
      })),
    [stats],
  );

  const typeSeries = React.useMemo(
    () => (stats?.by_type ?? []).slice(0, 6).map((b) => ({ name: b.key, value: b.total_amount })),
    [stats],
  );

  const isLoading = rowsQuery.isLoading || statsQuery.isLoading;

  const handleExport = React.useCallback(async () => {
    // Export the full filtered set, not just the pages loaded so far -- a
    // spreadsheet that silently stops at whatever the user happened to scroll
    // past is worse than no export.
    const all = await getAllTransactions(filters);
    void exportFleetExpenses({
      rows: all,
      statistics: stats,
      t,
      meta: `${from ?? ''} → ${to ?? ''}`,
    });
  }, [filters, stats, t, from, to]);

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
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!rows.length}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/fleet-expenses/review')}
          >
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">{t('review.title')}</span>
            {reviewQueue.data?.length ? (
              <span className="ms-1 rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-600 dark:text-amber-400">
                {reviewQueue.data.length}
              </span>
            ) : null}
          </Button>
          {canManageExpenses && (
            <Button size="sm" onClick={() => navigate('/fleet-expenses/new')}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('fleetExpenses.addExpense')}</span>
            </Button>
          )}
        </div>
      }
    >
      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={t('fleetExpenses.stats.total')}
          value={{
            full: formatCurrency(stats?.total_amount ?? 0),
            compact: formatCompactCurrency(stats?.total_amount ?? 0),
          }}
          subvalue={t('fleetExpenses.stats.records', { count: stats?.expense_count ?? 0 })}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label={t('fleetExpenses.stats.outflow')}
          value={{
            full: formatCurrency(stats?.total_out ?? 0),
            compact: formatCompactCurrency(stats?.total_out ?? 0),
          }}
          icon={TrendingDown}
          tone="destructive"
        />
        <StatCard
          label={t('fleetExpenses.stats.avgPerDay')}
          value={{
            full: formatCurrency(
              stats && stats.by_date.length ? stats.total_amount / stats.by_date.length : 0,
            ),
            compact: formatCompactCurrency(
              stats && stats.by_date.length ? stats.total_amount / stats.by_date.length : 0,
            ),
          }}
          subvalue={t('fleetExpenses.stats.daysCovered', { count: stats?.by_date.length ?? 0 })}
          icon={Activity}
        />
        <StatCard
          label={t('fleetExpenses.stats.fees')}
          value={{
            full: formatCurrency(stats?.total_fees ?? 0),
            compact: formatCompactCurrency(stats?.total_fees ?? 0),
          }}
          subvalue={t('fleetExpenses.stats.feesHint')}
          icon={Receipt}
          tone="warning"
        />
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <DateRangePicker
          from={from}
          to={to}
          onChange={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
          }}
        />

        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('fleetExpenses.searchPlaceholder')}
            className="ps-9"
          />
        </div>

        <FilterSelect
          value={category}
          onChange={setCategory}
          placeholder={t('fleetExpenses.fields.expenseType')}
          options={EXPENSE_TYPES}
          allLabel={t('fleetExpenses.allTypes')}
        />
        <FilterSelect
          value={company}
          onChange={setCompany}
          placeholder={t('fleetExpenses.fields.company')}
          options={COMPANIES}
          allLabel={t('fleetExpenses.allCompanies')}
        />
        <FilterSelect
          value={paymentMethod}
          onChange={setPaymentMethod}
          placeholder={t('fleetExpenses.fields.paymentMethod')}
          options={PAYMENT_METHODS}
          allLabel={t('fleetExpenses.allMethods')}
        />
        <FilterSelect
          value={source}
          onChange={setSource}
          placeholder={t('fleetExpenses.fields.source')}
          options={TRANSACTION_SOURCES}
          allLabel={t('fleetExpenses.allSources')}
          translateOptions="fleetExpenses.sources"
        />

        <Button
          variant="outline"
          size="icon"
          onClick={() => setGrouped((g) => !g)}
          aria-label={t('fleetExpenses.toggleGrouping')}
          className="shrink-0"
        >
          {grouped ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
        </Button>
        </div>

        {/* Source toggles, matching the legacy include_fuel / include_loans
            flags. Kept visually distinct from the filters above because they
            change WHICH LEDGERS are summed, not just which rows are shown. */}
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

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      {!isLoading && rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title={t('fleetExpenses.charts.daily')}
            description={t('fleetExpenses.charts.dailyHint')}
            className="lg:col-span-2"
            height={280}
            padded={false}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCompactCurrency(v)}
                  width={64}
                />
                <RechartsTooltip
                  formatter={(v: number) => formatCurrency(v)}
                  labelFormatter={(l: string) => l}
                  {...TOOLTIP_STYLES}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#expenseFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('fleetExpenses.charts.byType')} height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeSeries}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {typeSeries.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(v: number) => formatCurrency(v)}
                  {...TOOLTIP_STYLES}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── Breakdowns ────────────────────────────────────────────────────── */}
      {!isLoading && stats && rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BreakdownCard
            title={t('fleetExpenses.charts.byCar')}
            items={stats.by_car}
            total={stats.total_amount}
          />
          <BreakdownCard
            title={t('fleetExpenses.charts.byCompany')}
            items={stats.by_company}
            total={stats.total_amount}
          />
          <BreakdownCard
            title={t('fleetExpenses.charts.bySource')}
            items={stats.by_source}
            total={stats.total_amount}
            translatePrefix="fleetExpenses.sources"
          />
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title={t('fleetExpenses.noExpenses')}
          description={t('fleetExpenses.noExpensesDescription')}
          action={
            canManageExpenses ? (
              <Button onClick={() => navigate('/fleet-expenses/new')}>
                <Plus className="h-4 w-4" />
                {t('fleetExpenses.addExpense')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <FleetExpensesTable
            rows={rows}
            grouped={grouped}
            canEdit={canManageExpenses}
            onEdit={(row) => navigate(`/fleet-expenses/${row.id}/edit`)}
            onDelete={setPendingDelete}
          />

          {/* Shows how much of the filtered set is on screen, so a partial view
              is never mistaken for the whole thing. */}
          <div className="flex flex-col items-center gap-2 py-2">
            <p className="text-xs text-muted-foreground">
              {t('fleetExpenses.showingCount', {
                shown: rows.length,
                total: stats?.expense_count ?? rows.length,
              })}
            </p>
            {rowsQuery.hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void rowsQuery.fetchNextPage()}
                disabled={rowsQuery.isFetchingNextPage}
                className="w-full sm:w-auto"
              >
                {rowsQuery.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
              </Button>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t('fleetExpenses.deleteConfirmTitle')}
        description={t('fleetExpenses.deleteConfirmDescription', {
          amount: formatCurrency(pendingDelete?.amount ?? 0),
        })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteMutation.mutate(
            { id: pendingDelete.id, version: pendingDelete.version },
            { onSettled: () => setPendingDelete(null) },
          );
        }}
      />
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Bits                                                                        */
/* -------------------------------------------------------------------------- */

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  allLabel,
  translateOptions,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
  allLabel: string;
  translateOptions?: string;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto min-w-[9rem]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {translateOptions ? t(`${translateOptions}.${option}`, option) : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BreakdownCard({
  title,
  items,
  total,
  translatePrefix,
}: {
  title: string;
  items: Array<{ key: string; count: number; total_amount: number }>;
  total: number;
  translatePrefix?: string;
}) {
  const { t } = useTranslation();
  if (!items.length) return null;

  return (
    <ChartCard title={title} height="auto">
      <RankedList
        items={items.slice(0, 6).map((item) => ({
          id: item.key,
          label: translatePrefix ? t(`${translatePrefix}.${item.key}`, item.key) : item.key,
          value: item.total_amount,
          valueLabel: formatCurrency(item.total_amount),
          countLabel: `×${item.count}`,
          sublabel:
            total > 0 ? `${((item.total_amount / total) * 100).toFixed(1)}%` : undefined,
        }))}
      />
    </ChartCard>
  );
}
