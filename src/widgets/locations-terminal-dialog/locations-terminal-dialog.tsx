import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Pencil, Plus, Regex, Save, Trash2, X } from 'lucide-react';
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
import { Switch } from '@/shared/ui/switch';
import { Skeleton } from '@/shared/ui/skeleton';
import { isValidCoordinate } from '@/shared/lib/coords';
import {
  TERMINAL_DEFAULT_RADIUS_M,
  type ReceiptPattern,
  type Terminal,
  type UpdateTerminalPayload,
} from '@/entities/location/schemas';
import {
  useDeleteReceiptPattern,
  useReceiptPatterns,
  useUpdateTerminal,
  useUpsertReceiptPattern,
} from '@/entities/location/queries';
import { LocationsMapPicker } from '../locations-map-picker';
import { PinSourceBadge } from '../locations-dropoffs-table/pin-source-badge';

interface LocationsTerminalDialogProps {
  terminal: Terminal | null;
  onOpenChange: (open: boolean) => void;
  /** Runs after a successful save (e.g. ack a GPS suggestion). */
  onSaved?: () => void | Promise<void>;
}

/**
 * Terminal editor — draggable pin + radius circle (500 m default shown when
 * no override is stored), radius override input, address, allowed-company
 * chips, and a receipt-serialization pattern editor. Patterns persist
 * immediately through their own upsert/delete endpoints; the rest saves on
 * submit via `PUT /api/locations/terminals/:id`.
 */
