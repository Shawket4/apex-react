import { importLibrary } from '@googlemaps/js-api-loader';
import {
  configureLoader,
  googleKeyFingerprint,
  isGoogleMapsConfigured,
  mapProviderSetting,
} from './google-maps-config';
import type { MapProvider } from './types';

/* -------------------------------------------------------------------------- */
/* Does Google Maps work here? One answer for the whole app.                   */
/*                                                                            */
/* Every map in the dashboard (the MapView surfaces, the trip replay, live     */
/* tracking) reads its provider from here, so they all agree: Google while it */
/* has not failed, Leaflet the moment it does. A failure anywhere moves every  */
/* map, the ones on screen included.                                           */
/*                                                                            */
/* What counts as failing:                                                     */
/*  - the build says Leaflet (VITE_MAP_PROVIDER)   → Leaflet, SDK never loaded */
/*  - no key in the build                          → Leaflet from the start    */
/*  - the key is refused (invalid, restricted to    → `gm_authFailure`, the     */
/*    other sites, API not enabled)                   error overlay in the map, */
/*                                                    or Google's console error */
/*  - billing is off on the key's project          → Google's console error    */
/*    (BillingNotEnabledMapError). Nothing else      (`…MapError`), or its      */
/*    says so: no gm_authFailure, and the tiles DO   "This page can't load      */
/*    load, dimmed and watermarked "For development  Google Maps correctly"    */
/*    purposes only". Verified with a real key.      dialog in the map         */
/*  - the SDK does not load (blocked, offline)     → load error or timeout     */
/*  - a map shows no tiles within the render budget while it is on screen      */
/*                                                                            */
/* A refused key is remembered for a few hours (per key, so a new key is tried */
/* at once); anything else is retried on the next page load, since a slow or   */
/* flaky network says nothing about the key.                                   */
/*                                                                            */
/* The first Google map that renders tiles, and shows no refusal for a moment  */
/* after, proves the key: status 'ok'. Google can still fail later (a refusal  */
/* logged after that moves every map, the ones on screen included).            */
/*                                                                            */
/* VITE_MAP_PROVIDER=google keeps Google whatever this finds (failures are     */
/* still logged and shown in `apexGoogleMaps`), for debugging the key itself.  */
/* -------------------------------------------------------------------------- */

export type GoogleMapsStatus =
  /** The build chose Leaflet (VITE_MAP_PROVIDER=leaflet). */
  | 'off'
  /** No key in the build. */
  | 'unconfigured'
  /** Not proven either way yet: Google is tried. */
  | 'unknown'
  /** A Google map rendered tiles. */
  | 'ok'
  /** Refused or unreachable: Leaflet everywhere. */
  | 'failed';

export type GoogleMapsFailure =
  /** The key was refused (invalid, referrer, API not enabled). */
  | 'auth'
  /** The key's project has no billing: watermarked, dimmed maps. */
  | 'billing'
  /** The SDK failed to load. */
  | 'load'
  /** The SDK, or a map's first tiles, took longer than the budget. */
  | 'timeout'
  /** A Google map threw while being set up. */
  | 'error';

export interface GoogleMapsHealth {
  status: GoogleMapsStatus;
  /** Why Google is not used, once it failed. */
  reason?: GoogleMapsFailure;
  /** Google's own error code, when it gave one (e.g. BillingNotEnabledMapError). */
  code?: string;
}

/**
 * The errors the Maps JS API logs (`Google Maps JavaScript API error: <code>`)
 * when the key cannot be used; each leaves the map broken or watermarked.
 * https://developers.google.com/maps/documentation/javascript/error-messages
 */
const REFUSAL_CODES: Record<string, GoogleMapsFailure> = {
  BillingNotEnabledMapError: 'billing',
  OverQuotaMapError: 'billing',
  ApiNotActivatedMapError: 'auth',
  ApiProjectMapError: 'auth',
  ApiTargetBlockedMapError: 'auth',
  DeletedApiProjectMapError: 'auth',
  ExpiredKeyMapError: 'auth',
  InvalidClientIdMapError: 'auth',
  InvalidKeyMapError: 'auth',
  MissingKeyMapError: 'auth',
  ProjectDeniedMapError: 'auth',
  RefererDeniedMapError: 'auth',
  RefererNotAllowedMapError: 'auth',
  UrlAuthenticationCommonError: 'auth',
};

/** A failure that is the key's fault, so remembered across page loads. */
const KEY_FAULTS: ReadonlySet<GoogleMapsFailure> = new Set(['auth', 'billing']);

/** The code in a Maps JS API console error, if the message is one. */
export function googleMapsErrorCode(message: string): string | null {
  const m = /Google Maps JavaScript API error:\s*(\w+)/.exec(message);
  return m ? m[1] : null;
}

