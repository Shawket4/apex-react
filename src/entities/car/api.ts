import { apiGet } from '@/shared/api/client';
import { 
  carsResponseSchema, 
  paginatedCarsResponseSchema, 
  type Car 
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
