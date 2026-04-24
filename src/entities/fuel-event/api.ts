import { apiGet, apiPost } from '@/shared/api/client';
import {
  fuelEventSchema,
  fuelEventsResponseSchema,
  type FuelEvent,
  type AddFuelEventPayload,
  type EditFuelEventPayload,
  type FuelEventsFilter,
} from './schemas';
import { toDateOnly } from '@/shared/lib/format';

/**
 * List fuel events.
 *
 * Backend contract (Go/Fiber):
 *   GET /api/protected/GetFuelEvents?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&method=PetroApp
 *
 * The backend uses `DATE(date)` for comparison, so plain `YYYY-MM-DD` is
 * exactly what it wants — full ISO timestamps with a Z suffix get interpreted
 * in UTC and can shift the day back by 2 hours in Cairo local time.
 */
export async function getFuelEvents(filter: FuelEventsFilter = {}): Promise<FuelEvent[]> {
  const params: Record<string, string> = {};
  if (filter.from) params.startDate = toDateOnly(filter.from);
  if (filter.to) params.endDate = toDateOnly(filter.to);
  if (filter.petroAppOnly) params.method = 'PetroApp';

  const data = await apiGet<unknown>('/api/protected/GetFuelEvents', { params });
  const array = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
  return fuelEventsResponseSchema.parse(array ?? []);
}

export async function getFuelEventById(id: number | string): Promise<FuelEvent> {
  const data = await apiGet<unknown>(`/api/protected/GetFuelEventById/${id}`);
  return fuelEventSchema.parse(data);
}

export async function addFuelEvent(payload: AddFuelEventPayload): Promise<void> {
  await apiPost<unknown>('/api/protected/AddFuelEvent', payload);
}

export async function editFuelEvent(payload: EditFuelEventPayload): Promise<void> {
  await apiPost<unknown>('/api/protected/EditFuelEvent', payload);
}

export async function deleteFuelEvent(id: number): Promise<void> {
  await apiPost<unknown>('/api/protected/DeleteFuelEvent', { id });
}