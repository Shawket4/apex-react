import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  categoryLabel,
  useCategories,
  useParties,
  type Category,
} from '@/entities/transaction/categories';
import type { Classification } from '@/entities/transaction/schemas';

/** The suggestion in words: its category (if any) and the person (if any). */
export function useSuggestionText(s: Classification | null | undefined) {
  const { i18n } = useTranslation();
  const categories = useCategories();
  const parties = useParties();

  return React.useMemo(() => {
    const category: Category | undefined = s?.category
      ? (categories.data ?? []).find((c) => c.key.toLowerCase() === s.category!.toLowerCase())
      : undefined;
    const list = parties.data ?? [];
    const person = s?.driver_id
      ? list.find((p) => p.kind === 'driver' && p.id === s.driver_id)?.name
      : s?.employee_id
        ? list.find((p) => p.kind === 'employee' && p.id === s.employee_id)?.name
        : undefined;
    return {
      category,
      label: category ? categoryLabel(category, i18n.language) : (s?.category ?? ''),
      person,
    };
  }, [s, categories.data, parties.data, i18n.language]);
}
