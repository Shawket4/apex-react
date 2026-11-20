import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Said on every service-invoice screen: these are history. New work is a
 * work order in the garage system, and this is where to find it.
 */
export function OldInvoicesBanner({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm',
        className,
      )}
    >
      <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="min-w-0">
        {t('serviceInvoices.history.banner')}{' '}
        <Link
          to="/work-orders"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('serviceInvoices.history.openWorkOrders')}
        </Link>
      </p>
    </div>
  );
}
