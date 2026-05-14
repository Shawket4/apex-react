import { apiGet, apiPost, apiClient } from '@/shared/api/client';
import {
  carsResponseSchema,
  paginatedCarsResponseSchema,
  type Car,
  type CarFormValues
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

export async function createCar(data: CarFormValues): Promise<Car> {
  return apiPost<Car>('/api/cars/', data);
}

export async function updateCar(id: number, data: Partial<CarFormValues>): Promise<Car> {
  const formData = new FormData();
  formData.append('request', JSON.stringify({ ID: id, ...data }));

  const response = await apiClient.put<Car>(`/api/cars/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function setCarDriver(carId: number, driverId: number): Promise<void> {
  await apiClient.patch('/api/protected/SetCarDriverPair', {
    car_id: carId,
    driver_id: driverId,
  });
}
