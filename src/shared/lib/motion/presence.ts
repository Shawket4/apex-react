import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from 'react';

import { enter, leave } from './engine';
import { getGsap } from './gsap';
import { prefersReducedMotion } from './media';
import { reduce, type Recipe } from './recipes';
import { useIsoLayoutEffect, useLatest } from './latest';

/** One element in a presence group and the recipe it enters and leaves by. */
export type PresencePart = [RefObject<HTMLElement | null>, Recipe];

/**
 * Keep something mounted while it animates out. Returns whether to render it.
 * `show` turning true plays every part's entrance together (engine.enter: it
 * animates whether or not GSAP has landed); turning false plays their exits
 * and unmounts when they finish. Reopened mid-exit, it enters again from
 * wherever the exit got to.
 */
export function usePresence(show: boolean, parts: PresencePart[]) {
  const [mounted, setMounted] = useState(show);
  if (show && !mounted) setMounted(true);
  const partsRef = useLatest(parts);
  // What the DOM shows right now: "in", "out", or caught leaving ("mid").
  const phase = useRef<'in' | 'out' | 'mid'>('out');

  useIsoLayoutEffect(() => {
    if (!mounted) return;
    const live = partsRef.current
      .map(([ref, recipe]) => [ref.current, recipe] as const)
      .filter(([el]) => el) as [HTMLElement, Recipe][];

    if (show) {
      if (phase.current === 'in') return;
      const from = phase.current;
      phase.current = 'in';
      const gsap = getGsap();
      if (from === 'mid' && gsap) {
        // Back from wherever the exit got to.
        const tl = gsap.timeline();
        for (const [el, r] of live)
          tl.add(gsap.to(el, { ...r.to, clearProps: 'opacity,transform' }), 0);
        return () => void tl.kill();
      }
      const stops = live.map(([el, r]) => enter([el], r));
      return () => {
        stops.forEach((stop) => stop());
        phase.current = 'out';
      };
    }

    if (!live.length) {
      phase.current = 'out';
      setMounted(false);
      return;
    }
    let left = live.length;
    const stops = live.map(([el, r]) => {
      el.style.pointerEvents = 'none';
      const red = prefersReducedMotion() ? reduce(r) : r;
      return leave(el, red.exit, () => {
        if (--left > 0) return;
        phase.current = 'out';
        setMounted(false);
      });
    });
    return () => {
      if (left > 0) phase.current = 'mid';
      stops.forEach((stop) => stop());
      for (const [el] of live) el.style.pointerEvents = '';
    };
  }, [show, mounted, partsRef]);

  return mounted;
}

/* ── Overlays ────────────────────────────────────────────────────────────── */

/** One ref callback feeding several refs (ours and the caller's). */
export function composeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const r of refs) {
      if (typeof r === 'function') r(node);
      else if (r) (r as { current: T | null }).current = node;
    }
  };
}

const OverlayOpen = createContext<boolean | null>(null);

/**
 * The open state of a Radix Dialog root, held here so the content can stay
 * mounted through its exit. Works controlled (`open`) or uncontrolled
 * (`defaultOpen`), like the Radix root it wraps.
 */
export function useOverlayRoot(
  open: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange?: (open: boolean) => void,
) {
  const [inner, setInner] = useState(defaultOpen ?? false);
  const controlled = open !== undefined;
  const value = controlled ? open : inner;
  const onChange = useLatest(onOpenChange);
  const set = useCallback(
    (next: boolean) => {
      if (!controlled) setInner(next);
      onChange.current?.(next);
    },
    [controlled, onChange],
  );
  return [value, set] as const;
}

export const OverlayOpenProvider = OverlayOpen.Provider;

/** Inside an overlay root: whether it is open. Null outside one. */
export function useOverlayOpen(): boolean | null {
  return useContext(OverlayOpen);
}

/** Enter-only motion for content that mounts and unmounts on its own (menus, tooltips). */
export function useEnter(ref: RefObject<HTMLElement | null>, recipe: () => Recipe) {
  const recipeRef = useLatest(recipe);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    return enter([el], recipeRef.current());
  }, [ref, recipeRef]);
}
