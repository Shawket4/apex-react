import type { QueryClient } from '@tanstack/react-query';

import { prefetchDashboard } from '@/entities/dashboard/queries';
import { prefetchDrivers, prefetchDriversList } from '@/entities/driver/queries';
import { prefetchCars } from '@/entities/car/queries';
import { prefetchOilChanges } from '@/entities/oil-change/queries';
import { prefetchFeeMappings } from '@/entities/fee-mapping/queries';
import { prefetchUsers } from '@/entities/user/queries';
import { prefetchServiceInvoices } from '@/entities/service-invoice/queries';
import { prefetchTrips } from '@/entities/trip/queries';
import { defaultTripListParams } from '@/entities/trip/defaults';
import { prefetchFuelEvents } from '@/entities/fuel-event/queries';
import { defaultFuelRange } from '@/entities/fuel-event/defaults';
import { prefetchLedgerMount } from '@/entities/transaction/queries';
import { prefetchCategories } from '@/entities/transaction/categories';
import { prefetchCompanies } from '@/entities/mapping/queries';
import { prefetchMaintStock } from '@/entities/maint-stock/queries';
import { prefetchEtitVehicles } from '@/entities/etit-vehicle/queries';
import { prefetchZones } from '@/entities/zone/queries';
import { prefetchDropoffChoices, prefetchLocations } from '@/entities/location/queries';
import { prefetchTripAudit } from '@/entities/trip-audit/queries';
import { preloadChunkForPath } from './chunks';

/* -------------------------------------------------------------------------- */
/* Route-level intent                                                          */
/*                                                                            */
/* What a nav surface (sidebar, command palette, an exception link) warms when */
/* the user shows intent toward a PATH. Two halves, always:                    */
/*                                                                            */
/*   chunk — every route, via the registry.                                    */
/*   data  — the queries a bare navigation to that route mounts with. Routes   */
/*           whose initial key depends on URL/localStorage state reproduce it  */
/*           through the entity's defaults module — the same module the page   */
/*           itself mounts from, so the two can never drift apart.             */
/*                                                                            */
/* The data warmers live NEXT TO their hooks in entities/x/queries.ts, so the  */
/* key can't drift from the page without the change being visible in review.   */
/* -------------------------------------------------------------------------- */

const DATA_WARMERS: Record<string, (qc: QueryClient) => void> = {
  '/': (qc) => prefetchDashboard(qc),
  '/trips': (qc) => {
    prefetchTrips(qc, defaultTripListParams());
    prefetchCompanies(qc); // the filters bar mounts the company list
  },
  '/fuel-events': (qc) => prefetchFuelEvents(qc, defaultFuelRange()),
  '/fleet-expenses': (qc) => {
    prefetchLedgerMount(qc);
    prefetchCategories(qc);
  },
  '/drivers': prefetchDrivers,
  '/cars': (qc) => {
    prefetchCars(qc);
    prefetchDriversList(qc); // the table joins assignments on the driver list
  },
  '/tires': prefetchMaintStock,
  '/oil-changes': prefetchOilChanges,
  '/service-invoices': prefetchServiceInvoices,
  '/fee-mappings': (qc) => {
    prefetchFeeMappings(qc);
    prefetchDropoffChoices(qc); // the inline add/edit form mounts its picker
  },
  '/users': prefetchUsers,
  '/etit': prefetchEtitVehicles,
  '/zones': prefetchZones,
  '/locations': prefetchLocations,
  '/trip-audit': (qc) => {
    prefetchTripAudit(qc);
    prefetchCompanies(qc); // the company filter mounts alongside the queue
  },
};

export function prefetchRouteData(path: string, qc: QueryClient): void {
  DATA_WARMERS[path.split('?')[0] ?? path]?.(qc);
}

/** The one gesture nav surfaces call on intent toward a path. */
export function prefetchRoute(path: string, qc: QueryClient): void {
  preloadChunkForPath(path);
  prefetchRouteData(path, qc);
}
