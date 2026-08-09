import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  addNote,
  deleteNote,
  getIgnored,
  getNotes,
  getRawMessages,
  getReviewQueue,
  getTags,
  reclassify,
  reparseOne,
  updateNote,
} from './api';
import type { ReclassifyAs } from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toaster';
import { extractErrorMessage } from '@/shared/api/errors';

function invalidateRaw(): void {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rawMessages });
  // Reclassifying can mint or retire a transaction, so the ledger is stale too.
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
}

/* ─── Review queue ─── */
export function useReviewQueue() {
  return useQuery({
    queryKey: [...QUERY_KEYS.rawMessages, 'review'],
    queryFn: () => getReviewQueue(100),
  });
}

export function useIgnoredMessages(enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.rawMessages, 'ignored'],
    queryFn: () => getIgnored(100),
    enabled,
  });
}

export function useRawMessages(status: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.rawMessages, 'list', status ?? 'all'],
    queryFn: () => getRawMessages(status, 100),
    enabled,
  });
}

/* ─── Feedback loop ─── */
export function useReclassify() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, as }: { id: number; as: ReclassifyAs }) => reclassify(id, as),
    onSuccess: (_d, vars) => {
      invalidateRaw();
      toast.success(
        vars.as === 'noise'
          ? t('review.markedAsNoise')
          : t('review.markedAsTransaction'),
      );
    },
    onError: (e) => toast.error(extractErrorMessage(e, t('review.actionFailed'))),
  });
}

export function useReparseOne() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => reparseOne(id),
    onSuccess: () => {
      invalidateRaw();
      toast.success(t('review.reparsed'));
    },
    onError: (e) => toast.error(extractErrorMessage(e, t('review.actionFailed'))),
  });
}

/* ─── Notes ─── */
export function useNotes(transactionId: number | undefined) {
  return useQuery({
    queryKey: transactionId
      ? [...QUERY_KEYS.transaction(transactionId), 'notes']
      : ['transactions', 'none', 'notes'],
    queryFn: () => getNotes(transactionId!),
    enabled: !!transactionId,
  });
}

function invalidateNotes(transactionId: number): void {
  void queryClient.invalidateQueries({
    queryKey: [...QUERY_KEYS.transaction(transactionId), 'notes'],
  });
}

export function useAddNote(transactionId: number) {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: string) => addNote(transactionId, body),
    onSuccess: () => {
      invalidateNotes(transactionId);
      toast.success(t('fleetExpenses.notes.added'));
    },
    onError: (e) => toast.error(extractErrorMessage(e, t('fleetExpenses.notes.failed'))),
  });
}

export function useUpdateNote(transactionId: number) {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => updateNote(id, body),
    onSuccess: () => {
      invalidateNotes(transactionId);
      toast.success(t('fleetExpenses.notes.updated'));
    },
    onError: (e) => toast.error(extractErrorMessage(e, t('fleetExpenses.notes.failed'))),
  });
}

export function useDeleteNote(transactionId: number) {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteNote(id),
    onSuccess: () => {
      invalidateNotes(transactionId);
      toast.success(t('fleetExpenses.notes.deleted'));
    },
    onError: (e) => toast.error(extractErrorMessage(e, t('fleetExpenses.notes.failed'))),
  });
}

/* ─── Tags ─── */
export function useTags() {
  return useQuery({ queryKey: QUERY_KEYS.tags, queryFn: getTags });
}
