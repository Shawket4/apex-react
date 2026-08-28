import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarRange, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { formatCairoDayShort } from '@/shared/lib/cairo';
import { SCOPE_PRESETS, useScope, type ScopePreset } from '@/shared/scope';

/* -------------------------------------------------------------------------- */
/* The global scope bar — lives in the app header, writes the URL, and every  */
/* range-consuming query on every page reads what it wrote. Desktop shows the */
/* preset chips inline; small screens collapse to one button + popover.       */
/* -------------------------------------------------------------------------- */

function PresetChip({
  preset,
  active,
  onSelect,
}: {
  preset: ScopePreset;
  active: boolean;
  onSelect: (p: ScopePreset) => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(preset)}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-ring hover:text-foreground',
      )}
    >
      {t(`scope.preset.${preset}`)}
    </button>
  );
}

function CustomChip() {
  const { scope, range, setCustom } = useScope();
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const active = scope.preset === 'custom';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            active
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-ring hover:text-foreground',
          )}
        >
          <CalendarRange className="h-3 w-3" />
          {active
            ? `${formatCairoDayShort(range.from)} – ${formatCairoDayShort(range.to)}`
            : t('scope.preset.custom')}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <DateRangePicker
          from={active ? range.from : null}
          to={active ? range.to : null}
          onChange={(from, to) => {
            if (from && to) {
              setCustom(from.slice(0, 10), to.slice(0, 10));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function ScopeBar({ className }: { className?: string }) {
  const { scope, range, setPreset, setCustom } = useScope();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const rangeLabel = `${formatCairoDayShort(range.from)} – ${formatCairoDayShort(range.to)}`;

  return (
    <div className={cn('flex items-center', className)}>
      {/* Desktop: inline chips */}
      <div className="hidden items-center gap-1.5 lg:flex">
        {SCOPE_PRESETS.map((p) => (
          <PresetChip
            key={p}
            preset={p}
            active={scope.preset === p}
            onSelect={setPreset}
          />
        ))}
        <CustomChip />
      </div>

      {/* Small screens: one button, popover of presets */}
      <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 lg:hidden">
            <CalendarRange className="h-3.5 w-3.5" />
            <span className="text-xs">
              {scope.preset === 'custom' ? rangeLabel : t(`scope.preset.${scope.preset}`)}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SCOPE_PRESETS.map((p) => (
              <PresetChip
                key={p}
                preset={p}
                active={scope.preset === p}
                onSelect={(preset) => {
                  setPreset(preset);
                  setMobileOpen(false);
                }}
              />
            ))}
          </div>
          <DateRangePicker
            from={scope.preset === 'custom' ? range.from : null}
            to={scope.preset === 'custom' ? range.to : null}
            onChange={(from, to) => {
              if (from && to) {
                setCustom(from.slice(0, 10), to.slice(0, 10));
                setMobileOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
