import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getDriverExpenses, addDriverExpense, deleteDriverExpense } from './api';
import type { AddExpensePayload } from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toaster';
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
