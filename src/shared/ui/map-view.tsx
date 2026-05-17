import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { isGoogleMapsConfigured } from '@/shared/lib/maps/google-provider';
import type { MapProvider, MapViewProps } from '@/shared/lib/maps/types';

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

/* -------------------------------------------------------------------------- */
/* Lazy provider components                                                    */
/*                                                                             */
/* Both providers are lazy-loaded. The Google provider's bundle pulls in       */
/* @googlemaps/js-api-loader; Leaflet's pulls in leaflet + its CSS. Lazy       */
/* loading both means the user pays the cost of exactly one provider — the    */
/* one that ends up rendering — instead of both upfront.                      */
/* -------------------------------------------------------------------------- */

const GoogleMapView = React.lazy(() =>
  import('@/shared/lib/maps/google-provider').then((m) => ({
    default: m.GoogleMapView,
  })),
);

const LeafletMapView = React.lazy(() =>
  import('@/shared/lib/maps/leaflet-provider').then((m) => ({
    default: m.LeafletMapView,
  })),
);

/* -------------------------------------------------------------------------- */
/* Provider selection logic                                                    */
/*                                                                             */
/* Always tries Google first. Falls through to Leaflet when:                   */
/*   1. VITE_GOOGLE_MAPS_API_KEY isn't set in the environment                 */
/*   2. The Google SDK fails to load within `fallbackTimeoutMs` (default 3s)  */
/*   3. The Google SDK throws on import (e.g. blocked by network policy)      */
/*                                                                             */
/* Once the cascade has decided which provider to use for a given page load,  */
/* it sticks with that decision — we don't bounce back to Google after a      */
/* fallback, since the user has already seen the Leaflet UI.                  */
/* -------------------------------------------------------------------------- */

interface MapShellProps extends MapViewProps {}

export function MapView({
  fallbackTimeoutMs = 8000,
  onProviderChange,
  className,
  ...rest
}: MapShellProps) {
  // Decide initial provider synchronously based on env
  const [provider, setProvider] = React.useState<MapProvider>(() => {
    const configured = isGoogleMapsConfigured();
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    console.log('[MapView] Initializing map view.', {
      isGoogleMapsConfigured: configured,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
      fallbackTimeoutMs,
    });
    return configured ? 'google' : 'leaflet';
  });
  const [forcedFallback, setForcedFallback] = React.useState(false);

  // Listen for Google Maps authentication or referer failures globally.
  // This triggers an immediate, seamless fallback to Leaflet if the key is restricted/invalid.
  React.useEffect(() => {
    window.gm_authFailure = () => {
      console.warn('[MapView] Google Maps global auth/referer failure detected — falling back to Leaflet');
      setProvider('leaflet');
      setForcedFallback(true);
    };
    return () => {
      window.gm_authFailure = undefined;
    };
  }, []);

  // Notify consumer of provider choice
  React.useEffect(() => {
    console.log('[MapView] Map provider set to:', provider, { forcedFallback });
    onProviderChange?.(provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  /* -------- Timeout-based fallback -------------------------------------- */
  /*
   * If we're trying Google but the SDK doesn't render within the timeout,
   * flip to Leaflet. We can't directly observe "Google SDK loaded" from
   * here (the lazy boundary hides that), so we use a simple wall-clock
   * timer: if the Google component hasn't replaced the suspense fallback
   * within N ms, we assume it's stuck and switch. Once switched, we stay.
   */

  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (provider !== 'google' || forcedFallback) return;

    const timer = window.setTimeout(() => {
      // If after the timeout the inner container has no children with
      // dimension > 0, we assume Google failed silently (e.g. invalid key,
      // blocked network) and fall back. The "rendered something" check
      // looks for a Google-injected canvas/img/div with non-zero size.
      // We only accept `.gm-style` (fully loaded map) and exclude
      // `.gm-err-container` (error popup container) so that errors also fallback.
      const node = containerRef.current;
      if (!node) return;
      const rendered = node.querySelector('.gm-style');
      if (!rendered) {
        console.warn(
          '[MapView] Google Maps did not render within',
          fallbackTimeoutMs,
          'ms — falling back to Leaflet',
        );
        setProvider('leaflet');
        setForcedFallback(true);
      }
    }, fallbackTimeoutMs);

    return () => window.clearTimeout(timer);
  }, [provider, fallbackTimeoutMs, forcedFallback]);

  /* -------- Error-boundary-style fallback ------------------------------- */
  /*
   * The lazy import itself can reject — e.g. Google's loader hits a CORS
   * error or the chunk fails to fetch. React.lazy surfaces this as a
   * thrown promise / error which would otherwise crash the tree. A small
   * inline error boundary catches it and triggers fallback.
   */

  return (
    <div ref={containerRef} className={cn('relative h-full w-full', className)}>
      <ProviderErrorBoundary
        onError={(err) => {
          if (provider === 'google') {
            console.error('[MapView] Google provider threw an error — falling back to Leaflet:', err);
            setProvider('leaflet');
            setForcedFallback(true);
          }
        }}
      >
        <React.Suspense fallback={<MapLoadingState />}>
          {provider === 'google' ? (
            <GoogleMapView {...rest} className={className} />
          ) : (
            <LeafletMapView {...rest} className={className} />
          )}
        </React.Suspense>
      </ProviderErrorBoundary>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading + error states                                                      */
/* -------------------------------------------------------------------------- */

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/30">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-xs">Loading map…</span>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError: (err: unknown) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ProviderErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    this.props.onError(err);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset when children identity changes — i.e. provider swap
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return <MapLoadingState />;
    return this.props.children;
  }
}
