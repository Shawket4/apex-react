import { useSyncExternalStore } from 'react';

/**
 * Reduced motion, read in one place. It answers synchronously on the first
 * render, before the GSAP chunk has landed, which is why it watches
 * `window.matchMedia` itself rather than `gsap.matchMedia()`.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

let mql: MediaQueryList | null | undefined;

function list(): MediaQueryList | null {
  if (mql === undefined) {
    mql =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(QUERY)
        : null;
  }
  return mql;
}

/** True when the visitor asked for less motion. */
export const prefersReducedMotion = () => list()?.matches ?? false;

function subscribe(onChange: () => void) {
  const l = list();
  l?.addEventListener?.('change', onChange);
  return () => l?.removeEventListener?.('change', onChange);
}

/** Reduced motion as React state; re-renders when it flips. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

/** Whether any part of `el` is inside the viewport right now. */
export function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw && (r.width > 0 || r.height > 0);
}
