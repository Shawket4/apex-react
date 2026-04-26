// src/entities/trip/ui/trip-location-dialog.tsx
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Navigation, ExternalLink } from 'lucide-react';
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
import { useTripDetails } from '@/entities/trip/queries';
import { decodePolyline } from '@/entities/trip-summary/api';
import { format, formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { isValidCoordinate } from '@/shared/lib/coords';
import type { MapMarker } from '@/shared/ui/map-view';

const LazyMapView = React.lazy(() => 
  import('@/shared/ui/map-view').then((mod) => ({ default: mod.MapView }))
);

interface TripLocationDialogProps {
  tripId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripLocationDialog({
  tripId,
  open,
  onOpenChange,
}: TripLocationDialogProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useTripDetails(open ? tripId : null);

  const trip = data?.data;
  const rawTerminalLocation = data?.terminal_location;
  const rawDropOffLocation = data?.drop_off_point_location;
  const routeData = data?.route_data;

  // Intercept bad coordinates immediately
  React.useEffect(() => {
    if (open && data && !isLoading) {
      if (!isValidCoordinate(rawDropOffLocation?.lat, rawDropOffLocation?.lng)) {
        toast.error(t('trips.location.invalidCoordinates'));
        onOpenChange(false);
      }
    }
  }, [open, data, isLoading, rawDropOffLocation, onOpenChange, t]);

  // Decode route first, because we use it to snap the markers
  const route: Array<[number, number]> = React.useMemo(() => {
    if (routeData?.geometry) {
      try { return decodePolyline(routeData.geometry); } catch { return []; }
    } else if (routeData?.coordinates?.length) {
      return routeData.coordinates.map(([lng, lat]) => [lat, lng]);
    }
    return [];
  }, [routeData]);

  // Snap markers to the exact ends of the polyline if a route exists
  const markers: MapMarker[] = React.useMemo(() => {
    const arr: MapMarker[] = [];
    
    const terminalLat = route.length > 0 ? route[0][0] : Number(rawTerminalLocation?.lat);
    const terminalLng = route.length > 0 ? route[0][1] : Number(rawTerminalLocation?.lng);
    
    const dropoffLat = route.length > 0 ? route[route.length - 1][0] : Number(rawDropOffLocation?.lat);
    const dropoffLng = route.length > 0 ? route[route.length - 1][1] : Number(rawDropOffLocation?.lng);

    if (isValidCoordinate(terminalLat, terminalLng)) {
      arr.push({
        id: 'terminal',
        lat: terminalLat,
        lng: terminalLng,
        color: '#16A34A',
        title: t('trips.fields.terminal'),
        popupHtml: `
          <div style="min-width: 150px; font-family: inherit;">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 2px;">
              ${t('trips.fields.terminal')}
            </div>
            <div style="font-size: 14px; font-weight: 500; color: inherit;">
              ${trip?.terminal ?? '—'}
            </div>
          </div>
        `
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
          <div style="min-width: 150px; font-family: inherit;">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 2px;">
              ${t('trips.fields.dropOffPoint')}
            </div>
            <div style="font-size: 14px; font-weight: 500; color: inherit;">
              ${trip?.drop_off_point ?? '—'}
            </div>
          </div>
        `
      });
    }
    return arr;
  }, [rawTerminalLocation, rawDropOffLocation, route, trip, t]);

  const distance = trip ? trip.mileage || trip.distance || 0 : 0;
  const duration = routeData?.duration ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('trips.location.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {trip ? `${trip.terminal} → ${trip.drop_off_point}` : t('trips.location.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : trip ? (
            <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-4">
              <Field label={t('trips.fields.date')} value={format(trip.date, 'PPP')} />
              <Field label={t('trips.fields.vehicle')} value={trip.car_no_plate} />
              <Field label={t('trips.fields.distance')} value={`${formatNumber(distance, 1)} km`} />
              <Field label={t('trips.fields.duration')} value={duration > 0 ? `${Math.round(duration / 60)} min` : '—'} />
            </div>
          ) : null}

          <div className="relative h-[400px] overflow-hidden rounded-md border bg-muted/30">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {isError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground bg-background">
                <MapPin className="h-6 w-6" />
                {t('trips.location.loadFailed')}
              </div>
            )}
            
            {!isLoading && !isError && (
              <React.Suspense 
                fallback={
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <LazyMapView markers={markers} route={route} className="h-full w-full" />
              </React.Suspense>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
              {t('trips.location.terminal')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
              {t('trips.location.dropOff')}
            </span>
            {route.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-4 bg-[#3b82f6]" />
                {t('trips.location.route')}
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {isValidCoordinate(rawTerminalLocation?.lat, rawTerminalLocation?.lng) && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={`https://www.google.com/maps/search/?api=1&query=${rawTerminalLocation!.lat},${rawTerminalLocation!.lng}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('trips.location.openTerminal')}
                </a>
              </Button>
            )}
            
            {isValidCoordinate(rawDropOffLocation?.lat, rawDropOffLocation?.lng) && (
               <Button asChild variant="outline" size="sm" className="gap-1.5">
                 <a href={`https://www.google.com/maps/search/?api=1&query=${rawDropOffLocation!.lat},${rawDropOffLocation!.lng}`} target="_blank" rel="noopener noreferrer">
                   <ExternalLink className="h-3.5 w-3.5" />
                   {t('trips.location.openDropoff')}
                 </a>
               </Button>
            )}

            {isValidCoordinate(rawTerminalLocation?.lat, rawTerminalLocation?.lng) && isValidCoordinate(rawDropOffLocation?.lat, rawDropOffLocation?.lng) && (
              <Button asChild variant="default" size="sm" className="gap-1.5">
                <a href={`https://www.google.com/maps/dir/?api=1&origin=${rawTerminalLocation!.lat},${rawTerminalLocation!.lng}&destination=${rawDropOffLocation!.lat},${rawDropOffLocation!.lng}`} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-3.5 w-3.5" />
                  {t('trips.location.openRoute')}
                </a>
              </Button>
            )}
          </div>

          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}