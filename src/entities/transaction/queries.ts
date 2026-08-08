import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  createTransaction,
  deleteTransaction,
  getAllTransactions,
  getTransaction,
  getTransactionHistory,
  getTransactionStatistics,
  updateTransaction,
} from './api';
import type { ExpenseFormValues, TransactionFilters } from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toaster';
import { extractErrorMessage } from '@/shared/api/errors';

/** Invalidate every transaction-derived query after a write. */
function invalidateAll(): void {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
}

/* ─── List ─── */
export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.transactionList(filters),
    queryFn: () => getAllTransactions(filters),
    // The expenses view re-queries on every filter change; a short window keeps
    // date-range toggling responsive without serving visibly stale money.
    staleTime: 30_000,
  });
}

/* ─── Statistics ─── */
export function useTransactionStatistics(filters: TransactionFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.transactionStats(filters),
    queryFn: () => getTransactionStatistics(filters),
    staleTime: 30_000,
  });
}

/* ─── Single ─── */
export function useTransaction(id: number | undefined) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.transaction(id) : ['transactions', 'none'],
    queryFn: () => getTransaction(id!),
    enabled: !!id,
  });
}

/* ─── Override history ─── */
export function useTransactionHistory(id: number | undefined) {
  return useQuery({
    queryKey: id ? [...QUERY_KEYS.transaction(id), 'history'] : ['transactions', 'none'],
    queryFn: () => getTransactionHistory(id!),
    enabled: !!id,
  });
}

/* ─── Create ─── */
export function useCreateTransaction() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (values: ExpenseFormValues) => createTransaction(values),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('fleetExpenses.recordedSuccessfully'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('fleetExpenses.saveFailed')));
    },
  });
}

/* ─── Update ─── */
export function useUpdateTransaction() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      version,
      values,
    }: {
      id: number;
      version: number;
      values: Partial<ExpenseFormValues> & { verified?: boolean };
    }) => updateTransaction(id, version, values),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('fleetExpenses.updatedSuccessfully'));
    },
    onError: (error) => {
      // A 409 means someone else edited the row since it was loaded. Say that,
      // rather than surfacing a raw "Conflict".
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(
        status === 409
          ? t('fleetExpenses.versionConflict')
          : extractErrorMessage(error, t('fleetExpenses.saveFailed')),
      );
    },
  });
}

/* ─── Delete ─── */
export function useDeleteTransaction() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, version }: { id: number; version: number }) =>
      deleteTransaction(id, version),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('fleetExpenses.deletedSuccessfully'));
    },
    onError: (error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(
        status === 409
          ? t('fleetExpenses.versionConflict')
          : extractErrorMessage(error, t('fleetExpenses.deleteFailed')),
      );
    },
  });
}
