import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClientMaint } from '@/shared/api/client';
import { MAINTENANCE_KEYS } from '@/entities/maintenance/queries';
import { decideWording, getMaintCategories, getUnmatched, importLegacyNow } from './api';
import { applyDecision } from './lib';
import type { LegacyDecision, UnmatchedPage } from './schemas';

const isConfigured = apiClientMaint !== null;

export const LEGACY_MATCH_KEYS = {
  unmatched: ['legacy-match', 'unmatched'] as const,
  categories: ['legacy-match', 'categories'] as const,
  decide: ['legacy-match', 'decide'] as const,
  importNow: ['legacy-match', 'import'] as const,
} as const;

export function useUnmatchedWordings() {
  return useQuery({
    queryKey: LEGACY_MATCH_KEYS.unmatched,
    queryFn: getUnmatched,
    enabled: isConfigured,
  });
}

export function useMaintCategories() {
  return useQuery({
    queryKey: LEGACY_MATCH_KEYS.categories,
    queryFn: getMaintCategories,
    enabled: isConfigured,
    staleTime: 10 * 60_000, // the list of maintenance types rarely changes
  });
}

/**
 * Decide one wording. The row leaves the list at once and comes back if the
 * server refuses. The list is re-read only when the last decision in flight
 * settles, so a quick run of decisions is not undone on screen by a re-read
 * that started before the later ones landed.
 */
export function useDecideWording() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: LEGACY_MATCH_KEYS.decide,
    mutationFn: (decision: LegacyDecision) => decideWording(decision),
    onMutate: async (decision) => {
      await qc.cancelQueries({ queryKey: LEGACY_MATCH_KEYS.unmatched });
      const row = qc
        .getQueryData<UnmatchedPage>(LEGACY_MATCH_KEYS.unmatched)
        ?.rows.find((candidate) => candidate.norm_text === decision.norm_text);
      qc.setQueryData<UnmatchedPage>(LEGACY_MATCH_KEYS.unmatched, (page) =>
        page ? applyDecision(page, decision.norm_text, decision.category_id) : page,
      );
      return { row };
    },
    onError: (_error, decision, context) => {
      // Put back this one row only: other decisions may have landed meanwhile.
      const row = context?.row;
      if (!row) return;
      qc.setQueryData<UnmatchedPage>(LEGACY_MATCH_KEYS.unmatched, (page) => {
        if (!page || page.rows.some((candidate) => candidate.norm_text === row.norm_text)) {
          return page;
        }
        const stats = { ...page.stats };
        if (decision.category_id === null) stats.ignored -= row.lines;
        else stats.recognised -= row.lines;
        const rows = [...page.rows, row].sort(
          (a, b) => b.lines - a.lines || a.norm_text.localeCompare(b.norm_text),
        );
        return { ...page, rows, stats };
      });
    },
    onSettled: () => {
      if (qc.isMutating({ mutationKey: LEGACY_MATCH_KEYS.decide }) > 1) return;
      void qc.invalidateQueries({ queryKey: LEGACY_MATCH_KEYS.unmatched });
      // A recognised old line moves a truck's due clock.
      void qc.invalidateQueries({ queryKey: MAINTENANCE_KEYS.all });
    },
  });
}

export function useImportLegacy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: LEGACY_MATCH_KEYS.importNow,
    mutationFn: importLegacyNow,
    onSuccess: (outcome) => {
      if (outcome.kind !== 'done') return;
      void qc.invalidateQueries({ queryKey: LEGACY_MATCH_KEYS.unmatched });
      void qc.invalidateQueries({ queryKey: MAINTENANCE_KEYS.all });
    },
  });
}
