import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Flame,
  LocateFixed,
  MapPin,
  MapPinned,
  Pause,
  Play,
  RotateCcw,
  Route,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { legColor, legId } from '../map/layers';
import type { LegSegment } from '../use-history';
import { cn } from '@/shared/lib/cn';
import { indexAt, SPEEDS } from '../playback';
import type { HistoryData } from '../use-history';
import type { RangeSummary } from '../schemas';

/* -------------------------------------------------------------------------- */
/* The time deck — the bottom dock that owns history & replay.                 */
/*                                                                            */
/* Range mode (nothing loaded): day pickers + quick chips + Load.              */
/* Replay mode: transport controls, the scrubber with stop ticks, day strip,   */
/* summary stats, overlay toggles. The cursor renders through a tiny external  */
/* store so 60fps playback re-renders ONLY the readout row.                    */
/* -------------------------------------------------------------------------- */

export interface CursorStore {
  get: () => number;
  set: (v: number) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createCursorStore(initial = 0): CursorStore {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (v) => {
      value = v;
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Cairo',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function fmtSecs(secs: number): string {
  if (secs <= 0) return '0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** The 60fps half: cursor readout + scrubber. Isolated so playback re-renders
 *  only this subtree. */
const fullFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Cairo',
  hour12: false,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** The leg whose [depart, arrive] holds `ms`, if any. */
export function legAt(legs: LegSegment[], ms: number): LegSegment | null {
  for (const seg of legs) {
    if (ms >= seg.leg.depart.getTime() && ms <= seg.leg.arrive.getTime()) return seg;
  }
  return null;
}

function ScrubRow({
  cursor,
  track,
  stops,
  legs,
  onScrub,
}: {
  cursor: CursorStore;
  track: NonNullable<HistoryData['track']>;
  stops: Array<{ from: Date }>;
  /** Shown as colored time bands + the current-leg line (empty = legs off). */
  legs: LegSegment[];
  onScrub: (ms: number) => void;
}) {
  const { t } = useTranslation();
  const startMs = track.startMs;
  const endMs = track.endMs;
  const value = React.useSyncExternalStore(cursor.subscribe, cursor.get);
  const span = Math.max(1, endMs - startMs);
  const pct = Math.min(100, Math.max(0, ((value - startMs) / span) * 100));

  // The full state line: complete Cairo timestamp + the speed at the cursor.
  const idx = indexAt(track.timesMs, value || startMs);
  const speed = track.speeds[idx] ?? 0;
  const limit = track.limits[idx] ?? 0;
  const speeding = limit > 0 && speed > limit;

  const current = legs.length > 0 ? legAt(legs, value || startMs) : null;
  const currentColor = current ? legColor(current) : null;

  return (
    <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3 px-0.5">
      <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] font-semibold tabular-nums">
        {fullFmt.format(new Date(value || startMs))}
        {current && currentColor && (
          <span
            className="flex min-w-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{ borderColor: `rgb(${currentColor.join(' ')} / .5)` }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: `rgb(${currentColor.join(' ')})` }}
            />
            <span className="truncate">
              {current.leg.fromName ?? '—'} → {current.leg.toName ?? '—'}
            </span>
          </span>
        )}
      </span>
      <span
        className={cn(
          'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums',
          speeding ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground',
        )}
      >
        {Math.round(speed)} {t('tracking.kmh', 'km/h')}
        {limit > 0 && <span className="ms-1 font-normal text-muted-foreground">/ {Math.round(limit)}</span>}
      </span>
    </div>
    <div className="flex items-center gap-3">
      <span className="w-[74px] shrink-0 text-end font-mono text-[11px] font-semibold tabular-nums">
        {timeFmt.format(new Date(value || startMs))}
      </span>
      <div className="relative min-w-0 flex-1">
        {/* leg time-bands under everything — the replay timeline's idea */}
        {legs.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full">
            {legs.map((seg) => {
              const a = Math.max(0, ((seg.leg.depart.getTime() - startMs) / span) * 100);
              const b = Math.min(100, ((seg.leg.arrive.getTime() - startMs) / span) * 100);
              if (b <= 0 || a >= 100 || b <= a) return null;
              const [r, g, bl] = legColor(seg);
              return (
                <span
                  key={legId(seg)}
                  className="absolute top-0 h-3"
                  style={{
                    insetInlineStart: `${a}%`,
                    width: `${b - a}%`,
                    background: `rgb(${r} ${g} ${bl} / 0.35)`,
                  }}
                />
              );
            })}
          </div>
        )}
        {/* stop ticks under the range input */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2">
          {stops.map((s, i) => {
            const p = ((s.from.getTime() - startMs) / span) * 100;
            if (p < 0 || p > 100) return null;
            return (
              <span
                key={i}
                className="absolute top-0 h-2 w-[3px] rounded-sm bg-amber-500/80"
                style={{ insetInlineStart: `${p}%` }}
              />
            );
          })}
        </div>
        <input
          type="range"
          min={startMs}
          max={endMs}
          step={1000}
          value={value || startMs}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label="scrub"
          className="relative z-10 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%)`,
          }}
        />
      </div>
      <span className="w-[74px] shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
        {timeFmt.format(new Date(endMs))}
      </span>
    </div>
    </div>
  );
}

