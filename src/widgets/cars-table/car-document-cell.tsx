import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { format } from '@/shared/lib/format';
import type { CarDocument } from '@/entities/car/expiry';

/**
 * One dated paper: the date, and how long it has left, coloured by state.
 *
 * Both halves are shown because neither answers the question alone — "3 Sep
 * 2026" needs mental arithmetic against today, and "4d left" gives you nothing
 * to write on a renewal form.
 */
export function CarDocumentCell({
  doc,
  className,
}: {
  doc: CarDocument;
  className?: string;
}) {
  const { t } = useTranslation();

  if (doc.state === 'missing') {
    return (
      <span className={cn('text-xs text-muted-foreground opacity-40', className)}>—</span>
    );
  }

  const days = doc.days ?? 0;
  return (
    <span className={cn('flex flex-col leading-tight', className)}>
      <span className="font-mono text-[13px] tabular-nums">
        {format(doc.value as string, 'd MMM yyyy')}
      </span>
      <span
        className={cn(
          'text-[11px] font-medium tabular-nums',
          doc.state === 'expired' && 'text-destructive',
          doc.state === 'expiring' && 'text-warning',
          doc.state === 'valid' && 'text-muted-foreground',
        )}
      >
        {days < 0
          ? t('cars.documents.expiredAgo', { count: Math.abs(days) })
          : t('cars.documents.daysLeft', { count: days })}
      </span>
    </span>
  );
}
