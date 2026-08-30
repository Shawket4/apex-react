# Findings — shard-004

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/shared/ui/map-view.tsx` | 205 | audited | Error boundary re-renders the loading state on failure (`:202`) — no rule for a transient "provider swap" state; `console.log` in a state initializer is not a UI rule. |
| `src/shared/ui/month-year-selector.tsx` | 127 | audited | Month/year title style (`text-sm font-semibold` borderless Select) — no dashboard rule for a calendar header title (only provisional §12.2). |
| `src/shared/ui/multi-select.tsx` | 262 | audited | Clear link `text-[11px]` inside the popover head — matches the 11px hint size; no rule. |
| `src/shared/ui/native-select.tsx` | 36 | audited | Box recipe matches SelectTrigger (§5.4). |
| `src/shared/ui/page-shell.tsx` | 42 | audited | Icon well `h-10 w-10 rounded-lg bg-muted` — no dashboard rule for a page-title icon well (§12.1 only). `text-wrap: balance` on h1 conflicts with the `truncate` the file chose — not flagged. |
| `src/shared/ui/popover.tsx` | 31 | reference — not audited | |
| `src/shared/ui/progress.tsx` | 22 | audited | Fill colour for a generic progress bar — no rule (the §6 bar recipe is a money bar). |
| `src/shared/ui/ranked-list.tsx` | 106 | audited | `barClassName` doc suggests `bg-emerald-500` — a third hue, but only consumers can pass it (out-of-shard). |
| `src/shared/ui/scroll-area.tsx` | 39 | reference — not audited | |
| `src/shared/ui/search-input.tsx` | 135 | audited | `autoFocus` is an opt-in prop (vercel "autoFocus sparingly") — not flagged, cannot remove props. Doc says debounce 200ms but the prop is unused (§13 "Trips-internal inconsistencies") — logic, not UI. |
| `src/shared/ui/searchable-select.tsx` | 227 | audited | Matches provisional §12.2 combobox recipe except the items below. |
| `src/shared/ui/select.tsx` | 147 | reference — not audited | |
| `src/shared/ui/separator.tsx` | 23 | audited | `bg-border` matches C-C6. No findings. |
| `src/shared/ui/sheet.tsx` | 77 | reference — not audited | |
| `src/shared/ui/skeleton.tsx` | 7 | reference — not audited | |
| `src/shared/ui/stat-card.tsx` | 106 | audited | The `Card` wrapper's `shadow-sm` (D-R1) lives in `card.tsx` — out-of-shard. `tone="success"` for revenue (D-C1) is chosen by consumers — out-of-shard. |
| `src/shared/ui/switch.tsx` | 26 | audited | `border-2 border-transparent` is the thumb inset, not a visible 2px border — not flagged (§4 "no border-2" is about visible hairlines). |
| `src/shared/ui/tabs.tsx` | 49 | audited | |
| `src/shared/ui/textarea.tsx` | 20 | audited | Identical to the Input recipe (§12.2, provisional; same box as SelectTrigger §5.4). No findings. |
| `src/shared/ui/toaster.tsx` | 102 | audited | `position="top-right"` is a Sonner prop, not a Tailwind physical utility — no rule (C-I1 covers utilities). Sonner renders its own `aria-live` region. Variant inference from English title words is logic, not UI. |
| `src/shared/ui/tooltip.tsx` | 26 | audited | Inverted surface `bg-foreground text-background` — no rule for tooltips specifically (see F54 nit for the floating-layer shadow). |
| `src/shared/ui/truncate.tsx` | 58 | audited | Measures in `useLayoutEffect`, not in render; behaviour is endorsed by §12.4 / D-L6. No findings. |
| `src/shared/ui/z-index.ts` | 30 | reference — not audited | |
| `src/vite-env.d.ts` | 16 | no UI content | |
| `src/app/console-silencer.ts` | 44 | no UI content | |
| `src/app/index.css` | 225 | reference — not audited | |
| `src/app/main.tsx` | 30 | no UI content | Bootstraps root; imports `index.css`/leaflet css only. |
| `src/app/providers/index.tsx` | 49 | no UI content | ThemeProvider config (`attribute="class"`, `defaultTheme="system"`) matches §0.3. `TooltipProvider delayDuration={200}` — no rule. |

## Findings

### shard-004-F01 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/map-view.tsx:165` — `<span className="text-xs">Loading map…</span>`
- **Rule:** design-system §14 C-I4 "all aria/sr-only strings through `t()`"; §9 "Copy, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)"; §13 row D-I2 (lists `'Loading map…'`)
- **Current:** hard-coded English string; the component has no `useTranslation`.
- **Expected:** `t('common.loadingMap', { defaultValue: 'Loading map…' })` — see `src/pages/dashboard/dashboard.tsx:950-960` for the `defaultValue` idiom.
- **Change:** `structural` — import `useTranslation` in `MapLoadingState` and render `t('common.loadingMap', { defaultValue: 'Loading map…' })`; add the key to both locale files (`out-of-shard: src/shared/i18n/locales/en.json, ar.json` — locale files are permitted by the gate).
- **Notes:** `MapLoadingState` is also rendered by the error boundary (`:202`), so the string appears in both states.

### shard-004-F02 · should · high · motion
- **Where:** `src/shared/ui/map-view.tsx:164` — `<div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />`
- **Rule:** design-system §8 "Reduced motion… opt-out is per element (`motion-reduce:animate-none`)"; §14 C-M2 "`motion-reduce:animate-none` on the Skeleton primitive"; vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"; §13 row D-ST4 ("no motion-reduce guard")
- **Current:** an infinite `animate-spin` with no reduced-motion opt-out.
- **Expected:** every looping animation in the reference carries `motion-reduce:animate-none` (`src/shared/ui/skeleton.tsx:4`, `dashboard.tsx:227`).
- **Change:** `class-level` — `animate-spin` → `animate-spin motion-reduce:animate-none`.
- **Notes:** Superseded if F03 (skeleton) is applied.

