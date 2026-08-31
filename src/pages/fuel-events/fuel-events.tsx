import * as React from 'react';
import { intentProps, warmFuelForm } from '@/shared/lib/prefetch';
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
  AlertTriangle,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { StatCard } from '@/shared/ui/stat-card';
import { useQueryClient } from '@tanstack/react-query';
import { useFuelEvents } from '@/entities/fuel-event/queries';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useScope } from '@/shared/scope';
import { matches } from '@/shared/lib/normalize';
import {
  firstDayOfMonth,
  formatCurrency,
  formatNumber,
  daysBetween,
  parseISO,
} from '@/shared/lib/format';
import { analyseEvents } from '@/shared/lib/fuel';
import { usePermissions } from '@/shared/hooks/use-permissions';
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
} from '@/widgets/fuel-events-table/fuel-events-filters';
import {
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
} from '@/widgets/fuel-events-table/fuel-events-filter-logic';
import type { FuelEvent } from '@/entities/fuel-event/schemas';
import { FUEL_STORAGE_KEYS } from '@/entities/fuel-event/defaults';
import { loadDefault } from '@/entities/trip/defaults';
import { formatCompactCurrency, formatCompactNumber } from '@/shared/lib/format-number';

/* Storage keys + range defaults live in entities/fuel-event/defaults.ts,
   shared with the sidebar's data warmer so keys can't drift. */

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
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState(() => searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(search, 200);

  // Dates come from the GLOBAL scope (the header bar).
  const { range: scopeRange } = useScope();
  const from = scopeRange.from;
  const to = scopeRange.to;

  const [grouping, setGrouping] = React.useState<FuelEventGrouping>(() => {
    const url = searchParams.get('g');
    if (url === 'v') return 'vehicle';
    if (url === 'd') return 'driver';
    if (url === 'a') return 'none';
    return loadDefault(FUEL_STORAGE_KEYS.grouping, 'vehicle' as FuelEventGrouping, isValidGrouping);
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
    setSearchParams(
      (prev) => {
        // Start from the CURRENT params so the global scope's keys survive.
        const next = new URLSearchParams(prev);
        const setOrDelete = (k: string, v: string | null) =>
          v ? next.set(k, v) : next.delete(k);
        setOrDelete('q', debouncedSearch || null);
        setOrDelete('g', grouping !== 'vehicle' ? (grouping === 'none' ? 'a' : grouping[0]) : null);
        setOrDelete('f', serializeFilters(activeFilters));
        setOrDelete('m', serializeMethod(methodFilter));
        setOrDelete('s', sortKey !== 'date' ? sortKey : null);
        setOrDelete('d', sortDirection !== 'desc' ? sortDirection : null);
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, grouping, activeFilters, methodFilter, sortKey, sortDirection, setSearchParams]);

  /* ------------------------------------------------------------------------ */
  /* Sync state → localStorage (only the sticky bits)                         */
  /* ------------------------------------------------------------------------ */

  React.useEffect(() => {
    window.localStorage.setItem(FUEL_STORAGE_KEYS.grouping, grouping);
  }, [grouping]);


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
            <Download />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
          {canEditFuel && (
            <Button onClick={() => navigate('/fuel-events/new')} size="sm" {...intentProps(() => warmFuelForm(queryClient))}>
              <Plus />
              <span className="hidden sm:inline">{t('fuelEvents.addEvent')}</span>
            </Button>
          )}
        </>
      }
    >
      {/* Toolbar row 2 — search + grouping.
          One row at every width. Stacking these put two of five toolbar rows
          on a phone before any data, and the grouping icons are 100px next to
          a field that is happy to shrink. */}
      <div className="flex flex-row items-center gap-2 sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('fuelEvents.searchPlaceholder')}
            type="search"
            name="q"
            aria-label={t('fuelEvents.searchPlaceholder')}
            autoComplete="off"
            spellCheck={false}
            className="h-8 ps-9"
          />
        </div>

        <div
          className="flex items-center gap-1.5"
          role="group"
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

      {/* Toolbar row 3 — method tabs + status filter + sort.
          Scrolls sideways on a phone rather than wrapping: wrapping cost
          another full row of chrome, and these controls read as one group. The
          negative margin lets it bleed to the page edge so it is obvious there
          is more, rather than stopping short at the padding. */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:shrink-0">
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
<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
  <StatCard
    label={t('fuelEvents.stats.totalFuel')}
    value={{
      full: `${formatNumber(stats.totalLiters, 1)} L`,
      compact: `${formatCompactNumber(stats.totalLiters, 1)} L`,
    }}
    subvalue={t('fuelEvents.stats.events', { count: stats.totalEvents })}
    icon={Droplet}
    tone="default"
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
    tone="default"
  />
  <StatCard
    label={t('fuelEvents.stats.totalCost')}
    value={{
      full: <span className="font-mono text-money">{formatCurrency(stats.totalCost)}</span>,
      compact: <span className="font-mono text-money">{formatCompactCurrency(stats.totalCost)}</span>,
    }}
    icon={DollarSign}
    tone="default"
  />
  <StatCard
    label={t('fuelEvents.stats.costPerDay')}
    value={{
      full: <span className="font-mono text-money">{formatCurrency(stats.avgCostPerDay)}</span>,
      compact: <span className="font-mono text-money">{formatCompactCurrency(stats.avgCostPerDay)}</span>,
    }}
    subvalue={t('fuelEvents.stats.dayPeriod', { count: stats.days })}
    icon={TrendingUp}
    tone="default"
  />
  <StatCard
    label={t('fuelEvents.stats.fuelPerDay')}
    value={{
      full: `${formatNumber(stats.avgLitersPerDay, 2)} L`,
      compact: `${formatCompactNumber(stats.avgLitersPerDay, 2)} L`,
    }}
    subvalue={t('fuelEvents.stats.dayPeriod', { count: stats.days })}
    icon={Droplet}
  />
  <StatCard
    label={t('fuelEvents.stats.perFuelUp')}
    value={`${formatNumber(stats.avgPerFuelUp, 1)} L`}
    icon={Clock}
    className="lg:hidden"
  />
</div>
      )}

      {/* Paired events explainer */}
      {stats.pairedCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2.5 text-[12.5px] text-muted-foreground">
          <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>{t('fuelEvents.efficiency.pairedExplainer')}</span>
        </div>
      )}

      {/* Table / empty state */}
      {isError ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span className="flex-1">{t('errors.generic')}</span>
          <Button
            onClick={() => void refetch()}
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 border-warning/40 px-2.5 text-xs text-warning hover:text-warning"
          >
            {t('common.retry')}
          </Button>
        </div>
      ) : !isLoading && searched.length === 0 ? (
        <div className="rounded-lg border bg-card px-3 py-6 text-center text-xs text-muted-foreground">
          <p>{t('fuelEvents.noEvents')}</p>
          <p className="mt-0.5">{t('fuelEvents.noEventsDescription')}</p>
          {canEditFuel && (
            <Button size="sm" className="mt-3 h-7 text-xs" onClick={() => navigate('/fuel-events/new')} {...intentProps(() => warmFuelForm(queryClient))}>
              <Plus />
              {t('fuelEvents.addEvent')}
            </Button>
          )}
        </div>
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
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      className="h-7 text-xs"
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}