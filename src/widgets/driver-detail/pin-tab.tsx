import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Copy, RefreshCw, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useRegeneratePin } from '@/entities/driver/queries';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { toast } from '@/shared/ui/toaster';

interface PinTabProps {
  driverId: number;
  driverName: string;
}

export function PinTab({ driverId, driverName }: PinTabProps) {
  const { t } = useTranslation();
  const { atLeast } = usePermissions();
  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);
  const regenerate = useRegeneratePin();
  const [pin, setPin] = React.useState<string | null>(null);
  const [showPin, setShowPin] = React.useState(false);

  const handleRegenerate = () => {
    regenerate.mutate(driverId, {
      onSuccess: (data) => {
        setPin(data.data.pin);
        setShowPin(true);
      },
    });
  };

  const handleCopy = async () => {
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(pin);
      toast.success(t('drivers.pin.copied'));
    } catch {
      toast.error(t('drivers.pin.copyFailed'));
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-muted-foreground" />
            {t('drivers.pin.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {t('drivers.pin.description', { name: driverName })}
          </p>

          {pin && (
            <div className="flex items-center justify-center gap-4 rounded-lg border bg-muted/30 p-6">
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  {t('drivers.pin.currentPin')}
                </p>
                <p className="font-mono text-3xl font-bold tracking-[0.3em]">
                  {showPin ? pin : '••••'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPin(!showPin)}
                  title={showPin ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title={t('drivers.pin.copy')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {canManage ? (
            <Button
              onClick={handleRegenerate}
              disabled={regenerate.isPending}
              className="w-full"
            >
              {regenerate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {pin ? t('drivers.pin.regenerate') : t('drivers.pin.generate')}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              {t('drivers.pin.noPermission')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
