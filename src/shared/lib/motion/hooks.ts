import { useEffect, useRef, useState, type DependencyList, type RefObject } from 'react';

import { count, enter, leave, markPainted, mayEnter } from './engine';
import { getGsap, type Gsap } from './gsap';
import { inViewport, prefersReducedMotion } from './media';
import { rise, type Recipe } from './recipes';
import { DURATION, EASE_NAME, sec, staggerDelay } from './tokens';
import { useIsoLayoutEffect, useLatest } from './latest';

export interface MotionEnv {
  reduced: boolean;
}

/**
 * Run GSAP code scoped to an element, the way @gsap/react's useGSAP does:
 * everything created inside is collected in a `gsap.context` and reverted on
 * cleanup, so StrictMode's double mount and fast re-renders leave no stray
 * tweens or inline styles. Runs before paint. For user-triggered feedback
 * (shake, pop), which comes long after GSAP has landed at boot; if it has
 * not, the effect is skipped.
 */
export function useGsap(
  effect: (gsap: Gsap, env: MotionEnv) => void | (() => void),
  deps: DependencyList,
  { scope }: { scope?: RefObject<Element | null> } = {},
) {
  const effectRef = useLatest(effect);
  useIsoLayoutEffect(() => {
    const gsap = getGsap();
    if (!gsap) return;
    let inner: void | (() => void);
    const ctx = gsap.context(() => {
      inner = effectRef.current(gsap, { reduced: prefersReducedMotion() });
    }, scope?.current ?? undefined);
    return () => {
      inner?.();
      ctx.revert();
    };
  }, deps);
}

/**
 * The delay that puts an element arriving on its own in step with its
 * siblings: its index among the children of the `[data-stagger]` around it,
 * or with `parent`, of its parent element, so a grid of cards that each
 * arrive alone still arrives one after another.
 */
export function groupDelay(el: HTMLElement, parent = false) {
  const root = parent ? el.parentElement : el.closest<HTMLElement>('[data-stagger]');
  if (!root) return 0;
  const items = Array.from(root.children);
  const i = items.findIndex((c) => c.contains(el));
  return i < 0 ? 0 : staggerDelay(i, items.length);
}

/** A ref'd value's "did it change since the last run" flag. */
function useChanged(value: unknown) {
  const last = useRef(value);
  return () => {
    const changed = !Object.is(last.current, value);
    last.current = value;
    return changed;
  };
}

export interface RevealOptions {
  /** Overrides the default rise. */
  recipe?: Recipe;
  /** Seconds. */
  delay?: number;
  /** Fall in step with siblings (see groupDelay). */
  inGroup?: boolean;
  /** Reveal when this turns true (e.g. data arrived). Default: on mount. */
  when?: boolean;
  /** Re-run whenever this changes (a new route). */
  replayKey?: unknown;
}

/**
 * Rise an element into place, on mount or when `when` turns true, whether or
 * not GSAP has landed yet (see engine.ts). Hidden before its first paint, so
 * the first frame is the clean pre-state. Below the fold it just shows:
 * nothing animates off screen. Reduced motion: it just shows.
 */
export function useReveal(ref: RefObject<HTMLElement | null>, opts: RevealOptions = {}) {
  const { recipe, delay = 0, inGroup = false, when = true, replayKey } = opts;
  const replayed = useChanged(replayKey);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    const fresh = replayed();
    if (!el || !when) return;
    if (prefersReducedMotion() || !mayEnter(el, fresh) || !inViewport(el)) {
      markPainted([el]);
      return;
    }
    return enter([el], recipe ?? rise(), [delay + (inGroup ? groupDelay(el, true) : 0)]);
  }, [when, replayKey]);
}

export interface StaggerOptions {
  recipe?: Recipe;
  /** Which descendants arrive. Default: the direct children. */
  selector?: string;
  when?: boolean;
  /** Re-run whenever this changes, e.g. a new page of rows. */
  replayKey?: unknown;
  delay?: number;
}

/**
 * Bring a group in one after another: KPI rows, table rows, cards. Only the
 * items on screen move, and the run is capped (STAGGER.maxTotal) however long
 * the list, so a 200-row table arrives as fast as a 6-row one.
 */
export function useStagger(ref: RefObject<HTMLElement | null>, opts: StaggerOptions = {}) {
  const { recipe, selector = ':scope > *', when = true, replayKey, delay = 0 } = opts;
  const replayed = useChanged(replayKey);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    const fresh = replayed();
    if (!el || !when) return;
    const all = Array.from(el.querySelectorAll<HTMLElement>(selector));
    if (prefersReducedMotion()) {
      markPainted(all);
      return;
    }
    const items = all.filter((i) => inViewport(i) && mayEnter(i, fresh));
    markPainted(all.filter((i) => !items.includes(i)));
    return enter(
      items,
      recipe ?? rise(),
      items.map((_, i) => delay + staggerDelay(i, items.length)),
    );
  }, [when, replayKey]);
}

/**
 * Count a figure up into place, once, then show later changes at once: after
 * load the number tells the truth instantly. The element's only child must be
 * the text React renders for `format(value)`; the count rewrites that same
 * text node, so React and the tween never disagree about which node holds the
 * number. Starts only on screen; reduced motion shows the figure.
 */
