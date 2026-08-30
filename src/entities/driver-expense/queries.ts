import { type QueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getDriverExpenses, addDriverExpense, deleteDriverExpense } from './api';
import type { AddExpensePayload } from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toast';
import { extractErrorMessage } from '@/shared/api/errors';

/* ─── List ─── */
export function useDriverExpenses(driverId: number | undefined) {
  return useQuery({
    queryKey: driverId ? QUERY_KEYS.driverExpenses(driverId) : ['driver-expenses', 'none'],
    queryFn: () => getDriverExpenses(driverId!),
    enabled: !!driverId,
  });
}

/* ─── Add ─── */
export function useAddDriverExpense() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: AddExpensePayload) => addDriverExpense(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.driverExpenses(variables.expense.driver_id),
      });
      toast.success(t('driverExpenses.addedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('driverExpenses.saveFailed')));
    },
  });
}

/* ─── Delete ─── */
export function useDeleteDriverExpense(driverId: number) {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteDriverExpense(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.driverExpenses(driverId),
      });
      toast.success(t('driverExpenses.deletedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('driverExpenses.deleteFailed')));
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Intent prefetch                                                             */
/* Warmed on hover/focus/touch by surfaces that know the click is coming.      */
/* MUST mirror the hook above key-for-key — a near-miss key is a wasted        */
/* request the page refetches anyway.                                          */
/* -------------------------------------------------------------------------- */

export function prefetchDriverExpenses(qc: QueryClient, driverId: number): void {
  void qc.prefetchQuery({
    queryKey: ['drivers', String(driverId), 'expenses'],
    queryFn: () => getDriverExpenses(driverId),
  });
}
