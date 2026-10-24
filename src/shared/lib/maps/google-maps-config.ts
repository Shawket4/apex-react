import { setOptions } from '@googlemaps/js-api-loader';

/* -------------------------------------------------------------------------- */
/* Google Maps configuration                                                   */
/*                                                                            */
/* The key and map id come from the build (VITE_*). Whether the key actually   */
/* WORKS is a different question, answered once for the whole app by           */
/* `google-maps-health.ts`; every map asks that module, never this one.        */
/* -------------------------------------------------------------------------- */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

let loaderConfigured = false;

/** Configure the JS API loader once per page load. */
export function configureLoader(): void {
  if (loaderConfigured) return;
  setOptions({ key: API_KEY, v: 'weekly' });
  loaderConfigured = true;
}

/** A key is present in the build. Says nothing about whether it works. */
export function isGoogleMapsConfigured(): boolean {
  return API_KEY.length > 0;
}

/** The vector map id (advanced markers need one). */
export function googleMapId(): string {
  return import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
}

/**
 * A short, non-reversible fingerprint of the key, so a remembered failure
 * belongs to the key that failed: a rotated key is tried again at once.
 */
export function googleKeyFingerprint(): string {
  // FNV-1a, 32-bit.
  let h = 0x811c9dc5;
  for (let i = 0; i < API_KEY.length; i++) {
    h ^= API_KEY.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
