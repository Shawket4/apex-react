import * as React from 'react';
import { MapView } from '@/shared/ui/map-view';
import type { MapCircle, MapMarker } from '@/shared/lib/maps/types';
import { DEFAULT_MAP_CENTER, isValidCoordinate } from '@/shared/lib/coords';
import { cn } from '@/shared/lib/cn';

export interface SecondaryPin {
  lat: number;
  lng: number;
  color?: string;
  title?: string;
}

interface LocationsMapPickerProps {
  lat: number | null;
  lng: number | null;
  /** Radius circle drawn around the primary pin. Omit/null for no circle. */
  radiusM?: number | null;
  /** Faint circle styling when the radius shown is the fallback default. */
  radiusIsDefault?: boolean;
  /** When set, map clicks and marker drags reposition the primary pin. */
  onPositionChange?: (lat: number, lng: number) => void;
  /** Extra pin (e.g. a GPS-suggested position) rendered alongside. */
  secondary?: SecondaryPin | null;
  primaryColor?: string;
  primaryTitle?: string;
  className?: string;
}

/**
 * Generalized location picker — the zones map picker pattern, reworked for
 * nullable pins (many drop-off points have none yet), a default-radius
 * visualization, and an optional second read-only pin for comparing a
 * stored position against a GPS-suggested one.
 */
export function LocationsMapPicker({
  lat,
  lng,
  radiusM,
  radiusIsDefault = false,
  onPositionChange,
  secondary,
  primaryColor = '#2563eb',
  primaryTitle,
  className,
}: LocationsMapPickerProps) {
  const hasPosition = isValidCoordinate(lat, lng);
  const editable = !!onPositionChange;

  const handleMapClick = React.useCallback(
    (newLat: number, newLng: number) => {
      onPositionChange?.(newLat, newLng);
    },
    [onPositionChange],
  );

  const handleMarkerDragEnd = React.useCallback(
    (id: string, newLat: number, newLng: number) => {
      if (id === 'primary-pin') {
        onPositionChange?.(newLat, newLng);
      }
    },
    [onPositionChange],
  );

  const markers: MapMarker[] = React.useMemo(() => {
    const list: MapMarker[] = [];
    if (hasPosition) {
      list.push({
        id: 'primary-pin',
        lat: lat as number,
        lng: lng as number,
        color: primaryColor,
        title: primaryTitle,
        draggable: editable,
        affectsBounds: true,
      });
    }
    if (secondary && isValidCoordinate(secondary.lat, secondary.lng)) {
      list.push({
        id: 'secondary-pin',
        lat: secondary.lat,
        lng: secondary.lng,
        color: secondary.color ?? '#16a34a',
        title: secondary.title,
        affectsBounds: true,
      });
    }
    return list;
  }, [hasPosition, lat, lng, primaryColor, primaryTitle, editable, secondary]);

  const circles: MapCircle[] = React.useMemo(() => {
    if (!hasPosition || radiusM == null || radiusM <= 0) return [];
    return [
      {
        id: 'primary-radius',
        lat: lat as number,
        lng: lng as number,
        radius_m: radiusM,
        color: primaryColor,
        fillOpacity: radiusIsDefault ? 0.08 : 0.2,
      },
    ];
  }, [hasPosition, lat, lng, radiusM, radiusIsDefault, primaryColor]);

  const centerFallback = React.useMemo<[number, number]>(() => {
    if (hasPosition) return [lat as number, lng as number];
    if (secondary && isValidCoordinate(secondary.lat, secondary.lng)) {
      return [secondary.lat, secondary.lng];
    }
    return DEFAULT_MAP_CENTER;
  }, [hasPosition, lat, lng, secondary]);

  return (
    <div className={cn('h-[360px] w-full overflow-hidden rounded-lg border', className)}>
      <MapView
        markers={markers}
        circles={circles}
        onMapClick={editable ? handleMapClick : undefined}
        onMarkerDragEnd={editable ? handleMarkerDragEnd : undefined}
        centerFallback={centerFallback}
        liveUpdates={true}
      />
    </div>
  );
}
