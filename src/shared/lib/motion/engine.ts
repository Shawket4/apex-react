import { getGsap, loadGsap, type Gsap, type TweenVars } from './gsap';
import { prefersReducedMotion } from './media';
import { reduce, type Recipe } from './recipes';
import { EASE, EASE_NAME, type EaseName } from './tokens';

/*
 * The one place an entrance, an exit or a count is started. Everything is
 * driven by GSAP once it has loaded (it is fetched at boot, in its own chunk,
 * with a modulepreload hint). Before that, an entrance still happens: its
 * targets are hidden before paint with plain inline styles (the recipe's
 * `from`), and it plays when GSAP lands, or, if GSAP has not landed within
 * GSAP_PATIENCE_MS, through the Web Animations API with the same recipe.
 * Nothing silently snaps to its final state, and nothing shows at rest and
 * then animates (a ghost frame).
 */
export const GSAP_PATIENCE_MS = 300;

/* ── Painted: an element whose entrance has finished, or which was shown at rest ── */

const painted = new WeakSet<Element>();
const arriving = new WeakSet<Element>();

/** Whether an entrance may hide `el`: never shown at rest, or its content was replaced. */
export function mayEnter(el: Element, replayed: boolean) {
  return replayed || !painted.has(el);
}

/**
 * Mark `els` as shown once the frame that shows them has been drawn: a
 * Suspense re-show (which re-runs layout effects) must not hide and replay
 * them. Two frames, because the first callback runs before its paint.
 */
export function markPainted(els: Element[]) {
  if (!els.length || typeof requestAnimationFrame === 'undefined') return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const el of els) if (!arriving.has(el)) painted.add(el);
    }),
  );
}

/* ── Recipe values → CSS, for the inline pre-state and the WAAPI fallback ── */

type Css = { opacity: string; transform: string };

function cssOf(v: TweenVars): Css {
  const n = (k: string) => (typeof v[k] === 'number' ? (v[k] as number) : undefined);
  const parts: string[] = [];
  const xp = n('xPercent');
  const yp = n('yPercent');
  if (xp || yp) parts.push(`translate(${xp ?? 0}%, ${yp ?? 0}%)`);
  const x = n('x');
  const y = n('y');
  if (x || y) parts.push(`translate(${x ?? 0}px, ${y ?? 0}px)`);
  const s = n('scale');
  if (s !== undefined && s !== 1) parts.push(`scale(${s})`);
  const o = n('opacity');
  return { opacity: o === undefined ? '' : String(o), transform: parts.join(' ') };
}

const REST: Css = { opacity: '1', transform: 'none' };

function cssEase(name: unknown): string {
  const key = (Object.keys(EASE_NAME) as EaseName[]).find((k) => EASE_NAME[k] === name);
  return key ? `cubic-bezier(${EASE[key].join(',')})` : 'linear';
}

function waapi(el: HTMLElement, from: Css, to: Css, vars: TweenVars, delayS = 0) {
  if (typeof el.animate !== 'function') return null;
  const frame = (c: Css) => ({ opacity: c.opacity || '1', transform: c.transform || 'none' });
  return el.animate([frame(from), frame(to)], {
    duration: Number(vars.duration ?? 0.22) * 1000,
    delay: delayS * 1000,
    easing: cssEase(vars.ease),
    fill: 'both',
  });
}

/* ── Entrances ── */

/*
 * An entrance cut off by its cleanup (StrictMode's second run, a Suspense hide)
 * carries on from where it was when it runs again, never from the start.
 */
const interrupted = new WeakMap<Element, Record<string, unknown>>();

function playGsap(gsap: Gsap, els: HTMLElement[], r: Recipe, delays: number[], done: () => void) {
  const keys = Object.keys(r.from);
  const from: TweenVars = {};
  for (const k of keys) {
    from[k] = (_i: number, el: Element) =>
      (interrupted.get(el)?.[k] ?? r.from[k]) as gsap.TweenValue;
  }
  const tween = gsap.fromTo(els, from, {
    ...r.to,
    delay: (i: number) => delays[i] ?? 0,
    clearProps: 'opacity,transform',
    onComplete: done,
  });
  for (const el of els) interrupted.delete(el);
  return () => {
    if (tween.progress() < 1) {
      for (const el of els) {
        const at: Record<string, unknown> = {};
        for (const k of keys) at[k] = gsap.getProperty(el, k);
        interrupted.set(el, at);
      }
    }
    tween.kill();
    gsap.set(els, { clearProps: 'opacity,transform' });
  };
}

