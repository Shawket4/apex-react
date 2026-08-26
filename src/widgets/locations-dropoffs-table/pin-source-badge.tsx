import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui/badge';

/**
 * Small badge describing where a drop-off pin came from. Known sources get
 * a translated label + tinted variant; anything else renders verbatim so
 * new backend values degrade gracefully.
 */
export function PinSourceBadge({ pinSource }: { pinSource?: string | null }) {
  const { t } = useTranslation();

  if (!pinSource) return null;

  switch (pinSource) {
    case 'manual':
      return (
        <Badge variant="secondary">{t('locations.pinSource.manual', 'Manual')}</Badge>
      );
    case 'gps_suggested':
      return (
        <Badge variant="success">
          {t('locations.pinSource.gpsSuggested', 'GPS (provisional)')}
        </Badge>
      );
    default:
      return <Badge variant="outline">{pinSource}</Badge>;
  }
}
