import type { gsap as GsapCore } from 'gsap';

import { DURATION, EASE, EASE_NAME, sec, type EaseName } from './tokens';

/**
 * GSAP, loaded lazily. Nothing outside src/shared/lib/motion imports it (lint
 * enforces that): the core is its own chunk, fetched at boot. Until it lands,
 * entrances hold their pre-state and play through the Web Animations API if
 * it is late (engine.ts), so nothing waits on it and nothing skips.
 */
export type Gsap = typeof GsapCore;
export type Tween = GSAPTween;
export type TweenVars = GSAPTweenVars;

let core: Gsap | null = null;
let pending: Promise<Gsap> | null = null;

/** GSAP if it has loaded, else null. Motion code treats null as "show it still". */
export function getGsap(): Gsap | null {
  return core;
}

/** Load GSAP once, with the motion eases registered. Safe to call repeatedly. */
export function loadGsap(): Promise<Gsap> {
  pending ??= Promise.all([import('gsap'), import('gsap/CustomEase')]).then(([g, c]) => {
    const gsap = g.gsap;
    gsap.registerPlugin(c.CustomEase);
    for (const name of Object.keys(EASE) as EaseName[]) {
      c.CustomEase.create(EASE_NAME[name], EASE[name].join(','));
    }
    gsap.defaults({ duration: sec(DURATION.base), ease: EASE_NAME.out });
    // Targets that unmounted mid-tween are expected, not an error.
    gsap.config({ nullTargetWarn: false });
    // A long frame (mounting a heavy form, a slow phone) must not eat the
    // animation: any gap over 50 ms counts as one 33 ms step, so on a device
    // that drops frames the motion runs slower instead of jumping to its end
    // behind the jank. At 60 fps (16 ms frames) nothing changes.
    gsap.ticker.lagSmoothing(50, 33);
    core = gsap;
    return gsap;
  });
  return pending;
}

/**
 * Fetch GSAP now, at boot. It is its own chunk (never in the entry bundle)
 * and index.html carries a modulepreload hint for it (vite.config.ts), so it
 * downloads alongside the entry instead of after it. A failed fetch (offline,
 * a blocked chunk) leaves entrances on the Web Animations fallback; the next
 * call tries again.
 */
export function preloadGsap(): void {
  if (typeof window === 'undefined') return;
  void loadGsap().catch(() => {
    pending = null;
  });
}
