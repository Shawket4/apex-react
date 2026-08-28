import { useTranslation } from 'react-i18next';
import { Archive, CheckCircle2, Clock } from 'lucide-react';

import { computeReceiptStatus, type Trip } from '@/entities/trip/schemas';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* Receipt status badge                                                        */
/*                                                                            */
/* Lives in its own module because both the desktop table and the mobile list  */
/* render it, and importing it from the table would make the two files import  */
/* each other.                                                                 */
/* -------------------------------------------------------------------------- */

const RECEIPT_STATUS_STYLES = {
  pending: 'bg-muted text-muted-foreground border-border',
  in_garage:
    'bg-warning/15 text-warning border-warning/30',
  in_office:
    'bg-warning/15 text-warning border-warning/30',
  complete:
    'bg-success/15 text-success border-success/30',
} as const;

const RECEIPT_STATUS_ICONS = {
  pending: Clock,
  in_garage: Archive,
  in_office: Archive,
  complete: CheckCircle2,
} as const;

export function ReceiptStatusBadge({
  trip,
  compact = false,
}: {
  trip: Pick<Trip, 'receipt_steps'>;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const status = computeReceiptStatus(trip);
  const Icon = RECEIPT_STATUS_ICONS[status.status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        RECEIPT_STATUS_STYLES[status.status],
      )}
      title={t(`trips.receiptStatus.${camel(status.status)}`)}
    >
      <Icon className="h-3 w-3" />
      {!compact && t(`trips.receiptStatus.${camel(status.status)}`)}
    </span>
  );
}

function camel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