### shard-004-F03 · should · medium · loading/empty/error states
- **Where:** `src/shared/ui/map-view.tsx:162-166` — `<div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/30">…animate-spin…`
- **Rule:** design-system §7 "Loading is always the `Skeleton` primitive shaped like the slot"; §13 row D-ST4 "Pending indicator: skeletons only; no spinner"
- **Current:** a hand-rolled spinner + caption inside a tinted box.
- **Expected:** a `Skeleton` filling the map slot, as the fleet panel does (`dashboard.tsx:162`: `Skeleton h-40 rounded-lg`).
- **Change:** `structural` — render `<Skeleton className="h-full w-full rounded-lg" />` (import from `./skeleton`) as the body of `MapLoadingState`; the caption may remain as `sr-only` text for F01.
- **Notes:** The `rounded-lg` matches §12.6 map viewport (`rounded-lg border bg-muted/30`). Keep the component and its two call sites (`:144`, `:202`).

### shard-004-F04 · should · high · colour roles
- **Where:** `src/shared/ui/map-view.tsx:162` — `rounded-lg bg-muted/30`
- **Rule:** design-system §14 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"; §3 "Sub-surface tint … three steps (C-C2)"
- **Current:** `bg-muted/30` — a fourth tint step.
- **Expected:** `bg-muted/40` for a well/placeholder surface (`dashboard.tsx:494`, `:841`).
- **Change:** `class-level` — `bg-muted/30` → `bg-muted/40`.
- **Notes:** —

### shard-004-F05 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/month-year-selector.tsx:79` — `aria-label="Previous month"` (and `:122` `aria-label="Next month"`)
- **Rule:** design-system §14 C-I4 "all aria/sr-only strings through `t()`"; §13 row D-B5 ("English aria") and D-I2
- **Current:** hard-coded English aria-labels; the component already calls `useTranslation()` but only reads `i18n`.
- **Expected:** translated aria-labels as on the reference calendar nav (`src/shared/ui/cairo-range-calendar.tsx:97` area) and scope bar (`scope-bar.tsx:109`).
- **Change:** `class-level` (attribute values) — destructure `t` from the existing `useTranslation()` and use `aria-label={t('common.previousMonth', { defaultValue: 'Previous month' })}` / `t('common.nextMonth', { defaultValue: 'Next month' })`; add keys to en/ar (`out-of-shard: locale files`).
- **Notes:** Check whether `cairo-range-calendar.tsx` already defines month-nav keys and reuse them.

### shard-004-F06 · blocker · high · buttons & controls (focus)
- **Where:** `src/shared/ui/month-year-selector.tsx:78` — `className="rounded p-1 hover:bg-muted"` (and `:121`)
- **Rule:** design-system §4 "Focus ring. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element (C-B1)"; vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*`"
- **Current:** raw `<button>` with no focus-visible ring class (browser default outline only, which `index.css`/Tailwind preflight leaves intact but inconsistent).
- **Expected:** the reference focus recipe (`dashboard.tsx:735`, `cairo-range-calendar.tsx:151`).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to both nav buttons (or apply F07, which brings the ring via the Button primitive).
- **Notes:** —

### shard-004-F07 · should · high · buttons & controls
- **Where:** `src/shared/ui/month-year-selector.tsx:78` — `className="rounded p-1 hover:bg-muted"` + `:81` `<ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />`
- **Rule:** design-system §13 row D-B5 "Calendar month nav: Dash ghost icon `h-7 w-7`, translated aria; Trips raw `rounded p-1 hover:bg-muted` `h-3.5` chevrons"; §5.1 "calendar nav `h-7 w-7`" (C-B3); §5.1 "Icons inside a Button are 16px, by rule"
- **Current:** raw buttons, 4px radius, 14px chevrons, `hover:bg-muted` (the calendar-day hover, C-C4), no transition.
- **Expected:** `Button variant="ghost" size="icon" className="h-7 w-7"` with a bare `<ChevronLeft className="rtl:rotate-180" />` as the reference calendar's month nav (`cairo-range-calendar.tsx` month nav; §5.1 call-site convention).
- **Change:** `structural` — replace the two raw `<button>`s with `<Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev} aria-label=…>`; drop `h-3.5 w-3.5` from the chevrons (Button locks icons to 16px). Keep `rtl:rotate-180`.
- **Notes:** Keep `onClick`, `type="button"`, `aria-label` (see F05). Used inside DatePicker/DateRangePicker popovers (RTL-mirrored).

### shard-004-F08 · blocker · high · buttons & controls (focus)
- **Where:** `src/shared/ui/month-year-selector.tsx:89` — `border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-1` (and `:105`)
- **Rule:** design-system §14 C-B1 "`focus-visible:…` everywhere… Select and close buttons moved from `focus:` to `focus-visible:`"; §4 "Never plain `focus:` — a ring must not appear on mouse click"; vercel-rules "Focus States" bullet "Use `:focus-visible` over `:focus`"
- **Current:** `focus:ring-1` overrides the SelectTrigger's `focus-visible:ring-2` and shows a 1px ring on mouse click.
- **Expected:** SelectTrigger's own `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` (`src/shared/ui/select.tsx:18`).
- **Change:** `class-level` — remove `focus:ring-1` from both triggers (the primitive's focus-visible ring then applies).
- **Notes:** —

### shard-004-F09 · should · high · buttons & controls
- **Where:** `src/shared/ui/multi-select.tsx:130` — `const triggerHClass = triggerHeight === 'sm' ? 'h-9' : 'h-10';`
- **Rule:** design-system §13 row D-B6 "Control height: 36px; MultiSelect `h-10` default (40px beside 36px inputs)"; §5.4 SelectTrigger `h-9`; §12.2 provisional "Input `h-9`… same recipe as SelectTrigger so controls line up at 36px"
- **Current:** default (`'md'`) trigger is 40px; only `'sm'` is 36px.
- **Expected:** 36px (`h-9`) like SelectTrigger (`select.tsx:18`) and Button default (`button.tsx`).
- **Change:** `class-level` — `'h-9' : 'h-10'` → `'h-8' : 'h-9'` (so `sm` = chrome-row 32px per C-B3, `md` = 36px). Keep the prop and both branches.
- **Notes:** Consumers passing `triggerHeight="sm"` (trip-form) will go from 36→32px; if that is undesirable use `'h-9' : 'h-9'` — the point is that the default matches the inputs beside it.

### shard-004-F10 · should · high · type
- **Where:** `src/shared/ui/multi-select.tsx:185` — `<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">`
- **Rule:** design-system §2 "**10** `text-[10px]` 600, `uppercase tracking-wider text-muted-foreground` — Eyebrow… one label style above every figure and panel"; §10 `Eyebrow text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; §13 row D-T3
- **Current:** 12px eyebrow.
- **Expected:** 10px eyebrow (`dashboard.tsx:1001`, `sidebar.tsx:204`).
- **Change:** `class-level` — `text-xs` → `text-[10px]`.
- **Notes:** —

### shard-004-F11 · should · high · colour roles
- **Where:** `src/shared/ui/multi-select.tsx:222-224` — `isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'`
- **Rule:** design-system §3 "Selected/current state is the `bg-primary/10 text-primary` wash above (C-C1), never the accent"; §14 C-C4 "`hover:bg-accent` on chrome and menu items"; §13 row D-C3 (`bg-accent/60` option rows)
- **Current:** selected = accent, hover = 60% accent.
- **Expected:** selected `bg-primary/10 text-primary` (`sidebar.tsx:230`, `dashboard.tsx:737`); hover `hover:bg-accent hover:text-accent-foreground` (`dropdown-menu.tsx:77`, `select.tsx` items).
- **Change:** `class-level` — `'bg-accent text-accent-foreground'` → `'bg-primary/10 text-primary'`; `'hover:bg-accent/60'` → `'hover:bg-accent hover:text-accent-foreground'`.
- **Notes:** The trailing `Check` at `:252` is already `text-primary`, so it stays legible on the wash.