/**
 * Bring `els` in by `recipe`, item `i` after `delays[i]` seconds. Call it in a
 * layout effect (before paint); it returns the cleanup. Under reduced motion
 * the recipe loses its travel and scale and keeps a short fade.
 */
export function enter(
  els: HTMLElement[],
  recipe: Recipe,
  delays: number[] = [],
  onDone?: () => void,
) {
  if (!els.length) return () => {};
  const r = prefersReducedMotion() ? reduce(recipe) : recipe;
  for (const el of els) arriving.add(el);
  let left = els.length;
  const finish = () => {
    for (const el of els) {
      arriving.delete(el);
      painted.add(el);
    }
    onDone?.();
  };

  const gsap = getGsap();
  if (gsap) return playGsap(gsap, els, r, delays, finish);

  // GSAP is still on its way: hold the pre-state with inline styles.
  const pre = cssOf(r.from);
  for (const el of els) {
    if (pre.opacity) el.style.opacity = pre.opacity;
    if (pre.transform) el.style.transform = pre.transform;
  }
  const release = () => {
    for (const el of els) {
      el.style.removeProperty('opacity');
      el.style.removeProperty('transform');
    }
  };
  let stop: (() => void) | null = null;
  let settled = false;
  const viaWaapi = () => {
    if (settled) return;
    settled = true;
    const to = cssOf(r.to);
    const anims = els.map((el, i) => waapi(el, pre, { ...REST, ...pickSet(to) }, r.to, delays[i]));
    release();
    if (anims.some((a) => !a)) {
      for (const a of anims) a?.cancel();
      finish();
      return;
    }
    for (const a of anims) {
      a!.onfinish = () => {
        a!.cancel();
        if (--left === 0) finish();
      };
    }
    stop = () => anims.forEach((a) => a?.cancel());
  };
  const timer = setTimeout(viaWaapi, GSAP_PATIENCE_MS);
  loadGsap().then(
    (g) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      release();
      stop = playGsap(g, els, r, delays, finish);
    },
    () => viaWaapi(),
  );
  return () => {
    clearTimeout(timer);
    settled = true;
    stop?.();
    release();
    for (const el of els) arriving.delete(el);
  };
}

/** Keep only the properties that are set, so a fade does not write a transform. */
function pickSet(c: Css): Partial<Css> {
  const out: Partial<Css> = {};
  if (c.opacity) out.opacity = c.opacity;
  if (c.transform) out.transform = c.transform;
  return out;
}

/** Tween `el` from rest to `vars` (an exit, a skeleton leaving), then call `done`. */
export function leave(el: HTMLElement, vars: TweenVars, done: () => void, delayS = 0) {
  const r = prefersReducedMotion() ? reduce({ from: {}, to: {}, exit: vars }).exit : vars;
  const gsap = getGsap();
  if (gsap) {
    const t = gsap.to(el, { ...r, delay: delayS, onComplete: done });
    return () => void t.kill();
  }
  const a = waapi(el, REST, { ...REST, ...pickSet(cssOf(r)) }, r, delayS);
  if (!a) {
    done();
    return () => {};
  }
  a.onfinish = done;
  return () => a.cancel();
}

/* ── Counting ── */

/** ease-out-quint, the `out` token's curve near enough for a number. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 5);

/**
 * Drive a number from `from` to `to`: GSAP when loaded, else (after the same
 * patience) requestAnimationFrame on the same curve. Returns the cleanup.
 */
export function count(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (v: number) => void,
  onDone: () => void,
) {
  const state = { v: from };
  let stop: (() => void) | null = null;
  let settled = false;
  const viaGsap = (gsap: Gsap) => {
    const t = gsap.to(state, {
      v: to,
      duration: durationMs / 1000,
      ease: EASE_NAME.out,
      onUpdate: () => onUpdate(state.v),
      onComplete: onDone,
    });
    stop = () => t.kill();
  };
  const viaFrames = () => {
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      onUpdate(from + (to - from) * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else onDone();
    };
    raf = requestAnimationFrame(step);
    stop = () => cancelAnimationFrame(raf);
  };
  const gsap = getGsap();
  if (gsap) viaGsap(gsap);
  else {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      viaFrames();
    }, GSAP_PATIENCE_MS);
    loadGsap().then(
      (g) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        viaGsap(g);
      },
      () => {},
    );
    stop = () => {
      settled = true;
      clearTimeout(timer);
    };
  }
  return () => stop?.();
}
