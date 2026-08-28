import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, MapPinned, Pause, Play, RotateCcw, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { SPEEDS } from '../playback';
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
const dayFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Cairo',
  day: 'numeric',
  month: 'short',
});

function fmtSecs(secs: number): string {
  if (secs <= 0) return '0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** The 60fps half: cursor readout + scrubber. Isolated so playback re-renders
 *  only this subtree. */
function ScrubRow({
  cursor,
  startMs,
  endMs,
  stops,
  onScrub,
}: {
  cursor: CursorStore;
  startMs: number;
  endMs: number;
  stops: Array<{ from: Date }>;
  onScrub: (ms: number) => void;
}) {
  const value = React.useSyncExternalStore(cursor.subscribe, cursor.get);
  const span = Math.max(1, endMs - startMs);
  const pct = Math.min(100, Math.max(0, ((value - startMs) / span) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="w-[74px] shrink-0 text-end font-mono text-[11px] font-semibold tabular-nums">
        {timeFmt.format(new Date(value || startMs))}
      </span>
      <div className="relative min-w-0 flex-1">
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
  );
}

export function TimeDeck({
  history,
  summary,
  cursor,
  playing,
  speed,
  showStops,
  showIgnitions,
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
  showStops: boolean;
  showIgnitions: boolean;
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
              startMs={track.startMs}
              endMs={track.endMs}
              stops={showStops ? history.stops : []}
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
              </div>
            </div>
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

/* -------------------------------------------------------------------------- */
/* Range composer — shown before a range is loaded.                            */
/* -------------------------------------------------------------------------- */

export function RangeComposer({
  from,
  to,
  onChange,
  onLoad,
  onIntendLoad,
  onCancel,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  onLoad: () => void;
  onIntendLoad?: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const today = React.useMemo(() => {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
    return p;
  }, []);

  const quick = (days: number) => {
    const end = Date.parse(`${today}T12:00:00Z`);
    const start = new Date(end - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    onChange(start, today);
  };

  return (
    <div className="pointer-events-auto w-full rounded-t-2xl border border-b-0 bg-card/95 p-3 shadow-2xl backdrop-blur md:mx-auto md:max-w-xl">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {[
          [t('tracking.range.today', 'Today'), 1],
          [t('tracking.range.2d', '2 days'), 2],
          [t('tracking.range.7d', '7 days'), 7],
          [t('tracking.range.30d', '30 days'), 30],
        ].map(([label, days]) => (
          <button
            key={label as string}
            type="button"
            onClick={() => quick(days as number)}
            className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
          >
            {label as string}
          </button>
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
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => e.target.value && onChange(e.target.value, to)}
          className="h-9 flex-1 rounded-lg border bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-muted-foreground">→</span>
        <input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => e.target.value && onChange(from, e.target.value)}
          className="h-9 flex-1 rounded-lg border bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={onLoad}
          onPointerEnter={onIntendLoad}
          onFocus={onIntendLoad}
          className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
        >
          {t('tracking.load', 'Load history')}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        {dayFmt.format(new Date(`${from}T12:00:00Z`))} → {dayFmt.format(new Date(`${to}T12:00:00Z`))}
      </p>
    </div>
  );
}
