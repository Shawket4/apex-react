import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query';
import { NotFoundError } from '@/shared/api/errors';
import {
  getAttendanceMonth,
  getMaintTires,
  getVehicleMaintenance,
  getWorkOrder,
  getWorkOrders,
  isMaintConfigured,
} from './api';
import type { MaintTiresParams, WorkOrdersParams } from './schemas';

/**
 * Query keys for the garage maintenance system. Local to the entity, like
 * `OIL_CHANGE_KEYS`: nothing in the office writes this data, so nothing
 * outside needs to invalidate it.
 */
export const MAINTENANCE_KEYS = {
  all: ['maintenance'] as const,
  workOrders: (params: WorkOrdersParams) => ['maintenance', 'work-orders', params] as const,
  workOrder: (id: string) => ['maintenance', 'work-order', id] as const,
  vehicle: (carId: number | string) => ['maintenance', 'vehicle', String(carId)] as const,
  tires: (params: MaintTiresParams) => ['maintenance', 'tires', params] as const,
  attendance: (month: string) => ['maintenance', 'attendance', month] as const,
} as const;

/** The mount state of `/work-orders`: everything, newest page, 20 a page. */
export const WORK_ORDERS_PAGE_SIZE = 20;
export const DEFAULT_WORK_ORDERS_PARAMS: WorkOrdersParams = {
  limit: WORK_ORDERS_PAGE_SIZE,
  offset: 0,
};

/** An unknown id will not appear on a second try. */
function retryUnlessMissing(failureCount: number, error: unknown): boolean {
  if (error instanceof NotFoundError) return false;
  return failureCount < 2;
}

export function useWorkOrders(params: WorkOrdersParams) {
  return useQuery({
    queryKey: MAINTENANCE_KEYS.workOrders(params),
    queryFn: () => getWorkOrders(params),
    enabled: isMaintConfigured,
    placeholderData: keepPreviousData, // paging and filters keep the table in place
  });
}

export function useWorkOrder(id: string | undefined) {
  return useQuery({
    queryKey: MAINTENANCE_KEYS.workOrder(id ?? 'none'),
    queryFn: () => getWorkOrder(id!),
    enabled: isMaintConfigured && !!id,
    retry: retryUnlessMissing,
  });
}

export function useVehicleMaintenance(carId: number | string | undefined) {
  return useQuery({
    queryKey: MAINTENANCE_KEYS.vehicle(carId ?? 'none'),
    queryFn: () => getVehicleMaintenance(carId!),
    enabled: isMaintConfigured && carId !== undefined && carId !== '',
    retry: retryUnlessMissing,
  });
}

export function useMaintTires(params: MaintTiresParams, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_KEYS.tires(params),
    queryFn: () => getMaintTires(params),
    enabled: isMaintConfigured && enabled,
    placeholderData: keepPreviousData,
  });
}

/* -------------------------------------------------------------------------- */
/* Intent prefetch                                                             */
/* MUST mirror the hooks above key-for-key.                                    */
/* -------------------------------------------------------------------------- */

export function prefetchWorkOrders(qc: QueryClient): void {
  if (!isMaintConfigured) return;
  void qc.prefetchQuery({
    queryKey: MAINTENANCE_KEYS.workOrders(DEFAULT_WORK_ORDERS_PARAMS),
    queryFn: () => getWorkOrders(DEFAULT_WORK_ORDERS_PARAMS),
  });
}

export function prefetchWorkOrder(qc: QueryClient, id: string): void {
  if (!isMaintConfigured) return;
  void qc.prefetchQuery({
    queryKey: MAINTENANCE_KEYS.workOrder(id),
    queryFn: () => getWorkOrder(id),
  });
}

/** One month of garage attendance; the previous month stays on screen while the next loads. */
export function useAttendanceMonth(month: string) {
  return useQuery({
    queryKey: MAINTENANCE_KEYS.attendance(month),
    queryFn: () => getAttendanceMonth(month),
    enabled: isMaintConfigured,
    placeholderData: keepPreviousData,
  });
}