export function TimeDeck({
  history,
  summary,
  cursor,
  playing,
  speed,
  follow,
  onToggleFollow,
  showStops,
  showIgnitions,
  showPins,
  onTogglePins,
  showLegs,
  onToggleLegs,
  activeLegId,
  onActivateLeg,
  legWindowLoading,
  onJumpLeg,
  onScrub,
  onPlayPause,
  onRestart,
  onSpeed,
  onToggleStops,
  onToggleIgnitions,
  onExit,
}: {
  history: HistoryData;
  summary: RangeSummary | null;
  cursor: CursorStore;
  playing: boolean;
  speed: number;
  follow: boolean;
  onToggleFollow: () => void;
  showStops: boolean;
  showIgnitions: boolean;
  showPins: boolean;
  onTogglePins: () => void;
  showLegs: boolean;
  onToggleLegs: () => void;
  activeLegId: string | null;
  onActivateLeg: (id: string) => void;
  /** True while an isolated cut leg is still fetching its missing days. */
  legWindowLoading: boolean;
  /** Seek to the previous/next leg's departure. */
  onJumpLeg: (dir: -1 | 1) => void;
  onScrub: (ms: number) => void;
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeed: (s: number) => void;
  onToggleStops: () => void;
  onToggleIgnitions: () => void;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const track = history.track;

  return (
    <div className="pointer-events-auto w-full rounded-t-2xl border border-b-0 bg-card/95 shadow-2xl backdrop-blur md:mx-auto md:max-w-3xl">
      {/* header strip: day progress + stats + exit */}
      <div className="flex items-center gap-3 border-b px-3 py-1.5">
        {history.totalCount > 1 && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 gap-0.5">
              {history.days.map((d) => (
                <span
                  key={d.day}
                  title={d.day}
                  className={cn(
                    'h-1 min-w-1 flex-1 rounded-sm',
                    d.status === 'loaded' && 'bg-success',
                    d.status === 'pending' && 'animate-pulse bg-muted',
                    d.status === 'error' && 'bg-destructive',
                  )}
                />
              ))}
            </div>
            <span className="shrink-0 font-mono text-[9px] text-muted-foreground tabular-nums">
              {history.loadedCount}/{history.totalCount}
            </span>
          </div>
        )}
        {summary && (
          <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {summary.mileageKm.toFixed(1)} {t('tracking.km', 'km')}
            </span>
            <span className="tabular-nums">{fmtSecs(summary.activeSecs)} ▲</span>
            <span className="tabular-nums">{fmtSecs(summary.idleSecs)} ●</span>
            <span className="tabular-nums">
              {summary.stopCount} {t('tracking.stops', 'stops')}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onExit}
          aria-label={t('common.exit', 'Exit')}
          className="ms-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2 px-3 py-2.5">
        {track ? (
          <>
            <ScrubRow
              cursor={cursor}
              track={track}
              stops={showStops ? history.stops : []}
              legs={showLegs ? history.legs : []}
              onScrub={onScrub}
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRestart}
                aria-label={t('tracking.restart', 'Restart')}
                className="grid h-8 w-8 place-items-center rounded-lg border bg-background hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              {showLegs && history.legs.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => onJumpLeg(-1)}
                    aria-label={t('tracking.prevLeg', 'Previous leg')}
                    className="grid h-8 w-8 place-items-center rounded-lg border bg-background hover:bg-muted"
                  >
                    <SkipBack className="h-3.5 w-3.5 rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpLeg(1)}
                    aria-label={t('tracking.nextLeg', 'Next leg')}
                    className="grid h-8 w-8 place-items-center rounded-lg border bg-background hover:bg-muted"
                  >
                    <SkipForward className="h-3.5 w-3.5 rtl:rotate-180" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onPlayPause}
                aria-label={playing ? t('tracking.pause', 'Pause') : t('tracking.play', 'Play')}
                className="grid h-8 w-12 place-items-center rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <div className="flex items-center gap-1 ps-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={speed === s}
                    onClick={() => onSpeed(s)}
                    className={cn(
                      'rounded-md border px-1.5 py-1 font-mono text-[10px] font-semibold tabular-nums',
                      speed === s
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              <div className="ms-auto flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={follow}
                  onClick={onToggleFollow}
                  title={t('tracking.follow', 'Follow the truck')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-lg border',
                    follow
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={showStops}
                  onClick={onToggleStops}
                  title={t('tracking.stops', 'Stops')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-lg border',
                    showStops
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-600'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  <MapPinned className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={showIgnitions}
                  onClick={onToggleIgnitions}
                  title={t('tracking.ignitions', 'Ignitions')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-lg border',
                    showIgnitions
                      ? 'border-muted-foreground/40 bg-muted text-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Flame className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={showPins}
                  onClick={onTogglePins}
                  title={t('tracking.places', 'Places')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-lg border',
                    showPins
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={showLegs}
                  onClick={onToggleLegs}
                  title={t('tracking.legs', 'Legs')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-lg border',
                    showLegs
                      ? 'border-violet-500/50 bg-violet-500/10 text-violet-600'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Route className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {activeLegId && legWindowLoading && (
              <p className="text-center font-mono text-[10px] text-muted-foreground">
                {t('tracking.legLoading', 'Loading the whole leg…')}
              </p>
            )}
            {showLegs && history.legs.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {history.legs.map((seg) => {
                  const id = legId(seg);
                  const [r, g, b] = legColor(seg);
                  const active = activeLegId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onActivateLeg(id)}
                      title={`${seg.leg.fromName ?? '—'} → ${seg.leg.toName ?? '—'}`}
                      className={cn(
                        'flex shrink-0 flex-col items-start gap-0 rounded-lg border px-2 py-1 text-start transition-opacity',
                        active ? 'border-transparent text-white' : 'bg-background hover:bg-muted',
                        activeLegId !== null && !active && 'opacity-40 hover:opacity-100',
                      )}
                      style={active ? { background: `rgb(${r} ${g} ${b})` } : undefined}
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: active ? '#fff' : `rgb(${r} ${g} ${b})` }}
                        />
                        {seg.cutStart && '‹'}
                        <span className={active ? '' : 'text-foreground'}>
                          {seg.leg.fromName ?? '—'} → {seg.leg.toName ?? '—'}
                        </span>
                        {seg.cutEnd && '›'}
                      </span>
                      <span
                        className={cn(
                          'ps-3 font-mono text-[9px] tabular-nums',
                          active ? 'text-white/80' : 'text-muted-foreground',
                        )}
                      >
                        {timeFmt.format(seg.leg.depart).slice(0, 5)}–
                        {timeFmt.format(seg.leg.arrive).slice(0, 5)}
                        {seg.leg.actualKm != null && ` · ${seg.leg.actualKm.toFixed(0)} km`}
                        {seg.leg.distanceRatio != null && seg.leg.distanceRatio > 1.15 && (
                          <span className={active ? '' : 'text-destructive'}>
                            {' '}×{seg.leg.distanceRatio.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : history.isLoading ? (
          <p className="py-1 text-center text-xs text-muted-foreground">
            {t('tracking.loadingDay', 'Loading the first day…')}
          </p>
        ) : history.isError ? (
          <p className="py-1 text-center text-xs text-destructive">
            {t('tracking.historyFailed', 'History failed to load')}
          </p>
        ) : (
          <p className="py-1 text-center text-xs text-muted-foreground">
            {t('tracking.noPoints', 'No GPS points in this range.')}
          </p>
        )}
      </div>
    </div>
  );
}

