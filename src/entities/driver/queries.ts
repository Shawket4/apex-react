import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getDrivers,
  getDriverProfiles,
  registerDriver,
  updateDriver,
  updateDriverDocuments,
  deleteDriver,
  approveDriver,
  rejectDriver,
  regeneratePin,
} from './api';
import type {
  RegisterDriverPayload,
  UpdateDriverPayload,
  UpdateDriverDocumentsPayload,
} from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toaster';
import { extractErrorMessage } from '@/shared/api/errors';

/* ─── List (simple — used by fuel-event form) ─── */
export function useDrivers() {
  return useQuery({
    queryKey: QUERY_KEYS.drivers,
    queryFn: getDrivers,
    staleTime: 5 * 60_000,
  });
}

/* ─── List with full profile data (used by drivers table) ─── */
export function useDriverProfiles() {
  return useQuery({
    queryKey: [...QUERY_KEYS.drivers, 'profiles'],
    queryFn: getDriverProfiles,
    staleTime: 5 * 60_000,
  });
}

/* ─── Detail (derived from cached profiles list) ─── */
export function useDriver(id: number | string | undefined) {
  const profilesQuery = useDriverProfiles();
  const numId = id ? Number(id) : undefined;

  return {
    ...profilesQuery,
    data: numId
      ? profilesQuery.data?.find((d) => d.ID === numId) ?? undefined
      : undefined,
  };
}

/* ─── Create ─── */
export function useRegisterDriver() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: RegisterDriverPayload) => registerDriver(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drivers });
      toast.success(t('drivers.registeredSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('drivers.saveFailed')));
    },
  });
}

/* ─── Update basic info ─── */
export function useUpdateDriver() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: UpdateDriverPayload) => updateDriver(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drivers });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.driver(variables.id) });
      toast.success(t('drivers.updatedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('drivers.saveFailed')));
    },
  });
}

/* ─── Update documents ─── */
export function useUpdateDriverDocuments() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      files,
    }: {
      id: number;
      payload: UpdateDriverDocumentsPayload;
      files: Record<string, File>;
    }) => updateDriverDocuments(id, payload, files),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drivers });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.driver(variables.id) });
      toast.success(t('drivers.documentsUpdated'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('drivers.documentsFailed')));
    },
  });
}

/* ─── Delete ─── */
export function useDeleteDriver() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteDriver(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drivers });
      toast.success(t('drivers.deletedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('drivers.deleteFailed')));
    },
  });
}

/* ─── Approve / Reject ─── */
export function useApproveDriver() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => approveDriver(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drivers });
      toast.success(t('drivers.approvedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('drivers.approveFailed')));
    },
  });
}

export function useRejectDriver() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => rejectDriver(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drivers });
      toast.success(t('drivers.rejectedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('drivers.rejectFailed')));
    },
  });
}

/* ─── Regenerate PIN ─── */
export function useRegeneratePin() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => regeneratePin(id),
    onSuccess: () => {
      toast.success(t('drivers.pinRegenerated'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('drivers.pinFailed')));
    },
  });
}