export function useCountUp(
  ref: RefObject<HTMLElement | null>,
  value: number,
  format: (n: number) => string,
  { duration = DURATION.count }: { duration?: number } = {},
) {
  const fmt = useLatest(format);
  const st = useRef({ revealed: false, started: false, current: 0 });
  useIsoLayoutEffect(() => {
    const el = ref.current;
    const s = st.current;
    const settle = () => {
      s.revealed = true;
      s.current = value;
    };
    // Nothing to count yet (a placeholder in place of the figure): wait for it.
    if (!el) return;
    if (prefersReducedMotion() || s.revealed) return settle();
    if (!s.started && !inViewport(el)) return settle();
    const from = s.started ? s.current : 0;
    s.started = true;
    const paint = (v: number) => {
      const node = el.firstChild;
      if (node && node.nodeType === Node.TEXT_NODE) node.nodeValue = fmt.current(v);
    };
    paint(from);
    let done = false;
    const stop = count(
      from,
      value,
      duration,
      (v) => {
        s.current = v;
        paint(v);
      },
      () => {
        done = true;
        settle();
      },
    );
    return () => {
      stop();
      // Interrupted (a new value, StrictMode's re-mount): put the true figure
      // back; the next run continues from s.current.
      if (!done) paint(value);
    };
  }, [value]);
}

/**
 * Feedback plays once per signal value: a Suspense re-show re-runs layout
 * effects with the same signal, which must not shake or pop again.
 * StrictMode's synchronous double run is let through (its first run is
 * reverted at once).
 */
function useFiredOnce(signal: unknown) {
  const last = useRef<{ signal: unknown; sameTask: boolean } | null>(null);
  return () => {
    const prev = last.current;
    if (prev && Object.is(prev.signal, signal) && !prev.sameTask) return false;
    const mark = { signal, sameTask: true };
    last.current = mark;
    queueMicrotask(() => (mark.sameTask = false));
    return true;
  };
}

/**
 * Error feedback: a short horizontal shake (symmetric, so it reads the same in
 * RTL) each time `signal` changes to a new truthy value — a refused sign-in, a
 * failed save. Shake the card or the form, never a field being typed in.
 * Reduced motion: no shake; the error text carries it.
 */
export function useShake(ref: RefObject<HTMLElement | null>, signal: unknown) {
  const fired = useFiredOnce(signal);
  useGsap(
    (gsap, { reduced }) => {
      const el = ref.current;
      if (!el || !signal || reduced || !fired()) return;
      gsap.to(el, {
        keyframes: { x: [0, -6, 5, -3, 2, 0] },
        duration: sec(DURATION.slow),
        ease: 'none',
        // clearProps does not reach through `keyframes`; clear at the end instead.
        onComplete: () => void gsap.set(el, { clearProps: 'transform' }),
      });
    },
    [signal],
  );
}

/**
 * Success feedback: the element settles from a slightly smaller scale each
 * time `signal` changes to a new truthy value — a status turning good.
 */
export function usePop(ref: RefObject<HTMLElement | null>, signal: unknown) {
  const fired = useFiredOnce(signal);
  useGsap(
    (gsap, { reduced }) => {
      const el = ref.current;
      if (!el || !signal || reduced || !fired()) return;
      gsap.fromTo(
        el,
        { scale: 0.94 },
        { scale: 1, duration: sec(DURATION.slow), ease: EASE_NAME.out, clearProps: 'transform' },
      );
    },
    [signal],
  );
}

/**
 * A signal for usePop / useShake that changes only when `value` changes in
 * place (a status flipping while on screen), never on mount or when the value
 * first arrives or goes away (null/undefined), so a page that loads does not
 * pop everything at once.
 *   usePop(ref, useChangeSignal(status))
 */
export function useChangeSignal(value: unknown): number {
  const [seen, setSeen] = useState({ value, n: 0 });
  if (Object.is(seen.value, value)) return seen.n;
  const n = seen.value == null || value == null ? seen.n : seen.n + 1;
  setSeen({ value, n });
  return n;
}

/** Seconds a leaving skeleton takes to fade out; the content's rise waits for it. */
export const SKELETON_OUT = sec(DURATION.fast) * 0.75;
/** The longest a leaving skeleton may linger, whatever happens to its fade. */
const SKELETON_MAX_MS = 600;

/**
 * Data landing after a skeleton. In the commit where `loading` turns false
 * the content renders (so the heavy render happens behind the skeleton, never
 * as a blank gap), hidden by its entrance, which waits `delay` seconds; the
 * skeleton is kept as an overlay over it (`leaving`; put `ghostRef` on the
 * overlay, absolutely positioned) and fades out first. So the skeleton goes,
 * then the content rises: never both half-visible, never a blink. `arrivals`
 * ticks in that commit, for a Stagger's `replayKey`. Off screen, or under
 * reduced motion, the skeleton just goes and the content shows.
 */
export function useLanding<T extends HTMLElement = HTMLElement>(loading: boolean) {
  const [prev, setPrev] = useState(loading);
  const [leaving, setLeaving] = useState(false);
  const [arrivals, setArrivals] = useState(0);
  if (prev !== loading) {
    setPrev(loading);
    if (loading) setLeaving(false);
    else {
      setArrivals((n) => n + 1);
      setLeaving(!prefersReducedMotion());
    }
  }
  const ghostRef = useRef<T>(null);
  useIsoLayoutEffect(() => {
    const el = ghostRef.current;
    if (!leaving) return;
    if (!el || !inViewport(el)) {
      setLeaving(false);
      return;
    }
    return leave(
      el,
      { opacity: 0, duration: SKELETON_OUT, ease: EASE_NAME.in },
      () => setLeaving(false),
      groupDelay(el),
    );
  }, [leaving]);
  // A backstop: the overlay never outstays a fade that did not finish.
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLeaving(false), SKELETON_MAX_MS);
    return () => clearTimeout(id);
  }, [leaving]);
  return {
    showSkeleton: loading,
    leaving: leaving && !loading,
    ghostRef,
    arrivals,
    /** Seconds the content's entrance waits: the skeleton's fade (none on a first render). */
    delay: arrivals > 0 && !prefersReducedMotion() ? SKELETON_OUT : 0,
  };
}
