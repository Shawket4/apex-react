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
import type { FuelEvent, FuelMethod } from '@/entities/fuel-event/schemas';
import { normaliseMethod } from '@/entities/fuel-event/schemas';
import type { EfficiencyMap } from '@/shared/lib/fuel';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type FuelEventStatusFilter = 'good' | 'average' | 'poor' | 'excluded' | 'paired';

export type FuelEventMethodFilter = 'all' | FuelMethod;

export type FuelEventSortKey = 'date' | 'rate' | 'cost' | 'liters';
export type SortDirection = 'asc' | 'desc';

export const ALL_FILTERS: FuelEventStatusFilter[] = [
  'good',
  'average',
  'poor',
  'paired',
  'excluded',
];

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
        <Button variant={count > 0 ? 'default' : 'outline'} size="sm" className="h-9 gap-1.5">
          <Filter className="h-3.5 w-3.5" />
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('fuelEvents.filters.byStatus')}
          </p>
          {count > 0 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
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
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                    selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
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
      className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"
      role="tablist"
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
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={cn(
            'hidden rounded-full px-1 text-[10px] font-semibold tabular-nums sm:inline-block',
            active ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
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
    <div className="inline-flex h-9 items-center">
      <Select value={sortKey} onValueChange={(v) => onSortKeyChange(v as FuelEventSortKey)}>
        <SelectTrigger className="h-9 w-[130px] gap-1 rounded-e-none border-e-0 text-xs">
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
        className="h-9 w-9 rounded-s-none"
        aria-label={
          direction === 'desc'
            ? t('fuelEvents.sort.directionDesc')
            : t('fuelEvents.sort.directionAsc')
        }
      >
        <DirectionIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers — apply to analysed events                                          */
/* -------------------------------------------------------------------------- */

export function applyStatusFilter(
  events: FuelEvent[],
  map: EfficiencyMap,
  active: Set<FuelEventStatusFilter>,
): FuelEvent[] {
  if (active.size === 0) return events;
  return events.filter((e) => {
    const a = map.get(e.ID);
    return !!a && active.has(a.status as FuelEventStatusFilter);
  });
}

/**
 * Filter by method. Runs AFTER pair analysis so pairing stays holistic
 * across methods — a Manual undershoot can pair with a PetroApp overshoot
 * for the same vehicle and both get flagged as paired regardless of which
 * method filter is active afterwards.
 */
export function applyMethodFilter(
  events: FuelEvent[],
  method: FuelEventMethodFilter,
): FuelEvent[] {
  if (method === 'all') return events;
  return events.filter((e) => normaliseMethod(e.method) === method);
}

/** Count events per method in a set — powers the badge counts on the tabs. */
export function countByMethod(events: FuelEvent[]): {
  all: number;
  PetroApp: number;
  Manual: number;
} {
  let petroApp = 0;
  let manual = 0;
  for (const e of events) {
    if (normaliseMethod(e.method) === 'PetroApp') petroApp++;
    else manual++;
  }
  return { all: events.length, PetroApp: petroApp, Manual: manual };
}

/**
 * Parse a 12-hour time string like "3:07 PM" into minutes since midnight.
 * Returns null for empty strings, malformed input, or any non-parseable value
 * — callers should fall through to a different tiebreaker when null.
 */
function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const meridiem = m[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  // 12 AM = 00:xx, 12 PM = 12:xx, otherwise add 12 for PM
  if (hours === 12) hours = 0;
  if (meridiem === 'PM') hours += 12;
  return hours * 60 + minutes;
}

/**
 * Sort events by the chosen key and direction.
 *
 * Ties are broken with a deterministic chain: date → time → odometer_before
 * → ID. This gives same-day events a sensible order by fueling time when
 * available, falls back to odometer_before (which monotonically increases
 * per vehicle), and lastly to ID (which guarantees stable ordering for
 * events with no better distinguisher). Tiebreakers follow the user's chosen
 * direction — sorting newest-first also breaks ties newest-first.
 *
 * `rate` uses the pair-aware effective rate so paired events sort by their
 * combined rate rather than the raw out-of-band one. Date primary sort is
 * string-comparable since we use ISO date strings.
 */
export function applySort(
  events: FuelEvent[],
  map: EfficiencyMap,
  key: FuelEventSortKey,
  direction: SortDirection,
): FuelEvent[] {
  const mult = direction === 'asc' ? 1 : -1;
  const sorted = [...events];

  sorted.sort((a, b) => {
    // Primary — whichever column the user picked
    let av: number | string;
    let bv: number | string;
    switch (key) {
      case 'rate':
        av = map.get(a.ID)?.effectiveRate ?? a.fuel_rate;
        bv = map.get(b.ID)?.effectiveRate ?? b.fuel_rate;
        break;
      case 'cost':
        av = a.price;
        bv = b.price;
        break;
      case 'liters':
        av = a.liters;
        bv = b.liters;
        break;
      case 'date':
      default:
        av = a.date;
        bv = b.date;
        break;
    }
    if (av < bv) return -1 * mult;
    if (av > bv) return 1 * mult;

    // Tiebreak 1 — date (skipped when date was the primary sort)
    if (key !== 'date') {
      if (a.date < b.date) return -1 * mult;
      if (a.date > b.date) return 1 * mult;
    }

    // Tiebreak 2 — time of day, if both events have parseable times
    const at = parseTimeToMinutes(a.time);
    const bt = parseTimeToMinutes(b.time);
    if (at !== null && bt !== null && at !== bt) {
      return (at - bt) * mult;
    }

    // Tiebreak 3 — odometer_before, monotonic per vehicle
    if (a.odometer_before !== b.odometer_before) {
      return (a.odometer_before - b.odometer_before) * mult;
    }

    // Tiebreak 4 — ID as the final stable fallback
    return (a.ID - b.ID) * mult;
  });

  return sorted;
}

/* -------------------------------------------------------------------------- */
/* URL <-> state serialization                                                 */
/* -------------------------------------------------------------------------- */

export function serializeFilters(active: Set<FuelEventStatusFilter>): string | null {
  if (active.size === 0) return null;
  return ALL_FILTERS.filter((k) => active.has(k)).join(',');
}

export function parseFilters(raw: string | null): Set<FuelEventStatusFilter> {
  const set = new Set<FuelEventStatusFilter>();
  if (!raw) return set;
  for (const part of raw.split(',')) {
    const trimmed = part.trim() as FuelEventStatusFilter;
    if (ALL_FILTERS.includes(trimmed)) set.add(trimmed);
  }
  return set;
}

export function serializeMethod(method: FuelEventMethodFilter): string | null {
  if (method === 'all') return null;
  if (method === 'PetroApp') return 'p';
  if (method === 'Manual') return 'm';
  return null;
}

export function parseMethod(raw: string | null): FuelEventMethodFilter {
  if (raw === 'p') return 'PetroApp';
  if (raw === 'm') return 'Manual';
  return 'all';
}