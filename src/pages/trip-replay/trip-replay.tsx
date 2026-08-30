import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Layers, ArrowLeft, Loader2, TriangleAlert } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatNumber } from '@/shared/lib/format';
import { formatCairoDay, formatCairoTime } from '@/shared/lib/cairo';
import { useTripMatchReplay } from '@/entities/trip-audit/queries';
import {
  TripReplayMap,
  type ReplayScene,
  type TripReplayMapHandle,
} from '@/widgets/trip-replay-map';
import {
  TripReplayTimeline,
  type TripReplayTimelineHandle,
} from '@/widgets/trip-replay-timeline';
import { TripReplayHud, type ReplayHudState } from '@/widgets/trip-replay-hud';
import { TripReplayLegRail } from '@/widgets/trip-replay-leg-rail';
import { useTripPlaybackHistory } from './use-trip-playback-history';
import {
  actualStateAt,
  buildReplayModel,
  kmDrivenAt,
  legColor,
  OSRM_COLOR,
  TRUCK_COLOR,
  TRUCK_SPEEDING_COLOR,
  type ReplayEventPin,
  type ReplayModel,
} from './replay-model';
import { ReplayEngine, type ReplayFrame, type ReplayMode } from './replay-engine';

/* -------------------------------------------------------------------------- */
/* Trip Replay — full-screen takeover at /trip-audit/:id/replay.               */
/*                                                                             */
/* Performance contract: the ReplayEngine drives a single rAF loop; map       */
/* markers and the timeline playhead update imperatively through refs. HUD    */
/* numbers are the only per-playback React state, throttled to ~4Hz.          */
/* -------------------------------------------------------------------------- */

const HUD_INTERVAL_MS = 250; // 4Hz

const GHOST_VISIBLE_COLOR = '#16a34a';

/* ---- Speed-gradient coloring of the actual trace ------------------------- */
/* Amber (stopped/slow) → teal (flowing). The GPS trace is bucketed by speed  */
/* and consecutive same-bucket fixes merge into one polyline, so the map      */
/* holds a few dozen static polylines rather than one per fix.                */

const SPEED_SLOW_COLOR: [number, number, number] = [245, 158, 11]; // amber-500
const SPEED_FAST_COLOR: [number, number, number] = [20, 184, 166]; // teal-500
const SPEED_FULL_KMH = 60; // at/above this the trace is fully teal
const SPEED_BUCKETS = 6;

const SPEED_BUCKET_COLORS: string[] = Array.from({ length: SPEED_BUCKETS }, (_, i) => {
  const t = i / Math.max(1, SPEED_BUCKETS - 1);
  const c = SPEED_SLOW_COLOR.map((a, ch) =>
    Math.round(a + (SPEED_FAST_COLOR[ch] - a) * t),
  );
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
});

function speedBucket(kmh: number): number {
  const t = Math.min(1, Math.max(0, kmh / SPEED_FULL_KMH));
  return Math.min(SPEED_BUCKETS - 1, Math.floor(t * SPEED_BUCKETS));
}

function buildSpeedGradientPolylines(model: ReplayModel): ReplayScene['polylines'] {
  const pts = model.track.points;
  const out: ReplayScene['polylines'] = [];
  if (pts.length < 2) return out;
  let runStart = 0;
  // Bucket of segment i→i+1 is the speed at its start fix.
  let runBucket = speedBucket(pts[0].speed);
  const flush = (endIdx: number) => {
    if (endIdx <= runStart) return;
    out.push({
      id: `speed-${out.length}`,
      path: pts.slice(runStart, endIdx + 1).map((p) => [p.lat, p.lng]),
      color: SPEED_BUCKET_COLORS[runBucket],
      weight: 4,
      opacity: 0.9,
    });
  };
  for (let i = 1; i < pts.length - 1; i++) {
    const b = speedBucket(pts[i].speed);
    if (b !== runBucket) {
      flush(i); // include point i so consecutive runs share a vertex
      runStart = i;
      runBucket = b;
    }
  }
  flush(pts.length - 1);
  return out;
}

