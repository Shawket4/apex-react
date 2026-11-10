import { apiGet, apiPost, apiClient } from '@/shared/api/client';
import {
  carsResponseSchema,
  paginatedCarsResponseSchema,
  type Car,
  type CarPayload,
} from './schemas';

export async function getCars(): Promise<Car[]>;
export async function getCars(page: number, limit: number): Promise<{ data: Car[]; pagination: any }>;
export async function getCars(page?: number, limit?: number): Promise<any> {
  const isPaginated = page !== undefined && limit !== undefined;
  const url = isPaginated
    ? `/api/cars?page=${page}&limit=${limit}`
    : '/api/cars';

  const data = await apiGet<unknown>(url);

  if (isPaginated) {
    return paginatedCarsResponseSchema.parse(data);
  }

  // Backwards compatibility: ensure we return a flat array
  const array = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
  return carsResponseSchema.parse(array ?? []);
}

/** Adds a car and answers its id. Only the plate is required. */
export async function createCar(payload: CarPayload): Promise<number> {
  const data = await apiPost<{ car_id: number }>('/api/cars', payload);
  return data.car_id;
}

/** Changes the fields sent and leaves every other one as it is. */
export async function updateCar(id: number, payload: Partial<CarPayload>): Promise<void> {
  await apiClient.put(`/api/cars/${id}`, payload);
}

export async function setCarDriver(carId: number, driverId: number): Promise<void> {
  await apiClient.patch('/api/protected/SetCarDriverPair', {
    car_id: carId,
    driver_id: driverId,
  });
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Ask the Go backend for the fleet workbook.
 *
 * The expiry window travels with the request rather than living on the server,
 * so the spreadsheet flags exactly the vehicles the screen it was exported from
 * flags. Labels travel with it for the same reason the other exports send
 * theirs: no second set of English strings on the server to drift.
 */
export async function exportCarsExcel(
  labels: Record<string, string>,
  horizonDays: number,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.post('/api/ExportCars', labels, {
    params: { doc_horizon_days: horizonDays },
    responseType: 'blob',
  });

  const blob = new Blob([response.data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  let filename = 'cars.xlsx';
  const disposition = response.headers?.['content-disposition'];
  if (typeof disposition === 'string') {
    const match = disposition.match(/filename="?([^";]+)"?/i);
    if (match?.[1]) filename = match[1];
  }

  return { blob, filename };
}
