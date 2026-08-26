import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Moon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { formatCairoTime } from '@/shared/lib/cairo';
import {
  legColor,
  type ReplayEventPin,
  type ReplayModel,
} from '@/pages/trip-replay/replay-model';

/* -------------------------------------------------------------------------- */
/* TripReplayTimeline — the spine of the replay.                               */
/*                                                                             */
/* A horizontal band over [startMs, endMs]: leg segments colored by leg_type, */
/* striped dwell gaps, night shading (20:00–07:00 Cairo), event pins, and a   */
/* playhead that is moved IMPERATIVELY through the ref (no React state per    */
/* frame). Hover scrubs a ghost playhead + tooltip via direct DOM writes.     */
/*                                                                             */
/* RTL note: the band keeps `dir="ltr"` even under the Arabic locale — it is  */
/* a time axis, and time axes read left→right in this product regardless of   */
/* text direction. Labels inside stay locale-formatted.                       */
/* -------------------------------------------------------------------------- */

export interface TripReplayTimelineHandle {
  setPlayhead(ms: number): void;
}

export interface TimelinePreview {
  timeLabel: string;
  speedLabel: string;
  kmLabel: string;
}

export interface TripReplayTimelineProps {
  model: ReplayModel;
  disabled?: boolean;
  /** Click anywhere on the band — lock the playhead there. */
  onScrub: (ms: number) => void;
  /** Hover position (null = pointer left). The page ghost-follows on the map. */
  onHover: (ms: number | null) => void;
  /** Click a leg chip — fit camera to the leg + jump to its start. */
  onLegClick: (index: number) => void;
  onPinClick: (pin: ReplayEventPin) => void;
  /** Tooltip content for a hover instant (local time / speed / km so far). */
  getPreview: (ms: number) => TimelinePreview;
  className?: string;
}

const PIN_KIND_CLASS: Record<ReplayEventPin['kind'], string> = {
  delivery: 'bg-sky-500',
  stop: 'bg-amber-500',
  flag: 'bg-red-500',
};

export const TripReplayTimeline = React.forwardRef<
  TripReplayTimelineHandle,
  TripReplayTimelineProps
