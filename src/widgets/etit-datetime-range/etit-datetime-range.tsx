import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import { MonthYearSelector } from '@/shared/ui/month-year-selector';
import {
  cairoEndOfDay,
  cairoFromParts,
  cairoStartOfDay,
  formatCairo,
} from '@/entities/etit-vehicle/cairo';

/* -------------------------------------------------------------------------- */
/* Cairo parts helpers                                                         */
/* -------------------------------------------------------------------------- */

interface CairoParts {
  year: number;
  month: number; // 1-indexed
  day: number;
  hour: number;
  minute: number;
}

function cairoPartsOf(d: Date): CairoParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const rawHour = get('hour');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: get('minute'),
  };
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/* -------------------------------------------------------------------------- */
/* Presets                                                                     */
/* -------------------------------------------------------------------------- */

interface Preset {
  key: string;
  build: () => { from: Date; to: Date };
}

function todayCairo(): { from: Date; to: Date } {
  const now = new Date();
  return { from: cairoStartOfDay(now), to: cairoEndOfDay(now) };
}

function yesterdayCairo(): { from: Date; to: Date } {
  const now = new Date();
  const cairo = cairoPartsOf(now);
  // Construct a Cairo "today" anchor, then subtract 24h — this is robust to DST
  // because we only use the Date as a lookup, not as a calendar offset.
  const todayStart = cairoFromParts(cairo.year, cairo.month, cairo.day, 0, 0, 0);
  const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60_000);
  return { from: cairoStartOfDay(yesterday), to: cairoEndOfDay(yesterday) };
}

function lastNHours(n: number): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to.getTime() - n * 60 * 60_000);
  return { from, to };
}

function lastNDays(n: number): { from: Date; to: Date } {
  const now = new Date();
  const to = cairoEndOfDay(now);
  const from = cairoStartOfDay(new Date(now.getTime() - (n - 1) * 24 * 60 * 60_000));
  return { from, to };
}

const PRESETS: Preset[] = [
  { key: 'lastHour', build: () => lastNHours(1) },
  { key: 'last3h',   build: () => lastNHours(3) },
  { key: 'today',    build: todayCairo },
  { key: 'yesterday', build: yesterdayCairo },
  { key: 'last7d',   build: () => lastNDays(7) },
];

