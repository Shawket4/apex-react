import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  FileText,
  MapPin,
  Stamp,
  User,
} from 'lucide-react';
import type { Trip } from '@/entities/trip/schemas';
import { Button } from '@/shared/ui/button';
import { format, formatCurrency, formatNumber, formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

interface TripsRowExpandedProps {
  trip: Trip;
  onOpenReceipt: () => void;
  onOpenMap: () => void;
}

/**
 * Inline panel revealed when a trip row is expanded.
 *
 * Three sections:
 *   1. Receipt timeline preview — Garage / Office steps with stamp markers and
 *      timestamps, read-only. "Manage receipts" link opens the full dialog.
 *   2. Trip detail summary — driver, vehicle, capacity, gas type, distance,
 *      fee. Shown in a compact key/value list.
 *   3. Audit info — author / overwriter from `parent_trip` when present.
 *
 * Decisions:
 *   - Read-only here; editing happens in the dialog where the form has more
 *     room. This keeps row expansions visually quiet.
 *   - Only renders the audit section if there's actually something to show,
 *     so we don't reserve empty space on standalone trips.
 */
export function TripsRowExpanded({
  trip,
  onOpenReceipt,
  onOpenMap,
}: TripsRowExpandedProps) {
  const { t } = useTranslation();
  const steps = [...(trip.receipt_steps ?? [])].sort(
    (a, b) =>
      new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
  );
  const author = trip.parent_trip?.author;
  const overwriter = trip.parent_trip?.overwriter;
  const distance = trip.mileage || trip.distance || 0;

  return (
    <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:gap-6">
      <div className="space-y-4">
        {/* Receipt timeline */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('trips.expanded.receiptTimeline')}
            </h4>
            <Button
              variant="link"
              size="sm"
              className="h-auto gap-1 p-0 text-xs"
              onClick={onOpenReceipt}
            >
              <FileText className="h-3 w-3" />
              {t('trips.actions.manageReceipts')}
            </Button>
          </div>
          {steps.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
              {t('trips.expanded.noReceiptSteps')}
            </p>
          ) : (
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={step.ID} className="flex items-start gap-3">
                  <div className="relative flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                        step.stamped
                          ? 'bg-success/15 text-success'
                          : 'bg-primary/15 text-primary',
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="my-1 h-4 w-px bg-border" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {t(`trips.receiptLocation.${step.location}`)}
                      </span>
                      {step.stamped && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          <Stamp className="h-2.5 w-2.5" />
                          {t('trips.receipt.stamped')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('trips.receipt.receivedBy')}{' '}
                      <span className="text-foreground">{step.received_by}</span>{' '}
                      · {formatDateTime(step.received_at)}
                    </p>
                    {step.notes && (
                      <p className="mt-1 rounded-md bg-muted/50 px-2 py-1 text-xs italic text-muted-foreground">
                        {step.notes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {(author || overwriter) && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('trips.expanded.audit')}
            </h4>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
              {author && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <dt className="text-muted-foreground">
                    {t('trips.expanded.author')}:
                  </dt>
                  <dd className="font-medium">{author}</dd>
                </div>
              )}
              {overwriter && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <dt className="text-muted-foreground">
                    {t('trips.expanded.overwriter')}:
                  </dt>
                  <dd className="font-medium">{overwriter}</dd>
                </div>
              )}
            </dl>
          </section>
        )}
      </div>

      <aside className="space-y-3 md:min-w-[200px]">
        <div className="rounded-md border bg-muted/30 p-3 text-xs">
          <dl className="space-y-1.5">
            <Row label={t('trips.fields.driver')} value={trip.driver_name} />
            <Row label={t('trips.fields.vehicle')} value={trip.car_no_plate} />
            <Row
              label={t('trips.fields.tankCapacity')}
              value={`${formatNumber(trip.tank_capacity, 0)} L`}
            />
            {trip.gas_type && (
              <Row label={t('trips.fields.gasType')} value={trip.gas_type} />
            )}
            <Row
              label={t('trips.fields.distance')}
              value={`${formatNumber(distance, 1)} km`}
            />
            <Row label={t('trips.fields.fee')} value={formatCurrency(trip.fee)} />
            {trip.date && (
              <Row
                label={t('trips.fields.date')}
                value={format(trip.date, 'PPP')}
              />
            )}
          </dl>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={onOpenMap}
        >
          <MapPin className="h-3.5 w-3.5" />
          {t('trips.actions.viewOnMap')}
        </Button>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}
