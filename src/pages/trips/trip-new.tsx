import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { TripForm } from '@/widgets/trip-form/trip-form';

export default function TripNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PageShell
      title={t('trips.form.titleCreate')}
      description={t('trips.form.descriptionCreate')}
      icon={<Plus className="h-5 w-5" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate('/trips')}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span className="hidden sm:inline">{t('trips.actions.backToList')}</span>
        </Button>
      }
    >
      <TripForm />
    </PageShell>
  );
}
