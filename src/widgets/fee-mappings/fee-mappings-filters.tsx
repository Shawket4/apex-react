import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';
import { formatNumber } from '@/shared/lib/format';
import type { AccuracyKind, FeeMapping } from '@/entities/fee-mapping/schemas';

export interface FeeMappingsFilterState {
  search: string;
  company: string;
  accuracy: AccuracyKind | 'all';
}

interface FeeMappingsFiltersProps {
  state: FeeMappingsFilterState;
  onChange: (next: FeeMappingsFilterState) => void;
  mappings: FeeMapping[];
  filteredCount: number;
}

/**
 * Filter bar for the fee mappings table.
 *
 * Three controls: free-text search (matches company / terminal / drop-off),
 * company select (derived from the data), accuracy bucket filter. The
 * derived company list is sorted alphabetically and de-duplicated so the
 * select stays stable across data churn.
 */
export function FeeMappingsFilters({
  state,
  onChange,
  mappings,
  filteredCount,
}: FeeMappingsFiltersProps) {
  const { t } = useTranslation();

  const companies = React.useMemo(() => {
    const set = new Set(mappings.map((m) => m.company));
    return [...set].sort();
  }, [mappings]);

  const hasFilters =
    state.search !== '' || state.company !== '' || state.accuracy !== 'all';

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-3 py-2.5 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder={t('feeMappings.filters.searchPlaceholder')}
          aria-label={t('feeMappings.filters.searchPlaceholder')}
          name="search"
          autoComplete="off"
          spellCheck={false}
          value={state.search}
          onChange={(e) => onChange({ ...state, search: e.target.value })}
          className="h-8 ps-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={state.company || 'all'}
          onValueChange={(v) =>
            onChange({ ...state, company: v === 'all' ? '' : v })
          }
        >
          <SelectTrigger className="h-8 w-auto min-w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('feeMappings.filters.allCompanies')}</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={state.accuracy}
          onValueChange={(v) =>
            onChange({ ...state, accuracy: v as AccuracyKind | 'all' })
          }
        >
          <SelectTrigger className="h-8 w-auto min-w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('feeMappings.filters.allAccuracies')}</SelectItem>
            <SelectItem value="accurate">
              {t('feeMappings.accuracy.accurate')}
            </SelectItem>
            <SelectItem value="conservative">
              {t('feeMappings.accuracy.conservative')}
            </SelectItem>
            <SelectItem value="overestimate">
              {t('feeMappings.accuracy.overestimate')}
            </SelectItem>
            <SelectItem value="unknown">
              {t('feeMappings.accuracy.unknown')}
            </SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => onChange({ search: '', company: '', accuracy: 'all' })}
          >
            <X aria-hidden="true" />
            {t('common.clear')}
          </Button>
        )}
      </div>

      <span className="ms-auto whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
        {formatNumber(filteredCount, 0)} / {formatNumber(mappings.length, 0)}
      </span>
    </div>
  );
}
