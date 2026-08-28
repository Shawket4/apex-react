import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { CAIRO_TZ, cairoParts } from '@/shared/lib/cairo';

/* -------------------------------------------------------------------------- */
/* The app's ONE range calendar: Cairo-aware two-tap selection with live      */
/* hover preview and a future-date guard. The global scope bar's popover and  */
/* the tracking range picker both render this, so every date surface in the   */
/* app has the same look and behaviour.                                        */
/* -------------------------------------------------------------------------- */

export type DayParts = { y: number; m: number; d: number };

export const toNum = (p?: DayParts | null) => (p ? p.y * 10000 + p.m * 100 + p.d : null);

export const dayIso = (p: DayParts) =>
  `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;

export function cairoTodayParts(): DayParts {
  const p = cairoParts(new Date());
  return { y: p.y, m: p.m, d: p.d };
}

export function partsOfDay(iso: string): DayParts {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

/** A Date whose CAIRO calendar fields are (y, m, d) — noon UTC is safely
 *  inside the same Cairo day at any offset. */
export function tzDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, 12));
}

export function CairoRangeCalendar({
  selected,
  onSelect,
  hovered,
  onHover,
  month,
  year,
  onMonthChange,
}: {
  selected: { from?: DayParts; to?: DayParts };
  onSelect: (p: DayParts) => void;
  hovered: DayParts | undefined;
  onHover: (p: DayParts | undefined) => void;
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';
  const today = cairoTodayParts();

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
    month === 0 ? onMonthChange(11, year - 1) : onMonthChange(month - 1, year);
  const nextMonth = () =>
    month === 11 ? onMonthChange(0, year + 1) : onMonthChange(month + 1, year);

  const monthName = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: CAIRO_TZ,
  }).format(tzDate(year, month, 1));

  const weekdayNames = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: CAIRO_TZ });
    return Array.from({ length: 7 }, (_, i) => fmt.format(tzDate(2024, 0, 7 + i))); // Sun..Sat
  }, [locale]);

  return (
    <div>
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
                onClick={() => !isFuture && onSelect({ y: year, m: month, d })}
                onMouseEnter={() => !isFuture && onHover({ y: year, m: month, d })}
                onMouseLeave={() => onHover(undefined)}
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
    </div>
  );
}
