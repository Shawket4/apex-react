import * as React from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast as sonnerToast } from 'sonner';

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
    const { title, description, variant, ...rest } = message as ToastPayload;
    
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
