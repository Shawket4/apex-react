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
          lottieWidth={120}
          lottieHeight={120}
          title={t('errors.pageNotFoundTitle')}
          description={t('errors.pageNotFoundDescription')}
          action={
            <Button onClick={() => navigate('/')}>
              <Home aria-hidden="true" />
              {t('errors.goHome')}
            </Button>
          }
          className="border-0 bg-transparent py-0 shadow-none"
        />
      </div>
    </div>
  );
}
