import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { locationApi, type DropoffFilters } from './api';
import type {
  CreateDropoffPayload,
  SuggestionAckStatus,
  UpdateDropoffPayload,
  UpdateTerminalPayload,
} from './schemas';

export const locationKeys = {
  all: ['locations'] as const,
  inbox: () => [...locationKeys.all, 'inbox'] as const,
  terminals: () => [...locationKeys.all, 'terminals'] as const,
  dropoffs: () => [...locationKeys.all, 'dropoffs'] as const,
  dropoffList: (filters: DropoffFilters) => [...locationKeys.dropoffs(), filters] as const,
  suggestions: (status: string) => [...locationKeys.all, 'suggestions', status] as const,
};

/* -------------------------------------------------------------------------- */
/* Queries                                                                     */
/* -------------------------------------------------------------------------- */

export function useLocationsInbox() {
  return useQuery({
    queryKey: locationKeys.inbox(),
    queryFn: () => locationApi.getInbox(),
  });
}

export function useTerminals() {
  return useQuery({
    queryKey: locationKeys.terminals(),
    queryFn: () => locationApi.listTerminals(),
  });
}

export function useDropoffs(filters: DropoffFilters = {}) {
  return useQuery({
    queryKey: locationKeys.dropoffList(filters),
    queryFn: () => locationApi.listDropoffs(filters),
  });
}

/**
 * GPS-derived pin suggestions from the etit proxy. This service may not be
 * deployed yet — consumers must treat `isError` as "no suggestions" and keep
 * rendering the DB-derived inbox items. `retry: 1` keeps the failure fast.
 */
export function usePinSuggestions(status = 'pending') {
  return useQuery({
    queryKey: locationKeys.suggestions(status),
    queryFn: () => locationApi.listSuggestions(status),
    retry: 1,
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

export function useUpdateTerminal() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTerminalPayload }) =>
      locationApi.updateTerminal(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.terminals() });
      queryClient.invalidateQueries({ queryKey: locationKeys.inbox() });
      toast.success(t('locations.toast.terminalUpdated', 'Terminal updated'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.terminalUpdateError', 'Failed to update terminal'));
    },
  });
}

export function useAddTerminalAlias() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ terminalId, alias }: { terminalId: number; alias: string }) =>
      locationApi.addTerminalAlias(terminalId, alias),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.terminals() });
      queryClient.invalidateQueries({ queryKey: locationKeys.inbox() });
      toast.success(t('locations.toast.aliasAdded', 'Alias added'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.aliasAddError', 'Failed to add alias'));
    },
  });
}

export function useDeleteTerminalAlias() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (aliasId: number) => locationApi.deleteAlias(aliasId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.terminals() });
      queryClient.invalidateQueries({ queryKey: locationKeys.inbox() });
      toast.success(t('locations.toast.aliasRemoved', 'Alias removed'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.aliasRemoveError', 'Failed to remove alias'));
    },
  });
}

export function useCreateDropoff() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (payload: CreateDropoffPayload) => locationApi.createDropoff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.dropoffs() });
      queryClient.invalidateQueries({ queryKey: locationKeys.inbox() });
      toast.success(t('locations.toast.dropoffCreated', 'Drop-off point created'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.dropoffCreateError', 'Failed to create drop-off point'));
    },
  });
}

export function useUpdateDropoff() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDropoffPayload }) =>
      locationApi.updateDropoff(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.dropoffs() });
      queryClient.invalidateQueries({ queryKey: locationKeys.inbox() });
      toast.success(t('locations.toast.dropoffUpdated', 'Drop-off point updated'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.dropoffUpdateError', 'Failed to update drop-off point'));
    },
  });
}

export function useDeleteDropoff() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => locationApi.deleteDropoff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.dropoffs() });
      queryClient.invalidateQueries({ queryKey: locationKeys.inbox() });
      toast.success(t('locations.toast.dropoffDeleted', 'Drop-off point deleted'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.dropoffDeleteError', 'Failed to delete drop-off point'));
    },
  });
}

/**
 * Acknowledge a GPS suggestion on the etit proxy. Success toasts are left to
 * the calling flow (accepting also fires a FalconGo update with its own
 * toast); only failures surface here.
 */
export function useAckSuggestion() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: SuggestionAckStatus }) =>
      locationApi.ackSuggestion(id, status),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      if (status === 'dismissed') {
        toast.success(t('locations.toast.suggestionDismissed', 'Suggestion dismissed'));
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.suggestionAckError', 'Failed to update suggestion'));
    },
  });
}
