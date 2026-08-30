import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Flag, Pause, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { sampleAt, SPEEDS, type ReplaySample } from '../playback';
import type { ReplayTrack } from '../use-history';
import { createCursorStore } from './time-deck';

/* -------------------------------------------------------------------------- */
/* A reusable transport bar over a ReplayTrack — the same rAF-clock pattern    */
/* as the tracking page, packaged for embedding (the trip-audit dialog).       */
/*                                                                            */
/* Optionally races an "optimal ghost" track on the same clock: the race      */
/* toggle appears when `ghost` is provided, and the delta chip reads how far  */
/* ahead/behind the optimal runner is at the cursor.                          */
/* -------------------------------------------------------------------------- */

export interface TransportTick {
  ms: number;
  sample: ReplaySample;
  ghost: ReplaySample | null;
}

const makeTimeFmt = (locale: string) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'Africa/Cairo',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

function fmtDelta(ms: number, unitH: string, unitM: string): string {
  const mins = Math.round(Math.abs(ms) / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const span = h > 0 ? `${h}${unitH} ${m}${unitM}` : `${m}${unitM}`;
  return ms >= 0 ? `−${span}` : `+${span}`;
}

export interface ReplayTransportHandle {
  /** Jump the clock (a leg preview seeks here). */
  seek: (ms: number) => void;
}

export const ReplayTransport = React.forwardRef<
  ReplayTransportHandle,
  {
    track: ReplayTrack;
    /** Stop intervals to tick on the scrubber. */
    stopTimes?: Array<{ from: Date }>;
    /** The optimal route's synthetic track — enables the race control. */
    ghost?: ReplayTrack | null;
    onTick: (tick: TransportTick) => void;
    className?: string;
  }
>(function ReplayTransport({ track, stopTimes = [], ghost = null, onTick, className }, ref) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';
  const timeFmt = React.useMemo(() => makeTimeFmt(locale), [locale]);
  const cursor = React.useMemo(() => createCursorStore(track.startMs), [track]);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(16);
  const [racing, setRacing] = React.useState(false);

  const playingRef = React.useRef(false);
  const speedRef = React.useRef(speed);
  const racingRef = React.useRef(false);
  playingRef.current = playing;
  speedRef.current = speed;
  racingRef.current = racing && !!ghost;

  const onTickRef = React.useRef(onTick);
  React.useEffect(() => {
    onTickRef.current = onTick;
  });

  const emit = React.useCallback(
    (ms: number) => {
      onTickRef.current({
        ms,
        sample: sampleAt(track, ms),
        ghost:
          racingRef.current && ghost && ms >= ghost.startMs
            ? sampleAt(ghost, Math.min(ms, ghost.endMs))
            : null,
      });
    },
    [track, ghost],
  );

  // The race can extend past the truck's arrival (a slower optimal keeps
  // running); the clock's end is the later of the two.
  const endMs = racing && ghost ? Math.max(track.endMs, ghost.endMs) : track.endMs;

  React.useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      if (!playingRef.current) return;
      const limit = racingRef.current && ghost ? Math.max(track.endMs, ghost.endMs) : track.endMs;
      const next = Math.min(limit, cursor.get() + dt * speedRef.current);
      cursor.set(next);
      emit(next);
      if (next >= limit) setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cursor, emit, ghost, track]);

  // Seed on track change.
  React.useEffect(() => {
    cursor.set(track.startMs);
    setPlaying(false);
    emit(track.startMs);
  }, [track, cursor, emit]);

  const seek = React.useCallback(
    (ms: number) => {
      const clamped = Math.min(Math.max(ms, track.startMs), endMs);
      cursor.set(clamped);
      emit(clamped);
    },
    [cursor, emit, track.startMs, endMs],
  );
  React.useImperativeHandle(ref, () => ({ seek }), [seek]);

  const value = React.useSyncExternalStore(cursor.subscribe, cursor.get);
  const span = Math.max(1, endMs - track.startMs);
  const pct = Math.min(100, Math.max(0, ((value - track.startMs) / span) * 100));

  // Race delta at the cursor: how much earlier the ghost reaches its current
  // milestone — approximated by arrival-time difference, the honest headline.
  const arrivalDeltaMs = ghost ? track.endMs - ghost.endMs : 0;

  return (
    <div className={cn('space-y-2 p-3', className)}>
      <div className="flex items-center gap-3">
        <span className="w-[70px] shrink-0 text-end font-mono text-[11px] font-semibold tabular-nums">
          {timeFmt.format(new Date(value))}
        </span>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2">
            {stopTimes.map((s, i) => {
              const p = ((s.from.getTime() - track.startMs) / span) * 100;
              if (p < 0 || p > 100) return null;
              return (
                <span
                  key={i}
                  className="absolute top-0 h-2 w-[3px] rounded-sm bg-warning/80"
                  style={{ insetInlineStart: `${p}%` }}
                />
              );
            })}
          </div>
          <input
            type="range"
            min={track.startMs}
            max={endMs}
            step={1000}
            value={value}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label={t('tracking.scrub', 'Playback position')}
            dir="ltr"
            className="relative z-10 h-2 w-full cursor-pointer appearance-none rounded-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-2"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%)`,
            }}
          />
        </div>
        <span className="w-[70px] shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
          {timeFmt.format(new Date(endMs))}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            seek(track.startMs);
            setPlaying(false);
          }}
          aria-label={t('tracking.restart', 'Restart')}
          className="grid h-8 w-8 place-items-center rounded-md border bg-background shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t('tracking.pause', 'Pause') : t('tracking.play', 'Play')}
          className="grid h-8 w-12 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-1 ps-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={speed === s}
              onClick={() => setSpeed(s)}
              className={cn(
                'rounded-md border px-1.5 py-1 font-mono text-[10px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
                speed === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        {ghost && (
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              aria-pressed={racing}
              onClick={() => {
                setRacing((r) => !r);
                emit(cursor.get());
              }}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
                racing
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              {t('tracking.raceOptimal', 'Race optimal')}
            </button>
            {racing && (
              <span
                className={cn(
                  'rounded-md px-2 py-1 font-mono text-[10.5px] font-semibold tabular-nums',
                  arrivalDeltaMs >= 0
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive',
                )}
                title={t(
                  'tracking.raceDeltaHint',
                  'Optimal arrival vs actual arrival',
                )}
              >
                {fmtDelta(arrivalDeltaMs, t('tracking.unit.h', 'h'), t('tracking.unit.m', 'm'))}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
