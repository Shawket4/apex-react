import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Crosshair,
  FastForward,
  Gauge,
  Moon,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { formatCairoTime } from '@/shared/lib/cairo';
import { PLAYBACK_SPEEDS, type ReplayMode } from '@/pages/trip-replay/replay-engine';

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

/** "1h 24m" / "4m 12s" — dwell badges and the skipped-dwell chip. */
export function formatDurationShort(ms: number): string {
  const secs = Math.round(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

/** "2:41:07" — trip-local elapsed clock. */
export function formatElapsed(ms: number): string {
  const secs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* -------------------------------------------------------------------------- */
/* Props — the page feeds this from a 4Hz-throttled frame snapshot.           */
/* -------------------------------------------------------------------------- */

export interface ReplayHudState {
  elapsedMs: number;
  clockMs: number;
  kmDriven: number;
  kmOptimal: number;
  speedKmh: number;
  speeding: boolean;
  legFrom: string | null;
  legTo: string | null;
  night: boolean;
  skippedDwellMs: number;
  /** Non-null while a compressed dwell pulse is playing. */
  dwellDurationMs: number | null;
  ghostUnavailable: boolean;
  mode: ReplayMode;
  playing: boolean;
  speedX: number;
}

export interface TripReplayHudProps {
  state: ReplayHudState;
  skipStops: boolean;
  followCam: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSpeedChange: (x: number) => void;
  onSkipStopsChange: (on: boolean) => void;
  onFollowCamChange: (on: boolean) => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Component — floating glass card, consistent with the app's card styling.   */
/* -------------------------------------------------------------------------- */

function HudToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors',
        active
          ? 'border-primary/50 bg-primary/10 text-foreground'
          : 'border-border bg-card/60 text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function TripReplayHud({
  state,
  skipStops,
  followCam,
  onTogglePlay,
  onRestart,
  onSpeedChange,
  onSkipStopsChange,
  onFollowCamChange,
  className,
}: TripReplayHudProps) {
  const { t, i18n } = useTranslation();

  return (
    <div
      className={cn(
        'w-64 rounded-xl border bg-card/85 p-3 shadow-xl backdrop-blur-md',
        className,
      )}
    >
      {/* Clock row */}
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-lg font-black tabular-nums" dir="ltr">
          {formatElapsed(state.elapsedMs)}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {state.night && (
            <Moon
              className="h-3.5 w-3.5 text-primary"
              aria-label={t('tripReplay.hud.night', 'Night window')}
            />
          )}
          <span dir="ltr">{formatCairoTime(new Date(state.clockMs), i18n.language)}</span>
        </div>
      </div>

      {/* Numbers */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {t('tripReplay.hud.kmDriven', 'Driven')}
          </div>
          <div className="font-semibold tabular-nums" dir="ltr">
            {state.kmDriven.toFixed(1)}{' '}
            <span className="font-normal text-muted-foreground">
              / {state.kmOptimal.toFixed(1)} {t('tripReplay.hud.kmOptimal', 'km optimal')}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {t('tripReplay.hud.speed', 'Speed')}
          </div>
          <div
            className={cn(
              'flex items-center gap-1 font-semibold tabular-nums',
              state.speeding && 'text-destructive',
            )}
            dir="ltr"
          >
            <Gauge className="h-3 w-3" />
            {Math.round(state.speedKmh)} {t('tripReplay.hud.kmh', 'km/h')}
          </div>
        </div>
      </div>

      {/* Current leg */}
      <div className="mt-1.5 truncate text-[11px] text-muted-foreground" dir="auto">
        {state.legFrom || state.legTo
          ? t('tripReplay.hud.leg', '{{from}} → {{to}}', {
              from: state.legFrom || '—',
              to: state.legTo || '—',
            })
          : t('tripReplay.hud.betweenLegs', 'At a stop between legs')}
      </div>

      {/* Dwell badge / skipped chip / ghost note */}
      {state.dwellDurationMs != null && (
        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
          <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-amber-500" />
          {t('tripReplay.hud.stoppedFor', 'stopped {{duration}}', {
            duration: formatDurationShort(state.dwellDurationMs),
          })}
        </div>
      )}
      {state.skippedDwellMs > 0 && (
        <div className="mt-1.5 text-[10px] font-medium text-muted-foreground">
          {t('tripReplay.hud.skippedTotal', '{{duration}} of stops skipped', {
            duration: formatDurationShort(state.skippedDwellMs),
          })}
        </div>
      )}
      {state.mode === 'race' && state.ghostUnavailable && (
        <div className="mt-1.5 text-[10px] font-medium text-warning">
          {t('tripReplay.hud.noGhost', 'No optimal route for this leg — ghost hidden')}
        </div>
      )}

      {/* Transport controls */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t pt-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onRestart}
            title={t('tripReplay.hud.restart', 'Restart')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 rounded-full shadow-lg shadow-primary/30"
            onClick={onTogglePlay}
            title={
              state.playing
                ? t('tripReplay.hud.pause', 'Pause (Space)')
                : t('tripReplay.hud.play', 'Play (Space)')
            }
          >
            {state.playing ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="ms-0.5 h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Speed selector */}
        <div className="flex rounded-lg border bg-muted/40 p-0.5" role="group" dir="ltr">
          {PLAYBACK_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-black tabular-nums transition-colors',
                state.speedX === s
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <HudToggle
          active={skipStops}
          onClick={() => onSkipStopsChange(!skipStops)}
          icon={<FastForward className="h-3 w-3" />}
          label={t('tripReplay.hud.skipStops', 'Skip stops')}
        />
        <HudToggle
          active={followCam}
          onClick={() => onFollowCamChange(!followCam)}
          icon={<Crosshair className="h-3 w-3" />}
          label={t('tripReplay.hud.followCam', 'Follow')}
        />
      </div>
    </div>
  );
}
