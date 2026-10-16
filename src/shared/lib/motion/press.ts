import { getGsap } from './gsap';
import { prefersReducedMotion } from './media';
import { DURATION, EASE_NAME, SCALE, sec } from './tokens';

/**
 * Press feedback: a control settles under the finger and springs back on
 * release. One delegated listener serves every element marked `data-press`;
 * Button sets it by default. Data-entry controls never carry it, so typing is
 * never touched.
 */
function press(el: HTMLElement) {
  const gsap = getGsap();
  if (!gsap || prefersReducedMotion()) return;
  if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
  gsap.to(el, {
    scale: SCALE.press,
    duration: sec(DURATION.fast) / 2,
    ease: EASE_NAME.out,
    overwrite: 'auto',
  });
  const release = () => {
    window.removeEventListener('pointerup', release, true);
    window.removeEventListener('pointercancel', release, true);
    gsap.to(el, {
      scale: 1,
      duration: sec(DURATION.base),
      ease: EASE_NAME.out,
      overwrite: 'auto',
      clearProps: 'transform',
    });
  };
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
}

let installed = false;

/** Install the delegated listener once, at boot. */
export function installPressFeedback() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0) return;
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-press]');
      if (el) press(el);
    },
    { passive: true },
  );
}