function buildScene(model: ReplayModel): ReplayScene {
  const polylines: ReplayScene['polylines'] = [];
  const pins: ReplayScene['pins'] = [];
  const bounds: Array<[number, number]> = [];

  // Actual driven route: speed-gradient GPS trace when the track is usable,
  // otherwise the stored leg geometries colored by leg type (degraded mode).
  if (model.playable) {
    const gradient = buildSpeedGradientPolylines(model);
    polylines.push(...gradient);
    for (const seg of gradient) bounds.push(...seg.path);
  }

  for (const leg of model.legs) {
    if (leg.actualPath.length > 1) {
      if (!model.playable) {
        polylines.push({
          id: `leg-${leg.id}-actual`,
          path: leg.actualPath,
          color: legColor(leg.legType),
          weight: 4,
          opacity: 0.85,
        });
      }
      bounds.push(...leg.actualPath);
    }
    if (leg.osrmPath.length > 1) {
      polylines.push({
        id: `leg-${leg.id}-osrm`,
        path: leg.osrmPath,
        color: OSRM_COLOR,
        weight: 3,
        opacity: 0.8,
        dashed: true,
      });
      bounds.push(...leg.osrmPath);
    }
  }

  // Route start marker.
  const first = model.legs.find((l) => l.actualPath.length > 0 || l.osrmPath.length > 0);
  if (first) {
    const path = first.actualPath.length > 0 ? first.actualPath : first.osrmPath;
    pins.push({
      id: 'route-start',
      lat: path[0][0],
      lng: path[0][1],
      color: '#16a34a',
      kind: 'route-start',
      title: first.fromName || undefined,
    });
  }

  // Event pins with coordinates (delivery arrivals + stops/flags).
  for (const pin of model.pins) {
    if (pin.lat == null || pin.lng == null) continue;
    pins.push({
      id: pin.id,
      lat: pin.lat,
      lng: pin.lng,
      color: pin.color,
      kind: pin.kind === 'stop' ? 'stop' : 'pin',
      title: pin.label || undefined,
    });
  }

  return { polylines, pins, bounds };
}

function hudStateFromFrame(frame: ReplayFrame, model: ReplayModel): ReplayHudState {
  const leg = model.timedLegs[frame.hudLegIndex] ?? null;
  return {
    elapsedMs: frame.tMs - model.startMs,
    clockMs: frame.tMs,
    kmDriven: frame.kmDriven,
    kmOptimal: frame.kmOptimal,
    speedKmh: frame.truck?.speed ?? 0,
    speeding: frame.truck?.speeding ?? false,
    legFrom: leg?.fromName ?? null,
    legTo: leg?.toName ?? null,
    night: frame.night,
    skippedDwellMs: frame.skippedDwellMs,
    dwellDurationMs: frame.dwell?.durationMs ?? null,
    ghostUnavailable: frame.ghostUnavailable,
    mode: frame.mode,
    playing: frame.playing,
    speedX: frame.speedX,
  };
}

/* -------------------------------------------------------------------------- */
/* Mode control                                                                */
/* -------------------------------------------------------------------------- */

