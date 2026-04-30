import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, ChevronLeft } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { useTranslation } from 'react-i18next';

export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();

  console.error('Route error caught by ErrorBoundary:', error);

  let title = t('errors.unexpected.title');
  let message = t('errors.unexpected.message');
  let isChunkError = false;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = t('errors.404.title');
      message = t('errors.404.message');
    } else {
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
    // Catch the specific "Failed to fetch dynamically imported module" error
    if (
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('error loading dynamically imported module')
    ) {
      isChunkError = true;
      title = t('errors.chunkLoad.title', 'Application Update');
      message = t(
        'errors.chunkLoad.message',
        'A new version of the application is available. Please refresh the page to continue.'
      );
    }
  }

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 md:p-6 lg:p-8">
      <Card className="w-full max-w-md shadow-2xl border-2 border-primary/10">
        <CardHeader className="text-center pt-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center px-8 pb-8">
          <p className="text-muted-foreground leading-relaxed">
            {message}
          </p>
          {isChunkError && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10 text-sm font-medium text-primary">
              {t('errors.chunkLoad.hint', 'This usually happens after a new deployment.')}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 p-6 bg-muted/20">
          {isChunkError ? (
            <Button onClick={handleRefresh} className="w-full gap-2 py-6 text-base font-bold shadow-lg shadow-primary/20" size="lg">
              <RefreshCw className="h-5 w-5" />
              {t('common.refreshNow', 'Refresh Now')}
            </Button>
          ) : (
            <>
              <Button onClick={handleGoBack} variant="default" className="w-full gap-2" size="lg">
                <ChevronLeft className="h-5 w-5" />
                {t('common.goBack')}
              </Button>
              <div className="grid grid-cols-2 gap-2 w-full mt-2">
                <Button onClick={handleRefresh} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('common.retry')}
                </Button>
                <Button onClick={handleGoHome} variant="outline" className="gap-2">
                  <Home className="h-4 w-4" />
                  {t('common.home')}
                </Button>
              </div>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
