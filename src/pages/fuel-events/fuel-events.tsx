import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Fuel,
  Droplet,
  DollarSign,
  Gauge,
  TrendingUp,
  Clock,
  Search,
  Download,
  LayoutGrid,
  Users,
  Car as CarIcon,
  Link2,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { StatCard } from '@/shared/ui/stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { useFuelEvents } from '@/entities/fuel-event/queries';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { matches } from '@/shared/lib/normalize';
import {
  firstDayOfMonth,
  lastDayOfMonth,
  formatCurrency,
  formatNumber,
  daysBetween,
  localDateISO,
  parseISO,
} from '@/shared/lib/format';
import { analyseEvents } from '@/shared/lib/fuel';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { cn } from '@/shared/lib/cn';
import {
  FuelEventsTable,
  type FuelEventGrouping,
} from '@/widgets/fuel-events-table/fuel-events-table';
import {
  exportFuelEvents,
  exportFuelEventsGroup,
} from '@/widgets/fuel-events-table/fuel-events-excel';
import {
  FuelEventsFilterPopover,
  FuelEventsMethodControl,
  FuelEventsSortControl,
  applyMethodFilter,
  applyStatusFilter,
  applySort,
  countByMethod,
  parseFilters,
  parseMethod,
  serializeFilters,
  serializeMethod,
  type FuelEventMethodFilter,
  type FuelEventSortKey,
  type FuelEventStatusFilter,
  type SortDirection,
} from '@/widgets/fuel-events-table/fuel-events-filters';
import type { FuelEvent } from '@/entities/fuel-event/schemas';

/* -------------------------------------------------------------------------- */
/* Storage keys                                                                */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY_GROUPING = 'apex:fuel-events:grouping';
const STORAGE_KEY_DATE_FROM = 'apex:fuel-events:from';
const STORAGE_KEY_DATE_TO = 'apex:fuel-events:to';

/* -------------------------------------------------------------------------- */
/* Default helpers                                                             */
/* -------------------------------------------------------------------------- */

function monthStartISO(): string {
  const d = firstDayOfMonth();
  return localDateISO(d.getFullYear(), d.getMonth(), d.getDate());
}
function monthEndISO(): string {
  const d = lastDayOfMonth();
  return localDateISO(d.getFullYear(), d.getMonth(), d.getDate(), true);
}

function loadDefault<T>(key: string, fallback: T, validate: (v: string) => T | null): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  const valid = validate(raw);
  return valid !== null && valid !== undefined ? valid : fallback;
}

