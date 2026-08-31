import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
  LayoutDashboard,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import {
  formatDrawerDuration,
  tileStatus,
  type Attention,
  type Dashboard,
  type DashboardException,
  type FleetEntry,
  type LiveVehicle,
  type TileStatus,
} from '@/entities/dashboard/schemas';
import {
  prefetchDrawer,
  prefetchTruckDay,
  useDashboard,
  useDrawer,
  useInfiniteFuelEvents,
  useTruckDay,
  type DrawerKind,
} from '@/entities/dashboard/queries';
import { prefetchFuelEvent } from '@/entities/fuel-event/queries';
import { analyseEvents } from '@/shared/lib/fuel';
import { type DashboardScope } from '@/entities/dashboard/api';
import { OilChangeFilterChips } from '@/entities/oil-change/filter-chips';
import { OilChangeDetailSheet } from '@/widgets/oil-change-detail/oil-change-detail-sheet';
import type { OilChangeDue } from '@/entities/dashboard/schemas';
import { keepScopeSearch, useScope, useScopeCompany } from '@/shared/scope';
import { cairoToday } from '@/shared/lib/cairo';
import { useEtitLive } from '@/shared/hooks/use-etit-live';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { intentProps, preloadChunkForPath } from '@/shared/lib/prefetch';
import { prefetchTrips } from '@/entities/trip/queries';
import { defaultTripListParams } from '@/entities/trip/defaults';
import { prefetchLedgerMount } from '@/entities/transaction/queries';
import { Button } from '@/shared/ui/button';
import { PageShell } from '@/shared/ui/page-shell';
import { Skeleton } from '@/shared/ui/skeleton';
import { format, formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* The dashboard                                                               */
/*                                                                            */
/* Two independent requests paint this page:                                   */
/*   apex-rust  → one MessagePack payload: figures, fleet identity, exceptions */
/*   etit-proxy → an SSE stream of live vehicle status                         */
/* Neither waits for or can take down the other. Every card opens into detail  */
/* on its own lazy call, and hovering a card warms that call before the click  */
/* (see entities/dashboard/queries.ts — the Madar intent-prefetch pattern).    */
/* -------------------------------------------------------------------------- */

/** Compact money: 4.06M / 982k / 750. The exact figures live in the drawers. */
function compactMoney(decimal: string): string {
  const v = Number.parseFloat(decimal);
  if (!Number.isFinite(v)) return decimal;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 10_000) return `${Math.round(v / 1_000)}k`;
  return formatNumber(v, 0);
}

