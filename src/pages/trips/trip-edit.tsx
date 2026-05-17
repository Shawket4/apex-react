import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3 } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { TripForm } from '@/widgets/trip-form/trip-form';

export default function TripEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ parentId: string }>();
  const parentId = params.parentId ? Number(params.parentId) : NaN;

  if (!Number.isFinite(parentId) || parentId <= 0) {
    return (
      <PageShell
        title={t('trips.form.titleEdit')}
        icon={<Edit3 className="h-5 w-5" />}
      >
        <EmptyState
          lottieSrc="/animations/warning.lottie"
          lottieWidth={100}
          lottieHeight={100}
          title={t('errors.invalidId')}
          action={
            <Button onClick={() => navigate('/trips')}>
              {t('trips.actions.backToList')}
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t('trips.form.titleEdit')}
      description={t('trips.form.descriptionEdit', { id: parentId })}
      icon={<Edit3 className="h-5 w-5" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate('/trips')}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span className="hidden sm:inline">{t('trips.actions.backToList')}</span>
        </Button>
      }
    >
      <TripForm parentId={parentId} />
    </PageShell>
  );
}
