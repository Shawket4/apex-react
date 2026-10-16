import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

import { enter, leave } from './engine';
import { getGsap } from './gsap';
import { prefersReducedMotion } from './media';
import { reduce, rise, type Recipe } from './recipes';
import { useIsoLayoutEffect, useLatest } from './latest';

/**
 * An element as React state, set by a callback ref. Motion that waits on an
 * element must hear about it when it attaches, not when its owner's effects
 * run: a Radix Portal mounts its content one layout pass after the component
 * that renders it, so a RefObject read in that component's layout effect is
 * still null and the entrance would find nothing (and the overlay snapped
 * open). The state update from the ref lands before paint, so the motion
 * still starts from a clean first frame.
 */
export function useElementRef<T extends HTMLElement = HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  return [el, setEl] as const;
}

/** One element in a presence group and the recipe it enters and leaves by. */
export type PresencePart = [HTMLElement | null, Recipe];

/**
 * Keep something mounted while it animates out. Returns whether to render it.
 * `show` turning true plays every part's entrance together, as soon as the
 * parts are in the DOM (from `useElementRef`); turning false plays their exits
 * and unmounts when they finish. Reopened mid-exit, it enters again from
 * wherever the exit got to. `initial: false` shows what is open on the first
 * render without an entrance.
 */
export function usePresence(
  show: boolean,
  parts: PresencePart[],
  { initial = true }: { initial?: boolean } = {},
) {
  const [mounted, setMounted] = useState(show);
  if (show && !mounted) setMounted(true);
  const partsRef = useLatest(parts);
  // What the DOM shows right now: "in", "out", or caught leaving ("mid").
  const phase = useRef<'in' | 'out' | 'mid'>(show && !initial ? 'in' : 'out');
  const els = parts.map(([el]) => el);

  useIsoLayoutEffect(() => {
    if (!mounted) return;
    const live = partsRef.current.filter(([el]) => el) as [HTMLElement, Recipe][];

    if (show) {
      if (phase.current === 'in') return;
      // Not in the DOM yet (a portal mounts a pass later): wait for the refs.
      if (!live.length) return;
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
    // The elements are deps: the effect runs again the moment they attach.
  }, [show, mounted, partsRef, ...els]);

  return mounted;
}

/**
 * Show or hide a block with an entrance and an exit (a collapsible body, a
 * card's drawer): it stays mounted through its exit. Transform and opacity
 * only, so the space it frees closes once it has faded.
 */
export function Presence({
  show,
  recipe = rise(),
  initial = true,
  className,
  children,
}: {
  show: boolean;
  recipe?: Recipe;
  initial?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [el, ref] = useElementRef<HTMLDivElement>();
  const mounted = usePresence(show, [[el, recipe]], { initial });
  // While it leaves it keeps showing what it last showed.
  const kept = useRef(children);
  useIsoLayoutEffect(() => {
    if (show) kept.current = children;
  });
  if (!mounted) return null;
  return createElement('div', { ref, className }, show ? children : kept.current);
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

/**
 * composeRefs, kept stable across renders. A fresh ref function each render
 * makes React detach and re-attach it every commit, which motion that tracks
 * its element (useEnter, useElementRef) would read as the element leaving.
 */
export function useComposedRefs<T>(...refs: (Ref<T> | undefined)[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(composeRefs(...refs), refs);
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

/**
 * Motion for content that mounts and unmounts on its own (menus, popovers,
 * selects, tooltips: Radix decides when). Returns a callback ref for the
 * content. On attach it enters by `recipe(el)`; on removal a still copy of it
 * is left in its place, out of the way of the pointer, and plays the
 * recipe's exit, so closing is seen too. Nothing interactive is ever copied
 * into the page: the copy is inert and aria-hidden, and gone after the exit.
 */
export function useEnter<T extends HTMLElement = HTMLElement>(recipe: (el: T) => Recipe) {
  const recipeRef = useLatest(recipe);
  const [el, setEl] = useState<T | null>(null);
  const current = useRef<T | null>(null);
  const last = useRef<{ node: T; rect: DOMRect } | null>(null);
  const ref = useCallback((node: T | null) => {
    if (node) {
      last.current = null;
      current.current = node;
      setEl(node);
      return;
    }
    // Measured now, while the node is still in the page.
    const prev = current.current;
    if (prev?.isConnected) last.current = { node: prev, rect: prev.getBoundingClientRect() };
    current.current = null;
    setEl(null);
  }, []);
  useIsoLayoutEffect(() => {
    if (el) return enter([el], recipeRef.current(el));
    // Detached: if it really left the page (not just a re-render), see it out.
    const gone = last.current;
    last.current = null;
    if (!gone || gone.node.isConnected) return;
    exitCopy(gone.node, gone.rect, recipeRef.current(gone.node));
  }, [el, recipeRef]);
  return ref;
}

/** Play `recipe.exit` on an inert copy of `node` where it stood, then drop it. */
function exitCopy(node: HTMLElement, rect: DOMRect, recipe: Recipe) {
  if (!rect.width || !rect.height || typeof document === 'undefined') return;
  const copy = node.cloneNode(true) as HTMLElement;
  copy.setAttribute('aria-hidden', 'true');
  copy.setAttribute('inert', '');
  copy.removeAttribute('id');
  copy.dataset.motionExit = '';
  Object.assign(copy.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    pointerEvents: 'none',
    transform: '',
    opacity: '',
  });
  document.body.appendChild(copy);
  const r = prefersReducedMotion() ? reduce(recipe) : recipe;
  leave(copy, r.exit, () => copy.remove());
  // Whatever happens to the tween, the copy never outstays the exit.
  setTimeout(() => copy.remove(), 1000);
}
