import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { MonthYearSelector } from './month-year-selector';
import { fmtDate, localToday, type LocalParts } from '@/shared/lib/format';

interface Props {
  /** `YYYY-MM-DD` string — matches what zod's `zDateString` expects */
  value?: string;
  onChange: (value: string) => void;
  /** Optional max boundary as YYYY-MM-DD (inclusive) */
  max?: string;
  /** Optional min boundary as YYYY-MM-DD (inclusive) */
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

function partsFromDateString(s?: string): LocalParts | undefined {
  if (!s) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

function toDateString(p: LocalParts): string {
  const mm = String(p.m + 1).padStart(2, '0');
  const dd = String(p.d).padStart(2, '0');
  return `${p.y}-${mm}-${dd}`;
}

const toNum = (p: LocalParts) => p.y * 10000 + p.m * 100 + p.d;

/**
 * Single-date picker, visually consistent with `DateRangePicker`. Uses the
 * same calendar grid, month navigation, and disabled-future-date behaviour.
 *
 * Value is a `YYYY-MM-DD` string so it slots directly into react-hook-form
 * fields validated by `zDateString`. When the popover is closed, the trigger
 * shows the formatted date ("24 Apr 2026") or a placeholder.
 */
export function DatePicker({
  value,
  onChange,
  max,
  min,
  disabled,
  placeholder,
  className,
  id,
}: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';
  const [open, setOpen] = React.useState(false);

  const selected = partsFromDateString(value);
  const today = localToday();

  const [viewMonth, setViewMonth] = React.useState(selected?.m ?? today.m);
  const [viewYear, setViewYear] = React.useState(selected?.y ?? today.y);

  // When opening, reset the viewport to whatever is currently selected
  React.useEffect(() => {
    if (open) {
      const anchor = selected ?? today;
      setViewMonth(anchor.m);
      setViewYear(anchor.y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const minParts = partsFromDateString(min);
  const maxParts = partsFromDateString(max);
  const minNum = minParts ? toNum(minParts) : null;
  const maxNum = maxParts ? toNum(maxParts) : null;
  const selectedNum = selected ? toNum(selected) : null;
  const todayNum = toNum(today);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const weekdayNames = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i))); // Sun..Sat
  }, [locale]);

  const handleSelect = (day: number) => {
    const p: LocalParts = { y: viewYear, m: viewMonth, d: day };
    onChange(toDateString(p));
    setOpen(false);
  };

  const label = value ? fmtDate(value) : (placeholder ?? t('common.selectDate'));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <MonthYearSelector
          month={viewMonth}
          year={viewYear}
          onChange={(m, y) => {
            setViewMonth(m);
            setViewYear(y);
          }}
          minYear={minParts?.y}
          maxYear={maxParts?.y}
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
            const dn = viewYear * 10000 + viewMonth * 100 + d;
            const isFuture = maxNum !== null ? dn > maxNum : dn > todayNum;
            const isBeforeMin = minNum !== null && dn < minNum;
            const disabledCell = isFuture || isBeforeMin;
            const isToday = dn === todayNum;
            const isSelected = selectedNum !== null && dn === selectedNum;

            return (
              <div key={i} className="flex h-8 items-center justify-center">
                <button
                  type="button"
                  disabled={disabledCell}
                  onClick={() => !disabledCell && handleSelect(d)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                    disabledCell && 'cursor-not-allowed text-muted-foreground/30',
                    !disabledCell && !isSelected && 'hover:bg-muted',
                    isToday && !isSelected && 'border border-primary text-primary',
                    isSelected && 'bg-primary font-semibold text-primary-foreground shadow-sm',
                  )}
                >
                  {d}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <button
            type="button"
            onClick={() => {
              onChange(toDateString(today));
              setOpen(false);
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('datePicker.today')}
          </button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}