import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Layers, List, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { parseTrackingUrl, writeTrackingUrl, type TrackingUrl } from './url';
import { useLiveFleet } from './use-live-fleet';
import { cairoDay, trackingKeys } from './api';
import { indexAt } from './playback';
import {
  dayOfMs,
  daysCovering,
  prefetchHistoryDays,
  useHistory,
  useLegWindow,
  useRangeSummary,
} from './use-history';
import { TrackingMap, type TrackingMapHandle } from './map/tracking-map';
import { StatusChips } from './components/status-chips';
import { groupOf } from './components/status-group';
import { FleetPanel } from './components/fleet-panel';
import { VehicleCard } from './components/vehicle-card';
import { TimeDeck } from './components/time-deck';
import { createCursorStore } from './components/time-deck-utils';
import { TrackingRangePicker } from './components/range-picker';
import type { StatusGroup } from './schemas';

/* -------------------------------------------------------------------------- */
/* Mission control. The map IS the page; everything else floats over it.       */
/*                                                                            */
/* State model:                                                                */
/*   URL      — what you're looking at (vehicle, mode, range, cursor).         */
/*   React    — UI chrome (panel open, composer open, play/speed, toggles).    */
/*   Refs     — the 60fps replay clock; it drives the map imperatively and     */
/*              publishes through a tiny store that re-renders one row.        */
/* -------------------------------------------------------------------------- */

const HIDDEN_KEY = 'tracking:hidden';

