import type { AxiosInstance } from 'axios';
import { apiClientMaint } from '@/shared/api/client';
import {
  attendanceMonthSchema,
  maintTiresPageSchema,
  vehicleMaintenanceSchema,
  workOrderDetailSchema,
  workOrdersPageSchema,
  type AttendanceMonth,
  type MaintTiresPage,
  type MaintTiresParams,
  type VehicleMaintenance,
  type WorkOrderDetail,
  type WorkOrdersPage,
  type WorkOrdersParams,
} from './schemas';

/* -------------------------------------------------------------------------- */
/* maint-rust, office side: GET only                                           */
/*                                                                            */
/* The office looks; the garage writes. There is no mutation here and there    */
/* should never be one.                                                        */
/* -------------------------------------------------------------------------- */

/** False when no maintenance base URL could be worked out for this build. */
export const isMaintConfigured = apiClientMaint !== null;

function client(): AxiosInstance {
  if (!apiClientMaint) throw new Error('Maintenance API is not configured');
  return apiClientMaint;
}

/** Drop what was not asked for, so the address carries only real filters. */
export function cleanParams(params: Record<string, string | number | undefined>) {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    out[key] = value;
  }
  return out;
}

export async function getWorkOrders(params: WorkOrdersParams): Promise<WorkOrdersPage> {
  const res = await client().get('/office/work-orders', {
    params: cleanParams({
      status: params.status,
      vehicle_id: params.vehicleId,
      q: params.q?.trim(),
      from: params.from,
      to: params.to,
      limit: params.limit,
      offset: params.offset,
    }),
  });
  return workOrdersPageSchema.parse(res.data);
}

export async function getWorkOrder(id: string): Promise<WorkOrderDetail> {
  const res = await client().get(`/office/work-orders/${encodeURIComponent(id)}`);
  return workOrderDetailSchema.parse(res.data);
}

export async function getVehicleMaintenance(carId: number | string): Promise<VehicleMaintenance> {
  const res = await client().get(
    `/office/vehicles/${encodeURIComponent(String(carId))}/maintenance`,
  );
  return vehicleMaintenanceSchema.parse(res.data);
}

export async function getMaintTires(params: MaintTiresParams): Promise<MaintTiresPage> {
  const res = await client().get('/office/tires', {
    params: cleanParams({
      status: params.status,
      q: params.q?.trim(),
      limit: params.limit,
      offset: params.offset,
    }),
  });
  return maintTiresPageSchema.parse(res.data);
}

/** The garage's attendance for one month (YYYY-MM, Cairo calendar). */
export async function getAttendanceMonth(month: string): Promise<AttendanceMonth> {
  const res = await client().get('/office/attendance', { params: cleanParams({ month }) });
  return attendanceMonthSchema.parse(res.data);
}
