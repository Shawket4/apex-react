# Apex fleet dashboard

## Motion

Every animation goes through **`src/shared/lib/motion`** (`import … from '@/shared/lib/motion'`).
GSAP is private to that folder (ESLint refuses it anywhere else): it is its own chunk
(`motion-vendor`), never in the entry bundle, fetched at boot by `bootMotion()` in
`main.tsx`, with a `modulepreload` hint that `vite.config.ts` adds to `index.html`.

**It always animates.** An entrance whose GSAP has not landed yet still plays: its targets
are hidden before paint with inline styles (the recipe's `from`) and play when GSAP lands,
or through the Web Animations API with the same recipe after 300 ms (`engine.ts`). Nothing
silently snaps to its final state.

**Tokens** (`tokens.ts`, mirrored as CSS variables in `motion.css`, exposed by
`tailwind.config.ts`; `tokens.test.ts` fails if they drift):
- Durations: `fast` 160 ms (hover, press, poppers, every exit) · `base` 220 (the default) ·
  `slow` 320 (sheets) · `count` 1100 (KPI count-ups and chart draws, in lockstep).
- Eases: `out` (entrances) · `in` (exits) · `in-out` · `drawer` (sheets, sidebar).
- Classes: `duration-fast|base|slow|count`, `ease-out|in|in-out|drawer`. A bare
  `transition-colors` already gets `fast` + `out`. Numeric `duration-200` is refused by lint.

**Register: product.** 160–220 ms, 4–6 px, no overshoot. Motion says what changed
(arrived, left, updated); it never decorates.

| Need | Use |
|---|---|
| Content arriving on mount | `<Reveal>` / `useReveal` |
| A group arriving one by one (KPIs, rows) | `<Stagger>` / `useStagger` (on-screen items only, capped at 0.3 s) |
| Data replacing a skeleton | `<SkeletonSwap>`, or `useLanding` when the skeleton cannot wrap (a table, a grid) |
| A KPI figure | `<CountUp value format>`; already-formatted text: `<CountUpText>` |
| A chart | `ChartCard` wears the entrance; spread `{...useChartMotion()}` on each Recharts series |
| Error / success feedback | `useShake` (the card or form, never a field) / `usePop` with `useChangeSignal` |
| A one-off GSAP effect | `useGsap(fn, deps, { scope })`: scoped, reverted on cleanup |

**Already wired, nothing to add:** dialogs and sheets enter and exit (their roots hold the
open state so the content stays mounted through the exit); menus, popovers, selects and
tooltips enter from their side and close at once; tab panels rise in; `Button` presses
(`data-press`); `Skeleton` shimmers; `StatCard` rises on its beat and counts its figure up;
`DataTable` rows arrive after the skeleton leaves; `EmptyState` rises; every route change
fades the page area in (`widgets/layout`). Sonner toasts and Recharts keep their own engines.

**Rules (correctness, not taste):**
- **No ghost first frames.** The first painted frame of anything that animates is its clean
  pre-state or its final state, never content that shows and then animates. Data landing:
  the content renders hidden in the same commit, the skeleton (kept as an overlay) fades out
  first, then the content rises. Never both half-visible.
- **Reduced motion.** Entrances and count-ups show the final state; overlays keep a short
  fade; CSS transitions land at once and the shimmer and pulse loops stop (`motion.css`).
  The spinner keeps turning: it is the only sign something is loading.
- **Transform and opacity only.** The sidebar collapse is the one width transition. Never
  `transition-all` (lint refuses it); name the properties.
- **RTL.** Sheets slide from their physical edge (resolved from `dir`), poppers use Radix's
  `data-side`, the shimmer reverses, a shake is symmetric.
- **Nothing animates off screen.** Entrances skip what is out of view.
- **No motion on data entry.** Never animate a field someone is typing in; nothing may
  remount, re-key or reparent an input.
- **CSS stays** for hover and colour transitions, the spinner (`animate-spin`), the skeleton
  shimmer and live-status dots, all on the tokens. Everything one-shot and state-driven goes
  through the motion module. No `@keyframes` outside `motion.css`.
