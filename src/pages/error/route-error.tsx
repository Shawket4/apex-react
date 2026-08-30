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
    <div className="flex min-h-dvh items-center justify-center bg-background p-4 md:p-6 lg:p-8">
      <Card className="w-full max-w-md shadow-none">
        <CardHeader className="text-center pt-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-8 w-8" aria-hidden="true" />
          </div>
          <CardTitle className="text-lg font-semibold leading-tight sm:text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center px-6 pb-6">
          <p className="text-xs text-muted-foreground">
            {message}
          </p>
          {isChunkError && (
            <div className="mt-3 rounded-lg border border-dashed border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              {t('errors.chunkLoad.hint', 'This usually happens after a new deployment.')}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 p-6 bg-muted/40">
          {isChunkError ? (
            <Button onClick={handleRefresh} className="w-full">
              <RefreshCw aria-hidden="true" />
              {t('common.refreshNow', 'Refresh Now')}
            </Button>
          ) : (
            <>
              <Button onClick={handleGoBack} variant="default" className="w-full gap-2">
                <ChevronLeft className="rtl:rotate-180" aria-hidden="true" />
                {t('common.goBack')}
              </Button>
              <div className="grid grid-cols-2 gap-2 w-full mt-2">
                <Button onClick={handleRefresh} variant="outline" className="gap-2">
                  <RefreshCw aria-hidden="true" />
                  {t('common.retry')}
                </Button>
                <Button onClick={handleGoHome} variant="outline" className="gap-2">
                  <Home aria-hidden="true" />
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
