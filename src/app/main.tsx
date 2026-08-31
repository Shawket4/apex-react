import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import './index.css';
import 'leaflet/dist/leaflet.css';
import '@/shared/i18n';

import { initSentry } from '@/shared/observability/sentry';
import { Providers } from './providers';
import { router } from './router';
import { initConsoleSilencer } from './console-silencer';
import { prefetchAnimations } from '@/shared/lib/prefetch';

// Before anything else renders, so an error during the first paint is still
// reported. No-op unless VITE_SENTRY_DSN is set.
initSentry();

initConsoleSilencer();

// Safely prefetch all lottie animations & engine in the background
prefetchAnimations();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
