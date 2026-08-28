import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Maximize2,
  Menu,
  Minimize2,
  Radar,
  X,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import { EmptyState } from '@/shared/ui/empty-state';
import { useIsDesktop } from '@/shared/hooks/use-media-query';
import { extractErrorMessage } from '@/shared/api/errors';
import { cn } from '@/shared/lib/cn';
import { type PlaybackState } from '@/entities/etit-vehicle/playback';
import { defaultCairoTodayRange, formatCairoDate } from '@/entities/etit-vehicle/cairo';
import { useEtitFleet, useEtitTripSummary } from '@/entities/etit-vehicle/queries';
import { useSearchParams } from 'react-router-dom';
import { parseEtitUrl, serializeEtitUrl, type EtitUrlState } from './etit-url';
import { useEtitHistoryDays } from '@/entities/etit-vehicle/history-days';
import { EtitMap } from '@/widgets/etit-map/etit-map';
import { EtitVehicleList } from '@/widgets/etit-vehicle-list/etit-vehicle-list';
import { EtitVehicleHistorySelector } from '@/widgets/etit-vehicle-history-selector/etit-vehicle-history-selector';
import { EtitFloatingStats } from '@/widgets/etit-history-controls/etit-floating-stats';
import { EtitPlaybackPlayer } from '@/widgets/etit-playback-player/etit-playback-player';
import { Draggable } from '@/shared/ui/draggable';

/* -------------------------------------------------------------------------- */
/* Persistence                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_VISIBLE_IDS = 'etit_visible_ids';
const STORAGE_LEFT_WIDTH = 'etit_left_width';
const STORAGE_LEFT_COLLAPSED = 'etit_left_collapsed';

function loadVisibleIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_VISIBLE_IDS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function loadLeftWidth(fallback: number): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_LEFT_WIDTH);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 260 && n <= 500) return n;
  } catch {
    /* ignore */
  }
  return fallback;
}

function loadLeftCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_LEFT_COLLAPSED) === '1';
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Mobile bottom-tab button                                                    */
/* -------------------------------------------------------------------------- */

type MobileTab = 'controls' | 'playback';

