import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Key,
  Copy,
  RefreshCw,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useRegeneratePin } from '@/entities/driver/queries';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { toast } from '@/shared/ui/toaster';
import { cn } from '@/shared/lib/cn';

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
  const [copied, setCopied] = React.useState(false);

  const handleRegenerate = () => {
    regenerate.mutate(driverId, {
      onSuccess: (data) => {
        setPin(data.data.pin);
        setShowPin(true);
        setCopied(false);
      },
    });
  };

  const handleCopy = async () => {
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      toast.success(t('drivers.pin.copied'));
      // Reset the visual check after a beat so repeated copies re-confirm
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('drivers.pin.copyFailed'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Key className="h-4 w-4 text-muted-foreground" />
          {t('drivers.pin.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('drivers.pin.description', { name: driverName })}
        </p>

        {pin && (
          <div className="flex flex-col items-stretch gap-3 rounded-md border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="mb-1 text-xs text-muted-foreground">
                {t('drivers.pin.currentPin')}
              </p>
              <p
                className={cn(
                  'font-mono text-2xl font-semibold tabular-nums tracking-[0.25em]',
                  !showPin && 'tracking-[0.2em]',
                )}
                dir="ltr"
              >
                {showPin ? pin : '••••'}
              </p>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPin((s) => !s)}
                    aria-label={showPin ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {showPin ? t('auth.hidePassword') : t('auth.showPassword')}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    aria-label={t('drivers.pin.copy')}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {copied ? t('drivers.pin.copied') : t('drivers.pin.copy')}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {canManage ? (
          <div className="flex">
            <Button
              onClick={handleRegenerate}
              disabled={regenerate.isPending}
              variant={pin ? 'outline' : 'default'}
            >
              {regenerate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {pin ? t('drivers.pin.regenerate') : t('drivers.pin.generate')}
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-2.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t('drivers.pin.noPermission')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}