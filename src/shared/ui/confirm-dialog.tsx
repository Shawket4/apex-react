import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { resolveAnimationPath } from '@/shared/lib/animations';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from './dialog';
import { Button } from './button';

const LazyDotLottieReact = React.lazy(() =>
  import('@lottiefiles/dotlottie-react').then((module) => ({
    default: module.DotLottieReact,
  }))
);

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'success';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  lottieSrc?: string;
  /** Render above bottom sheets (needed when confirming from inside one). */
  stacked?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'destructive',
  loading = false,
  onConfirm,
  lottieSrc,
  stacked = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  // Auto-default Lottie animation based on variant
  const activeLottieSrc = lottieSrc ?? (
    variant === 'destructive' ? '/animations/warning.lottie' :
    variant === 'success' ? '/animations/success.lottie' :
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent stacked={stacked} className="max-w-[400px] text-center p-6 gap-4">
        <div className="flex flex-col items-center gap-4">
          {activeLottieSrc && (
            <div
              aria-hidden="true"
              className="flex h-20 w-20 items-center justify-center shrink-0 motion-reduce:hidden"
            >
              <React.Suspense fallback={<div className="h-full w-full bg-transparent" />}>
                <LazyDotLottieReact
                  src={resolveAnimationPath(activeLottieSrc)}
                  loop
                  autoplay
                />
              </React.Suspense>
            </div>
          )}
          
          <div className="space-y-2">
            <DialogTitle className="text-center">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-muted-foreground text-center px-2">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            variant={variant === 'success' ? 'default' : variant}
            onClick={() => void onConfirm()}
            disabled={loading}
            className="w-full sm:w-auto min-w-[80px]"
          >
            {loading && (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            )}
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}