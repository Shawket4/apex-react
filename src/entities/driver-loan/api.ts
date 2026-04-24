import { apiPost } from '@/shared/api/client';
import {
  driverLoansResponseSchema,
  type DriverLoan,
  type AddLoanPayload,
} from './schemas';

/* ─── List loans for a driver ─── */
export async function getDriverLoans(driverId: number): Promise<DriverLoan[]> {
  const data = await apiPost<unknown>('/api/GetDriverLoans', { id: driverId });
  const array = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
  return driverLoansResponseSchema.parse(array ?? []);
}

/* ─── Register a new loan ─── */
export async function addDriverLoan(payload: AddLoanPayload): Promise<void> {
  await apiPost<unknown>('/api/RegisterDriverLoan/', payload);
}

/* ─── Delete a loan ─── */
export async function deleteDriverLoan(id: number): Promise<void> {
  await apiPost<unknown>('/api/DeleteLoan', { id });
}
