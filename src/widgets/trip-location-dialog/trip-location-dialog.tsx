// src/entities/trip/ui/trip-location-dialog.tsx
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  MapPin,
  Navigation,
  ExternalLink,
  Calendar,
  Car,
  Ruler,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@/shared/ui/toaster';
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
import { isValidCoordinate } from '@/shared/lib/coords';
import type { MapMarker } from '@/shared/ui/map-view';

const LazyMapView = React.lazy(() =>
  import('@/shared/ui/map-view').then((mod) => ({ default: mod.MapView }))
);

// ─── Types ──────────────────────────────────────────────────────────────────────

interface TripLocationDialogProps {
  tripId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

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

function RouteLabel({ color, label }: { color: string; label: string }) {
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

// ─── Main Component ─────────────────────────────────────────────────────────────

export function TripLocationDialog({
  tripId,
  open,
  onOpenChange,
}: TripLocationDialogProps) {
  const { t } = useTranslation();
  const [mapError, setMapError] = React.useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useTripDetails(open ? tripId : null);

  const trip = data?.data;
  const rawTerminalLocation = data?.terminal_location;
  const rawDropOffLocation = data?.drop_off_point_location;
  const routeData = data?.route_data;

  // ── Validate coordinates ────────────────────────────────────────────────────
  // Show a toast and keep the dialog open in an error state rather than
  // dismissing it silently (which is confusing for the user).
  const hasValidDropoff = isValidCoordinate(
    rawDropOffLocation?.lat,
    rawDropOffLocation?.lng
  );
  const hasValidTerminal = isValidCoordinate(
    rawTerminalLocation?.lat,
    rawTerminalLocation?.lng
  );

  React.useEffect(() => {
    if (open && data && !isLoading && !hasValidDropoff) {
      toast.error(t('trips.location.invalidCoordinates'));
    }
  }, [open, data, isLoading, hasValidDropoff, t]);

  // ── Decode route ────────────────────────────────────────────────────────────
  const route = React.useMemo<Array<[number, number]>>(() => {
    if (routeData?.geometry) {
      try {
        return decodePolyline(routeData.geometry);
      } catch {
        return [];
      }
    }
    if (routeData?.coordinates?.length) {
      return routeData.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      );
    }
    return [];
  }, [routeData]);

  // ── Build markers ───────────────────────────────────────────────────────────
  const markers = React.useMemo<MapMarker[]>(() => {
    const arr: MapMarker[] = [];

    // Snap to polyline endpoints when a route exists for precision
    const terminalLat =
      route.length > 0 ? route[0][0] : Number(rawTerminalLocation?.lat);
    const terminalLng =
      route.length > 0 ? route[0][1] : Number(rawTerminalLocation?.lng);
    const dropoffLat =
      route.length > 0
        ? route[route.length - 1][0]
        : Number(rawDropOffLocation?.lat);
    const dropoffLng =
      route.length > 0
        ? route[route.length - 1][1]
        : Number(rawDropOffLocation?.lng);

    if (isValidCoordinate(terminalLat, terminalLng)) {
      arr.push({
        id: 'terminal',
        lat: terminalLat,
        lng: terminalLng,
        color: '#16A34A',
        title: t('trips.fields.terminal'),
        popupHtml: `
          <div style="
            padding: 20px 16px 14px;
            min-width: 170px;
            font-family: inherit;
            text-align: center;
          ">
            <div style="
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 28px; height: 28px;
              border-radius: 50%;
              background: #dcfce7;
              margin: 0 auto 8px;
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
              </svg>
            </div>
            <p style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#71717a;margin:0 0 3px;font-weight:500;">
              ${t('trips.fields.terminal')}
            </p>
            <p style="font-size:13px;font-weight:600;margin:0;color:inherit;line-height:1.3;">
              ${trip?.terminal ?? '—'}
            </p>
          </div>`,
      });
    }

    if (isValidCoordinate(dropoffLat, dropoffLng)) {
      arr.push({
        id: 'dropoff',
        lat: dropoffLat,
        lng: dropoffLng,
        color: '#DC2626',
        title: t('trips.fields.dropOffPoint'),
        popupHtml: `
          <div style="
            padding: 20px 16px 14px;
            min-width: 170px;
            font-family: inherit;
            text-align: center;
          ">
            <div style="
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 28px; height: 28px;
              border-radius: 50%;
              background: #fee2e2;
              margin: 0 auto 8px;
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
              </svg>
            </div>
            <p style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#71717a;margin:0 0 3px;font-weight:500;">
              ${t('trips.fields.dropOffPoint')}
            </p>
            <p style="font-size:13px;font-weight:600;margin:0;color:inherit;line-height:1.3;">
              ${trip?.drop_off_point ?? '—'}
            </p>
          </div>`,
      });
    }

    return arr;
  }, [rawTerminalLocation, rawDropOffLocation, route, trip, t]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const distance = React.useMemo(
    () => (trip ? trip.mileage || trip.distance || 0 : 0),
    [trip]
  );
  const durationMin = React.useMemo(
    () => (routeData?.duration ? Math.round(routeData.duration / 60) : 0),
    [routeData]
  );

  // ── Google Maps direct-link builders ───────────────────────────────────────
  const terminalMapsUrl = hasValidTerminal
    ? `https://www.google.com/maps/search/?api=1&query=${rawTerminalLocation!.lat},${rawTerminalLocation!.lng}`
    : null;
  const dropoffMapsUrl = hasValidDropoff
    ? `https://www.google.com/maps/search/?api=1&query=${rawDropOffLocation!.lat},${rawDropOffLocation!.lng}`
    : null;
  const directionsUrl =
    hasValidTerminal && hasValidDropoff
      ? `https://www.google.com/maps/dir/?api=1&origin=${rawTerminalLocation!.lat},${rawTerminalLocation!.lng}&destination=${rawDropOffLocation!.lat},${rawDropOffLocation!.lng}`
      : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  const showMap = !isLoading && !isError;
  const subtitle = trip
    ? `${trip.terminal} → ${trip.drop_off_point}`
    : t('trips.location.dialogDescription');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t('trips.location.dialogTitle')}
          </DialogTitle>
          <DialogDescription className="truncate">{subtitle}</DialogDescription>
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────────────────── */}
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

