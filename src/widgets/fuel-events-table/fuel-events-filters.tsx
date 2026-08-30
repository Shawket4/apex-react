import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Filter,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  X,
  Zap,
  Pencil,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  ALL_FILTERS,
  type FuelEventMethodFilter,
  type FuelEventSortKey,
  type FuelEventStatusFilter,
  type SortDirection,
} from './fuel-events-filter-logic';

const FILTER_META: Record<FuelEventStatusFilter, { labelKey: string; dot: string }> = {
  good: { labelKey: 'fuelEvents.efficiency.good', dot: 'bg-success' },
  average: { labelKey: 'fuelEvents.efficiency.average', dot: 'bg-warning' },
  poor: { labelKey: 'fuelEvents.efficiency.poor', dot: 'bg-destructive' },
  paired: { labelKey: 'fuelEvents.efficiency.paired', dot: 'bg-primary' },
  excluded: { labelKey: 'fuelEvents.efficiency.excluded', dot: 'bg-muted-foreground' },
};

const SORT_OPTIONS: { key: FuelEventSortKey; labelKey: string }[] = [
  { key: 'date', labelKey: 'fuelEvents.sort.date' },
  { key: 'rate', labelKey: 'fuelEvents.sort.rate' },
  { key: 'cost', labelKey: 'fuelEvents.sort.cost' },
  { key: 'liters', labelKey: 'fuelEvents.sort.liters' },
];

/* -------------------------------------------------------------------------- */
/* Status filter popover                                                       */
/* -------------------------------------------------------------------------- */

interface FilterPopoverProps {
  active: Set<FuelEventStatusFilter>;
  onChange: (next: Set<FuelEventStatusFilter>) => void;
}

export function FuelEventsFilterPopover({ active, onChange }: FilterPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const toggle = (key: FuelEventStatusFilter) => {
    const next = new Set(active);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  const clear = () => onChange(new Set());
  const count = active.size;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={count > 0 ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5">
          <Filter />
          <span className="hidden sm:inline">{t('common.filter')}</span>
          {count > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] font-semibold text-primary">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('fuelEvents.filters.byStatus')}
          </p>
          {count > 0 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-0.5 rounded-sm text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" />
              {t('fuelEvents.filters.clearFilter')}
            </button>
          )}
        </div>
        <ul className="space-y-0.5">
          {ALL_FILTERS.map((key) => {
            const meta = FILTER_META[key];
            const selected = active.has(key);
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
                  <span className="flex-1 text-start">{t(meta.labelKey)}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* Method filter — segmented control (all / PetroApp / Manual)                */
/* -------------------------------------------------------------------------- */

interface MethodControlProps {
  value: FuelEventMethodFilter;
  onChange: (next: FuelEventMethodFilter) => void;
  /**
   * Counts used to grey out methods with zero events in the current set.
   * Prevents dead ends — if the user filters to PetroApp but no PetroApp
   * events exist in the current date/search scope, the button is disabled.
   */
  counts?: { all: number; PetroApp: number; Manual: number };
}

export function FuelEventsMethodControl({ value, onChange, counts }: MethodControlProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center gap-1.5"
      role="group"
      aria-label={t('fuelEvents.method.label')}
    >
      <MethodButton
        active={value === 'all'}
        disabled={false}
        onClick={() => onChange('all')}
        label={t('fuelEvents.method.all')}
        count={counts?.all}
      />
      <MethodButton
        active={value === 'PetroApp'}
        disabled={counts?.PetroApp === 0}
        onClick={() => onChange('PetroApp')}
        icon={<Zap className="h-3 w-3" />}
        label={t('fuelEvents.method.petroApp')}
        count={counts?.PetroApp}
      />
      <MethodButton
        active={value === 'Manual'}
        disabled={counts?.Manual === 0}
        onClick={() => onChange('Manual')}
        icon={<Pencil className="h-3 w-3" />}
        label={t('fuelEvents.method.manual')}
        count={counts?.Manual}
      />
    </div>
  );
}

function MethodButton({
  active,
  disabled,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn('h-7 text-xs', disabled && 'cursor-not-allowed opacity-50')}
    >
      {icon}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={cn(
            'hidden rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium tabular-nums sm:inline-block',
            active
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/* Sort control — dropdown + direction toggle                                 */
/* -------------------------------------------------------------------------- */

interface SortControlProps {
  sortKey: FuelEventSortKey;
  direction: SortDirection;
  onSortKeyChange: (key: FuelEventSortKey) => void;
  onDirectionToggle: () => void;
}

export function FuelEventsSortControl({
  sortKey,
  direction,
  onSortKeyChange,
  onDirectionToggle,
}: SortControlProps) {
  const { t } = useTranslation();
  const DirectionIcon = direction === 'desc' ? ArrowDownWideNarrow : ArrowUpNarrowWide;

  return (
    <div className="inline-flex h-8 items-center">
      <Select value={sortKey} onValueChange={(v) => onSortKeyChange(v as FuelEventSortKey)}>
        <SelectTrigger className="h-8 w-auto min-w-32 gap-2 rounded-e-none border-e-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              {t(opt.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={onDirectionToggle}
        className="h-8 w-8 rounded-s-none"
        aria-label={
          direction === 'desc'
            ? t('fuelEvents.sort.directionDesc')
            : t('fuelEvents.sort.directionAsc')
        }
      >
        <DirectionIcon />
      </Button>
    </div>
  );
}
