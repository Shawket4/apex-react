import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, MapPin, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { extractErrorMessage } from '@/shared/api/errors';
import { isValidCoordinate, DEFAULT_MAP_CENTER } from '@/shared/lib/coords';
import { MapView } from '@/shared/ui/map-view';
import { useSetFeeMappingLocation } from '@/entities/fee-mapping/queries';
import type { FeeMapping } from '@/entities/fee-mapping/schemas';
import type { MapMarker } from '@/shared/lib/maps/types';
import { formatNumber } from '@/shared/lib/format';

interface FeeMappingLocationDialogProps {
  mapping: FeeMapping | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Click-to-place location picker for a single fee mapping.
 *
 * Three input methods:
 *  1. Click anywhere on the map → marker drops there
 *  2. Drag the marker → coords update on dragend
 *  3. Type coords directly into the lat/lng inputs
 *
 * On save, the backend re-runs OSRM and returns enriched data; the query
 * cache is patched in-place via the mutation's onSuccess so the table
 * shows updated distance/duration without a full refetch.
 */
export function FeeMappingLocationDialog({
  mapping,
  onOpenChange,
}: FeeMappingLocationDialogProps) {
  const { t } = useTranslation();
  const open = mapping !== null;

  const [lat, setLat] = React.useState('');
  const [lng, setLng] = React.useState('');
  const setLocation = useSetFeeMappingLocation();

  // Hydrate inputs whenever a new mapping arrives
  React.useEffect(() => {
    if (mapping) {
      setLat(mapping.lat != null ? String(mapping.lat) : '');
      setLng(mapping.lng != null ? String(mapping.lng) : '');
    } else {
      setLat('');
      setLng('');
    }
  }, [mapping]);

  const numericLat = Number(lat);
  const numericLng = Number(lng);
  const coordValid = isValidCoordinate(numericLat, numericLng);

  // Marker shown on the map — only when we have a valid coord
  const markers = React.useMemo<MapMarker[]>(() => {
    if (!coordValid) return [];
    return [
      {
        id: 'pickup',
        lat: numericLat,
        lng: numericLng,
        color: '#2563EB',
        title: mapping?.dropOffPoint,
        draggable: true,
      },
    ];
  }, [coordValid, numericLat, numericLng, mapping]);

  // Centre fallback uses the existing coord if any, else Cairo
  const centerFallback = React.useMemo<[number, number]>(() => {
    if (coordValid) return [numericLat, numericLng];
    return DEFAULT_MAP_CENTER;
  }, [coordValid, numericLat, numericLng]);

  const handleMapClick = React.useCallback((clickLat: number, clickLng: number) => {
    setLat(clickLat.toFixed(6));
    setLng(clickLng.toFixed(6));
  }, []);

  const handleMarkerDragEnd = React.useCallback((_id: string, dragLat: number, dragLng: number) => {
    setLat(dragLat.toFixed(6));
    setLng(dragLng.toFixed(6));
  }, []);

  const handleSave = async () => {
    if (!mapping) return;
    if (!coordValid) {
      toast.error(t('feeMappings.location.invalidCoords'));
      return;
    }
    try {
      await setLocation.mutateAsync({
        id: mapping.id,
        lat: numericLat,
        lng: numericLng,
      });
      toast.success(t('feeMappings.location.saveSuccess'));
      onOpenChange(false);
    } catch (err) {
      toast.error(
        extractErrorMessage(err, t('feeMappings.location.saveFailed')),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t('feeMappings.location.title')}
          </DialogTitle>
          <DialogDescription className="truncate">
            {mapping
              ? `${mapping.company} · ${mapping.terminal} → ${mapping.dropOffPoint}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          {/* Coord inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="loc-lat" className="text-xs">
                {t('feeMappings.location.latitude')}
              </Label>
              <Input
                id="loc-lat"
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="30.044420"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="loc-lng" className="text-xs">
                {t('feeMappings.location.longitude')}
              </Label>
              <Input
                id="loc-lng"
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="31.235712"
                className="font-mono"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t('feeMappings.location.hint')}
          </p>

          {/* Map */}
          <div className="h-[360px] overflow-hidden rounded-lg border">
            <MapView
              markers={markers}
              centerFallback={centerFallback}
              onMapClick={handleMapClick}
              onMarkerDragEnd={handleMarkerDragEnd}
              className="h-full w-full"
            />
          </div>

          {/* Existing OSRM info (read-only context) */}
          {mapping && mapping.osrmDistanceKm != null && (
            <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-2 text-xs">
              <div>
                <div className="text-muted-foreground">
                  {t('feeMappings.fields.distanceManual')}
                </div>
                <div className="font-semibold tabular-nums">
                  {formatNumber(mapping.distance, 2)} km
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">
                  {t('feeMappings.fields.osrmDistance')}
                </div>
                <div className="font-semibold tabular-nums">
                  {formatNumber(mapping.osrmDistanceKm, 2)} km
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">
                  {t('feeMappings.fields.osrmDuration')}
                </div>
                <div className="font-semibold tabular-nums">
                  {mapping.osrmDurationMin != null
                    ? `${mapping.osrmDurationMin.toFixed(0)} min`
                    : '—'}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!coordValid || setLocation.isPending}
          >
            {setLocation.isPending ? (
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-1.5 h-4 w-4" />
            )}
            {t('feeMappings.location.saveAndEnrich')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
