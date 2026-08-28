import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { saveAs } from 'file-saver';
import {
  createTransaction,
  createTransactionSplit,
  deleteTransaction,
  exportTransactions,
  getTransaction,
  getTransactions,
  getTransactionSplit,
  getTransactionStatistics,
  replaceTransactionSplit,
  unsplitTransaction,
  updateTransaction,
} from './api';
import type {
  SplitPartInput,
  TransactionFilters,
  TransactionFormValues,
  TransactionWriteExtras,
} from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toaster';
import { extractErrorMessage } from '@/shared/api/errors';
import type { QueryClient } from '@tanstack/react-query';
import { defaultLedgerFilters, defaultLedgerListFilters } from './defaults';

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
export function useTransactionsPaged(filters: TransactionFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.transactionList(filters),
    queryFn: ({ pageParam }) =>
      getTransactions(filters, pageParam as string | undefined, PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
    // The cash-in review list only fetches once its pocket is opened.
    enabled,
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

/* ─── Splits ─── */

/**
 * The whole split set for the editor. `id` may be the parent or any child —
 * the server resolves either to the same set. Never cached as fresh: the
 * parent's `version` in the response is the If-Match token for every split
 * write, and a stale one is a guaranteed 409.
 */
export function useTransactionSplit(id: number | undefined) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.transactionSplit(id) : ['transactions', 'split', 'none'],
    queryFn: () => getTransactionSplit(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

/**
 * POST (new split) or PUT (replace an existing part set), chosen by `replace`.
 * Both take the PARENT's version as If-Match. Invalidation covers the ledger,
 * statistics and every cached split set — they all live under 'transactions'.
 */
export function useSaveSplit() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      version,
      parts,
      replace,
    }: {
      /** POST: the row being split. PUT: the parent id from the loaded set. */
      id: number;
      version: number;
      parts: SplitPartInput[];
      replace: boolean;
    }) =>
      replace
        ? replaceTransactionSplit(id, version, parts)
        : createTransactionSplit(id, version, parts),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('fleetExpenses.split.saved'));
    },
    // 400s (bad sum, unsplittable row) and 409s (loan registered as a whole,
    // settled loans) carry precise server messages — surface them verbatim.
    onError: (error) => {
      toast.error(
        conflictMessage(
          error,
          t('fleetExpenses.split.saveFailed'),
          t('fleetExpenses.versionConflict'),
        ),
      );
    },
  });
}

/* ─── Unsplit (409 when any part's registered loan is settled) ─── */
export function useUnsplit() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, version }: { id: number; version: number }) =>
      unsplitTransaction(id, version),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('fleetExpenses.split.unsplitDone'));
    },
    onError: (error) => {
      toast.error(
        conflictMessage(
          error,
          t('fleetExpenses.split.unsplitFailed'),
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

/* -------------------------------------------------------------------------- */
/* Intent prefetch                                                             */
/* Warmed on hover/focus/touch by surfaces that know the click is coming.      */
/* MUST mirror the hook above key-for-key — a near-miss key is a wasted        */
/* request the page refetches anyway.                                          */
/* -------------------------------------------------------------------------- */

/** What the edit page mounts. */
export function prefetchTransaction(qc: QueryClient, id: number): void {
  void qc.prefetchQuery({
    queryKey: QUERY_KEYS.transaction(id),
    queryFn: () => getTransaction(id),
  });
}

/** The ledger's first page + its statistics, for warming the list itself. */
export function prefetchTransactionsFirstPage(qc: QueryClient, filters: TransactionFilters): void {
  void qc.prefetchInfiniteQuery({
    queryKey: QUERY_KEYS.transactionList(filters),
    queryFn: ({ pageParam }) => getTransactions(filters, pageParam as string | undefined, PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
  });
  void qc.prefetchQuery({
    queryKey: QUERY_KEYS.transactionStats(filters),
    queryFn: () => getTransactionStatistics(filters),
  });
}

/** The ledger page's full mount: out-only list, stats on the base filters. */
export function prefetchLedgerMount(qc: QueryClient): void {
  const base = defaultLedgerFilters();
  const list = defaultLedgerListFilters();
  void qc.prefetchInfiniteQuery({
    queryKey: QUERY_KEYS.transactionList(list),
    queryFn: ({ pageParam }) => getTransactions(list, pageParam as string | undefined, PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
  });
  void qc.prefetchQuery({
    queryKey: QUERY_KEYS.transactionStats(base),
    queryFn: () => getTransactionStatistics(base),
  });
}
