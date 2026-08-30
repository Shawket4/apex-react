import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { intentProps, preloadChunk } from '@/shared/lib/prefetch';
import { prefetchFuelEvent } from '@/entities/fuel-event/queries';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  Droplet,
  Gauge,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Link2,
  Download,
  FilterX,
  Loader2,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/shared/lib/cn';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { DataTable } from '@/shared/ui/data-table';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { useIsDesktop } from '@/shared/hooks/use-media-query';
import type { FuelEvent } from '@/entities/fuel-event/schemas';
import type { EfficiencyMap } from '@/shared/lib/fuel';
import { formatCurrency, formatNumber, format } from '@/shared/lib/format';

export type FuelEventGrouping = 'none' | 'vehicle' | 'driver';

interface GroupSummary {
  totalLiters: number;
  totalCost: number;
  avgRate: number;
  eventCount: number;
  trend: 'good' | 'poor' | 'neutral';
  pairedCount: number;
}

/**
 * Summarise a specific subset of events (typically the filter-visible set).
 * The pair analysis map is shared with the page so we don't recompute — we
 * just walk the subset and pull contributions per event.
 */
function summarizeEvents(events: FuelEvent[], map: EfficiencyMap): GroupSummary {
  let totalLiters = 0;
  let totalCost = 0;
  let validLiters = 0;
  let validDistance = 0;
  let pairedCount = 0;

  for (const e of events) {
    totalLiters += e.liters;
    totalCost += e.price;
    const a = map.get(e.ID);
    if (!a) continue;
    if (a.status === 'paired') pairedCount++;
    if (a.isValid) {
      validLiters += a.contributionLiters;
      validDistance += a.contributionDistance;
    }
  }

  const avgRate = validLiters > 0 ? validDistance / validLiters : 0;
  const trend: GroupSummary['trend'] =
    avgRate === 0 ? 'neutral' : avgRate >= 2.0 ? 'good' : avgRate < 1.8 ? 'poor' : 'neutral';

  return { totalLiters, totalCost, avgRate, eventCount: events.length, trend, pairedCount };
}

function groupEvents(
  events: FuelEvent[],
  grouping: FuelEventGrouping,
): Record<string, FuelEvent[]> {
  if (grouping === 'none') return { All: events };
  const buckets: Record<string, FuelEvent[]> = {};
  for (const e of events) {
    const key = grouping === 'vehicle' ? e.car_no_plate : (e.driver_name?.trim() || '—');
    (buckets[key] ??= []).push(e);
  }
  return buckets;
}

/* -------------------------------------------------------------------------- */
/* Flat table (grouping = 'none')                                              */
/* -------------------------------------------------------------------------- */

