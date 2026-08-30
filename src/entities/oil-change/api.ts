import { apiGet, apiPost, apiClient } from '@/shared/api/client';
import {
  oilChangeSchema,
  oilChangesResponseSchema,
  toOilChangeView,
  type OilChange,
  type OilChangeView,
  filterCycles,
  type OilFilterCycles,
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

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Ask the Go backend for the workbook.
 *
 * The build moved off the browser: the client could only ever export what it
 * already held, which meant the fleet screen produced latest-per-vehicle and
 * the history screen produced one truck, and nothing produced the fleet's
 * history. The server returns both shapes in one file — a master sheet of the
 * latest change per vehicle, then a sheet per vehicle.
 *
 * Labels travel with the request so the sheet reads in the user's language
 * without a second set of strings living on the server.
 */
export async function exportOilChangesExcel(
  labels: Record<string, string>,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.post('/api/ExportOilChanges', labels, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  let filename = 'oil-changes.xlsx';
  const disposition = response.headers?.['content-disposition'];
  if (typeof disposition === 'string') {
    const match = disposition.match(/filename="?([^";]+)"?/i);
    if (match?.[1]) filename = match[1];
  }

  return { blob, filename };
}

/**
 * Filter cycles for each vehicle's current record, keyed by plate.
 *
 * The fleet table shows one row per vehicle but the cycle count is a fact about
 * that vehicle's history, so it cannot be read off the row — it has to be
 * counted from every record we hold for that plate.
 */
export function selectFilterCyclesByPlate(
  records: OilChange[],
): Map<string, OilFilterCycles> {
  const byPlate = new Map<string, OilChange[]>();
  for (const r of records) {
    const list = byPlate.get(r.car_no_plate);
    if (list) list.push(r);
    else byPlate.set(r.car_no_plate, [r]);
  }
  const out = new Map<string, OilFilterCycles>();
  for (const [plate, list] of byPlate) {
    // Newest first, by ID — the same rule selectLatestPerCar uses, because
    // dates repeat and IDs are monotonic per insert.
    const newestFirst = [...list].sort((a, b) => b.ID - a.ID);
    out.set(plate, filterCycles(newestFirst));
  }
  return out;
}
