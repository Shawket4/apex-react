import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  addFuelEvent,
  deleteFuelEvent,
  editFuelEvent,
  getFuelEventById,
  getFuelEvents,
} from './api';
import type { AddFuelEventPayload, EditFuelEventPayload, FuelEventsFilter } from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toaster';
import { extractErrorMessage } from '@/shared/api/errors';

export function useFuelEvents(filter: FuelEventsFilter = {}) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.fuelEvents,
      {
        from: filter.from ?? null,
        to: filter.to ?? null,
        petroApp: !!filter.petroAppOnly,
      },
    ],
    queryFn: () => getFuelEvents(filter),
  });
}

export function useFuelEvent(id: number | string | undefined) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.fuelEvent(id) : ['fuel-event', 'none'],
    queryFn: () => getFuelEventById(id!),
    enabled: !!id,
  });
}

export function useAddFuelEvent() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: AddFuelEventPayload) => addFuelEvent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fuelEvents });
      toast.success(t('fuelEvents.recordedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('fuelEvents.saveFailed')));
    },
  });
}

export function useEditFuelEvent() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: EditFuelEventPayload) => editFuelEvent(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fuelEvents });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fuelEvent(variables.ID) });
      toast.success(t('fuelEvents.updatedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('fuelEvents.saveFailed')));
    },
  });
}

export function useDeleteFuelEvent() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteFuelEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fuelEvents });
      toast.success(t('fuelEvents.deletedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('fuelEvents.deleteFailed')));
    },
  });
}