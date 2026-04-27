import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, AlertCircle, Menu } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import { Card, CardContent } from '@/shared/ui/card';
import { useIsDesktop } from '@/shared/hooks/use-media-query';
import { extractErrorMessage } from '@/shared/api/errors';
import { decodePolyline, type PlaybackState } from '@/entities/etit-vehicle/playback';
import {
  useEtitHistoryRange,
  useEtitLive,
  useEtitTripSummary,
  useEtitVehicles,
} from '@/entities/etit-vehicle/queries';
import { EtitMap } from '@/widgets/etit-map/etit-map';
import { EtitVehicleList } from '@/widgets/etit-vehicle-list/etit-vehicle-list';
import {
  defaultCairoTodayRange,
  EtitHistoryControls,
} from '@/widgets/etit-history-controls/etit-history-controls';
import { EtitPlaybackPlayer } from '@/widgets/etit-playback-player/etit-playback-player';

/**
 * ETIT live + history page.
 *
 * Layout:
 *   - Desktop: 3-pane fixed layout. Left = vehicle list (sticky, scrolls
 *     internally). Center = map (fills remaining space). Right = controls
 *     + player (also scrolls internally if needed).
 *   - Mobile: map full-bleed, vehicle list in a left Sheet, controls + player
 *     in a bottom strip.
 *
 * State ownership:
 *   - selectedId (vehicle clicked in the list)
 *   - focusedId / focusBump (vehicle clicked via the crosshair button — the
 *     bump key forces the map to re-fit even on the same id)
 *   - range (from/to in Cairo time) + loadedRange (only set when the user
 *     clicks "Load history"; lets us avoid auto-firing the request on
 *     every range tweak)
 *   - playbackState (pushed up from the player so the map can render the
 *     interpolated marker)
 */
