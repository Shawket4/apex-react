import { apiGet } from '@/shared/api/client';
import { carsResponseSchema, type Car } from './schemas';

export async function getCars(): Promise<Car[]> {
  const data = await apiGet<unknown>('/api/cars');
  // Be lenient — API might one day return `{ data: [...] }`
  const array = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
  return carsResponseSchema.parse(array ?? []);
}
