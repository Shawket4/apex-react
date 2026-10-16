/**
 * The motion tokens: the one source for every duration, easing, distance and
 * stagger in the app. `motion.css` mirrors them as CSS custom properties and
 * `tailwind.config.ts` exposes those as `duration-*` / `ease-*` classes;
 * `tokens.test.ts` fails if the CSS drifts from this file.
 *
 * One register: product. 160–220 ms, 4–6 px, and motion only says what
 * changed (arrived, left, updated). Nothing overshoots, nothing decorates.
 */

/** Durations in milliseconds. GSAP takes seconds: use `sec()`. */
export const DURATION = {
  /** Hover, press, poppers, every exit. */
  fast: 160,
  /** The default: entrances, dialogs, tab and route changes. */
  base: 220,
  /** Sheets and anything that crosses a large part of the screen. */
  slow: 320,
  /** KPI count-ups and chart draws, which run in lockstep. */
  count: 1100,
} as const;

/** Cubic-bézier control points. GSAP registers each under `EASE_NAME[key]`. */
export const EASE = {
  /** Decelerating (ease-out-quint): every entrance. */
  out: [0.22, 1, 0.36, 1],
  /** Accelerating: exits leave quickly and never linger. */
  in: [0.5, 0, 0.75, 0],
  /** Symmetric: things that move between two resting places, the shimmer. */
  inOut: [0.65, 0, 0.35, 1],
  /** The drawer curve: sheets and the sidebar. */
  drawer: [0.32, 0.72, 0, 1],
} as const;

export type EaseName = keyof typeof EASE;

/** The names the eases are registered under in GSAP (`ease: EASE_NAME.out`). */
export const EASE_NAME: Record<EaseName, string> = {
  out: 'apexOut',
  in: 'apexIn',
  inOut: 'apexInOut',
  drawer: 'apexDrawer',
};

/** Travel distances in px. */
export const DISTANCE = {
  /** A nudge: poppers, a dialog settling. */
  xs: 4,
  /** Entrances and list rows. */
  sm: 6,
} as const;

/** Scales a pressed or arriving element starts from. */
export const SCALE = {
  /** A pressed control. */
  press: 0.97,
  /** An overlay arriving: dialogs, menus. */
  overlay: 0.97,
} as const;

/** Stagger between siblings, in seconds, and the most a whole stagger may add. */
export const STAGGER = {
  each: 0.03,
  /** However many items, a stagger adds at most this much in total. */
  maxTotal: 0.3,
  /** Items past this index arrive with the last staggered one. */
  maxItems: 12,
} as const;

/** Milliseconds → seconds, for GSAP. */
export const sec = (ms: number) => ms / 1000;

/** The per-item stagger for `count` items, capped so the whole run stays short. */
export function staggerFor(count: number): number {
  const n = Math.min(count, STAGGER.maxItems);
  return n > 1 ? Math.min(STAGGER.each, STAGGER.maxTotal / (n - 1)) : 0;
}

/** The delay of item `i` in a stagger of `count`. */
export function staggerDelay(i: number, count: number): number {
  return Math.min(i, STAGGER.maxItems - 1) * staggerFor(count);
}
