import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Car,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Ruler,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Separator } from '@/shared/ui/separator';
import { useTripDetails } from '@/entities/trip/queries';
import { decodePolyline } from '@/entities/trip-summary/api';
import { format, formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import {
  asValidCoord,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
} from '@/shared/lib/coords';
import { MapView } from '@/shared/ui/map-view';
import type { MapMarker } from '@/shared/lib/maps/types';

/* -------------------------------------------------------------------------- */

interface TripLocationDialogProps {
  tripId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Trip location dialog.
 *
 * Coord state matrix:
 *
 *   Both valid    → render terminal + drop-off + route polyline; both
 *                   external links + a directions link in the footer
 *   One valid     → render only the valid marker; SUPPRESS route polyline
 *                   (drawing a line to (0,0) would mislead). Show an amber
 *                   warning banner explaining the trip lacks a complete
 *                   pair of coordinates
 *   Both invalid  → toast an error and auto-close the dialog. The dialog
 *                   briefly mounts (one render cycle) because we can only
 *                   know the coords after the trip-details query resolves
 *
 * Geometry is sourced from the backend's encoded polyline (or coordinates
 * array fallback). We never compute it from Google's DirectionsService.
 */
export function TripLocationDialog({
  tripId,
  open,
  onOpenChange,
}: TripLocationDialogProps) {
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useTripDetails(
    open ? tripId : null,
  );

  const trip = data?.data;
  const rawTerminal = data?.terminal_location;
  const rawDropoff = data?.drop_off_point_location;
  const routeData = data?.route_data;

  /* -------- Coordinate validation ------------------------------------- */

  const terminalCoord = asValidCoord(rawTerminal?.lat, rawTerminal?.lng);
  const dropoffCoord = asValidCoord(rawDropoff?.lat, rawDropoff?.lng);
  const bothValid = terminalCoord !== null && dropoffCoord !== null;
  const oneValid = (terminalCoord === null) !== (dropoffCoord === null);
  const noneValid =
    !isLoading && !isError && data != null && !terminalCoord && !dropoffCoord;

  // If both endpoints are invalid, toast + close. We do this in an effect
  // so we don't fire toasts during render. The dialog will flash for one
  // frame before closing — acceptable, since the alternative requires
  // pre-fetching trip details on every list render.
  React.useEffect(() => {
    if (open && noneValid) {
      toast.error(t('trips.location.bothInvalidCoords'));
      onOpenChange(false);
    }
  }, [open, noneValid, t, onOpenChange]);

  /* -------- Decode route geometry ------------------------------------- */

  const route = React.useMemo<Array<[number, number]>>(() => {
    if (routeData?.geometry) {
      try {
        return decodePolyline(routeData.geometry);
      } catch {
        return [];
      }
    }
    if (routeData?.coordinates?.length) {
      // OSRM convention: [lng, lat]; Leaflet/Google use [lat, lng]
      return routeData.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
      );
    }
    return [];
  }, [routeData]);

  /* -------- Build markers --------------------------------------------- */

  const markers = React.useMemo<MapMarker[]>(() => {
    const arr: MapMarker[] = [];
    if (terminalCoord) {
      arr.push({
        id: 'terminal',
        lat: terminalCoord[0],
        lng: terminalCoord[1],
        color: '#16A34A',
        title: t('trips.fields.terminal'),
        popupHtml: buildPopupHtml({
          color: '#16A34A',
          bg: '#dcfce7',
          label: t('trips.fields.terminal'),
          value: trip?.terminal ?? '—',
        }),
      });
    }
    if (dropoffCoord) {
      arr.push({
        id: 'dropoff',
        lat: dropoffCoord[0],
        lng: dropoffCoord[1],
        color: '#DC2626',
        title: t('trips.fields.dropOffPoint'),
        popupHtml: buildPopupHtml({
          color: '#DC2626',
          bg: '#fee2e2',
          label: t('trips.fields.dropOffPoint'),
          value: trip?.drop_off_point ?? '—',
        }),
      });
    }
    return arr;
  }, [terminalCoord, dropoffCoord, trip, t]);

  /* -------- External links -------------------------------------------- */

  const terminalUrl = terminalCoord
    ? googleMapsSearchUrl(terminalCoord[0], terminalCoord[1])
    : null;
  const dropoffUrl = dropoffCoord
    ? googleMapsSearchUrl(dropoffCoord[0], dropoffCoord[1])
    : null;
  const directionsUrl = googleMapsDirectionsUrl(terminalCoord, dropoffCoord);

  /* -------- Derived stats --------------------------------------------- */

  const distance = trip ? trip.mileage || trip.distance || 0 : 0;
  const durationMin = routeData?.duration
    ? Math.round(routeData.duration / 60)
    : 0;

  /* -------- Render ---------------------------------------------------- */

  const subtitle = trip
    ? `${trip.terminal} → ${trip.drop_off_point}`
    : t('trips.location.dialogDescription');

  // Don't render the map at all if we know we're about to close due to
  // both-invalid; saves a frame of GoogleMaps init that we'd just throw away
  const showMap = !isLoading && !isError && !noneValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t('trips.location.dialogTitle')}
          </DialogTitle>
          <DialogDescription className="truncate">{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {/* Stats row */}
          {isLoading ? (
            <StatsSkeleton />
          ) : trip ? (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
              <StatField
                icon={<Calendar className="h-3.5 w-3.5" />}
                label={t('trips.fields.date')}
                value={format(trip.date, 'PPP')}
              />
              <StatField
                icon={<Car className="h-3.5 w-3.5" />}
                label={t('trips.fields.vehicle')}
                value={trip.car_no_plate}
              />
              <StatField
                icon={<Ruler className="h-3.5 w-3.5" />}
                label={t('trips.fields.distance')}
                value={`${formatNumber(distance, 1)} km`}
              />
              <StatField
                icon={<Clock className="h-3.5 w-3.5" />}
                label={t('trips.fields.duration')}
                value={durationMin > 0 ? `${durationMin} min` : '—'}
              />
            </div>
          ) : null}

          {/* Partial-coord warning — only shown when exactly one endpoint
              is valid. Suppresses the route polyline below. */}
          {showMap && oneValid && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1 space-y-0.5">
                <div className="font-semibold">
                  {t('trips.location.partialRoute.title')}
                </div>
                <div className="text-foreground/80">
                  {terminalCoord
                    ? t('trips.location.partialRoute.missingDropoff')
                    : t('trips.location.partialRoute.missingTerminal')}
                </div>
              </div>
            </div>
          )}

          {/* Map */}
          <div className="relative h-[380px] shrink-0 overflow-hidden rounded-lg border bg-muted/30">
            {isLoading && <MapLoadingState />}

            {isError && (
              <MapErrorState
                message={t('trips.location.loadFailed')}
                onRetry={() => void refetch()}
              />
            )}

            {showMap && (
              <MapView
                markers={markers}
                route={route}
                suppressRoute={oneValid /* don't draw line to a missing endpoint */}
                className="h-full w-full"
              />
            )}

            {/* Legend */}
            {showMap && markers.length > 0 && (
              <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-3 rounded-md border bg-background/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                {terminalCoord && (
                  <LegendDot color="#16A34A" label={t('trips.location.terminal')} />
                )}
                {dropoffCoord && (
                  <LegendDot color="#DC2626" label={t('trips.location.dropOff')} />
                )}
                {route.length > 0 && bothValid && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-0.5 w-4 rounded-full bg-blue-500" />
                    {t('trips.location.route')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer — per-marker external links + directions */}
        <div className="shrink-0 border-t">
          <DialogFooter className="flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {terminalUrl && (
                <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <a href={terminalUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    {t('trips.location.openTerminal')}
                  </a>
                </Button>
              )}
              {dropoffUrl && (
                <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <a href={dropoffUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    {t('trips.location.openDropoff')}
                  </a>
                </Button>
              )}
              {directionsUrl && (
                <>
                  <Separator orientation="vertical" className="h-6 self-center" />
                  <Button asChild variant="default" size="sm" className="h-8 gap-1.5 text-xs">
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation className="h-3 w-3" />
                      {t('trips.location.openRoute')}
                    </a>
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

interface StatFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}

function StatField({ icon, label, value, className }: StatFieldProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex gap-4 rounded-lg border bg-muted/30 p-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-1 items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="h-2.5 w-2.5 rounded-full ring-2 ring-background"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function MapErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

function MapLoadingState() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="text-xs">Loading map…</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Popup HTML builder                                                         */
/* -------------------------------------------------------------------------- */

interface PopupHtmlOptions {
  color: string;
  bg: string;
  label: string;
  value: string;
}

function buildPopupHtml({ color, bg, label, value }: PopupHtmlOptions): string {
  return `
    <div style="padding:18px 14px 12px;min-width:160px;font-family:inherit;text-align:center">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${bg};margin:0 auto 8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      </div>
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#71717a;margin:0 0 3px;font-weight:500">${escapeHtml(label)}</p>
      <p style="font-size:13px;font-weight:600;margin:0;line-height:1.3">${escapeHtml(value)}</p>
    </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
