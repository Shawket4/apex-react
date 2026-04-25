import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import type { Map } from 'leaflet';
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

interface TripLocationDialogProps {
  tripId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Map dialog showing terminal + drop-off + route line for a single trip.
 *
 * Loads Leaflet on demand (dynamic import) so we don't pay the bundle cost
 * unless the user actually opens a map. The map ref is reset whenever the
 * dialog re-opens with a different trip.
 *
 * Pickup marker is green (terminal), drop-off is red (destination), route is
 * a blue polyline if the backend returned route_data with a geometry.
 */
export function TripLocationDialog({
  tripId,
  open,
  onOpenChange,
}: TripLocationDialogProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useTripDetails(open ? tripId : null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<Map | null>(null);

  const trip = data?.data;
  const terminalLocation = data?.terminal_location;
  const dropOffLocation = data?.drop_off_point_location;
  const routeData = data?.route_data;

  // Load + render map when dialog opens with details
  React.useEffect(() => {
    if (!open || !containerRef.current || !data) return;

    let cancelled = false;
    let map: Map | null = null;

    const renderMap = async () => {
      const L = (await import('leaflet')).default ?? (await import('leaflet'));
      // Side-effect CSS import — leaflet's stylesheet
      await import('leaflet/dist/leaflet.css').catch(() => {
        /* CSS may already be imported globally */
      });
      if (cancelled || !containerRef.current) return;

      // Remove any existing map instance from a previous trip
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const points: Array<[number, number]> = [];

      // Center: prefer terminal, fall back to drop-off, then [0, 0]
      const center: [number, number] =
        terminalLocation && terminalLocation.lat && terminalLocation.lng
          ? [terminalLocation.lat, terminalLocation.lng]
          : dropOffLocation && dropOffLocation.lat && dropOffLocation.lng
            ? [dropOffLocation.lat, dropOffLocation.lng]
            : [30.0444, 31.2357]; // Cairo as a reasonable default

      const leafletMap = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(center, 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(leafletMap);

      // Terminal (pickup) marker — green
      if (terminalLocation && terminalLocation.lat && terminalLocation.lng) {
        const greenIcon = L.divIcon({
          html: `<div style="background:#16A34A;border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 0 0 2px #16A34A40"></div>`,
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([terminalLocation.lat, terminalLocation.lng], { icon: greenIcon })
          .addTo(leafletMap)
          .bindPopup(`<b>${t('trips.fields.terminal')}</b><br>${trip?.terminal ?? ''}`);
        points.push([terminalLocation.lat, terminalLocation.lng]);
      }

      // Drop-off marker — red
      if (dropOffLocation && dropOffLocation.lat && dropOffLocation.lng) {
        const redIcon = L.divIcon({
          html: `<div style="background:#DC2626;border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 0 0 2px #DC262640"></div>`,
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([dropOffLocation.lat, dropOffLocation.lng], { icon: redIcon })
          .addTo(leafletMap)
          .bindPopup(
            `<b>${t('trips.fields.dropOffPoint')}</b><br>${trip?.drop_off_point ?? ''}`,
          );
        points.push([dropOffLocation.lat, dropOffLocation.lng]);
      }

      // Route polyline (if the backend gave us geometry)
      if (routeData?.geometry) {
        try {
          const decoded = decodePolyline(routeData.geometry);
          if (decoded.length > 0) {
            L.polyline(decoded, {
              color: '#1F4DC0',
              weight: 4,
              opacity: 0.75,
            }).addTo(leafletMap);
            // Use the route as the bounds source — usually wider than just markers
            points.push(...decoded);
          }
        } catch (err) {
          // Polyline decode failures shouldn't crash the map — log + carry on
          console.warn('Failed to decode polyline:', err);
        }
      } else if (routeData?.coordinates && routeData.coordinates.length > 0) {
        // Fall back to raw coords array if backend gave us [[lng, lat], ...]
        // OSRM returns coordinates as [lng, lat], we need [lat, lng] for Leaflet
        const coords = routeData.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
        L.polyline(coords, { color: '#1F4DC0', weight: 4, opacity: 0.75 }).addTo(leafletMap);
        points.push(...coords);
      }

      // Fit bounds to all points
      if (points.length > 1) {
        const bounds = L.latLngBounds(points);
        leafletMap.fitBounds(bounds, { padding: [40, 40] });
      } else if (points.length === 1) {
        leafletMap.setView(points[0], 13);
      }

      map = leafletMap;
      mapRef.current = leafletMap;
    };

    void renderMap();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data]);

  // Tear down the map when the dialog closes
  React.useEffect(() => {
    if (!open && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, [open]);

  const distance = trip ? trip.mileage || trip.distance || 0 : 0;
  const duration = routeData?.duration ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('trips.location.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {trip
              ? `${trip.terminal} → ${trip.drop_off_point}`
              : t('trips.location.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Trip header */}
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : trip ? (
            <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-4">
              <Field
                label={t('trips.fields.date')}
                value={format(trip.date, 'PPP')}
              />
              <Field label={t('trips.fields.vehicle')} value={trip.car_no_plate} />
              <Field
                label={t('trips.fields.distance')}
                value={`${formatNumber(distance, 1)} km`}
              />
              <Field
                label={t('trips.fields.duration')}
                value={
                  duration > 0
                    ? `${Math.round(duration / 60)} min`
                    : '—'
                }
              />
            </div>
          ) : null}

          {/* Map */}
          <div className="relative h-[400px] overflow-hidden rounded-md border bg-muted/30">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {isError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-6 w-6" />
                {t('trips.location.loadFailed')}
              </div>
            )}
            {!isLoading &&
              !isError &&
              !terminalLocation &&
              !dropOffLocation && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-6 w-6" />
                  {t('trips.location.noCoordinates')}
                </div>
              )}
            <div ref={containerRef} className="h-full w-full" />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" />
              {t('trips.location.terminal')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              {t('trips.location.dropOff')}
            </span>
            {(routeData?.geometry || (routeData?.coordinates && routeData.coordinates.length > 0)) && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 bg-primary" />
                {t('trips.location.route')}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          {trip && terminalLocation && dropOffLocation && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="me-auto gap-1.5"
            >
              <a
                href={`https://www.google.com/maps/dir/${terminalLocation.lat},${terminalLocation.lng}/${dropOffLocation.lat},${dropOffLocation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation className="h-3.5 w-3.5" />
                {t('trips.location.openInGoogleMaps')}
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