function isValidGrouping(v: string): FuelEventGrouping | null {
  return v === 'none' || v === 'vehicle' || v === 'driver' ? v : null;
}
function isValidSortKey(v: string): FuelEventSortKey | null {
  return v === 'date' || v === 'rate' || v === 'cost' || v === 'liters' ? v : null;
}
function isValidDirection(v: string): SortDirection | null {
  return v === 'asc' || v === 'desc' ? v : null;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function FuelEventsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canEditFuel } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = React.useState(() => searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(search, 200);

  const [from, setFrom] = React.useState<string | null>(() => {
    const url = searchParams.get('from');
    if (url) return url;
    const stored = loadDefault(STORAGE_KEY_DATE_FROM, null as string | null, (v) => v);
    return stored ?? monthStartISO();
  });

  const [to, setTo] = React.useState<string | null>(() => {
    const url = searchParams.get('to');
    if (url) return url;
    const stored = loadDefault(STORAGE_KEY_DATE_TO, null as string | null, (v) => v);
    return stored ?? monthEndISO();
  });

  const [grouping, setGrouping] = React.useState<FuelEventGrouping>(() => {
    const url = searchParams.get('g');
    if (url === 'v') return 'vehicle';
    if (url === 'd') return 'driver';
    if (url === 'a') return 'none';
    return loadDefault(STORAGE_KEY_GROUPING, 'vehicle' as FuelEventGrouping, isValidGrouping);
  });

  const [activeFilters, setActiveFilters] = React.useState<Set<FuelEventStatusFilter>>(() =>
    parseFilters(searchParams.get('f')),
  );

  const [methodFilter, setMethodFilter] = React.useState<FuelEventMethodFilter>(() =>
    parseMethod(searchParams.get('m')),
  );

  const [sortKey, setSortKey] = React.useState<FuelEventSortKey>(() => {
    const url = searchParams.get('s');
    return (url && isValidSortKey(url)) || 'date';
  });

  const [sortDirection, setSortDirection] = React.useState<SortDirection>(() => {
    const url = searchParams.get('d');
    return (url && isValidDirection(url)) || 'desc';
  });

  const [exporting, setExporting] = React.useState(false);
  const [exportingGroup, setExportingGroup] = React.useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Sync state → URL                                                         */
  /* ------------------------------------------------------------------------ */

  React.useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    if (grouping !== 'vehicle') next.set('g', grouping === 'none' ? 'a' : grouping[0]);
    const f = serializeFilters(activeFilters);
    if (f) next.set('f', f);
    const m = serializeMethod(methodFilter);
    if (m) next.set('m', m);
    if (sortKey !== 'date') next.set('s', sortKey);
    if (sortDirection !== 'desc') next.set('d', sortDirection);
    setSearchParams(next, { replace: true });
  }, [
    debouncedSearch,
    from,
    to,
    grouping,
    activeFilters,
    methodFilter,
    sortKey,
    sortDirection,
    setSearchParams,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Sync state → localStorage (only the sticky bits)                         */
  /* ------------------------------------------------------------------------ */

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY_GROUPING, grouping);
  }, [grouping]);

  React.useEffect(() => {
    if (from) window.localStorage.setItem(STORAGE_KEY_DATE_FROM, from);
    else window.localStorage.removeItem(STORAGE_KEY_DATE_FROM);
    if (to) window.localStorage.setItem(STORAGE_KEY_DATE_TO, to);
    else window.localStorage.removeItem(STORAGE_KEY_DATE_TO);
  }, [from, to]);

  /* ------------------------------------------------------------------------ */
  /* Data pipeline                                                            */
  /*                                                                          */
  /*   fetched events                                                         */
  /*   → search filter                                                        */
  /*   → pair analysis  (runs on the FULL search-filtered set so pairing      */
  /*                     stays holistic across methods)                       */
  /*   → status filter                                                        */
  /*   → method filter                                                        */
  /*   → sort                                                                 */
  /* ------------------------------------------------------------------------ */

  const {
    data: events = [],
    isLoading,
    isError,
    refetch,
  } = useFuelEvents({ from, to });

  const searched = React.useMemo(() => {
    if (!debouncedSearch.trim()) return events;
    return events.filter(
      (e) =>
        matches(e.car_no_plate, debouncedSearch) || matches(e.driver_name, debouncedSearch),
    );
  }, [events, debouncedSearch]);

  const analysis = React.useMemo(() => analyseEvents(searched), [searched]);

  const afterStatus = React.useMemo(
    () => applyStatusFilter(searched, analysis.map, activeFilters),
    [searched, analysis.map, activeFilters],
  );

  const filtered = React.useMemo(
    () => applyMethodFilter(afterStatus, methodFilter),
    [afterStatus, methodFilter],
  );

  const sorted = React.useMemo(
    () => applySort(filtered, analysis.map, sortKey, sortDirection),
    [filtered, analysis.map, sortKey, sortDirection],
  );

  // Method tab counts — computed from the set after status filter applies
  // (but before method filter) so tab counts reflect what each tab would show.
  const methodCounts = React.useMemo(() => countByMethod(afterStatus), [afterStatus]);

  /* ------------------------------------------------------------------------ */
  /* Stats — computed from the VISIBLE (post-filter) set                      */
  /* ------------------------------------------------------------------------ */

  const stats = React.useMemo(() => {
    const { totals } = analyseEvents(filtered);
    const start = parseISO(from) ?? firstDayOfMonth();
    const end = parseISO(to) ?? new Date();
    const days = daysBetween(start, end);

    return {
      totalEvents: totals.totalEvents,
      totalLiters: totals.totalLiters,
      totalCost: totals.totalCost,
      avgFuelRate: totals.avgRate,
      avgCostPerDay: days > 0 ? totals.totalCost / days : 0,
      avgLitersPerDay: days > 0 ? totals.totalLiters / days : 0,
      avgPerFuelUp: totals.totalEvents > 0 ? totals.totalLiters / totals.totalEvents : 0,
      pairedCount: totals.pairedCount,
      days,
    };
  }, [filtered, from, to]);

  /* ------------------------------------------------------------------------ */
  /* Exports                                                                  */
  /* ------------------------------------------------------------------------ */

  const handleExport = async () => {
    if (sorted.length === 0) return;
    setExporting(true);
    try {
      await exportFuelEvents({ events: sorted, grouping, t });
    } finally {
      setExporting(false);
    }
  };

  const handleExportGroup = async (groupKey: string, groupEvents: FuelEvent[]) => {
    if (groupEvents.length === 0 || grouping === 'none') return;
    setExportingGroup(groupKey);
    try {
      await exportFuelEventsGroup({
        groupKey,
        events: groupEvents,
        grouping: grouping as 'vehicle' | 'driver',
        t,
      });
    } finally {
      setExportingGroup(null);
    }
  };

  const anyFilterActive = activeFilters.size > 0 || methodFilter !== 'all';

  return (
    <PageShell
      title={t('fuelEvents.title')}
      description={t('fuelEvents.subtitle')}
      icon={<Fuel className="h-5 w-5" />}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || sorted.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
          {canEditFuel && (
            <Button onClick={() => navigate('/fuel-events/new')} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('fuelEvents.addEvent')}</span>
            </Button>
          )}
        </>
      }
    >
      {/* Toolbar row 1 — date range */}
      <DateRangePicker
        from={from}
        to={to}
        onChange={(f, tt) => {
          setFrom(f);
          setTo(tt);
        }}
      />

      {/* Toolbar row 2 — search + grouping */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('fuelEvents.searchPlaceholder')}
            className="ps-9"
          />
        </div>

        <div
          className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"
          role="tablist"
          aria-label={t('fuelEvents.grouping.label')}
        >
          <GroupingButton
            active={grouping === 'vehicle'}
            onClick={() => setGrouping('vehicle')}
            icon={<CarIcon className="h-3.5 w-3.5" />}
            label={t('fuelEvents.grouping.byVehicle')}
          />
          <GroupingButton
            active={grouping === 'driver'}
            onClick={() => setGrouping('driver')}
            icon={<Users className="h-3.5 w-3.5" />}
            label={t('fuelEvents.grouping.byDriver')}
          />
          <GroupingButton
            active={grouping === 'none'}
            onClick={() => setGrouping('none')}
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            label={t('fuelEvents.grouping.all')}
          />
        </div>
      </div>

      {/* Toolbar row 3 — method tabs + status filter + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <FuelEventsMethodControl
          value={methodFilter}
          onChange={setMethodFilter}
          counts={methodCounts}
        />
        <FuelEventsFilterPopover active={activeFilters} onChange={setActiveFilters} />
        <FuelEventsSortControl
          sortKey={sortKey}
          direction={sortDirection}
          onSortKeyChange={setSortKey}
          onDirectionToggle={() =>
            setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'))
          }
        />
        {anyFilterActive && (
          <span className="text-xs text-muted-foreground">
            {t('fuelEvents.filters.showingCount', {
              shown: filtered.length,
              total: searched.length,
            })}
          </span>
        )}
      </div>

      {/* Stats */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label={t('fuelEvents.stats.totalFuel')}
            value={`${formatNumber(stats.totalLiters, 1)} L`}
            subvalue={t('fuelEvents.stats.events', { count: stats.totalEvents })}
            icon={Droplet}
            tone="primary"
          />
          <StatCard
            label={t('fuelEvents.stats.avgEfficiency')}
            value={`${formatNumber(stats.avgFuelRate, 1)} ${t('fuelEvents.efficiency.unit')}`}
            subvalue={
              stats.pairedCount > 0
                ? t('fuelEvents.stats.pairedNote', { count: stats.pairedCount })
                : undefined
            }
            icon={Gauge}
            tone="success"
          />
          <StatCard
            label={t('fuelEvents.stats.totalCost')}
            value={formatCurrency(stats.totalCost)}
            icon={DollarSign}
            tone="primary"
          />
          <StatCard
            label={t('fuelEvents.stats.costPerDay')}
            value={formatCurrency(stats.avgCostPerDay)}
            subvalue={t('fuelEvents.stats.dayPeriod', { count: stats.days })}
            icon={TrendingUp}
            tone="warning"
          />
          <StatCard
            label={t('fuelEvents.stats.fuelPerDay')}
            value={`${formatNumber(stats.avgLitersPerDay, 2)} L`}
            subvalue={t('fuelEvents.stats.dayPeriod', { count: stats.days })}
            icon={Droplet}
          />
          <StatCard
            label={t('fuelEvents.stats.perFuelUp')}
            value={`${formatNumber(stats.avgPerFuelUp, 1)} L`}
            icon={Clock}
          />
        </div>
      )}

      {/* Paired events explainer */}
      {stats.pairedCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
          <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{t('fuelEvents.efficiency.pairedExplainer')}</span>
        </div>
      )}

      {/* Table / empty state */}
      {isError ? (
        <EmptyState
          icon={<Fuel className="h-5 w-5" />}
          title={t('errors.generic')}
          action={
            <Button onClick={() => void refetch()} variant="outline">
              {t('common.retry')}
            </Button>
          }
        />
      ) : !isLoading && searched.length === 0 ? (
        <EmptyState
          icon={<Fuel className="h-5 w-5" />}
          title={t('fuelEvents.noEvents')}
          description={t('fuelEvents.noEventsDescription')}
          action={
            canEditFuel && (
              <Button onClick={() => navigate('/fuel-events/new')}>
                <Plus className="h-4 w-4" />
                {t('fuelEvents.addEvent')}
              </Button>
            )
          }
        />
      ) : (
        <FuelEventsTable
          events={sorted}
          originalEvents={searched}
          grouping={grouping}
          loading={isLoading}
          analysis={analysis.map}
          onExportGroup={handleExportGroup}
          exportingGroup={exportingGroup}
        />
      )}
    </PageShell>
  );
}

function GroupingButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}