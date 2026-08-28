import { useQuery, type QueryClient } from '@tanstack/react-query';
import { dashboardApi, etitApi } from './api';
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

export const dashboardKeys = {
  all: ['dashboard'] as const,
  main: (month?: string) => [...dashboardKeys.all, 'main', month ?? 'current'] as const,
  drawer: (kind: string, month?: string) =>
    [...dashboardKeys.all, 'drawer', kind, month ?? 'current'] as const,
  truckDay: (vehicleId: string, date: string) =>
    [...dashboardKeys.all, 'truck', vehicleId, date] as const,
};

/* ─── The one payload that paints the page ─── */

export function useDashboard(month?: string) {
  return useQuery({
    queryKey: dashboardKeys.main(month),
    queryFn: () => dashboardApi.get(month),
    staleTime: 30_000,
  });
}

/* ─── Drawers — fetched when a card opens, or warmed on hover ─── */

const DRAWER_FETCHERS: Record<string, (month?: string) => Promise<DrawerData>> = {
  revenue: (month?: string) => dashboardApi.revenue(month),
  'cash-out': (month?: string) => dashboardApi.cashOut(month),
  trips: (month?: string) => dashboardApi.trips(month),
  advances: () => dashboardApi.advances(),
};
export type DrawerKind = 'revenue' | 'cash-out' | 'trips' | 'advances';

export function useDrawer(kind: DrawerKind, month: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.drawer(kind, month),
    queryFn: () => DRAWER_FETCHERS[kind](month),
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
/* staleTime, so calling these repeatedly costs nothing.                       */
/* -------------------------------------------------------------------------- */

export function prefetchDashboard(qc: QueryClient, month?: string): void {
  void qc.prefetchQuery({
    queryKey: dashboardKeys.main(month),
    queryFn: () => dashboardApi.get(month),
    staleTime: 30_000,
  });
}

export function prefetchDrawer(qc: QueryClient, kind: DrawerKind, month?: string): void {
  void qc.prefetchQuery({
    queryKey: dashboardKeys.drawer(kind, month),
    queryFn: () => DRAWER_FETCHERS[kind](month),
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
