import * as React from 'react';
import { toast as sonnerToast } from 'sonner';

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
