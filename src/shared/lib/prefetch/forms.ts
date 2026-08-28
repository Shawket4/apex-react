import type { QueryClient } from '@tanstack/react-query';

import { prefetchCars } from '@/entities/car/queries';
import { prefetchDriversList } from '@/entities/driver/queries';
import { prefetchCompanies } from '@/entities/mapping/queries';
import { prefetchCategories, prefetchParties } from '@/entities/transaction/categories';
import { prefetchVehicles } from '@/entities/transaction/vehicles';
import { prefetchDropoffChoices } from '@/entities/location/queries';
import { preloadChunk, type ChunkKey } from './chunks';

/* -------------------------------------------------------------------------- */
/* Form-companion warmers                                                      */
/*                                                                            */
/* A form is never just its chunk: it mounts dropdown queries the moment it    */
/* renders (cars, drivers, companies, categories…). Hovering the button that   */
/* opens it warms BOTH halves, so the form paints complete — no dropdown       */
/* skeletons after navigation.                                                 */
/* -------------------------------------------------------------------------- */

/** Trip create/edit: cars + drivers + companies power its selectors. */
export function warmTripForm(qc: QueryClient, chunk: ChunkKey = 'trip-new'): void {
  preloadChunk(chunk);
  prefetchCars(qc);
  prefetchDriversList(qc);
  prefetchCompanies(qc);
}

/** Fuel event create/edit: cars + drivers. */
export function warmFuelForm(qc: QueryClient, chunk: ChunkKey = 'fuel-event-new'): void {
  preloadChunk(chunk);
  prefetchCars(qc);
  prefetchDriversList(qc);
}

/** Ledger entry create/edit: categories + vehicles + parties. */
export function warmLedgerForm(qc: QueryClient, chunk: ChunkKey = 'fleet-expense-new'): void {
  preloadChunk(chunk);
  prefetchCategories(qc);
  prefetchVehicles(qc);
  prefetchParties(qc);
}

/** Oil change create/edit: cars + drivers. */
export function warmOilForm(qc: QueryClient, chunk: ChunkKey = 'oil-change-new'): void {
  preloadChunk(chunk);
  prefetchCars(qc);
  prefetchDriversList(qc);
}

/** Service invoice create/edit: cars + drivers. */
export function warmServiceInvoiceForm(
  qc: QueryClient,
  chunk: ChunkKey = 'service-invoice-new',
): void {
  preloadChunk(chunk);
  prefetchCars(qc);
  prefetchDriversList(qc);
}

/** The fee-mappings dialog pulls the full drop-off list for its picker. */
export function warmFeeMappingDialog(qc: QueryClient): void {
  prefetchDropoffChoices(qc);
}
