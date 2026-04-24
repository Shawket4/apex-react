import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getDriverLoans, addDriverLoan, deleteDriverLoan } from './api';
import type { AddLoanPayload } from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toaster';
import { extractErrorMessage } from '@/shared/api/errors';

/* ─── List ─── */
export function useDriverLoans(driverId: number | undefined) {
  return useQuery({
    queryKey: driverId ? QUERY_KEYS.driverLoans(driverId) : ['driver-loans', 'none'],
    queryFn: () => getDriverLoans(driverId!),
    enabled: !!driverId,
  });
}

/* ─── Add ─── */
export function useAddDriverLoan() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: AddLoanPayload) => addDriverLoan(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.driverLoans(variables.driver_id),
      });
      toast.success(t('driverLoans.addedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('driverLoans.saveFailed')));
    },
  });
}

/* ─── Delete ─── */
export function useDeleteDriverLoan(driverId: number) {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteDriverLoan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.driverLoans(driverId),
      });
      toast.success(t('driverLoans.deletedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('driverLoans.deleteFailed')));
    },
  });
}