function ModeControl({
  mode,
  onChange,
  disabled,
}: {
  mode: ReplayMode;
  onChange: (m: ReplayMode) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const modes: Array<{ id: ReplayMode; label: string }> = [
    { id: 'actual', label: t('tripReplay.modes.actual', 'Actual') },
    { id: 'optimal', label: t('tripReplay.modes.optimal', 'Optimal') },
    { id: 'race', label: t('tripReplay.modes.race', 'Race') },
  ];
  return (
    <div
      className={cn('flex rounded-lg border bg-muted/40 p-0.5', disabled && 'opacity-50')}
      role="group"
    >
      {modes.map((m) => (
        <button
          key={m.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(m.id)}
          aria-pressed={mode === m.id}
          className={cn(
            'relative cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition-colors',
            'after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[""]', // taller hit
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed',
            mode === m.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function TripReplayPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const matchId = React.useMemo(() => {
    const n = Number(params.id);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [params.id]);

  const { data: detail, isLoading, isError } = useTripMatchReplay(matchId);
  const history = useTripPlaybackHistory(detail ?? null, detail != null);

  /* ---- Redirects ------------------------------------------------------- */

  const redirected = React.useRef(false);
  React.useEffect(() => {
    if (redirected.current) return;
    if (matchId == null || (isError && !isLoading)) {
      redirected.current = true;
      toast.error(t('tripReplay.toast.loadError', 'Could not load this trip.'));
      navigate('/trip-audit', { replace: true });
      return;
    }
    if (detail && detail.status === 'unmatched') {
      redirected.current = true;
      toast.info(
        t('tripReplay.toast.unmatched', 'This trip was not matched — replay is unavailable.'),
      );
      navigate('/trip-audit', { replace: true });
    }
  }, [matchId, isError, isLoading, detail, navigate, t]);

  /* ---- Model + scene (decoded once, memoized) --------------------------- */

  const model = React.useMemo(
    () => (detail && detail.status !== 'unmatched' ? buildReplayModel(detail, history.points) : null),
    [detail, history.points],
  );
  const scene = React.useMemo(() => (model ? buildScene(model) : null), [model]);

  const playable = model != null && model.playable && model.timedLegs.length > 0;
  const degraded = model != null && !history.loading && !playable;

  /* ---- Refs + engine ---------------------------------------------------- */

  const mapRef = React.useRef<TripReplayMapHandle>(null);
  const [satellite, setSatellite] = React.useState(false);
  const timelineRef = React.useRef<TripReplayTimelineHandle>(null);
  const engineRef = React.useRef<ReplayEngine | null>(null);

  const [mode, setModeState] = React.useState<ReplayMode>('actual');
  const [skipStops, setSkipStopsState] = React.useState(true);
  const [followCam, setFollowCam] = React.useState(true);
  const followCamRef = React.useRef(followCam);
  React.useEffect(() => {
    followCamRef.current = followCam;
  }, [followCam]);

  const [hud, setHud] = React.useState<ReplayHudState | null>(null);
  const [activeLegIndex, setActiveLegIndex] = React.useState(-1);
  const lastHudAt = React.useRef(0);

  React.useEffect(() => {
    if (!model || !playable) {
      engineRef.current = null;
      setHud(null);
      return;
    }
    const engine = new ReplayEngine(model);
    engineRef.current = engine;
    engine.skipStops = true;
    setModeState('actual');
    setSkipStopsState(true);

    engine.onDwellEnter = (d) => mapRef.current?.pulse(d.lat, d.lng);

    const unsubscribe = engine.subscribe((frame) => {
      const map = mapRef.current;
      // Imperative per-frame updates — never React state.
      if (map) {
        if (frame.truck) {
          map.moveMarker('truck', frame.truck.lat, frame.truck.lng);
          map.setMarkerColor(
            'truck',
            frame.truck.speeding ? TRUCK_SPEEDING_COLOR : TRUCK_COLOR,
          );
        } else {
          map.setMarkerVisible('truck', false);
        }
        if (frame.ghost) {
          map.moveMarker('ghost', frame.ghost.lat, frame.ghost.lng);
          map.setMarkerColor('ghost', GHOST_VISIBLE_COLOR);
        } else {
          map.setMarkerVisible('ghost', false);
        }
        if (followCamRef.current && frame.truck && frame.playing) {
          map.follow(frame.truck.lat, frame.truck.lng);
        }
      }
      timelineRef.current?.setPlayhead(frame.tMs);

      // Throttled (~4Hz) HUD/React updates.
      const now = performance.now();
      if (!frame.playing || now - lastHudAt.current >= HUD_INTERVAL_MS) {
        lastHudAt.current = now;
        setHud(hudStateFromFrame(frame, model));
        setActiveLegIndex(frame.hudLegIndex);
      }
    });

    engine.emitCurrent();
    return () => {
      unsubscribe();
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [model, playable]);

  const handleMapReady = React.useCallback(() => {
    engineRef.current?.emitCurrent();
  }, []);

  /* ---- Control handlers ------------------------------------------------- */

  const setMode = React.useCallback((m: ReplayMode) => {
    setModeState(m);
    engineRef.current?.setMode(m);
  }, []);

  const setSkipStops = React.useCallback((on: boolean) => {
    setSkipStopsState(on);
    engineRef.current?.setSkipStops(on);
  }, []);

  const handleScrub = React.useCallback((ms: number) => {
    engineRef.current?.seek(ms);
  }, []);

  const handleHover = React.useCallback(
    (ms: number | null) => {
      const map = mapRef.current;
      if (!model || !map) return;
      if (ms == null) {
        // Pointer left the band — restore the locked frame.
        engineRef.current?.emitCurrent();
        return;
      }
      const s = actualStateAt(model, ms);
      if (s) map.moveMarker('truck', s.lat, s.lng); // ghost-follow the cursor
    },
    [model],
  );

  const getPreview = React.useCallback(
    (ms: number) => {
      const speed = model ? (actualStateAt(model, ms)?.speed ?? 0) : 0;
      const km = model ? kmDrivenAt(model, ms) : 0;
      return {
        timeLabel: formatCairoTime(new Date(ms), i18n.language),
        speedLabel: `${formatNumber(speed, 0)} ${t('tripReplay.hud.kmh', 'km/h')}`,
        kmLabel: `${formatNumber(km, 1)} ${t('tripReplay.legRail.km', 'km')}`,
      };
    },
    [model, i18n.language, t],
  );

  const fitLeg = React.useCallback(
    (index: number) => {
      const leg = model?.timedLegs[index];
      if (!leg) return;
      const path = leg.actualPath.length > 1 ? leg.actualPath : leg.osrmPath;
      if (path.length > 0) mapRef.current?.fitPoints(path);
    },
    [model],
  );

  const handleLegClick = React.useCallback(
    (index: number) => {
      fitLeg(index);
      engineRef.current?.seekLeg(index);
    },
    [fitLeg],
  );

  const handleLoopLeg = React.useCallback(
    (index: number) => {
      fitLeg(index);
      engineRef.current?.loopLeg(index);
    },
    [fitLeg],
  );

  const handlePinClick = React.useCallback(
    (pin: ReplayEventPin) => {
      engineRef.current?.seek(pin.ms);
      if (pin.lat != null && pin.lng != null) {
        mapRef.current?.pulse(pin.lat, pin.lng, pin.color);
        mapRef.current?.follow(pin.lat, pin.lng);
      }
    },
    [],
  );

  const handleMapPinClick = React.useCallback(
    (pinId: string) => {
      const pin = model?.pins.find((p) => p.id === pinId);
      if (pin) handlePinClick(pin);
    },
    [model, handlePinClick],
  );

  const goBack = React.useCallback(() => navigate('/trip-audit'), [navigate]);

  /* ---- Keyboard --------------------------------------------------------- */

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const engine = engineRef.current;
      if (e.key === 'Escape') {
        goBack();
        return;
      }
      if (!engine) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        engine.toggle();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        engine.seekNextLeg();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        engine.seekPrevLeg();
      } else if (e.key === '+' || e.key === '=') {
        engine.stepSpeed(1);
      } else if (e.key === '-' || e.key === '_') {
        engine.stepSpeed(-1);
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (model && idx < model.timedLegs.length) {
          fitLeg(idx);
          engine.seekLeg(idx);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [model, fitLeg, goBack]);

  /* ---- Render ----------------------------------------------------------- */

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <header className="safe-top flex flex-wrap items-center gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t('tripReplay.back', 'Back to audit')}
        </Button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h1 className="text-sm font-semibold">{t('tripReplay.title', 'Trip replay')}</h1>
          {detail && (
            <>
              <span className="text-sm text-muted-foreground">
                {formatCairoDay(detail.day_local, i18n.language)}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums" dir="ltr">
                {detail.car_no_plate || <span className="opacity-40">—</span>}
              </span>
              {detail.driver_name && (
                <span className="truncate text-sm text-muted-foreground" dir="auto">
                  {detail.driver_name}
                </span>
              )}
            </>
          )}
          {degraded && (
            <Badge variant="warning" className="gap-1">
              <TriangleAlert className="h-3 w-3" aria-hidden="true" />
              {t(
                'tripReplay.banner.unavailable',
                'Replay unavailable — showing route only',
              )}
            </Badge>
          )}
          {history.loading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {t('tripReplay.loadingTrace', 'Loading GPS trace…')}
            </span>
          )}
        </div>

        <ModeControl mode={mode} onChange={setMode} disabled={!playable} />
      </header>

      {/* Map + overlays */}
      <div className="relative flex-1 overflow-hidden">
        {isLoading || !detail ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : (
          <>
            <TripReplayMap
              ref={mapRef}
              scene={scene}
              onPinClick={handleMapPinClick}
              onReady={handleMapReady}
              className="absolute inset-0"
            />

            {/* Basemap toggle — streets ↔ satellite, same control as the
                other maps. */}
            <button
              type="button"
              aria-pressed={satellite}
              onClick={() =>
                setSatellite((v) => {
                  mapRef.current?.setMapType(v ? 'roadmap' : 'hybrid');
                  return !v;
                })
              }
              aria-label={t('tracking.mapType', 'Satellite')}
              className={cn(
                'absolute bottom-3 end-3 z-20 grid h-9 w-9 place-items-center rounded-full border shadow-sm backdrop-blur',
                satellite ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-card',
              )}
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Floating overlays — SIBLINGS of the map container, never inside
                it. The wrapper is pointer-events-none so only the panels
                themselves (each pointer-events-auto + stopPropagation guards)
                catch input; everywhere else gestures fall through to the map. */}
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-between gap-3 p-3">
              {model && model.timedLegs.length > 0 ? (
                <TripReplayLegRail
                  model={model}
                  activeIndex={activeLegIndex}
                  disabled={!playable}
                  onLegClick={handleLegClick}
                  onLoopLeg={handleLoopLeg}
                  className="max-h-[calc(100%-0.5rem)]"
                />
              ) : (
                <div />
              )}

              {playable && hud && (
                <TripReplayHud
                  state={hud}
                  skipStops={skipStops}
                  followCam={followCam}
                  onTogglePlay={() => engineRef.current?.toggle()}
                  onRestart={() => engineRef.current?.seek(model!.startMs)}
                  onSpeedChange={(x) => engineRef.current?.setSpeed(x)}
                  onSkipStopsChange={setSkipStops}
                  onFollowCamChange={setFollowCam}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Timeline band — the spine */}
      {model && model.timedLegs.length > 0 && (
        <div className="safe-bottom border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TripReplayTimeline
            ref={timelineRef}
            model={model}
            disabled={!playable}
            onScrub={handleScrub}
            onHover={handleHover}
            onLegClick={handleLegClick}
            onPinClick={handlePinClick}
            getPreview={getPreview}
          />
        </div>
      )}
    </div>
  );
}
