import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import {
  CairoRangeCalendar,
  cairoTodayParts,
  dayIso,
  partsOfDay,
  toNum,
  tzDate,
  type DayParts,
} from '@/shared/ui/cairo-range-calendar';
import { CAIRO_TZ } from '@/shared/lib/cairo';
import { cairoWall } from '../api';

/* -------------------------------------------------------------------------- */
/* The history range picker — the old datetime-range's ideas rebuilt in the   */
/* global scope picker's visual language: quick presets (Last hour, 3h,       */
/* Today, Yesterday, 7 days), the shared Cairo two-tap calendar, and time     */
/* fields so a range can start and end mid-day. Emits Cairo wall strings      */
/* (`YYYY-MM-DDTHH:mm`).                                                       */
/* -------------------------------------------------------------------------- */

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function wallOf(day: DayParts, time: string): string {
  return `${dayIso(day)}T${time}`;
}

function splitWall(wall: string | null): { day: DayParts; time: string } | null {
  if (!wall) return null;
  const [d, t] = wall.split('T');
  return { day: partsOfDay(d), time: t?.slice(0, 5) ?? '00:00' };
}

export function TrackingRangePicker({
  initialFrom,
  initialTo,
  onLoad,
  onIntendLoad,
  onCancel,
}: {
  initialFrom: string | null;
  initialTo: string | null;
  onLoad: (fromWall: string, toWall: string) => void;
  onIntendLoad?: (fromWall: string, toWall: string) => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';
  const today = cairoTodayParts();

  const seedFrom = splitWall(initialFrom);
  const seedTo = splitWall(initialTo);
  const [selected, setSelected] = React.useState<{ from?: DayParts; to?: DayParts }>({
    from: seedFrom?.day ?? today,
    to: seedTo?.day ?? today,
  });
  const [hovered, setHovered] = React.useState<DayParts | undefined>();
  const [fromTime, setFromTime] = React.useState(seedFrom?.time ?? '00:00');
  const [toTime, setToTime] = React.useState(seedTo?.time ?? '23:59');
  const [month, setMonth] = React.useState((seedFrom?.day ?? today).m);
  const [year, setYear] = React.useState((seedFrom?.day ?? today).y);

  const fmtDay = React.useCallback(
    (p: DayParts) =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        timeZone: CAIRO_TZ,
      }).format(tzDate(p.y, p.m, p.d)),
    [locale],
  );

  const handleSelect = (p: DayParts) => {
    if (!selected.from || (selected.from && selected.to)) {
      setSelected({ from: p, to: undefined });
    } else {
      const f = toNum(selected.from)!;
      if (toNum(p)! >= f) setSelected({ from: selected.from, to: p });
      else setSelected({ from: p, to: selected.from });
    }
  };

  const range = React.useMemo((): [string, string] | null => {
    const from = selected.from;
    const to = selected.to ?? selected.from;
    if (!from || !to) return null;
    const ft = TIME_RE.test(fromTime) ? fromTime : '00:00';
    const tt = TIME_RE.test(toTime) ? toTime : '23:59';
    const a = wallOf(from, ft);
    const b = wallOf(to, tt);
    return a <= b ? [a, b] : [b, a];
  }, [selected, fromTime, toTime]);

  /** Preset = a range producer, exactly the old picker's idea. */
  const applyPreset = (hours: number | 'today' | 'yesterday' | '7d') => {
    const now = new Date();
    if (hours === 'today') {
      setSelected({ from: today, to: today });
      setFromTime('00:00');
      setToTime('23:59');
      return;
    }
    if (hours === 'yesterday') {
      const y = partsOfDay(
        new Date(Date.UTC(today.y, today.m, today.d - 1, 12)).toISOString().slice(0, 10),
      );
      setSelected({ from: y, to: y });
      setFromTime('00:00');
      setToTime('23:59');
      return;
    }
    if (hours === '7d') {
      const s = partsOfDay(
        new Date(Date.UTC(today.y, today.m, today.d - 6, 12)).toISOString().slice(0, 10),
      );
      setSelected({ from: s, to: today });
      setFromTime('00:00');
      setToTime('23:59');
      return;
    }
    const startWall = cairoWall(new Date(now.getTime() - hours * 3_600_000));
    const endWall = cairoWall(now);
    setSelected({ from: partsOfDay(startWall.slice(0, 10)), to: partsOfDay(endWall.slice(0, 10)) });
    setFromTime(startWall.slice(11, 16));
    setToTime(endWall.slice(11, 16));
  };

  const timeInput = (value: string, onChange: (v: string) => void, label: string) => (
    <input
      type="time"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      aria-label={label}
      className="h-7 rounded-md border bg-background px-1.5 text-center font-mono text-[11px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );

  return (
    <div className="pointer-events-auto w-full rounded-t-2xl border border-b-0 bg-card/95 p-3 shadow-2xl backdrop-blur md:mx-auto md:max-w-md">
      {/* Quick presets — the old picker's set */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {(
          [
            [t('tracking.range.lastHour', 'Last hour'), 1],
            [t('tracking.range.last3h', 'Last 3 hours'), 3],
            [t('tracking.range.today', 'Today'), 'today'],
            [t('tracking.range.yesterday', 'Yesterday'), 'yesterday'],
            [t('tracking.range.7d', 'Last 7 days'), '7d'],
          ] as Array<[string, number | 'today' | 'yesterday' | '7d']>
        ).map(([label, preset]) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyPreset(preset)}
          >
            {label}
          </Button>
        ))}
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('common.close', 'Close')}
          className="ms-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-3 border-t" />

      {/* From / To summary with the time fields inline */}
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted p-2.5 text-xs">
        <div className="flex flex-1 flex-col items-center gap-1">
          <p className="text-muted-foreground">{t('common.from', 'From')}</p>
          <p className="font-semibold">{selected.from ? fmtDay(selected.from) : '—'}</p>
          {timeInput(fromTime, setFromTime, t('common.from', 'From'))}
        </div>
        <div className="h-12 w-px bg-border" />
        <div className="flex flex-1 flex-col items-center gap-1">
          <p className="text-muted-foreground">{t('common.to', 'To')}</p>
          <p className="font-semibold">
            {selected.to ? fmtDay(selected.to) : hovered ? fmtDay(hovered) : '—'}
          </p>
          {timeInput(toTime, setToTime, t('common.to', 'To'))}
        </div>
      </div>

      <CairoRangeCalendar
        selected={selected}
        onSelect={handleSelect}
        hovered={hovered}
        onHover={setHovered}
        month={month}
        year={year}
        onMonthChange={(m, y) => {
          setMonth(m);
          setYear(y);
        }}
      />

      <div className="mt-3 flex justify-end gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          size="sm"
          className={cn('h-7 text-xs')}
          disabled={!range}
          onClick={() => range && onLoad(range[0], range[1])}
          onPointerEnter={() => range && onIntendLoad?.(range[0], range[1])}
          onFocus={() => range && onIntendLoad?.(range[0], range[1])}
        >
          {t('tracking.load', 'Load history')}
        </Button>
      </div>
    </div>
  );
}
