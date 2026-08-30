import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toast';
import { EmptyState } from '@/shared/ui/empty-state';
import {
  Archive,
  Building2,
  CheckCircle2,
  Loader2,
  Plus,
  Stamp,
  Trash2,
} from 'lucide-react';
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
import { Textarea } from '@/shared/ui/textarea';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  useTripReceipts,
  useCreateReceiptStep,
  useUpdateReceiptStep,
  useDeleteReceiptStep,
} from '@/entities/receipt/queries';
import type { ReceiptStep, ReceiptStepLocation } from '@/entities/receipt/schemas';
import { extractErrorMessage } from '@/shared/api/errors';
import { format, formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

interface TripReceiptDialogProps {
  tripId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full-featured receipt-step manager.
 *
 * Top: trip identity (date / vehicle / route / receipt no) so the user knows
 * what trip they're managing without bouncing back to the table.
 *
 * Middle: timeline of existing steps. Each step has:
 *   - Stamp toggle (checkbox button)
 *   - Delete button
 *   - "Received by" inline-editable
 *   - Notes inline-editable
 *
 * Bottom: form to add a new step. The location dropdown only shows locations
 * that haven't been added yet — Garage and Office are one-of-each per trip in
 * the original module's mental model.
 */
export function TripReceiptDialog({
  tripId,
  open,
  onOpenChange,
}: TripReceiptDialogProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useTripReceipts(open ? tripId : null);
  const createMutation = useCreateReceiptStep();
  const updateMutation = useUpdateReceiptStep(tripId ?? undefined);
  const deleteMutation = useDeleteReceiptStep(tripId ?? undefined);

  const trip = data?.trip;
  const steps = data?.steps ?? [];

  const usedLocations = new Set(steps.map((s) => s.location));
  const availableLocations: ReceiptStepLocation[] = (
    ['Garage', 'Office'] as ReceiptStepLocation[]
  ).filter((l) => !usedLocations.has(l));

  // -- Add-step form state ----------------------------------------------------
  const [newLocation, setNewLocation] = React.useState<ReceiptStepLocation>('Garage');
  const [newReceivedBy, setNewReceivedBy] = React.useState('');
  const [newStamped, setNewStamped] = React.useState(false);
  const [newNotes, setNewNotes] = React.useState('');

  // Reset the form whenever the dialog opens or available locations change
  React.useEffect(() => {
    if (!open) return;
    setNewLocation(availableLocations[0] ?? 'Garage');
    setNewReceivedBy('');
    setNewStamped(false);
    setNewNotes('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, availableLocations.join(',')]);

  const handleAdd = async () => {
    if (!tripId || !newReceivedBy.trim()) return;
    try {
      await createMutation.mutateAsync({
        trip_id: tripId,
        location: newLocation,
        received_by: newReceivedBy.trim(),
        stamped: newStamped,
        notes: newNotes.trim(),
      });
      toast.success(t('trips.receipt.addedSuccessfully'));
      setNewReceivedBy('');
      setNewNotes('');
      setNewStamped(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('trips.receipt.addFailed')));
    }
  };

  const handleToggleStamp = async (step: ReceiptStep) => {
    try {
      await updateMutation.mutateAsync({
        stepId: step.ID,
        input: { stamped: !step.stamped },
      });
      toast.success(t('trips.receipt.updatedSuccessfully'));
    } catch (err) {
      toast.error(extractErrorMessage(err, t('trips.receipt.updateFailed')));
    }
  };

  const handleDelete = async (stepId: number) => {
    try {
      await deleteMutation.mutateAsync(stepId);
      toast.success(t('trips.receipt.deletedSuccessfully'));
    } catch (err) {
      toast.error(extractErrorMessage(err, t('trips.receipt.deleteFailed')));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90dvh] overflow-hidden md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('trips.receipt.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('trips.receipt.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain pe-1 min-h-0 space-y-4 max-h-[55vh] md:max-h-[65vh]">
          {/* Trip context */}
          {isLoading ? (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <Skeleton className="h-3.5 w-3/4 rounded-sm" />
              <Skeleton className="h-3.5 w-2/3 rounded-sm" />
              <Skeleton className="h-3.5 w-4/5 rounded-sm" />
            </div>
          ) : trip ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border bg-muted/40 p-3 text-xs">
              <Field
                label={t('trips.fields.receiptNo')}
                value={trip.receipt_no ? `#${trip.receipt_no}` : '—'}
                empty={!trip.receipt_no}
                mono
              />
              <Field
                label={t('trips.fields.date')}
                value={format(trip.date, 'd MMM yyyy')}
                mono
              />
              <Field label={t('trips.fields.vehicle')} value={trip.car_no_plate} mono />
              <Field label={t('trips.fields.driver')} value={trip.driver_name} />
              <Field
                label={t('trips.fields.terminal')}
                value={trip.terminal}
                className="col-span-2"
              />
              <Field
                label={t('trips.fields.dropOffPoint')}
                value={trip.drop_off_point}
                className="col-span-2"
              />
            </div>
          ) : null}

          {/* Timeline */}
          <section>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('trips.expanded.receiptTimeline')}
            </h4>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : steps.length === 0 ? (
              <EmptyState
                lottieSrc="/animations/receipt.lottie"
                lottieWidth={110}
                lottieHeight={110}
                title={t('trips.expanded.noReceiptSteps')}
                className="border-0 bg-transparent py-6"
              />
            ) : (
              <ol className="space-y-2">
                {[...steps]
                  .sort(
                    (a, b) =>
                      new Date(a.received_at).getTime() -
                      new Date(b.received_at).getTime(),
                  )
                  .map((step) => (
                    <ReceiptStepRow
                      key={step.ID}
                      step={step}
                      onToggleStamp={() => handleToggleStamp(step)}
                      onDelete={() => handleDelete(step.ID)}
                      busy={
                        (updateMutation.isPending &&
                          updateMutation.variables?.stepId === step.ID) ||
                        (deleteMutation.isPending &&
                          deleteMutation.variables === step.ID)
                      }
                    />
                  ))}
              </ol>
            )}
          </section>

          {/* Add new step */}
          {availableLocations.length > 0 && trip && (
            <section className="rounded-lg border bg-card p-3">
              <h4 className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Plus className="h-3 w-3" aria-hidden="true" />
                {t('trips.receipt.addStep')}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="step-location" className="text-xs">
                    {t('trips.receipt.location')}
                  </Label>
                  <Select
                    value={newLocation}
                    onValueChange={(v) =>
                      setNewLocation(v as ReceiptStepLocation)
                    }
                  >
                    <SelectTrigger id="step-location" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLocations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          <span className="inline-flex items-center gap-1.5">
                            {loc === 'Garage' ? (
                              <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {t(`trips.receiptLocation.${loc}`)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="step-received-by" className="text-xs">
                    {t('trips.receipt.receivedBy')}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="step-received-by"
                    name="received_by"
                    autoComplete="off"
                    value={newReceivedBy}
                    onChange={(e) => setNewReceivedBy(e.target.value)}
                    placeholder={t('trips.receipt.receivedByPlaceholder')}
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="step-notes" className="text-xs">
                    {t('trips.receipt.notes')}
                  </Label>
                  <Textarea
                    id="step-notes"
                    name="notes"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder={t('trips.receipt.notesPlaceholder')}
                    rows={2}
                    className="mt-1 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Checkbox
                    id="step-stamped"
                    checked={newStamped}
                    onCheckedChange={(v) => setNewStamped(v === true)}
                  />
                  <Label
                    htmlFor="step-stamped"
                    className="flex cursor-pointer items-center gap-1 text-xs"
                  >
                    <Stamp className="h-3 w-3" aria-hidden="true" />
                    {t('trips.receipt.markStamped')}
                  </Label>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => void handleAdd()}
                  disabled={!newReceivedBy.trim() || createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="animate-spin motion-reduce:animate-none" />
                  )}
                  {t('trips.receipt.addStep')}
                </Button>
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Step row                                                                    */
/* -------------------------------------------------------------------------- */

interface ReceiptStepRowProps {
  step: ReceiptStep;
  onToggleStamp: () => void;
  onDelete: () => void;
  busy: boolean;
}

function ReceiptStepRow({
  step,
  onToggleStamp,
  onDelete,
  busy,
}: ReceiptStepRowProps) {
  const { t } = useTranslation();
  const Icon = step.location === 'Garage' ? Archive : Building2;

  return (
    <li className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          step.stamped
            ? 'bg-success/10 text-success'
            : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {t(`trips.receiptLocation.${step.location}`)}
          </span>
          {step.stamped && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <Stamp className="h-3 w-3" aria-hidden="true" />
              {t('trips.receipt.stamped')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground">{step.received_by}</span> ·{' '}
          {formatDateTime(step.received_at)}
        </p>
        {step.notes && (
          <p className="mt-1 rounded bg-muted/40 px-2 py-1 text-[11px] italic text-muted-foreground">
            {step.notes}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            step.stamped
              ? 'text-success hover:bg-success/10'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={onToggleStamp}
          disabled={busy}
          aria-pressed={step.stamped}
          aria-label={
            step.stamped ? t('trips.receipt.unstamp') : t('trips.receipt.stamp')
          }
          title={
            step.stamped ? t('trips.receipt.unstamp') : t('trips.receipt.stamp')
          }
        >
          {busy ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          ) : step.stamped ? (
            <CheckCircle2 />
          ) : (
            <Stamp />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
          disabled={busy}
          aria-label={t('common.delete')}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function Field({
  label,
  value,
  className,
  mono,
  empty,
}: {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
  empty?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        dir="auto"
        className={cn(
          'truncate font-medium',
          mono && 'font-mono tabular-nums',
          empty && 'opacity-40',
        )}
      >
        {value}
      </span>
    </div>
  );
}
