import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/shared/api/errors';
import { advisorApi, type SuggestionFilters } from './api';
import type { AdvisorSearchRequest } from './schemas';

export const advisorKeys = {
  all: ['advisor'] as const,
  status: () => [...advisorKeys.all, 'status'] as const,
  conversations: () => [...advisorKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...advisorKeys.conversations(), id] as const,
  suggestions: () => [...advisorKeys.all, 'suggestions'] as const,
  suggestionList: (filters: SuggestionFilters) => [...advisorKeys.suggestions(), filters] as const,
  digests: () => [...advisorKeys.all, 'digests'] as const,
  search: (body: AdvisorSearchRequest) => [...advisorKeys.all, 'search', body] as const,
};

/* -------------------------------------------------------------------------- */
/* Queries                                                                     */
/* -------------------------------------------------------------------------- */

export function useAdvisorStatus() {
  return useQuery({
    queryKey: advisorKeys.status(),
    queryFn: advisorApi.getStatus,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useAdvisorConversations() {
  return useQuery({
    queryKey: advisorKeys.conversations(),
    queryFn: advisorApi.listConversations,
  });
}

export function useAdvisorConversation(id: string | null) {
  return useQuery({
    queryKey: advisorKeys.conversation(id ?? ''),
    queryFn: () => advisorApi.getConversation(id as string),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useAdvisorSuggestions(filters: SuggestionFilters = {}, enabled = true) {
  return useQuery({
    queryKey: advisorKeys.suggestionList(filters),
    queryFn: () => advisorApi.listSuggestions(filters),
    enabled,
  });
}

export function useAdvisorDigests() {
  return useQuery({
    queryKey: advisorKeys.digests(),
    queryFn: advisorApi.listDigests,
  });
}

/**
 * The AI service-history search. No retries: the caller falls back to the
 * FalconGo search the moment this fails, and a retry only delays that.
 */
export function useAdvisorSearch(body: AdvisorSearchRequest, enabled: boolean) {
  return useQuery({
    queryKey: advisorKeys.search(body),
    queryFn: () => advisorApi.search(body),
    enabled: enabled && body.query.length > 0,
    retry: false,
    staleTime: 60_000,
  });
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationKey: [...advisorKeys.conversations(), 'delete'],
    mutationFn: advisorApi.deleteConversation,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: advisorKeys.conversation(id) });
      queryClient.invalidateQueries({ queryKey: advisorKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: advisorKeys.suggestions() });
      toast.success(t('advisor.toast.conversationDeleted', 'Conversation deleted'));
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err));
    },
  });
}

function useDecideSuggestion(decision: 'approve' | 'reject') {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationKey: [...advisorKeys.suggestions(), decision],
    mutationFn: (id: string) =>
      decision === 'approve' ? advisorApi.approveSuggestion(id) : advisorApi.rejectSuggestion(id),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: advisorKeys.suggestions() });
      if (s.status === 'applied') {
        toast.success(t('advisor.toast.applied', 'Change applied in FalconGo'));
      } else if (s.status === 'failed') {
        toast.error(t('advisor.toast.applyFailed', 'FalconGo refused the change'));
      } else if (s.status === 'rejected') {
        toast.success(t('advisor.toast.rejected', 'Suggestion rejected'));
      }
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: advisorKeys.suggestions() });
      const status = (err as { status?: number }).status;
      toast.error(
        status === 409
          ? t('advisor.toast.alreadyDecided', 'Someone already decided this suggestion')
          : extractErrorMessage(err),
      );
    },
  });
}

export const useApproveSuggestion = () => useDecideSuggestion('approve');
export const useRejectSuggestion = () => useDecideSuggestion('reject');

/* -------------------------------------------------------------------------- */
/* Intent prefetch                                                             */
/* MUST mirror the hooks key-for-key.                                          */
/* -------------------------------------------------------------------------- */

export function prefetchAdvisor(qc: QueryClient): void {
  void qc.prefetchQuery({ queryKey: advisorKeys.status(), queryFn: advisorApi.getStatus });
  void qc.prefetchQuery({
    queryKey: advisorKeys.conversations(),
    queryFn: advisorApi.listConversations,
  });
  void qc.prefetchQuery({
    queryKey: advisorKeys.suggestionList({}),
    queryFn: () => advisorApi.listSuggestions({}),
  });
}

export function useRunDigest() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationKey: [...advisorKeys.digests(), 'run'],
    mutationFn: (days: number) => advisorApi.runDigest(days),
    onSuccess: () => {
      toast.info(t('advisor.toast.digestQueued', 'Writing the digest — it appears here when done'));
      // 202: the digest is written in the background. Look again shortly.
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: advisorKeys.digests() });
      }, 20_000);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err));
    },
  });
}