function pctDelta(now: string, prev: string): number | null {
  const a = Number.parseFloat(now);
  const b = Number.parseFloat(prev);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { atLeast } = usePermissions();
  const showMoney = atLeast(PERMISSION_LEVELS.ADMIN);

  // Dates come from the global header scope (URL); company is the page's own
  // dimension, also in the URL (?co=) so a filtered view survives refresh.
  const { range } = useScope();
  const { company } = useScopeCompany();
  const scope = React.useMemo(
    () => ({ from: range.from, to: range.to, company }),
    [range.from, range.to, company],
  );
  const dashboard = useDashboard(scope);
  const hasFleet = (dashboard.data?.fleet.length ?? 0) > 0;
  const live = useEtitLive(hasFleet);

  // Cairo's calendar day, not UTC's — at 00:58 Cairo the UTC date is still
  // yesterday and the headline said so.
  const t0 = cairoToday();
  const today = `${t0.y}-${String(t0.m + 1).padStart(2, '0')}-${String(t0.d).padStart(2, '0')}`;
  const asOf = dashboard.data?.as_of;

  return (
    // The same PageShell every other screen uses — one page frame, one title
    // and description slot, one actions slot. The connection badge is this
    // page's action; the date is its title.
    <PageShell
      icon={<LayoutDashboard className="h-5 w-5" />}
      title={format(today, 'EEEE d MMMM')}
      description={
        <>
          {range.from === range.to
            ? format(range.from, 'd MMMM yyyy')
            : `${format(range.from, 'd MMM')} – ${format(range.to, 'd MMM yyyy')}`}
          {company && ` · ${company}`}
          {asOf && ` · ${t('dashboard.updatedAt', { time: format(asOf, 'HH:mm') })}`}
        </>
      }
      actions={<ConnectionBadge live={live} />}
    >
      {/* ---- apex zone: figures, or an honest strip ---- */}
      {dashboard.isError ? (
        <DegradedStrip
          message={t('dashboard.apexDown')}
          onRetry={() => void dashboard.refetch()}
        />
      ) : dashboard.isPending ? (
        <div className={cn('grid grid-cols-2 gap-3', showMoney ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
          {Array.from({ length: showMoney ? 4 : 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-lg" />
          ))}
        </div>
      ) : (
        <KpiRow data={dashboard.data} showMoney={showMoney} scope={scope} />
      )}

      {/* ---- fleet + exceptions ---- */}
      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <PanelHead
            title={t('dashboard.fleet.title')}
            aside={
              live.connection === 'live'
                ? t('dashboard.fleet.live')
                : live.connection === 'connecting'
                  ? t('dashboard.fleet.connecting')
                  : t('dashboard.fleet.fromTrips')
            }
          />
          <div className="p-3">
            {live.connection === 'down' && (
              <DegradedStrip
                message={t('dashboard.fleet.streamDown')}
                onRetry={live.refresh}
                compact
              />
            )}
            {dashboard.data ? (
              <FleetGrid
                fleet={dashboard.data.fleet}
                vehicles={live.vehicles}
                connection={live.connection}
                today={today}
              />
            ) : (
              <Skeleton className="h-40 rounded-lg" />
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border bg-card">
          <PanelHead title={t('dashboard.exceptions.title')} />
          <div className="p-3">
            {dashboard.isError ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t('dashboard.exceptions.unavailable')}
              </p>
            ) : dashboard.isPending ? (
              <div className="grid gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : dashboard.data && dashboard.data.exceptions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t('dashboard.exceptions.allClear')}
              </p>
            ) : (
              <div className="grid gap-2">
                {(dashboard.data?.exceptions ?? []).map((e) => (
                  <ExceptionRow key={e.key} exception={e} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ---- what falls due: papers and services, both dated ---- */}
      <AttentionPanel attention={dashboard.data?.attention} pending={dashboard.isPending} />

      {/* ---- fuel events (money only): the window's ledger, lazily ---- */}
      {showMoney && <FuelPanel scope={scope} />}

      {/* ---- cash out by category (money only) ---- */}
      {showMoney && dashboard.data?.money && dashboard.data.money.by_category.length > 0 && (
        <section className="overflow-hidden rounded-lg border bg-card">
          <PanelHead
            title={t('dashboard.cash.title')}
            aside={format(today, 'MMMM')}
          />
          <div className="p-3">
            <CategoryBars categories={dashboard.data.money.by_category} />
          </div>
        </section>
      )}
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Connection badge                                                            */
/* -------------------------------------------------------------------------- */

function ConnectionBadge({ live }: { live: ReturnType<typeof useEtitLive> }) {
  const { t } = useTranslation();
  const state = live.connection;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        state === 'live' && 'border-success/40 bg-success/10 text-success',
        state === 'connecting' && 'border-border bg-muted text-muted-foreground',
        state === 'down' && 'border-warning/40 bg-warning/10 text-warning',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          state === 'live' && 'animate-pulse bg-success motion-reduce:animate-none',
          state === 'connecting' && 'animate-pulse bg-muted-foreground motion-reduce:animate-none',
          state === 'down' && 'bg-warning',
        )}
        aria-hidden
      />
      {state === 'live'
        ? live.lagged
          ? t('dashboard.conn.caughtUp')
          : t('dashboard.conn.live')
        : state === 'connecting'
          ? t('dashboard.conn.connecting')
          : t('dashboard.conn.notLive')}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Global scope — one date window + company, applied to every card             */
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/* KPI cards                                                                   */
/* -------------------------------------------------------------------------- */

function KpiRow({
  data,
  showMoney,
  scope,
}: {
  data: Dashboard;
  showMoney: boolean;
  scope: DashboardScope;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState<DrawerKind | null>(null);
  const money = showMoney ? data.money : undefined;

  const delta = money ? pctDelta(money.revenue, money.revenue_prev) : null;

  const cards: {
    kind: DrawerKind;
    title: string;
    value: string;
    isMoney: boolean;
    detail: React.ReactNode;
  }[] = money
    ? [
        {
          kind: 'revenue',
          title: t('dashboard.kpi.revenue'),
          value: compactMoney(money.revenue),
          isMoney: true,
          detail:
            delta === null ? (
              t('dashboard.kpi.vsPrev')
            ) : (
              <span className={cn('inline-flex items-center gap-1', delta >= 0 ? 'text-success' : 'text-destructive')}>
                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {t('dashboard.kpi.deltaPrev', { pct: Math.abs(delta) })}
              </span>
            ),
        },
        {
          kind: 'cash-out',
          title: t('dashboard.kpi.cashOut'),
          value: compactMoney(money.cash_out),
          isMoney: true,
          detail: (
            <span>
              {t('dashboard.kpi.cashOutSplit', {
                bank: compactMoney(money.cash_out_bank),
                fuel: compactMoney(money.cash_out_fuel),
                advances: compactMoney(money.cash_out_advances),
              })}
              {scope.company && (
                <span className="ms-1 opacity-70">{t('dashboard.kpi.allCompanies')}</span>
              )}
            </span>
          ),
        },
        {
          kind: 'trips',
          title: t('dashboard.kpi.trips'),
          value: formatNumber(data.month.trips, 0),
          isMoney: false,
          detail: t('dashboard.kpi.acrossTrucks', { count: data.month.trucks }),
        },
        {
          kind: 'advances',
          title: t('dashboard.kpi.owed'),
          value: compactMoney(money.owed.total),
          isMoney: true,
          detail: (
            <span className="text-destructive">
              {t('dashboard.kpi.owedSplit', {
                drivers: compactMoney(
                  String(
                    Number(money.owed.driver_advances) + Number(money.owed.driver_loans),
                  ),
                ),
                employees: compactMoney(
                  String(
                    Number(money.owed.employee_advances) + Number(money.owed.employee_loans),
                  ),
                ),
              })}
            </span>
          ),
        },
      ]
    : [
        {
          kind: 'trips',
          title: t('dashboard.kpi.trips'),
          value: formatNumber(data.month.trips, 0),
          isMoney: false,
          detail: t('dashboard.kpi.acrossTrucks', { count: data.month.trucks }),
        },
      ];

  return (
    <div className={cn('grid grid-cols-2 gap-3', money ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
      {cards.map((card) => (
        <KpiCard
          key={card.kind}
          {...card}
          scope={scope}
          isOpen={open === card.kind}
          onToggle={() => setOpen((k) => (k === card.kind ? null : card.kind))}
        />
      ))}
      {!money && (
        <>
          <StaticKpi title={t('dashboard.kpi.litres')} value={formatNumber(data.month.litres, 0)} />
          <StaticKpi title={t('dashboard.kpi.trucks')} value={formatNumber(data.month.trucks, 0)} />
        </>
      )}
    </div>
  );
}

function StaticKpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </dt>
      <dd className="m-0 font-mono text-[22px] font-semibold leading-none tabular-nums">{value}</dd>
    </div>
  );
}

function KpiCard({
  kind,
  title,
  value,
  isMoney,
  detail,
  scope,
  isOpen,
  onToggle,
}: {
  kind: DrawerKind;
  title: string;
  value: string;
  isMoney: boolean;
  detail: React.ReactNode;
  scope: DashboardScope;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const qc = useQueryClient();

  // Intent prefetch: hovering (or focusing, or touching) the card warms the
  // drawer's exact query, so opening it renders from cache. prefetchQuery
  // dedupes, so repeated hovers cost nothing.
  const warm = React.useCallback(() => prefetchDrawer(qc, kind, scope), [qc, kind, scope]);

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', isOpen && 'lg:col-span-1')}>
      <button
        type="button"
        onClick={onToggle}
        onPointerEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
        aria-expanded={isOpen}
        className="block w-full p-3 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <dt className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
          <ChevronDown
            aria-hidden
            className={cn('h-3 w-3 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </dt>
        <dd
          className={cn(
            'm-0 font-mono text-[22px] font-semibold leading-none tabular-nums',
            isMoney && 'text-money',
          )}
        >
          {value}
        </dd>
        <p className="mt-1.5 min-h-[17px] text-[11.5px] text-muted-foreground">{detail}</p>
      </button>
      {isOpen && <KpiDrawer kind={kind} scope={scope} />}
    </div>
  );
}

function KpiDrawer({ kind, scope }: { kind: DrawerKind; scope: DashboardScope }) {
  const { t } = useTranslation();
  const drawer = useDrawer(kind, scope, true);

  if (drawer.isPending) {
    return (
      <div className="space-y-2 border-t bg-muted/40 p-3">
        <Skeleton className="h-3.5 w-3/4 rounded-sm" />
        <Skeleton className="h-3.5 w-2/3 rounded-sm" />
        <Skeleton className="h-3.5 w-4/5 rounded-sm" />
      </div>
    );
  }
  if (drawer.isError) {
    return (
      <p className="border-t bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">
        {t('dashboard.drawer.failed')}
      </p>
    );
  }

  const d = drawer.data;
  let rows: { label: string; value: string }[] = [];
  if (kind === 'revenue' && 'daily' in d && 'companies' in d) {
    rows = (d.companies as { name: string; amount: string }[]).map((c) => ({
      label: c.name,
      value: formatNumber(Number(c.amount), 0),
    }));
  } else if (kind === 'cash-out' && 'by_category' in d) {
    rows = d.by_category.map((c) => ({ label: c.name, value: formatNumber(Number(c.amount), 0) }));
  } else if (kind === 'trips' && 'daily' in d && 'companies' in d) {
    rows = (d.companies as { name: string; trips: number }[]).map((c) => ({
      label: c.name,
      value: formatNumber(c.trips, 0),
    }));
  } else if ('parties' in d) {
    rows = d.parties.slice(0, 8).map((p) => ({
      label: `${p.name} · ${t(`dashboard.owed.${p.audience}`)}${
        p.kind === 'loan' ? ` · ${t('dashboard.owed.loan')}` : ''
      }`,
      value: formatNumber(Number(p.total), 0),
    }));
  }

  return (
    <div className="border-t bg-muted/40 p-3">
      <dl className="space-y-1 text-[12px]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1 last:border-b-0 last:pb-0">
            <dt className="min-w-0 truncate text-muted-foreground" dir="auto">
              {row.label}
            </dt>
            <dd className="m-0 shrink-0 font-mono tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      {kind === 'cash-out' && 'largest' in d && d.largest.length > 0 && (
        <>
          <p className="mb-1.5 mt-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('dashboard.drawer.largest')}
          </p>
          <dl className="space-y-1 text-[12px]">
            {d.largest.map((p, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1 last:border-b-0 last:pb-0">
                <dt className="min-w-0 truncate text-muted-foreground" dir="auto">
                  {p.label}
                </dt>
                <dd className="m-0 shrink-0 font-mono tabular-nums text-money">
                  {formatNumber(Number(p.amount), 0)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Fuel panel — the fuel-events screen's cards, embedded and infinite          */
/* -------------------------------------------------------------------------- */

function FuelPanel({ scope }: { scope: DashboardScope }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const totals = useDrawer('fuel', scope, true);
  const events = useInfiniteFuelEvents(scope, true);

  // Fetched and shown are deliberately different numbers. Hovering the button
  // warms the next page, but a page arriving is not a reason to move the
  // ground under the pointer — rows appear only when the button is pressed.
  const [shownPages, setShownPages] = React.useState(1);
  // A new window is a new list. Without this the counter carries over and the
  // next month opens already expanded to wherever the last one was left.
  React.useEffect(() => {
    setShownPages(1);
  }, [scope.from, scope.to, scope.company]);
  const pages = React.useMemo(() => events.data?.pages ?? [], [events.data]);
  const loaded = React.useMemo(
    () => pages.slice(0, shownPages).flatMap((p) => p.items),
    [pages, shownPages],
  );
  // Same pairing analysis the fuel-events page runs, over what is loaded so
  // far — statuses refine as more pages arrive.
  const analysis = React.useMemo(() => analyseEvents(loaded), [loaded]);
  const total = events.data?.pages[0]?.total ?? 0;

  // Pages load on request, not on sight. Scrolling to the foot of a panel is
  // not the same as asking for more of it — with a sentinel, reaching the
  // bottom of the dashboard kept pulling fuel events, so the page grew away
  // underneath anyone on their way to the panel below it.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = events;

  // There is more to show if a warmed page is being held back, or if the
  // server still has one.
  const hasMore = shownPages < pages.length || hasNextPage;
  // Revealing a page that hover has not already fetched: ask for it and count
  // it as shown. The slice renders it the moment it lands, so there is no
  // second click and no state to reconcile when it does.
  const revealMore = React.useCallback(() => {
    setShownPages((n) => n + 1);
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  // A page asked for but not yet here.
  const awaitingReveal = shownPages > pages.length;

  const drawer = totals.data && 'window_spend' in totals.data ? totals.data : null;

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <PanelHead
        title={t('dashboard.fuelPanel.title')}
        aside={
          drawer
            ? `${formatNumber(Number(drawer.window_spend), 0)} · ${formatNumber(drawer.window_liters, 0)} L · ${t('dashboard.fuelPanel.count', { count: drawer.window_events })}`
            : undefined
        }
      />
      {drawer && drawer.by_method.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
          {drawer.by_method.map((m) => (
            <span
              key={m.method}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
            >
              {m.method}
              <span className="font-mono tabular-nums text-foreground">
                {formatNumber(Number(m.spend), 0)}
              </span>
            </span>
          ))}
        </div>
      )}
      {events.isPending ? (
        <div className="space-y-2 p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : events.isError ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t('dashboard.drawer.failed')}</p>
      ) : loaded.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t('dashboard.fuelPanel.empty')}</p>
      ) : (
        <ul className="max-h-[420px] divide-y overflow-y-auto">
          {loaded.map((e) => {
            const a = analysis.map.get(e.ID);
            const distance = Math.max(0, e.odometer_after - e.odometer_before);
            const displayRate = a?.status === 'paired' ? a.effectiveRate : e.fuel_rate;
            return (
              <li key={e.ID}>
                <Link
                  to={`/fuel-events/${e.ID}`}
                  state={{ from: `${window.location.pathname}${window.location.search}` }}
                  onPointerEnter={() => prefetchFuelEvent(qc, e.ID)}
                  onFocus={() => prefetchFuelEvent(qc, e.ID)}
                  onTouchStart={() => prefetchFuelEvent(qc, e.ID)}
                  className="grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-3 py-2.5 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-4"
                >
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="shrink-0">{format(e.date, 'd MMM yyyy')}</span>
                    <span>·</span>
                    <span className="shrink-0 font-mono tabular-nums text-foreground">
                      {e.car_no_plate}
                    </span>
                    {e.driver_name && (
                      <>
                        <span>·</span>
                        <span className="truncate">{e.driver_name}</span>
                      </>
                    )}
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium">
                      {e.method}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-money">
                    {formatNumber(e.price, 0)}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatNumber(e.liters, 2)} L</span>
                    <span className="tabular-nums">{formatNumber(distance, 0)} km</span>
                  </div>
                  <span className={cn('text-xs font-medium', a?.className)}>
                    {formatNumber(displayRate, 1)} {t('fuelEvents.efficiency.unit')}
                  </span>
                </Link>
              </li>
            );
          })}
          {awaitingReveal && (
            <li className="p-3">
              <Skeleton className="h-10 w-full rounded-none" />
            </li>
          )}
          {hasMore && (
            <li className="p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                disabled={awaitingReveal}
                onClick={revealMore}
                // Hovering the button IS the intent to read on, so the fetch
                // starts before the click lands. fetchNextPage dedupes, so the
                // click then just renders what is already on its way.
                {...intentProps(() => {
                  if (hasNextPage && !isFetchingNextPage) {
                    void fetchNextPage({ cancelRefetch: false });
                  }
                })}
                aria-label={t('dashboard.fuelPanel.loadMore', {
                  loaded: loaded.length,
                  total,
                })}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t('dashboard.fuelPanel.loadMore', { loaded: loaded.length, total })}
              </Button>
            </li>
          )}
          {!hasMore && loaded.length > 0 && (
            <li className="p-3 text-center text-[10.5px] text-muted-foreground">
              {t('dashboard.fuelPanel.end', { count: total })}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Fleet                                                                       */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<TileStatus, { tile: string; dot: string; text: string }> = {
  moving: { tile: 'border-success', dot: 'bg-success', text: 'text-success' },
  idling: { tile: '', dot: 'bg-warning', text: 'text-warning' },
  stopped: { tile: '', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  offline: { tile: '', dot: 'bg-destructive', text: 'text-destructive' },
  unknown: { tile: '', dot: 'bg-border', text: 'text-muted-foreground' },
  untracked: { tile: 'border-dashed opacity-70', dot: 'hidden', text: 'text-muted-foreground' },
};

function FleetGrid({
  fleet,
  vehicles,
  connection,
  today,
}: {
  fleet: FleetEntry[];
  vehicles: Map<string, LiveVehicle> | null;
  connection: 'connecting' | 'live' | 'down';
  today: string;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selected, setSelected] = React.useState<FleetEntry | null>(null);

  const tracked = fleet.filter((f) => f.etit_id !== null);
  const untracked = fleet.filter((f) => f.etit_id === null);
  const haveLive = connection === 'live' && vehicles !== null;

  const statusLine = (entry: FleetEntry, status: TileStatus, liveVehicle?: LiveVehicle) => {
    if (status === 'untracked') return t('dashboard.fleet.notTracked');
    if (haveLive && liveVehicle) {
      if (status === 'moving' && liveVehicle.speed > 0)
        return t('dashboard.fleet.kmh', { speed: Math.round(liveVehicle.speed) });
      return t(`dashboard.fleet.status.${status}`);
    }
    // Stream not live: fall back to the trip record apex sent, so the tile
    // stays useful instead of vanishing.
    if (entry.days_idle === 0) return t('dashboard.fleet.ranToday');
    if (entry.days_idle != null) return t('dashboard.fleet.idleDays', { count: entry.days_idle });
    return t('dashboard.fleet.noTrips');
  };

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-2">
        {tracked.map((entry) => {
          const liveVehicle = entry.etit_id ? vehicles?.get(entry.etit_id) : undefined;
          const status: TileStatus = haveLive
            ? tileStatus(entry, liveVehicle)
            : entry.days_idle != null && entry.days_idle >= 7
              ? 'offline'
              : 'stopped';
          const styles = STATUS_STYLES[status];
          const isSelected = selected?.plate_no === entry.plate_no;
          const warm = () => {
            if (entry.etit_id && connection !== 'down') prefetchTruckDay(qc, entry.etit_id, today);
          };
          return (
            <button
              key={entry.plate_no + entry.plate_ar}
              type="button"
              onClick={() => setSelected(isSelected ? null : entry)}
              onPointerEnter={warm}
              onFocus={warm}
              onTouchStart={warm}
              aria-pressed={isSelected}
              className={cn(
                'relative flex flex-col items-center gap-px rounded-lg border bg-card px-1.5 pb-1.5 pt-2 text-center transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                styles.tile,
                isSelected && 'border-primary bg-primary/10 text-primary',
              )}
            >
              <span
                className={cn('absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full', styles.dot)}
                aria-hidden
              />
              <span className="font-mono text-[17px] font-semibold leading-tight tabular-nums">
                {entry.plate_no}
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground" dir="rtl">
                {entry.plate_ar}
              </span>
              <span className={cn('mt-0.5 text-[9.5px] font-semibold leading-tight', styles.text)}>
                {statusLine(entry, status, liveVehicle)}
              </span>
              {entry.revenue_today != null && entry.revenue_yesterday != null && (
                <span
                  className="mt-0.5 font-mono text-[9px] leading-tight tabular-nums text-money"
                  title={t('dashboard.fleet.revenueHint')}
                >
                  {Number(entry.revenue_today) > 0 || Number(entry.revenue_yesterday) > 0 ? (
                    <>
                      {compactMoney(entry.revenue_today)}
                      <span className="opacity-50"> · </span>
                      <span className="opacity-70">{compactMoney(entry.revenue_yesterday)}</span>
                    </>
                  ) : (
                    <span className="opacity-40">—</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {untracked.length > 0 && (
        <>
          <p className="mb-1.5 mt-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('dashboard.fleet.serviceVehicles')}
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-2">
            {untracked.map((entry) => (
              <div
                key={entry.plate_no + entry.plate_ar}
                className={cn(
                  'flex flex-col items-center gap-px rounded-lg border bg-card px-1.5 pb-1.5 pt-2 text-center',
                  STATUS_STYLES.untracked.tile,
                )}
              >
                <span className="font-mono text-[17px] font-semibold leading-tight tabular-nums">
                  {entry.plate_no}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground" dir="rtl">
                  {entry.plate_ar}
                </span>
                <span className="mt-0.5 text-[9.5px] leading-tight text-muted-foreground">
                  {t('dashboard.fleet.notTracked')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {(['moving', 'idling', 'stopped', 'offline'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <i className={cn('h-1.5 w-1.5 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
            {t(`dashboard.fleet.status.${s}`)}
          </span>
        ))}
      </div>

      {selected && (
        <TruckDrawer entry={selected} today={today} streamDown={connection === 'down'} />
      )}
    </div>
  );
}

function TruckDrawer({
  entry,
  today,
  streamDown,
}: {
  entry: FleetEntry;
  today: string;
  streamDown: boolean;
}) {
  const { t } = useTranslation();
  const summary = useTruckDay(streamDown ? null : entry.etit_id, today);

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1 last:border-b-0 last:pb-0">
      <dt className="min-w-0 truncate text-muted-foreground" dir="auto">
        {label}
      </dt>
      <dd className="m-0 shrink-0 font-mono tabular-nums" dir="auto">
        {value}
      </dd>
    </div>
  );

  return (
    <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-[12px]">
      <p className="mb-2 flex items-baseline gap-2">
        <span className="font-mono text-[15px] font-semibold tabular-nums">{entry.plate_no}</span>
        <span className="text-muted-foreground" dir="rtl">
          {entry.plate_ar}
        </span>
        <span className="ms-auto text-[10.5px] text-muted-foreground">
          {format(today, 'd MMM')}
        </span>
      </p>
      {entry.revenue_today != null && (
        <dl className="mb-2 space-y-1">
          <Row
            label={t('dashboard.truck.revenueToday')}
            value={formatNumber(Number(entry.revenue_today), 0)}
          />
          <Row
            label={t('dashboard.truck.revenueYesterday')}
            value={formatNumber(Number(entry.revenue_yesterday ?? '0'), 0)}
          />
        </dl>
      )}
      {streamDown ? (
        <dl className="space-y-1">
          <Row
            label={t('dashboard.truck.lastWorked')}
            value={
              entry.last_trip_date
                ? format(entry.last_trip_date, 'd MMM yyyy')
                : t('dashboard.fleet.noTrips')
            }
          />
          <p className="pt-1 text-[11px] italic text-muted-foreground">
            {t('dashboard.truck.needsStream')}
          </p>
        </dl>
      ) : summary.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-2/3 rounded-sm" />
          <Skeleton className="h-3.5 w-1/2 rounded-sm" />
        </div>
      ) : summary.isError ? (
        <p className="py-6 text-center text-xs text-muted-foreground">{t('dashboard.drawer.failed')}</p>
      ) : (
        <dl className="space-y-1">
          <Row
            label={t('dashboard.truck.distance')}
            value={`${summary.data.mileageKm.toFixed(1)} ${t('etit.units.km')}`}
          />
          <Row
            label={t('dashboard.truck.moving')}
            value={formatDrawerDuration(summary.data.activeSecs)}
          />
          <Row
            label={t('dashboard.truck.idling')}
            value={formatDrawerDuration(summary.data.idleSecs)}
          />
          <Row label={t('dashboard.truck.stops')} value={String(summary.data.stopCount)} />
          <Row
            label={t('dashboard.truck.ignitions')}
            value={String(summary.data.ignitionOnCount)}
          />
        </dl>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Exceptions, cash bars, chrome                                               */
/* -------------------------------------------------------------------------- */

function ExceptionRow({ exception }: { exception: DashboardException }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  // Hovering the row warms the destination page's code chunk, so the click
  // lands on a page that is already downloaded.
  const warm = () => {
    preloadChunkForPath(exception.href);
    // Each exception's destination mounts a known query — warm it so the
    // click lands on a painted list.
    if (exception.href.startsWith('/trips')) {
      prefetchTrips(qc, { ...defaultTripListParams(), missingData: 'any' });
    } else if (exception.href.startsWith('/fleet-expenses')) {
      prefetchLedgerMount(qc);
    }
  };
  // Keep the scope the count was computed under: append the global scope's
  // params to the destination's own.
  const scope = keepScopeSearch(exception.href.split('?')[0]).replace(/^\?/, '');
  const scopedHref = scope
    ? exception.href + (exception.href.includes('?') ? '&' : '?') + scope
    : exception.href;

  return (
    <Link
      to={scopedHref}
      onPointerEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      className="grid grid-cols-[3px_1fr_auto] items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          'h-full min-h-[26px] w-[3px] self-stretch rounded-full',
          exception.severity === 'critical' ? 'bg-destructive' : 'bg-warning',
        )}
        aria-hidden
      />
      <span className="min-w-0">
        {/* The backend may ship a new exception before this bundle knows its
            copy. A humanized key beats rendering the raw i18n path — which is
            exactly what a deploy-order skew put on screen once. */}
        <span className="block text-[13px] font-medium leading-snug">
          {t(`dashboard.exceptions.${exception.key}.label`, {
            defaultValue: exception.key.replace(/_/g, ' '),
          })}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {t(`dashboard.exceptions.${exception.key}.hint`, { defaultValue: '' })}
        </span>
      </span>
      <span
        className={cn(
          'font-mono text-lg font-semibold tabular-nums',
          exception.severity === 'critical' ? 'text-destructive' : 'text-warning',
        )}
      >
        {formatNumber(exception.count, 0)}
      </span>
    </Link>
  );
}

function CategoryBars({ categories }: { categories: { key: string; out: string }[] }) {
  const max = Math.max(...categories.map((c) => Number.parseFloat(c.out) || 0), 1);
  return (
    <div className="grid gap-2">
      {categories.map((c) => {
        const v = Number.parseFloat(c.out) || 0;
        return (
          <div key={c.key} className="grid grid-cols-[86px_1fr_64px] items-center gap-2 text-[12px]">
            <span className="truncate" dir="auto">
              {c.key}
            </span>
            <span className="h-[15px] overflow-hidden rounded bg-muted">
              <i
                className="block h-full rounded bg-money"
                style={{ width: `${Math.max((v / max) * 100, 2)}%` }}
              />
            </span>
            <span className="text-end font-mono text-[11.5px] tabular-nums">{compactMoney(c.out)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Attention — what expires or falls due next                                  */
/*                                                                            */
/* Two lists that answer the same question ("what will stop a truck working?") */
/* from two directions: a date and an odometer. They share a panel because     */
/* they share an answer — go and look at that truck — and neither is long      */
/* enough to earn one of its own.                                              */
/* -------------------------------------------------------------------------- */

function AttentionPanel({
  attention,
  pending,
}: {
  attention?: Attention;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const docs = attention?.documents ?? [];
  const oil = attention?.oil_changes ?? [];
  // Which oil row's sheet is open. Everything the sheet shows is already on
  // this payload, so holding the row itself is the whole state.
  const [openRow, setOpenRow] = React.useState<OilChangeDue | null>(null);

  if (pending) {
    return (
      <section className="overflow-hidden rounded-lg border bg-card">
        <PanelHead title={t('dashboard.attention.title')} />
        <div className="grid gap-2 p-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (docs.length === 0 && oil.length === 0) {
    return (
      <section className="overflow-hidden rounded-lg border bg-card">
        <PanelHead title={t('dashboard.attention.title')} />
        <p className="py-6 text-center text-xs text-muted-foreground">
          {t('dashboard.attention.allClear')}
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <PanelHead title={t('dashboard.attention.title')} />
      <div className="grid gap-3 p-3 md:grid-cols-2">
        <AttentionColumn
          title={t('dashboard.attention.documents')}
          shown={docs.length}
          total={attention?.documents_total ?? docs.length}
          empty={t('dashboard.attention.noDocuments')}
          href="/cars"
        >
          {docs.map((d) => (
            <AttentionRow
              key={`${d.plate_no}-${d.kind}`}
              plateNo={d.plate_no}
              plateAr={d.plate_ar}
              label={t(`dashboard.attention.kind.${d.kind}`)}
              detail={format(d.expires_on, 'd MMM yyyy')}
              // Lapsed is not "more urgent than urgent" — it is a different
              // state, so it takes the destructive colour and its own phrasing.
              status={
                d.days_left < 0
                  ? t('dashboard.attention.expiredAgo', { count: Math.abs(d.days_left) })
                  : t('dashboard.attention.daysLeft', { count: d.days_left })
              }
              severity={d.days_left < 0 ? 'critical' : 'warning'}
            />
          ))}
        </AttentionColumn>

        <AttentionColumn
          title={t('dashboard.attention.oilChanges')}
          shown={oil.length}
          total={attention?.oil_changes_total ?? oil.length}
          empty={t('dashboard.attention.noOilChanges')}
          href="/oil-changes"
        >
          {oil.map((o) => (
            <AttentionRow
              key={o.plate_no}
              plateNo={o.plate_no}
              plateAr={o.plate_ar}
              label={t('dashboard.attention.sinceOf', {
                since: formatNumber(o.km_since, 0),
                interval: formatNumber(o.interval_km, 0),
              })}
              detail={o.last_change_date ? format(o.last_change_date, 'd MMM yyyy') : '—'}
              status={
                o.km_left < 0
                  ? t('dashboard.attention.kmOverdue', { km: formatNumber(-o.km_left, 0) })
                  : t('dashboard.attention.kmLeft', { km: formatNumber(o.km_left, 0) })
              }
              severity={o.km_left < 0 ? 'critical' : 'warning'}
              onSelect={() => setOpenRow(o)}
              filters={
                <OilChangeFilterChips
                  className="mt-1"
                  flags={{ oil: o.oil_filter, fuel: o.fuel_filter, water: o.water_filter }}
                  cycles={{ oil: o.oil_filter_cycles, fuel: o.fuel_filter_cycles }}
                />
              }
            />
          ))}
        </AttentionColumn>
      </div>

      <OilChangeDetailSheet row={openRow} onOpenChange={(o) => !o && setOpenRow(null)} />
    </section>
  );
}

function AttentionColumn({
  title,
  shown,
  total,
  empty,
  href,
  children,
}: {
  title: string;
  shown: number;
  total: number;
  empty: string;
  href: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="mb-1.5 flex items-baseline justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        {total > 0 && (
          <span className="font-medium normal-case tracking-normal tabular-nums">
            {total > shown
              ? t('dashboard.attention.showingOf', { shown, total })
              : t('dashboard.attention.count', { count: total })}
          </span>
        )}
      </p>
      {shown === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <>
          {/* The server sends every match now, so the column scrolls rather
              than pushing the rest of the dashboard down a screen. The cap is
              roughly six rows — enough that the list reads as a list. */}
          <div className="grid max-h-[19.5rem] gap-2 overflow-y-auto pr-1">{children}</div>
          <Link
            to={href}
            className="mt-2 inline-block rounded-sm text-[11px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('common.viewAll')}
          </Link>
        </>
      )}
    </div>
  );
}

function AttentionRow({
  plateNo,
  plateAr,
  label,
  detail,
  status,
  severity,
  filters,
  onSelect,
}: {
  plateNo: string;
  plateAr: string;
  label: string;
  detail: string;
  status: string;
  severity: 'critical' | 'warning';
  /** Optional trailing detail under the label; documents have none. */
  filters?: React.ReactNode;
  /** When given the row becomes a button that opens its detail sheet. */
  onSelect?: () => void;
}) {
  return (
    <Row onSelect={onSelect}>
      <span
        className={cn(
          'h-full min-h-[26px] w-[3px] self-stretch rounded-full',
          severity === 'critical' ? 'bg-destructive' : 'bg-warning',
        )}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-[13px] font-semibold tabular-nums">{plateNo}</span>
          <span className="truncate text-[11px] text-muted-foreground" dir="rtl">
            {plateAr}
          </span>
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {label} · {detail}
        </span>
        {filters}
      </span>
      <span
        className={cn(
          'shrink-0 text-[11px] font-medium',
          severity === 'critical' ? 'text-destructive' : 'text-warning',
        )}
      >
        {status}
      </span>
    </Row>
  );
}

/**
 * The row's own container. A real <button> when it opens something, so it is
 * reachable by keyboard and announced as pressable; a plain div otherwise,
 * because a button that does nothing is worse than no button.
 */
function Row({ onSelect, children }: { onSelect?: () => void; children: React.ReactNode }) {
  const className =
    'grid w-full grid-cols-[3px_1fr_auto] items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-start';
  if (!onSelect) return <div className={className}>{children}</div>;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        className,
        'transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {children}
    </button>
  );
}

function PanelHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <h2 className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
      {aside && <span className="font-medium normal-case tracking-normal">{aside}</span>}
    </h2>
  );
}

function DegradedStrip({
  message,
  onRetry,
  compact,
}: {
  message: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]',
        compact && 'mb-3',
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
      <span className="min-w-0">{message}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="ms-auto h-7 shrink-0 gap-1.5 border-warning/40 px-2.5 text-xs text-warning hover:text-warning"
      >
        <RefreshCw aria-hidden />
        {t('dashboard.conn.refresh')}
      </Button>
    </div>
  );
}
