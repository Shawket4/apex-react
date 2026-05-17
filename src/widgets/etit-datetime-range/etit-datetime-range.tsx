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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/shared/ui/sheet';
import { useIsDesktop } from '@/shared/hooks/use-media-query';
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
  // Construct a Cairo "today" anchor, then subtract 24h — robust to DST
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
  /** Fired when the picker overlay opens or closes (popover / sheet). */
  onOpenChange?: (open: boolean) => void;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function EtitDateTimeRange({
  value,
  onChange,
  className,
  maxDate,
  onOpenChange,
}: EtitDateTimeRangeProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';
  const [open, setOpen] = React.useState(false);
  const isDesktop = useIsDesktop();

  const setPickerOpen = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

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
    // Clamp values
    const h = Math.max(0, Math.min(23, hour));
    const m = Math.max(0, Math.min(59, minute));

    if (side === 'from') {
      const next = cairoFromParts(
        fromParts.year, fromParts.month, fromParts.day, h, m, 0,
      );
      setDraft({ from: next, to: draft.to });
    } else {
      const next = cairoFromParts(
        toParts.year, toParts.month, toParts.day, h, m, 0,
      );
      setDraft({ from: draft.from, to: next });
    }
  };

  const handlePreset = (p: Preset) => {
    const r = p.build();
    setDraft(r);
    onChange(r);
    setPickerOpen(false);
  };

  const apply = () => {
    if (draft.from.getTime() > draft.to.getTime()) return;
    onChange(draft);
    setPickerOpen(false);
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

  const activePreset = PRESETS.find((p) => rangesEqual(value, p.build()));

  const triggerNode = (
    <Button
      variant="outline"
      className={cn(
        'h-auto min-h-[44px] w-full justify-start px-3 py-2 text-start transition-all hover:bg-accent/50 active:scale-[0.99]',
        !activePreset && 'border-primary/30 bg-primary/5',
      )}
    >
      <CalendarIcon className="me-2 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-bold tracking-tight">
            {activePreset ? t(`etit.range.preset.${activePreset.key}`) : t('etit.range.custom')}
          </span>
          {!activePreset && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
          <span className="truncate">{formatCairo(value.from, 'datetime')}</span>
          <span className="shrink-0 opacity-50">→</span>
          <span className="truncate">{formatCairo(value.to, 'datetime')}</span>
        </div>
      </div>
    </Button>
  );

  /* ----------------------------------------------------------------------- */
  /* Scrollable middle — shared between desktop popover and mobile sheet     */
  /* ----------------------------------------------------------------------- */

  const scrollableContent = (
    <div className="space-y-4">
      {/* Presets */}
      <div className="space-y-2">
        <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t('etit.range.preset.period') || 'Presets'}
        </label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              variant={activePreset?.key === p.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePreset(p)}
              className="h-9 justify-start px-2.5 text-xs font-medium"
            >
              <div
                className={cn(
                  'me-2 h-1.5 w-1.5 shrink-0 rounded-full',
                  activePreset?.key === p.key
                    ? 'bg-primary-foreground'
                    : 'bg-muted-foreground/30',
                )}
              />
              <span className="truncate">{t(`etit.range.preset.${p.key}`)}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border/60" />

      {/* Custom Picker Section */}
      <div className="space-y-3">
        <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t('etit.range.custom')}
        </label>

        {/* Side toggle */}
        <div className="grid grid-cols-2 gap-2">
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
        <div className="space-y-1">
          <div className="grid grid-cols-7">
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
                (side === 'from' && isFrom) ||
                (side === 'to' && (isTo || (fromNum === toNum && isFrom)));

              return (
                <div
                  key={i}
                  className={cn(
                    // Bigger touch target on phones, tighter on tablet/desktop.
                    'relative flex h-10 items-center justify-center sm:h-8',
                    inRange && 'bg-primary/10',
                    isFrom && 'rounded-s-full bg-primary/10',
                    isTo && 'rounded-e-full bg-primary/10',
                  )}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!disabled) setSideDate(viewYear, viewMonth, d);
                    }}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors sm:h-8 sm:w-8',
                      disabled && 'cursor-not-allowed text-muted-foreground/30',
                      !disabled && !isSelected && 'hover:bg-muted active:scale-95',
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
        </div>

        {/* Time picker */}
        <div className="rounded-xl border bg-muted/20 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {side === 'from' ? t('common.from') : t('common.to')}
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold sm:h-6"
                onClick={() => setSideTime(0, 0)}
              >
                00:00
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold sm:h-6"
                onClick={() => setSideTime(23, 59)}
              >
                23:59
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:gap-4">
            {/* Hours selector */}
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-6 gap-1.5">
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h12) => {
                  const isPM = sideParts.hour >= 12;
                  const h24 = (h12 % 12) + (isPM ? 12 : 0);
                  const active = sideParts.hour === h24;
                  return (
                    <button
                      key={h12}
                      type="button"
                      onClick={() => setSideTime(h24, sideParts.minute)}
                      className={cn(
                        'h-8 rounded-md text-xs tabular-nums transition-colors sm:h-7',
                        active
                          ? 'bg-primary font-bold text-primary-foreground'
                          : 'border border-border/50 bg-background hover:bg-muted active:scale-95',
                      )}
                    >
                      {h12}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vertical divider */}
            <div className="w-px shrink-0 self-stretch bg-border/60" />

            {/* AM/PM + Minutes */}
            <div className="flex w-[72px] shrink-0 flex-col gap-3 sm:w-24">
              <div className="flex gap-1">
                {['AM', 'PM'].map((p) => {
                  const isPM = p === 'PM';
                  const currentIsPM = sideParts.hour >= 12;
                  const active = isPM === currentIsPM;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        let nextH = sideParts.hour % 12;
                        if (isPM) nextH += 12;
                        setSideTime(nextH, sideParts.minute);
                      }}
                      className={cn(
                        'h-9 flex-1 rounded-md text-[10px] font-bold transition-colors sm:h-8',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border/50 bg-background hover:bg-muted active:scale-95',
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={pad2(sideParts.minute)}
                onChange={(e) => {
                  const m = Math.max(0, Math.min(59, Number(e.target.value || 0)));
                  setSideTime(sideParts.hour, m);
                }}
                className="h-9 w-full border-border/50 text-center text-xs font-bold tabular-nums focus-visible:ring-1 sm:h-8"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ----------------------------------------------------------------------- */
  /* Sticky footer — same actions on both platforms                          */
  /* ----------------------------------------------------------------------- */

  const footerNode = (
    <div className="flex items-center justify-between gap-2">
      <p className="min-w-0 truncate text-[9px] font-medium uppercase tracking-tighter text-muted-foreground opacity-70">
        {formatCairo(draft.from, 'time')} → {formatCairo(draft.to, 'time')}
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs sm:h-8"
          onClick={() => setPickerOpen(false)}
        >
          {t('common.cancel')}
        </Button>
        <Button
          size="sm"
          className="h-9 px-4 text-xs font-bold sm:h-8"
          onClick={apply}
          disabled={draft.from.getTime() > draft.to.getTime()}
        >
          {t('datePicker.apply')}
        </Button>
      </div>
    </div>
  );

  /* ----------------------------------------------------------------------- */
  /* Desktop — Popover with internal scroll + sticky footer                  */
  /* ----------------------------------------------------------------------- */

  if (isDesktop) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Popover open={open} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>{triggerNode}</PopoverTrigger>
          <PopoverContent
            // Bound height to viewport; let the inner div handle the scroll
            // so the footer (Apply/Cancel) is always visible.
            className="z-[10050] flex max-h-[min(720px,calc(100vh-100px))] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden p-0 shadow-2xl"
            align="start"
            side="bottom"
            sideOffset={8}
            collisionPadding={12}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
              {scrollableContent}
            </div>
            <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              {footerNode}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  /* ----------------------------------------------------------------------- */
  /* Mobile — Sheet from bottom: drag handle, sticky header & footer         */
  /* ----------------------------------------------------------------------- */

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Sheet open={open} onOpenChange={setPickerOpen}>
        <SheetTrigger asChild>{triggerNode}</SheetTrigger>
        <SheetContent
          side="bottom"
          stacked
          hideCloseButton
          // dvh handles the iOS URL-bar collapse better than vh.
          className="flex max-h-[92dvh] w-full flex-col gap-0 rounded-t-2xl p-0 sm:max-w-lg sm:mx-auto"
        >
          {/* Drag handle + title (sticky top) */}
          <div className="shrink-0 px-4 pb-2 pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <h2 className="text-start text-base font-semibold leading-none tracking-tight">
              {t('etit.range.period')}
            </h2>
          </div>

          {/* Scrollable middle */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {scrollableContent}
          </div>

          {/* Sticky footer (respects iOS home-indicator safe area) */}
          <div
            className="shrink-0 border-t border-border/60 bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
            }}
          >
            {footerNode}
          </div>
        </SheetContent>
      </Sheet>
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
        'rounded-md border p-2 text-start transition-colors active:scale-[0.99]',
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