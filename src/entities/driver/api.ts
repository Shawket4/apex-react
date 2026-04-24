import { apiGet, apiPost, apiClient } from '@/shared/api/client';
import {
  driversResponseSchema,
  driverSchema,
  type Driver,
  type RegisterDriverPayload,
  type UpdateDriverPayload,
  type UpdateDriverDocumentsPayload,
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
  const fd = new FormData();
  fd.append('id', String(id));
  const res = await apiClient.post('/api/GetDriver', fd);
  return driverSchema.parse(res.data);
}

/* ─── Register (create) driver ─── */
export async function registerDriver(payload: RegisterDriverPayload): Promise<void> {
  const fd = new FormData();
  fd.append('request', JSON.stringify(payload));
  await apiClient.post('/api/protected/RegisterDriver', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/* ─── Update driver basic info ─── */
export async function updateDriver(payload: UpdateDriverPayload): Promise<void> {
  const fd = new FormData();
  fd.append('request', JSON.stringify(payload));
  await apiClient.post('/api/protected/UpdateDriver', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/* ─── Update driver documents (dates + images) ─── */
export async function updateDriverDocuments(
  id: number,
  payload: UpdateDriverDocumentsPayload,
  files: Record<string, File>,
): Promise<void> {
  const fd = new FormData();
  fd.append('request', JSON.stringify(payload));
  Object.entries(files).forEach(([key, file]) => {
    if (file) fd.append(key, file);
  });
  await apiClient.put(`/api/drivers/${id}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/* ─── Delete driver ─── */
export async function deleteDriver(id: number): Promise<void> {
  await apiPost<unknown>('/api/DeleteDriver', { ID: id });
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

/* ─── Download document image (blob) ─── */
export async function getDocumentImage(path: string): Promise<string> {
  const res = await apiClient.get(path, { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
}
