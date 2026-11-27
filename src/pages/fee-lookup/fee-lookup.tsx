import { useTranslation } from 'react-i18next';
import { Calculator, PlugZap } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { EmptyState } from '@/shared/ui/empty-state';
import { feesBaseURL } from '@/shared/api/client';
import { FeeFinder } from '@/widgets/fee-finder/fee-finder';

/**
 * Fee lookup: company → terminal → drop-off, and the route's fee.
 *
 * Open to every signed-in office user. The fee service decides who sees fees
 * (permission 3 and up); below that the finder shows distances only.
 */
export default function FeeLookupPage() {
  const { t } = useTranslation();

  return (
    <PageShell
      title={t('feeLookup.title')}
      description={t('feeLookup.subtitle')}
      icon={<Calculator className="h-5 w-5" aria-hidden="true" />}
    >
      {feesBaseURL ? (
        <FeeFinder apiBase={feesBaseURL} className="mx-auto max-w-7xl" />
      ) : (
        <EmptyState
          icon={<PlugZap className="h-5 w-5" aria-hidden="true" />}
          title={t('feeLookup.notConfigured.title')}
          description={t('feeLookup.notConfigured.description')}
        />
      )}
    </PageShell>
  );
}
