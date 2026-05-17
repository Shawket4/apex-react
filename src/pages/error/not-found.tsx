import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <EmptyState
          lottieSrc="/animations/no_results.json"
          lottieWidth={180}
          lottieHeight={180}
          title={t('errors.pageNotFoundTitle')}
          description={t('errors.pageNotFoundDescription')}
          action={
            <Button onClick={() => navigate('/')} size="lg" className="mt-4">
              <Home className="h-4 w-4 mr-2" />
              {t('errors.goHome')}
            </Button>
          }
          className="border-0 bg-transparent py-0 shadow-none"
        />
      </div>
    </div>
  );
}