function loadHidden(): Set<string> {
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export default function TrackingPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<TrackingMapHandle>(null);

  /* ---- URL-owned state ---- */
  const [searchParams, setSearchParams] = useSearchParams();
  const url = React.useMemo(() => parseTrackingUrl(searchParams), [searchParams]);
  const writeUrl = React.useCallback(
    (patch: Partial<TrackingUrl>) => {
      setSearchParams((prev) => writeTrackingUrl({ ...parseTrackingUrl(prev), ...patch }, prev), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  /* ---- data ---- */
  const fleet = useLiveFleet(true);
  // Memoised: this object is a query key and a hook dependency, so a fresh
  // identity each render would refetch the history on every render.
  const historyRange = React.useMemo(
    () =>
      url.mode === 'history' && url.vehicleId && url.from && url.to
        ? { vehicleId: url.vehicleId, from: url.from, to: url.to }
        : null,
    [url.mode, url.vehicleId, url.from, url.to],
  );
  const history = useHistory(historyRange);
  const summaryQuery = useRangeSummary(historyRange);

  /* ---- chrome state ---- */
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [satellite, setSatellite] = React.useState(false);
  const [activeGroup, setActiveGroup] = React.useState<StatusGroup | null>(null);
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(loadHidden);
  const [showStops, setShowStops] = React.useState(true);
  const [showIgnitions, setShowIgnitions] = React.useState(true);
  // Places on by default, Legs off — the brief's call.
  const [showPins, setShowPins] = React.useState(true);
  const [showLegs, setShowLegs] = React.useState(false);
  const [activeLegId, setActiveLegId] = React.useState<string | null>(null);
  const [activeTripId, setActiveTripId] = React.useState<number | null>(null);
  const activeSeg = React.useMemo(
    () =>
      activeLegId
        ? history.legs.find((l) => `${l.leg.parentTripId}:${l.leg.seq}` === activeLegId) ?? null
        : null,
    [activeLegId, history.legs],
  );
  const tripMembers = React.useMemo(
    () =>
      activeTripId !== null
        ? history.legs.filter((l) => l.leg.parentTripId === activeTripId)
        : [],
    [activeTripId, history.legs],
  );
  /** What the clock is locked to: one leg, a whole trip, or nothing. */
  const lockTarget = React.useMemo(() => {
    if (activeSeg) {
      return { legLike: activeSeg.leg, members: [activeSeg] };
    }
    if (tripMembers.length > 0) {
      const first = tripMembers[0].leg;
      const last = tripMembers[tripMembers.length - 1].leg;
      return {
        legLike: { ...first, depart: first.depart, arrive: last.arrive },
        members: tripMembers,
      };
    }
    return null;
  }, [activeSeg, tripMembers]);
  // The isolated leg's COMPLETE window — fetches days beyond the range when
  // the leg is cut; cache-hits otherwise.
  const legWindow = useLegWindow(lockTarget ? url.vehicleId : null, lockTarget?.legLike ?? null);

  // Locked playback: while a leg is active, ITS track is the clock's world —
  // start-to-end is the leg, wherever its days came from.
  const effectiveTrack = lockTarget ? (legWindow?.track ?? null) : history.track;

  /** Days a leg needed beyond the loaded range — the snap-out discard set. */
  const overfetchDays = React.useCallback(
    (span: { depart: Date; arrive: Date }) => {
      if (!historyRange) return [] as string[];
      const rangeDays = new Set(
        daysCovering(historyRange.from.slice(0, 10), historyRange.to.slice(0, 10)),
      );
      return daysCovering(cairoDay(span.depart), cairoDay(span.arrive)).filter(
        (day) => !rangeDays.has(day),
      );
    },
    [historyRange],
  );

  const [playing, setPlaying] = React.useState(false);
  const [follow, setFollow] = React.useState(true);
  const [speed, setSpeed] = React.useState(16);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hiddenIds]));
    } catch {
      /* ignore */
    }
  }, [hiddenIds]);

  const selected = url.vehicleId
    ? fleet.vehicles.find((v) => v.id === url.vehicleId) ?? null
    : null;

  /* ---- replay clock (refs; never re-renders the page) ---- */
  const cursor = React.useMemo(() => createCursorStore(0), []);
  const playingRef = React.useRef(false);
  const speedRef = React.useRef(speed);
  playingRef.current = playing && !!effectiveTrack;
  speedRef.current = speed;
  const seededRef = React.useRef<string | null>(null);

  /** Snap out: back to the full range, over-fetched days evicted. */
  const deactivateLeg = React.useCallback(() => {
    if (lockTarget && url.vehicleId) {
      for (const day of overfetchDays(lockTarget.legLike)) {
        qc.removeQueries({ queryKey: trackingKeys.day(url.vehicleId, day) });
      }
    }
    setActiveLegId(null);
    setActiveTripId(null);
    // Re-seat the clock inside the range if the leg carried it beyond.
    if (history.track) {
      const clamped = Math.min(Math.max(cursor.get(), history.track.startMs), history.track.endMs);
      cursor.set(clamped);
      mapRef.current?.setCursor(clamped);
    }
  }, [lockTarget, url.vehicleId, overfetchDays, qc, history.track, cursor]);

  const evictLockDays = React.useCallback(() => {
    if (lockTarget && url.vehicleId) {
      for (const day of overfetchDays(lockTarget.legLike)) {
        qc.removeQueries({ queryKey: trackingKeys.day(url.vehicleId, day) });
      }
    }
  }, [lockTarget, url.vehicleId, overfetchDays, qc]);

  const activateLeg = React.useCallback(
    (id: string) => {
      if (activeSeg && `${activeSeg.leg.parentTripId}:${activeSeg.leg.seq}` === id) {
        deactivateLeg();
        return;
      }
      evictLockDays();
      setShowLegs(true);
      setActiveTripId(null);
      setActiveLegId(id);
    },
    [activeSeg, deactivateLeg, evictLockDays],
  );

  /** Lock the whole trip: first departure → last arrival. */
  const activateTrip = React.useCallback(
    (tripId: number) => {
      if (activeTripId === tripId) {
        deactivateLeg();
        return;
      }
      evictLockDays();
      setShowLegs(true);
      setActiveLegId(null);
      setActiveTripId(tripId);
    },
    [activeTripId, deactivateLeg, evictLockDays],
  );

  // Seat the cursor when the first day lands: on the URL's t, else at start.
  React.useEffect(() => {
    const key = historyRange
      ? `${historyRange.vehicleId}:${historyRange.from}:${historyRange.to}`
      : null;
    if (!key || !history.track) {
      seededRef.current = null;
      return;
    }
    if (seededRef.current === key) return;
    seededRef.current = key;
    const start =
      url.cursorMs && url.cursorMs >= history.track.startMs && url.cursorMs <= history.track.endMs
        ? url.cursorMs
        : history.track.startMs;
    cursor.set(start);
    setPlaying(false);
    mapRef.current?.setCursor(start);
    mapRef.current?.fitTo(history.trails.flatMap((d) => d.path));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.track, historyRange?.vehicleId, historyRange?.from, historyRange?.to]);

  // The rAF loop. Advances the clock, drives the map. React sees nothing.
  React.useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      if (!playingRef.current || !effectiveTrack) return;
      const next = Math.min(effectiveTrack.endMs, cursor.get() + dt * speedRef.current);
      cursor.set(next);
      mapRef.current?.setCursor(next);
      if (next >= effectiveTrack.endMs) setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [effectiveTrack, cursor]);

  // Cursor day → trail highlight; recompute at day granularity only.
  const [cursorDay, setCursorDay] = React.useState<string | null>(null);
  React.useEffect(
    () =>
      cursor.subscribe(() => {
        const d = dayOfMs(cursor.get());
        setCursorDay((prev) => (prev === d ? prev : d));
      }),
    [cursor],
  );

  // The leg under the cursor — the map bolds it while replaying, so the
  // playback reads leg-by-leg like the trip replay. Manual activation wins.
  const [cursorLegId, setCursorLegId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!showLegs || history.legs.length === 0) {
      setCursorLegId(null);
      return;
    }
    return cursor.subscribe(() => {
      const ms = cursor.get();
      const seg = history.legs.find(
        (l) => ms >= l.leg.depart.getTime() && ms <= l.leg.arrive.getTime(),
      );
      const id = seg ? `${seg.leg.parentTripId}:${seg.leg.seq}` : null;
      setCursorLegId((prev) => (prev === id ? prev : id));
    });
  }, [cursor, showLegs, history.legs]);

  // Static GPU layers follow data + toggles + cursor day.
  React.useEffect(() => {
    mapRef.current?.setHistory(
      historyRange
        ? {
            trails: history.trails,
            track: effectiveTrack,
            stops: history.stops,
            sensors: history.sensors,
            pins: history.pins,
            legs: history.legs,
            showPins,
            showLegs,
            activeLegId: activeLegId ?? cursorLegId,
            isolated:
              lockTarget && legWindow
                ? {
                    paths: lockTarget.members.map((member) => {
                      // Slice the member's span from the LOCK window's track,
                      // so cut legs draw complete.
                      let path = member.path;
                      if (legWindow.track) {
                        const a = member.leg.depart.getTime();
                        const b = member.leg.arrive.getTime();
                        const t2 = legWindow.track;
                        const i0 = indexAt(t2.timesMs, a);
                        const i1 = indexAt(t2.timesMs, b);
                        const start = t2.timesMs[i0] < a ? i0 + 1 : i0;
                        path = t2.path.slice(
                          Math.max(0, start),
                          Math.min(t2.path.length, i1 + 1),
                        );
                      }
                      return {
                        path,
                        color: member.color,
                        dashed: member.leg.legType === 'garage',
                      };
                    }),
                    window: legWindow,
                  }
                : null,
            cursorDay,
            showStops,
            showIgnitions,
          }
        : null,
    );
    if (historyRange && history.track) {
      mapRef.current?.setCursor(cursor.get() || history.track.startMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyRange?.vehicleId, historyRange?.from, historyRange?.to, history, cursorDay, showStops, showIgnitions, showPins, showLegs, activeLegId, cursorLegId, activeSeg, legWindow, effectiveTrack]);

  // Pause → the moment becomes a link (debounced).
  React.useEffect(() => {
    if (playing || !historyRange) return;
    const id = window.setTimeout(() => {
      const v = cursor.get();
      if (v > 0) writeUrl({ cursorMs: v });
    }, 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, historyRange?.vehicleId, historyRange?.from, historyRange?.to]);

  /* ---- live markers ---- */
  const liveHidden = url.mode === 'history';
  React.useEffect(() => {
    mapRef.current?.setLive(
      liveHidden
        ? []
        : fleet.vehicles.map((v) => ({
            vehicle: v,
            live: fleet.live.get(v.id) ?? null,
            selected: v.id === url.vehicleId,
            hidden:
              hiddenIds.has(v.id) ||
              (activeGroup !== null && groupOf(v, fleet.live.get(v.id) ?? null) !== activeGroup),
          })),
    );
  }, [fleet.vehicles, fleet.live, url.vehicleId, hiddenIds, activeGroup, liveHidden]);

  /* ---- actions ---- */
  const focusVehicle = React.useCallback(
    (id: string) => {
      const v = fleet.vehicles.find((x) => x.id === id);
      const lv = fleet.live.get(id);
      const lat = lv?.lat ?? v?.lat;
      const lng = lv?.lng ?? v?.lng;
      if (lat != null && lng != null) mapRef.current?.flyTo(lng, lat, 15);
    },
    [fleet.vehicles, fleet.live],
  );

  const openReplay = React.useCallback(() => {
    setComposerOpen(true);
  }, []);

  // When the isolated leg's complete geometry lands: refit to the whole leg
  // and seat the clock at the leg's start (once per activation).
  const fitKeyRef = React.useRef('');
  const legSeatRef = React.useRef('');
  React.useEffect(() => {
    if (!lockTarget || !legWindow || legWindow.path.length < 2) return;
    const lockId = activeLegId ?? `trip:${activeTripId}`;
    const key = `${lockId}:${legWindow.complete ? 'c' : 'p'}:${legWindow.path.length}`;
    if (fitKeyRef.current !== key) {
      fitKeyRef.current = key;
      mapRef.current?.fitTo(legWindow.path);
    }
    const lockId2 = activeLegId ?? `trip:${activeTripId}`;
    if (legWindow.track && legSeatRef.current !== lockId2) {
      legSeatRef.current = lockId2;
      setPlaying(false);
      cursor.set(legWindow.track.startMs);
      mapRef.current?.setCursor(legWindow.track.startMs);
    }
  }, [lockTarget, legWindow, activeLegId, activeTripId, cursor]);

  const loadRange = React.useCallback(
    (fromWall: string, toWall: string) => {
      setComposerOpen(false);
      setPlaying(false);
      writeUrl({ mode: 'history', from: fromWall, to: toWall, cursorMs: null });
    },
    [writeUrl],
  );

  const exitHistory = React.useCallback(() => {
    deactivateLeg();
    setPlaying(false);
    writeUrl({ mode: 'live', from: null, to: null, cursorMs: null });
  }, [writeUrl, deactivateLeg]);

  const toggleFullscreen = React.useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* unsupported — ignore */
    }
  }, []);
  React.useEffect(() => {
    mapRef.current?.setFollow(follow);
  }, [follow]);

  React.useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const scrub = React.useCallback(
    (ms: number) => {
      const track2 = effectiveTrack;
      const clamped = track2
        ? Math.min(Math.max(ms, track2.startMs), track2.endMs)
        : ms;
      cursor.set(clamped);
      mapRef.current?.setCursor(clamped);
    },
    [cursor, effectiveTrack],
  );

  /* ---- render ---- */
  return (
    <div ref={rootRef} className="relative h-full min-h-0 overflow-hidden bg-background">
      <TrackingMap
        ref={mapRef}
        onSelect={(id) => {
          writeUrl({ vehicleId: id });
          // Auto-dismiss the panel — on a phone it covers the map you just
          // asked to look at.
          setPanelOpen(false);
        }}
        onUserPan={() => setFollow(false)}
        onActivateLeg={activateLeg}
        className="absolute inset-0"
      />

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 p-3">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label={t('tracking.fleet', 'Fleet')}
          aria-expanded={panelOpen}
          className="pointer-events-auto grid h-8 w-8 shrink-0 place-items-center rounded-md border bg-card/90 shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
        >
          <List className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <StatusChips
            vehicles={fleet.vehicles}
            live={fleet.live}
            activeGroup={activeGroup}
            onToggleGroup={setActiveGroup}
          />
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <div
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur',
              fleet.connection === 'live'
                ? 'border-success/40 bg-success/10 text-success'
                : fleet.connection === 'connecting'
                  ? 'border-border bg-muted text-muted-foreground'
                  : 'border-warning/40 bg-warning/10 text-warning',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                fleet.connection === 'live' && 'animate-pulse motion-reduce:animate-none bg-success',
                fleet.connection === 'connecting' && 'animate-pulse motion-reduce:animate-none bg-muted-foreground',
                fleet.connection === 'down' && 'bg-warning',
              )}
            />
            {t(`tracking.conn.${fleet.connection}`, fleet.connection)}
            {fleet.connection === 'down' && (
              <button
                type="button"
                onClick={fleet.refresh}
                aria-label={t('common.refresh', 'Refresh')}
                className="ms-1 grid h-5 w-5 place-items-center rounded-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            aria-pressed={satellite}
            onClick={() =>
              setSatellite((s) => {
                mapRef.current?.setMapType(s ? 'roadmap' : 'hybrid');
                return !s;
              })
            }
            aria-label={t('tracking.mapType', 'Satellite')}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-md border shadow-sm backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
              satellite
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-card/90 hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={t('tracking.fullscreen', 'Fullscreen')}
            aria-pressed={fullscreen}
            className="grid h-8 w-8 place-items-center rounded-md border bg-card/90 shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* fleet panel */}
      <FleetPanel
        open={panelOpen}
        vehicles={fleet.vehicles}
        live={fleet.live}
        selectedId={url.vehicleId}
        hiddenIds={hiddenIds}
        onClose={() => setPanelOpen(false)}
        onSelect={(id) => {
          writeUrl({ vehicleId: id });
          setPanelOpen(false);
          focusVehicle(id);
        }}
        onFocus={(id) => {
          focusVehicle(id);
          setPanelOpen(false);
        }}
        onToggleHidden={(id) =>
          setHiddenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
      />

      {/* selected vehicle card (live mode) */}
      {selected && url.mode === 'live' && !composerOpen && (
        <div className="absolute inset-x-3 bottom-3 z-20 flex justify-center md:inset-x-auto md:bottom-auto md:end-3 md:top-16 md:block">
          <VehicleCard
            vehicle={selected}
            live={fleet.live.get(selected.id) ?? null}
            onFocus={() => focusVehicle(selected.id)}
            onReplay={openReplay}
            onClose={() => writeUrl({ vehicleId: null, mode: 'live', from: null, to: null, cursorMs: null })}
          />
        </div>
      )}

      {/* bottom dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-0 md:px-3">
        {url.mode === 'history' && historyRange ? (
          <TimeDeck
            history={history}
            track={effectiveTrack}
            lockedStops={lockTarget && legWindow ? legWindow.stops : null}
            beyondRange={
              !!lockTarget && lockTarget.members.some((m2) => m2.cutStart || m2.cutEnd)
            }
            activeTripId={activeTripId}
            onActivateTrip={activateTrip}
            summary={summaryQuery.data ?? null}
            cursor={cursor}
            playing={playing}
            speed={speed}
            showStops={showStops}
            showIgnitions={showIgnitions}
            onScrub={scrub}
            onPlayPause={() => setPlaying((p) => !p)}
            onRestart={() => {
              if (history.track) scrub(history.track.startMs);
              setPlaying(false);
            }}
            onSpeed={setSpeed}
            follow={follow}
            onToggleFollow={() => setFollow((f) => !f)}
            onToggleStops={() => setShowStops((v) => !v)}
            onToggleIgnitions={() => setShowIgnitions((v) => !v)}
            showPins={showPins}
            onTogglePins={() => setShowPins((v) => !v)}
            showLegs={showLegs}
            onToggleLegs={() =>
              setShowLegs((v) => {
                if (v) setActiveLegId(null);
                return !v;
              })
            }
            activeLegId={activeLegId}
            legWindowLoading={!!lockTarget && !!legWindow && !legWindow.complete}
            onJumpLeg={(dir) => {
              if (history.legs.length === 0) return;
              if (activeSeg) {
                // Locked: prev/next switches the active leg itself.
                const i = history.legs.findIndex(
                  (l) => `${l.leg.parentTripId}:${l.leg.seq}` === activeLegId,
                );
                const next = history.legs[i + dir];
                if (next) activateLeg(`${next.leg.parentTripId}:${next.leg.seq}`);
                return;
              }
              if (activeTripId !== null) {
                const trips = [...new Set(history.legs.map((l) => l.leg.parentTripId))];
                const i = trips.indexOf(activeTripId);
                const next = trips[i + dir];
                if (next !== undefined) activateTrip(next);
                return;
              }
              const now = cursor.get();
              const starts = history.legs.map((l) => l.leg.depart.getTime());
              const target =
                dir === 1
                  ? starts.find((s2) => s2 > now + 1000)
                  : [...starts].reverse().find((s2) => s2 < now - 1000);
              if (target !== undefined) scrub(target);
            }}
            onActivateLeg={activateLeg}
            onExit={exitHistory}
          />
        ) : composerOpen && selected ? (
          <TrackingRangePicker
            initialFrom={url.from}
            initialTo={url.to}
            onLoad={loadRange}
            onIntendLoad={(f, to2) => prefetchHistoryDays(qc, selected.id, f, to2)}
            onCancel={() => setComposerOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