function rangesEqual(a: { from: Date; to: Date }, b: { from: Date; to: Date }): boolean {
  // Equal within a minute — preset comparisons should ignore sub-minute jitter
  // from the relative builders ("last hour" anchored to the second changes
  // every render).
  const fromOk = Math.abs(a.from.getTime() - b.from.getTime()) < 60_000;
  const toOk = Math.abs(a.to.getTime() - b.to.getTime()) < 60_000;
  return fromOk && toOk;
}

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface EtitDateTimeRangeProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
  className?: string;
  /** Optional max date in Cairo-time — defaults to "now". */
  maxDate?: Date;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function EtitDateTimeRange({
  value,
  onChange,
  className,
  maxDate,
}: EtitDateTimeRangeProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';
  const [open, setOpen] = React.useState(false);

  // Working copy — applied only on click of "Apply".
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const fromParts = cairoPartsOf(draft.from);
  const toParts = cairoPartsOf(draft.to);
  const max = maxDate ?? new Date();
  const maxPartsRef = React.useMemo(() => cairoPartsOf(max), [max]);

  // Active calendar viewport (which side is being edited)
  type Side = 'from' | 'to';
  const [side, setSide] = React.useState<Side>('from');

  const sideParts = side === 'from' ? fromParts : toParts;
  const [viewMonth, setViewMonth] = React.useState(sideParts.month - 1);
  const [viewYear, setViewYear] = React.useState(sideParts.year);
  React.useEffect(() => {
    setViewMonth(sideParts.month - 1);
    setViewYear(sideParts.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side]);

  const setSideDate = (y: number, mZeroIndexed: number, d: number) => {
    if (side === 'from') {
      const next = cairoFromParts(y, mZeroIndexed + 1, d, fromParts.hour, fromParts.minute, 0);
      const newRange = { from: next, to: draft.to };
      // Auto-fix: if from > to, snap to to top of from
      if (next.getTime() > draft.to.getTime()) {
        newRange.to = cairoFromParts(y, mZeroIndexed + 1, d, 23, 59, 0);
      }
      setDraft(newRange);
    } else {
      const next = cairoFromParts(y, mZeroIndexed + 1, d, toParts.hour, toParts.minute, 0);
      const newRange = { from: draft.from, to: next };
      if (next.getTime() < draft.from.getTime()) {
        newRange.from = cairoFromParts(y, mZeroIndexed + 1, d, 0, 0, 0);
      }
      setDraft(newRange);
    }
  };

  const setSideTime = (hour: number, minute: number) => {
    if (side === 'from') {
      const next = cairoFromParts(
        fromParts.year, fromParts.month, fromParts.day, hour, minute, 0,
      );
      setDraft({ from: next, to: draft.to });
    } else {
      const next = cairoFromParts(
        toParts.year, toParts.month, toParts.day, hour, minute, 0,
      );
      setDraft({ from: draft.from, to: next });
    }
  };

  const handlePreset = (p: Preset) => {
    const r = p.build();
    setDraft(r);
    onChange(r);
    setOpen(false);
  };

  const isPresetActive = (p: Preset) => rangesEqual(value, p.build());

  const apply = () => {
    if (draft.from.getTime() > draft.to.getTime()) return;
    onChange(draft);
    setOpen(false);
  };

  /* -- Calendar grid math -- */
  const todayParts = React.useMemo(() => cairoPartsOf(new Date()), []);
  const todayNum = todayParts.year * 10000 + todayParts.month * 100 + todayParts.day;
  const maxNum =
    maxPartsRef.year * 10000 + maxPartsRef.month * 100 + maxPartsRef.day;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const weekdayNames = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)));
  }, [locale]);

  const fromNum = fromParts.year * 10000 + fromParts.month * 100 + fromParts.day;
  const toNum = toParts.year * 10000 + toParts.month * 100 + toParts.day;
  const lo = Math.min(fromNum, toNum);
  const hi = Math.max(fromNum, toNum);

  const triggerLabel = `${formatCairo(value.from, 'datetime')} → ${formatCairo(value.to, 'datetime')}`;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            variant={isPresetActive(p) ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePreset(p)}
            className="h-8 text-xs"
          >
            {t(`etit.range.preset.${p.key}`)}
          </Button>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={PRESETS.some(isPresetActive) ? 'outline' : 'default'}
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              <CalendarIcon className="h-3 w-3" />
              {t('etit.range.custom')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-3" align="start">
            {/* Side toggle */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <SideButton
                active={side === 'from'}
                onClick={() => setSide('from')}
                label={t('common.from')}
                value={formatCairo(draft.from, 'datetime')}
              />
              <SideButton
                active={side === 'to'}
                onClick={() => setSide('to')}
                label={t('common.to')}
                value={formatCairo(draft.to, 'datetime')}
              />
            </div>

            {/* Month nav */}
            <MonthYearSelector
              month={viewMonth}
              year={viewYear}
              onChange={(m, y) => {
                setViewMonth(m);
                setViewYear(y);
              }}
              maxYear={maxPartsRef.year}
            />

            {/* Calendar */}
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
                const dn = viewYear * 10000 + (viewMonth + 1) * 100 + d;
                const disabled = dn > maxNum;
                const isToday = dn === todayNum;
                const isFrom = dn === fromNum;
                const isTo = dn === toNum && fromNum !== toNum;
                const inRange = dn > lo && dn < hi;
                const isSelected =
                  (side === 'from' && isFrom) || (side === 'to' && (isTo || (fromNum === toNum && isFrom)));

                return (
                  <div
                    key={i}
                    className={cn(
                      'relative flex h-8 items-center justify-center',
                      inRange && 'bg-primary/10',
                      isFrom && 'rounded-s-full bg-primary/10',
                      isTo && 'rounded-e-full bg-primary/10',
                    )}
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && setSideDate(viewYear, viewMonth, d)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                        disabled && 'cursor-not-allowed text-muted-foreground/30',
                        !disabled && !isSelected && 'hover:bg-muted',
                        isToday && !isSelected && 'border border-primary text-primary',
                        isSelected &&
                          'bg-primary font-semibold text-primary-foreground shadow-sm',
                      )}
                    >
                      {d}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Time input for the active side */}
            <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 p-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {side === 'from' ? t('common.from') : t('common.to')}
              </span>
              <Input
                type="number"
                min={0}
                max={23}
                value={pad2(side === 'from' ? fromParts.hour : toParts.hour)}
                onChange={(e) => {
                  const h = Math.max(0, Math.min(23, Number(e.target.value || 0)));
                  setSideTime(h, side === 'from' ? fromParts.minute : toParts.minute);
                }}
                className="h-8 w-14 text-center text-sm tabular-nums"
                aria-label="Hour"
              />
              <span className="text-sm text-muted-foreground">:</span>
              <Input
                type="number"
                min={0}
                max={59}
                value={pad2(side === 'from' ? fromParts.minute : toParts.minute)}
                onChange={(e) => {
                  const m = Math.max(0, Math.min(59, Number(e.target.value || 0)));
                  setSideTime(side === 'from' ? fromParts.hour : toParts.hour, m);
                }}
                className="h-8 w-14 text-center text-sm tabular-nums"
                aria-label="Minute"
              />
              <span className="ms-auto rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {t('etit.controls.cairoTime')}
              </span>
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between border-t pt-2">
              <p className="truncate text-[10px] text-muted-foreground">
                {triggerLabel}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={apply}
                  disabled={draft.from.getTime() > draft.to.getTime()}
                >
                  {t('datePicker.apply')}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active range readout */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="truncate font-medium text-foreground">
          {formatCairo(value.from, 'datetime')}
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="truncate font-medium text-foreground">
          {formatCairo(value.to, 'datetime')}
        </span>
        <span className="ms-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">
          {t('etit.controls.cairoTime')}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Side button                                                                 */
/* -------------------------------------------------------------------------- */

function SideButton({
  active,
  onClick,
  label,
  value,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border p-2 text-start transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent',
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-xs font-semibold tabular-nums">{value}</div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Default range producer (today in Cairo)                                     */
/* -------------------------------------------------------------------------- */

export function defaultCairoTodayRange(): { from: Date; to: Date } {
  const now = new Date();
  return { from: cairoStartOfDay(now), to: cairoEndOfDay(now) };
}