/** The SDK download. */
const LOAD_TIMEOUT_MS = 10_000;
/** A visible map's first tiles, once the SDK is in. */
const RENDER_TIMEOUT_MS = 15_000;
/** How long a refused key keeps the app on Leaflet without asking again. */
const REMEMBER_REFUSAL_MS = 6 * 60 * 60 * 1000;
const STORAGE_KEY = 'apex:google-maps-refused';

/* ── remembered refusal (per key) ── */

interface RememberedRefusal {
  fp?: string;
  at?: number;
  reason?: GoogleMapsFailure;
  code?: string;
}

function rememberedRefusal(): GoogleMapsHealth | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as RememberedRefusal;
    if (v.fp !== googleKeyFingerprint() || Date.now() - (v.at ?? 0) >= REMEMBER_REFUSAL_MS) {
      return null;
    }
    const reason = v.reason && KEY_FAULTS.has(v.reason) ? v.reason : 'auth';
    return v.code ? { status: 'failed', reason, code: v.code } : { status: 'failed', reason };
  } catch {
    return null;
  }
}

function rememberRefusal(reason: GoogleMapsFailure, code?: string): void {
  try {
    const v: RememberedRefusal = { fp: googleKeyFingerprint(), at: Date.now(), reason, code };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable: refused for this page load only */
  }
}

function forgetRefusal(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to forget */
  }
}

/* ── the store ── */

/** VITE_MAP_PROVIDER=google: Google whatever this module finds. */
const forcedGoogle = mapProviderSetting() === 'google';

function initialHealth(): GoogleMapsHealth {
  if (mapProviderSetting() === 'leaflet') return { status: 'off' };
  if (!isGoogleMapsConfigured()) return { status: 'unconfigured' };
  if (!forcedGoogle && typeof window !== 'undefined') {
    const refused = rememberedRefusal();
    if (refused) return refused;
  }
  return { status: 'unknown' };
}

let health: GoogleMapsHealth = initialHealth();
const listeners = new Set<() => void>();

function setHealth(next: GoogleMapsHealth): void {
  health = next;
  listeners.forEach((l) => l());
}

/** The current answer. Stable object identity until it changes. */
export function getGoogleMapsHealth(): GoogleMapsHealth {
  return health;
}

export function subscribeGoogleMapsHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Which provider a map should use right now. */
export function mapProviderFor(h: GoogleMapsHealth = health): MapProvider {
  if (h.status === 'off' || h.status === 'unconfigured') return 'leaflet';
  if (h.status === 'failed' && !forcedGoogle) return 'leaflet';
  return 'google';
}

/**
 * Google failed, for every map. Idempotent: the first reason wins. A key's
 * fault (refused, no billing) is remembered; a slow or broken load is not.
 */
export function reportGoogleMapsFailure(
  reason: GoogleMapsFailure,
  detail?: unknown,
  code?: string,
): void {
  if (health.status === 'failed' || health.status === 'off' || health.status === 'unconfigured') {
    return;
  }
  const what = code ? `${reason}: ${code}` : reason;
  if (forcedGoogle) {
    console.warn(`[maps] Google Maps is failing (${what}); kept by VITE_MAP_PROVIDER=google`);
  } else {
    console.warn(`[maps] Google Maps unavailable (${what}); every map uses Leaflet`, detail ?? '');
    if (KEY_FAULTS.has(reason)) rememberRefusal(reason, code);
  }
  setHealth(code ? { status: 'failed', reason, code } : { status: 'failed', reason });
}

/** A Google map rendered tiles: the key works. */
export function reportGoogleMapsWorking(): void {
  if (health.status !== 'unknown') return;
  forgetRefusal();
  setHealth({ status: 'ok' });
}

/* ── the key's own failure signals ── */

declare global {
  interface Window {
    /** Called by the Maps JS API when it refuses the key. */
    gm_authFailure?: () => void;
  }
}

/** Google logged one of its key errors (see REFUSAL_CODES). */
export function noteGoogleConsoleError(message: string): void {
  const code = googleMapsErrorCode(message);
  const reason = code ? REFUSAL_CODES[code] : undefined;
  if (code && reason) reportGoogleMapsFailure(reason, undefined, code);
}

if (typeof window !== 'undefined' && mapProviderFor() === 'google') {
  // One handler for the app; chained, never replaced by a component.
  const previous = window.gm_authFailure;
  window.gm_authFailure = () => {
    previous?.();
    reportGoogleMapsFailure('auth');
  };

  // Billing off fires no gm_authFailure and still draws (watermarked) tiles;
  // the one machine-readable sign is the error Google logs. Listen for it,
  // passing everything through untouched. Installed before the SDK loads.
  if (typeof console !== 'undefined') {
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      try {
        if (typeof args[0] === 'string') noteGoogleConsoleError(args[0]);
      } catch {
        /* never let the listener break logging */
      }
      original(...args);
    };
  }
}

