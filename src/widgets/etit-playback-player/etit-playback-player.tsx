import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Square,
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
/*                                                                             */
/* "Real time" would be unwatchable for a typical 8-hour driving day, so the */
/* lowest speed is 1× (real time) up through 256× (a full day in ~2 minutes). */
/* -------------------------------------------------------------------------- */

const SPEEDS = [1, 2, 4, 8, 16, 32, 64, 128, 256] as const;
type Speed = (typeof SPEEDS)[number];

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface EtitPlaybackPlayerProps {
  points: EtitHistoryPoint[];
  stops: EtitStop[];
  sensors: EtitSensorEvent[];
  /**
   * Called every frame with the current interpolated state, or `null` when
   * the track has no playable points. The map widget reads this and moves
   * its playback marker accordingly.
   */
  onStateChange: (state: PlaybackState | null) => void;
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

  /* -------- Track ----------------------------------------------------- */

  const track = React.useMemo<PlaybackTrack>(() => buildPlaybackTrack(points), [points]);
  const playable = track.points.length >= 2;

  /* -------- Playback state -------------------------------------------- */

  const [currentMs, setCurrentMs] = React.useState<number>(track.startMs);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState<Speed>(8);

  // Reset whenever the track changes (vehicle / range swap).
  // We deliberately don't preserve the old position — its index is
  // meaningless against a different track.
  React.useEffect(() => {
    setCurrentMs(track.startMs);
    setPlaying(false);
  }, [track]);

  /* -------- rAF loop --------------------------------------------------- */
  /*
   * We advance `currentMs` by `(deltaWall * speed)` each frame. Wall-clock
   * delta from `performance.now()` ensures playback speed is independent
   * of frame rate — a 60Hz monitor and a 120Hz monitor produce identical
   * playback speed.
   *
   * Refs (`playingRef`, `speedRef`) are used inside the rAF loop so the
   * loop body doesn't capture stale values and we don't have to tear down
   * + restart the loop on every speed change.
   */

  const playingRef = React.useRef(playing);
  const speedRef = React.useRef<number>(speed);
  const currentMsRef = React.useRef(currentMs);

  React.useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  React.useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  React.useEffect(() => {
    currentMsRef.current = currentMs;
  }, [currentMs]);

  React.useEffect(() => {
    if (!playable) return;
    let rafId = 0;
    let lastFrame = performance.now();

    const tick = (now: number) => {
      const dt = now - lastFrame;
      lastFrame = now;

      if (playingRef.current) {
        const next = currentMsRef.current + dt * speedRef.current;
        if (next >= track.endMs) {
          // Reached the end — pause; setPlaying triggers a re-render
          // and the next frame won't advance any further.
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
  }, [playable, track.endMs]);

  /* -------- Derived state to push out --------------------------------- */

  const state = React.useMemo<PlaybackState | null>(
    () => (playable ? stateAtTime(track, currentMs) : null),
    [playable, track, currentMs],
  );

  // Notify the parent on every state change. `onStateChange` is called
  // in an effect (not during render) so the parent's setState can't
  // cause a render cascade.
  const onStateChangeRef = React.useRef(onStateChange);
  React.useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  React.useEffect(() => {
    onStateChangeRef.current(state);
  }, [state]);

  /* -------- Active context -------------------------------------------- */

  const currentStop = React.useMemo(
    () => (state ? activeStop(stops, currentMs) : null),
    [stops, currentMs, state],
  );
  const currentSensor = React.useMemo(
    () => (state ? recentSensor(sensors, currentMs) : null),
    [sensors, currentMs, state],
  );

  /* -------- Handlers --------------------------------------------------- */

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ts = Number(e.target.value);
    if (!Number.isFinite(ts)) return;
    setCurrentMs(ts);
    currentMsRef.current = ts;
  };

  const handleTogglePlay = () => {
    if (!playable) return;
    // If we're at the end, start over from the beginning.
    if (currentMs >= track.endMs && !playing) {
      setCurrentMs(track.startMs);
      currentMsRef.current = track.startMs;
    }
    setPlaying((p) => !p);
  };

  const handleStop = () => {
    setPlaying(false);
    setCurrentMs(track.startMs);
    currentMsRef.current = track.startMs;
  };

  const handleRestart = () => {
    setCurrentMs(track.startMs);
    currentMsRef.current = track.startMs;
  };

  /* -------- Render ----------------------------------------------------- */

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
    <div className={cn('rounded-lg border bg-card p-3', className)}>
      {/* Top row — clock + speed indicator + speeding flag */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-mono text-lg tabular-nums">
          {state ? formatCairoClock(state.timestamp) : '--:--:--'}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Gauge className={cn('h-3.5 w-3.5', state?.speeding ? 'text-destructive' : '')} />
          <span
            className={cn(
              'font-semibold tabular-nums',
              state?.speeding ? 'text-destructive' : 'text-foreground',
            )}
          >
            {state ? Math.round(state.speed) : 0} {t('etit.units.kmh')}
          </span>
          {state && state.speedLimit > 0 && (
            <span className="text-muted-foreground">/ {state.speedLimit}</span>
          )}
          {state?.speeding && (
            <span className="ms-1 inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1 py-0.5 text-[10px] font-semibold text-destructive">
              <AlertTriangle className="h-2.5 w-2.5" />
              {t('etit.player.over')}
            </span>
          )}
        </div>
      </div>

      {/* Scrubber + event ticks */}
      <div className="relative mb-2">
        <input
          type="range"
          min={track.startMs}
          max={track.endMs}
          step={1000}
          value={currentMs}
          onChange={handleScrub}
          className="block h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          aria-label={t('etit.player.scrubberLabel')}
        />
        <Ticks
          stops={stops}
          sensors={sensors}
          startMs={track.startMs}
          endMs={track.endMs}
        />
      </div>

      {/* Time labels */}
      <div className="mb-3 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{formatCairoClock(track.startMs)}</span>
        <span>{formatCairo(currentMs, 'datetime')}</span>
        <span>{formatCairoClock(track.endMs)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRestart}
            title={t('etit.player.restart')}
            aria-label={t('etit.player.restart')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={handleTogglePlay}
            aria-label={playing ? t('etit.player.pause') : t('etit.player.play')}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleStop}
            title={t('etit.player.stop')}
            aria-label={t('etit.player.stop')}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">{t('etit.player.speed')}</span>
          <div className="flex rounded-md border bg-background p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors',
                  speed === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active context — shown only when relevant */}
      {(currentStop || currentSensor) && (
        <div className="mt-3 space-y-1.5 border-t pt-2">
          {currentStop && (
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block h-2 w-2 rounded-full bg-purple-600" aria-hidden />
              <span className="font-medium">
                {t('etit.player.stoppedFor', { duration: currentStop.duration })}
              </span>
              <span className="truncate text-muted-foreground">
                {currentStop.address || t('etit.map.popup.unknownLocation')}
              </span>
            </div>
          )}
          {currentSensor && (
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-600" aria-hidden />
              <span className="font-medium">{currentSensor.typeName}</span>
              <span className="text-muted-foreground">
                {t('etit.player.atTime', {
                  time: formatCairo(currentSensor.timestamp, 'time'),
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ticks — overlay marks on the scrubber for stops and sensor events           */
/*                                                                             */
/* The native `<input type="range">` doesn't let us paint per-position         */
/* indicators, so we layer an absolutely-positioned div above it. Pointer-     */
/* events are disabled so clicks still hit the underlying range input.         */
/* -------------------------------------------------------------------------- */

interface TicksProps {
  stops: EtitStop[];
  sensors: EtitSensorEvent[];
  startMs: number;
  endMs: number;
}

function Ticks({ stops, sensors, startMs, endMs }: TicksProps) {
  const span = endMs - startMs;
  if (span <= 0) return null;

  const pct = (ms: number) => {
    const p = ((ms - startMs) / span) * 100;
    return Math.max(0, Math.min(100, p));
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2">
      {stops.map((s, i) => {
        const left = pct(s.from.getTime());
        const right = pct(s.to.getTime());
        const width = Math.max(0.5, right - left);
        return (
          <span
            key={`stop-${i}`}
            className="absolute top-0 h-2 rounded-sm bg-purple-500/40"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        );
      })}
      {sensors.map((s, i) => (
        <span
          key={`sensor-${i}`}
          className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded-full bg-cyan-600"
          style={{ left: `${pct(s.timestamp.getTime())}%` }}
        />
      ))}
    </div>
  );
}
