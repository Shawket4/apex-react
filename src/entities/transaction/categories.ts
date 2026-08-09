import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClientRust, apiClient } from '@/shared/api/client';
import { QUERY_KEYS } from '@/shared/config/constants';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toaster';
import { extractErrorMessage } from '@/shared/api/errors';

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/*                                                                            */
/* A category carries its own requirements, so the form is rendered from data  */
/* rather than from a switch statement that has to be kept in step across two  */
/* languages. Adding a category is a row, not a deploy.                        */
/* -------------------------------------------------------------------------- */

export const POSTING_TARGETS = ['none', 'loan'] as const;
export const PARTY_KINDS = ['none', 'driver', 'employee', 'either'] as const;

export type PostingTarget = (typeof POSTING_TARGETS)[number];
export type PartyKind = (typeof PARTY_KINDS)[number];

export const categorySchema = z.object({
  id: z.number(),
  key: z.string(),
  label: z.string(),
  label_ar: z.string().nullable().optional(),
  /** What categorising into this materialises downstream. */
  posting_target: z.string(),
  /** Who the transaction must be attributed to. */
  required_party: z.string(),
  field_spec: z.unknown().optional(),
  sort_order: z.number(),
});

export type Category = z.infer<typeof categorySchema>;

export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: async () => {
      const res = await apiClientRust.get('/api/v1/categories');
      return z.array(categorySchema).parse(res.data ?? []);
    },
    // Categories change rarely; re-fetching them on every form open is waste.
    staleTime: 5 * 60_000,
  });
}

/** Does this category require someone to be named? */
export function requiresParty(c: Category | undefined): boolean {
  return !!c && c.required_party !== 'none';
}

/** Does categorising into this create a downstream record? */
export function posts(c: Category | undefined): boolean {
  return !!c && c.posting_target !== 'none';
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
