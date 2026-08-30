import * as React from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';
import { resolveAnimationPath } from '@/shared/lib/animations';

const LazyDotLottieReact = React.lazy(() =>
  import('@lottiefiles/dotlottie-react').then((module) => ({
    default: module.DotLottieReact,
  }))
);

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  const { theme = 'system' } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="top-right"
      richColors={false}
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          success:
            'group-[.toaster]:border-success/40 group-[.toaster]:bg-success/10 group-[.toaster]:text-success',
          error:
            'group-[.toaster]:border-destructive/40 group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive',
          warning:
            'group-[.toaster]:border-warning/40 group-[.toaster]:bg-warning/10 group-[.toaster]:text-warning',
          info: 'group-[.toaster]:border-primary/40 group-[.toaster]:bg-primary/10 group-[.toaster]:text-primary',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      icons={{
        success: (
          <React.Suspense fallback={<div className="h-5 w-5 bg-transparent" />}>
            <div className="h-10 w-10 shrink-0 flex items-center justify-center -ms-2 me-3 motion-reduce:hidden">
              <LazyDotLottieReact src={resolveAnimationPath('/animations/success.lottie')} loop={false} autoplay />
            </div>
          </React.Suspense>
        ),
        error: (
          <React.Suspense fallback={<div className="h-5 w-5 bg-transparent" />}>
            <div className="h-10 w-10 shrink-0 flex items-center justify-center -ms-2 me-3 motion-reduce:hidden">
              <LazyDotLottieReact src={resolveAnimationPath('/animations/warning.lottie')} loop={false} autoplay />
            </div>
          </React.Suspense>
        ),
      }}
      {...props}
    />
  );
}
