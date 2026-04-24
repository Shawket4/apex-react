import { apiPost } from '@/shared/api/client';
import {
  driverExpensesResponseSchema,
  type DriverExpense,
  type AddExpensePayload,
} from './schemas';

/* ─── List expenses for a driver ─── */
export async function getDriverExpenses(driverId: number): Promise<DriverExpense[]> {
  const data = await apiPost<unknown>('/api/GetDriverExpenses', { id: driverId });
  const array = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
  return driverExpensesResponseSchema.parse(array ?? []);
}

/* ─── Register a new expense ─── */
export async function addDriverExpense(payload: AddExpensePayload): Promise<void> {
  await apiPost<unknown>('/api/RegisterDriverExpense', payload);
}

/* ─── Delete an expense ─── */
export async function deleteDriverExpense(id: number): Promise<void> {
  await apiPost<unknown>('/api/DeleteExpense', { id });
}
