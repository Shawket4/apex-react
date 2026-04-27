import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  Menu,
  Radar,
  Maximize2,
  Minimize2,
  X,
  Clock,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import { useIsDesktop } from '@/shared/hooks/use-media-query';
import { extractErrorMessage } from '@/shared/api/errors';
import { cn } from '@/shared/lib/cn';
import {
  decodePolyline,
  type PlaybackState,
} from '@/entities/etit-vehicle/playback';
import {
  useEtitFleet,
  useEtitHistoryRange,
  useEtitTripSummary,
  etitKeys,
} from '@/entities/etit-vehicle/queries';
import { useQueryClient } from '@tanstack/react-query';
import { EtitMap } from '@/widgets/etit-map/etit-map';
import { EtitVehicleList } from '@/widgets/etit-vehicle-list/etit-vehicle-list';
import { EtitHistoryControls } from '@/widgets/etit-history-controls/etit-history-controls';
import { EtitPlaybackPlayer } from '@/widgets/etit-playback-player/etit-playback-player';
import { defaultCairoTodayRange } from '@/widgets/etit-datetime-range/etit-datetime-range';

/* -------------------------------------------------------------------------- */
/* Persistence                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_VISIBLE_IDS = 'etit_visible_ids';

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

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

type MobileTab = 'controls' | 'playback';

function MobileTabButton({ 
  active, 
  onClick, 
  label, 
  icon: Icon,
  disabled 
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string; 
  icon: React.ElementType;
  disabled?: boolean 
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "flex-1 flex-col gap-1 h-14 rounded-none transition-all", 
        active ? "text-primary border-t-2 border-primary bg-primary/5" : "text-muted-foreground opacity-60"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className={cn("h-5 w-5", active && "scale-110 transition-transform")} />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </Button>
  );
}

export function EtitPage() {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const queryClient = useQueryClient();
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const [mobileListOpen, setMobileListOpen] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<MobileTab>('controls');

  /* ---- Server data (Consolidated) ---- */
  const fleetQuery = useEtitFleet();
  const vehicles = fleetQuery.fleet;
  const liveStatuses = fleetQuery.liveStatuses;

  /* ---- Visibility (multi-select for the map) ---- */
  const [visibleIds, setVisibleIds] = React.useState<Set<string>>(() => loadVisibleIds());

  // Persist
  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_VISIBLE_IDS,
        JSON.stringify([...visibleIds]),
      );
    } catch {
      // storage full / disabled — no-op
    }
  }, [visibleIds]);

  // First-load default: if storage was empty AND we have vehicles, show top 5
  React.useEffect(() => {
    if (visibleIds.size === 0 && vehicles.length > 0) {
      const top5 = vehicles.slice(0, 5).map((v) => v.id);
      setVisibleIds(new Set(top5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length === 0]);

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

  /* ---- Active vehicle (drives the right pane) ---- */
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [focusBump, setFocusBump] = React.useState(0);
  const [focusedId, setFocusedId] = React.useState<string | null>(null);

  /* ---- Layout states ---- */
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);
  const [leftWidth, setLeftWidth] = React.useState(320);
  const [rightWidth, setRightWidth] = React.useState(380);

  // Auto-collapse on small screens (iPad landscape / small laptops)
  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1280) {
      setLeftCollapsed(true);
      setRightCollapsed(true);
    }
  }, []);

  const activeVehicle = React.useMemo(
    () => vehicles.find((v) => v.id === activeId) ?? null,
    [vehicles, activeId],
  );

  const handleActivate = React.useCallback((id: string) => {
    setActiveId(id);
    setVisibleIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (!isDesktop) setMobileListOpen(false);
  }, [isDesktop]);

  const handleFocus = React.useCallback((id: string) => {
    setVisibleIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setFocusedId(id);
    setFocusBump((b) => b + 1);
    if (!isDesktop) setMobileListOpen(false);
  }, [isDesktop]);

  /* ---- Fullscreen Handling ---- */
  const toggleFullScreen = React.useCallback(async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullScreen(true);
      } catch (err) {
        console.error('Failed to enter fullscreen', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullScreen(false);
      } catch (err) {
        console.error('Failed to exit fullscreen', err);
      }
    }
  }, []);

  React.useEffect(() => {
    const handler = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* ---- History range ---- */
  const [range, setRange] = React.useState(defaultCairoTodayRange());
  const [loadedRange, setLoadedRange] = React.useState<{ from: Date; to: Date } | null>(null);

  const historyQuery = useEtitHistoryRange(
    activeId && loadedRange ? { vehicleId: activeId, ...loadedRange } : null,
  );
  const summaryQuery = useEtitTripSummary(
    activeId && loadedRange ? { vehicleId: activeId, ...loadedRange } : null,
  );

  const handleLoadHistory = React.useCallback(() => {
    setLoadedRange({ ...range });
  }, [range]);

  const clearHistory = React.useCallback(() => {
    setLoadedRange(null);
    if (activeId) {
      queryClient.removeQueries({ queryKey: etitKeys.historyRange(activeId, '', '') });
      queryClient.removeQueries({ queryKey: etitKeys.summary(activeId, '', '') });
    }
  }, [activeId, queryClient]);

  /* ---- Playback state (synced with the map) ---- */
  const [showStops, setShowStops] = React.useState(true);
  const [showIgnitions, setShowIgnitions] = React.useState(true);
  const [playbackState, setPlaybackState] = React.useState<PlaybackState | null>(null);
  const [playbackPrev, setPlaybackPrev] = React.useState<{ lat: number; lng: number } | null>(null);

  const handlePlaybackChange = React.useCallback(
    (state: PlaybackState | null, prev: { lat: number; lng: number } | null) => {
      setPlaybackState(state);
      setPlaybackPrev(prev);
    },
    [],
  );

  /* ---- Errors ---- */
  const error =
    fleetQuery.error ||
    historyQuery.error ||
    summaryQuery.error ||
    (!fleetQuery.liveConnected && fleetQuery.liveError ? fleetQuery.liveError : null);

  /* ---- Map liveness pill ---- */
  const liveLabel = fleetQuery.liveConnected
    ? t('common.refreshing')
    : fleetQuery.isError
      ? t('etit.errors.proxyUnreachable')
      : t('common.loading');
  const liveTone =
    !fleetQuery.liveConnected && fleetQuery.isError
      ? 'destructive'
      : fleetQuery.liveConnected
        ? 'success'
        : 'muted';

  // When a route is loaded, hide all other vehicles on the map
  const effectiveVisibleIds = React.useMemo(() => {
    if (loadedRange) return new Set<string>();
    return visibleIds;
  }, [loadedRange, visibleIds]);

  const onMapCount = React.useMemo(() => {
    return liveStatuses.filter(s => visibleIds.has(s.id)).length;
  }, [liveStatuses, visibleIds]);

  /* ---- Shared nodes ---- */

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

  const historyControlsNode = (
    <EtitHistoryControls
      vehicle={activeVehicle}
      history={historyQuery.data ?? null}
      summary={summaryQuery.data ?? null}
      range={range}
      onRangeChange={setRange}
      onLoad={handleLoadHistory}
      loading={historyQuery.isLoading || summaryQuery.isLoading}
      showStops={showStops}
      onShowStopsChange={setShowStops}
      showIgnitions={showIgnitions}
      onShowIgnitionsChange={setShowIgnitions}
      isFullScreen={isFullScreen}
    />
  );

  const playbackPlayerNode = (
    <EtitPlaybackPlayer
      points={historyQuery.data?.points ?? []}
      stops={historyQuery.data?.stops ?? []}
      sensors={historyQuery.data?.sensors ?? []}
      onStateChange={handlePlaybackChange}
      className={cn("mt-auto border-t", isFullScreen && "border-t-0")}
    />
  );

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-background">
      {/* Header */}
      {!isFullScreen && (
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!isDesktop && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setMobileListOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex flex-col">
              <h1 className="text-base font-bold tracking-tight">
                {t('nav.etit')}
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <Radar className="h-2.5 w-2.5 text-primary" />
                  {t('etit.list.shownOnMap', { shown: onMapCount, total: vehicles.length })}
                </span>
                <span className="flex items-center gap-1">
                  <div className={cn("h-1.5 w-1.5 rounded-full", 
                    liveTone === 'success' ? 'bg-success animate-pulse' : 
                    liveTone === 'destructive' ? 'bg-destructive' : 'bg-muted')} 
                  />
                  {liveLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {error && (
              <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span className="max-w-[140px] truncate">{extractErrorMessage(error)}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={toggleFullScreen}
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </header>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Sidebar — desktop only */}
        {isDesktop && !isFullScreen && (
          <div 
            className={cn(
              "relative flex",
              !isResizing && "transition-all duration-300 ease-in-out",
              leftCollapsed ? "w-0" : ""
            )}
            style={{ width: leftCollapsed ? 0 : leftWidth }}
          >
            {vehicleList}
            {!leftCollapsed && (
              <div
                className={cn(
                  "absolute -right-1 top-0 bottom-0 z-50 w-2 cursor-col-resize transition-colors group/resizer",
                  isResizing && "bg-primary/40"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                  const startX = e.clientX;
                  const startWidth = leftWidth;
                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const delta = moveEvent.clientX - startX;
                    setLeftWidth(Math.max(260, Math.min(500, startWidth + delta)));
                  };
                  const onMouseUp = () => {
                    setIsResizing(false);
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              >
                <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-border group-hover/resizer:bg-primary/50 transition-colors" />
              </div>
            )}
          </div>
        )}

        {/* Vehicle list — mobile sheet */}
        {!isDesktop && (
          <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
            <SheetContent side="left" className="w-[300px] p-0">
              <div className="flex h-full flex-col">
                <div className="flex h-14 items-center justify-between border-b px-4">
                  <span className="text-sm font-bold">{t('etit.list.heading', { count: vehicles.length })}</span>
                  <Button variant="ghost" size="icon" onClick={() => setMobileListOpen(false)}>
                    {t('common.close')}
                  </Button>
                </div>
                <div className="min-h-0 flex-1">{vehicleList}</div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Map Area */}
        <div className="relative min-w-0 flex-1 bg-muted/5">
          <EtitMap
            vehicles={vehicles}
            liveStatuses={liveStatuses}
            visibleIds={effectiveVisibleIds}
            activeVehicleId={activeId}
            focusedVehicleId={focusedId}
            focusBump={focusBump}
            route={historyQuery.data ? decodePolyline(historyQuery.data.geometry) : []}
            stops={historyQuery.data?.stops}
            sensors={historyQuery.data?.sensors}
            showStops={showStops}
            showIgnitions={showIgnitions}
            playback={playbackState}
            playbackPrev={playbackPrev}
            height="100%"
          />

          {/* Map Loading Overlay */}
          {(historyQuery.isLoading || summaryQuery.isLoading) && (
            <div className="absolute inset-0 z-[30] flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-background/80 p-6 shadow-2xl border border-white/10">
                <Radar className="h-8 w-8 text-primary animate-ping" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                  {t('etit.loadingHistory')}
                </span>
              </div>
            </div>
          )}

          {/* Full-Screen Overlay (Top) */}
          {isFullScreen && (
            <div className="absolute inset-x-0 top-0 z-[1000] pointer-events-none p-4 flex flex-col items-center">
              <div className="pointer-events-auto flex flex-col gap-3 w-full max-w-4xl bg-background/40 backdrop-blur-xl rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/10 p-4 transition-all hover:bg-background/60">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute -inset-1 rounded-full bg-primary/20 blur animate-pulse" />
                      <Radar className="relative h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold tracking-tight">{activeVehicle?.plate || t('nav.etit')}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-1.5 w-1.5 rounded-full", liveTone === 'success' ? 'bg-success animate-pulse' : 'bg-muted')} />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{liveLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-9 w-9 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
                      onClick={toggleFullScreen}
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                    {loadedRange && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-9 w-9 rounded-xl shadow-lg shadow-destructive/20 transition-all hover:scale-105 active:scale-95"
                        onClick={clearHistory}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="flex flex-col">{historyControlsNode}</div>
                  <div className="flex flex-col justify-end">{playbackPlayerNode}</div>
                </div>
              </div>
            </div>
          )}

          {/* Map Overlays (Standard) */}
          {!isFullScreen && (
            <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
              <Button
                size="icon"
                variant={rightCollapsed ? 'secondary' : 'default'}
                className="h-9 w-9 rounded-full shadow-lg"
                onClick={() => setRightCollapsed(!rightCollapsed)}
                title={rightCollapsed ? 'Show Timeline' : 'Hide Timeline'}
              >
                <Activity className="h-4 w-4" />
              </Button>

              {loadedRange && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-9 w-9 rounded-full shadow-lg"
                  onClick={clearHistory}
                  title={t('common.exit')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {!isFullScreen && (
            <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
              {isDesktop && (
                <Button
                  size="icon"
                  variant={leftCollapsed ? 'secondary' : 'default'}
                  className="h-9 w-9 rounded-full shadow-lg"
                  onClick={() => setLeftCollapsed(!leftCollapsed)}
                  title={leftCollapsed ? 'Show List' : 'Hide List'}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Mobile bottom: tab toggle */}
          {!isDesktop && !isFullScreen && (
            <div className="shrink-0 border-t bg-background/80 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
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
                  disabled={!historyQuery.data}
                />
              </div>
              <div className="max-h-[45vh] overflow-y-auto p-4 bg-muted/5">
                {mobileTab === 'controls' ? historyControlsNode : (playbackPlayerNode)}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar — desktop only */}
        {isDesktop && !isFullScreen && (
          <div 
            className={cn(
              "relative flex border-s",
              !isResizing && "transition-all duration-300 ease-in-out",
              rightCollapsed ? "w-0" : ""
            )}
            style={{ width: rightCollapsed ? 0 : rightWidth }}
          >
            {!rightCollapsed && (
              <div
                className="absolute -left-1 top-0 bottom-0 z-50 w-2 cursor-col-resize hover:bg-primary/20 active:bg-primary/40"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                  const startX = e.clientX;
                  const startWidth = rightWidth;
                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const delta = startX - moveEvent.clientX;
                    setRightWidth(Math.max(300, Math.min(600, startWidth + delta)));
                  };
                  const onMouseUp = () => {
                    setIsResizing(false);
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              />
            )}
            <div className="flex w-full flex-col overflow-hidden bg-background">
              <aside className="flex h-full flex-col overflow-y-auto p-3">
                {historyControlsNode}
                {playbackPlayerNode}
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EtitPage;
