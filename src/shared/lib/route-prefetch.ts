import type { QueryClient } from '@tanstack/react-query';
import { prefetchDashboard } from '@/entities/dashboard/queries';

/* -------------------------------------------------------------------------- */
/* Intent prefetch — the MadarDashboard pattern                                */
/*                                                                            */
/* Warm on hover / focus / touchstart, before the click. Two halves:          */
/*                                                                            */
/*   1. The route's CODE CHUNK. These import() thunks resolve to the same     */
/*      modules the router's React.lazy() wraps, so Vite serves one chunk and  */
/*      the browser has it before navigation.                                  */
/*   2. The page's MOUNT-TIME QUERIES — but only where the cache key can be    */
/*      mirrored EXACTLY. A prefetch against a near-miss key is a wasted       */
/*      request the page refetches anyway (Madar documents this rule, and it   */
/*      is why data-prefetch is opt-in per route here rather than blanket:     */
/*      pages whose initial key depends on URL/filter state — trips, fuel —    */
/*      get their chunk warmed and fetch their own data).                      */
/*                                                                            */
/* prefetchQuery dedupes in-flight and respects staleTime; import() dedupes    */
/* by module. Repeat calls cost nothing, so every hover may fire this.         */
/* -------------------------------------------------------------------------- */

const CHUNKS: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/dashboard/dashboard'),
  '/trips': () => import('@/pages/trips/trips'),
  '/fuel-events': () => import('@/pages/fuel-events/fuel-events'),
  '/fleet-expenses': () => import('@/pages/fleet-expenses/fleet-expenses'),
  '/drivers': () => import('@/pages/drivers/drivers'),
  '/cars': () => import('@/pages/cars/cars'),
  '/oil-changes': () => import('@/pages/oil-changes/oil-changes'),
  '/service-invoices': () => import('@/pages/service-invoices/service-invoices'),
  '/fee-mappings': () => import('@/pages/fee-mappings/fee-mappings'),
  '/users': () => import('@/pages/users/users'),
};

const warmedChunks = new Set<string>();

/** Preload a route's code chunk. Safe to call on every hover. */
export function preloadRouteChunk(path: string): void {
  const load = CHUNKS[path];
  if (!load || warmedChunks.has(path)) return;
  warmedChunks.add(path);
  load().catch(() => {
    // A failed preload must stay invisible — navigation will retry it, and a
    // chunk that 404s mid-deploy resolves itself on the next attempt.
    warmedChunks.delete(path);
  });
}

/** Warm the queries a route reads on mount, where the key is exactly known. */
export function prefetchRouteData(path: string, qc: QueryClient): void {
  switch (path) {
    case '/':
      // The dashboard's single payload — the key is static, so this is always
      // an exact hit.
      prefetchDashboard(qc);
      break;
    default:
      // Other pages derive their initial keys from URL and filter state;
      // guessing would warm the wrong key. Their chunk is enough.
      break;
  }
}

/** The one gesture nav surfaces call on intent. */
export function prefetchRoute(path: string, qc: QueryClient): void {
  preloadRouteChunk(path);
  prefetchRouteData(path, qc);
}
