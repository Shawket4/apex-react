import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, CheckCircle2, AlertTriangle, AlertCircle, LayoutGrid } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/cn';
import type { OilChangeStatus } from '@/entities/oil-change/schemas';

export type StatusFilterValue = 'all' | OilChangeStatus;

interface OilChangesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilterValue;
  onStatusFilterChange: (value: StatusFilterValue) => void;
  /** Counts shown as small badges on each tab */
  counts: { all: number; good: number; warning: number; critical: number };
}

/**
 * Search bar plus segmented status control. The control mirrors the
 * `MethodControl` pattern from the fuel-events page so both modules feel
 * the same when toggling filters.
 */
export function OilChangesFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  counts,
}: OilChangesFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('oilChanges.searchPlaceholder')}
          className="ps-9"
        />
      </div>

      <div
        className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"
        role="tablist"
        aria-label={t('oilChanges.filters.byStatus')}
      >
        <FilterTab
          active={statusFilter === 'all'}
          onClick={() => onStatusFilterChange('all')}
          icon={<LayoutGrid className="h-3.5 w-3.5" />}
          label={t('oilChanges.filters.all')}
          count={counts.all}
        />
        <FilterTab
          active={statusFilter === 'good'}
          onClick={() => onStatusFilterChange('good')}
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          label={t('oilChanges.status.good')}
          count={counts.good}
          disabled={counts.good === 0}
        />
        <FilterTab
          active={statusFilter === 'warning'}
          onClick={() => onStatusFilterChange('warning')}
          icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />}
          label={t('oilChanges.status.warning')}
          count={counts.warning}
          disabled={counts.warning === 0}
        />
        <FilterTab
          active={statusFilter === 'critical'}
          onClick={() => onStatusFilterChange('critical')}
          icon={<AlertCircle className="h-3.5 w-3.5 text-destructive" />}
          label={t('oilChanges.status.critical')}
          count={counts.critical}
          disabled={counts.critical === 0}
        />
      </div>
    </div>
  );
}

function FilterTab({
  active,
  disabled,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-40 hover:text-muted-foreground',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span
        className={cn(
          'rounded-full px-1 text-[10px] font-semibold tabular-nums',
          active ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}