### shard-004-F12 · blocker · high · buttons & controls (focus)
- **Where:** `src/shared/ui/multi-select.tsx:221` — `'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors'`
- **Rule:** design-system §4 "Focus ring … on every interactive element (C-B1)"; vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** option `<button>`s have no `focus-visible:` ring (Radix Popover does not add one for arbitrary buttons).
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`dashboard.tsx:735`).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the option button class string.
- **Notes:** Rows are keyboard-toggled in place (popover stays open), so the ring is the only cue of position.

### shard-004-F13 · should · high · buttons & controls
- **Where:** `src/shared/ui/multi-select.tsx:225` — `opt.disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent'`
- **Rule:** design-system §5.4 "Disabled everywhere = `opacity-50` (+ `pointer-events-none` or `cursor-not-allowed`)"; §13 row D-C12
- **Current:** `opacity-40`.
- **Expected:** `opacity-50` (`button.tsx`, `dropdown-menu.tsx:77` `data-[disabled]:opacity-50`).
- **Change:** `class-level` — `opacity-40` → `opacity-50`.
- **Notes:** —

### shard-004-F14 · should · high · colour roles
- **Where:** `src/shared/ui/multi-select.tsx:229` — `<span className={cn('h-2 w-2 shrink-0 rounded-full', opt.dot)} />`
- **Rule:** design-system §5.3 "Status dots `h-1.5 w-1.5 rounded-full` everywhere (C-C8)"; §14 C-C8 "6px (`h-1.5 w-1.5`)"
- **Current:** 8px dot.
- **Expected:** 6px (`dashboard.tsx:226`, `:749`, `:814`).
- **Change:** `class-level` — `h-2 w-2` → `h-1.5 w-1.5`.
- **Notes:** Add `aria-hidden="true"` while there (§9 "`aria-hidden` on dots").

### shard-004-F15 · blocker · medium · RTL/i18n/a11y
- **Where:** `src/shared/ui/multi-select.tsx:159-160` — `<span role="button" tabIndex={0} aria-label={t('common.clear')}`
- **Rule:** vercel-rules "Accessibility" bullet "`<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)"; "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"; design-system §4 focus ring on every interactive element (C-B1)
- **Current:** a focusable `role="button"` span nested inside the `<Button>` trigger (a real `<button>` cannot be nested, hence the span); it has no `focus-visible:` ring; and `stopPropagation` at `:94` keeps the outer button from opening.
- **Expected:** one interactive element per control. The reference's only clear affordance is a sibling ghost Button (`search-input.tsx:123-132`, provisional §12.2), never a control nested inside another.
- **Change:** `structural` — move the clear affordance out of the trigger: render it as a sibling `Button variant="ghost" size="icon" className="h-7 w-7"` positioned `absolute end-8 top-1/2 -translate-y-1/2` inside a `relative` wrapper around the trigger (mirrors `search-input.tsx:128`); keep `clear`, `onKeyDown` handling and the `aria-label`. At minimum (class-level fallback) add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the span.
- **Notes:** The popover head already offers a second clear button (`:189-197`), so the trigger's clear is redundant, not load-bearing. Do not delete `clear` or the `!compact && count > 0` branch.

### shard-004-F16 · should · medium · loading/empty/error states
- **Where:** `src/shared/ui/multi-select.tsx:203-207` — `lottieWidth={70} lottieHeight={70} … className="border-0 bg-transparent py-4 shadow-none"`
- **Rule:** design-system §7 "the palette strips it [EmptyState] to `border-0 bg-transparent py-6 shadow-none` with `no_results.json` at 110px (`command-palette.tsx:273-281`)"; §13 row D-ST6
- **Current:** 70px lottie, `py-4`.
- **Expected:** 110px lottie, `py-6` — the reference's in-popover empty recipe (`src/widgets/command-palette/command-palette.tsx:273-281`).
- **Change:** `class-level` — `lottieWidth={110} lottieHeight={110}`, `py-4` → `py-6`.
- **Notes:** Popover here is `min-w-[12rem]`, so 110px fits.

