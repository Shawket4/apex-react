import * as React from 'react';
import { MapView } from '@/shared/ui/map-view';
import type { MapMarker, MapCircle } from '@/shared/lib/maps/types';
import type { Zone } from '@/entities/zone';

interface ZoneMapPickerProps {
  lat: number;
  lng: number;
  radius_m: number;
  onPositionChange: (lat: number, lng: number) => void;
  otherZones?: Zone[];
}

export function ZoneMapPicker({
  lat,
  lng,
  radius_m,
  onPositionChange,
  otherZones = [],
}: ZoneMapPickerProps) {
  const hasPosition = lat !== 0 || lng !== 0;

  const handleMapClick = React.useCallback(
    (newLat: number, newLng: number) => {
      onPositionChange(newLat, newLng);
    },
    [onPositionChange]
  );

  const handleMarkerDragEnd = React.useCallback(
    (id: string, newLat: number, newLng: number) => {
      if (id === 'active-zone') {
        onPositionChange(newLat, newLng);
      }
    },
    [onPositionChange]
  );

  const markers: MapMarker[] = React.useMemo(() => {
    if (!hasPosition) return [];
    return [
      {
        id: 'active-zone',
        lat,
        lng,
        color: '#dc2626', // Red pin for active
        draggable: true,
        affectsBounds: true,
      },
    ];
  }, [lat, lng, hasPosition]);

  const circles: MapCircle[] = React.useMemo(() => {
    const list: MapCircle[] = [];

    // Other zones (faint)
    otherZones.forEach((z) => {
      list.push({
        id: `other-${z.id}`,
        lat: z.lat,
        lng: z.lng,
        radius_m: z.radius_m,
        color: '#9ca3af', // Gray
        fillOpacity: 0.1,
      });
    });

    // Active zone (if set)
    if (hasPosition) {
      list.push({
        id: 'active-zone-circle',
        lat,
        lng,
        radius_m,
        color: '#dc2626',
        fillOpacity: 0.2,
      });
    }

    return list;
  }, [lat, lng, radius_m, hasPosition, otherZones]);

  return (
    <div className="h-[400px] w-full rounded-md border overflow-hidden">
      <MapView
        markers={markers}
        circles={circles}
        onMapClick={handleMapClick}
        onMarkerDragEnd={handleMarkerDragEnd}
        centerFallback={hasPosition ? [lat, lng] : [30.0444, 31.2357]}
        liveUpdates={true}
      />
    </div>
  );
}
