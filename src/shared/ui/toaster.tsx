import * as React from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
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
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      icons={{
        success: (
          <React.Suspense fallback={<div className="h-5 w-5 bg-transparent" />}>
            <div className="h-10 w-10 shrink-0 flex items-center justify-center -ms-2 me-3 drop-shadow-md">
              <LazyDotLottieReact src={resolveAnimationPath('/animations/success.lottie')} loop autoplay />
            </div>
          </React.Suspense>
        ),
        error: (
          <React.Suspense fallback={<div className="h-5 w-5 bg-transparent" />}>
            <div className="h-10 w-10 shrink-0 flex items-center justify-center -ms-2 me-3 drop-shadow-md">
              <LazyDotLottieReact src={resolveAnimationPath('/animations/warning.lottie')} loop autoplay />
            </div>
          </React.Suspense>
        ),
      }}
      {...props}
    />
  );
}

interface ToastPayload {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'success';
}

/**
 * Enhanced toast wrapper that supports both sonner's native string/ReactNode
 * API and the shadcn-style { title, description, variant } object API.
 */
export const toast = (
  message: string | React.ReactNode | ToastPayload,
  options?: any,
) => {
  if (typeof message === 'object' && message !== null && 'title' in message) {
    let { title, description, variant, ...rest } = message as ToastPayload;
    
    // Auto-infer success if no variant is specified but title suggests it
    if (!variant && typeof title === 'string') {
      const lower = title.toLowerCase();
      if (lower.includes('success') || lower.includes('saved') || lower.includes('created') || lower.includes('deleted')) {
        variant = 'success';
      }
    }

    // Map variants to sonner methods
    const method = 
      variant === 'destructive' ? sonnerToast.error :
      variant === 'success' ? sonnerToast.success :
      sonnerToast;

    return method(title, {
      description,
      ...rest,
      ...options,
    });
  }

  return sonnerToast(message as any, options);
};

// Re-export sonner's specific methods for direct usage
toast.success = sonnerToast.success;
toast.error = sonnerToast.error;
toast.info = sonnerToast.info;
toast.warning = sonnerToast.warning;
toast.loading = sonnerToast.loading;
toast.promise = sonnerToast.promise;
toast.dismiss = sonnerToast.dismiss;
toast.custom = sonnerToast.custom;
