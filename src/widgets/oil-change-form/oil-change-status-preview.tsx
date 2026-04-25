import { useTranslation } from 'react-i18next';
import { Gauge, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format-number';
import {
  getOilChangeStatus,
  type OilChangeStatus,
} from '@/entities/oil-change/schemas';

interface PreviewProps {
  /** Service interval in km */
  mileage: number;
  /** Odometer reading at the moment of the change */
  odometerAtChange: number;
  /** Latest odometer reading (defaults to `odometerAtChange` on create) */
  currentOdometer?: number;
}

const TONE_CLASSES: Record<
  OilChangeStatus,
  { card: string; value: string; label: string }
> = {
  good: {
    card: 'border-success/30 bg-success/5',
    value: 'text-success',
    label: 'text-success',
  },
  warning: {
    card: 'border-warning/30 bg-warning/5',
    value: 'text-warning',
    label: 'text-warning',
  },
  critical: {
    card: 'border-destructive/30 bg-destructive/5',
    value: 'text-destructive',
    label: 'text-destructive',
  },
};

/**
 * Renders a small status card under the maintenance-detail inputs showing
 * the live `kmUsed` and `kmRemaining` figures. Hidden until the user has
 * entered a service interval and either an odometer-at-change or a current
 * odometer reading — empty fields look like zero, and zero would
 * misleadingly show "Critical".
 */
export function OilChangeStatusPreview({
  mileage,
  odometerAtChange,
  currentOdometer,
}: PreviewProps) {
  const { t } = useTranslation();

  // Need a real service interval to evaluate against
  if (!mileage || mileage <= 0) return null;
  // Need an odometer-at-change to calculate kmUsed
  if (!Number.isFinite(odometerAtChange) || odometerAtChange < 0) return null;

  const effectiveCurrent =
    currentOdometer != null && currentOdometer >= odometerAtChange
      ? currentOdometer
      : odometerAtChange;

  const kmUsed = Math.max(0, effectiveCurrent - odometerAtChange);
  const kmRemaining = mileage - kmUsed;
  const status = getOilChangeStatus(kmRemaining);
  const tone = TONE_CLASSES[status];

  return (
    <div className={cn('rounded-lg border p-4', tone.card)}>
      <div className="flex items-start gap-3">
        <Gauge className={cn('mt-0.5 h-5 w-5 shrink-0', tone.value)} />
        <div className="flex-1 space-y-1.5">
          <p className={cn('text-xs font-semibold uppercase tracking-wider', tone.label)}>
            {t(`oilChanges.status.${status}`)}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              {t('oilChanges.preview.used')}:{' '}
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(kmUsed, 0)} km
              </span>
            </span>
            <span className="text-muted-foreground">
              {t('oilChanges.preview.remaining')}:{' '}
              <span className={cn('font-semibold tabular-nums', tone.value)}>
                {formatNumber(kmRemaining, 0)} km
              </span>
            </span>
          </div>
          {kmRemaining < 0 && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {t('oilChanges.preview.overdue')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
