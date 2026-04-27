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
import { EtitVehicleHistorySelector } from '@/widgets/etit-vehicle-history-selector/etit-vehicle-history-selector';
import { EtitFloatingStats } from '@/widgets/etit-history-controls/etit-floating-stats';
import { EtitPlaybackPlayer } from '@/widgets/etit-playback-player/etit-playback-player';
import { defaultCairoTodayRange } from '@/widgets/etit-datetime-range/etit-datetime-range';
import { Draggable } from '@/shared/ui/draggable';

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

  /* ---- Server data ---- */
  const fleetQuery = useEtitFleet();
  const vehicles = fleetQuery.fleet;
  const liveStatuses = fleetQuery.liveStatuses;

  /* ---- Visibility ---- */
  const [visibleIds, setVisibleIds] = React.useState<Set<string>>(() => loadVisibleIds());

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_VISIBLE_IDS, JSON.stringify([...visibleIds]));
    } catch { /* ignore */ }
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

  /* ---- Selection & Layout ---- */
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [focusBump, setFocusBump] = React.useState(0);
  const [focusedId, setFocusedId] = React.useState<string | null>(null);

  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);

  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [leftWidth, setLeftWidth] = React.useState(320);

  React.useLayoutEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setLeftCollapsed(true);
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
    if (!isDesktop) setMobileListOpen(true);
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

  /* ---- Fullscreen ---- */
  const toggleFullScreen = React.useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try { await containerRef.current.requestFullscreen(); setIsFullScreen(true); } 
      catch (err) { console.error(err); }
    } else {
      try { await document.exitFullscreen(); setIsFullScreen(false); } 
      catch (err) { console.error(err); }
    }
  }, []);

  React.useEffect(() => {
    const h = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  /* ---- History range ---- */
  const [range, setRange] = React.useState(defaultCairoTodayRange());
  const [loadedRange, setLoadedRange] = React.useState<{ from: Date; to: Date; refresh?: boolean } | null>(null);

  const historyQuery = useEtitHistoryRange(
    activeId && loadedRange ? { vehicleId: activeId, ...loadedRange } : null,
  );

  const summaryQuery = useEtitTripSummary(
    activeId && loadedRange ? { vehicleId: activeId, ...loadedRange } : null,
  );

  const handleLoadHistory = React.useCallback((refresh?: boolean) => {
    setLoadedRange({ ...range, refresh });
  }, [range]);

  const clearHistory = React.useCallback(() => {
    setLoadedRange(null);
    if (activeId) {
      queryClient.removeQueries({ queryKey: etitKeys.historyRange(activeId, '', '') });
      queryClient.removeQueries({ queryKey: etitKeys.summary(activeId, '', '') });
    }
  }, [activeId, queryClient]);

  React.useEffect(() => {
    if (loadedRange && isDesktop) {
      setLeftCollapsed(true);
    }
  }, [loadedRange, isDesktop]);

  /* ---- Playback ---- */
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

  /* ---- Errors & Status ---- */
  const error = fleetQuery.error || historyQuery.error || summaryQuery.error;

  const liveLabel = fleetQuery.liveConnected ? t('common.refreshing') : t('common.loading');
  const liveTone = fleetQuery.liveConnected ? 'success' : 'muted';

  const effectiveVisibleIds = React.useMemo(() => {
    if (loadedRange) return new Set<string>();
    return visibleIds;
  }, [loadedRange, visibleIds]);

  const onMapCount = React.useMemo(() => {
    return liveStatuses.filter(s => visibleIds.has(s.id)).length;
  }, [liveStatuses, visibleIds]);

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

  const vehicleSelector = activeVehicle && (
    <EtitVehicleHistorySelector
      vehicle={activeVehicle}
      range={range}
      onRangeChange={setRange}
      onLoad={handleLoadHistory}
      onBack={() => setActiveId(null)}
      onClearHistory={clearHistory}
      isHistoryLoaded={!!loadedRange}
      loading={historyQuery.isLoading || summaryQuery.isLoading}
      className="h-full w-full"
    />
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

  const playbackPlayerNode = (
    <EtitPlaybackPlayer
      points={historyQuery.data?.points ?? []}
      stops={historyQuery.data?.stops ?? []}
      sensors={historyQuery.data?.sensors ?? []}
      onStateChange={handlePlaybackChange}
      className="border-none bg-transparent"
    />
  );

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-background">
      {/* Header */}
      {!isFullScreen && (
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-md z-[50]">
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
              <h1 className="text-base font-bold tracking-tight">{t('nav.etit')}</h1>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <Radar className="h-2.5 w-2.5 text-primary" />
                  {t('etit.list.shownOnMap', { shown: onMapCount, total: vehicles.length })}
                </span>
                <span className="flex items-center gap-1">
                  <div className={cn("h-1.5 w-1.5 rounded-full", liveTone === 'success' ? 'bg-success animate-pulse' : 'bg-muted')} />
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isDesktop && !isFullScreen && (
          <div 
            className={cn("relative flex bg-card border-e", !isResizing && "transition-all duration-300 ease-in-out", leftCollapsed ? "w-0" : "")}
            style={{ width: leftCollapsed ? 0 : leftWidth }}
          >
            {activeId ? vehicleSelector : vehicleList}
            {!leftCollapsed && (
              <div
                className={cn("absolute -right-1 top-0 bottom-0 z-50 w-2 cursor-col-resize group/resizer", isResizing && "bg-primary/40")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                  const startX = e.clientX;
                  const startWidth = leftWidth;
                  const move = (me: MouseEvent) => setLeftWidth(Math.max(260, Math.min(500, startWidth + (me.clientX - startX))));
                  const up = () => { setIsResizing(false); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
                  document.addEventListener('mousemove', move);
                  document.addEventListener('mouseup', up);
                }}
              >
                <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-border group-hover/resizer:bg-primary/50 transition-colors" />
              </div>
            )}
          </div>
        )}

        {!isDesktop && (
          <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
            <SheetContent side="left" className="w-[320px] p-0">
              {activeId ? vehicleSelector : (
                <div className="flex h-full flex-col">
                  <div className="flex h-14 items-center justify-between border-b px-4">
                    <span className="text-sm font-bold uppercase tracking-widest">{t('etit.list.heading', { count: vehicles.length })}</span>
                    <Button variant="ghost" size="icon" onClick={() => setMobileListOpen(false)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="min-h-0 flex-1">{vehicleList}</div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        )}

        <div className="relative min-w-0 flex-1">
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

          {loadedRange && (
            <div className="absolute inset-x-0 top-6 z-[1000] pointer-events-none flex justify-center px-4">
              <Draggable id="etit-playback-panel" className="group relative">
                <div className="pointer-events-auto flex flex-col gap-1 w-full max-w-2xl bg-background/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-xl shadow-2xl border border-border p-1.5 transition-all">
                  <div className="flex items-center justify-between px-2 pt-0.5">
                    <div className="flex items-center gap-2">
                      <Radar className="h-3.5 w-3.5 text-primary animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{activeVehicle?.plate}</span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-5 w-5 rounded-md hover:bg-destructive/20 hover:text-destructive text-muted-foreground" onClick={clearHistory}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {playbackPlayerNode}
                </div>
              </Draggable>
            </div>
          )}

          {loadedRange && isDesktop && (
            <div className="absolute right-6 top-24 z-[1000] pointer-events-none">
              <Draggable id="etit-stats-panel" className="group relative">
                {floatingStatsNode}
              </Draggable>
            </div>
          )}

          {(historyQuery.isLoading || summaryQuery.isLoading) && (
            <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-background/20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-background/80 p-8 shadow-2xl border border-border/50">
                <Radar className="h-10 w-10 text-primary animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">{t('etit.loadingHistory')}</span>
              </div>
            </div>
          )}

          <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
            {!loadedRange && (
              <Button size="icon" variant="outline" className="h-9 w-9 rounded-full shadow-lg bg-background/80 backdrop-blur-sm" onClick={toggleFullScreen}>
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            )}
          </div>

          <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
            {isDesktop && !isFullScreen && (
              <Button size="icon" variant={leftCollapsed ? 'secondary' : 'default'} className="h-9 w-9 rounded-full shadow-lg" onClick={() => setLeftCollapsed(!leftCollapsed)}>
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>

          {!isDesktop && !isFullScreen && loadedRange && (
            <div className="absolute inset-x-0 bottom-0 z-[1000] border-t bg-background/80 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-around">
                <MobileTabButton active={mobileTab === 'controls'} onClick={() => setMobileTab('controls')} label={t('etit.mobile.controls')} icon={Activity} />
                <MobileTabButton active={mobileTab === 'playback'} onClick={() => setMobileTab('playback')} label={t('etit.mobile.playback')} icon={Clock} />
              </div>
              <div className="max-h-[45vh] overflow-y-auto p-4 bg-muted/5">
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