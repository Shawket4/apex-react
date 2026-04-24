import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { queryClient } from '@/shared/api/query';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { Toaster } from '@/shared/ui/toaster';
import { setLogoutHandler } from '@/shared/api/client';
import { useAuthStore, syncLegacyStorage } from '@/shared/auth/store';
import { STORAGE_KEYS } from '@/shared/config/constants';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Register the logout handler with the API client so 401s clear auth state
  React.useEffect(() => {
    setLogoutHandler(() => {
      useAuthStore.getState().clearSession();
      queryClient.clear();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    });
    // Mirror persisted auth into the legacy localStorage keys so the
    // axios interceptor finds the JWT under `jwt` on first request.
    syncLegacyStorage();
    useAuthStore.getState().markInitialized();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={STORAGE_KEYS.THEME}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
