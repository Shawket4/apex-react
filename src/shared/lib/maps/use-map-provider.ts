import * as React from 'react';
import {
  getGoogleMapsHealth,
  mapProviderFor,
  subscribeGoogleMapsHealth,
  type GoogleMapsHealth,
} from './google-maps-health';
import type { MapProvider } from './types';

/** Whether Google Maps works here (see google-maps-health.ts). */
export function useGoogleMapsHealth(): GoogleMapsHealth {
  return React.useSyncExternalStore(
    subscribeGoogleMapsHealth,
    getGoogleMapsHealth,
    getGoogleMapsHealth,
  );
}

/**
 * The provider every map should render with right now: Google until it fails,
 * then Leaflet. Re-renders the caller when that changes, mid-session too.
 */
export function useMapProvider(): MapProvider {
  return mapProviderFor(useGoogleMapsHealth());
}
