import { useTranslation } from 'react-i18next';
import { PlugZap, RefreshCw, ServerCrash } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

/* -------------------------------------------------------------------------- */
/* The three ways a maintenance screen has nothing to show                     */
/*                                                                            */
/* Not configured, failed, and empty are different things and read             */
/* differently. These two are shared; "empty" belongs to each list because     */
/* only the list knows what it is empty of.                                    */
/* -------------------------------------------------------------------------- */

/** This build has no address for the garage system. */
export function MaintNotConfigured({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      className={className}
      icon={<PlugZap className="h-5 w-5" aria-hidden="true" />}
      title={t('maintenance.notConfigured.title')}
      description={t('maintenance.notConfigured.description')}
    />
  );
}

interface MaintErrorProps {
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}

/** The garage system did not answer. The rest of the page is unaffected. */
export function MaintError({ onRetry, retrying, className }: MaintErrorProps) {
  const { t } = useTranslation();
  return (
    <EmptyState
      className={className}
      icon={<ServerCrash className="h-5 w-5" aria-hidden="true" />}
      title={t('maintenance.error.title')}
      description={t('maintenance.error.description')}
      action={
        <Button variant="outline" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={retrying ? 'animate-spin' : undefined} aria-hidden="true" />
          {t('common.retry')}
        </Button>
      }
    />
  );
}