### shard-004-F17 · nit · medium · buttons & controls
- **Where:** `src/shared/ui/multi-select.tsx:152` — `rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground`
- **Rule:** design-system §5.3 "Two pill recipes remain: the 11px status pill and the 10.5px neutral chip (C-T3)"; §3 "Neutral chip `bg-muted text-muted-foreground` (+ value `text-foreground`) … non-status chips are neutral; the number inside is promoted"; §13 row D-B9
- **Current:** a solid navy count pill at 10px/600.
- **Expected:** neutral chip `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground` with the count as `font-mono text-foreground` (`dashboard.tsx:583-586`).
- **Change:** `class-level` — `inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground` → `inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 font-mono text-[10.5px] font-medium tabular-nums text-foreground`.
- **Notes:** Judgment call — the count could be read as "actionable"; if the owner keeps navy, leave as is.

### shard-004-F18 · nit · low · buttons & controls
- **Where:** `src/shared/ui/multi-select.tsx:234-237` — `'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border', isSelected ? '…' : 'border-input'`
- **Rule:** provisional (§12.2) "Checkbox `h-4 w-4 rounded-sm border border-primary shadow`, checked `bg-primary text-primary-foreground`"
- **Current:** 14px, `rounded` (4px), `border-input` when unchecked.
- **Expected:** the Checkbox primitive's 16px `rounded-sm border-primary` glyph.
- **Change:** `class-level` — `h-3.5 w-3.5 … rounded border` → `h-4 w-4 … rounded-sm border`, `'border-input'` → `'border-primary'`.
- **Notes:** Provisional rule only.

### shard-004-F19 · should · medium · dark mode
- **Where:** `src/shared/ui/native-select.tsx:24` — `'h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pe-8 text-sm shadow-sm transition-colors'`
- **Rule:** vercel-rules "Dark Mode & Theming" bullet "Native `<select>`: explicit `background-color` and `color` (Windows dark mode)"
- **Current:** `bg-background` set; no explicit text colour (inherits UA colour on Windows dark).
- **Expected:** explicit `text-foreground` alongside `bg-background`.
- **Change:** `class-level` — add `text-foreground` after `bg-background`.
- **Notes:** —

### shard-004-F20 · should · high · spacing
- **Where:** `src/shared/ui/page-shell.tsx:22` — `'flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8'` (and `:39` `flex flex-1 flex-col gap-6`)
- **Rule:** design-system §13 row D-S1 "Page container: Dash `max-w-6xl gap-3 p-3 sm:p-4`; Trips `PageShell`: `gap-6 p-4 md:p-6 lg:p-8`, no max width; children `gap-6`"; §1 "Page: `mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4`"; §14 C-S6 (the Suspense fallback was already re-aligned to this frame)
- **Current:** 24px rhythm, 16→32px gutters, no width cap.
- **Expected:** `dashboard.tsx:99` — `mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4`.
- **Change:** `class-level` — `:22` `flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8` → `mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 p-3 sm:p-4`; `:39` `gap-6` → `gap-3`.
- **Notes:** This moves every non-dashboard page; the route fallback (`app/router/index.tsx`) already uses the dashboard frame, so this also removes the reflow between fallback and page.

### shard-004-F21 · should · high · spacing
- **Where:** `src/shared/ui/page-shell.tsx:23` — `<header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">`
- **Rule:** design-system §13 row D-S2 "Page header layout: Dash single row `items-center gap-3`; Trips `flex-col gap-4 sm:flex-row sm:items-start`"
- **Current:** stacked on phones, top-aligned from sm, 16px gap.
- **Expected:** `dashboard.tsx:100-103` — one row, `items-center gap-3`.
- **Change:** `class-level` — `flex flex-col justify-between gap-4 sm:flex-row sm:items-start` → `flex items-center justify-between gap-3`.
- **Notes:** Actions cluster is `flex-wrap` (`:37`), so it still wraps on narrow screens.

### shard-004-F22 · should · high · type
- **Where:** `src/shared/ui/page-shell.tsx:31` — `<h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">`
- **Rule:** design-system §13 row D-T1 "Page title: Dash `text-lg sm:text-xl font-semibold leading-tight`"; §2 "20/18 `sm:text-xl` / `text-lg` 600 `leading-tight` — Page title"; §2 "`tracking-tight` only on `DialogTitle`"
- **Current:** 24→30px with tight tracking.
- **Expected:** `dashboard.tsx:103` — `text-lg font-semibold leading-tight sm:text-xl`.
- **Change:** `class-level` — `text-2xl font-semibold tracking-tight md:text-3xl` → `text-lg font-semibold leading-tight sm:text-xl` (keep `truncate`).
- **Notes:** —

### shard-004-F23 · should · high · type
- **Where:** `src/shared/ui/page-shell.tsx:33` — `<p className="text-sm text-muted-foreground">{description}</p>` (wrapper `:30` `space-y-1`)
- **Rule:** design-system §13 row D-T2 "Page subtitle: Dash `text-[11.5px]`, `mt-0.5`; Trips `text-sm`, `space-y-1`"; §2 "11.5 — Page subtitle (range · company · updated)"
- **Current:** 14px subtitle, 4px below the title.
- **Expected:** `dashboard.tsx:106` — `mt-0.5 text-[11.5px] text-muted-foreground`.
- **Change:** `class-level` — `:30` `space-y-1` → `space-y-0.5`; `:33` `text-sm` → `text-[11.5px]`.
- **Notes:** —

### shard-004-F24 · should · high · motion
- **Where:** `src/shared/ui/progress.tsx:15` — `className="h-full w-full flex-1 bg-primary transition-all"`
- **Rule:** vercel-rules "Animation" bullet "Never `transition: all`—list properties explicitly"; "Anti-patterns" bullet "`transition: all`"; design-system §8 "Hover: colour only, `transition-colors`"
- **Current:** `transition-all` on an element that only ever changes `transform`.
- **Expected:** an explicit property — the reference animates chevrons with `transition-transform` (`dashboard.tsx:431`).
- **Change:** `class-level` — `transition-all` → `transition-transform duration-200 motion-reduce:transition-none`.
- **Notes:** `duration-200` per C-M1.

