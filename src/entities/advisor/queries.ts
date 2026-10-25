import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/shared/api/errors';
import { advisorApi, type SuggestionFilters } from './api';
import { decisionErrorText, decisionToast } from './decision-text';
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

/** The advisor needs permission 4. A 403 will not change on retry; say so at once. */
export function isForbidden(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === 403;
}

function retryUnlessForbidden(failureCount: number, error: unknown): boolean {
  if (isForbidden(error) || (error as { status?: number } | null)?.status === 401) return false;
  return failureCount < 2;
}

export function useAdvisorStatus() {
  return useQuery({
    queryKey: advisorKeys.status(),
    queryFn: advisorApi.getStatus,
    staleTime: 5 * 60_000,
    retry: (n, err) => !isForbidden(err) && n < 1,
  });
}

export function useAdvisorConversations() {
  return useQuery({
    queryKey: advisorKeys.conversations(),
    queryFn: advisorApi.listConversations,
    retry: retryUnlessForbidden,
  });
}

export function useAdvisorConversation(id: string | null) {
  return useQuery({
    queryKey: advisorKeys.conversation(id ?? ''),
    queryFn: () => advisorApi.getConversation(id as string),
    enabled: !!id,
    staleTime: Infinity,
    retry: retryUnlessForbidden,
  });
}

export function useAdvisorSuggestions(filters: SuggestionFilters = {}, enabled = true) {
  return useQuery({
    queryKey: advisorKeys.suggestionList(filters),
    queryFn: () => advisorApi.listSuggestions(filters),
    enabled,
    retry: retryUnlessForbidden,
  });
}

export function useAdvisorDigests() {
  return useQuery({
    queryKey: advisorKeys.digests(),
    queryFn: advisorApi.listDigests,
    retry: retryUnlessForbidden,
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
      const shown = decisionToast(s, t);
      if (shown?.kind === 'success') toast.success(shown.text);
      else if (shown?.kind === 'error') toast.error(shown.text);
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: advisorKeys.suggestions() });
      toast.error(decisionErrorText(err, t, extractErrorMessage(err)));
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
