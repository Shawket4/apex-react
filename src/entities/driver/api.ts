import { apiGet, apiPost, apiClient } from '@/shared/api/client';
import {
  driversResponseSchema,
  driverSchema,
  type Driver,
  type DriverPayload,
} from './schemas';

/* ─── List all drivers (simple — used by fuel-event form dropdown too) ─── */
export async function getDrivers(): Promise<Driver[]> {
  const data = await apiGet<unknown>('/api/drivers');
  const array = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
  return driversResponseSchema.parse(array ?? []);
}

/* ─── List drivers with full profile data ─── */
export async function getDriverProfiles(): Promise<Driver[]> {
  const data = await apiPost<unknown>('/api/GetDriverProfileData', {});
  const array = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
  return driversResponseSchema.parse(array ?? []);
}

/* ─── Get single driver ─── */
export async function getDriver(id: number | string): Promise<Driver> {
  const data = await apiGet<unknown>(`/api/drivers/${id}`);
  return driverSchema.parse(data);
}

/* ─── Register (create) driver ─── */
export async function registerDriver(payload: DriverPayload): Promise<void> {
  // Drivers this dashboard adds work for Apex; the field exists for the
  // contractors' drivers other clients register.
  await apiPost<unknown>('/api/drivers', { ...payload, transporter: 'Apex' });
}

/* ─── Update driver basic info ─── */
export async function updateDriver(id: number, payload: Partial<DriverPayload>): Promise<void> {
  await apiClient.put(`/api/drivers/${id}`, payload);
}

/* ─── Delete driver ─── */
export async function deleteDriver(id: number): Promise<void> {
  // The legacy POST /api/DeleteDriver RPC no longer exists in FalconGo;
  // DELETE /api/drivers/:id is the surviving route.
  await apiClient.delete(`/api/drivers/${id}`);
}

/* ─── Approve / Reject ─── */
export async function approveDriver(id: number): Promise<void> {
  await apiPost<unknown>('/api/ApproveRequest', {
    TableName: 'users',
    ColumnIdName: 'id',
    Id: id,
  });
}

export async function rejectDriver(id: number): Promise<void> {
  await apiPost<unknown>('/api/RejectRequest', {
    TableName: 'users',
    ColumnIdName: 'id',
    Id: id,
  });
}

/* ─── Regenerate PIN ─── */
export interface RegeneratePinResponse {
  success: boolean;
  data: { pin: string; message?: string };
}

export async function regeneratePin(id: number): Promise<RegeneratePinResponse> {
  const res = await apiClient.put(`/api/drivers/${id}/regenerate-pin`);
  return res.data as RegeneratePinResponse;
}