function MobileTabButton({
  active,
  onClick,
  label,
  icon: Icon,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'flex-1 flex-col gap-1 h-14 rounded-none transition-all',
        active
          ? 'text-primary border-t-2 border-primary bg-primary/5'
          : 'text-muted-foreground opacity-60',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className={cn('h-5 w-5', active && 'scale-110 transition-transform')} />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export function EtitPage() {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [mobileListOpen, setMobileListOpen] = React.useState(false);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<MobileTab>('controls');

  /* ---- Server data ---- */
  const fleetQuery = useEtitFleet();
  const vehicles = fleetQuery.fleet;
  const liveStatuses = fleetQuery.liveStatuses;

  /* ---- Visibility ---- */
  const [visibleIds, setVisibleIds] = React.useState<Set<string>>(() => loadVisibleIds());
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_VISIBLE_IDS, JSON.stringify([...visibleIds]));
    } catch {
      /* ignore */
    }
  }, [visibleIds]);

  const toggleVisible = React.useCallback((id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setAllVisible = React.useCallback((ids: string[]) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const clearVisible = React.useCallback(() => {
    setVisibleIds(new Set());
  }, []);

  /* ---- Selection & mode live in the URL — shareable, refresh-proof ---- */
  const [searchParams, setSearchParams] = useSearchParams();
  const urlState = React.useMemo(() => parseEtitUrl(searchParams), [searchParams]);
  const activeId = urlState.vehicleId;

  const writeUrl = React.useCallback(
    (patch: Partial<EtitUrlState>) => {
      setSearchParams(
        (prev) => serializeEtitUrl({ ...parseEtitUrl(prev), ...patch }, prev),
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const setActiveId = React.useCallback(
    (id: string | null) => {
      // Deselecting also leaves history mode — a range without a truck is
      // not a representable view.
      writeUrl(id === null ? { vehicleId: null, mode: 'live', from: null, to: null, cursorMs: null } : { vehicleId: id });
    },
    [writeUrl],
  );
  const [focusBump, setFocusBump] = React.useState(0);
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [leftCollapsed, setLeftCollapsed] = React.useState(() => loadLeftCollapsed());
  const [leftWidth, setLeftWidth] = React.useState(() => loadLeftWidth(320));

  // Smaller laptops: collapse on first paint, but only the first time —
  // never override a user choice once they've toggled it.
  const initialCollapseAppliedRef = React.useRef(false);
  React.useLayoutEffect(() => {
    if (initialCollapseAppliedRef.current) return;
    initialCollapseAppliedRef.current = true;
    if (typeof window !== 'undefined' && window.innerWidth < 1280 && !loadLeftCollapsed()) {
      setLeftCollapsed(true);
    }
  }, []);

  // Persist collapse state.
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_LEFT_COLLAPSED, leftCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [leftCollapsed]);

  // Persist resized width.
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_LEFT_WIDTH, String(leftWidth));
    } catch {
      /* ignore */
    }
  }, [leftWidth]);

  const activeVehicle = React.useMemo(
    () => vehicles.find((v) => v.id === activeId) ?? null,
    [vehicles, activeId],
  );

  const handleActivate = React.useCallback(
    (id: string) => {
      setActiveId(id);
      setVisibleIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      if (!isDesktop) setMobileListOpen(true);
    },
    [isDesktop],
  );

  const handleFocus = React.useCallback(
    (id: string) => {
      setVisibleIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setFocusedId(id);
      setFocusBump((b) => b + 1);
      if (!isDesktop) setMobileListOpen(false);
    },
    [isDesktop],
  );

  /* ---- Fullscreen ---- */
  const toggleFullScreen = React.useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullScreen(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullScreen(false);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  React.useEffect(() => {
    const h = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  /* ---- History range — the URL owns what's loaded; the picker owns the
          draft the user is still composing. ---- */
  const [range, setRange] = React.useState(defaultCairoTodayRange());
  const [forceRefresh, setForceRefresh] = React.useState(false);

  // Keep the picker in sync when the page opens on a history link.
  React.useEffect(() => {
    if (urlState.mode === 'history' && urlState.from && urlState.to) {
      setRange({ from: urlState.from, to: urlState.to });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadedRange = React.useMemo(
    () =>
      urlState.mode === 'history' && urlState.from && urlState.to
        ? { from: urlState.from, to: urlState.to, refresh: forceRefresh || undefined }
        : null,
    [urlState.mode, urlState.from, urlState.to, forceRefresh],
  );

  // Day-chunked: whole Cairo days in parallel, trail streams in as days land.
  const historyDays = useEtitHistoryDays(
    activeId && loadedRange ? { vehicleId: activeId, ...loadedRange } : null,
  );
  const summaryQuery = useEtitTripSummary(
    activeId && loadedRange ? { vehicleId: activeId, ...loadedRange } : null,
  );

  const handleLoadHistory = React.useCallback(
    (refresh?: boolean) => {
      setForceRefresh(!!refresh);
      writeUrl({ mode: 'history', from: range.from, to: range.to, cursorMs: null });
    },
    [range, writeUrl],
  );

  const clearHistory = React.useCallback(() => {
    setForceRefresh(false);
    writeUrl({ mode: 'live', from: null, to: null, cursorMs: null });
  }, [writeUrl]);

  /* ---- DELIBERATELY NOT collapsing the left panel when history loads.
   *      The previous version did, hiding the vehicle history selector
   *      with no obvious way back. The selector now stays visible by
   *      default; the user can collapse manually via the toggle.        ---- */

  /* ---- Playback ---- */
  const [showStops, setShowStops] = React.useState(true);
  const [showIgnitions, setShowIgnitions] = React.useState(true);
  const [playbackState, setPlaybackState] = React.useState<PlaybackState | null>(null);
  const [playbackPrev, setPlaybackPrev] =
    React.useState<{ lat: number; lng: number } | null>(null);

  const [currentMs, setCurrentMs] = React.useState<number>(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState<number>(16);

  const handlePlaybackChange = React.useCallback(
    (state: PlaybackState | null, prev: { lat: number; lng: number } | null) => {
      setPlaybackState(state);
      setPlaybackPrev(prev);
    },
    [],
  );

  const handleSnapTimestamp = React.useCallback((ts: number) => {
    setCurrentMs(ts);
  }, []);

  // When the first day lands, seat the cursor: on the URL's `t` when the
  // link carried one, else on the range's first point. Later days landing
  // must not yank a cursor the user already moved.
  const cursorSeededRef = React.useRef(false);
  React.useEffect(() => {
    if (!loadedRange) {
      cursorSeededRef.current = false;
      return;
    }
    if (!historyDays.merged || cursorSeededRef.current) return;
    cursorSeededRef.current = true;
    const startMs = historyDays.merged.points[0]?.timestamp?.getTime() ?? 0;
    setCurrentMs(urlState.cursorMs ?? startMs);
    setPlaying(false);
  }, [loadedRange, historyDays.merged, urlState.cursorMs]);

  // Pausing writes the cursor into the URL, so the moment is shareable.
  // (Never while playing — that would rewrite history 60×/s.)
  React.useEffect(() => {
    if (!loadedRange || playing || !cursorSeededRef.current) return;
    if (currentMs > 0) writeUrl({ cursorMs: currentMs });
  }, [playing, currentMs, loadedRange, writeUrl]);

  /* ---- Errors & Status ---- */
  const error = fleetQuery.error || (historyDays.isError ? new Error(t('etit.historyFailed', 'History failed to load')) : null) || summaryQuery.error;
  const liveLabel = fleetQuery.liveConnected 
    ? t('etit.header.live') 
    : fleetQuery.isLoading
      ? t('common.loading')
      : t('etit.header.reconnecting');
  const liveTone = fleetQuery.liveConnected ? 'success' : 'muted';

  const effectiveVisibleIds = React.useMemo(() => {
    if (loadedRange) return new Set<string>();
    return visibleIds;
  }, [loadedRange, visibleIds]);

  const onMapCount = React.useMemo(() => {
    return liveStatuses.filter((s) => visibleIds.has(s.id)).length;
  }, [liveStatuses, visibleIds]);

  /* ---- Resize handle (pointer events for trackpad/Pencil/touch) ---- */
  const handleResizeStart = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = leftWidth;

      const move = (me: PointerEvent) => {
        const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
        const delta = (me.clientX - startX) * dir;
        setLeftWidth(Math.max(260, Math.min(500, startWidth + delta)));
      };
      const up = (ue: PointerEvent) => {
        setIsResizing(false);
        try {
          target.releasePointerCapture(ue.pointerId);
        } catch {
          /* ignore */
        }
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    [leftWidth],
  );

  /* ---- Nodes ---- */

  const vehicleList = (
    <EtitVehicleList
      vehicles={vehicles}
      liveStatuses={liveStatuses}
      activeId={activeId}
      visibleIds={visibleIds}
      loading={fleetQuery.isLoading}
      onActivate={handleActivate}
      onToggleVisible={toggleVisible}
      onSetAllVisible={setAllVisible}
      onClearVisible={clearVisible}
      onFocus={handleFocus}
      className="h-full w-full"
    />
  );

  const handleDatePickerOpenChange = React.useCallback((open: boolean) => {
    setDatePickerOpen(open);
  }, []);

  const handleMobileListOpenChange = React.useCallback((open: boolean) => {
    setMobileListOpen(open);
    if (!open) setDatePickerOpen(false);
  }, []);

  const vehicleSelector = activeVehicle && (
    <EtitVehicleHistorySelector
      vehicle={activeVehicle}
      range={range}
      onRangeChange={setRange}
      onLoad={handleLoadHistory}
      onBack={() => {
        setActiveId(null);
        if (loadedRange) clearHistory();
      }}
      onClearHistory={clearHistory}
      isHistoryLoaded={!!loadedRange}
      loading={historyDays.isLoading || summaryQuery.isLoading}
      onDatePickerOpenChange={handleDatePickerOpenChange}
      className="h-full w-full"
    />
  );

  /** Loaded-days strip — one cell per Cairo day, green as each day lands. */
  const dayStripNode = loadedRange && historyDays.totalCount > 1 && (
    <div className="shrink-0 border-t px-3 py-2.5">
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        <span>{t('etit.range.loadedDays', 'Loaded days')}</span>
        <span className="tabular-nums">
          {historyDays.loadedCount}/{historyDays.totalCount}
        </span>
      </div>
      <div className="mt-1.5 flex gap-0.5">
        {historyDays.days.map((d) => (
          <div
            key={d.label}
            title={d.label}
            className={cn(
              'h-1.5 min-w-1 flex-1 rounded-sm transition-colors',
              d.status === 'loaded' && 'bg-success',
              d.status === 'pending' && 'bg-muted animate-pulse',
              d.status === 'error' && 'bg-destructive',
            )}
          />
        ))}
      </div>
    </div>
  );

  const floatingStatsNode = (
    <EtitFloatingStats
      summary={summaryQuery.data ?? null}
      showStops={showStops}
      onShowStopsChange={setShowStops}
      showIgnitions={showIgnitions}
      onShowIgnitionsChange={setShowIgnitions}
    />
  );

  /* Per-day trails: the day under the replay cursor draws full-strength,
     the rest dim. Past ~3 days the trails move to the WebGL overlay. */
  const cursorDayLabel = React.useMemo(
    () => (currentMs > 0 ? formatCairoDate(new Date(currentMs)) : null),
    [currentMs],
  );
  const dayTrails = React.useMemo(() => {
    if (historyDays.dayRoutes.length === 0) return undefined;
    if (historyDays.dayRoutes.length === 1) return undefined; // single day: keep the halo stack
    return historyDays.dayRoutes.map((d) => ({
      id: `day-${d.label}`,
      path: d.path,
      color: '#3b82f6',
      opacity: d.label === cursorDayLabel ? 0.95 : 0.3,
      weight: d.label === cursorDayLabel ? 4 : 3,
    }));
  }, [historyDays.dayRoutes, cursorDayLabel]);
  const useGpuTrails = historyDays.dayRoutes.length > 3;

  const playbackPlayerNode = (
    <EtitPlaybackPlayer
      points={historyDays.merged?.points ?? []}
      stops={historyDays.merged?.stops ?? []}
      sensors={historyDays.merged?.sensors ?? []}
      currentMs={currentMs}
      onCurrentMsChange={setCurrentMs}
      playing={playing}
      onPlayingChange={setPlaying}
      speed={speed}
      onSpeedChange={setSpeed}
      onStateChange={handlePlaybackChange}
    />
  );

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-background">
      {/* Header */}
      {!isFullScreen && (
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card/80 px-3 sm:px-4 backdrop-blur-md z-[50]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {!isDesktop && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setMobileListOpen(true)}
                aria-label={t('etit.list.heading', { count: vehicles.length })}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {t('nav.etit')}
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                <span className="flex items-center gap-1 shrink-0">
                  <Radar className="h-2.5 w-2.5 text-primary" />
                  <span className="tabular-nums">
                    {t('etit.list.shownOnMap', { shown: onMapCount, total: vehicles.length })}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <div
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      liveTone === 'success' ? 'bg-success animate-pulse' : 'bg-muted',
                    )}
                  />
                  <span className="text-[10px] sm:text-xs">{liveLabel}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {error && (
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span className="max-w-[140px] truncate">{extractErrorMessage(error)}</span>
              </div>
            )}
            {error && (
              <div
                className="sm:hidden h-8 w-8 grid place-items-center rounded-full bg-destructive/10 text-destructive"
                title={extractErrorMessage(error)}
              >
                <AlertCircle className="h-4 w-4" />
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={toggleFullScreen}
              aria-label={t(isFullScreen ? 'common.exitFullscreen' : 'common.enterFullscreen')}
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </header>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop side panel */}
        {isDesktop && !isFullScreen && (
          <div
            className={cn(
              'relative flex bg-card border-e',
              !isResizing && 'transition-[width] duration-300 ease-in-out',
              leftCollapsed && 'w-0',
            )}
            style={{ width: leftCollapsed ? 0 : leftWidth }}
          >
            <div className="flex h-full w-full flex-col overflow-hidden">
              {activeId ? (
                <>
                  <div className="min-h-0 flex-1">{vehicleSelector}</div>
                  {dayStripNode}
                </>
              ) : (
                vehicleList
              )}
            </div>
            {!leftCollapsed && (
              <div
                role="separator"
                aria-orientation="vertical"
                className={cn(
                  'absolute -end-1 top-0 bottom-0 z-50 w-2 cursor-col-resize group/resizer touch-none',
                  isResizing && 'bg-primary/40',
                )}
                onPointerDown={handleResizeStart}
              >
                <div className="absolute inset-y-0 start-1/2 w-0.5 -translate-x-1/2 bg-border group-hover/resizer:bg-primary/50 transition-colors" />
              </div>
            )}
          </div>
        )}

        {/* Mobile drawer */}
        {!isDesktop && (
          <Sheet
            open={mobileListOpen}
            onOpenChange={handleMobileListOpenChange}
            // Let the nested date sheet receive taps without dismissing this drawer.
            modal={!datePickerOpen}
          >
            <SheetContent
              side="left"
              className={cn(
                'p-0',
                activeId ? 'w-full max-w-md' : 'w-[min(320px,85vw)]',
              )}
            >
              {activeId ? (
                <div className="flex h-full flex-col">
                  <div className="min-h-0 flex-1">{vehicleSelector}</div>
                  {dayStripNode}
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="flex h-14 items-center justify-between border-b px-4">
                    <span className="text-sm font-bold uppercase tracking-widest">
                      {t('etit.list.heading', { count: vehicles.length })}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => setMobileListOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1">{vehicleList}</div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        )}

        {/* Map area */}
        <div className="relative min-w-0 flex-1">
          <EtitMap
            vehicles={vehicles}
            liveStatuses={liveStatuses}
            visibleIds={effectiveVisibleIds}
            activeVehicleId={activeId}
            focusedVehicleId={focusedId}
            focusBump={focusBump}
            route={historyDays.route}
            dayTrails={dayTrails}
            gpuTrails={useGpuTrails}
            stops={historyDays.merged?.stops}
            sensors={historyDays.merged?.sensors}
            showStops={showStops}
            showIgnitions={showIgnitions}
            playback={playbackState}
            playbackPrev={playbackPrev}
            onSnapTimestamp={handleSnapTimestamp}
            bottomOffset={!isDesktop && loadedRange ? 320 : 0}
            height="100%"
          />

          {/* Top-right controls — fullscreen + (when collapsed) selector toggle */}
          <div className="absolute end-3 top-3 z-20 flex flex-col gap-2">
            {!loadedRange && (
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-full shadow-lg bg-card/85 backdrop-blur-sm"
                onClick={toggleFullScreen}
              >
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* SIDE-PANEL TOGGLE — always visible on desktop, prominent when
              collapsed. Now uses a directional chevron so it's obvious which
              way the panel will move. The original Menu icon was easy to
              miss when the playback overlay was on top. */}
          {isDesktop && !isFullScreen && (
            <div className="absolute start-3 top-3 z-[1100] flex flex-col gap-2">
              <Button
                size="icon"
                variant={leftCollapsed ? 'default' : 'outline'}
                className={cn(
                  'h-9 w-9 rounded-full shadow-lg backdrop-blur-md transition-all',
                  leftCollapsed
                    ? 'bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/50'
                    : 'bg-card/85',
                )}
                onClick={() => setLeftCollapsed(!leftCollapsed)}
                aria-label={t(leftCollapsed ? 'common.show' : 'common.hide')}
                title={t(leftCollapsed ? 'common.show' : 'common.hide')}
              >
                {leftCollapsed ? (
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                ) : (
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                )}
              </Button>
            </div>
          )}

          {/* Floating playback overlay */}
          {loadedRange && (
            <div className="absolute inset-x-0 top-4 sm:top-6 z-[1000] pointer-events-none flex justify-center px-3 sm:px-4">
              <Draggable
                persistKey="playback"
                className="relative w-full"
                disabled={!isDesktop}
              >
                <div
                  className={cn(
                    'pointer-events-auto mx-auto flex flex-col gap-1',
                    'w-full max-w-[640px]',
                    'bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl',
                    'border border-border/60 ring-1 ring-inset ring-foreground/5',
                    'p-1.5 hover:border-border',
                  )}
                >
                  <div className="flex items-center justify-between px-2 pt-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Radar className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">
                        {activeVehicle?.plate}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 rounded-md hover:bg-destructive/20 hover:text-destructive text-muted-foreground shrink-0"
                      onClick={clearHistory}
                      aria-label={t('common.exit')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="hidden md:block">{playbackPlayerNode}</div>
                </div>
              </Draggable>
            </div>
          )}

          {/* Floating stats — desktop only */}
          {loadedRange && isDesktop && (
            <div className="absolute end-6 top-24 z-[1000] pointer-events-none">
              <Draggable persistKey="stats" className="relative">
                {floatingStatsNode}
              </Draggable>
            </div>
          )}

          {/* Loading overlay */}
          {historyDays.isLoading && (
            <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-background/60 backdrop-blur-md transition-all animate-in fade-in duration-500">
              <div className="relative flex flex-col items-center gap-2 p-6 rounded-3xl bg-card/40 shadow-2xl ring-1 ring-white/10 border border-white/5">
                <EmptyState
                  lottieSrc="/animations/location_radar.lottie"
                  lottieWidth={140}
                  lottieHeight={140}
                  title={t('etit.loadingHistory')}
                  description="Synchronizing Track"
                  className="bg-transparent border-0 shadow-none py-0"
                />
              </div>
            </div>
          )}

          {/* Mobile bottom panel — controls / playback */}
          {!isDesktop && !isFullScreen && loadedRange && (
            <div className="absolute inset-x-0 bottom-0 z-[1000] border-t bg-card/95 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-around">
                <MobileTabButton
                  active={mobileTab === 'controls'}
                  onClick={() => setMobileTab('controls')}
                  label={t('etit.mobile.controls')}
                  icon={Activity}
                />
                <MobileTabButton
                  active={mobileTab === 'playback'}
                  onClick={() => setMobileTab('playback')}
                  label={t('etit.mobile.playback')}
                  icon={Clock}
                />
              </div>
              <div className="max-h-[40vh] overflow-y-auto p-3 sm:p-4 bg-muted/5">
                {mobileTab === 'controls' ? floatingStatsNode : playbackPlayerNode}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EtitPage;