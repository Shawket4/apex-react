import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Archive,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  MapPinOff,
  UserMinus,
  X,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import type {
  MissingDataFilter,
  ReceiptStatusFilter,
} from '@/entities/trip/schemas';

/* -------------------------------------------------------------------------- */
/* Company filter                                                              */
/*                                                                             */
/* Wraps SearchableSelect so the trips toolbar gets a single-line picker that  */
/* matches the SelectableSelect pattern used elsewhere — empty string means    */
/* "all companies".                                                            */
/* -------------------------------------------------------------------------- */

interface CompanyFilterProps {
  value: string;
  onChange: (value: string) => void;
  companies: string[];
}

export function TripsCompanyFilter({ value, onChange, companies }: CompanyFilterProps) {
  const { t } = useTranslation();

  const options = React.useMemo(
    () => [
      { value: '', label: t('trips.filters.allCompanies') },
      ...companies.map((c) => ({ value: c, label: c })),
    ],
    [companies, t],
  );

  return (
    <div className="inline-flex h-9 min-w-[180px] items-center">
      <SearchableSelect
        options={options}
        value={value}
        onChange={(v) => onChange(String(v))}
        placeholder={t('trips.filters.allCompanies')}
        className="h-9 text-xs"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Missing-data filter — popover with three checkbox-like options              */
/* -------------------------------------------------------------------------- */

const MISSING_OPTIONS: Array<{
  value: Exclude<MissingDataFilter, ''>;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'driver', labelKey: 'trips.filters.missingDriver', icon: UserMinus },
  { value: 'route', labelKey: 'trips.filters.missingRoute', icon: MapPinOff },
  { value: 'any', labelKey: 'trips.filters.missingAny', icon: AlertCircle },
];

interface MissingDataFilterProps {
  value: MissingDataFilter;
  onChange: (value: MissingDataFilter) => void;
}

export function TripsMissingDataFilter({ value, onChange }: MissingDataFilterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const active = value !== '';
  const activeMeta = MISSING_OPTIONS.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={active ? 'default' : 'outline'}
          size="sm"
          className="h-9 gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {active && activeMeta
              ? t(activeMeta.labelKey)
              : t('trips.filters.missingData')}
          </span>
          {active && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] font-semibold text-primary">
              1
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('trips.filters.missingData')}
          </p>
          {active && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              {t('common.clear')}
            </button>
          )}
        </div>
        <ul className="space-y-0.5">
          {MISSING_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            const Icon = opt.icon;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(selected ? '' : opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                    selected
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/60',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 text-start">{t(opt.labelKey)}</span>
                  {selected && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  )}
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
/* Receipt-status filter — segmented control (all / pending / garage / office) */
/* -------------------------------------------------------------------------- */

interface ReceiptStatusControlProps {
  value: ReceiptStatusFilter;
  onChange: (value: ReceiptStatusFilter) => void;
}

const RECEIPT_STATUS_OPTIONS: Array<{
  value: ReceiptStatusFilter;
  labelKey: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = [
  { value: '', labelKey: 'trips.filters.allReceipts' },
  { value: 'pending', labelKey: 'trips.receiptStatus.pending', icon: Clock },
  { value: 'in_garage', labelKey: 'trips.receiptStatus.inGarage', icon: Archive },
  { value: 'in_office', labelKey: 'trips.receiptStatus.inOffice', icon: Building2 },
];

export function TripsReceiptStatusControl({
  value,
  onChange,
}: ReceiptStatusControlProps) {
  const { t } = useTranslation();

  return (
    <div
      className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"
      role="tablist"
      aria-label={t('trips.filters.receiptStatus')}
    >
      {RECEIPT_STATUS_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={opt.value || 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className="h-3 w-3" />}
            <span>{t(opt.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* URL serialization                                                           */
/*                                                                             */
/* Single-letter codes keep the URL short. Inverse parsers default to ''/all. */
/* -------------------------------------------------------------------------- */

export function serializeMissing(value: MissingDataFilter): string | null {
  if (value === '') return null;
  return value[0]; // 'd' / 'r' / 'a'
}

export function parseMissing(raw: string | null): MissingDataFilter {
  if (raw === 'd') return 'driver';
  if (raw === 'r') return 'route';
  if (raw === 'a') return 'any';
  return '';
}

export function serializeReceiptStatus(value: ReceiptStatusFilter): string | null {
  if (value === '') return null;
  if (value === 'pending') return 'p';
  if (value === 'in_garage') return 'g';
  if (value === 'in_office') return 'o';
  return null;
}

export function parseReceiptStatus(raw: string | null): ReceiptStatusFilter {
  if (raw === 'p') return 'pending';
  if (raw === 'g') return 'in_garage';
  if (raw === 'o') return 'in_office';
  return '';
}
