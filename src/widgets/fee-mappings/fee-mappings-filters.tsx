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
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('feeMappings.filters.searchPlaceholder')}
          value={state.search}
          onChange={(e) => onChange({ ...state, search: e.target.value })}
          className="ps-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={state.company || 'all'}
          onValueChange={(v) =>
            onChange({ ...state, company: v === 'all' ? '' : v })
          }
        >
          <SelectTrigger className="h-9 w-[180px]">
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
          <SelectTrigger className="h-9 w-[180px]">
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
            className="h-9 gap-1 text-xs"
            onClick={() => onChange({ search: '', company: '', accuracy: 'all' })}
          >
            <X className="h-3.5 w-3.5" />
            {t('common.clear')}
          </Button>
        )}
      </div>

      <span className="ms-auto whitespace-nowrap text-xs tabular-nums text-muted-foreground">
        {filteredCount} / {mappings.length}
      </span>
    </div>
  );
}
