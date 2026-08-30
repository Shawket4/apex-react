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
import { formatNumber } from '@/shared/lib/format';
import { formatCairoTime } from '@/shared/lib/cairo';
import { PLAYBACK_SPEEDS, type ReplayMode } from '@/pages/trip-replay/replay-engine';

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

/** Translated unit letters for {@link formatDurationShort}. */
export interface DurationUnits {
  h: string;
  m: string;
  s: string;
}

const DEFAULT_DURATION_UNITS: DurationUnits = { h: 'h', m: 'm', s: 's' };

/** "1h 24m" / "4m 12s" — dwell badges and the skipped-dwell chip. */
export function formatDurationShort(ms: number, units?: DurationUnits): string {
  const u = units ?? DEFAULT_DURATION_UNITS;
  const secs = Math.round(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}${u.h} ${m}${u.m}`;
  if (m > 0) return s > 0 ? `${m}${u.m} ${s}${u.s}` : `${m}${u.m}`;
  return `${s}${u.s}`;
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
        'relative flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors',
        'after:absolute after:inset-x-0 after:-inset-y-2 after:content-[""]', // ~40px hit
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
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

  const durationUnits: DurationUnits = {
    h: t('tripReplay.hud.unitHour', 'h'),
    m: t('tripReplay.hud.unitMinute', 'm'),
    s: t('tripReplay.hud.unitSecond', 's'),
  };

  return (
    // pointer-events-auto: the page's overlay wrapper is pointer-events-none,
    // so the card must re-enable input for itself. The stop-propagation guards
    // make sure no gesture that starts on the HUD ever reaches the map.
    <div
      className={cn(
        'pointer-events-auto w-64 rounded-lg border bg-card p-3 shadow-lg backdrop-blur-md',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Clock row */}
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-lg font-semibold tabular-nums" dir="ltr">
          {formatElapsed(state.elapsedMs)}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {state.night && (
            <>
              <Moon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="sr-only">{t('tripReplay.hud.night', 'Night window')}</span>
            </>
          )}
          <span dir="ltr">{formatCairoTime(new Date(state.clockMs), i18n.language)}</span>
        </div>
      </div>

      {/* Numbers */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('tripReplay.hud.kmDriven', 'Driven')}
          </div>
          <div className="font-semibold tabular-nums" dir="ltr">
            {formatNumber(state.kmDriven, 1)}{' '}
            <span className="font-normal text-muted-foreground">
              / {formatNumber(state.kmOptimal, 1)} {t('tripReplay.hud.kmOptimal', 'km optimal')}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('tripReplay.hud.speed', 'Speed')}
          </div>
          <div
            className={cn(
              'flex items-center gap-1 font-semibold tabular-nums',
              state.speeding && 'text-destructive',
            )}
            dir="ltr"
          >
            <Gauge className="h-3 w-3" aria-hidden="true" />
            {formatNumber(state.speedKmh, 0)} {t('tripReplay.hud.kmh', 'km/h')}
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
        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
          <span
            className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-warning motion-reduce:animate-none"
            aria-hidden="true"
          />
          {t('tripReplay.hud.stoppedFor', 'stopped {{duration}}', {
            duration: formatDurationShort(state.dwellDurationMs, durationUnits),
          })}
        </div>
      )}
      {state.skippedDwellMs > 0 && (
        <div className="mt-1.5 text-[10px] font-medium text-muted-foreground">
          {t('tripReplay.hud.skippedTotal', '{{duration}} of stops skipped', {
            duration: formatDurationShort(state.skippedDwellMs, durationUnits),
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
            className="relative h-7 w-7 text-muted-foreground after:absolute after:-inset-1.5 after:content-[''] hover:text-foreground"
            onClick={onRestart}
            title={t('tripReplay.hud.restart', 'Restart')}
            aria-label={t('tripReplay.hud.restart', 'Restart')}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="relative h-8 w-8 rounded-full shadow-sm after:absolute after:-inset-1 after:content-['']"
            onClick={onTogglePlay}
            title={
              state.playing
                ? t('tripReplay.hud.pause', 'Pause (Space)')
                : t('tripReplay.hud.play', 'Play (Space)')
            }
            aria-label={
              state.playing
                ? t('tripReplay.hud.pause', 'Pause (Space)')
                : t('tripReplay.hud.play', 'Play (Space)')
            }
          >
            {state.playing ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="ms-0.5 h-3.5 w-3.5" aria-hidden="true" />
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
              aria-pressed={state.speedX === s}
              aria-label={t('tripReplay.hud.speedAria', 'Playback speed {{x}}×', { x: s })}
              className={cn(
                'relative cursor-pointer rounded px-1.5 py-1 text-[10px] font-semibold tabular-nums transition-colors',
                // Segmented control: extend the hit area vertically to ~40px;
                // horizontally each button owns its own slice.
                'after:absolute after:inset-x-0 after:-inset-y-2 after:content-[""]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
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
          icon={<FastForward className="h-3 w-3" aria-hidden="true" />}
          label={t('tripReplay.hud.skipStops', 'Skip stops')}
        />
        <HudToggle
          active={followCam}
          onClick={() => onFollowCamChange(!followCam)}
          icon={<Crosshair className="h-3 w-3" aria-hidden="true" />}
          label={t('tripReplay.hud.followCam', 'Follow')}
        />
      </div>
    </div>
  );
}
