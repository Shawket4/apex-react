import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

/* -------------------------------------------------------------------------- */
/* Loader configuration                                                        */
/* -------------------------------------------------------------------------- */

let loaderConfigured = false;
export function configureLoader() {
  if (loaderConfigured) return;
  const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
  setOptions({ key, v: 'weekly' });
  loaderConfigured = true;
}

export function isGoogleMapsConfigured(): boolean {
  return !!(import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined);
}

/* -------------------------------------------------------------------------- */
/* EAGER PRELOAD — fixes the Leaflet-fallback-on-slow-network bug             */
/*                                                                             */
/* MapView.tsx does a top-level import from this module to get               */
/* `isGoogleMapsConfigured`, which means this module evaluates the moment   */
/* MapView mounts — well before `GoogleMapView` is lazy-loaded. Kicking     */
/* off the SDK load here means by the time `getSharedMap()` awaits          */
/* `importLibrary`, the libraries are usually cached.                       */
/*                                                                             */
/* Without this, on slower connections the SDK download takes longer than   */
/* MapView's 3s `fallbackTimeoutMs`. MapView sees no `.gm-style` element,   */
/* assumes Google failed, and switches to Leaflet permanently — even       */
/* though the API key is valid and Google would have succeeded a moment    */
/* later. The eager preload moves the network race to a window before     */
/* the timer is even armed.                                                 */
/* -------------------------------------------------------------------------- */

if (typeof window !== 'undefined' && isGoogleMapsConfigured()) {
  configureLoader();
  void Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
  ]).catch(() => {
    /* errors are surfaced inside init() when the component actually mounts */
  });
}
