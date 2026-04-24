import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

interface MonthYearSelectorProps {
  month: number; // 0-indexed
  year: number;
  onChange: (month: number, year: number) => void;
  /** Optional lower bound year — defaults to current year - 10 */
  minYear?: number;
  /** Optional upper bound year — defaults to current year */
  maxYear?: number;
}

/**
 * Header bar for both DatePicker and DateRangePicker.
 *
 * Month-by-month navigation via chevrons stays fast for adjacent months.
 * The month and year labels are clickable dropdowns for quick jumps back
 * in time — a two-click path to any month in the past decade.
 *
 * Month names are locale-aware via Intl. Year range clamps to `minYear` /
 * `maxYear` when given, otherwise defaults to the last ten years through
 * the current year (no future years by default — the pickers disable future
 * dates anyway, so exposing future years would create dead options).
 */
export function MonthYearSelector({
  month,
  year,
  onChange,
  minYear,
  maxYear,
}: MonthYearSelectorProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';

  const currentYear = new Date().getFullYear();
  const yMin = minYear ?? currentYear - 10;
  const yMax = maxYear ?? currentYear;

  // Always include the currently-selected year in the range even if it's
  // somehow outside the bounds (edit mode on old data, for example).
  const effectiveMin = Math.min(yMin, year);
  const effectiveMax = Math.max(yMax, year);

  const monthNames = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'long' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2024, i, 1)));
  }, [locale]);

  const years = React.useMemo(() => {
    const list: number[] = [];
    for (let y = effectiveMax; y >= effectiveMin; y--) list.push(y);
    return list;
  }, [effectiveMin, effectiveMax]);

  const goPrev = () => {
    if (month === 0) onChange(11, year - 1);
    else onChange(month - 1, year);
  };
  const goNext = () => {
    if (month === 11) onChange(0, year + 1);
    else onChange(month + 1, year);
  };

  return (
    <div className="mb-3 flex items-center gap-1.5">
      <button
        type="button"
        onClick={goPrev}
        className="rounded p-1 hover:bg-muted"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
      </button>

      <div className="flex flex-1 items-center justify-center gap-1">
        <Select
          value={String(month)}
          onValueChange={(v) => onChange(Number(v), year)}
        >
          <SelectTrigger className="h-8 w-auto gap-1 border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-1">
            <SelectValue>{monthNames[month]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {monthNames.map((name, i) => (
              <SelectItem key={i} value={String(i)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(v) => onChange(month, Number(v))}
        >
          <SelectTrigger className="h-8 w-auto gap-1 border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-1">
            <SelectValue>{year}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={goNext}
        className="rounded p-1 hover:bg-muted"
        aria-label="Next month"
      >
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
      </button>
    </div>
  );
}