import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Building2,
  Calendar as CalendarIcon,
  Car as CarIcon,
  ChevronRight,
  Loader2,
  Route as RouteIcon,
} from 'lucide-react';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { CollapsibleSection } from '@/shared/ui/collapsible-section';
import { ChartCard } from '@/shared/ui/chart-card';
import { DataTable } from '@/shared/ui/data-table';
import { Badge } from '@/shared/ui/badge';
import { formatNumber, formatCurrency, fmtDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import {
  CHART_SERIES_COLORS,
  themedTooltipProps,
} from '@/shared/lib/chart-theme';
import type {
  CarStat,
  CompanyStat,
  GroupStat,
  RouteStat,
  TripStatisticsParams,
} from '@/entities/trip-statistics/schemas';
import { useAllTripsInRange } from '@/entities/trip/queries';
import type { Trip } from '@/entities/trip/schemas';

interface TripsStatisticsCompaniesProps {
  companies: CompanyStat[];
  hasFinancialAccess: boolean;
  filters: TripStatisticsParams;
}

/**
 * Per-company breakdown with three-level drill-down:
 *
 *   Group  →  Routes (matched to the group)  →  Cars (per route)
 *
 * Each company gets a collapsible card with a pie chart and a group table.
 * Click a group row → expands inline to show its routes; click a route row →
 * expands to show the cars that ran it.
 *
 * **Group ↔ route matching.** The backend doesn't expose a direct foreign
 * key between groups and routes, so we match heuristically:
 *   1. `route.fee_category === group.fee` (Watanya: "Fee 1" → "Fee Category 1")
 *   2. `route.drop_off_point === group.group_name` (Petrol Arrows: "Qena"
 *      matches "Agroud to Qena", "Haykstep to Qena", "Somed to Qena")
 *   3. `route.route_name === group.group_name` (TAQA: "Suez" → "Suez")
 *
 * Each rule is tried in order; the first that returns non-empty wins. This
 * covers the three known company shapes in the data.
 */
export function TripsStatisticsCompanies({
  companies,
  hasFinancialAccess,
  filters,
}: TripsStatisticsCompaniesProps) {
  const { t } = useTranslation();

  const sorted = React.useMemo(
    () =>
      [...companies].sort((a, b) =>
        hasFinancialAccess
          ? (b.total_revenue || 0) - (a.total_revenue || 0)
          : (b.total_volume || 0) - (a.total_volume || 0),
      ),
    [companies, hasFinancialAccess],
  );

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="px-1 text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t('trips.statistics.companies.heading')}
      </h3>
      {sorted.map((company, idx) => (
        <CompanyCard
          key={company.company}
          company={company}
          hasFinancialAccess={hasFinancialAccess}
          filters={filters}
          defaultOpen={idx < 3}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Group ↔ route matching                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Find the routes that belong to a given group. See the rule list in the
 * top-level component doc.
 */
function matchRoutesToGroup(
  group: GroupStat,
  routes: RouteStat[],
): RouteStat[] {
  // Rule 1: fee_category match (Watanya)
  if (group.fee != null && group.fee > 0) {
    const byFeeCategory = routes.filter(
      (r) => r.fee_category != null && r.fee_category === group.fee,
    );
    if (byFeeCategory.length > 0) return byFeeCategory;
  }

  // Rule 2: drop_off_point match (Petrol Arrows)
  const byDropOff = routes.filter(
    (r) => r.drop_off_point && r.drop_off_point === group.group_name,
  );
  if (byDropOff.length > 0) return byDropOff;

  // Rule 3: exact route_name match (TAQA, fallback)
  const byName = routes.filter((r) => r.route_name === group.group_name);
  if (byName.length > 0) return byName;

  // Special-case: Watanya's "Unmapped" group should match the "Unmapped"
  // route (fee_category 0 -- our rule 1 skips it because we check `> 0`).
  if (group.group_name === 'Unmapped') {
    const unmapped = routes.filter(
      (r) => r.route_name === 'Unmapped' || r.fee_category === 0,
    );
    if (unmapped.length > 0) return unmapped;
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/* Per-company card                                                            */
/* -------------------------------------------------------------------------- */

function CompanyCard({
  company,
  hasFinancialAccess,
  filters,
  defaultOpen,
}: {
  company: CompanyStat;
  hasFinancialAccess: boolean;
  filters: TripStatisticsParams;
  defaultOpen: boolean;
}) {
  const { t } = useTranslation();

  return (
    <CollapsibleSection
      defaultOpen={defaultOpen}
      icon={
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      }
      title={
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="truncate text-sm sm:text-base font-semibold">
              {company.company}
            </span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
              {t('trips.statistics.companies.tripsBadge', {
                count: company.total_trips,
              })}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 text-[11px] sm:text-xs text-muted-foreground">
            <span className="tabular-nums">
              {formatNumber(company.total_volume, 2)} L
            </span>
            <span className="tabular-nums">
              {formatNumber(company.total_distance, 2)} km
            </span>
            {hasFinancialAccess && (
              <span className="tabular-nums text-success font-medium">
                {formatCurrency(
                  company.total_amount || company.total_revenue,
                )}
              </span>
            )}
          </div>
        </div>
      }
    >
      <div className="grid gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 md:grid-cols-[minmax(280px,1fr)_minmax(0,1.5fr)]">
        <CompanyPie
          company={company}
          hasFinancialAccess={hasFinancialAccess}
        />
        <CompanyGroupTable
          groups={company.details ?? []}
          routes={company.route_details ?? []}
          company={company.company}
          filters={filters}
          hasFinancialAccess={hasFinancialAccess}
        />
      </div>
    </CollapsibleSection>
  );
}

/* -------------------------------------------------------------------------- */
/* Pie chart                                                                   */
/* -------------------------------------------------------------------------- */

function CompanyPie({
  company,
  hasFinancialAccess,
}: {
  company: CompanyStat;
  hasFinancialAccess: boolean;
}) {
  const { t } = useTranslation();
  const groups = company.details ?? [];

  const groupData = groups
    .map((g) => ({
      name: g.group_name,
      value: hasFinancialAccess
        ? g.total_with_vat || g.total_revenue || 0
        : g.total_volume || 0,
    }))
    .filter((d) => d.value > 0);

  if (groupData.length === 0) {
    return (
      <ChartCard
        title={t(
          hasFinancialAccess
            ? 'trips.statistics.companies.revenueShare'
            : 'trips.statistics.companies.volumeShare',
        )}
        height={240}
        className="sm:h-[280px] md:h-[300px]"
      >
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground px-4 text-center">
          {t('trips.statistics.companies.noGroupBreakdown')}
        </div>
      </ChartCard>
    );
  }

  const total = groupData.reduce((sum, d) => sum + d.value, 0);

  // Responsive outer radius based on screen size
  const getOuterRadius = () => {
    if (typeof window === 'undefined') return 70;
    const width = window.innerWidth;
    if (width < 640) return 70;
    if (width < 768) return 80;
    return 90;
  };

  return (
    <ChartCard
      title={t(
        hasFinancialAccess
          ? 'trips.statistics.companies.revenueShare'
          : 'trips.statistics.companies.volumeShare',
      )}
      height={240}
      className="sm:h-[280px] md:h-[300px]"
      padded={false}
      bodyClassName="p-2"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={groupData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={getOuterRadius()}
            innerRadius={0}
            label={({ percent }) =>
              percent && percent > 0.04
                ? `${Math.round((percent || 0) * 100)}%`
                : ''
            }
            labelLine={false}
          >
            {groupData.map((_, i) => (
              <Cell
                key={i}
                fill={CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length]}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            {...themedTooltipProps}
            formatter={(v: number, name: string) => [
              `${
                hasFinancialAccess
                  ? formatCurrency(v)
                  : `${formatNumber(v, 2)} L`
              } (${((v / total) * 100).toFixed(1)}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Group table — drillable to routes via row expansion                         */
/* -------------------------------------------------------------------------- */

function CompanyGroupTable({
  groups,
  routes,
  company,
  filters,
  hasFinancialAccess,
}: {
  groups: GroupStat[];
  routes: RouteStat[];
  company: string;
  filters: TripStatisticsParams;
  hasFinancialAccess: boolean;
}) {
  const { t } = useTranslation();

  /* ---- Group columns ---- */

  const columns = React.useMemo<ColumnDef<GroupStat>[]>(() => {
    const base: ColumnDef<GroupStat>[] = [
      {
        accessorKey: 'group_name',
        header: () => (
          <span className="text-xs sm:text-sm">
            {t('trips.statistics.companies.group')}
          </span>
        ),
        cell: ({ row }) => {
          const isExpanded = row.getIsExpanded();
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <ChevronRight
                className={cn(
                  'h-3 w-3 text-muted-foreground shrink-0 transition-transform rtl:rotate-180',
                  isExpanded && 'rotate-90 rtl:rotate-90',
                )}
              />
              <span className="font-medium text-xs sm:text-sm truncate">
                {row.original.group_name}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'total_trips',
        header: () => (
          <span className="block text-end text-xs sm:text-sm">
            {t('trips.statistics.excel.cols.trips')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-xs sm:text-sm">
            {formatNumber(row.original.total_trips, 0)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'total_volume',
        header: () => (
          <span className="block text-end text-xs sm:text-sm">
            <span className="hidden sm:inline">
              {t('trips.statistics.excel.cols.volume')}
            </span>
            <span className="sm:hidden">Vol (L)</span>
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-xs sm:text-sm">
            {formatNumber(row.original.total_volume, 2)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'total_distance',
        header: () => (
          <span className="block text-end text-xs sm:text-sm">
            <span className="hidden sm:inline">
              {t('trips.statistics.excel.cols.distance')}
            </span>
            <span className="sm:hidden">Dist (km)</span>
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-xs sm:text-sm">
            {formatNumber(row.original.total_distance, 2)}
          </span>
        ),
        meta: { align: 'end' },
      },
    ];

    if (!hasFinancialAccess) return base;

    return [
      ...base,
      {
        accessorKey: 'total_revenue',
        header: () => (
          <span className="block text-end text-xs sm:text-sm">
            <span className="hidden lg:inline">
              {t('trips.statistics.excel.cols.revenue')}
            </span>
            <span className="lg:hidden">Rev</span>
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-success text-xs sm:text-sm font-medium">
            {formatCurrency(row.original.total_revenue)}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'car_rental',
        header: () => (
          <span className="block text-end text-xs sm:text-sm">
            <span className="hidden xl:inline">
              {t('trips.statistics.excel.cols.carRent')}
            </span>
            <span className="xl:hidden">Rent</span>
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-muted-foreground text-xs sm:text-sm">
            {row.original.car_rental
              ? formatCurrency(row.original.car_rental)
              : '—'}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        accessorKey: 'vat',
        header: () => (
          <span className="block text-end text-xs sm:text-sm">VAT</span>
        ),
        cell: ({ row }) => (
          <span className="block text-end tabular-nums text-muted-foreground text-xs sm:text-sm">
            {row.original.vat ? formatCurrency(row.original.vat) : '—'}
          </span>
        ),
        meta: { align: 'end' },
      },
      {
        id: 'total',
        header: () => (
          <span className="block text-end text-xs sm:text-sm font-semibold">
            <span className="hidden sm:inline">
              {t('trips.statistics.excel.cols.totalAmount')}
            </span>
            <span className="sm:hidden">Total</span>
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-end font-semibold tabular-nums text-xs sm:text-sm">
            {formatCurrency(
              row.original.total_with_vat || row.original.total_revenue,
            )}
          </span>
        ),
        meta: { align: 'end' },
      },
    ];
  }, [t, hasFinancialAccess]);

  /* ---- Footer totals ---- */

  const footer = React.useMemo(() => {
    if (!hasFinancialAccess) {
      return (rows: GroupStat[]) => [
        <span className="font-bold text-xs sm:text-sm">
          {t('trips.statistics.carTable.totals')}
        </span>,
        <span className="text-xs sm:text-sm">
          {formatNumber(
            rows.reduce((s, r) => s + (r.total_trips || 0), 0),
            0,
          )}
        </span>,
        <span className="text-xs sm:text-sm">
          {formatNumber(
            rows.reduce((s, r) => s + (r.total_volume || 0), 0),
            2,
          )}
        </span>,
        <span className="text-xs sm:text-sm">
          {formatNumber(
            rows.reduce((s, r) => s + (r.total_distance || 0), 0),
            2,
          )}
        </span>,
      ];
    }
    return (rows: GroupStat[]) => [
      <span className="font-bold text-xs sm:text-sm">
        {t('trips.statistics.carTable.totals')}
      </span>,
      <span className="text-xs sm:text-sm">
        {formatNumber(
          rows.reduce((s, r) => s + (r.total_trips || 0), 0),
          0,
        )}
      </span>,
      <span className="text-xs sm:text-sm">
        {formatNumber(
          rows.reduce((s, r) => s + (r.total_volume || 0), 0),
          2,
        )}
      </span>,
      <span className="text-xs sm:text-sm">
        {formatNumber(
          rows.reduce((s, r) => s + (r.total_distance || 0), 0),
          2,
        )}
      </span>,
      <span className="text-success text-xs sm:text-sm font-medium">
        {formatCurrency(rows.reduce((s, r) => s + (r.total_revenue || 0), 0))}
      </span>,
      <span className="text-xs sm:text-sm">
        {formatCurrency(rows.reduce((s, r) => s + (r.car_rental || 0), 0))}
      </span>,
      <span className="text-xs sm:text-sm">
        {formatCurrency(rows.reduce((s, r) => s + (r.vat || 0), 0))}
      </span>,
      <span className="font-bold text-xs sm:text-sm">
        {formatCurrency(
          rows.reduce(
            (s, r) => s + (r.total_with_vat || r.total_revenue || 0),
            0,
          ),
        )}
      </span>,
    ];
  }, [t, hasFinancialAccess]);

  /* ---- Group → routes drill-down ---- */

  const renderRoutesForGroup = React.useCallback(
    (row: Row<GroupStat>) => (
      <RoutesSubTable
        group={row.original}
        routes={matchRoutesToGroup(row.original, routes)}
        company={company}
        filters={filters}
        hasFinancialAccess={hasFinancialAccess}
      />
    ),
    [routes, company, filters, hasFinancialAccess],
  );

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/20 p-6 sm:p-8 text-xs sm:text-sm text-muted-foreground text-center">
        {t('trips.statistics.companies.noBreakdown')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-3 sm:-mx-4 md:mx-0">
      <div className="min-w-full inline-block align-middle px-3 sm:px-4 md:px-0">
        <DataTable
          columns={columns}
          data={groups}
          footer={footer}
          pageSize={50}
          getRowCanExpand={() => true}
          renderSubComponent={renderRoutesForGroup}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Routes sub-table (level 2 of the drill-down) — inset under a group row      */
/* -------------------------------------------------------------------------- */

function RoutesSubTable({
  group,
  routes,
  company,
  filters,
  hasFinancialAccess,
}: {
  group: GroupStat;
  routes: RouteStat[];
  company: string;
  filters: TripStatisticsParams;
  hasFinancialAccess: boolean;
}) {
  const { t } = useTranslation();
  const [expandedRoute, setExpandedRoute] = React.useState<string | null>(null);

  if (routes.length === 0) {
    return (
      <div className="border-l-2 border-primary/30 ms-4 my-2 p-3 text-xs text-muted-foreground italic">
        {t('trips.statistics.companies.noRoutesForGroup', {
          group: group.group_name,
        })}
      </div>
    );
  }

  return (
    <div className="border-l-2 border-primary/30 ms-4 my-2 me-2">
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <RouteIcon className="h-3 w-3" />
        {t('trips.statistics.companies.routesInGroup', {
          count: routes.length,
        })}
      </div>
      <table className="w-full text-xs">
        <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-start font-medium">
              {t('trips.statistics.excel.cols.route')}
            </th>
            <th className="px-3 py-2 text-end font-medium">
              {t('trips.statistics.excel.cols.trips')}
            </th>
            <th className="px-3 py-2 text-end font-medium hidden sm:table-cell">
              <span className="hidden sm:inline">
                {t('trips.statistics.excel.cols.volume')}
              </span>
            </th>
            <th className="px-3 py-2 text-end font-medium hidden md:table-cell">
              {t('trips.statistics.excel.cols.distance')}
            </th>
            {hasFinancialAccess && (
              <>
                <th className="px-3 py-2 text-end font-medium">
                  <span className="hidden lg:inline">
                    {t('trips.statistics.excel.cols.revenue')}
                  </span>
                  <span className="lg:hidden">Rev</span>
                </th>
                <th className="px-3 py-2 text-end font-medium">
                  <span className="hidden sm:inline">
                    {t('trips.statistics.excel.cols.totalAmount')}
                  </span>
                  <span className="sm:hidden">Total</span>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {routes.map((route) => {
            const isOpen = expandedRoute === route.route_name;
            const cars = route.cars ?? [];
            return (
              <React.Fragment key={route.route_name}>
                <tr
                  onClick={() =>
                    setExpandedRoute((prev) =>
                      prev === route.route_name ? null : route.route_name,
                    )
                  }
                  className={cn(
                    'border-t border-border/50 cursor-pointer transition-colors hover:bg-muted/40',
                    isOpen && 'bg-muted/30',
                  )}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ChevronRight
                        className={cn(
                          'h-3 w-3 text-muted-foreground shrink-0 transition-transform rtl:rotate-180',
                          isOpen && 'rotate-90 rtl:rotate-90',
                        )}
                      />
                      <span className="truncate font-medium">
                        {route.route_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {formatNumber(route.total_trips, 0)}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums hidden sm:table-cell">
                    {formatNumber(route.total_volume, 2)}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums hidden md:table-cell">
                    {formatNumber(route.total_distance, 2)}
                  </td>
                  {hasFinancialAccess && (
                    <>
                      <td className="px-3 py-2 text-end tabular-nums text-success font-medium">
                        {formatCurrency(route.total_revenue)}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums font-semibold">
                        {formatCurrency(
                          route.total_with_vat || route.total_revenue,
                        )}
                      </td>
                    </>
                  )}
                </tr>
                {isOpen && (
                  <tr className="bg-muted/10">
                    <td
                      colSpan={hasFinancialAccess ? 6 : 4}
                      className="p-0"
                    >
                      <RouteBreakdownPanel
                        route={route}
                        cars={cars}
                        company={company}
                        filters={filters}
                        hasFinancialAccess={hasFinancialAccess}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Route breakdown panel (level 3) — per-vehicle / per-day toggle              */
/* -------------------------------------------------------------------------- */

function RouteBreakdownPanel({
  route,
  cars,
  company,
  filters,
  hasFinancialAccess,
}: {
  route: RouteStat;
  cars: CarStat[];
  company: string;
  filters: TripStatisticsParams;
  hasFinancialAccess: boolean;
}) {
  const { t } = useTranslation();
  const [view, setView] = React.useState<'vehicle' | 'day'>('vehicle');

  const toggleButton = (
    value: 'vehicle' | 'day',
    icon: React.ReactNode,
    label: string,
  ) => (
    <button
      type="button"
      onClick={() => setView(value)}
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
        view === value
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted/60',
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex justify-end px-3 pt-2">
        <div className="inline-flex items-center gap-0.5 rounded-md border border-border/50 bg-muted/30 p-0.5">
          {toggleButton(
            'vehicle',
            <CarIcon className="h-3 w-3" />,
            t('trips.statistics.companies.perVehicle'),
          )}
          {toggleButton(
            'day',
            <CalendarIcon className="h-3 w-3" />,
            t('trips.statistics.companies.perDay'),
          )}
        </div>
      </div>
      {view === 'vehicle' ? (
        <CarsSubTable cars={cars} hasFinancialAccess={hasFinancialAccess} />
      ) : (
        <DaysSubTable
          route={route}
          company={company}
          filters={filters}
          hasFinancialAccess={hasFinancialAccess}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Trip ↔ route matching (for the per-day view)                                */
/* -------------------------------------------------------------------------- */

/**
 * The statistics service only aggregates routes per vehicle, so the per-day
 * view is derived client-side from raw trips. Trips are matched to a route
 * with the same heuristics spirit as `matchRoutesToGroup`:
 *   1. terminal + drop_off_point (terminal-dropoff routes)
 *   2. terminal only (terminal routes)
 *   3. per-trip fee equals the route fee (Watanya fee-tier routes)
 *   4. route named after the drop-off point / terminal (fallback)
 */
function matchTripsToRoute(
  route: RouteStat,
  trips: Trip[],
  company: string,
): Trip[] {
  const pool = company ? trips.filter((t) => t.company === company) : trips;

  if (route.terminal && route.drop_off_point) {
    return pool.filter(
      (t) =>
        t.terminal === route.terminal &&
        t.drop_off_point === route.drop_off_point,
    );
  }

  if (route.terminal) {
    return pool.filter((t) => t.terminal === route.terminal);
  }

  if (route.fee != null && route.fee > 0) {
    const byFee = pool.filter((t) => (t.fee || 0) === route.fee);
    if (byFee.length > 0) return byFee;
  }

  return pool.filter(
    (t) =>
      t.drop_off_point === route.route_name ||
      t.terminal === route.route_name,
  );
}

/* -------------------------------------------------------------------------- */
/* Days sub-table (level 3, per-day view) — inset under a route row            */
/* -------------------------------------------------------------------------- */

interface DayRow {
  date: string;
  trips: number;
  volume: number;
  distance: number;
  revenue: number;
  carCount: number;
}

function DaysSubTable({
  route,
  company,
  filters,
  hasFinancialAccess,
}: {
  route: RouteStat;
  company: string;
  filters: TripStatisticsParams;
  hasFinancialAccess: boolean;
}) {
  const { t } = useTranslation();
  const {
    data: trips,
    isLoading,
    isError,
  } = useAllTripsInRange({
    company: filters.company ?? '',
    startDate: filters.startDate ?? '',
    endDate: filters.endDate ?? '',
  });

  const days = React.useMemo<DayRow[]>(() => {
    if (!trips) return [];
    const matched = matchTripsToRoute(route, trips, company);

    const byDate = new Map<
      string,
      Omit<DayRow, 'date' | 'carCount'> & { cars: Set<string> }
    >();
    for (const trip of matched) {
      const date = (trip.date || '').slice(0, 10);
      if (!date) continue;
      const day =
        byDate.get(date) ??
        { trips: 0, volume: 0, distance: 0, revenue: 0, cars: new Set<string>() };
      day.trips += 1;
      day.volume += trip.tank_capacity || 0;
      day.distance += trip.mileage || trip.distance || 0;
      day.revenue += trip.revenue || trip.fee || 0;
      day.cars.add(trip.car_no_plate);
      byDate.set(date, day);
    }

    return [...byDate.entries()]
      .map(([date, { cars, ...rest }]) => ({
        date,
        ...rest,
        carCount: cars.size,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [trips, route, company]);

  if (isLoading) {
    return (
      <div className="border-l-2 border-success/40 ms-4 my-2 flex items-center gap-2 p-2.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-l-2 border-destructive/40 ms-4 my-2 p-2.5 text-[11px] text-muted-foreground italic">
        {t('trips.statistics.companies.dailyLoadError')}
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="border-l-2 border-success/40 ms-4 my-2 p-2.5 text-[11px] text-muted-foreground italic">
        {t('trips.statistics.companies.noDaysForRoute')}
      </div>
    );
  }

  return (
    <div className="border-l-2 border-success/40 ms-4 my-2 me-2">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <CalendarIcon className="h-3 w-3" />
        {t('trips.statistics.companies.daysForRoute', { count: days.length })}
      </div>
      <table className="w-full text-[11px] sm:text-xs">
        <thead className="bg-muted/20 text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 text-start font-medium">
              {t('trips.statistics.companies.date')}
            </th>
            <th className="px-3 py-1.5 text-end font-medium">
              {t('trips.statistics.excel.cols.trips')}
            </th>
            <th className="px-3 py-1.5 text-end font-medium">
              <span className="hidden sm:inline">
                {t('trips.statistics.carTable.liters')}
              </span>
              <span className="sm:hidden">L</span>
            </th>
            <th className="px-3 py-1.5 text-end font-medium hidden md:table-cell">
              {t('trips.statistics.carTable.distance')}
            </th>
            <th className="px-3 py-1.5 text-end font-medium">
              <span className="hidden sm:inline">
                {t('trips.statistics.companies.vehiclesCol')}
              </span>
              <span className="sm:hidden">
                <CarIcon className="h-3 w-3 inline" />
              </span>
            </th>
            {hasFinancialAccess && (
              <th className="px-3 py-1.5 text-end font-medium">
                <span className="hidden lg:inline">
                  {t('trips.statistics.excel.cols.totalAmount')}
                </span>
                <span className="lg:hidden">Total</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr
              key={day.date}
              className="border-t border-border/30 hover:bg-muted/30"
            >
              <td className="px-3 py-1.5 font-medium tabular-nums">
                {fmtDate(day.date)}
              </td>
              <td className="px-3 py-1.5 text-end tabular-nums">
                {formatNumber(day.trips, 0)}
              </td>
              <td className="px-3 py-1.5 text-end tabular-nums">
                {formatNumber(day.volume, 2)}
              </td>
              <td className="px-3 py-1.5 text-end tabular-nums hidden md:table-cell">
                {formatNumber(day.distance, 2)}
              </td>
              <td className="px-3 py-1.5 text-end tabular-nums text-muted-foreground">
                {day.carCount}
              </td>
              {hasFinancialAccess && (
                <td className="px-3 py-1.5 text-end tabular-nums font-semibold">
                  {formatCurrency(day.revenue)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cars sub-table (level 3) — inset under a route row                          */
/* -------------------------------------------------------------------------- */

function CarsSubTable({
  cars,
  hasFinancialAccess,
}: {
  cars: CarStat[];
  hasFinancialAccess: boolean;
}) {
  const { t } = useTranslation();

  if (cars.length === 0) {
    return (
      <div className="border-l-2 border-success/40 ms-4 my-2 p-2.5 text-[11px] text-muted-foreground italic">
        {t('trips.statistics.companies.noCarsForRoute')}
      </div>
    );
  }

  // Sort by trip count descending so the busiest cars surface first
  const sorted = [...cars].sort(
    (a, b) => (b.total_trips || 0) - (a.total_trips || 0),
  );

  return (
    <div className="border-l-2 border-success/40 ms-4 my-2 me-2">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <CarIcon className="h-3 w-3" />
        {t('trips.statistics.companies.carsForRoute', { count: cars.length })}
      </div>
      <table className="w-full text-[11px] sm:text-xs">
        <thead className="bg-muted/20 text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 text-start font-medium">
              {t('trips.fields.vehicle')}
            </th>
            <th className="px-3 py-1.5 text-end font-medium">
              {t('trips.statistics.excel.cols.trips')}
            </th>
            <th className="px-3 py-1.5 text-end font-medium">
              <span className="hidden sm:inline">
                {t('trips.statistics.carTable.liters')}
              </span>
              <span className="sm:hidden">L</span>
            </th>
            <th className="px-3 py-1.5 text-end font-medium hidden md:table-cell">
              {t('trips.statistics.carTable.distance')}
            </th>
            <th className="px-3 py-1.5 text-end font-medium">
              <span className="hidden sm:inline">
                {t('trips.statistics.cars.workingDaysShort')}
              </span>
              <span className="sm:hidden">Days</span>
            </th>
            {hasFinancialAccess && (
              <th className="px-3 py-1.5 text-end font-medium">
                <span className="hidden lg:inline">
                  {t('trips.statistics.excel.cols.totalAmount')}
                </span>
                <span className="lg:hidden">Total</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((car) => (
            <tr
              key={car.car_no_plate}
              className="border-t border-border/30 hover:bg-muted/30"
            >
              <td className="px-3 py-1.5 font-medium tabular-nums">
                {car.car_no_plate}
              </td>
              <td className="px-3 py-1.5 text-end tabular-nums">
                {formatNumber(car.total_trips, 0)}
              </td>
              <td className="px-3 py-1.5 text-end tabular-nums">
                {formatNumber(car.total_volume, 2)}
              </td>
              <td className="px-3 py-1.5 text-end tabular-nums hidden md:table-cell">
                {formatNumber(car.total_distance, 2)}
              </td>
              <td className="px-3 py-1.5 text-end tabular-nums text-muted-foreground">
                {car.working_days}
              </td>
              {hasFinancialAccess && (
                <td className="px-3 py-1.5 text-end tabular-nums font-semibold">
                  {formatCurrency(
                    car.total_with_vat || car.total_revenue || 0,
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}