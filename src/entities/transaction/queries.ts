import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
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

/* ─── List (paged) ─── */

/** Rows fetched per request. The API caps a page at 200. */
const PAGE_SIZE = 100;

/**
 * Cursor-paged list.
 *
 * Replaces an eager walk that pulled up to 25 pages (5,000 rows) on every
 * filter change and rendered all of them. That was slow on wide date ranges
 * and, worse, silently truncated: past 5,000 rows the table simply stopped,
 * with nothing to say so.
 *
 * The charts and breakdowns are unaffected because they come from
 * /transactions/statistics, which aggregates server-side over the whole
 * filtered set. So totals stay correct no matter how many pages are loaded --
 * only the visible rows are incremental.
 */
export function useTransactionsPaged(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.transactionList(filters),
    queryFn: ({ pageParam }) =>
      getTransactions(filters, pageParam as string | undefined, PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
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
    mutationFn: (values: ExpenseFormValues & { car_id?: number | null }) =>
      createTransaction(values),
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
      values: Partial<ExpenseFormValues> & {
        driver_id?: number | null;
        employee_id?: number | null;
        car_id?: number | null;
      };
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
