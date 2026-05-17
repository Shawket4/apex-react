import * as React from 'react';
import { cn } from '@/shared/lib/cn';

const LazyDotLottieReact = React.lazy(() =>
  import('@lottiefiles/dotlottie-react').then((module) => ({
    default: module.DotLottieReact,
  }))
);

interface EmptyStateProps {
  icon?: React.ReactNode;
  lottieSrc?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  lottieWidth?: number | string;
  lottieHeight?: number | string;
}

export function EmptyState({
  icon,
  lottieSrc,
  title,
  description,
  action,
  className,
  lottieWidth = 120,
  lottieHeight = 120,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center',
        className,
      )}
    >
      {lottieSrc ? (
        <div style={{ width: lottieWidth, height: lottieHeight }} className="flex items-center justify-center shrink-0">
          <React.Suspense fallback={<div className="h-full w-full bg-transparent" />}>
            <LazyDotLottieReact src={lottieSrc} loop autoplay />
          </React.Suspense>
        </div>
      ) : icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
