import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { DocumentsOverview } from '@/widgets/documents-overview/documents-overview';

/** The papers of every car and driver in one place, most urgent first. */
export default function DocumentsPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('nav.documents')}
      description={t('documents.fleet.subtitle')}
      icon={<FileText className="h-5 w-5" aria-hidden="true" />}
    >
      <DocumentsOverview />
    </PageShell>
  );
}
