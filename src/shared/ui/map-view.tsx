import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { Skeleton } from './skeleton';
import { reportGoogleMapsFailure } from '@/shared/lib/maps/google-maps-health';
import { useMapProvider } from '@/shared/lib/maps/use-map-provider';
import type { MapViewProps } from '@/shared/lib/maps/types';

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
/* Provider selection                                                          */
/*                                                                             */
/* Not decided here. `google-maps-health` answers once for the whole app       */
/* whether Google Maps works — no key, a refused key, an SDK that won't load,  */
/* a map that never shows tiles — and every map follows that answer. When it  */
/* changes (Google fails while this map is on screen), this re-renders with    */
/* Leaflet, like every other map.                                              */
/* -------------------------------------------------------------------------- */

export function MapView({ onProviderChange, className, ...rest }: MapViewProps) {
  const provider = useMapProvider();

  React.useEffect(() => {
    onProviderChange?.(provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      {/* Keyed by provider: a fresh boundary (and a fresh map) on the switch. */}
      <ProviderErrorBoundary
        key={provider}
        onError={(err) => {
          // The Google chunk failed to load or the provider threw: every map
          // moves to Leaflet, this one included.
          if (provider === 'google') reportGoogleMapsFailure('error', err);
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
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/40">
      <Skeleton className="h-full w-full rounded-lg" />
      <span className="sr-only">{t('common.loadingMap', { defaultValue: 'Loading map…' })}</span>
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

class ProviderErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    this.props.onError(err);
  }

  render() {
    if (this.state.hasError) return <MapLoadingState />;
    return this.props.children;
  }
}
