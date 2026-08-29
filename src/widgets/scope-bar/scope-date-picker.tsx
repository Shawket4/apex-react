import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { CAIRO_TZ } from '@/shared/lib/cairo';
import {
  CairoRangeCalendar,
  cairoTodayParts,
  dayIso,
  partsOfDay,
  toNum,
  tzDate,
  type DayParts,
} from '@/shared/ui/cairo-range-calendar';

/* -------------------------------------------------------------------------- */
/* Madar's period picker, ported verbatim: quick preset pills + a Cairo-aware  */
/* two-tap range calendar (live hover preview, future-date guard, explicit     */
/* Apply) in ONE popover — no Select→Popover handoff, so choosing "custom"     */
/* never bounces the popover closed.                                           */
/* -------------------------------------------------------------------------- */

export interface PeriodPreset {
  value: string;
  label: string;
}

interface Props {
  /** Active preset key, or 'custom' when a hand-picked range is in effect. */
  preset: string;
  from?: string | null;
  to?: string | null;
  presets: PeriodPreset[];
  onSelectPreset: (key: string) => void;
  /** Day-bounded Cairo YYYY-MM-DD strings. */
  onApplyCustom: (from: string, to: string) => void;
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
}

export function ScopeDatePicker({
  preset,
  from,
  to,
  presets,
  onSelectPreset,
  onApplyCustom,
  align = 'end',
  triggerClassName,
}: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';
  const [open, setOpen] = React.useState(false);

  const [hovered, setHovered] = React.useState<DayParts | undefined>();
  const [selected, setSelected] = React.useState<{ from?: DayParts; to?: DayParts }>({});

  const today = cairoTodayParts();
  const [month, setMonth] = React.useState(today.m);
  const [year, setYear] = React.useState(today.y);

  const fmtDay = React.useCallback(
    (p: DayParts) =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        timeZone: CAIRO_TZ,
      }).format(tzDate(p.y, p.m, p.d)),
    [locale],
  );

  // Seed the working selection + visible month from props whenever opened.
  React.useEffect(() => {
    if (!open) return;
    const f = from ? partsOfDay(from) : undefined;
    const tp = to ? partsOfDay(to) : undefined;
    setSelected({ from: f, to: tp });
    setHovered(undefined);
    const anchor = f ?? today;
    setMonth(anchor.m);
    setYear(anchor.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pickPreset = (key: string) => {
    onSelectPreset(key);
    setOpen(false);
  };

  const handleSelect = (p: DayParts) => {
    if (!selected.from || (selected.from && selected.to)) {
      setSelected({ from: p, to: undefined });
    } else {
      const f = toNum(selected.from)!;
      const c = toNum(p)!;
      if (c >= f) setSelected({ from: selected.from, to: p });
      else setSelected({ from: p, to: selected.from });
    }
  };

  const handleApply = () => {
    if (!selected.from) return;
    const f = selected.from;
    const end = selected.to ?? selected.from;
    onApplyCustom(dayIso(f), dayIso(end));
    setOpen(false);
  };

  const activeLabel =
    preset !== 'custom'
      ? (presets.find((p) => p.value === preset)?.label ?? t('scope.preset.custom', 'Custom'))
      : from && to
        ? `${fmtDay(partsOfDay(from))} → ${fmtDay(partsOfDay(to))}`
        : t('scope.preset.custom', 'Custom');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-8 gap-2', triggerClassName)}>
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{activeLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto max-w-[min(20rem,calc(100vw-2rem))]">
        {/* Quick presets */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Button
              key={p.value}
              variant={preset === p.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              aria-pressed={preset === p.value}
              onClick={() => pickPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="mb-3 border-t" />

        {/* From / To summary */}
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted p-2.5 text-xs">
          <div className="flex-1 text-center">
            <p className="mb-0.5 text-muted-foreground">{t('common.from', 'From')}</p>
            <p className="font-semibold">{selected.from ? fmtDay(selected.from) : '—'}</p>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex-1 text-center">
            <p className="mb-0.5 text-muted-foreground">{t('common.to', 'To')}</p>
            <p className="font-semibold">
              {selected.to ? fmtDay(selected.to) : hovered ? fmtDay(hovered) : '—'}
            </p>
          </div>
        </div>

        <CairoRangeCalendar
          selected={selected}
          onSelect={handleSelect}
          hovered={hovered}
          onHover={setHovered}
          month={month}
          year={year}
          onMonthChange={(m2, y2) => {
            setMonth(m2);
            setYear(y2);
          }}
        />

        <div className="mt-3 flex justify-end gap-2 border-t pt-3">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!selected.from}
            onClick={handleApply}
          >
            {t('common.apply', 'Apply')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
