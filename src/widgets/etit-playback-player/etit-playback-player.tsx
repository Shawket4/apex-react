import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Gauge, Pause, Play, RotateCcw } from 'lucide-react';
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
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

/** Includes 1× so tapping an active speed produces a visible "1×" state. */
const SPEEDS = [1, 4, 16, 64, 256] as const;

/** Hand-off throttle for parent state updates. ~30Hz looks smooth on map. */
const HANDOFF_INTERVAL_MS = 33;

/** Internal render throttle while playing. ~30Hz keeps clock smooth without
 *  rendering the whole player at 60Hz. */
const RENDER_INTERVAL_MS = 33;

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface EtitPlaybackPlayerProps {
  points: EtitHistoryPoint[];
  stops: EtitStop[];
  sensors: EtitSensorEvent[];
  currentMs: number;
  onCurrentMsChange: (ms: number) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
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
  currentMs,
  onCurrentMsChange,
  playing,
  onPlayingChange,
  speed,
  onSpeedChange,
  onStateChange,
  className,
}: EtitPlaybackPlayerProps) {
  const { t } = useTranslation();

  const track = React.useMemo<PlaybackTrack>(() => buildPlaybackTrack(points), [points]);
  const playable = track.points.length >= 2;

  /* -------- rAF loop — only runs when playing ------------------------- */

  const speedRef = React.useRef<number>(speed);
  const currentMsRef = React.useRef(currentMs);
  React.useEffect(() => { speedRef.current = speed; }, [speed]);
  React.useEffect(() => { currentMsRef.current = currentMs; }, [currentMs]);

  React.useEffect(() => {
    if (!playable || !playing) return;

    let rafId = 0;
    let lastFrame = performance.now();
    let lastRender = lastFrame;

    const tick = (now: number) => {
      const dt = now - lastFrame;
      lastFrame = now;

      const next = currentMsRef.current + dt * speedRef.current;
      if (next >= track.endMs) {
        currentMsRef.current = track.endMs;
        onCurrentMsChange(track.endMs);
        onPlayingChange(false);
        return;
      }
      currentMsRef.current = next;

      // Throttle internal renders to RENDER_INTERVAL_MS.
      if (now - lastRender >= RENDER_INTERVAL_MS) {
        onCurrentMsChange(next);
        lastRender = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playable, playing, track.endMs, onCurrentMsChange, onPlayingChange]);

  /* -------- Derived state -------------------------------------------- */

  const state = React.useMemo<PlaybackState | null>(
    () => (playable ? stateAtTime(track, currentMs) : null),
    [playable, track, currentMs],
  );

  /* -------- Throttled hand-off to parent ----------------------------- */

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
    if (!playing || elapsed >= HANDOFF_INTERVAL_MS) {
      onStateChangeRef.current(state, prevPositionRef.current);
      prevPositionRef.current = { lat: state.lat, lng: state.lng };
      lastHandoffRef.current = now;
    }
  }, [state, playing]);

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

    // Find nearest point in track.points for snapping
    if (track.points.length > 0) {
      let nearestTs = track.points[0].timestamp.getTime();
      let minDiff = Math.abs(ts - nearestTs);

      for (let i = 1; i < track.points.length; i++) {
        const pointTs = track.points[i].timestamp.getTime();
        const diff = Math.abs(ts - pointTs);
        if (diff < minDiff) {
          minDiff = diff;
          nearestTs = pointTs;
        } else if (diff > minDiff) {
          // Since points are sorted by time, if diff starts increasing, we found it.
          break;
        }
      }
      onCurrentMsChange(nearestTs);
    } else {
      onCurrentMsChange(ts);
    }
  };

  const handleTogglePlay = () => {
    if (!playable) return;
    if (currentMs >= track.endMs && !playing) {
      onCurrentMsChange(track.startMs);
    }
    onPlayingChange(!playing);
  };

  const handleRestart = () => {
    onCurrentMsChange(track.startMs);
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
    <div className={cn('p-1.5 px-2', className)}>
      {/* Top row */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
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
            <span className="font-bold text-muted-foreground">/ {state.speedLimit}</span>
          )}
        </div>
      </div>

      {/* Scrubber */}
      <div className="relative mb-0.5">
        <input
          type="range"
          min={track.startMs}
          max={track.endMs}
          step={1}
          value={currentMs}
          onChange={handleScrub}
          data-no-drag
          className="block h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          aria-label={t('etit.player.scrubberLabel')}
        />
      </div>

      {/* Time labels */}
      <div className="mb-2 flex justify-between text-[9px] font-bold tabular-nums text-muted-foreground/60 uppercase tracking-tighter">
        <span>{formatCairoClock(track.startMs)}</span>
        <span className="text-muted-foreground">{formatCairo(currentMs, 'datetime')}</span>
        <span>{formatCairoClock(track.endMs)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleRestart}
            title={t('etit.player.restart')}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
            onClick={handleTogglePlay}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ms-0.5" />}
          </Button>
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-muted-foreground/60 font-bold uppercase tracking-tighter hidden sm:inline">
            {t('etit.player.speed')}
          </span>
          <div className="flex rounded-lg border bg-muted/40 p-0.5" role="group" data-no-drag>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-black tabular-nums transition-colors',
                  speed === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active context */}
      <div className="mt-2 min-h-[28px] border-t pt-1.5">
        {currentStop && (
          <div className="flex items-center gap-2 text-[10px]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
              aria-hidden
            />
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
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
              aria-hidden
            />
            <span className="font-bold text-foreground">{currentSensor.typeName}</span>
            <span className="text-muted-foreground">
              {t('etit.player.atTime', {
                time: formatCairo(currentSensor.timestamp, 'time'),
              })}
            </span>
          </div>
        )}
        {!currentStop && !currentSensor && (
          <div className="text-[10px] text-muted-foreground/40 font-medium uppercase tracking-widest italic">
            {t('etit.player.idleSlot')}
          </div>
        )}
      </div>
    </div>
  );
}
