import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/cn';
import {
  type OilChangeStatus,
  getOilChangeStatus,
} from '@/entities/oil-change/schemas';
import { formatNumber } from '@/shared/lib/format-number';

const STATUS_META: Record<
  OilChangeStatus,
  { variant: 'success' | 'warning' | 'destructive'; icon: typeof CheckCircle2; labelKey: string }
> = {
  good: { variant: 'success', icon: CheckCircle2, labelKey: 'oilChanges.status.good' },
  warning: { variant: 'warning', icon: AlertTriangle, labelKey: 'oilChanges.status.warning' },
  critical: { variant: 'destructive', icon: AlertCircle, labelKey: 'oilChanges.status.critical' },
};

interface StatusBadgeProps {
  /** Pass kmRemaining; the badge derives the status bucket internally */
  kmRemaining: number;
  /** When `true`, prefix the label with the actual km figure */
  showValue?: boolean;
  className?: string;
}

/**
 * Small coloured pill that summarises an oil-change record's remaining
 * service life. Shared between the fleet board, the per-car history view,
 * the form's live preview, and any future dashboard tile — so the
 * threshold-to-colour mapping stays in lockstep across the app.
 */
export function OilChangeStatusBadge({
  kmRemaining,
  showValue = false,
  className,
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const status = getOilChangeStatus(kmRemaining);
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <Badge variant={meta.variant} className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {showValue ? (
        <span className="tabular-nums">
          {formatNumber(kmRemaining, 0)} km
        </span>
      ) : (
        <span>{t(meta.labelKey)}</span>
      )}
    </Badge>
  );
}