>(function TripReplayTimeline(
  { model, disabled = false, onScrub, onHover, onLegClick, onPinClick, getPreview, className },
  ref,
) {
  const { t, i18n } = useTranslation();
  const bandRef = React.useRef<HTMLDivElement>(null);
  const playheadRef = React.useRef<HTMLDivElement>(null);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const pctOf = React.useCallback(
    (ms: number) =>
      Math.min(100, Math.max(0, ((ms - model.startMs) / model.spanMs) * 100)),
    [model.startMs, model.spanMs],
  );

  React.useImperativeHandle(
    ref,
    (): TripReplayTimelineHandle => ({
      setPlayhead(ms: number) {
        const node = playheadRef.current;
        if (node) node.style.left = `${pctOf(ms)}%`;
      },
    }),
    [pctOf],
  );

  /* ---- Pointer → time -------------------------------------------------- */

  const msAtClientX = React.useCallback(
    (clientX: number): number => {
      const band = bandRef.current;
      if (!band) return model.startMs;
      const rect = band.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return model.startMs + frac * model.spanMs;
    },
    [model.startMs, model.spanMs],
  );

  const handleMove = (e: React.MouseEvent) => {
    if (disabled) return;
    const ms = msAtClientX(e.clientX);
    const pct = pctOf(ms);
    // Direct DOM writes — mousemove fires at frame rate.
    if (ghostRef.current) {
      ghostRef.current.style.left = `${pct}%`;
      ghostRef.current.style.opacity = '1';
    }
    const tip = tooltipRef.current;
    if (tip) {
      const p = getPreview(ms);
      tip.textContent = `${p.timeLabel} · ${p.speedLabel} · ${p.kmLabel}`;
      tip.style.opacity = '1';
      tip.style.left = `${pct}%`;
    }
    onHover(ms);
  };

  const handleLeave = () => {
    if (ghostRef.current) ghostRef.current.style.opacity = '0';
    if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
    onHover(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    onScrub(msAtClientX(e.clientX));
  };

  /* ---- Static geometry (percent positions) ----------------------------- */

  const segments = React.useMemo(() => {
    const legs = model.timedLegs.map((leg) => ({
      key: `leg-${leg.id}`,
      index: leg.index,
      timedIndex: model.timedLegs.indexOf(leg),
      left: pctOf(leg.departMs!),
      width: Math.max(0.4, pctOf(leg.arriveMs!) - pctOf(leg.departMs!)),
      color: legColor(leg.legType),
      night: leg.night,
      label: `${leg.fromName} → ${leg.toName}`,
      seq: leg.seq,
    }));
    // Dwell blocks between consecutive timed legs.
    const dwellGaps: Array<{ key: string; left: number; width: number }> = [];
    for (let i = 0; i < model.timedLegs.length - 1; i++) {
      const a = model.timedLegs[i];
      const b = model.timedLegs[i + 1];
      if (b.departMs! > a.arriveMs!) {
        const left = pctOf(a.arriveMs!);
        const width = pctOf(b.departMs!) - left;
        if (width > 0.15) dwellGaps.push({ key: `gap-${a.id}`, left, width });
      }
    }
    return { legs, dwellGaps };
  }, [model, pctOf]);

  const nightBlocks = React.useMemo(
    () =>
      model.nightIntervals.map(([s, e], i) => ({
        key: `night-${i}`,
        left: pctOf(s),
        width: Math.max(0.2, pctOf(e) - pctOf(s)),
      })),
    [model.nightIntervals, pctOf],
  );

  return (
    // NOTE: dir="ltr" is intentional — the time axis stays LTR in RTL locales.
    <div dir="ltr" className={cn('select-none px-4 pb-2 pt-5', className)}>
      <div className="relative">
        {/* Tooltip */}
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute -top-6 z-30 -translate-x-1/2 whitespace-nowrap rounded-md border bg-card/95 px-2 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-lg backdrop-blur transition-opacity"
          style={{ opacity: 0, left: '0%' }}
        />

        {/* Band */}
        <div
          ref={bandRef}
          role="slider"
          aria-label={t('tripReplay.timeline.label', 'Trip timeline')}
          aria-valuemin={model.startMs}
          aria-valuemax={model.endMs}
          tabIndex={-1}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onClick={handleClick}
          className={cn(
            'relative h-9 overflow-hidden rounded-lg border bg-muted/50',
            disabled ? 'cursor-not-allowed opacity-40' : 'cursor-crosshair',
          )}
        >
          {/* Dwell gaps — striped, dimmed */}
          {segments.dwellGaps.map((gap) => (
            <div
              key={gap.key}
              className="absolute inset-y-0 opacity-60"
              style={{
                left: `${gap.left}%`,
                width: `${gap.width}%`,
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 3px, hsl(var(--muted-foreground) / 0.35) 3px, hsl(var(--muted-foreground) / 0.35) 5px)',
              }}
            />
          ))}

          {/* Leg segments */}
          {segments.legs.map((seg) => (
            <div
              key={seg.key}
              title={seg.label}
              className="absolute inset-y-1 rounded-sm opacity-80"
              style={{
                left: `${seg.left}%`,
                width: `${seg.width}%`,
                backgroundColor: seg.color,
              }}
            />
          ))}

          {/* Night shading (20:00–07:00 Cairo) */}
          {nightBlocks.map((n) => (
            <div
              key={n.key}
              className="absolute inset-y-0 bg-slate-950/35 dark:bg-black/45"
              style={{ left: `${n.left}%`, width: `${n.width}%` }}
              title={t('tripReplay.timeline.night', 'Night permit window (20:00–07:00)')}
            />
          ))}

          {/* Ghost playhead (hover) */}
          <div
            ref={ghostRef}
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-foreground/50 transition-opacity"
            style={{ opacity: 0, left: '0%' }}
          />

          {/* Playhead — moved imperatively */}
          <div
            ref={playheadRef}
            className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 bg-primary"
            style={{ left: '0%' }}
          >
            <div className="absolute -top-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow" />
          </div>
        </div>

        {/* Event pins */}
        <div className="relative mt-1 h-4">
          {model.pins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              disabled={disabled}
              onClick={() => onPinClick(pin)}
              title={pin.label}
              aria-label={pin.label}
              className={cn(
                'absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border border-background shadow transition-transform hover:scale-125',
                PIN_KIND_CLASS[pin.kind],
                disabled && 'pointer-events-none opacity-40',
              )}
              style={{ left: `${pctOf(pin.ms)}%` }}
            />
          ))}
        </div>

        {/* Leg chips + start/end labels */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {formatCairoTime(new Date(model.startMs), i18n.language)}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {segments.legs.map((seg) => (
              <button
                key={`chip-${seg.key}`}
                type="button"
                disabled={disabled}
                onClick={() => onLegClick(seg.timedIndex)}
                title={seg.label}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors hover:bg-muted',
                  disabled && 'pointer-events-none opacity-40',
                )}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                {seg.seq}
                {seg.night && <Moon className="h-2.5 w-2.5 text-primary" />}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {formatCairoTime(new Date(model.endMs), i18n.language)}
          </span>
        </div>
      </div>
    </div>
  );
});
