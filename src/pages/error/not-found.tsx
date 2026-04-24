import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-7xl font-bold text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">{t('errors.pageNotFoundTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('errors.pageNotFoundDescription')}</p>
        <Button onClick={() => navigate('/')}>
          <Home className="h-4 w-4" />
          {t('errors.goHome')}
        </Button>
      </div>
    </div>
  );
}
