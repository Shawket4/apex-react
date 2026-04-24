import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { MonthYearSelector } from './month-year-selector';
import {
  fmtDate,
  localDateISO,
  localParts,
  localToday,
  type LocalParts,
} from '@/shared/lib/format';

const toNum = (p?: LocalParts) => (p ? p.y * 10000 + p.m * 100 + p.d : null);

interface Props {
  from?: string | null;
  to?: string | null;
  onChange: (from: string | null, to: string | null) => void;
  /** Optional class name for the outer flex container */
  className?: string;
}

/**
 * A preset is a named range producer. `getRange` returns `[fromISO, toISO]`
 * for that preset given today's local date. This generalisation (vs. the
 * old N-days shape) lets us express boundary-based ranges like "current
 * month" — start of this month → today — alongside count-based ones.
 */
interface Preset {
  key: string;
  getRange: (today: LocalParts) => [string, string];
}

function lastNDaysRange(today: LocalParts, days: number): [string, string] {
  const startMs = new Date(today.y, today.m, today.d).getTime() - days * 86_400_000;
  const d = new Date(startMs);
  return [
    localDateISO(d.getFullYear(), d.getMonth(), d.getDate()),
    localDateISO(today.y, today.m, today.d, true),
  ];
}

function currentMonthRange(today: LocalParts): [string, string] {
  return [
    localDateISO(today.y, today.m, 1),
    localDateISO(today.y, today.m, today.d, true),
  ];
}

const PRESETS: Preset[] = [
  { key: 'today', getRange: (today) => lastNDaysRange(today, 0) },
  { key: 'days7', getRange: (today) => lastNDaysRange(today, 7) },
  { key: 'currentMonth', getRange: (today) => currentMonthRange(today) },
  { key: 'days90', getRange: (today) => lastNDaysRange(today, 90) },
];

export function DateRangePicker({ from, to, onChange, className }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';
  const [open, setOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState<LocalParts | undefined>();

  const fromParts = from ? localParts(from) : undefined;
  const toParts = to ? localParts(to) : undefined;
  const [selected, setSelected] = React.useState<{ from?: LocalParts; to?: LocalParts }>({
    from: fromParts,
    to: toParts,
  });

  React.useEffect(() => {
    setSelected({
      from: from ? localParts(from) : undefined,
      to: to ? localParts(to) : undefined,
    });
  }, [from, to]);

  const today = localToday();
  const [month, setMonth] = React.useState(today.m);
  const [year, setYear] = React.useState(today.y);

  const applyPreset = (preset: Preset) => {
    const [f, tt] = preset.getRange(localToday());
    onChange(f, tt);
  };

  const isPresetActive = (preset: Preset): boolean => {
    if (!from || !to) return false;
    const [f, tt] = preset.getRange(localToday());
    return from === f && to === tt;
  };

  const handleSelect = (p: LocalParts) => {
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
    if (selected.from) {
      const f = selected.from;
      const tEnd = selected.to ?? selected.from;
      onChange(localDateISO(f.y, f.m, f.d), localDateISO(tEnd.y, tEnd.m, tEnd.d, true));
    }
    setOpen(false);
  };

  const isAllTime = !from && !to;
  const isCustom = Boolean(from) && !PRESETS.some(isPresetActive) && !isAllTime;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const fromNum = toNum(selected.from);
  const toNum_ = toNum(selected.to ?? hovered);
  const todayNum = today.y * 10000 + today.m * 100 + today.d;

  const weekdayNames = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)));
  }, [locale]);

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {PRESETS.map((p) => (
        <Button
          key={p.key}
          variant={isPresetActive(p) ? 'default' : 'outline'}
          size="sm"
          onClick={() => applyPreset(p)}
          className="h-8 text-xs"
        >
          {t(`datePicker.${p.key}`)}
        </Button>
      ))}
      <Button
        variant={isAllTime ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange(null, null)}
        className="h-8 text-xs"
      >
        {t('datePicker.allTime')}
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isCustom ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <CalendarIcon className="h-3 w-3" />
            {isCustom ? `${fmtDate(from)} → ${to ? fmtDate(to) : ''}` : t('datePicker.custom')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted p-2.5 text-xs">
            <div className="flex-1 text-center">
              <p className="mb-0.5 text-muted-foreground">{t('common.from')}</p>
              <p className="font-semibold">
                {selected.from
                  ? fmtDate(localDateISO(selected.from.y, selected.from.m, selected.from.d))
                  : '—'}
              </p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="mb-0.5 text-muted-foreground">{t('common.to')}</p>
              <p className="font-semibold">
                {selected.to
                  ? fmtDate(localDateISO(selected.to.y, selected.to.m, selected.to.d))
                  : hovered
                    ? fmtDate(localDateISO(hovered.y, hovered.m, hovered.d))
                    : '—'}
              </p>
            </div>
          </div>

          <MonthYearSelector
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
            }}
          />

          <div className="mb-1 grid grid-cols-7">
            {weekdayNames.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[10px] font-semibold text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const dn = year * 10000 + month * 100 + d;
              const isFuture = dn > todayNum;
              const isToday = dn === todayNum;
              const isStart = fromNum !== null && dn === fromNum;
              const isEnd =
                toNum_ !== null && fromNum !== null && dn === toNum_ && toNum_ !== fromNum;
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

          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">
              {!selected.from
                ? t('datePicker.clickStart')
                : !selected.to
                  ? t('datePicker.clickEnd')
                  : t('datePicker.rangeSelected')}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleApply} disabled={!selected.from}>
                {t('datePicker.apply')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}