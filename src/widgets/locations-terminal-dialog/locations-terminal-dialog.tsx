import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Plus, Save, X } from 'lucide-react';
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
import { Badge } from '@/shared/ui/badge';
import { isValidCoordinate } from '@/shared/lib/coords';
import {
  TERMINAL_DEFAULT_RADIUS_M,
  type Terminal,
  type UpdateTerminalPayload,
} from '@/entities/location/schemas';
import {
  useAddTerminalAlias,
  useDeleteTerminalAlias,
  useUpdateTerminal,
} from '@/entities/location/queries';
import { LocationsMapPicker } from '../locations-map-picker';

interface LocationsTerminalDialogProps {
  terminal: Terminal | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Terminal editor — draggable pin + radius circle (500 m default shown when
 * no override is stored), radius override input, address, and alias
 * management. Aliases persist immediately through their own endpoints; the
 * rest saves on submit via `PUT /api/locations/terminals/:id`.
 */
export function LocationsTerminalDialog({
  terminal,
  onOpenChange,
}: LocationsTerminalDialogProps) {
  const { t } = useTranslation();
  const open = terminal !== null;

  const updateTerminal = useUpdateTerminal();
  const addAlias = useAddTerminalAlias();
  const deleteAlias = useDeleteTerminalAlias();

  const [address, setAddress] = React.useState('');
  const [lat, setLat] = React.useState('');
  const [lng, setLng] = React.useState('');
  const [radius, setRadius] = React.useState('');
  const [aliasInput, setAliasInput] = React.useState('');

  // Re-hydrate only when the target terminal changes (not on every cache
  // refresh — alias mutations refetch the list and we must not clobber
  // in-progress edits).
  const hydratedId = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!terminal) {
      hydratedId.current = null;
      return;
    }
    if (hydratedId.current === terminal.ID) return;
    hydratedId.current = terminal.ID;
    setAddress(terminal.address ?? '');
    setLat(terminal.lat != null ? String(terminal.lat) : '');
    setLng(terminal.long != null ? String(terminal.long) : '');
    setRadius(terminal.radius_m != null ? String(terminal.radius_m) : '');
    setAliasInput('');
  }, [terminal]);

  const numericLat = Number(lat);
  const numericLng = Number(lng);
  const coordValid = lat.trim() !== '' && lng.trim() !== '' && isValidCoordinate(numericLat, numericLng);

  const radiusOverride = radius.trim() === '' ? null : Number(radius);
  const radiusValid = radiusOverride === null || (Number.isFinite(radiusOverride) && radiusOverride > 0);
  const effectiveRadius = radiusOverride ?? TERMINAL_DEFAULT_RADIUS_M;

  const handlePositionChange = React.useCallback((newLat: number, newLng: number) => {
    setLat(newLat.toFixed(6));
    setLng(newLng.toFixed(6));
  }, []);

  const handleAddAlias = async () => {
    if (!terminal) return;
    const alias = aliasInput.trim();
    if (!alias) return;
    await addAlias.mutateAsync({ terminalId: terminal.ID, alias });
    setAliasInput('');
  };

  const handleSave = async () => {
    if (!terminal || !radiusValid) return;
    const payload: UpdateTerminalPayload = {};

    const trimmedAddress = address.trim();
    if (trimmedAddress !== (terminal.address ?? '').trim()) {
      payload.address = trimmedAddress;
    }
    if (coordValid) {
      payload.lat = Number(numericLat.toFixed(6));
      payload.long = Number(numericLng.toFixed(6));
    }
    if (radiusOverride !== null) {
      payload.radius_m = radiusOverride;
    } else if (terminal.radius_m != null) {
      payload.clear_radius = true;
    }

    try {
      await updateTerminal.mutateAsync({ id: terminal.ID, payload });
      onOpenChange(false);
    } catch {
      // Toast handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t('locations.dialog.editTerminal', 'Edit Terminal')}
          </DialogTitle>
          <DialogDescription className="truncate" dir="auto">
            {terminal?.name ?? ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {/* Address */}
          <div className="space-y-1">
            <Label htmlFor="terminal-address" className="text-xs">
              {t('locations.fields.address', 'Address')}
            </Label>
            <Input
              id="terminal-address"
              dir="auto"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('locations.fields.addressPlaceholder', 'Optional address')}
            />
          </div>

          {/* Coordinates + radius */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="terminal-lat" className="text-xs">
                {t('locations.fields.lat', 'Latitude')}
              </Label>
              <Input
                id="terminal-lat"
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="30.044420"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="terminal-lng" className="text-xs">
                {t('locations.fields.lng', 'Longitude')}
              </Label>
              <Input
                id="terminal-lng"
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="31.235712"
                className="font-mono"
              />
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <Label htmlFor="terminal-radius" className="text-xs">
                {t('locations.fields.radius', 'Radius (m)')}
              </Label>
              <Input
                id="terminal-radius"
                type="number"
                step="1"
                min="1"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder={t('locations.fields.radiusDefaultPlaceholder', {
                  m: TERMINAL_DEFAULT_RADIUS_M,
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
            primaryTitle={terminal?.name}
            className="h-[320px]"
          />

          {/* Aliases */}
          <div className="space-y-2">
            <Label className="text-xs">{t('locations.fields.aliases', 'Aliases')}</Label>
            <p className="text-xs text-muted-foreground">
              {t(
                'locations.dialog.aliasHelper',
                'Alternative spellings from trip data that should resolve to this terminal.',
              )}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(terminal?.aliases ?? []).map((alias) => (
                <Badge key={alias.ID} variant="secondary" className="gap-1 pe-1" dir="auto">
                  <span dir="auto">{alias.alias}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    onClick={() => deleteAlias.mutate(alias.ID)}
                    disabled={deleteAlias.isPending}
                    aria-label={t('locations.dialog.removeAlias', 'Remove alias')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(terminal?.aliases ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground">
                  {t('locations.dialog.noAliases', 'No aliases yet.')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                dir="auto"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddAlias();
                  }
                }}
                placeholder={t('locations.dialog.aliasPlaceholder', 'Add an alias…')}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleAddAlias()}
                disabled={!aliasInput.trim() || addAlias.isPending}
                className="shrink-0 gap-1.5"
              >
                {addAlias.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t('common.add', 'Add')}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!radiusValid || updateTerminal.isPending}
          >
            {updateTerminal.isPending ? (
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-1.5 h-4 w-4" />
            )}
            {t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
