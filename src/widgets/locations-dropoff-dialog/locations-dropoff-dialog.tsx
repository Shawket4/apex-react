import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Save, Sparkles, Trash2 } from 'lucide-react';
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
import { isValidCoordinate } from '@/shared/lib/coords';
import {
  DROPOFF_DEFAULT_RADIUS_M,
  type CreateDropoffPayload,
  type DropOffPoint,
  type UpdateDropoffPayload,
} from '@/entities/location/schemas';
import { useCreateDropoff, useUpdateDropoff } from '@/entities/location/queries';
import { LocationsMapPicker } from '../locations-map-picker';
import { PinSourceBadge } from '../locations-dropoffs-table/pin-source-badge';

interface LocationsDropoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit target. `null`/`undefined` switches the dialog to create mode. */
  dropoff?: DropOffPoint | null;
  /** Pre-placed pin, e.g. a GPS-suggested position from the inbox. */
  initialPin?: { lat: number; lng: number } | null;
  /** `pin_source` sent on save (edit mode). Defaults to `"manual"`. */
  pinSourceOnSave?: string;
  /** Extra context line under the title (e.g. "GPS suggests…"). */
  note?: React.ReactNode;
  /** Runs after a successful save (e.g. ack the GPS suggestion). */
  onSaved?: () => void | Promise<void>;
  /** Edit mode only — renders a delete button when provided. */
  onDelete?: (dropoff: DropOffPoint) => void;
}

/**
 * Drop-off point editor/creator. Same map interaction as the terminal
 * dialog (click to place, drag to adjust, manual coord entry) with a 300 m
 * default radius visualization. In the inbox "Review" flow the suggested
 * GPS position arrives via `initialPin` and saves with
 * `pin_source: "gps_suggested"`.
 */
export function LocationsDropoffDialog({
  open,
  onOpenChange,
  dropoff,
  initialPin,
  pinSourceOnSave = 'manual',
  note,
  onSaved,
  onDelete,
}: LocationsDropoffDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!dropoff;

  const createDropoff = useCreateDropoff();
  const updateDropoff = useUpdateDropoff();

  const [name, setName] = React.useState('');
  const [lat, setLat] = React.useState('');
  const [lng, setLng] = React.useState('');
  const [radius, setRadius] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setName(dropoff?.name ?? '');
    if (initialPin && isValidCoordinate(initialPin.lat, initialPin.lng)) {
      setLat(initialPin.lat.toFixed(6));
      setLng(initialPin.lng.toFixed(6));
    } else if (dropoff && isValidCoordinate(dropoff.lat, dropoff.long)) {
      setLat(String(dropoff.lat));
      setLng(String(dropoff.long));
    } else {
      setLat('');
      setLng('');
    }
    setRadius(dropoff?.radius_m != null ? String(dropoff.radius_m) : '');
  }, [open, dropoff, initialPin]);

  const numericLat = Number(lat);
  const numericLng = Number(lng);
  const coordValid =
    lat.trim() !== '' && lng.trim() !== '' && isValidCoordinate(numericLat, numericLng);

  const radiusOverride = radius.trim() === '' ? null : Number(radius);
  const radiusValid =
    radiusOverride === null || (Number.isFinite(radiusOverride) && radiusOverride > 0);
  const effectiveRadius = radiusOverride ?? DROPOFF_DEFAULT_RADIUS_M;

  const canSave = isEdit
    ? coordValid && radiusValid
    : name.trim() !== '' && radiusValid && (coordValid || (lat.trim() === '' && lng.trim() === ''));

  const saving = createDropoff.isPending || updateDropoff.isPending;

  const handlePositionChange = React.useCallback((newLat: number, newLng: number) => {
    setLat(newLat.toFixed(6));
    setLng(newLng.toFixed(6));
  }, []);

  const handleSave = async () => {
    if (!canSave) return;
    try {
      if (isEdit && dropoff) {
        const payload: UpdateDropoffPayload = {
          lat: Number(numericLat.toFixed(6)),
          long: Number(numericLng.toFixed(6)),
          pin_source: pinSourceOnSave,
        };
        if (radiusOverride !== null) {
          payload.radius_m = radiusOverride;
        } else if (dropoff.radius_m != null) {
          payload.clear_radius = true;
        }
        await updateDropoff.mutateAsync({ id: dropoff.ID, payload });
      } else {
        const payload: CreateDropoffPayload = { name: name.trim() };
        if (coordValid) {
          payload.lat = Number(numericLat.toFixed(6));
          payload.long = Number(numericLng.toFixed(6));
        }
        if (radiusOverride !== null) {
          payload.radius_m = radiusOverride;
        }
        await createDropoff.mutateAsync(payload);
      }
      await onSaved?.();
      onOpenChange(false);
    } catch {
      // Toast handled by the mutations
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {isEdit
              ? t('locations.dialog.editDropoff', 'Edit Drop-off Point')
              : t('locations.dialog.createDropoff', 'New Drop-off Point')}
          </DialogTitle>
          {isEdit && (
            <DialogDescription className="flex items-center gap-2 truncate" dir="auto">
              <span dir="auto" className="truncate">{dropoff?.name}</span>
              <PinSourceBadge pinSource={dropoff?.pin_source} />
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {note && (
            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">{note}</div>
            </div>
          )}

          {!isEdit && (
            <div className="space-y-1">
              <Label htmlFor="dropoff-name" className="text-xs">
                {t('locations.fields.name', 'Name')} *
              </Label>
              <Input
                id="dropoff-name"
                dir="auto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('locations.fields.dropoffNamePlaceholder', 'e.g. مخازن العاشر من رمضان')}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="dropoff-lat" className="text-xs">
                {t('locations.fields.lat', 'Latitude')}
              </Label>
              <Input
                id="dropoff-lat"
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="30.044420"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dropoff-lng" className="text-xs">
                {t('locations.fields.lng', 'Longitude')}
              </Label>
              <Input
                id="dropoff-lng"
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="31.235712"
                className="font-mono"
              />
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <Label htmlFor="dropoff-radius" className="text-xs">
                {t('locations.fields.radius', 'Radius (m)')}
              </Label>
              <Input
                id="dropoff-radius"
                type="number"
                step="1"
                min="1"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder={t('locations.fields.radiusDefaultPlaceholder', {
                  m: DROPOFF_DEFAULT_RADIUS_M,
                  defaultValue: 'Default ({{m}} m)',
                })}
                className="font-mono"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t(
              'locations.dialog.mapHelper',
              'Click the map or drag the marker to set the pin. Leave the radius empty to use the default.',
            )}
          </p>

          <LocationsMapPicker
            lat={coordValid ? numericLat : null}
            lng={coordValid ? numericLng : null}
            radiusM={effectiveRadius}
            radiusIsDefault={radiusOverride === null}
            onPositionChange={handlePositionChange}
            primaryTitle={isEdit ? dropoff?.name : name || undefined}
            className="h-[320px]"
          />
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-3 sm:justify-between">
          <div>
            {isEdit && dropoff && onDelete && (
              <Button
                variant="ghost"
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(dropoff)}
              >
                <Trash2 className="h-4 w-4" />
                {t('common.delete', 'Delete')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={!canSave || saving}>
              {saving ? (
                <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="me-1.5 h-4 w-4" />
              )}
              {isEdit ? t('common.save', 'Save') : t('common.create', 'Create')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
