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
import { Skeleton } from '@/shared/ui/skeleton';
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

const localeOf = (lang: string) => (lang.startsWith('ar') ? 'ar-EG' : 'en-GB');

const makeTimeFmt = (locale: string) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'Africa/Cairo',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

function fmtSecs(secs: number, unitH: string, unitM: string): string {
  if (secs <= 0) return `0${unitM}`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}${unitH} ${m}${unitM}` : `${m}${unitM}`;
}

/** The 60fps half: cursor readout + scrubber. Isolated so playback re-renders
 *  only this subtree. */
const makeFullFmt = (locale: string) =>
  new Intl.DateTimeFormat(locale, {
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
  const { t, i18n } = useTranslation();
  const locale = localeOf(i18n.language);
  const timeFmt = React.useMemo(() => makeTimeFmt(locale), [locale]);
  const fullFmt = React.useMemo(() => makeFullFmt(locale), [locale]);
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
            className="flex min-w-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
            style={{ borderColor: `rgb(${currentColor.join(' ')} / .5)` }}
          >
            <span
              aria-hidden="true"
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
          'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
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
                className="absolute top-0 h-2 w-[3px] rounded-sm bg-warning/80"
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
          aria-label={t('tracking.scrub', 'Playback position')}
          dir="ltr"
          className="relative z-10 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-2"
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
  track,
  lockedStops,
  beyondRange,
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
  activeTripId,
  onActivateTrip,
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
  /** The clock's world — the range track, or the active leg's when locked. */
  track: HistoryData['track'];
  /** The locked leg's own stops (null = not locked). */
  lockedStops: Array<{ from: Date }> | null;
  /** The locked leg reached beyond the loaded range — data was fetched. */
  beyondRange: boolean;
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
  activeTripId: number | null;
  onActivateTrip: (tripId: number) => void;
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
  const locked = lockedStops !== null;

  return (
    <div className="pointer-events-auto w-full rounded-t-lg border border-b-0 bg-card/95 shadow-lg backdrop-blur md:mx-auto md:max-w-3xl">
      {/* header strip: day progress + stats + exit */}
      <div className="flex items-center gap-3 border-b bg-muted/60 px-3 py-2">
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
                    d.status === 'pending' && 'animate-pulse bg-muted motion-reduce:animate-none',
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
            <span className="tabular-nums">{fmtSecs(summary.activeSecs, t('tracking.unit.h', 'h'), t('tracking.unit.m', 'm'))} ▲</span>
            <span className="tabular-nums">{fmtSecs(summary.idleSecs, t('tracking.unit.h', 'h'), t('tracking.unit.m', 'm'))} ●</span>
            <span className="tabular-nums">
              {summary.stopCount} {t('tracking.stops', 'stops')}
            </span>
          </div>
        )}
        {beyondRange && (
          <span
            className="shrink-0 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning"
            title={t('tracking.beyondRangeHint', 'This leg extends past the loaded range — its missing days were fetched for the locked view.')}
          >
            ‹ {t('tracking.beyondRange', 'beyond range')} ›
          </span>
        )}
        <button
          type="button"
          onClick={onExit}
          aria-label={t('common.exit', 'Exit')}
          className="ms-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        {track ? (
          <>
            <ScrubRow
              cursor={cursor}
              track={track}
              stops={showStops ? (lockedStops ?? history.stops) : []}
              legs={showLegs && !locked ? history.legs : []}
              onScrub={onScrub}
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRestart}
                aria-label={t('tracking.restart', 'Restart')}
                className="grid h-8 w-8 place-items-center rounded-md border bg-background shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              {showLegs && history.legs.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => onJumpLeg(-1)}
                    aria-label={t('tracking.prevLeg', 'Previous leg')}
                    className="grid h-8 w-8 place-items-center rounded-md border bg-background shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
                  >
                    <SkipBack className="h-3.5 w-3.5 rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpLeg(1)}
                    aria-label={t('tracking.nextLeg', 'Next leg')}
                    className="grid h-8 w-8 place-items-center rounded-md border bg-background shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
                  >
                    <SkipForward className="h-3.5 w-3.5 rtl:rotate-180" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onPlayPause}
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
                    onClick={() => onSpeed(s)}
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

              <div className="ms-auto flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={follow}
                  onClick={onToggleFollow}
                  title={t('tracking.follow', 'Follow the truck')}
                  aria-label={t('tracking.follow', 'Follow the truck')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-md border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
                    follow
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={showStops}
                  onClick={onToggleStops}
                  title={t('tracking.stops', 'Stops')}
                  aria-label={t('tracking.stops', 'Stops')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-md border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
                    showStops
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <MapPinned className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={showIgnitions}
                  onClick={onToggleIgnitions}
                  title={t('tracking.ignitions', 'Ignitions')}
                  aria-label={t('tracking.ignitions', 'Ignitions')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-md border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
                    showIgnitions
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Flame className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={showPins}
                  onClick={onTogglePins}
                  title={t('tracking.places', 'Places')}
                  aria-label={t('tracking.places', 'Places')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-md border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
                    showPins
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={showLegs}
                  onClick={onToggleLegs}
                  title={t('tracking.legs', 'Legs')}
                  aria-label={t('tracking.legs', 'Legs')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-md border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
                    showLegs
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
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
              <LegRail
                legs={history.legs}
                activeLegId={activeLegId}
                activeTripId={activeTripId}
                onActivateLeg={onActivateLeg}
                onActivateTrip={onActivateTrip}
              />
            )}
          </>
        ) : history.isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t('tracking.loadingDay', 'Loading the first day…')}>
            <Skeleton className="h-3.5 w-2/3 rounded-sm" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ) : history.isError ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t('tracking.historyFailed', 'History failed to load')}
          </p>
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t('tracking.noPoints', 'No GPS points in this range.')}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The leg rail — one horizontal strip (touch-scrollable, so it stays mobile  */
/* friendly): a header chip per TRIP, its leg cards revealed on expand. The   */
/* trip chip's play glyph locks the whole trip; a leg card locks that leg.    */
/* -------------------------------------------------------------------------- */

function LegRail({
  legs,
  activeLegId,
  activeTripId,
  onActivateLeg,
  onActivateTrip,
}: {
  legs: LegSegment[];
  activeLegId: string | null;
  activeTripId: number | null;
  onActivateLeg: (id: string) => void;
  onActivateTrip: (tripId: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = localeOf(i18n.language);
  const timeFmt = React.useMemo(() => makeTimeFmt(locale), [locale]);
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());

  const trips = React.useMemo(() => {
    const m2 = new Map<number, LegSegment[]>();
    for (const seg of legs) {
      if (!m2.has(seg.leg.parentTripId)) m2.set(seg.leg.parentTripId, []);
      m2.get(seg.leg.parentTripId)!.push(seg);
    }
    return [...m2.entries()];
  }, [legs]);

  const anyLock = activeLegId !== null || activeTripId !== null;

  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto pb-0.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {trips.map(([tripId, members]) => {
        const [r, g, b] = members[0].color;
        const tripActive = activeTripId === tripId;
        const open = expanded.has(tripId) || tripActive || members.some(
          (m3) => `${m3.leg.parentTripId}:${m3.leg.seq}` === activeLegId,
        );
        const km = members.reduce((s2, m3) => s2 + (m3.leg.actualKm ?? 0), 0);
        const cut = members.some((m3) => m3.cutStart || m3.cutEnd);
        const first = members[0].leg;
        const last = members[members.length - 1].leg;
        return (
          <React.Fragment key={tripId}>
            <div
              className={cn(
                'flex shrink-0 items-center overflow-hidden rounded-lg border transition-opacity',
                tripActive ? '' : 'bg-background',
                anyLock && !tripActive && !open && 'opacity-40',
              )}
              style={
                tripActive
                  ? {
                      background: `rgb(${r} ${g} ${b} / .12)`,
                      borderColor: `rgb(${r} ${g} ${b} / .5)`,
                      color: `rgb(${r} ${g} ${b})`,
                    }
                  : undefined
              }
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(tripId)) next.delete(tripId);
                    else next.add(tripId);
                    return next;
                  })
                }
                className="flex flex-col items-start px-2 py-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
              >
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: `rgb(${r} ${g} ${b})` }}
                  />
                  {cut && '‹'}#{tripId}
                  <span className={tripActive ? 'text-muted-foreground' : 'text-muted-foreground'}>
                    · {members.length} {t('tracking.legsShort', 'legs')}
                  </span>
                  {cut && '›'}
                </span>
                <span
                  className={cn(
                    'ps-3 font-mono text-[9px] tabular-nums',
                    tripActive ? 'text-muted-foreground' : 'text-muted-foreground',
                  )}
                >
                  {first.fromName ?? '—'} → {last.toName ?? '—'}
                  {km > 0 && ` · ${km.toFixed(0)} ${t('tracking.km', 'km')}`}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={tripActive}
                onClick={() => onActivateTrip(tripId)}
                title={t('tracking.lockTrip', 'Lock playback to this trip')}
                aria-label={t('tracking.lockTrip', 'Lock playback to this trip')}
                className={cn(
                  'grid h-full w-7 place-items-center border-s focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-inset',
                  tripActive
                    ? 'border-border/60'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Play className="h-3 w-3" />
              </button>
            </div>
            {open &&
              members.map((seg) => {
                const id = legId(seg);
                const [lr, lg, lb] = seg.color;
                const active = activeLegId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onActivateLeg(id)}
                    title={`${seg.leg.fromName ?? '—'} → ${seg.leg.toName ?? '—'}`}
                    className={cn(
                      'flex shrink-0 flex-col items-start gap-0 rounded-lg border px-2 py-1 text-start transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
                      active ? '' : 'bg-background hover:bg-muted',
                      anyLock && !active && 'opacity-40 hover:opacity-100',
                    )}
                    style={
                      active
                        ? {
                            background: `rgb(${lr} ${lg} ${lb} / .12)`,
                            borderColor: `rgb(${lr} ${lg} ${lb} / .5)`,
                            color: `rgb(${lr} ${lg} ${lb})`,
                          }
                        : undefined
                    }
                  >
                    <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: `rgb(${lr} ${lg} ${lb})` }}
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
                        active ? 'text-muted-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {timeFmt.format(seg.leg.depart).slice(0, 5)}–
                      {timeFmt.format(seg.leg.arrive).slice(0, 5)}
                      {seg.leg.actualKm != null && ` · ${seg.leg.actualKm.toFixed(0)} ${t('tracking.km', 'km')}`}
                    </span>
                  </button>
                );
              })}
          </React.Fragment>
        );
      })}
    </div>
  );
}
