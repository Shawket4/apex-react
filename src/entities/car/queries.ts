import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCars, createCar, updateCar, setCarDriver } from './api';
import { QUERY_KEYS } from '@/shared/config/constants';
import type { QueryClient } from '@tanstack/react-query';

export function useCars() {
  return useQuery({
    queryKey: QUERY_KEYS.cars,
    queryFn: () => getCars(),
    staleTime: 5 * 60_000,
  });
}

export function useRegisterCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cars });
    },
  });
}

export function useUpdateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateCar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cars });
    },
  });
}

export function useSetCarDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, driverId }: { carId: number; driverId: number }) =>
      setCarDriver(carId, driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cars });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Intent prefetch                                                             */
/* Warmed on hover/focus/touch by surfaces that know the click is coming.      */
/* MUST mirror the hook above key-for-key — a near-miss key is a wasted        */
/* request the page refetches anyway.                                          */
/* -------------------------------------------------------------------------- */

export function prefetchCars(qc: QueryClient): void {
  void qc.prefetchQuery({ queryKey: QUERY_KEYS.cars, queryFn: () => getCars() });
}