export function EtitPage() {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [mobileListOpen, setMobileListOpen] = React.useState(false);

  /* -------- Server data ------------------------------------------------ */
  const vehiclesQuery = useEtitVehicles();
  const liveQuery = useEtitLive();

  const vehicles = React.useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const liveStatuses = React.useMemo(() => liveQuery.data ?? [], [liveQuery.data]);

  /* -------- Selection / focus ------------------------------------------ */
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const [focusBump, setFocusBump] = React.useState(0);

  const selectedVehicle = React.useMemo(
    () => vehicles.find((v) => v.id === selectedId) ?? null,
    [vehicles, selectedId],
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (!isDesktop) setMobileListOpen(false);
  };

  const handleFocus = (id: string) => {
    setSelectedId(id);
    setFocusedId(id);
    setFocusBump((b) => b + 1);
    if (!isDesktop) setMobileListOpen(false);
  };

  /* -------- History range + load -------------------------------------- */
  const [range, setRange] = React.useState(defaultCairoTodayRange);
  const [loadedRange, setLoadedRange] = React.useState<{
    vehicleId: string;
    from: Date;
    to: Date;
  } | null>(null);

  // Reset the loaded history when the user picks a different vehicle —
  // the range is per-vehicle, so a stale polyline from another vehicle
  // would be misleading.
  React.useEffect(() => {
    setLoadedRange(null);
  }, [selectedId]);

  const handleLoad = () => {
    if (!selectedVehicle) return;
    setLoadedRange({
      vehicleId: selectedVehicle.id,
      from: range.from,
      to: range.to,
    });
  };

  const historyArgs = loadedRange
    ? {
        vehicleId: loadedRange.vehicleId,
        from: loadedRange.from,
        to: loadedRange.to,
      }
    : null;

  const historyQuery = useEtitHistoryRange(historyArgs);
  const summaryQuery = useEtitTripSummary(historyArgs);

  const history = historyQuery.data ?? null;
  const summary = summaryQuery.data ?? null;

  /* -------- Decoded polyline ------------------------------------------ */
  const route = React.useMemo<Array<[number, number]>>(() => {
    if (!history?.geometry) return [];
    try {
      return decodePolyline(history.geometry);
    } catch {
      return [];
    }
  }, [history?.geometry]);

  /* -------- Playback state from the player ---------------------------- */
  const [playbackState, setPlaybackState] = React.useState<PlaybackState | null>(null);

  const handlePlaybackChange = React.useCallback((state: PlaybackState | null) => {
    setPlaybackState(state);
  }, []);

  /* -------- Errors ----------------------------------------------------- */
  const error =
    vehiclesQuery.error ||
    liveQuery.error ||
    historyQuery.error ||
    summaryQuery.error;

  /* -------- Render ----------------------------------------------------- */

  const vehicleList = (
    <EtitVehicleList
      vehicles={vehicles}
      liveStatuses={liveStatuses}
      selectedId={selectedId}
      loading={vehiclesQuery.isLoading}
      onSelect={handleSelect}
      onFocus={handleFocus}
      className="h-full w-full"
    />
  );

  const onMapCount = liveStatuses.filter((s) => s.lat || s.lng).length;

  return (
    <div className="flex h-full flex-col">
      {/* Header strip — title + live status pill + mobile menu */}
      <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-2.5">
        <div className="flex items-center gap-3">
          {!isDesktop && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileListOpen(true)}
              aria-label={t('etit.header.openVehicleList')}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-base font-semibold leading-tight">{t('etit.header.title')}</h1>
            <p className="text-[11px] text-muted-foreground">
              {t('etit.header.subtitle', {
                vehicleCount: vehicles.length,
                onMapCount,
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span
            className={
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 ' +
              (liveQuery.isError
                ? 'bg-destructive/10 text-destructive'
                : 'bg-success/10 text-success')
            }
          >
            <Activity className="h-3 w-3" />
            {liveQuery.isError ? t('etit.header.liveOffline') : t('etit.header.live')}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 border-b bg-destructive/5 px-4 py-2">
          <Card className="border-destructive/30 bg-transparent shadow-none">
            <CardContent className="flex items-start gap-2 p-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs">
                {extractErrorMessage(error, t('etit.errors.proxyUnreachable'))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Vehicle list — desktop sidebar */}
        {isDesktop && (
          <div className="hidden h-full w-72 shrink-0 lg:block">{vehicleList}</div>
        )}

        {/* Vehicle list — mobile sheet */}
        {!isDesktop && (
          <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
            <SheetContent side="left" className="w-80 max-w-[85vw] p-0" hideCloseButton>
              <div className="h-dvh">{vehicleList}</div>
            </SheetContent>
          </Sheet>
        )}

        {/* Center — map */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <EtitMap
              vehicles={vehicles}
              liveStatuses={liveStatuses}
              focusedVehicleId={focusedId}
              route={route}
              stops={history?.stops ?? []}
              sensors={history?.sensors ?? []}
              playback={playbackState}
              focusBump={focusBump}
              height="100%"
              className="absolute inset-0"
            />
          </div>

          {/* Mobile-only: bottom controls strip. Desktop has the right pane. */}
          {!isDesktop && (
            <div className="shrink-0 space-y-2 border-t bg-background p-2">
              <EtitHistoryControls
                vehicle={selectedVehicle}
                history={history}
                summary={summary}
                range={range}
                onRangeChange={setRange}
                onLoad={handleLoad}
                loading={historyQuery.isFetching || summaryQuery.isFetching}
              />
              {history && (
                <EtitPlaybackPlayer
                  points={history.points}
                  stops={history.stops}
                  sensors={history.sensors}
                  onStateChange={handlePlaybackChange}
                />
              )}
            </div>
          )}
        </div>

        {/* Right pane — desktop only */}
        {isDesktop && (
          <aside className="hidden h-full w-[360px] shrink-0 flex-col gap-3 overflow-y-auto border-s bg-background p-3 xl:flex">
            <EtitHistoryControls
              vehicle={selectedVehicle}
              history={history}
              summary={summary}
              range={range}
              onRangeChange={setRange}
              onLoad={handleLoad}
              loading={historyQuery.isFetching || summaryQuery.isFetching}
            />
            {history && (
              <EtitPlaybackPlayer
                points={history.points}
                stops={history.stops}
                sensors={history.sensors}
                onStateChange={handlePlaybackChange}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default EtitPage;
