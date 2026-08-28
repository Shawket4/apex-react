import type { QueryClient } from '@tanstack/react-query';

import { prefetchDashboard } from '@/entities/dashboard/queries';
import { prefetchDrivers } from '@/entities/driver/queries';
import { prefetchCars } from '@/entities/car/queries';
import { prefetchOilChanges } from '@/entities/oil-change/queries';
import { prefetchFeeMappings } from '@/entities/fee-mapping/queries';
import { prefetchUsers } from '@/entities/user/queries';
import { prefetchServiceInvoices } from '@/entities/service-invoice/queries';
import { preloadChunkForPath } from './chunks';

/* -------------------------------------------------------------------------- */
/* Route-level intent                                                          */
/*                                                                            */
/* What a nav surface (sidebar, command palette, an exception link) warms when */
/* the user shows intent toward a PATH. Two halves, always:                    */
/*                                                                            */
/*   chunk — every route, via the registry.                                    */
/*   data  — ONLY routes whose mount-time query key is deterministic from a    */
/*           bare navigation. Trips, fuel events and the ledger derive their   */
/*           initial key from URL/date state, so warming them from here would  */
/*           hit a near-miss key and waste the request — their lists warm      */
/*           in-page instead, where the live params are known (pagination      */
/*           hover, tab hover, row hover).                                     */
/*                                                                            */
/* The data warmers live NEXT TO their hooks in entities/x/queries.ts, so the  */
/* key can't drift from the page without the change being visible in review.   */
/* -------------------------------------------------------------------------- */

const DATA_WARMERS: Record<string, (qc: QueryClient) => void> = {
  '/': (qc) => prefetchDashboard(qc),
  '/drivers': prefetchDrivers,
  '/cars': prefetchCars,
  '/oil-changes': prefetchOilChanges,
  '/fee-mappings': prefetchFeeMappings,
  '/users': prefetchUsers,
  '/service-invoices': prefetchServiceInvoices,
};

export function prefetchRouteData(path: string, qc: QueryClient): void {
  DATA_WARMERS[path.split('?')[0] ?? path]?.(qc);
}

/** The one gesture nav surfaces call on intent toward a path. */
export function prefetchRoute(path: string, qc: QueryClient): void {
  preloadChunkForPath(path);
  prefetchRouteData(path, qc);
}