/* ── loading ── */

class Timeout extends Error {}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Timeout(`no answer in ${ms} ms`)), ms);
    p.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

let loading: Promise<boolean> | null = null;

/**
 * Load the SDK (maps + marker) once. Resolves false when Google is not to be
 * used, so a caller can simply give up: the provider has already moved to
 * Leaflet and its surface will re-render with it.
 */
export function loadGoogleMaps(): Promise<boolean> {
  if (mapProviderFor() === 'leaflet') return Promise.resolve(false);
  loading ??= (async () => {
    try {
      configureLoader();
      await withTimeout(
        Promise.all([importLibrary('maps'), importLibrary('marker')]),
        LOAD_TIMEOUT_MS,
      );
      return mapProviderFor() === 'google';
    } catch (err) {
      reportGoogleMapsFailure(err instanceof Timeout ? 'timeout' : 'load', err);
      return false;
    }
  })();
  return loading.then((ok) => ok && mapProviderFor() === 'google');
}

/**
 * Google's in-map signs that the key cannot be used:
 *  - `.gm-err-container`: the grey "Oops! Something went wrong" overlay
 *    (refused key);
 *  - `.dismissButton`: the OK button of the "This page can't load Google Maps
 *    correctly" dialog it lays over a dimmed, watermarked map (billing off and
 *    other key errors). The class, not the text: the text is localised.
 */
const REFUSAL_SELECTOR = '.gm-err-container, .gm-err-message, .dismissButton';

/** The map shows Google's refusal (overlay or "can't load correctly" dialog). */
export function showsGoogleRefusal(element: ParentNode): boolean {
  return !!element.querySelector(REFUSAL_SELECTOR);
}

/**
 * Watch a Google map just created. It rendering (its first tiles, or going
 * idle — vector maps may report either) and showing no refusal for a moment
 * after proves the key; Google's error overlay or its "can't load correctly"
 * dialog in the map means it was refused (billing off draws tiles first, the
 * dialog lands just after); nothing within the budget while the map is on
 * screen means Google is not getting through. A hidden or zero-size map is
 * not held to the budget.
 */
export function watchGoogleMap(map: google.maps.Map, element: HTMLElement): void {
  if (health.status !== 'unknown') return;
  let done = false;
  let shownFor = 0;
  /** When the map drew (tiles, or idle): a refusal shows within a moment of it. */
  let drawnAt = 0;
  const STEP = 500;
  /** Billing off: tiles at ~2.5 s, Google's dialog ~1 s after the error. */
  const REFUSAL_GRACE_MS = 2_500;

  const refused = () => showsGoogleRefusal(element);
  const onScreen = () => {
    const r = element.getBoundingClientRect();
    return element.isConnected && r.width > 0 && r.height > 0;
  };
  const finish = () => {
    done = true;
    window.clearInterval(tick);
    mapListeners.forEach((l) => google.maps.event.removeListener(l));
  };
  const drawn = () => {
    drawnAt ||= performance.now();
  };

  const mapListeners = [map.addListener('tilesloaded', drawn), map.addListener('idle', drawn)];
  const tick = window.setInterval(() => {
    if (done) return;
    if (health.status !== 'unknown') return finish();
    if (refused()) {
      finish();
      reportGoogleMapsFailure('auth', 'Google shows its error in the map');
      return;
    }
    if (drawnAt && performance.now() - drawnAt >= REFUSAL_GRACE_MS) {
      finish();
      reportGoogleMapsWorking();
      return;
    }
    if (onScreen()) shownFor += STEP;
    if (shownFor >= RENDER_TIMEOUT_MS) {
      finish();
      reportGoogleMapsFailure('timeout');
    }
  }, STEP);
}

/* ── start early, and let a person look ── */

if (typeof window !== 'undefined') {
  // Fetch the SDK as soon as anything map-related is imported, so the first
  // map does not wait for it (and a blocked SDK is known before it does).
  if (typeof document !== 'undefined' && mapProviderFor() === 'google') {
    void loadGoogleMaps().catch(() => {});
  }

  // `apexGoogleMaps` in the console: is Google Maps working, and if not, why.
  Object.defineProperty(window, 'apexGoogleMaps', {
    configurable: true,
    get: () => ({ ...health, provider: mapProviderFor(), setting: mapProviderSetting() }),
  });
}