### shard-004-F25 · nit · high · colour roles
- **Where:** `src/shared/ui/progress.tsx:11` — `'relative h-2 w-full overflow-hidden rounded-full bg-secondary'`
- **Rule:** design-system §6 "Bar chart made of divs: track `… rounded bg-muted`"; §0.2 "`--muted` (= `--secondary`) — subdued surfaces, chips, skeletons"; §15.9 duplicate tokens
- **Current:** `bg-secondary` (an alias token no reference file uses).
- **Expected:** `bg-muted` track (`dashboard.tsx:985`).
- **Change:** `class-level` — `bg-secondary` → `bg-muted`.
- **Notes:** Same colour today; this is naming consistency with the token the reference uses.

### shard-004-F26 · should · high · loading/empty/error states
- **Where:** `src/shared/ui/ranked-list.tsx:59-60` — `'py-8 text-center text-sm text-muted-foreground'` … `{emptyState ?? '—'}`
- **Rule:** design-system §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground`"; §10 `Empty/error px-3 py-6 text-center text-xs text-muted-foreground`; §2 "empty numeric is `—` at `opacity-40`"; §13 row D-C11
- **Current:** `py-8 text-sm`; the `—` fallback at full muted strength.
- **Expected:** `py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:180-183`); `<span className="opacity-40">—</span>` (`dashboard.tsx:765`).
- **Change:** `class-level` — `py-8 … text-sm` → `py-6 … text-xs`; wrap the literal fallback: `{emptyState ?? <span className="opacity-40">—</span>}`.
- **Notes:** —

### shard-004-F27 · should · high · type
- **Where:** `src/shared/ui/ranked-list.tsx:83` — `<span className="shrink-0 text-sm font-semibold tabular-nums">`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`)… Rule C-T1: every money figure is `font-mono tabular-nums text-money`"; §13 row D-T5
- **Current:** sans figure (the doc example is money: "EGP 4,495.00").
- **Expected:** `font-mono tabular-nums` (`dashboard.tsx:436`, `:641`); `text-money` when the value is money.
- **Change:** `class-level` — `shrink-0 text-sm font-semibold tabular-nums` → `shrink-0 font-mono text-sm font-semibold tabular-nums`. Money colour must come from the consumer's `valueLabel` node (`out-of-shard:` consumers of `RankedList`).
- **Notes:** —

### shard-004-F28 · blocker · medium · colour roles
- **Where:** `src/shared/ui/ranked-list.tsx:88-90` — `'h-1.5 w-full overflow-hidden rounded-full bg-muted'` / `'h-full rounded-full bg-primary'`
- **Rule:** `index.css` palette rule quoted in design-system §0.2 "Navy marks anything you can act on; amber marks anything someone gets paid"; §3 "Money (amber) … `bg-money` on bar fills"; §6 "Bar chart made of divs: track `h-[15px] overflow-hidden rounded bg-muted`, fill `block h-full rounded bg-money` … 2% floor"
- **Current:** a magnitude bar filled navy by default — navy on a non-actionable element; 6px pill track; no minimum width.
- **Expected:** `dashboard.tsx:985-991` — track `h-[15px] overflow-hidden rounded bg-muted`, fill `rounded bg-money` with `width: max(pct, 2)%`.
- **Change:** `class-level` — `:88` `h-1.5 … rounded-full bg-muted` → `h-[15px] … rounded bg-muted`; `:90` `'h-full rounded-full bg-primary'` → `'block h-full rounded bg-money'`; `:91` `width: \`${widthPct}%\`` → `width: \`${Math.max(widthPct, 2)}%\``. Keep `barClassName` so non-money lists can pass `bg-muted-foreground` or similar.
- **Notes:** Medium because the primitive is generic; every current consumer that ranks money should end up amber. Third-hue overrides (`bg-emerald-500` in the doc) are `out-of-shard`.

### shard-004-F29 · should · high · colour roles
- **Where:** `src/shared/ui/ranked-list.tsx:78` — `'cursor-pointer rounded-md transition-colors hover:bg-muted/40 -mx-1 px-1'`
- **Rule:** design-system §14 C-C4 "`hover:bg-muted/50` on content rows/cards"; §3 "Content-row hover `hover:bg-muted/50`"; §13 row D-C3
- **Current:** `hover:bg-muted/40`.
- **Expected:** `hover:bg-muted/50` (`dashboard.tsx:616`, `:940`).
- **Change:** `class-level` — `hover:bg-muted/40` → `hover:bg-muted/50`.
- **Notes:** —

### shard-004-F30 · blocker · high · buttons & controls (focus)
- **Where:** `src/shared/ui/ranked-list.tsx:76-79` — `'block w-full text-start', item.onClick && 'cursor-pointer rounded-md transition-colors hover:bg-muted/40 -mx-1 px-1'`
- **Rule:** design-system §4 focus ring "on every interactive element (C-B1)"; vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** when `onClick` is set the row becomes a `<button>` with no focus-visible ring.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`dashboard.tsx:940`).
- **Change:** `class-level` — in the `item.onClick &&` branch append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
- **Notes:** Keep the conditional branch and `Wrapper` switch as is.

### shard-004-F31 · should · medium · spacing
- **Where:** `src/shared/ui/ranked-list.tsx:66` — `<ul className={cn('space-y-3', className)}>`
- **Rule:** design-system §1 "8px `gap-2` — rows inside a panel (exceptions, category bars)"; §6 "Category bars are plain rows in `grid gap-2`"
- **Current:** 12px between rows.
- **Expected:** 8px (`dashboard.tsx:977`).
- **Change:** `class-level` — `space-y-3` → `space-y-2`.
- **Notes:** —

