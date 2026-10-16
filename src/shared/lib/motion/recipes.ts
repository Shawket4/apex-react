import type { TweenVars } from './gsap';
import { DISTANCE, DURATION, EASE_NAME, SCALE, sec } from './tokens';

/**
 * The motion vocabulary: every enter/exit in the app is one of these. A recipe
 * is the state an element arrives from (`from`), the state it settles in
 * (`to`), and how it leaves (`exit`). Hooks and components take recipes;
 * nothing else writes raw tween values.
 */
export interface Recipe {
  from: TweenVars;
  to: TweenVars;
  exit: TweenVars;
}

const TRANSFORM_KEYS = [
  'x',
  'y',
  'xPercent',
  'yPercent',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotation',
];

/**
 * The reduced-motion form of a recipe: nothing travels or scales, opacity
 * still changes over the fast duration so an overlay is not a jump cut.
 */
export function reduce(recipe: Recipe): Recipe {
  const strip = (v: TweenVars): TweenVars => {
    const out: TweenVars = { ...v };
    for (const k of TRANSFORM_KEYS) delete out[k];
    if (out.duration !== undefined)
      out.duration = Math.min(Number(out.duration), sec(DURATION.fast));
    delete out.stagger;
    return out;
  };
  return { from: strip(recipe.from), to: strip(recipe.to), exit: strip(recipe.exit) };
}

/** Rise into place: the default entrance for content. */
export function rise(distance: number = DISTANCE.sm): Recipe {
  return {
    from: { opacity: 0, y: distance },
    to: { opacity: 1, y: 0, duration: sec(DURATION.base), ease: EASE_NAME.out },
    exit: {
      opacity: 0,
      y: -Math.round(distance / 2),
      duration: sec(DURATION.fast),
      ease: EASE_NAME.in,
    },
  };
}

/** Fade only: for content that should not move (a page, a chart, a scrim). */
export function fade(duration: number = DURATION.base): Recipe {
  return {
    from: { opacity: 0 },
    to: { opacity: 1, duration: sec(duration), ease: EASE_NAME.out },
    exit: { opacity: 0, duration: sec(DURATION.fast), ease: EASE_NAME.in },
  };
}

/** A centred dialog. Its centring uses the CSS `translate` property, so GSAP's transform is free. */
export const dialog: Recipe = {
  from: { opacity: 0, scale: SCALE.overlay, y: DISTANCE.xs },
  to: { opacity: 1, scale: 1, y: 0, duration: sec(DURATION.base), ease: EASE_NAME.out },
  exit: { opacity: 0, scale: 0.98, y: 2, duration: sec(DURATION.fast), ease: EASE_NAME.in },
};

/** The scrim behind a dialog or sheet. */
export const backdrop: Recipe = fade(DURATION.base);

export type Side = 'top' | 'right' | 'bottom' | 'left';

/** A sheet sliding in from a physical screen edge (the caller resolves RTL to a physical side). */
export function sheet(side: Side): Recipe {
  const offset: TweenVars =
    side === 'right'
      ? { xPercent: 100 }
      : side === 'left'
        ? { xPercent: -100 }
        : side === 'top'
          ? { yPercent: -100 }
          : { yPercent: 100 };
  return {
    from: { ...offset },
    to: { xPercent: 0, yPercent: 0, duration: sec(DURATION.slow), ease: EASE_NAME.drawer },
    exit: { ...offset, duration: sec(DURATION.base), ease: EASE_NAME.in },
  };
}

/** The scrim behind a sheet: in step with the panel. */
export const sheetBackdrop: Recipe = {
  from: { opacity: 0 },
  to: { opacity: 1, duration: sec(DURATION.slow), ease: EASE_NAME.drawer },
  exit: { opacity: 0, duration: sec(DURATION.base), ease: EASE_NAME.in },
};

/**
 * A menu, popover, select or tooltip, nudged out of the trigger it is anchored
 * to. `side` is Radix's `data-side`, which is already physical and already
 * flipped for collisions.
 */
export function popper(side: string | undefined): Recipe {
  const d = DISTANCE.xs;
  const nudge: TweenVars =
    side === 'top'
      ? { y: d }
      : side === 'left'
        ? { x: d }
        : side === 'right'
          ? { x: -d }
          : { y: -d };
  return {
    from: { opacity: 0, scale: SCALE.overlay, ...nudge },
    to: { opacity: 1, scale: 1, x: 0, y: 0, duration: sec(DURATION.fast), ease: EASE_NAME.out },
    exit: { opacity: 0, scale: SCALE.overlay, duration: sec(DURATION.fast), ease: EASE_NAME.in },
  };
}
