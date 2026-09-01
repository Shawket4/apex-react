import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Car, Clock, Ruler } from 'lucide-react';

import { toast } from '@/shared/ui/toast';
import { RouteMapDialog, type RouteFact } from '@/widgets/route-map-dialog/route-map-dialog';
import { useTripDetails } from '@/entities/trip/queries';
import { decodePolyline } from '@/entities/trip-summary/api';
import { format, formatNumber } from '@/shared/lib/format';
import { asValidCoord } from '@/shared/lib/coords';

interface TripLocationDialogProps {
  tripId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * A trip's route on the map.
 *
 * A thin wrapper over RouteMapDialog, which the fee-mappings screen also uses.
 * Everything about how a route is drawn — the coordinate state matrix, the
 * suppressed line when only one end is pinned, the legend, the external links —
 * lives there, so the two screens cannot drift into showing it differently.
 *
 * What stays here is what is specific to a trip: its facts row, its marker
 * popups, and the toast-and-close when a trip has no usable coordinates at all.
 */
export function TripLocationDialog({ tripId, open, onOpenChange }: TripLocationDialogProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useTripDetails(open ? tripId : null);

  const trip = data?.data;
  const rawTerminal = data?.terminal_location;
  const rawDropoff = data?.drop_off_point_location;
  const routeData = data?.route_data;

  const terminalCoord = asValidCoord(rawTerminal?.lat, rawTerminal?.lng);
  const dropoffCoord = asValidCoord(rawDropoff?.lat, rawDropoff?.lng);

  // A trip with neither end pinned is a data problem, not something to draw.
  // Done in an effect rather than during render so the toast does not fire
  // mid-commit; the dialog flashes for a frame, which beats pre-fetching
  // details for every row in the list.
  const noneValid =
    !isLoading && !isError && data != null && !terminalCoord && !dropoffCoord;
  React.useEffect(() => {
    if (open && noneValid) {
      toast.error(t('trips.location.bothInvalidCoords'));
      onOpenChange(false);
    }
  }, [open, noneValid, t, onOpenChange]);

  const route = React.useMemo<Array<[number, number]>>(() => {
    if (routeData?.geometry) {
      try {
        return decodePolyline(routeData.geometry);
      } catch {
        return [];
      }
    }
    return (routeData?.coordinates as Array<[number, number]>) ?? [];
  }, [routeData]);

  const distance = trip ? trip.mileage || trip.distance || 0 : 0;
  const durationMin = routeData?.duration ? Math.round(routeData.duration / 60) : 0;

  const facts: RouteFact[] = trip
    ? [
        {
          icon: <Calendar className="h-3 w-3" />,
          label: t('trips.fields.date'),
          value: format(trip.date, 'd MMM yyyy'),
        },
        {
          icon: <Car className="h-3 w-3" />,
          label: t('trips.fields.vehicle'),
          value: trip.car_no_plate,
        },
        {
          icon: <Ruler className="h-3 w-3" />,
          label: t('trips.fields.distance'),
          value: `${formatNumber(distance, 1)} km`,
        },
        {
          icon: <Clock className="h-3 w-3" />,
          label: t('trips.fields.duration'),
          value: durationMin > 0 ? `${durationMin} min` : '—',
        },
      ]
    : [];

  return (
    <RouteMapDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('trips.location.dialogTitle')}
      subtitle={
        trip
          ? `${trip.terminal} → ${trip.drop_off_point}`
          : t('trips.location.dialogDescription')
      }
      facts={facts}
      terminal={rawTerminal}
      dropoff={rawDropoff}
      route={route}
      terminalLabel={t('trips.fields.terminal')}
      dropoffLabel={t('trips.fields.dropOffPoint')}
      terminalPopupHtml={buildPopupHtml({
        color: '#16A34A',
        bg: '#dcfce7',
        label: t('trips.fields.terminal'),
        value: trip?.terminal ?? '—',
      })}
      dropoffPopupHtml={buildPopupHtml({
        color: '#DC2626',
        bg: '#fee2e2',
        label: t('trips.fields.dropOffPoint'),
        value: trip?.drop_off_point ?? '—',
      })}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
    />
  );
}

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
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:hsl(var(--muted-foreground));margin:0 0 3px;font-weight:500">${escapeHtml(label)}</p>
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
