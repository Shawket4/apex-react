import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, SlidersHorizontal } from 'lucide-react';
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
import { useCompanies } from '@/entities/mapping/queries';
import { SCOPE_PRESETS, useScope, useScopeCompany, type ScopePreset } from '@/shared/scope';
import { ScopeDatePicker, type PeriodPreset } from './scope-date-picker';

/* -------------------------------------------------------------------------- */
/* The global scope bar — Madar's layout exactly, with COMPANIES where Madar   */
/* has branches: [company select] [period picker]. Desktop renders it inline   */
/* in the header; mobile collapses to one filters button with the same         */
/* controls stacked in a popover.                                              */
/* -------------------------------------------------------------------------- */

const ALL_COMPANIES = '__all__';

const presetFallback: Record<ScopePreset | 'custom', string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  mtd: 'Month to date',
  custom: 'Custom',
};

function ScopeControls({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { scope, range, setPreset, setCustom } = useScope();
  const { company, setCompany } = useScopeCompany();

  const companies = useCompanies();
  const companyNames = companies.data?.data ?? [];

  // Self-heal a stale company: one carried in a shared link but since renamed
  // or removed would silently filter everything to zero.
  React.useEffect(() => {
    if (!companies.data) return;
    if (company && !companyNames.includes(company)) setCompany(null);
  }, [companies.data, company, companyNames, setCompany]);

  const presetOptions: PeriodPreset[] = React.useMemo(
    () =>
      SCOPE_PRESETS.map((p) => ({
        value: p,
        label: t(`scope.preset.${p}`, presetFallback[p]),
      })),
    [t],
  );

  return (
    <div className={className}>
      <Select
        value={company ?? ALL_COMPANIES}
        onValueChange={(v) => setCompany(v === ALL_COMPANIES ? null : v)}
      >
        <SelectTrigger className="h-8 w-auto min-w-32 gap-2" data-slot="select-trigger">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_COMPANIES}>
            {t('scope.allCompanies', 'All companies')}
          </SelectItem>
          {companyNames.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ScopeDatePicker
        preset={scope.preset}
        from={range.from}
        to={range.to}
        presets={presetOptions}
        onSelectPreset={(key) => setPreset(key as ScopePreset)}
        onApplyCustom={(f, to) => setCustom(f, to)}
      />
    </div>
  );
}

/** Inline scope controls for the desktop header. */
export function ScopeBar() {
  return <ScopeControls className="hidden items-center gap-2 lg:flex" />;
}

/** Compact popover with the same controls — for the mobile header. */
export function ScopeBarMobile({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn('h-8 w-8 lg:hidden', className)}
          aria-label={t('common.filters', 'Filters')}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60">
        <ScopeControls className="flex flex-col gap-2 [&_[data-slot=select-trigger]]:w-full" />
      </PopoverContent>
    </Popover>
  );
}