### shard-004-F32 · should · high · content handling
- **Where:** `src/shared/ui/ranked-list.tsx:82` — `<span className="truncate text-sm font-medium">{item.label}</span>`
- **Rule:** vercel-rules "Content Handling" bullet "Flex children need `min-w-0` to allow text truncation"; design-system §6 "`dt min-w-0 truncate`"
- **Current:** `truncate` on a flex child without `min-w-0` — long labels push the value out instead of clipping.
- **Expected:** `min-w-0 truncate` (`dashboard.tsx:498`).
- **Change:** `class-level` — `truncate text-sm font-medium` → `min-w-0 truncate text-sm font-medium`; also add `dir="auto"` (§9 bidi text — labels are Arabic names).
- **Notes:** —

### shard-004-F33 · nit · medium · type
- **Where:** `src/shared/ui/ranked-list.tsx:95` — `<span className="shrink-0 text-xs text-muted-foreground tabular-nums">`
- **Rule:** design-system §14 C-T4 "11px under a row label/legend"; §2 "11 — exception hint"
- **Current:** 12px secondary line under a row label.
- **Expected:** `text-[11px]` (`dashboard.tsx:958`); mono if it is a count (`×29`).
- **Change:** `class-level` — `text-xs` → `font-mono text-[11px]`.
- **Notes:** —

### shard-004-F34 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/search-input.tsx:81` — `placeholder = 'Search...',` (also used as `aria-label` at `:120`)
- **Rule:** design-system §14 C-I4 "all aria/sr-only strings through `t()`"; §9 "Copy, aria-labels… all go through `t()`"; vercel-rules "Typography" bullet "`…` not `...`"; "Forms" bullet "Placeholders end with `…`"
- **Current:** English default with three periods, doubling as the aria-label.
- **Expected:** `t('common.searchPlaceholder')` — the key already exists (`searchable-select.tsx:149` uses it).
- **Change:** `structural` — import `useTranslation`; make the default `placeholder ?? t('common.searchPlaceholder')` inside the body (keep the prop; do not change its signature). Ensure the locale value ends with `…` (`out-of-shard: locale files` if not).
- **Notes:** Callers may pass their own placeholder; the fallback is what changes.

### shard-004-F35 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/search-input.tsx:129` — `aria-label="Clear search"`
- **Rule:** design-system §14 C-I4 "all aria/sr-only strings through `t()`"
- **Current:** hard-coded English.
- **Expected:** `aria-label={t('common.clear')}` — key exists (`multi-select.tsx:162`).
- **Change:** `class-level` (attribute value) — `"Clear search"` → `{t('common.clear')}` (needs the `useTranslation` import from F34).
- **Notes:** —

### shard-004-F36 · should · medium · forms
- **Where:** `src/shared/ui/search-input.tsx:109-121` — `<Input ref={inputRef} id={id} type="text" …`
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`", "`autocomplete=\"off\"` on non-auth fields to avoid password manager triggers", "Use correct `type`… and `inputmode`"
- **Current:** no `autoComplete`, `name` or `inputMode`.
- **Expected:** `autoComplete="off" name="search" inputMode="search"`.
- **Change:** `class-level` (additive attributes) — add `autoComplete="off"`, `name={id ?? 'search'}`, `inputMode="search"` to the `<Input>`.
- **Notes:** Keep `type="text"` (`type="search"` changes UA styling and the iOS 16px rule keys off input elements regardless).

### shard-004-F37 · nit · high · typography
- **Where:** `src/shared/ui/searchable-select.tsx:175` — `{t('common.use')} "{search}"` (and `:192` `` `${t('common.add')} "${search.trim()}"` ``)
- **Rule:** vercel-rules "Typography" bullet "Curly quotes `“` `”` not straight `\"`"
- **Current:** straight quotes around the typed text.
- **Expected:** `“…”`.
- **Change:** `class-level` (string literal) — `"{search}"` → `“{search}”`; `` "${search.trim()}" `` → `` “${search.trim()}” ``.
- **Notes:** For Arabic the quote glyphs could come from a locale string instead; simplest is `t('common.quoted', { defaultValue: '“{{text}}”', text })`.

### shard-004-F38 · should · medium · loading/empty/error states
- **Where:** `src/shared/ui/searchable-select.tsx:157-160` — `lottieWidth={70} lottieHeight={70} … className="border-0 bg-transparent py-4 shadow-none"`
- **Rule:** design-system §7 palette EmptyState "`border-0 bg-transparent py-6 shadow-none` with `no_results.json` at 110px"; §13 row D-ST6 (cites this line)
- **Current:** 70px, `py-4`.
- **Expected:** 110px, `py-6` (`command-palette.tsx:273-281`).
- **Change:** `class-level` — `70` → `110` (both), `py-4` → `py-6`.
- **Notes:** —

### shard-004-F39 · nit · medium · layout
- **Where:** `src/shared/ui/searchable-select.tsx:64` — `setTriggerWidth(triggerRef.current.getBoundingClientRect().width);` (consumed at `:144`)
- **Rule:** vercel-rules "Safe Areas & Layout" bullet "Flex/grid over JS measurement for layout"; "Performance" bullet "No layout reads in render"
- **Current:** measures the trigger on open and sets an inline width; the popover is one frame late and does not follow a resize.
- **Expected:** the CSS variable Radix already exposes — `multi-select.tsx:181` uses `w-[--radix-popover-trigger-width]`.
- **Change:** `class-level` — add `w-[--radix-popover-trigger-width]` to the `PopoverContent` className when `matchTriggerWidth` (e.g. `cn('p-0', matchTriggerWidth && 'w-[--radix-popover-trigger-width]')`). The existing effect and `style` may stay (they become a no-op override).
- **Notes:** The read is in an effect, not render — hence nit.

