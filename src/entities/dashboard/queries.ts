import { useQuery, type QueryClient } from '@tanstack/react-query';
import { currentScopeSlice } from '@/shared/scope';
import { dashboardApi, etitApi, type DashboardScope } from './api';
import type {
  AdvancesDrawer,
  CashOutDrawer,
  RevenueDrawer,
  TripsDrawer,
} from './schemas';

/** What any drawer can hold — the component narrows by `kind`. */
export type DrawerData = RevenueDrawer | CashOutDrawer | TripsDrawer | AdvancesDrawer;

/* -------------------------------------------------------------------------- */
/* Keys                                                                        */
/*                                                                            */
/* Exported because the prefetchers must warm EXACTLY these keys — a prefetch  */
/* against a near-miss key is a wasted request that the page refetches anyway. */
/* -------------------------------------------------------------------------- */

function scopeKeyOf(scope?: DashboardScope): string {
  if (!scope) return 'current';
  return `${scope.from ?? ''}..${scope.to ?? ''}@${scope.company ?? 'all'}`;
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  main: (scope?: DashboardScope) => [...dashboardKeys.all, 'main', scopeKeyOf(scope)] as const,
  drawer: (kind: string, scope?: DashboardScope) =>
    [...dashboardKeys.all, 'drawer', kind, scopeKeyOf(scope)] as const,
  truckDay: (vehicleId: string, date: string) =>
    [...dashboardKeys.all, 'truck', vehicleId, date] as const,
};

/**
 * The scope a bare navigation to `/` mounts with: dates from the global URL
 * scope (the header bar), company from `?co=`. Warmers without a scope in
 * hand (the sidebar) call this — it is exactly what the page will read.
 */
export function currentDashboardScope(): DashboardScope {
  const { range } = currentScopeSlice();
  const co =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('co')
      : null;
  return { from: range.from, to: range.to, company: co || null };
}

/* ─── The one payload that paints the page ─── */

export function useDashboard(scope?: DashboardScope) {
  return useQuery({
    queryKey: dashboardKeys.main(scope),
    queryFn: () => dashboardApi.get(scope),
    staleTime: 30_000,
  });
}

/* ─── Drawers — fetched when a card opens, or warmed on hover ─── */

const DRAWER_FETCHERS: Record<string, (scope?: DashboardScope) => Promise<DrawerData>> = {
  revenue: (scope?: DashboardScope) => dashboardApi.revenue(scope),
  'cash-out': (scope?: DashboardScope) => dashboardApi.cashOut(scope),
  trips: (scope?: DashboardScope) => dashboardApi.trips(scope),
  advances: () => dashboardApi.advances(),
};
export type DrawerKind = 'revenue' | 'cash-out' | 'trips' | 'advances';

export function useDrawer(kind: DrawerKind, scope: DashboardScope | undefined, enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.drawer(kind, scope),
    queryFn: () => DRAWER_FETCHERS[kind](scope),
    staleTime: 60_000,
    enabled,
  });
}

export function useTruckDay(vehicleId: string | null, date: string) {
  return useQuery({
    queryKey: dashboardKeys.truckDay(vehicleId ?? 'none', date),
    queryFn: () => etitApi.daySummary(vehicleId!, date),
    staleTime: 60_000,
    enabled: vehicleId !== null,
    retry: 1,
  });
}

/* -------------------------------------------------------------------------- */
/* Optimistic prefetch                                                         */
/*                                                                            */
/* The Madar pattern: warm on INTENT (hover / focus / touchstart), against the */
/* exact key the component will read, so opening renders from cache instead of */
/* showing a spinner. prefetchQuery dedupes in-flight requests and respects    */
/* staleTime, so calling these repeatedly costs nothing. Callers without a     */
/* scope in hand (the sidebar) omit it and get the current URL's scope.        */
/* -------------------------------------------------------------------------- */

export function prefetchDashboard(qc: QueryClient, scope?: DashboardScope): void {
  const s = scope ?? currentDashboardScope();
  void qc.prefetchQuery({
    queryKey: dashboardKeys.main(s),
    queryFn: () => dashboardApi.get(s),
    staleTime: 30_000,
  });
}

export function prefetchDrawer(qc: QueryClient, kind: DrawerKind, scope?: DashboardScope): void {
  const s = scope ?? currentDashboardScope();
  void qc.prefetchQuery({
    queryKey: dashboardKeys.drawer(kind, s),
    queryFn: () => DRAWER_FETCHERS[kind](s),
    staleTime: 60_000,
  });
}

export function prefetchTruckDay(qc: QueryClient, vehicleId: string, date: string): void {
  void qc.prefetchQuery({
    queryKey: dashboardKeys.truckDay(vehicleId, date),
    queryFn: () => etitApi.daySummary(vehicleId, date),
    staleTime: 60_000,
    retry: 1,
  });
}
