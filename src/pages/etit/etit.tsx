import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  Menu,
  MapPinned,
  Radar,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
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
  useEtitHistoryRange,
  useEtitLive,
  useEtitLiveStream,
  useEtitTripSummary,
  useEtitVehicles,
  etitKeys,
} from '@/entities/etit-vehicle/queries';
import { useQueryClient } from '@tanstack/react-query';
import { EtitMap } from '@/widgets/etit-map/etit-map';
import { EtitVehicleList } from '@/widgets/etit-vehicle-list/etit-vehicle-list';
import { EtitHistoryControls } from '@/widgets/etit-history-controls/etit-history-controls';
import { EtitPlaybackPlayer } from '@/widgets/etit-playback-player/etit-playback-player';
import { defaultCairoTodayRange } from '@/widgets/etit-datetime-range/etit-datetime-range';

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

const STORAGE_VISIBLE_IDS = 'apex:etit:visibleIds';
const STORAGE_SHOW_STOPS = 'apex:etit:showStops';
const STORAGE_SHOW_IGNITIONS = 'apex:etit:showIgnitions';

function loadVisibleIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_VISIBLE_IDS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function loadBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === '1') return true;
  if (raw === '0') return false;
  return fallback;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

type MobileTab = 'controls' | 'playback';

export function EtitPage() {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const queryClient = useQueryClient();
  const [mobileListOpen, setMobileListOpen] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<MobileTab>('controls');

  /* ---- Server data ---- */
  const vehiclesQuery = useEtitVehicles();
  const liveStream = useEtitLiveStream();
  const liveQuery = useEtitLive({ streamConnected: liveStream.connected });

  const vehicles = React.useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const liveStatuses = React.useMemo(() => liveQuery.data ?? [], [liveQuery.data]);

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

  // First-load default: if storage was empty AND we have vehicles, show
  // none — let the user opt in. (Showing 20+ markers by default at fleet
  // scale is noisy; the empty-state overlay nudges them to pick.)
  // Existing storage values are preserved.

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
  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const activeVehicle = React.useMemo(
    () => vehicles.find((v) => v.id === activeId) ?? null,
    [vehicles, activeId],
  );

  const handleActivate = React.useCallback((id: string) => {
    setActiveId(id);
    // Auto-show the active vehicle on the map — selecting in the list
    // implies the user wants to see it.
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

  /* ---- History ---- */
  const [range, setRange] = React.useState(() => defaultCairoTodayRange());
  const [loadedRange, setLoadedRange] = React.useState<{
    vehicleId: string;
    from: Date;
    to: Date;
    refresh?: boolean;
  } | null>(null);

  // Drop loaded history on vehicle change — the polyline belongs to a
  // specific vehicle and another vehicle's range is irrelevant.
  React.useEffect(() => {
    setLoadedRange(null);
  }, [activeId]);

  const handleLoad = React.useCallback((refresh = false) => {
    if (!activeVehicle) return;

    if (refresh) {
      // Clear existing cache for history and summary to ensure a fresh UI state.
      queryClient.removeQueries({ queryKey: [...etitKeys.all, 'history'] });
      queryClient.removeQueries({ queryKey: [...etitKeys.all, 'summary'] });
    }

    setLoadedRange({
      vehicleId: activeVehicle.id,
      from: range.from,
      to: range.to,
      refresh,
    });
  }, [activeVehicle, range, queryClient]);

  const historyArgs = loadedRange
    ? {
        vehicleId: loadedRange.vehicleId,
        from: loadedRange.from,
        to: loadedRange.to,
        refresh: loadedRange.refresh,
      }
    : null;

  const historyQuery = useEtitHistoryRange(historyArgs);
  const summaryQuery = useEtitTripSummary(historyArgs);

  const history = historyQuery.data ?? null;
  const summary = summaryQuery.data ?? null;

  const route = React.useMemo<Array<[number, number]>>(() => {
    if (!history?.geometry) return [];
    try {
      return decodePolyline(history.geometry);
    } catch {
      return [];
    }
  }, [history?.geometry]);

  /* ---- Overlays ---- */
  const [showStops, setShowStops] = React.useState(() =>
    loadBool(STORAGE_SHOW_STOPS, true),
  );
  const [showIgnitions, setShowIgnitions] = React.useState(() =>
    loadBool(STORAGE_SHOW_IGNITIONS, false),
  );
  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_SHOW_STOPS, showStops ? '1' : '0');
  }, [showStops]);
  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_SHOW_IGNITIONS, showIgnitions ? '1' : '0');
  }, [showIgnitions]);

  /* ---- Playback ---- */
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
    vehiclesQuery.error ||
    historyQuery.error ||
    summaryQuery.error ||
    // Snapshot only counts as an error when SSE is also down — otherwise
    // SSE is keeping us fresh and the snapshot back-off is intentional.
    (!liveStream.connected && liveQuery.isError ? liveQuery.error : null);

  /* ---- Map liveness pill ---- */
  const liveLabel = liveStream.connected
    ? t('etit.header.liveStream')
    : liveQuery.isError
      ? t('etit.header.liveOffline')
      : t('etit.header.live');
  const liveTone =
    !liveStream.connected && liveQuery.isError
      ? 'destructive'
      : liveStream.connected
        ? 'success'
        : 'muted';

  const onMapCount = liveStatuses.filter((s) => visibleIds.has(s.id)).length;

  /* ---- Renderable bits ---- */

  const vehicleListNode = (
    <EtitVehicleList
      vehicles={vehicles}
      liveStatuses={liveStatuses}
      activeId={activeId}
      visibleIds={visibleIds}
      loading={vehiclesQuery.isLoading}
      onActivate={handleActivate}
      onToggleVisible={toggleVisible}
      onSetAllVisible={setAllVisible}
      onClearVisible={clearVisible}
      onFocus={handleFocus}
      className="h-full w-full"
    />
  );

  const controlsNode = (
    <EtitHistoryControls
      vehicle={activeVehicle}
      history={history}
      summary={summary}
      range={range}
      onRangeChange={setRange}
      onLoad={handleLoad}
      loading={historyQuery.isFetching || summaryQuery.isFetching}
      showStops={showStops}
      onShowStopsChange={setShowStops}
      showIgnitions={showIgnitions}
      onShowIgnitionsChange={setShowIgnitions}
    />
  );

  const playerNode = history && (
    <EtitPlaybackPlayer
      points={history.points}
      stops={history.stops}
      sensors={history.sensors}
      onStateChange={handlePlaybackChange}
    />
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header — hide in full screen to maximize map space */}
      {!isFullScreen && (
        <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {!isDesktop && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setMobileListOpen(true)}
                aria-label={t('etit.header.openVehicleList')}
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:flex">
              <Radar className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight md:text-lg">
                {t('etit.header.title')}
              </h1>
              <p className="truncate text-[11px] text-muted-foreground">
                {t('etit.header.subtitle', {
                  vehicleCount: vehicles.length,
                  onMapCount,
                })}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                liveTone === 'success' && 'bg-success/10 text-success',
                liveTone === 'destructive' && 'bg-destructive/10 text-destructive',
                liveTone === 'muted' && 'bg-muted text-muted-foreground',
              )}
            >
              {liveTone === 'destructive' ? (
                <WifiOff className="h-3 w-3" />
              ) : (
                <Activity className={cn('h-3 w-3', liveTone === 'success' && 'animate-pulse')} />
              )}
              {liveLabel}
            </span>
          </div>
        </div>
      )}

      {/* Error banner — flat, no nested card */}
      {error && (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-4 py-2">
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{extractErrorMessage(error, t('etit.errors.proxyUnreachable'))}</p>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Vehicle list — desktop sidebar */}
        {isDesktop && !leftCollapsed && !isFullScreen && (
          <div className="h-full w-72 shrink-0 border-e bg-card/50">{vehicleListNode}</div>
        )}

        {/* Vehicle list — mobile sheet */}
        {!isDesktop && (
          <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
            <SheetContent side="left" className="w-80 max-w-[85vw] p-0" hideCloseButton>
              <div className="flex h-dvh flex-col">
                <div className="flex shrink-0 items-center justify-between border-b px-3 py-2.5">
                  <span className="text-sm font-semibold">
                    {t('etit.list.heading', { count: vehicles.length })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileListOpen(false)}
                  >
                    {t('common.close')}
                  </Button>
                </div>
                <div className="min-h-0 flex-1">{vehicleListNode}</div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Center column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Map */}
          <div className="relative min-h-0 flex-1">
            <EtitMap
              vehicles={vehicles}
              liveStatuses={liveStatuses}
              visibleIds={visibleIds}
              activeVehicleId={activeId}
              focusedVehicleId={focusedId}
              focusBump={focusBump}
              route={route}
              stops={history?.stops ?? []}
              sensors={history?.sensors ?? []}
              showStops={showStops}
              showIgnitions={showIgnitions}
              playback={playbackState}
              playbackPrev={playbackPrev}
              height="100%"
              className="absolute inset-0"
            />

            {/* Desktop Layout Controls Overlay */}
            {isDesktop && (
              <>
                <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
                  {!isFullScreen && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 shadow-md backdrop-blur-sm"
                      onClick={() => setLeftCollapsed(!leftCollapsed)}
                      title={leftCollapsed ? t('common.expand') : t('common.collapse')}
                    >
                      {leftCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 shadow-md backdrop-blur-sm"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    title={isFullScreen ? t('common.exitFullScreen') : t('common.fullScreen')}
                  >
                    {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                  {!isFullScreen && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 shadow-md backdrop-blur-sm"
                      onClick={() => setRightCollapsed(!rightCollapsed)}
                      title={rightCollapsed ? t('common.expand') : t('common.collapse')}
                    >
                      {rightCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Full Screen Mode — Top Overlay Controls */}
            {isFullScreen && (
              <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-center p-4">
                <div className="flex items-center gap-2 rounded-xl border bg-card/90 p-2 shadow-2xl backdrop-blur-md">
                   <div className="flex items-center gap-3 border-e pe-3 px-2">
                     <Radar className="h-5 w-5 text-primary" />
                     <div className="flex flex-col">
                       <span className="text-xs font-bold leading-none">{t('etit.header.title')}</span>
                       <span className="text-[10px] text-muted-foreground">{liveLabel}</span>
                     </div>
                   </div>
                   
                   {/* Minimal controls for full screen */}
                   <div className="flex items-center gap-1 px-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-2 text-xs"
                        onClick={() => setIsFullScreen(false)}
                      >
                        <Minimize2 className="h-3.5 w-3.5" />
                        {t('common.exit')}
                      </Button>
                   </div>
                </div>
              </div>
            )}

            {/* Empty-state overlay — invites the user to pick something to show */}
            {visibleIds.size === 0 && !historyQuery.isFetching && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                <div className="pointer-events-auto rounded-xl border bg-card/95 px-4 py-3 text-center shadow-xl backdrop-blur-sm">
                  <MapPinned className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">{t('etit.map.empty.title')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isDesktop
                      ? t('etit.map.empty.descDesktop')
                      : t('etit.map.empty.descMobile')}
                  </p>
                  {!isDesktop && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => setMobileListOpen(true)}
                    >
                      {t('etit.header.openVehicleList')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile bottom: tab toggle */}
          {!isDesktop && (
            <div className="shrink-0 border-t bg-background">
              <div className="flex items-center justify-center gap-0.5 border-b bg-muted/30 p-1">
                <MobileTabButton
                  active={mobileTab === 'controls'}
                  onClick={() => setMobileTab('controls')}
                  label={t('etit.mobile.controls')}
                />
                <MobileTabButton
                  active={mobileTab === 'playback'}
                  onClick={() => setMobileTab('playback')}
                  label={t('etit.mobile.playback')}
                  disabled={!history}
                />
              </div>
              <div className="max-h-[42vh] overflow-y-auto p-2">
                {mobileTab === 'controls' ? controlsNode : (playerNode ?? (
                  <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                    {t('etit.player.empty')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right pane — desktop only */}
        {isDesktop && !rightCollapsed && !isFullScreen && (
          <aside className={cn(
            "flex h-full shrink-0 flex-col gap-3 overflow-y-auto border-s bg-background p-3 transition-[width] duration-300 ease-in-out",
            leftCollapsed ? "w-[420px]" : "w-[360px]"
          )}>
            {controlsNode}
            {playerNode}
          </aside>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile tab button                                                           */
/* -------------------------------------------------------------------------- */

function MobileTabButton({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 flex-1 items-center justify-center rounded text-xs font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        disabled && 'opacity-40',
      )}
    >
      {label}
    </button>
  );
}

export default EtitPage;
