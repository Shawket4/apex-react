import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, MessageCircle, QrCode, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  useWhatsAppQrCode,
  useWhatsAppReconnect,
  useWhatsAppStatus,
} from '@/entities/whatsapp/queries';

export function WhatsAppGatewayCard() {
  const { t } = useTranslation();
  const [qrOpen, setQrOpen] = useState(false);

  const statusQuery = useWhatsAppStatus({ refetchInterval: qrOpen ? 5_000 : 30_000 });
  const reconnect = useWhatsAppReconnect();

  const status = statusQuery.data;
  const loggedIn = status?.is_logged_in ?? false;
  const connected = status?.is_connected ?? false;

  const qrQuery = useWhatsAppQrCode(qrOpen && !loggedIn);

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!qrQuery.data) {
      setQrUrl(null);
      return;
    }
    const url = URL.createObjectURL(qrQuery.data);
    setQrUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [qrQuery.data]);

  useEffect(() => {
    if (qrOpen && loggedIn) {
      setQrOpen(false);
      toast.success(t('settings.whatsappLinked', 'WhatsApp linked successfully'));
    }
  }, [qrOpen, loggedIn, t]);

  const badge = statusQuery.isLoading ? (
    <Skeleton className="h-5 w-24 rounded-full" />
  ) : statusQuery.isError || !status ? (
    <Badge variant="destructive">{t('settings.whatsappUnreachable', 'Unreachable')}</Badge>
  ) : connected && loggedIn ? (
    <Badge variant="success">{t('settings.whatsappConnected', 'Connected')}</Badge>
  ) : loggedIn ? (
    <Badge variant="warning">{t('settings.whatsappDisconnected', 'Disconnected')}</Badge>
  ) : (
    <Badge variant="destructive">{t('settings.whatsappLoggedOut', 'Logged out')}</Badge>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {t('settings.whatsappTitle', 'WhatsApp Gateway')}
          </CardTitle>
          {badge}
        </div>
        <CardDescription>
          {t(
            'settings.whatsappDescription',
            'Delivers PetroApp fuel alerts and Falcon notifications.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && loggedIn && (
          <p className="text-sm text-muted-foreground" dir="ltr">
            {status.jid}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {status && !connected && (
            <Button
              variant="outline"
              onClick={() => reconnect.mutate()}
              disabled={reconnect.isPending}
            >
              {reconnect.isPending ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <RefreshCw aria-hidden="true" />
              )}
              {t('settings.whatsappReconnect', 'Reconnect')}
            </Button>
          )}
          {status && !loggedIn && (
            <Button onClick={() => setQrOpen(true)}>
              <QrCode aria-hidden="true" />
              {t('settings.whatsappShowQr', 'Show QR code')}
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.whatsappQrTitle', 'Link WhatsApp')}</DialogTitle>
            <DialogDescription>
              {t(
                'settings.whatsappQrDescription',
                'Scan with your phone: WhatsApp → Settings → Linked devices → Link a device. The code refreshes automatically.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-64 items-center justify-center p-2">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={t('settings.whatsappQrTitle', 'Link WhatsApp')}
                width={256}
                height={256}
                className="h-64 w-64 rounded-md bg-white p-2"
              />
            ) : qrQuery.isError ? (
              <p className="text-sm text-destructive">
                {t('settings.whatsappServiceError', 'Failed to reach the WhatsApp service')}
              </p>
            ) : (
              <Loader2
                className="h-8 w-8 animate-spin text-muted-foreground motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
