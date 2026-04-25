import { apiGet, apiPost, apiClient } from '@/shared/api/client';
import {
  oilChangeSchema,
  oilChangesResponseSchema,
  toOilChangeView,
  type OilChange,
  type OilChangeView,
  type AddOilChangePayload,
  type EditOilChangePayload,
} from './schemas';

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                   */
/*                                                                             */
/* The Go backend uses route paths inherited from the legacy dashboard. The   */
/* paths are unusual (verb-cased like `/api/CreateOilChange`) but they are    */
/* what the server exposes — do not change.                                   */
/* -------------------------------------------------------------------------- */

export async function getOilChanges(): Promise<OilChange[]> {
  const data = await apiGet<unknown>('/api/GetAllOilChanges');
  const array = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
  return oilChangesResponseSchema.parse(array ?? []);
}

export async function getOilChangeById(id: number | string): Promise<OilChange> {
  const data = await apiGet<unknown>(`/api/GetOilChange/${id}`);
  return oilChangeSchema.parse(data);
}

export async function addOilChange(payload: AddOilChangePayload): Promise<void> {
  await apiPost<unknown>('/api/CreateOilChange', payload);
}

export async function editOilChange(payload: EditOilChangePayload): Promise<void> {
  await apiPost<unknown>('/api/EditOilChange', payload);
}

export async function deleteOilChange(id: number): Promise<void> {
  await apiClient.delete(`/api/DeleteOilChange/${id}`);
}

/* -------------------------------------------------------------------------- */
/* Selectors                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Reduce a flat list of oil-change records to **one row per vehicle**, picking
 * the record with the highest ID for each plate. Highest ID — not latest
 * date — because dates can repeat (two changes recorded on the same day) and
 * IDs are monotonic per insert.
 *
 * Returned records are decorated with `OilChangeView` derived fields so that
 * the fleet table, KPI tiles, and Excel exporter can read them straight off.
 */
export function selectLatestPerCar(records: OilChange[]): OilChangeView[] {
  const byPlate = new Map<string, OilChange>();
  for (const r of records) {
    const current = byPlate.get(r.car_no_plate);
    if (!current || r.ID > current.ID) {
      byPlate.set(r.car_no_plate, r);
    }
  }
  return Array.from(byPlate.values()).map(toOilChangeView);
}

/**
 * Project all records for a single car into the view-model shape and sort
 * by date descending (with ID as a stable tiebreaker so two same-day
 * records keep a deterministic order).
 */
export function selectHistoryForCarPlate(
  records: OilChange[],
  carNoPlate: string,
): OilChangeView[] {
  return records
    .filter((r) => r.car_no_plate === carNoPlate)
    .map(toOilChangeView)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.ID - a.ID;
    });
}
