import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import type {
  DuplicateDetectionResponse,
} from '@/entities/trip/schemas';
import { format } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

interface DuplicateComparisonDialogProps {
  duplicate: DuplicateDetectionResponse | null;
  onOpenChange: (open: boolean) => void;
  onForceProceed: () => void;
  /** Label changes between create + update flows ("Create anyway" vs. "Update anyway") */
  forceLabel: string;
  loading?: boolean;
}

/**
 * Shown when the backend returns a 409 with duplicate detection.
 *
 * Server flagged that one or more receipt numbers in our submission already
 * exist on a trip (parent or standalone). We render the existing-vs-new diff
 * for each clashing receipt so the user can decide whether they're correcting
 * a previous entry (force) or backed off (cancel).
 *
 * Differences are highlighted in amber to make the decision obvious. Same
 * fields render in plain text so the eye snaps to what actually changed.
 */
export function DuplicateComparisonDialog({
  duplicate,
  onOpenChange,
  onForceProceed,
  forceLabel,
  loading,
}: DuplicateComparisonDialogProps) {
  const { t } = useTranslation();
  const open = duplicate !== null;

  if (!duplicate) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{t('trips.form.duplicate.title')}</DialogTitle>
              <DialogDescription>
                {t('trips.form.duplicate.description', {
                  count: duplicate.duplicates.length,
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4">
            {duplicate.duplicates.map((dup, idx) => {
              const existing =
                dup.existing_parent ?? dup.existing_standalone ?? {};
              const newTrip = duplicate.new_data;

              // Pull the matching new container by receipt_no (each dup row
              // corresponds to one container in the submission)
              const newContainer = (newTrip.containers as any[])?.find(
                (c: any) => c.receipt_no === (dup as any).receipt_no,
              );

              const fields: Array<{
                label: string;
                existing: string;
                next: string;
              }> = [
                {
                  label: t('trips.fields.receiptNo'),
                  existing: dup.receipt_no,
                  next: dup.receipt_no,
                },
                {
                  label: t('trips.fields.date'),
                  existing: existing.date ? format(existing.date, 'PPP') : '—',
                  next: newTrip.date ? format(newTrip.date, 'PPP') : '—',
                },
                {
                  label: t('trips.fields.vehicle'),
                  existing: existing.car_no_plate ?? '—',
                  next: newTrip.car_no_plate ?? '—',
                },
                {
                  label: t('trips.fields.driver'),
                  existing: existing.driver_name ?? '—',
                  next: newTrip.driver_name ?? '—',
                },
                {
                  label: t('trips.fields.company'),
                  existing: existing.company ?? '—',
                  next: newTrip.company ?? '—',
                },
                {
                  label: t('trips.fields.terminal'),
                  existing: existing.terminal ?? '—',
                  next: newTrip.terminal ?? '—',
                },
                {
                  label: t('trips.fields.dropOffPoint'),
                  existing: existing.drop_off_point ?? '—',
                  next: newContainer?.drop_off_point ?? '—',
                },
                {
                  label: t('trips.fields.tankCapacity'),
                  existing:
                    existing.tank_capacity != null
                      ? `${existing.tank_capacity} L`
                      : '—',
                  next:
                    newContainer?.tank_capacity != null
                      ? `${newContainer.tank_capacity} L`
                      : '—',
                },
                {
                  label: t('trips.fields.gasType'),
                  existing: existing.gas_type ?? '—',
                  next: newContainer?.gas_type ?? '—',
                },
              ];

              return (
                <div
                  key={`${dup.receipt_no}-${idx}`}
                  className="rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('trips.form.duplicate.duplicateNumber', {
                          n: idx + 1,
                        })}
                      </span>
                      <span className="ms-2 text-sm font-semibold tabular-nums">
                        #{dup.receipt_no}
                      </span>
                    </div>
                    {(dup.existing_parent || dup.existing_standalone) && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {dup.existing_parent
                          ? t('trips.form.duplicate.existingParent')
                          : t('trips.form.duplicate.existingStandalone')}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-1.5 p-3 text-xs sm:grid-cols-[1fr_auto_1fr]">
                    <div className="hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">
                      {t('trips.form.duplicate.existing')}
                    </div>
                    <div className="hidden sm:block" />
                    <div className="hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">
                      {t('trips.form.duplicate.new')}
                    </div>

                    {fields.map((f) => {
                      const changed = f.existing !== f.next;
                      return (
                        <DiffRow
                          key={f.label}
                          label={f.label}
                          existing={f.existing}
                          next={f.next}
                          changed={changed}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="default"
            onClick={onForceProceed}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {forceLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DiffRowProps {
  label: string;
  existing: string;
  next: string;
  changed: boolean;
}

/**
 * One row of the diff. Mobile collapses to a stacked layout (label + existing
 * above, arrow + new below). Desktop shows the full 3-column view.
 *
 * `changed` switches the row to amber to draw the eye to what's actually
 * being overwritten.
 */
function DiffRow({ label, existing, next, changed }: DiffRowProps) {
  return (
    <>
      {/* Label column on mobile, embedded into existing on desktop */}
      <div className="contents">
        <div
          className={cn(
            'col-span-1 flex flex-col rounded px-2 py-1 sm:col-span-1',
            changed && 'bg-warning/10',
          )}
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="truncate font-medium tabular-nums">{existing}</span>
        </div>
        <div className="flex items-center justify-center text-muted-foreground">
          <ArrowRight className="h-3 w-3 rtl:rotate-180" />
        </div>
        <div
          className={cn(
            'col-span-1 flex flex-col rounded px-2 py-1 sm:col-span-1',
            changed && 'bg-warning/10',
          )}
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden">
            {label}
          </span>
          <span
            className={cn(
              'truncate font-medium tabular-nums',
              changed && 'text-warning',
            )}
          >
            {next}
          </span>
        </div>
      </div>
    </>
  );
}