          {/* Map */}
          <div className="relative h-[380px] shrink-0 overflow-hidden rounded-lg border bg-muted/30">
            {isLoading && <MapLoadingState />}

            {isError && (
              <MapErrorState
                message={t('trips.location.loadFailed')}
                onRetry={() => void refetch()}
              />
            )}

            {!hasValidDropoff && !isLoading && !isError && (
              <MapErrorState message={t('trips.location.invalidCoordinates')} />
            )}

            {showMap && hasValidDropoff && (
              <React.Suspense fallback={<MapLoadingState />}>
                <LazyMapView
                  markers={markers}
                  route={route}
                  className="h-full w-full"
                  onError={() => setMapError(true)}
                />
                {mapError && (
                  <div className="absolute inset-0 z-20">
                    <MapErrorState
                      message={t('trips.location.loadFailed')}
                      onRetry={() => setMapError(false)}
                    />
                  </div>
                )}
              </React.Suspense>
            )}

            {/* Map legend — overlaid bottom-left */}
            {showMap && (markers.length > 0 || route.length > 0) && (
              <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-md border bg-background/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                {markers.some((m) => m.id === 'terminal') && (
                  <RouteLabel color="#16A34A" label={t('trips.location.terminal')} />
                )}
                {markers.some((m) => m.id === 'dropoff') && (
                  <RouteLabel color="#DC2626" label={t('trips.location.dropOff')} />
                )}
                {route.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-0.5 w-4 rounded-full bg-blue-500" />
                    {t('trips.location.route')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t">
          <DialogFooter className="flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* External links */}
            <div className="flex flex-wrap gap-2">
              {terminalMapsUrl && (
                <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <a href={terminalMapsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    {t('trips.location.openTerminal')}
                  </a>
                </Button>
              )}
              {dropoffMapsUrl && (
                <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <a href={dropoffMapsUrl} target="_blank" rel="noopener noreferrer">
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