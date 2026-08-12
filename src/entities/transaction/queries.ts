import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { saveAs } from 'file-saver';
import {
  createTransaction,
  deleteTransaction,
  exportTransactions,
  getTransaction,
  getTransactions,
  getTransactionStatistics,
  updateTransaction,
} from './api';
import type {
  TransactionFilters,
  TransactionFormValues,
  TransactionWriteExtras,
} from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toaster';
import { extractErrorMessage } from '@/shared/api/errors';

/** Invalidate every transaction-derived query after a write. */
function invalidateAll(): void {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
  // Promoting a message mints a transaction; the messages list is stale too.
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages });
}

/* ─── List (cursor-paged) ─── */

/** Rows fetched per request. The API caps a page at 200. */
const PAGE_SIZE = 100;

/**
 * Cursor-paged list. Totals never come from these rows — they come from
 * /transactions/statistics, which aggregates server-side over the whole
 * filtered set, so a partially-loaded list still shows correct numbers.
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

/* ─── 409 handling ─── */

/**
 * The API has two distinct 409s on writes: "version conflict" (someone else
 * edited the row since it was loaded) and "registered loan is already
 * settled; unsettle it in FalconGo first". The second message says exactly
 * what to do, so it is surfaced verbatim rather than flattened into the
 * generic conflict copy.
 */
function conflictMessage(error: unknown, fallback: string, versionCopy: string): string {
  const status = (error as { status?: number })?.status;
  if (status !== 409) return extractErrorMessage(error, fallback);
  const message = extractErrorMessage(error, '');
  if (message && message !== 'version conflict') return message;
  return versionCopy;
}

/* ─── Create ─── */
export function useCreateTransaction() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (values: TransactionFormValues & TransactionWriteExtras) =>
      createTransaction(values),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('fleetExpenses.recordedSuccessfully'));
    },
    onError: (error) => {
      toast.error(
        conflictMessage(
          error,
          t('fleetExpenses.saveFailed'),
          t('fleetExpenses.versionConflict'),
        ),
      );
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
      values: Partial<TransactionFormValues> & TransactionWriteExtras;
    }) => updateTransaction(id, version, values),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('fleetExpenses.updatedSuccessfully'));
    },
    onError: (error) => {
      toast.error(
        conflictMessage(
          error,
          t('fleetExpenses.saveFailed'),
          t('fleetExpenses.versionConflict'),
        ),
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
      toast.error(
        conflictMessage(
          error,
          t('fleetExpenses.deleteFailed'),
          t('fleetExpenses.versionConflict'),
        ),
      );
    },
  });
}

/* ─── Export ─── */

/**
 * Server-rendered XLSX over the current filters — the whole filtered set,
 * uncapped. Fetched through the API client (not a bare <a href>) so the
 * Authorization header travels with it in Tauri builds where the cookie
 * doesn't; the Content-Disposition filename is honoured either way.
 */
export function useExportTransactions() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (filters: TransactionFilters) => exportTransactions(filters),
    onSuccess: ({ blob, filename }) => {
      saveAs(blob, filename);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('fleetExpenses.exportFailed')));
    },
  });
}
