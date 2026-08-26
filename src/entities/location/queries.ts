import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { locationApi, type DropoffFilters } from './api';
import type {
  CreateDropoffPayload,
  ResolveTerminalPayload,
  SuggestionAckStatus,
  UpdateDropoffPayload,
  UpdateTerminalPayload,
  UpsertReceiptPatternPayload,
} from './schemas';

export const locationKeys = {
  all: ['locations'] as const,
  inbox: () => [...locationKeys.all, 'inbox'] as const,
  terminalsRoot: () => [...locationKeys.all, 'terminals'] as const,
  terminals: (company?: string) =>
    [...locationKeys.terminalsRoot(), company?.trim() || 'all'] as const,
  receiptPatterns: (terminalId: number) =>
    [...locationKeys.all, 'receipt-patterns', terminalId] as const,
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

/**
 * Terminals list. With `company`, only the terminals allowed for that company
 * (each carrying its resolved `receipt_pattern`); without, all terminals with
 * their `allowed_companies`.
 */
export function useTerminals(company?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: locationKeys.terminals(company),
    queryFn: () => locationApi.listTerminals(company),
    enabled: options.enabled ?? true,
  });
}

export function useReceiptPatterns(terminalId: number | null) {
  return useQuery({
    queryKey: locationKeys.receiptPatterns(terminalId ?? 0),
    queryFn: () => locationApi.listReceiptPatterns(terminalId ?? 0),
    enabled: terminalId != null,
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
      queryClient.invalidateQueries({ queryKey: locationKeys.terminalsRoot() });
      queryClient.invalidateQueries({ queryKey: locationKeys.inbox() });
      toast.success(t('locations.toast.terminalUpdated', 'Terminal updated'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.terminalUpdateError', 'Failed to update terminal'));
    },
  });
}

/**
 * Resolve-or-create-or-extend a terminal for a company. Success toasts are
 * left to the caller — it must differentiate "created" from "allowed for
 * company" using the response; only failures surface here.
 */
export function useResolveTerminal() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (payload: ResolveTerminalPayload) => locationApi.resolveTerminal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.terminalsRoot() });
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.terminalCreateError', 'Failed to create terminal'));
    },
  });
}

export function useUpsertReceiptPattern() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      terminalId,
      payload,
    }: {
      terminalId: number;
      payload: UpsertReceiptPatternPayload;
    }) => locationApi.upsertReceiptPattern(terminalId, payload),
    onSuccess: (_data, { terminalId }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.receiptPatterns(terminalId) });
      queryClient.invalidateQueries({ queryKey: locationKeys.terminalsRoot() });
      toast.success(t('locations.toast.patternSaved', 'Receipt pattern saved'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.patternSaveError', 'Failed to save receipt pattern'));
    },
  });
}

export function useDeleteReceiptPattern() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ terminalId, company }: { terminalId: number; company: string }) =>
      locationApi.deleteReceiptPattern(terminalId, company),
    onSuccess: (_data, { terminalId }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.receiptPatterns(terminalId) });
      queryClient.invalidateQueries({ queryKey: locationKeys.terminalsRoot() });
      toast.success(t('locations.toast.patternDeleted', 'Receipt pattern deleted'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('locations.toast.patternDeleteError', 'Failed to delete receipt pattern'));
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
