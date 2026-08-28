import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import {
  formatDrawerDuration,
  tileStatus,
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
  useTruckDay,
  type DrawerKind,
} from '@/entities/dashboard/queries';
import { type DashboardScope } from '@/entities/dashboard/api';
import { useCompanies } from '@/entities/mapping/queries';
import { useDashboardFilters, type DashboardPreset } from '@/shared/state/dashboard-filters';
import { useEtitLive } from '@/shared/hooks/use-etit-live';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { preloadChunkForPath } from '@/shared/lib/prefetch';
import { Button } from '@/shared/ui/button';
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

  const { preset, from, to, company, setPreset, setCompany } = useDashboardFilters();
  const scope = React.useMemo(
    () => ({ from, to, company }),
    [from, to, company],
  );
  const dashboard = useDashboard(scope);
  const hasFleet = (dashboard.data?.fleet.length ?? 0) > 0;
  const live = useEtitLive(hasFleet);

  const today = new Date().toISOString().slice(0, 10);
  const asOf = dashboard.data?.as_of;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4">
      {/* ---- header: the date, and the connection telling the truth ---- */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold leading-tight sm:text-xl">
            {format(today, 'EEEE d MMMM')}
          </h1>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {from && to
              ? from === to
                ? format(from, 'd MMMM yyyy')
                : `${format(from, 'd MMM')} – ${format(to, 'd MMM yyyy')}`
              : t('dashboard.subtitleMonth', { month: format(today, 'MMMM yyyy') })}
            {company && ` · ${company}`}
            {asOf && ` · ${t('dashboard.updatedAt', { time: format(asOf, 'HH:mm') })}`}
          </p>
        </div>
        <ConnectionBadge live={live} />
      </header>

      <DashboardFilterBar
        preset={preset}
        company={company}
        onPreset={setPreset}
        onCompany={setCompany}
      />

      {/* ---- apex zone: figures, or an honest strip ---- */}
      {dashboard.isError ? (
        <DegradedStrip
          message={t('dashboard.apexDown')}
          onRetry={() => void dashboard.refetch()}
        />
      ) : dashboard.isPending ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-xl" />
          ))}
        </div>
      ) : (
        <KpiRow data={dashboard.data} showMoney={showMoney} scope={scope} />
      )}

      {/* ---- fleet + exceptions ---- */}
      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section className="overflow-hidden rounded-xl border bg-card">
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

        <section className="overflow-hidden rounded-xl border bg-card">
          <PanelHead title={t('dashboard.exceptions.title')} />
          <div className="p-3">
            {dashboard.isError ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t('dashboard.exceptions.unavailable')}
              </p>
            ) : dashboard.data && dashboard.data.exceptions.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">
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

      {/* ---- cash out by category (money only) ---- */}
      {showMoney && dashboard.data?.money && dashboard.data.money.by_category.length > 0 && (
        <section className="overflow-hidden rounded-xl border bg-card">
          <PanelHead
            title={t('dashboard.cash.title')}
            aside={format(today, 'MMMM')}
          />
          <div className="p-3">
            <CategoryBars categories={dashboard.data.money.by_category} />
          </div>
        </section>
      )}
    </div>
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
      {state === 'down' && (
        <button
          type="button"
          onClick={live.refresh}
          className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('dashboard.conn.refresh')}
        </button>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Global scope — one date window + company, applied to every card             */
/* -------------------------------------------------------------------------- */

const PRESETS: DashboardPreset[] = ['month', 'today', 'yesterday', 'week'];

function DashboardFilterBar({
  preset,
  company,
  onPreset,
  onCompany,
}: {
  preset: DashboardPreset;
  company: string | null;
  onPreset: (p: DashboardPreset) => void;
  onCompany: (c: string | null) => void;
}) {
  const { t } = useTranslation();
  const companies = useCompanies();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPreset(p)}
          aria-pressed={preset === p}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
            preset === p
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:border-primary/50',
          )}
        >
          {t(`dashboard.filters.${p}`)}
        </button>
      ))}
      <select
        value={company ?? ''}
        onChange={(e) => onCompany(e.target.value || null)}
        className="ms-auto h-7 rounded-full border bg-card px-2.5 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t('dashboard.filters.company')}
      >
        <option value="">{t('dashboard.filters.allCompanies')}</option>
        {(companies.data?.data ?? []).map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

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
    <div className="rounded-xl border bg-card p-3">
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
    <div className={cn('overflow-hidden rounded-xl border bg-card', isOpen && 'lg:col-span-1')}>
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
            className={cn('h-3 w-3 shrink-0 transition-transform', isOpen && 'rotate-180')}
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
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
    );
  }
  if (drawer.isError) {
    return (
      <p className="border-t bg-muted/40 p-3 text-xs text-muted-foreground">
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
          <p className="mb-1 mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('dashboard.drawer.largest')}
          </p>
          <dl className="space-y-1 text-[12px]">
            {d.largest.map((p, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
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
              aria-pressed={isSelected}
              className={cn(
                'relative flex flex-col items-center gap-px rounded-lg border bg-card px-1.5 pb-1.5 pt-2 text-center transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                styles.tile,
                isSelected && 'border-primary bg-accent',
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
            <i className={cn('h-2 w-2 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
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
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 font-mono tabular-nums" dir="auto">
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
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      ) : summary.isError ? (
        <p className="text-[11px] italic text-muted-foreground">{t('dashboard.drawer.failed')}</p>
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
  const { t } = useTranslation();
  // Hovering the row warms the destination page's code chunk, so the click
  // lands on a page that is already downloaded.
  const warm = () => preloadChunkForPath(exception.href);
  return (
    <Link
      to={exception.href}
      onPointerEnter={warm}
      onFocus={warm}
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
        'flex items-start gap-2 rounded-lg border border-dashed border-warning/60 bg-warning/10 px-3 py-2.5 text-[12.5px]',
        compact && 'mb-3',
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
      <span className="min-w-0">{message}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="ms-auto h-7 shrink-0 gap-1.5 border-warning/60 px-2.5 text-[11.5px] text-warning hover:text-warning"
      >
        <RefreshCw className="h-3 w-3" />
        {t('dashboard.conn.refresh')}
      </Button>
    </div>
  );
}
