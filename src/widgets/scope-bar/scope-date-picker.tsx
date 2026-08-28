import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { CAIRO_TZ, cairoParts } from '@/shared/lib/cairo';

/* -------------------------------------------------------------------------- */
/* Madar's period picker, ported verbatim: quick preset pills + a Cairo-aware  */
/* two-tap range calendar (live hover preview, future-date guard, explicit     */
/* Apply) in ONE popover — no Select→Popover handoff, so choosing "custom"     */
/* never bounces the popover closed.                                           */
/* -------------------------------------------------------------------------- */

type DayParts = { y: number; m: number; d: number };

const toNum = (p?: DayParts | null) => (p ? p.y * 10000 + p.m * 100 + p.d : null);

const dayIso = (p: DayParts) =>
  `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;

function cairoTodayParts(): DayParts {
  const p = cairoParts(new Date());
  return { y: p.y, m: p.m, d: p.d };
}

function partsOfDay(iso: string): DayParts {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

function tzDate(y: number, m: number, d: number): Date {
  // A Date whose CAIRO calendar fields are (y, m, d) — noon UTC keeps the
  // Cairo day stable regardless of offset.
  return new Date(Date.UTC(y, m, d, 12));
}

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

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstDay = tzDate(year, month, 1).getUTCDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const fromNum = toNum(selected.from);
  const toNum_ = toNum(selected.to ?? hovered);
  const todayNum = today.y * 10000 + today.m * 100 + today.d;

  const prevMonth = () =>
    month === 0 ? (setMonth(11), setYear((y) => y - 1)) : setMonth((m) => m - 1);
  const nextMonth = () =>
    month === 11 ? (setMonth(0), setYear((y) => y + 1)) : setMonth((m) => m + 1);

  const monthName = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: CAIRO_TZ,
  }).format(tzDate(year, month, 1));

  const weekdayNames = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: CAIRO_TZ });
    return Array.from({ length: 7 }, (_, i) => fmt.format(tzDate(2024, 0, 7 + i))); // Sun..Sat
  }, [locale]);

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

        {/* Month nav */}
        <div className="mb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={prevMonth}
            aria-label={t('common.previous', 'Previous')}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <span className="text-sm font-semibold">{monthName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={nextMonth}
            aria-label={t('common.next', 'Next')}
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>

        {/* Weekday header */}
        <div className="mb-1 grid grid-cols-7">
          {weekdayNames.map((d) => (
            <div key={d} className="py-1 text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const dn = year * 10000 + month * 100 + d;
            const isFuture = dn > todayNum;
            const isToday = dn === todayNum;
            const isStart = fromNum !== null && dn === fromNum;
            const isEnd = toNum_ !== null && fromNum !== null && dn === toNum_;
            const lo = fromNum !== null && toNum_ !== null ? Math.min(fromNum, toNum_) : null;
            const hi = fromNum !== null && toNum_ !== null ? Math.max(fromNum, toNum_) : null;
            const inRange = lo !== null && hi !== null && dn > lo && dn < hi;

            return (
              <div
                key={i}
                className={cn(
                  'relative flex h-8 items-center justify-center',
                  inRange && 'bg-primary/10',
                  isStart && 'rounded-s-full bg-primary/10',
                  isEnd && 'rounded-e-full bg-primary/10',
                  isStart && !selected.to && !hovered && 'rounded-full',
                )}
              >
                <button
                  type="button"
                  disabled={isFuture}
                  onClick={() => !isFuture && handleSelect({ y: year, m: month, d })}
                  onMouseEnter={() => !isFuture && setHovered({ y: year, m: month, d })}
                  onMouseLeave={() => setHovered(undefined)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                    isFuture && 'cursor-not-allowed text-muted-foreground/30',
                    !isFuture && !isStart && !isEnd && 'hover:bg-muted',
                    isToday && !isStart && !isEnd && 'border border-primary text-primary',
                    (isStart || isEnd) &&
                      'bg-primary font-semibold text-primary-foreground shadow-sm',
                  )}
                >
                  {d}
                </button>
              </div>
            );
          })}
        </div>

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
