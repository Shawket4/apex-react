import { importLibrary } from '@googlemaps/js-api-loader';
import {
  configureLoader,
  googleKeyFingerprint,
  isGoogleMapsConfigured,
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
/*  - no key in the build                          → Leaflet from the start    */
/*  - the key is refused (invalid, restricted to    → `gm_authFailure`, or the  */
/*    other sites, API not enabled, billing off)      error overlay in the map */
/*  - the SDK does not load (blocked, offline)     → load error or timeout     */
/*  - a map shows no tiles within the render budget while it is on screen      */
/*                                                                            */
/* A refused key is remembered for a few hours (per key, so a new key is tried */
/* at once); anything else is retried on the next page load, since a slow or   */
/* flaky network says nothing about the key.                                   */
/*                                                                            */
/* The first Google map that renders tiles proves the key: status 'ok'.        */
/* -------------------------------------------------------------------------- */

export type GoogleMapsStatus =
  /** No key in the build. */
  | 'unconfigured'
  /** Not proven either way yet: Google is tried. */
  | 'unknown'
  /** A Google map rendered tiles. */
  | 'ok'
  /** Refused or unreachable: Leaflet everywhere. */
  | 'failed';

export type GoogleMapsFailure =
  /** The key was refused (invalid, referrer, API not enabled, billing). */
  | 'auth'
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
}

/** The SDK download. */
const LOAD_TIMEOUT_MS = 10_000;
/** A visible map's first tiles, once the SDK is in. */
const RENDER_TIMEOUT_MS = 15_000;
/** How long a refused key keeps the app on Leaflet without asking again. */
const REMEMBER_REFUSAL_MS = 6 * 60 * 60 * 1000;
const STORAGE_KEY = 'apex:google-maps-refused';

/* ── remembered refusal (per key) ── */

function rememberedRefusal(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { fp?: string; at?: number };
    return v.fp === googleKeyFingerprint() && Date.now() - (v.at ?? 0) < REMEMBER_REFUSAL_MS;
  } catch {
    return false;
  }
}

function rememberRefusal(): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fp: googleKeyFingerprint(), at: Date.now() }),
    );
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

function initialHealth(): GoogleMapsHealth {
  if (!isGoogleMapsConfigured()) return { status: 'unconfigured' };
  if (typeof window !== 'undefined' && rememberedRefusal()) {
    return { status: 'failed', reason: 'auth' };
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
  return h.status === 'unconfigured' || h.status === 'failed' ? 'leaflet' : 'google';
}

/**
 * Google failed, for every map. Idempotent: the first reason wins. A refused
 * key is remembered; a slow or broken load is not.
 */
export function reportGoogleMapsFailure(reason: GoogleMapsFailure, detail?: unknown): void {
  if (health.status === 'failed' || health.status === 'unconfigured') return;
  console.warn(`[maps] Google Maps unavailable (${reason}); every map uses Leaflet`, detail ?? '');
  if (reason === 'auth') rememberRefusal();
  setHealth({ status: 'failed', reason });
}

/** A Google map rendered tiles: the key works. */
export function reportGoogleMapsWorking(): void {
  if (health.status !== 'unknown') return;
  forgetRefusal();
  setHealth({ status: 'ok' });
}

/* ── the key's own failure signal ── */

declare global {
  interface Window {
    /** Called by the Maps JS API when it refuses the key. */
    gm_authFailure?: () => void;
  }
}

if (typeof window !== 'undefined') {
  // One handler for the app; chained, never replaced by a component.
  const previous = window.gm_authFailure;
  window.gm_authFailure = () => {
    previous?.();
    reportGoogleMapsFailure('auth');
  };
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
 * Watch a Google map just created. It rendering (its first tiles, or going
 * idle with no error showing — vector maps may report either) proves the key;
 * the error overlay Google puts in the map means it was refused; nothing
 * within the budget while the map is on screen means Google is not getting
 * through. A hidden or zero-size map is not held to the budget.
 */
export function watchGoogleMap(map: google.maps.Map, element: HTMLElement): void {
  if (health.status !== 'unknown') return;
  let done = false;
  let shownFor = 0;
  /** When the map went idle: a refusal shows within a moment of it. */
  let idleAt = 0;
  const STEP = 500;
  const IDLE_GRACE_MS = 2_000;

  const refused = () => !!element.querySelector('.gm-err-container, .gm-err-message');
  const onScreen = () => {
    const r = element.getBoundingClientRect();
    return element.isConnected && r.width > 0 && r.height > 0;
  };
  const finish = () => {
    done = true;
    window.clearInterval(tick);
    mapListeners.forEach((l) => google.maps.event.removeListener(l));
  };
  const settle = () => {
    if (done) return;
    finish();
    if (refused()) reportGoogleMapsFailure('auth');
    else reportGoogleMapsWorking();
  };

  const mapListeners = [
    map.addListener('tilesloaded', settle),
    map.addListener('idle', () => {
      idleAt ||= performance.now();
    }),
  ];
  const tick = window.setInterval(() => {
    if (done) return;
    if (health.status !== 'unknown') return finish();
    if (refused()) {
      finish();
      reportGoogleMapsFailure('auth');
      return;
    }
    if (idleAt && performance.now() - idleAt >= IDLE_GRACE_MS) return settle();
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
    get: () => ({ ...health, provider: mapProviderFor() }),
  });
}
