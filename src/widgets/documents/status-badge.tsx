import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui/badge';
import { daysUntilDay, documentStatus, type DocumentStatus } from '@/entities/document/status';

const VARIANT: Record<DocumentStatus, 'success' | 'warning' | 'destructive' | 'outline'> = {
  valid: 'success',
  expiring: 'warning',
  expired: 'destructive',
  undated: 'outline',
};

interface Props {
  expiryDate: string | null | undefined;
  className?: string;
}

/**
 * Where a document stands, in the words that say what to do about it: how
 * many days are left, or how long ago it lapsed.
 */
export function DocumentStatusBadge({ expiryDate, className }: Props) {
  const { t } = useTranslation();
  const status = documentStatus(expiryDate);
  const days = daysUntilDay(expiryDate);

  let text = t(`documents.status.${status}`);
  if (status === 'expired' && days !== null) {
    text = t('documents.status.expiredAgo', { count: -days });
  } else if (status === 'expiring' && days !== null) {
    text = days === 0 ? t('documents.status.expiresToday') : t('documents.status.daysLeft', { count: days });
  }

  return (
    <Badge variant={VARIANT[status]} className={className}>
      {text}
    </Badge>
  );
}