export function LocationsTerminalDialog({
  terminal,
  onOpenChange,
  onSaved,
}: LocationsTerminalDialogProps) {
  const { t } = useTranslation();
  const open = terminal !== null;

  const updateTerminal = useUpdateTerminal();

  const [address, setAddress] = React.useState('');
  const [lat, setLat] = React.useState('');
  const [lng, setLng] = React.useState('');
  const [radius, setRadius] = React.useState('');

  // Re-hydrate only when the target terminal changes (not on every cache
  // refresh — pattern mutations refetch the list and we must not clobber
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
      // A hand-placed (or hand-confirmed) move counts as a manual pin; an
      // untouched position keeps its stored pin_source.
      const moved =
        terminal.lat == null ||
        terminal.long == null ||
        Math.abs(terminal.lat - payload.lat) > 1e-6 ||
        Math.abs(terminal.long - payload.long) > 1e-6;
      if (moved) payload.pin_source = 'manual';
    }
    if (radiusOverride !== null) {
      payload.radius_m = radiusOverride;
    } else if (terminal.radius_m != null) {
      payload.clear_radius = true;
    }

    try {
      await updateTerminal.mutateAsync({ id: terminal.ID, payload });
      await onSaved?.();
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
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('locations.dialog.editTerminal', 'Edit Terminal')}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 truncate" dir="auto">
            <span dir="auto" className="truncate">{terminal?.name ?? ''}</span>
            <PinSourceBadge pinSource={terminal?.pin_source} />
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {/* Allowed companies (read-only — extend via the trip form's
              create/allow flow or the backend) */}
          {(terminal?.allowed_companies?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t('locations.fields.allowedCompanies', 'Allowed companies')}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {terminal?.allowed_companies.map((company) => (
                  <Badge key={company} variant="secondary" dir="auto">
                    {company}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Address */}
          <div className="space-y-1">
            <Label htmlFor="terminal-address" className="text-xs">
              {t('locations.fields.address', 'Address')}
            </Label>
            <Input
              id="terminal-address"
              name="address"
              autoComplete="street-address"
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
                name="lat"
                autoComplete="off"
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
                name="lng"
                autoComplete="off"
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
                name="radius_m"
                autoComplete="off"
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

          {/* Receipt serialization patterns */}
          {terminal && <ReceiptPatternsSection terminalId={terminal.ID} />}
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
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Save />
            )}
            {t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Receipt patterns editor                                                     */
/*                                                                             */
/* One pattern per (terminal, company); empty company = "all companies".       */
/* Saves through the PUT upsert immediately (independent of the dialog's       */
/* main Save button). The regex must compile client-side before saving.        */
/* -------------------------------------------------------------------------- */

interface PatternFormState {
  /** Empty string = applies to all companies. */
  company: string;
  pattern: string;
  description: string;
  active: boolean;
  /** Company key of the row being edited, null when adding a new pattern. */
  editingCompany: string | null;
}

const emptyPatternForm: PatternFormState = {
  company: '',
  pattern: '',
  description: '',
  active: true,
  editingCompany: null,
};

function ReceiptPatternsSection({ terminalId }: { terminalId: number }) {
  const { t } = useTranslation();
  const patternsQuery = useReceiptPatterns(terminalId);
  const upsertPattern = useUpsertReceiptPattern();
  const deletePattern = useDeleteReceiptPattern();

  const [form, setForm] = React.useState<PatternFormState>(emptyPatternForm);
  const [showForm, setShowForm] = React.useState(false);
  const [deleteBusyCompany, setDeleteBusyCompany] = React.useState<string | null>(null);

  // Reset when switching terminals
  React.useEffect(() => {
    setForm(emptyPatternForm);
    setShowForm(false);
  }, [terminalId]);

  const patterns = patternsQuery.data ?? [];

  const regexError = React.useMemo(() => {
    if (!form.pattern.trim()) return false;
    try {
      void new RegExp(form.pattern);
      return false;
    } catch {
      return true;
    }
  }, [form.pattern]);

  const canSave = !!form.pattern.trim() && !regexError && !upsertPattern.isPending;

  const startEdit = (pattern: ReceiptPattern) => {
    setForm({
      company: pattern.company ?? '',
      pattern: pattern.pattern,
      description: pattern.description,
      active: pattern.active,
      editingCompany: pattern.company ?? '',
    });
    setShowForm(true);
  };

  const handleSavePattern = async () => {
    if (!canSave) return;
    try {
      await upsertPattern.mutateAsync({
        terminalId,
        payload: {
          company: form.company.trim(),
          pattern: form.pattern.trim(),
          description: form.description.trim(),
          active: form.active,
        },
      });
      setForm(emptyPatternForm);
      setShowForm(false);
    } catch {
      // Toast handled by the mutation
    }
  };

  const handleDelete = async (pattern: ReceiptPattern) => {
    const companyKey = pattern.company ?? '';
    setDeleteBusyCompany(companyKey);
    try {
      await deletePattern.mutateAsync({ terminalId, company: companyKey });
      if (form.editingCompany === companyKey) {
        setForm(emptyPatternForm);
        setShowForm(false);
      }
    } catch {
      // Toast handled by the mutation
    } finally {
      setDeleteBusyCompany(null);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5 text-xs">
          <Regex className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {t('locations.receiptPatterns.title', 'Receipt serialization')}
        </Label>
        {!showForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 gap-1.5 text-xs"
            onClick={() => {
              setForm(emptyPatternForm);
              setShowForm(true);
            }}
          >
            <Plus />
            {t('locations.receiptPatterns.add', 'Add pattern')}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          'locations.receiptPatterns.helper',
          'Regex patterns receipt numbers must match at this terminal — per company, or one for all companies.',
        )}
      </p>

      {/* Existing patterns */}
      {patternsQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-none" />
          <Skeleton className="h-10 w-full rounded-none" />
        </div>
      ) : patterns.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {t('locations.receiptPatterns.empty', 'No receipt patterns yet.')}
        </p>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {patterns.map((pattern) => {
            const companyKey = pattern.company ?? '';
            const busy = deleteBusyCompany === companyKey && deletePattern.isPending;
            return (
              <div
                key={companyKey || '__all__'}
                className="flex flex-col gap-1.5 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={pattern.company ? 'secondary' : 'outline'} dir="auto">
                      {pattern.company ??
                        t('locations.receiptPatterns.allCompanies', 'All companies')}
                    </Badge>
                    {!pattern.active && (
                      <Badge variant="warning">
                        {t('locations.receiptPatterns.inactive', 'Inactive')}
                      </Badge>
                    )}
                    <code className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium">
                      {pattern.pattern}
                    </code>
                  </div>
                  {pattern.description && (
                    <p className="truncate text-muted-foreground" dir="auto">
                      {pattern.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startEdit(pattern)}
                    aria-label={t('common.edit', 'Edit')}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleDelete(pattern)}
                    disabled={busy}
                    aria-label={t('common.delete', 'Delete')}
                  >
                    {busy ? (
                      <Loader2 className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit form */}
      {showForm && (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="rp-company" className="text-xs">
                {t('locations.receiptPatterns.company', 'Company')}
              </Label>
              <Input
                id="rp-company"
                name="company"
                autoComplete="off"
                dir="auto"
                value={form.company}
                // The upsert is keyed on (terminal, company) — changing the
                // company while editing would create a second row, so lock it.
                disabled={form.editingCompany !== null}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                placeholder={t(
                  'locations.receiptPatterns.companyPlaceholder',
                  'Leave empty for all companies',
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rp-pattern" className="text-xs">
                {t('locations.receiptPatterns.pattern', 'Pattern (regex)')}
              </Label>
              <Input
                id="rp-pattern"
                name="pattern"
                autoComplete="off"
                value={form.pattern}
                onChange={(e) => setForm((prev) => ({ ...prev, pattern: e.target.value }))}
                placeholder="^WT-\d{5}$"
                className="font-mono"
                aria-invalid={regexError || undefined}
                aria-describedby={regexError ? 'rp-pattern-error' : undefined}
              />
              {regexError && (
                <p id="rp-pattern-error" className="text-[11px] font-medium text-destructive">
                  {t(
                    'locations.receiptPatterns.invalidRegex',
                    'This pattern is not a valid regular expression.',
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rp-description" className="text-xs">
              {t('locations.receiptPatterns.description', 'Description')}
            </Label>
            <Input
              id="rp-description"
              name="description"
              autoComplete="off"
              dir="auto"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t(
                'locations.receiptPatterns.descriptionPlaceholder',
                'e.g. WT- followed by 5 digits',
              )}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="rp-active"
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, active: checked }))
                }
              />
              <Label htmlFor="rp-active" className="cursor-pointer text-xs">
                {t('locations.receiptPatterns.active', 'Active')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 gap-1.5 text-xs"
                onClick={() => {
                  setForm(emptyPatternForm);
                  setShowForm(false);
                }}
              >
                <X />
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2.5 gap-1.5 text-xs"
                disabled={!canSave}
                onClick={() => void handleSavePattern()}
              >
                {upsertPattern.isPending ? (
                  <Loader2 className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <Save />
                )}
                {t('locations.receiptPatterns.save', 'Save pattern')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