function FlatTable({
  events,
  map,
  loading,
}: {
  events: FuelEvent[];
  map: EfficiencyMap;
  loading?: boolean;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = React.useMemo<ColumnDef<FuelEvent>[]>(
    () => [
      {
        accessorKey: 'car_no_plate',
        header: t('fuelEvents.fields.carPlate'),
        cell: ({ row }) => <span className="font-mono font-medium tabular-nums">{row.original.car_no_plate}</span>,
      },
      {
        accessorKey: 'driver_name',
        header: t('fuelEvents.fields.driver'),
        cell: ({ row }) => row.original.driver_name ? <span dir="auto" className="truncate">{row.original.driver_name}</span> : <span className="opacity-40">—</span>,
      },
      {
        accessorKey: 'date',
        header: t('fuelEvents.fields.date'),
        cell: ({ row }) => format(row.original.date, 'd MMM yyyy'),
      },
      {
        accessorKey: 'liters',
        header: t('fuelEvents.fields.liters'),
        cell: ({ row }) => <span className="tabular-nums">{`${formatNumber(row.original.liters, 2)} L`}</span>,
      },
      {
        accessorKey: 'price',
        header: t('fuelEvents.fields.totalPrice'),
        cell: ({ row }) => <span className="font-mono tabular-nums text-money">{formatCurrency(row.original.price)}</span>,
      },
      {
        accessorKey: 'fuel_rate',
        header: t('fuelEvents.fields.fuelRate'),
        cell: ({ row }) => {
          const a = map.get(row.original.ID);
          const rate = a?.status === 'paired' ? a.effectiveRate : row.original.fuel_rate;
          if (a?.status === 'paired') {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className={cn(
                      'cursor-help rounded-sm font-medium tabular-nums underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      a.className,
                    )}
                  >
                    {formatNumber(rate, 1)} {t('fuelEvents.efficiency.unit')}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="space-y-0.5">
                    <div>
                      {t('fuelEvents.efficiency.standaloneRate', {
                        rate: formatNumber(row.original.fuel_rate, 2),
                        unit: t('fuelEvents.efficiency.unit'),
                      })}
                    </div>
                    {a.partnerRate !== undefined && a.partnerDate && (
                      <div className="text-muted-foreground">
                        {t('fuelEvents.efficiency.pairedWithDetail', {
                          date: format(a.partnerDate, 'd MMM'),
                          rate: formatNumber(a.partnerRate, 2),
                          unit: t('fuelEvents.efficiency.unit'),
                        })}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }
          return (
            <span className={cn('font-medium tabular-nums', a?.className)}>
              {formatNumber(rate, 1)} {t('fuelEvents.efficiency.unit')}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: t('common.status'),
        cell: ({ row }) => {
          const a = map.get(row.original.ID);
          if (!a) return null;
          const variant =
            a.status === 'good'
              ? 'success'
              : a.status === 'average'
                ? 'warning'
                : a.status === 'poor'
                  ? 'destructive'
                  : a.status === 'paired'
                    ? 'default'
                    : 'secondary';
          return (
            <Badge
              variant={variant as 'success' | 'warning' | 'destructive' | 'secondary' | 'default'}
              className={cn(a.status === 'paired' && 'border-primary/40 bg-primary/10 text-primary')}
            >
              {a.status === 'paired' && <Link2 className="h-3 w-3" />}
              {t(a.labelKey)}
            </Badge>
          );
        },
      },
    ],
    [t, map],
  );

  return (
    <DataTable
      columns={columns}
      data={events}
      loading={loading}
      onRowClick={(row) => navigate(`/fuel-events/${row.ID}`)}
      // Intent: the details page mounts the event by id.
      onRowIntent={(row) => {
        preloadChunk('fuel-event-details');
        prefetchFuelEvent(queryClient, row.ID);
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Grouped cards                                                               */
/* -------------------------------------------------------------------------- */

interface GroupCardProps {
  groupKey: string;
  /** Events visible to the user after filtering. May be empty. */
  visibleEvents: FuelEvent[];
  /** Original (pre-filter) count — used to detect "filter hid everything" */
  originalCount: number;
  map: EfficiencyMap;
  grouping: 'vehicle' | 'driver';
  defaultOpen: boolean;
  alwaysOpen: boolean;
  onExport: (events: FuelEvent[]) => void;
  exporting: boolean;
}

function GroupCard({
  groupKey,
  visibleEvents,
  originalCount,
  map,
  grouping,
  defaultOpen,
  alwaysOpen,
  onExport,
  exporting,
}: GroupCardProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(defaultOpen);
  const isOpen = alwaysOpen || open;

  // Stats are computed on the VISIBLE (filtered) set so totals match what
  // the user sees. Pair analysis still came from the full pre-filter set
  // so statuses are stable.
  const summary = React.useMemo(
    () => summarizeEvents(visibleEvents, map),
    [visibleEvents, map],
  );

  const TrendIcon = summary.trend === 'good' ? TrendingUp : TrendingDown;
  const trendClass =
    summary.trend === 'good'
      ? 'text-success'
      : summary.trend === 'poor'
        ? 'text-destructive'
        : 'text-muted-foreground';

  const filterHidAll = originalCount > 0 && visibleEvents.length === 0;

  return (
    <Card className="flex flex-col overflow-hidden shadow-none">
      {/* Header */}
      <div
        className={cn(
          'border-b bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          !alwaysOpen && 'cursor-pointer select-none transition-colors hover:bg-muted/50',
        )}
        onClick={alwaysOpen ? undefined : (e) => {
          // Ignore clicks on the export button
          if ((e.target as HTMLElement).closest('[data-stop-propagation]')) return;
          setOpen((v) => !v);
        }}
        onKeyDown={
          alwaysOpen
            ? undefined
            : (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                  e.preventDefault();
                  setOpen((v) => !v);
                }
              }
        }
        role={alwaysOpen ? undefined : 'button'}
        tabIndex={alwaysOpen ? undefined : 0}
        aria-expanded={alwaysOpen ? undefined : isOpen}
      >
        {/* Row 1: group name + trend + chevron + export */}
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn('truncate text-[15px] font-semibold', grouping === 'vehicle' && 'font-mono tabular-nums')}
              dir={grouping === 'driver' ? 'auto' : undefined}
              title={groupKey}
            >
              {groupKey}
            </span>
            <TrendIcon className={cn('h-3.5 w-3.5 shrink-0', trendClass)} />
            {summary.pairedCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-medium text-primary">
                    <Link2 className="h-3 w-3" />
                    <span className="font-mono tabular-nums">{summary.pairedCount}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t('fuelEvents.efficiency.pairedCount', { count: summary.pairedCount })}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Export button — stops propagation so it doesn't toggle the card */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-stop-propagation
                onClick={(e) => {
                  e.stopPropagation();
                  if (visibleEvents.length > 0 && !exporting) onExport(visibleEvents);
                }}
                disabled={exporting || visibleEvents.length === 0}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                aria-label={t('common.export')}
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{t('common.export')}</TooltipContent>
          </Tooltip>

          {!alwaysOpen && (
            <ChevronDown
              className={cn(
                'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
              aria-hidden
            />
          )}
        </div>

        {/* Row 2: inline stats */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Stat
            icon={<Droplet className="h-3 w-3" />}
            label={`${formatNumber(summary.totalLiters, 1)} L`}
          />
          <Stat
            icon={<Gauge className="h-3 w-3" />}
            label={`${formatNumber(summary.avgRate, 1)} ${t('fuelEvents.efficiency.unit')}`}
            className={trendClass}
          />
          <Stat
            icon={<DollarSign className="h-3 w-3" />}
            label={formatCurrency(summary.totalCost)}
            className="font-mono text-money"
          />
          <span className="text-muted-foreground">
            {t('fuelEvents.stats.events', { count: summary.eventCount })}
            {filterHidAll ? '' : originalCount !== summary.eventCount && ` / ${originalCount}`}
          </span>
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <CardContent className="p-0">
          {filterHidAll ? (
            <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-6 text-center text-xs text-muted-foreground">
              <FilterX className="h-6 w-6 text-muted-foreground/60" aria-hidden />
              <p className="text-xs text-muted-foreground">
                {t('fuelEvents.noMatchingEvents')}
              </p>
            </div>
          ) : (
            <ul className="max-h-[280px] divide-y overflow-y-auto md:max-h-[320px]">
              {visibleEvents.map((e) => {
                const a = map.get(e.ID);
                const distance = Math.max(0, e.odometer_after - e.odometer_before);
                const displayRate = a?.status === 'paired' ? a.effectiveRate : e.fuel_rate;
                return (
                  <li key={e.ID}>
                    <button
                      type="button"
                      onClick={() => navigate(`/fuel-events/${e.ID}`, { state: { from: `${window.location.pathname}${window.location.search}` } })}
                      {...intentProps(() => {
                        preloadChunk('fuel-event-details');
                        prefetchFuelEvent(queryClient, e.ID);
                      })}
                      className="grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-3 py-2.5 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3 shrink-0" />
                        <span className="shrink-0">{format(e.date, 'd MMM yyyy')}</span>
                        {grouping === 'driver' && (
                          <>
                            <span>·</span>
                            <span className="shrink-0 font-mono tabular-nums text-foreground">{e.car_no_plate}</span>
                          </>
                        )}
                        {grouping === 'vehicle' && e.driver_name && (
                          <>
                            <span>·</span>
                            <span className="truncate" dir="auto">{e.driver_name}</span>
                          </>
                        )}
                        {a?.status === 'paired' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link2 className="h-3 w-3 shrink-0 text-primary" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {t('fuelEvents.efficiency.pairedWith')}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-money">
                        {formatCurrency(e.price)}
                      </span>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
                          <Droplet className="h-3 w-3" />
                          {formatNumber(e.liters, 2)} L
                        </span>
                        <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
                          <Gauge className="h-3 w-3" />
                          {formatNumber(distance, 0)} km
                        </span>
                      </div>
                      {a?.status === 'paired' ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              className={cn(
                                'cursor-help rounded-sm text-xs font-medium tabular-nums underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                a.className,
                              )}
                            >
                              {formatNumber(displayRate, 1)} {t('fuelEvents.efficiency.unit')}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="space-y-0.5">
                              <div>
                                {t('fuelEvents.efficiency.standaloneRate', {
                                  rate: formatNumber(e.fuel_rate, 2),
                                  unit: t('fuelEvents.efficiency.unit'),
                                })}
                              </div>
                              {a.partnerRate !== undefined && a.partnerDate && (
                                <div className="text-muted-foreground">
                                  {t('fuelEvents.efficiency.pairedWithDetail', {
                                    date: format(a.partnerDate, 'd MMM'),
                                    rate: formatNumber(a.partnerRate, 2),
                                    unit: t('fuelEvents.efficiency.unit'),
                                  })}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium tabular-nums', a?.className)}>
                          <span>{formatNumber(displayRate, 1)} {t('fuelEvents.efficiency.unit')}</span>
                          {a?.status === 'excluded' && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                              {t('fuelEvents.efficiency.excluded')}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Stat({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', className)}>
      {icon}
      <span className="tabular-nums">{label}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading skeleton                                                            */
/* -------------------------------------------------------------------------- */

function GroupCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-none">
      <div className="border-b bg-card p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 flex-1 rounded-sm" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
        <div className="mt-2 flex gap-3">
          <Skeleton className="h-3 w-16 rounded-sm" />
          <Skeleton className="h-3 w-20 rounded-sm" />
          <Skeleton className="h-3 w-24 rounded-sm" />
        </div>
      </div>
      <div className="p-3">
        <Skeleton className="h-10 w-full rounded-none" />
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Public component                                                            */
/* -------------------------------------------------------------------------- */

interface FuelEventsTableProps {
  /** Events visible after filtering — already sorted by caller */
  events: FuelEvent[];
  /** Original (pre-filter) events — used for original counts + grouping keys */
  originalEvents: FuelEvent[];
  grouping: FuelEventGrouping;
  loading?: boolean;
  /** Pair analysis map (computed on the original set) */
  analysis: EfficiencyMap;
  /** Callback when the user exports a single group's events */
  onExportGroup?: (groupKey: string, events: FuelEvent[]) => void | Promise<void>;
  exportingGroup?: string | null;
}

export function FuelEventsTable({
  events,
  originalEvents,
  grouping,
  loading,
  analysis,
  onExportGroup,
  exportingGroup,
}: FuelEventsTableProps) {
  const isDesktop = useIsDesktop();

  if (loading && grouping !== 'none') {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <GroupCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (grouping === 'none') {
    return <FlatTable events={events} map={analysis} loading={loading} />;
  }

  // Group original (unfiltered) events so cards stay present while filter changes.
  // Within each card we show only the visible events.
  const originalGroups = groupEvents(originalEvents, grouping);
  const visibleGroups = groupEvents(events, grouping);

  const sortedKeys = Object.keys(originalGroups).sort(
    (a, b) =>
      originalGroups[b].reduce((s, e) => s + e.price, 0) -
      originalGroups[a].reduce((s, e) => s + e.price, 0),
  );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {sortedKeys.map((key, i) => (
        <GroupCard
          key={key}
          groupKey={key}
          visibleEvents={visibleGroups[key] ?? []}
          originalCount={originalGroups[key].length}
          map={analysis}
          grouping={grouping}
          // Mobile: all cards closed initially. Desktop: always open (alwaysOpen=true)
          // so defaultOpen doesn't matter but we set false for consistency.
          defaultOpen={isDesktop && i < 3}
          alwaysOpen={isDesktop}
          onExport={(evts) => onExportGroup?.(key, evts)}
          exporting={exportingGroup === key}
        />
      ))}
    </div>
  );
}

// Re-export analyseEvents from the library for the page to call directly.
export { analyseEvents } from '@/shared/lib/fuel';