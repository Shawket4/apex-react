import { z } from 'zod';
import { type QueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClientRust, apiClient } from '@/shared/api/client';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toast';
import { extractErrorMessage } from '@/shared/api/errors';

/* -------------------------------------------------------------------------- */
/* Categories — GET /api/v1/categories                                         */
/*                                                                            */
/* A category is a label plus two facts (D3): `posting_kind` says what          */
/* categorising into it materialises downstream (an advance/loan/salary row    */
/* in public.loans), `required_party` says who the transaction must be         */
/* attributed to. The form renders itself from these — adding a category is    */
/* a psql row, not a deploy.                                                   */
/* -------------------------------------------------------------------------- */

export const PARTY_KINDS = ['none', 'driver', 'employee', 'either'] as const;
export type PartyKind = (typeof PARTY_KINDS)[number];

export const categorySchema = z.object({
  id: z.number(),
  key: z.string(),
  label: z.string(),
  label_ar: z.string().nullable().optional(),
  /** 'advance' | 'loan' | 'salary' | null — null means "just a label". */
  posting_kind: z.string().nullable(),
  /** 'none' | 'driver' | 'employee' | 'either' */
  required_party: z.string(),
  sort_order: z.number(),
  enabled: z.boolean(),
});

export type Category = z.infer<typeof categorySchema>;

export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: async () => {
      const res = await apiClientRust.get('/api/v1/categories');
      return z.array(categorySchema).parse(res.data ?? []);
    },
    select: (all) =>
      all.filter((c) => c.enabled).sort((a, b) => a.sort_order - b.sort_order),
    // Categories change rarely; re-fetching them on every form open is waste.
    staleTime: 5 * 60_000,
  });
}

/** Does this category require someone to be named? */
export function requiresParty(c: Category | undefined): boolean {
  return !!c && c.required_party !== 'none';
}

/** Does categorising into this register a loans row? */
export function posts(c: Category | undefined): boolean {
  return !!c && c.posting_kind != null;
}

/** Display label in the active language, falling back to the English label. */
export function categoryLabel(c: Category, language?: string): string {
  return language?.startsWith('ar') && c.label_ar ? c.label_ar : c.label;
}

/* -------------------------------------------------------------------------- */
/* Parties — drivers and employees                                             */
/* -------------------------------------------------------------------------- */

export const partySchema = z.object({
  id: z.number(),
  name: z.string(),
  kind: z.enum(['driver', 'employee']),
  mobile_number: z.string().nullable().optional(),
});

export type Party = z.infer<typeof partySchema>;

export function useParties() {
  return useQuery({
    queryKey: QUERY_KEYS.parties,
    queryFn: async () => {
      const res = await apiClientRust.get('/api/v1/parties');
      return z.array(partySchema).parse(res.data ?? []);
    },
    staleTime: 60_000,
  });
}

/* -------------------------------------------------------------------------- */
/* Party suggestion — GET /api/v1/parties/suggest                              */
/*                                                                            */
/* An exact-match history lookup: "this counterparty text was attributed to    */
/* this person N times before". Null when the text has never been attributed.  */
/* The suggestion is only ever a PRE-SELECTION the user sees and confirms —    */
/* nothing saves without an explicit tap.                                      */
/* -------------------------------------------------------------------------- */

export const partySuggestionSchema = z
  .object({
    driver_id: z.number().nullable(),
    employee_id: z.number().nullable(),
    name: z.string(),
    kind: z.enum(['driver', 'employee']),
    times: z.number(),
  })
  .nullable();

export type PartySuggestion = z.infer<typeof partySuggestionSchema>;

export function usePartySuggestion(counterparty: string | null | undefined) {
  const trimmed = (counterparty ?? '').trim();
  return useQuery({
    queryKey: [...QUERY_KEYS.parties, 'suggest', trimmed],
    queryFn: async () => {
      const res = await apiClientRust.get('/api/v1/parties/suggest', {
        params: { counterparty: trimmed },
      });
      // Empty responses (204/'' ) and JSON null both mean "no history".
      return partySuggestionSchema.parse(res.data || null);
    },
    enabled: trimmed.length > 0,
    staleTime: 60_000,
    // No retry storm on a best-effort hint — the picker is the fallback.
    retry: false,
  });
}

/**
 * Create an employee.
 *
 * Deliberately goes to FalconGo's own endpoint rather than apex-rust: FalconGo
 * owns `public.employees` and already exposes CRUD for it, so it stays the
 * single writer. apex-rust only reads the table for the picker.
 *
 * The picker may create a new PERSON, but it must never create a new SPELLING —
 * see `findExistingParty`.
 */
export function useCreateEmployee() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post('/api/employees', {
        name: name.trim(),
        is_active: true,
        type: 'staff',
      });
      return res.data as { ID?: number; id?: number };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties });
      toast.success(t('fleetExpenses.party.employeeCreated'));
    },
    onError: (e) => toast.error(extractErrorMessage(e, t('fleetExpenses.party.createFailed'))),
  });
}

/**
 * Find an existing party matching a typed name, ignoring case, surrounding
 * whitespace and internal whitespace runs.
 *
 * This is the guard that stops the list decaying. Typing "shady " when "Shady"
 * already exists must select him, not mint a second person — because once two
 * rows exist for one human, every report about them is quietly wrong and
 * nothing errors to say so.
 */
export function findExistingParty(parties: Party[], typed: string): Party | undefined {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const target = norm(typed);
  if (!target) return undefined;
  return parties.find((p) => norm(p.name) === target);
}

/* -------------------------------------------------------------------------- */
/* Intent prefetch                                                             */
/* Warmed on hover/focus/touch by surfaces that know the click is coming.      */
/* MUST mirror the hook above key-for-key — a near-miss key is a wasted        */
/* request the page refetches anyway.                                          */
/* -------------------------------------------------------------------------- */

async function fetchCategoriesRaw() {
  const res = await apiClientRust.get('/api/v1/categories');
  return z.array(categorySchema).parse(res.data ?? []);
}
async function fetchPartiesRaw() {
  const res = await apiClientRust.get('/api/v1/parties');
  return z.array(partySchema).parse(res.data ?? []);
}

export function prefetchCategories(qc: QueryClient): void {
  void qc.prefetchQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: fetchCategoriesRaw,
    staleTime: 5 * 60_000,
  });
}

export function prefetchParties(qc: QueryClient): void {
  void qc.prefetchQuery({
    queryKey: QUERY_KEYS.parties,
    queryFn: fetchPartiesRaw,
    staleTime: 60_000,
  });
}
