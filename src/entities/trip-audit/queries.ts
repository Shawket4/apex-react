import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  getTripMatchReplay,
  tripAuditApi,
  type TripAuditSummaryFilters,
  type TripMatchFilters,
} from './api';

export const tripAuditKeys = {
  all: ['trip-audit'] as const,
  matches: () => [...tripAuditKeys.all, 'matches'] as const,
  matchList: (filters: TripMatchFilters) => [...tripAuditKeys.matches(), filters] as const,
  summaries: () => [...tripAuditKeys.all, 'summary'] as const,
  summary: (filters: TripAuditSummaryFilters) =>
    [...tripAuditKeys.summaries(), filters] as const,
  details: () => [...tripAuditKeys.all, 'detail'] as const,
  detail: (id: number) => [...tripAuditKeys.details(), id] as const,
  runs: () => [...tripAuditKeys.all, 'runs'] as const,
};

/* -------------------------------------------------------------------------- */
/* Queries                                                                     */
/* -------------------------------------------------------------------------- */

export function useTripMatches(filters: TripMatchFilters = {}) {
  return useQuery({
    queryKey: tripAuditKeys.matchList(filters),
    queryFn: () => tripAuditApi.listMatches(filters),
    // Keep the previous page rendered while the next one loads so the
    // pagination controls don't jump.
    placeholderData: keepPreviousData,
  });
}

/** Whole-window KPI aggregates — same from/to/company as the list. */
export function useTripAuditSummary(filters: TripAuditSummaryFilters = {}) {
  return useQuery({
    queryKey: tripAuditKeys.summary(filters),
    queryFn: () => tripAuditApi.getSummary(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useTripMatch(id: number | null) {
  return useQuery({
    queryKey: tripAuditKeys.detail(id ?? -1),
    queryFn: () => tripAuditApi.getMatch(id as number),
    enabled: id != null,
  });
}

/**
 * NEW export for the trip-replay page — same endpoint as `useTripMatch`
 * but parsed with the replay schema (keeps `off_route_pct`). Separate
 * query key so the two parsed shapes never collide in the cache.
 */
export function useTripMatchReplay(id: number | null) {
  return useQuery({
    queryKey: [...tripAuditKeys.details(), 'replay', id ?? -1] as const,
    queryFn: () => getTripMatchReplay(id as number),
    enabled: id != null,
    staleTime: 60_000,
  });
}

export function useTripAuditRuns() {
  return useQuery({
    queryKey: tripAuditKeys.runs(),
    queryFn: () => tripAuditApi.listRuns(),
    staleTime: 30_000,
    retry: 1,
  });
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

export function useReviewMatch() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      tripAuditApi.reviewMatch(id, note),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: tripAuditKeys.matches() });
      queryClient.invalidateQueries({ queryKey: tripAuditKeys.summaries() });
      queryClient.invalidateQueries({ queryKey: tripAuditKeys.detail(id) });
      toast.success(t('tripAudit.toast.reviewSuccess', 'Marked as reviewed'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('tripAudit.toast.reviewError', 'Failed to mark as reviewed'));
    },
  });
}

/**
 * Fire-and-wait scan: toasts "scan started" immediately (the proxy runs the
 * scan synchronously and the request can take minutes), then refetches runs
 * and matches when the request resolves.
 */
export function useRunScan() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (dates?: string[]) => tripAuditApi.runScan(dates),
    onMutate: () => {
      toast.info(t('tripAudit.toast.scanStarted', 'Scan started'), {
        description: t(
          'tripAudit.toast.scanStartedDesc',
          'This can take a few minutes — results will refresh automatically.',
        ),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tripAuditKeys.all });
      if (data.error) {
        toast.error(t('tripAudit.toast.scanError', 'Scan finished with an error'), {
          description: data.error,
        });
      } else {
        toast.success(t('tripAudit.toast.scanComplete', 'Scan complete'), {
          description: t('tripAudit.toast.scanSummary', {
            scanned: data.trips_scanned ?? 0,
            matched: data.trips_matched ?? 0,
            flags: data.flags_raised ?? 0,
            defaultValue:
              '{{scanned}} trips scanned, {{matched}} matched, {{flags}} flags raised',
          }),
        });
      }
    },
    onError: (err) => {
      console.error(err);
      queryClient.invalidateQueries({ queryKey: tripAuditKeys.all });
      toast.error(t('tripAudit.toast.scanRequestError', 'Failed to run scan'));
    },
  });
}
