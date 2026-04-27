import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gauge,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { formatCairo, formatCairoClock } from '@/entities/etit-vehicle/cairo';
import {
  activeStop,
  buildPlaybackTrack,
  recentSensor,
  stateAtTime,
  type PlaybackState,
  type PlaybackTrack,
} from '@/entities/etit-vehicle/playback';
import type {
  EtitHistoryPoint,
  EtitSensorEvent,
  EtitStop,
} from '@/entities/etit-vehicle/schemas';

/* -------------------------------------------------------------------------- */
/* Speeds                                                                      */
/* */
/* Five buttons cover the useful range. 1× / 4× / 16× / 64× / 256×.           *
 * -------------------------------------------------------------------------- */

const SPEEDS = [1, 4, 16, 64, 256] as const;

/** Hand-off throttle for parent state updates. ~30Hz looks smooth on map. */
const HANDOFF_INTERVAL_MS = 33;

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface EtitPlaybackPlayerProps {
  points: EtitHistoryPoint[];
  stops: EtitStop[];
  sensors: EtitSensorEvent[];
  /**
   * Pushed to the parent on each significant state change. Throttled to
   * ~30Hz to keep map updates cheap. The marker still animates smoothly
   * because the providers tween between positions.
   */
  onStateChange: (
    state: PlaybackState | null,
    prev: { lat: number; lng: number } | null,
  ) => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function EtitPlaybackPlayer({
  points,
  stops,
  sensors,
  onStateChange,
  className,
}: EtitPlaybackPlayerProps) {
  const { t } = useTranslation();

  const track = React.useMemo<PlaybackTrack>(() => buildPlaybackTrack(points), [points]);
  const playable = track.points.length >= 2;

  const [currentMs, setCurrentMs] = React.useState<number>(track.startMs);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState<number>(16);

  // Reset on track swap.
  React.useEffect(() => {
    setCurrentMs(track.startMs);
    setPlaying(false);
  }, [track]);

  /* -------- rAF loop -------------------------------------------------- */

  const playingRef = React.useRef(playing);
  const speedRef = React.useRef<number>(speed);
  const currentMsRef = React.useRef(currentMs);

  React.useEffect(() => { playingRef.current = playing; }, [playing]);
  React.useEffect(() => { speedRef.current = speed; }, [speed]);
  React.useEffect(() => { currentMsRef.current = currentMs; }, [currentMs]);

  React.useEffect(() => {
    if (!playable || !playingRef.current) return;
    
    let rafId = 0;
    let lastFrame = performance.now();

    const tick = (now: number) => {
      const dt = now - lastFrame;
      lastFrame = now;

      if (playingRef.current) {
        const next = currentMsRef.current + dt * speedRef.current;
        if (next >= track.endMs) {
          currentMsRef.current = track.endMs;
          setCurrentMs(track.endMs);
          setPlaying(false);
        } else {
          currentMsRef.current = next;
          setCurrentMs(next);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playable, track.endMs, playing]);

  /* -------- Derived state -------------------------------------------- */

  const state = React.useMemo<PlaybackState | null>(
    () => (playable ? stateAtTime(track, currentMs) : null),
    [playable, track, currentMs],
  );

  /* -------- Throttled hand-off to parent ----------------------------- */
  /* *
   * The parent uses the state to render the playback marker. We don't need  *
   * to push every frame — pushing at ~30Hz is plenty for a smooth marker    *
   * and avoids a render cascade on the rest of the page. The parent is also *
   * given the previous lat/lng so it can compute heading without re-doing   *
   * the work itself.
   *
   * -------------------------------------------------------------------------- */

  const onStateChangeRef = React.useRef(onStateChange);
  React.useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

  const prevPositionRef = React.useRef<{ lat: number; lng: number } | null>(null);
  const lastHandoffRef = React.useRef(0);

  React.useEffect(() => {
    const now = performance.now();
    const elapsed = now - lastHandoffRef.current;
    if (state === null) {
      onStateChangeRef.current(null, prevPositionRef.current);
      prevPositionRef.current = null;
      lastHandoffRef.current = now;
      return;
    }
    // Always push when paused / first frame; otherwise gate on the interval.
    if (!playingRef.current || elapsed >= HANDOFF_INTERVAL_MS) {
      onStateChangeRef.current(state, prevPositionRef.current);
      prevPositionRef.current = { lat: state.lat, lng: state.lng };
      lastHandoffRef.current = now;
    }
  }, [state]);

  /* -------- Active context ------------------------------------------- */

  const currentStop = React.useMemo(
    () => (state ? activeStop(stops, currentMs) : null),
    [stops, currentMs, state],
  );

  const currentSensor = React.useMemo(
    () => (state ? recentSensor(sensors, currentMs) : null),
    [sensors, currentMs, state],
  );

  /* -------- Handlers ------------------------------------------------- */

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ts = Number(e.target.value);
    if (!Number.isFinite(ts)) return;
    setCurrentMs(ts);
    currentMsRef.current = ts;
  };

  const handleTogglePlay = () => {
    if (!playable) return;
    if (currentMs >= track.endMs && !playing) {
      setCurrentMs(track.startMs);
      currentMsRef.current = track.startMs;
    }
    setPlaying((p) => !p);
  };

  const handleRestart = () => {
    setCurrentMs(track.startMs);
    currentMsRef.current = track.startMs;
  };

  /* -------- Render --------------------------------------------------- */

  if (!playable) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground',
          className,
        )}
      >
        {t('etit.player.empty')}
      </div>
    );
  }

  return (
    <div className={cn('bg-transparent p-1 px-2', className)}>
      {/* Top row */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="font-mono text-sm font-black tabular-nums text-foreground">
          {state ? formatCairoClock(state.timestamp) : '--:--:--'}
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <Gauge className={cn('h-3 w-3', state?.speeding ? 'text-destructive' : 'text-primary')} />
          <span
            className={cn(
              'font-black tabular-nums',
              state?.speeding ? 'text-destructive' : 'text-foreground',
            )}
          >
            {state ? Math.round(state.speed) : 0} {t('etit.units.kmh')}
          </span>
          {state && state.speedLimit > 0 && (
            <span className="text-muted-foreground font-bold">/ {state.speedLimit}</span>
          )}
        </div>
      </div>

      {/* Scrubber */}
      <div className="relative mb-0.5">
        <input
          type="range"
          min={track.startMs}
          max={track.endMs}
          step={1000}
          value={currentMs}
          onChange={handleScrub}
          className="block h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
          aria-label={t('etit.player.scrubberLabel')}
        />
      </div>

      {/* Time labels */}
      <div className="mb-2 flex justify-between text-[9px] font-bold tabular-nums text-muted-foreground uppercase tracking-tighter">
        <span>{formatCairoClock(track.startMs)}</span>
        <span className="text-foreground/60">{formatCairo(currentMs, 'datetime')}</span>
        <span>{formatCairoClock(track.endMs)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={handleRestart}
            title={t('etit.player.restart')}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            type="button" size="icon" className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            onClick={handleTogglePlay}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-muted-foreground font-bold uppercase tracking-tighter">{t('etit.player.speed')}</span>
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  const currentIndex = SPEEDS.indexOf(speed as any);
                  const nextIndex = (currentIndex + 1) % SPEEDS.length;
                  setSpeed(SPEEDS[nextIndex]);
                }}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-black tabular-nums transition-colors',
                  speed === s
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active context */}
      <div className="mt-2 min-h-[30px] border-t border-border pt-1.5">
        {currentStop && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" aria-hidden />
            <span className="font-bold text-foreground">
              {t('etit.player.stoppedFor', { duration: currentStop.duration })}
            </span>
            <span className="truncate text-muted-foreground">
              {currentStop.address || t('etit.map.popup.unknownLocation')}
            </span>
          </div>
        )}
        {currentSensor && (
          <div className={cn('flex items-center gap-2 text-[10px]', currentStop && 'mt-1')}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" aria-hidden />
            <span className="font-bold text-foreground">{currentSensor.typeName}</span>
            <span className="text-muted-foreground">
              {t('etit.player.atTime', {
                time: formatCairo(currentSensor.timestamp, 'time'),
              })}
            </span>
          </div>
        )}
        {!currentStop && !currentSensor && (
          <div className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest italic">
            {t('etit.player.idleSlot')}
          </div>
        )}
      </div>
    </div>
  );
}