### shard-004-F40 · should · high · type
- **Where:** `src/shared/ui/stat-card.tsx:91` — `'truncate text-sm font-semibold leading-tight tracking-tight tabular-nums sm:text-base md:text-lg'` (same at `:73`, `:81`)
- **Rule:** design-system §13 row D-T7 "Headline figure: Dash `font-mono text-[22px] font-semibold leading-none`; StatCard value sans `text-sm sm:text-base md:text-lg`"; §2 "22 `text-[22px]` 600 `leading-none` mono + `tabular-nums` — KPI value"; D-T9 (responsive text), §2 "`tracking-tight` only on `DialogTitle`"
- **Current:** sans, 14→16→18px stepped by breakpoint, tight tracking.
- **Expected:** `dashboard.tsx:436` — `font-mono text-[22px] font-semibold leading-none tabular-nums` (+ `text-money` via `valueClassName` when money — consumer's job).
- **Change:** `class-level` — in all three value `<p>`s replace `text-sm font-semibold leading-tight tracking-tight tabular-nums sm:text-base md:text-lg` with `font-mono text-[22px] font-semibold leading-none tabular-nums`; keep `truncate`, `stat-card-compact`/`stat-card-full` and `valueClassName`.
- **Notes:** The container-query full/compact swap (`index.css:146-163`) is unaffected. Consumers passing `tone="success"` for revenue (D-C1) are `out-of-shard`.

### shard-004-F41 · should · high · type
- **Where:** `src/shared/ui/stat-card.tsx:66` — `'truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]'`
- **Rule:** design-system §2 Eyebrow "`text-[10px]` **600**, `uppercase tracking-wider text-muted-foreground`"; §13 row D-T3 ("StatCard … eyebrows `text-[10px] font-medium`"); D-T9
- **Current:** weight 500 and steps to 11px at sm.
- **Expected:** `dashboard.tsx:382` KPI label — `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`, fixed size.
- **Change:** `class-level` — `font-medium` → `font-semibold`; remove `sm:text-[11px]`.
- **Notes:** —

### shard-004-F42 · should · high · type
- **Where:** `src/shared/ui/stat-card.tsx:99` — `'truncate text-[10px] tabular-nums text-muted-foreground sm:text-[11px]'`
- **Rule:** design-system §14 C-T4 "11.5px under a figure/title"; §6 "KPI card: … `p` detail `mt-1.5 min-h-[17px] text-[11.5px]`"
- **Current:** 10→11px.
- **Expected:** `dashboard.tsx:442` — `text-[11.5px] text-muted-foreground`.
- **Change:** `class-level` — `text-[10px] … sm:text-[11px]` → `text-[11.5px]`.
- **Notes:** —

### shard-004-F43 · should · medium · spacing
- **Where:** `src/shared/ui/stat-card.tsx:54` — `<CardContent className="flex items-center gap-3 p-3 sm:gap-3 sm:p-3.5">` (and `:65` `space-y-0.5`)
- **Rule:** design-system §13 row D-S3 "Card/panel body padding: Dash `p-3`; … `p-3 sm:p-3.5` (StatCard)"; §1 "12px — KPI card padding"; §6 "KPI card: `dt` eyebrow (`mb-1.5`…), … `p` detail `mt-1.5`"
- **Current:** padding grows to 14px at sm; label/value/detail stacked at 2px.
- **Expected:** `dashboard.tsx:425-442` — `p-3` at every width; label `mb-1.5`, detail `mt-1.5`.
- **Change:** `class-level` — `p-3 sm:gap-3 sm:p-3.5` → `p-3`; `space-y-0.5` → `space-y-1.5`.
- **Notes:** `sm:gap-3` is a no-op duplicate of `gap-3`.

### shard-004-F44 · should · medium · buttons & controls (focus)
- **Where:** `src/shared/ui/switch.tsx:11` — `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
- **Rule:** design-system §4 "`ring-offset-1` on Button/SelectTrigger, `ring-offset-2` on close buttons"; §14 C-B1
- **Current:** `ring-offset-2` on a form control.
- **Expected:** `ring-offset-1` like every other control (`button.tsx`, `select.tsx:18`, `textarea.tsx:10`).
- **Change:** `class-level` — `focus-visible:ring-offset-2` → `focus-visible:ring-offset-1`.
- **Notes:** —

### shard-004-F45 · should · medium · radius/border/shadow
- **Where:** `src/shared/ui/switch.tsx:19` — `'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform …'`
- **Rule:** design-system §4 "Shadow… Elevation is reserved for controls and floating layers: `shadow-sm` on filled/outline Button variants, SelectTrigger…; `shadow-lg` on Dialog, CommandDialog, Sheet"
- **Current:** the 16px thumb carries the Dialog-level `shadow-lg`.
- **Expected:** control-level `shadow-sm` (`button.tsx:11-17`).
- **Change:** `class-level` — `shadow-lg` → `shadow-sm`.
- **Notes:** The root's `shadow-sm` at `:11` is already correct. Add `motion-reduce:transition-none` to the thumb if desired (§8).

### shard-004-F46 · should · high · motion
- **Where:** `src/shared/ui/tabs.tsx:29` — `rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none`
- **Rule:** vercel-rules "Animation" bullet "Never `transition: all`"; "Anti-patterns" bullet "`transition: all`"; design-system §8 "Hover: colour only, `transition-colors`"
- **Current:** `transition-all`.
- **Expected:** `transition-colors` (`button.tsx:7`, `sidebar.tsx:228` post-ruling).
- **Change:** `class-level` — `transition-all` → `transition-colors`.
- **Notes:** —

### shard-004-F47 · should · medium · colour roles
- **Where:** `src/shared/ui/tabs.tsx:29` — `data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow`
- **Rule:** design-system §3 "Selected/current state is the `bg-primary/10 text-primary` wash (C-C1), never the accent"; §4 "Shadow. None on any dashboard card, panel, tile"; §13 row D-B2 "Segmented choice: Dash separate `h-7` pills, variant swap; Trips … Tabs tray `h-9 rounded-lg bg-muted p-1`"
- **Current:** active tab = white card + ambient shadow inside a muted tray.
- **Expected:** the reference's selected wash — `bg-primary/10 text-primary` (`sidebar.tsx:230`, `dashboard.tsx:737`); no shadow.
- **Change:** `class-level` — `data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow` → `data-[state=active]:bg-primary/10 data-[state=active]:text-primary`; add `hover:text-foreground` for the inactive hover cue (vercel "Hover & Interactive States").
- **Notes:** Medium: D-B2 is a listed deviation awaiting a ruling; the class-level change keeps the tray shape and only aligns the selected state.

### shard-004-F48 · blocker · medium · buttons & controls (focus)
- **Where:** `src/shared/ui/tabs.tsx:43` — `className={cn('mt-2 focus-visible:outline-none', className)}`
- **Rule:** vercel-rules "Focus States" bullet "Never `outline-none` / `outline: none` without focus replacement"; "Anti-patterns" bullet "`outline-none` without focus-visible replacement"; design-system §14 C-B1
- **Current:** Radix `TabsContent` is focusable (`tabIndex=0`) and its outline is removed with no ring.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`dashboard.tsx:735`).
- **Change:** `class-level` — `'mt-2 focus-visible:outline-none'` → `'mt-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'`.
- **Notes:** Medium because the panel only receives focus via keyboard Tab from the trigger row.

### shard-004-F49 · blocker · medium · colour roles
- **Where:** `src/shared/ui/toaster.tsx:20` — `richColors`
- **Rule:** `index.css` palette rule quoted in design-system §0.2 "Two hues, one job each… Adding a third accent colour breaks the whole scheme, so don't."; §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … never a solid status fill"
- **Current:** Sonner `richColors` paints success/error/warning/info toasts with Sonner's own green/red/amber/blue backgrounds, outside the token system, and as solid fills.
- **Expected:** token-based tinting — `border-success/40 bg-success/10 text-success` etc. (`badge.tsx:5-20`, `dashboard.tsx:216-249`).
- **Change:** `class-level` — `richColors` → `richColors={false}` and add to `toastOptions.classNames`: `success: 'group-[.toaster]:border-success/40 group-[.toaster]:bg-success/10 group-[.toaster]:text-success'`, `error: 'group-[.toaster]:border-destructive/40 group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive'`, `warning: '…warning…'`, `info: '…primary…'`.
- **Notes:** Medium: §7 records that toasts are not used by the reference at all (D-ST3), so the exact recipe is an extrapolation of the badge tint; the third-hue contradiction itself is explicit.

### shard-004-F50 · should · high · motion
- **Where:** `src/shared/ui/toaster.tsx:36` — `<LazyDotLottieReact src={…success.lottie} loop autoplay />` (and `:43`)
- **Rule:** design-system §8 "Lottie loops only in empty states (palette `no_results`). Nothing else loops"; vercel-rules "Animation" bullets "Muted decorative loops must stop under `prefers-reduced-motion`", "Honor `prefers-reduced-motion`"
- **Current:** the toast icon loops indefinitely and ignores reduced motion.
- **Expected:** a single play (the icon is a status glyph, not an empty-state illustration) that is hidden/static under reduced motion.
- **Change:** `class-level` — `loop` → `loop={false}` on both; add `motion-reduce:hidden` to the two `h-10 w-10` wrapper divs and keep the Suspense fallback box as the reduced-motion stand-in (or render a static `CheckCircle2`/`AlertTriangle` `h-4 w-4` with `hidden motion-reduce:block`).
- **Notes:** Attribute value change, not a prop deletion.

### shard-004-F51 · nit · medium · radius/border/shadow
- **Where:** `src/shared/ui/toaster.tsx:35` — `-ms-2 me-3 drop-shadow-md` (and `:42`)
- **Rule:** design-system §4 "Shadow… Elevation is reserved for controls and floating layers"; §3 "De-emphasis by opacity… secondary parts of an already-coloured element"
- **Current:** a drop shadow under the icon inside an already-elevated toast.
- **Expected:** no shadow on an inline icon (no reference icon carries one).
- **Change:** `class-level` — remove `drop-shadow-md` from both wrappers.
- **Notes:** —

### shard-004-F52 · nit · low · radius/border/shadow
- **Where:** `src/shared/ui/toaster.tsx:26` — `group-[.toaster]:border-border group-[.toaster]:shadow-lg`
- **Rule:** design-system §4 "`shadow-md` on every floating menu (Popover, DropdownMenuContent…); `shadow-lg` on Dialog, CommandDialog, Sheet"; §14 C-R5 "`shadow-md`"
- **Current:** toast at Dialog depth.
- **Expected:** a non-modal floating layer sits at `shadow-md` (`popover.tsx:22`).
- **Change:** `class-level` — `group-[.toaster]:shadow-lg` → `group-[.toaster]:shadow-md`.
- **Notes:** Low: toasts are not classified in §4; extrapolated from "modal = lg, floating = md".

### shard-004-F53 · should · high · motion
- **Where:** `src/shared/ui/tooltip.tsx:18` — `` `${OVERLAY_Z} overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background animate-in fade-in-0 zoom-in-95` ``
- **Rule:** design-system §14 C-M3 "Dialog, Popover, Dropdown and Select all `duration-200` fade + zoom-95"; §8 "Overlays… `duration-200` fade + zoom-95 (C-M3)"
- **Current:** fade+zoom at tailwindcss-animate's default 150ms, no exit animation, no `data-[state]` gating.
- **Expected:** `popover.tsx:22` — `duration-200` with `data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95`.
- **Change:** `class-level` — `animate-in fade-in-0 zoom-in-95` → `duration-200 data-[state=delayed-open]:animate-in data-[state=instant-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95`.
- **Notes:** Radix Tooltip uses `delayed-open`/`instant-open`/`closed` states, not `open`.

### shard-004-F54 · nit · low · radius/border/shadow
- **Where:** `src/shared/ui/tooltip.tsx:18` — `rounded-md bg-foreground px-3 py-1.5 text-xs text-background`
- **Rule:** design-system §4 "`shadow-md` on every floating menu (Popover, DropdownMenuContent, DropdownMenuSubContent, SelectContent)"
- **Current:** floating layer with no shadow (relies on the inverted fill for separation).
- **Expected:** `shadow-md` like the other floating surfaces (`popover.tsx:22`).
- **Change:** `class-level` — add `shadow-md`.
- **Notes:** Low: the tooltip's inverted surface is a distinct idiom with no rule; only the shadow is extrapolated.

## Summary
FINDINGS: 54 (blocker 12 / should 33 / nit 9)
