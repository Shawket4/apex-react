import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import {
  addOilChange,
  deleteOilChange,
  editOilChange,
  getOilChangeById,
  getOilChanges,
} from './api';
import type { AddOilChangePayload, EditOilChangePayload } from './schemas';
import { queryClient } from '@/shared/api/query';
import { extractErrorMessage } from '@/shared/api/errors';

/**
 * Query key namespace for oil-change records.
 *
 * Kept local rather than added to `shared/config/constants.ts` to avoid
 * coupling — if/when other modules need to invalidate oil-change caches,
 * import the array from here. Mirrors the shape of `QUERY_KEYS.fuelEvents`
 * elsewhere in the codebase.
 */
export const OIL_CHANGE_KEYS = {
  all: ['oil-changes'] as const,
  one: (id: number | string) => ['oil-change', String(id)] as const,
} as const;

export function useOilChanges() {
  return useQuery({
    queryKey: OIL_CHANGE_KEYS.all,
    queryFn: getOilChanges,
  });
}

export function useOilChange(id: number | string | undefined) {
  return useQuery({
    queryKey: id ? OIL_CHANGE_KEYS.one(id) : ['oil-change', 'none'],
    queryFn: () => getOilChangeById(id!),
    enabled: !!id,
  });
}

export function useAddOilChange() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: AddOilChangePayload) => addOilChange(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OIL_CHANGE_KEYS.all });
      toast.success(t('oilChanges.messages.created'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('oilChanges.messages.saveFailed')));
    },
  });
}

export function useEditOilChange() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: EditOilChangePayload) => editOilChange(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: OIL_CHANGE_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: OIL_CHANGE_KEYS.one(variables.ID) });
      toast.success(t('oilChanges.messages.updated'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('oilChanges.messages.saveFailed')));
    },
  });
}

export function useDeleteOilChange() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteOilChange(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OIL_CHANGE_KEYS.all });
      toast.success(t('oilChanges.messages.deleted'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('oilChanges.messages.deleteFailed')));
    },
  });
}
