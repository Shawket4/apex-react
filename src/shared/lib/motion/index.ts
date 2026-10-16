/**
 * The motion system. Every animation in src/ goes through here; see the
 * "Motion" section of CLAUDE.md. GSAP itself is private to this folder and
 * is its own chunk, fetched at boot (with a modulepreload hint in index.html).
 */
import './motion.css';

import { preloadGsap } from './gsap';
import { installPressFeedback } from './press';

export * from './tokens';
export * as recipes from './recipes';
export type { Recipe } from './recipes';
export { useReducedMotion, prefersReducedMotion } from './media';
export {
  useGsap,
  useReveal,
  useStagger,
  useCountUp,
  useShake,
  usePop,
  useChangeSignal,
  useLanding,
  type RevealOptions,
  type StaggerOptions,
} from './hooks';
export {
  usePresence,
  useOverlayRoot,
  useOverlayOpen,
  OverlayOpenProvider,
  useEnter,
  useElementRef,
  Presence,
  composeRefs,
  useComposedRefs,
  type PresencePart,
} from './presence';
export { Reveal, Stagger, CountUp, CountUpText, ChartEntrance, SkeletonSwap } from './components';
export { parseFigure, useArriving, useChartMotion } from './support';

/** Start the motion system: called once at the top of main.tsx. */
export function bootMotion() {
  preloadGsap();
  installPressFeedback();
}
