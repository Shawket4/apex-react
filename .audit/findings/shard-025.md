# Findings — shard-025

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/trip-replay-leg-rail/index.ts` | 2 | no UI content | barrel re-export only |
| `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx` | 189 | audited | `legColor(leg.legType)` inline colours (`:128`) are **not** flagged: §3 permits third hues "in charts/maps", and the dot is a legend key for the map polylines. `legColor` itself lives out-of-shard (`pages/trip-replay/replay-model`). Rail width `w-72` matches the Popover primitive. |
| `src/widgets/trip-replay-map/google-adapter.ts` | 268 | audited | No UI content beyond map internals. Hex map styles, marker colours (`#2563eb`, `#16a34a`) and the pulse `#f59e0b` are map-layer colours — §3 allows third hues in charts/maps; §13 D-C2 records the same practice in trips without ruling against map markers. `google.maps.ControlPosition.RIGHT_CENTER` is a provider API, not a CSS utility, so C-I1 does not apply — **no rule** for RTL mirroring of map controls. |
| `src/widgets/trip-replay-map/index.ts` | 9 | no UI content | barrel re-export only |
| `src/widgets/trip-replay-map/leaflet-adapter.ts` | 227 | audited | Same as the Google adapter. `divIcon` `<img>` carries `width`/`height`/`alt=""` — satisfies the Vercel "Images" bullets. `L.control.zoom({position:'bottomleft'})` is a provider option, **no rule**. |
| `src/widgets/trip-replay-map/trip-replay-map.tsx` | 137 | audited | — |
| `src/widgets/trip-replay-map/types.ts` | 62 | no UI content | interfaces + numeric constants only |
| `src/widgets/trip-replay-timeline/index.ts` | 6 | no UI content | barrel re-export only |
| `src/widgets/trip-replay-timeline/trip-replay-timeline.tsx` | 381 | audited | `dir="ltr"` on the band is deliberate and documented in the file header; §9 has **no rule** forcing a time axis to mirror, so it is not flagged. Imperative DOM writes in pointer handlers are not render-time layout reads, so the Vercel "Performance" bullet does not fire. |
| `src/entities/trip-statistics/api.ts` | 60 | no UI content | data/logic |
| `src/entities/trip-statistics/queries.ts` | 79 | no UI content | data/logic |
| `src/entities/trip-statistics/schemas.ts` | 280 | no UI content | zod schemas |
| `src/entities/trip-summary/api.ts` | 83 | no UI content | data/logic |
| `src/entities/trip-summary/queries.ts` | 22 | no UI content | data/logic (also listed in PLAN.md as never-imported — not judged here) |
| `src/entities/trip-summary/schemas.ts` | 143 | no UI content | zod schemas |

## Findings

### shard-025-F01 · blocker · high · colour roles
- **Where:** `src/widgets/trip-replay-timeline/trip-replay-timeline.tsx:51` — `delivery: 'bg-sky-500',\n  stop: 'bg-amber-500',\n  flag: 'bg-red-500',`
- **Rule:** design-system §3 "Adding a third accent colour breaks the whole scheme, so don't" (the `index.css:7-19` palette rule); §3 "Non-token colours in the reference: the two scrims and `theme-color`"
- **Current:** the three event-pin kinds are painted with raw Tailwind palette hues (`sky-500`, `amber-500`, `red-500`) on the timeline band — a page control surface, not a chart or a map layer.
- **Expected:** status colour comes from the tokens: `bg-primary` (actionable/neutral event), `bg-warning` (attention), `bg-destructive` (critical) — §3 "Warning … degraded / attention" and "Destructive … critical / negative"; the dashboard's own `STATUS_STYLES` is token-only (`src/pages/dashboard/dashboard.tsx:669-676`).
- **Change:** `class-level` — `delivery: 'bg-sky-500'` → `delivery: 'bg-primary'`; `stop: 'bg-amber-500'` → `stop: 'bg-warning'`; `flag: 'bg-red-500'` → `flag: 'bg-destructive'`.
- **Notes:** these classes are consumed once, at `:337`. They tint a 12px dot that sits over the band, so the tokens' dark-mode variants matter — all three have `.dark` values in `index.css`. Do not confuse this with the leg-segment colours (`legColor`, `:284`), which are map-derived and stay.

### shard-025-F02 · blocker · medium · colour roles
- **Where:** `src/widgets/trip-replay-timeline/trip-replay-timeline.tsx:293` — `className="absolute inset-y-0 bg-slate-950/35 dark:bg-black/45"`
- **Rule:** design-system §3 "Non-token colours in the reference: the two scrims and `theme-color #1b396a`"; the `index.css` palette rule quoted in §0.2
- **Current:** night shading uses `slate-950`, a Tailwind palette colour outside the token set, in light mode.
- **Expected:** the reference's only hard-coded colour is the scrim `bg-black/50` (`shared/ui/dialog.tsx:18`); a darkening wash uses black, not a slate hue.
- **Change:** `class-level` — `bg-slate-950/35 dark:bg-black/45` → `bg-black/35 dark:bg-black/45`.
- **Notes:** `slate-950` is already near-black, so the visual delta is small; the point is that no third palette family enters the app. The block also carries a translated `title` (`:295`), which stays.

### shard-025-F03 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/trip-replay-timeline/trip-replay-timeline.tsx:245` — `tabIndex={-1}`  (on the `role="slider"` band at `:239`)
- **Rule:** vercel-rules "Accessibility" bullet "Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)"; "Anti-patterns" bullet "Gesture-only action without tap/click and keyboard alternative"; "Focus States" bullet "Interactive elements need visible focus"
- **Current:** the scrub band declares `role="slider"` with `aria-valuemin/max/now`, but is removed from the tab order and has no key handling, so the playhead can only be moved by a pointer drag. There is no focus style either.
- **Expected:** every interactive surface in the reference is reachable and has a ring — §4 "Focus ring … on every interactive element (C-B1)"; the dashboard's disclosure buttons, tiles and rows are all native, focusable and ringed.
- **Change:** `structural` (additive only) — set `tabIndex={disabled ? -1 : 0}`, add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` to the band's `cn(...)` at `:251-259`, and add an `onKeyDown` that maps ArrowLeft/ArrowRight (± one step of `model.spanMs`), Home → `model.startMs` and End → `model.endMs` onto the existing `onScrub` prop. Nothing is removed.
- **Notes:** `setPlayhead` already writes `aria-valuenow` imperatively (`:84`), so AT will follow keyboard scrubbing with no extra work. `aria-disabled` is already wired at `:244`. An `aria-valuetext` carrying `getPreview(ms).timeLabel` would be a further improvement but is not required by a cited bullet.

### shard-025-F04 · blocker · high · radius/border/shadow
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:72` — `'pointer-events-auto flex max-h-full w-72 flex-col overflow-hidden rounded-xl border bg-card/85 shadow-xl backdrop-blur-md'`
- **Rule:** design-system §14 ruling **C-R1** "token family: `rounded-lg` everywhere; `rounded-xl` retired"; §4 "Rule (C-R1): every card, panel and tile uses the token family (`rounded-lg`); `rounded-xl` is not used, so one variable moves every surface"
- **Current:** the rail panel is `rounded-xl` (a Tailwind constant, 12px today but detached from `--radius`).
- **Expected:** `rounded-lg` (the `--radius` token family), as on every dashboard panel after C-R1 was applied (`src/pages/dashboard/dashboard.tsx:135`).
- **Change:** `class-level` — `rounded-xl` → `rounded-lg`.
- **Notes:** the inner leg cards at `:117` are already `rounded-lg`, so this also removes an internal inconsistency inside the same widget. See F09 for the `shadow-xl` on the same line.

### shard-025-F05 · should · high · type
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:81` — `className="text-xs font-bold uppercase tracking-wider text-muted-foreground"`
- **Rule:** design-system §2 eyebrow row "**10** · `text-[10px]` · **600, `uppercase tracking-wider text-muted-foreground`**"; §2 "Weights used: 400, 500 (`font-medium`), 600 (`font-semibold`). **700 is never used**"; §10 `Eyebrow  text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
- **Current:** the rail's section heading is 12px at weight 700.
- **Expected:** the eyebrow recipe — 10px, `font-semibold` (`src/pages/dashboard/dashboard.tsx:427`, `src/widgets/sidebar/sidebar.tsx:204`).
- **Change:** `class-level` — `text-xs font-bold uppercase tracking-wider text-muted-foreground` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`.
- **Notes:** the row it sits in (`:80`, `border-b px-3 py-2`) already matches the PanelHead recipe apart from the missing `bg-muted/60` band tint; the tint is deliberate here (the rail is translucent glass over a map), so it is not flagged.

### shard-025-F06 · should · high · colour roles
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:121` — `: 'hover:bg-muted/60',`
- **Rule:** design-system §14 ruling **C-C4** "`hover:bg-muted/50` on content rows/cards"; §3 "Content-row hover · `hover:bg-muted/50` + `transition-colors`"; §13 row **D-C3** (trips' `/40`/`/60` hovers are the deviation; the dashboard wins)
- **Current:** leg cards hover to `bg-muted/60` — which is the §14 C-C2 *head band* step, not the hover step.
- **Expected:** `hover:bg-muted/50` (`src/pages/dashboard/dashboard.tsx:425`, `:616`, `:940`).
- **Change:** `class-level` — `hover:bg-muted/60` → `hover:bg-muted/50`.
- **Notes:** `transition-colors` is already present at `:117`.

### shard-025-F07 · should · medium · colour roles
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:120` — `? 'border-primary/60 bg-primary/10'`
- **Rule:** design-system §14 ruling **C-C1** "`bg-primary/10 text-primary` (+ `border-primary` on tiles)"; §3 "Current / selected wash · `bg-primary/10 text-primary`"
- **Current:** the active leg card gets a 60%-alpha primary border and the 10% wash, but the foreground is never promoted to `text-primary`.
- **Expected:** full-strength `border-primary` plus `bg-primary/10 text-primary`, as on the selected fleet tile after C-C1 was applied (`src/pages/dashboard/dashboard.tsx:737`) and the active nav link (`src/widgets/sidebar/sidebar.tsx:230`).
- **Change:** `class-level` — `'border-primary/60 bg-primary/10'` → `'border-primary bg-primary/10 text-primary'`.
- **Notes:** the card's inner text is a mix of `text-muted-foreground` metadata (`:156`, `:163`) and an unqualified leg name (`:130`); only the leg name inherits, which is the intended "you are here" promotion. The muted lines keep their own colour.

### shard-025-F08 · should · high · pills/chips
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:170` — `<Badge variant="warning" className="px-1 py-0 text-[9px]" dir="ltr">`
- **Rule:** design-system §14 ruling **C-T3** "ConnectionBadge recipe is *the* status pill and the `Badge` primitive now matches it (`gap-1.5 px-2.5 py-1 text-[11px]`) … the 9.5px in-row tag becomes a chip"; §5.3 "Badge primitive … `rounded-full border px-2.5 py-1 text-[11px] font-medium`"
- **Current:** the excess-km badge overrides the primitive down to `px-1 py-0 text-[9px]` — smaller than any pill or chip in the reference, and exactly the 9.5px in-row tag that C-T3 abolished.
- **Expected:** either the status-pill recipe unchanged (`<Badge variant="warning">`, 11px / `px-2.5 py-1`), or, if the row is genuinely too dense for a pill, the neutral-chip step `px-2 py-0.5 text-[10.5px] font-medium` (§5.3, §10 `Chip`). The excess-km value is a warning state, so the pill is the right call.
- **Change:** `class-level` — drop the size override: `className="px-1 py-0 text-[9px]"` → `className="shrink-0"` (keep `dir="ltr"` and `variant="warning"`).
- **Notes:** the containing row is `flex flex-wrap … gap-x-2 gap-y-0.5` (`:163`), so a taller pill wraps rather than clipping. `Badge` is a reference primitive — do not touch `shared/ui/badge.tsx` (`out-of-shard: src/shared/ui/badge.tsx`).

### shard-025-F09 · should · medium · radius/border/shadow
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:72` — `border bg-card/85 shadow-xl backdrop-blur-md`
- **Rule:** design-system §4 "**Shadow.** … `shadow-sm` on filled/outline Button variants … `shadow-md` on every floating menu … `shadow-lg` on Dialog, CommandDialog, Sheet"
- **Current:** `shadow-xl` — a depth that appears nowhere in the reference; the deepest step in use is `shadow-lg`, reserved for full overlays.
- **Expected:** the rail is a floating panel over the map, i.e. the floating-layer tier: `shadow-lg` at most, `shadow-md` to match menus/popovers.
- **Change:** `class-level` — `shadow-xl` → `shadow-lg`.
- **Notes:** same line as F04; apply both edits together. The collapsed pill at `:56` already uses `shadow-lg`, so this also makes the widget self-consistent.

### shard-025-F10 · should · medium · pills/chips
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:127` — `className="inline-block h-2 w-2 shrink-0 rounded-full"`
- **Rule:** design-system §14 ruling **C-C8** "6px (`h-1.5 w-1.5`). Applied to the legend"; §5.3 "Status dots · `h-1.5 w-1.5 rounded-full` everywhere — badge, tile corner, legend"
- **Current:** the leg-colour key dot is 8px.
- **Expected:** 6px, `h-1.5 w-1.5` (`src/pages/dashboard/dashboard.tsx:226`, `:749`, `:814`).
- **Change:** `class-level` — `h-2 w-2` → `h-1.5 w-1.5`.
- **Notes:** the equivalent dot inside the timeline's leg chip is already `h-1.5 w-1.5` (`trip-replay-timeline.tsx:366`), so the two surfaces currently disagree about the same key.

### shard-025-F11 · should · medium · type
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:156` — `className="mt-1 text-[10px] tabular-nums text-muted-foreground"`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values, bar amounts, the fuel-row price"; §2 eyebrow row (10px is the eyebrow slot; the "hint under a row label" step is `text-[11px]`, C-T4)
- **Current:** the depart→arrive clock line (`:156`) and the km / off-route line (`:163`) are `text-[10px] tabular-nums` in the sans face; 10px is reserved for the uppercase eyebrow.
- **Expected:** figures in the mono face at the hint step: `text-[11px] font-mono tabular-nums text-muted-foreground` — times and distances are exactly the "receipt numbers, plates, litres" the mono is loaded for (§0.1), and C-T4 puts a hint under a row label at 11px.
- **Change:** `class-level` — `:156` `mt-1 text-[10px] tabular-nums text-muted-foreground` → `mt-1 font-mono text-[11px] tabular-nums text-muted-foreground`; `:163` `mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] tabular-nums text-muted-foreground` → `mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tabular-nums text-muted-foreground`.
- **Notes:** the km line embeds a translated `km` unit and an "% off-route" sentence (`:167`, `:176`) — those are Latin/Arabic words rendered in mono if the class sits on the wrapper. §0.1 says Arabic is never in mono (§9 "Arabic never in mono"). Safer variant if Arabic is a concern: leave the wrapper sans and put `font-mono` on the numeric `<span dir="ltr">` at `:164` only. The fixer should take the safer variant for `:163` and the wrapper for `:156` (a pure clock line).

### shard-025-F12 · should · high · motion
- **Where:** `src/widgets/trip-replay-timeline/trip-replay-timeline.tsx:336` — `'h-3 w-3 rounded-full border border-background shadow transition-transform group-hover:scale-125',`
- **Rule:** design-system §8 "**Hover**: colour only, `transition-colors` … Nothing scales, lifts or changes shadow"; §5.1 "Transition is colour only — no scale, lift, or shadow change on hover/press"
- **Current:** event pins grow 25% on hover via a transform.
- **Expected:** hover feedback is a colour change only; the reference has no scale on any hover surface.
- **Change:** `class-level` — `border border-background shadow transition-transform group-hover:scale-125` → `border border-background shadow-sm transition-colors group-hover:brightness-110`; simplest compliant form is to drop the growth entirely: `'h-3 w-3 rounded-full border border-background shadow-sm'` and let the button's existing focus ring carry the affordance.
- **Notes:** the pin already has a ~40px invisible hit area (`:328`) and a `title`/`aria-label` (`:324-325`), so removing the scale costs no discoverability. `shadow` (the bare Tailwind default) is also not a step used anywhere in the reference — §4 lists only `shadow-sm`/`md`/`lg`; the same bare `shadow` appears on the playhead knob at `:312` (see F21). There is no `motion-reduce` guard on this transform today.

### shard-025-F13 · should · medium · pills/chips
- **Where:** `src/widgets/trip-replay-timeline/trip-replay-timeline.tsx:359` — `'relative flex cursor-pointer items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors hover:bg-muted'`
- **Rule:** design-system §5.3 "Method chip · `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`"; §10 `Chip  rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium`; §14 C-T3 "neutral chips are `px-2 py-0.5 text-[10.5px] font-medium`"
- **Current:** the leg chips are a fourth small-pill recipe — 10px, weight 600, `px-1.5`, bordered-and-transparent instead of the neutral fill.
- **Expected:** the neutral chip: `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`, with the reference's hover step for chrome (`hover:bg-accent`, §14 C-C4).
- **Change:** `class-level` — `gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors hover:bg-muted` → `gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground`.
- **Notes:** these chips are clickable (`onClick={() => onLegClick(seg.timedIndex)}`) and sit in a `flex-wrap` row, so the extra 1px of padding wraps rather than overflowing. Keep the `after:` hit-area and focus-ring classes at `:360-361` untouched. `gap-1.5` is §1's icon/label pairing step and is what the Badge/chip recipes use.

### shard-025-F14 · should · medium · colour roles
- **Where:** `src/widgets/trip-replay-timeline/trip-replay-timeline.tsx:253` — `'relative h-9 touch-none overflow-hidden rounded-lg border bg-muted/50',`
- **Rule:** design-system §6 "**Bar chart made of divs**: track `h-[15px] overflow-hidden rounded bg-muted`"; §14 ruling **C-C2** "three steps: `/60` head band, `/50` hover, `/40` wells"
- **Current:** the timeline band — a track that segments are painted onto — uses `bg-muted/50`, the step reserved for row hover.
- **Expected:** a track is a solid `bg-muted` (`src/pages/dashboard/dashboard.tsx:985`); if a translucent well is wanted because the band floats over the map, the wells step is `/40`.
- **Change:** `class-level` — `bg-muted/50` → `bg-muted`.
- **Notes:** dwell stripes (`:270`) and night shading (`:293`) are drawn over this track, so raising it to full opacity slightly increases their contrast — that is the intent. `rounded-lg` and the 1px `border` on this line already match §4.

### shard-025-F15 · should · high · loading states
- **Where:** `src/widgets/trip-replay-map/trip-replay-map.tsx:131` — `<div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />`
- **Rule:** design-system §14 ruling **C-M2** "`motion-reduce:animate-none` on the Skeleton primitive" (every looping animation in the reference carries the guard — §8 "**Looping**: `animate-pulse` on skeletons and on the live/connecting badge dot, both with `motion-reduce:animate-none`"); §4 "**Border.** 1px everywhere; no `border-2`"; provisional (§12.6) "**Spinners**: `Loader2 animate-spin` … map overlay `absolute inset-0 z-10 bg-background/70 backdrop-blur-sm` with `h-7 w-7 text-primary`"
- **Current:** a hand-rolled CSS ring spinner: `border-2`, no reduced-motion opt-out, no accessible name, and not the `Loader2` icon the rest of the app uses.
- **Expected:** the provisional (§12.6) map-overlay spinner — a `Loader2` from lucide at `h-7 w-7 text-primary` with `animate-spin motion-reduce:animate-none` — and no `border-2` anywhere.
- **Change:** `class-level` + `structural` (swap the element, additive import) — import `Loader2` from `lucide-react` and replace the bare `<div>` with `<Loader2 className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />`, and put `role="status"` + `aria-label={t('common.loading', 'Loading…')}` on the wrapper at `:130`. This file does not currently call `useTranslation`, so adding the label requires the hook (additive) — see the note.
- **Notes:** the ellipsis in `Loading…` is the single character `…`, per vercel-rules "Typography" ("Loading states end with `…`") — do not write `...`. If the fixer prefers not to introduce `useTranslation` into this file, the reduced-motion guard and the `Loader2` swap are the mandatory parts; a hard-coded English label would violate §9/C-I4 and must not be used.

### shard-025-F16 · should · medium · colour roles
- **Where:** `src/widgets/trip-replay-map/trip-replay-map.tsx:130` — `<div className="absolute inset-0 flex items-center justify-center bg-muted/30">`
- **Rule:** design-system §14 ruling **C-C2** "three steps: `/60` head band, `/50` hover, `/40` wells"; provisional (§12.6) map overlay `bg-background/70 backdrop-blur-sm`
- **Current:** `bg-muted/30` — a fourth muted step, one C-C2 explicitly removed.
- **Expected:** the wells step `bg-muted/40`, or the provisional (§12.6) map-loading overlay `bg-background/70 backdrop-blur-sm`. The overlay covers a map that has not painted yet, so `bg-muted/40` (a well) is the closer read of C-C2 and needs no new blur.
- **Change:** `class-level` — `bg-muted/30` → `bg-muted/40`.
- **Notes:** same element as F15's wrapper; apply the `role="status"` addition and this class change together.

### shard-025-F17 · should · medium · RTL/i18n/a11y
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:107` — `role="button"` (on the `<div>` opened at `:106`, with `onClick` at `:109`)
- **Rule:** vercel-rules "Accessibility" bullet "`<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)"; "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"
- **Current:** each leg card is a `<div role="button" tabIndex>` with a hand-rolled Enter/Space handler, rather than a native `<button>`. The dashboard's equivalent surfaces — the KPI card face and the fleet tile — are native `<button>` elements (§5.2).
- **Expected:** a native `<button type="button">` carrying the same classes, per §5.2 "Fleet tile · raw `<button class=…>`".
- **Change:** `structural` — **do not apply blind.** The card contains a nested `<Button>` (the loop-this-leg control, `:139-152`); a native `<button>` may not contain another button, so the swap requires lifting the loop control out of the card into a sibling of it inside a positioned wrapper. If that restructure is not wanted, the current pattern is the documented fallback: provisional (§12.4) records the same `div role=button tabIndex=0 aria-expanded` + Enter/Space construction for the trips mobile-list row, and this card already has the keyboard handler (`:110-115`) and a focus ring (`:118`) the bullet is really protecting.
- **Notes:** graded `should`, not `blocker`, precisely because of that §12.4 precedent and the nested-button constraint — the letter of the bullet is broken, the intent (keyboard + focus + role) is met. The fixer may reasonably record this as accepted-as-is rather than restructure.

### shard-025-F18 · nit · medium · radius/border/shadow
- **Where:** `src/widgets/trip-replay-timeline/trip-replay-timeline.tsx:232` — `whitespace-nowrap rounded-md border bg-card/95 px-2 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-lg backdrop-blur transition-opacity`
- **Rule:** design-system §4 "`shadow-md` on every floating menu (Popover, DropdownMenuContent, DropdownMenuSubContent, SelectContent); `shadow-lg` on Dialog, CommandDialog, Sheet"; §14 ruling **C-R5** "`shadow-md`"
- **Current:** the hover-scrub tooltip — a small floating hint — carries `shadow-lg`, the dialog/sheet tier.
- **Expected:** `shadow-md`, the floating-menu tier (`shared/ui/popover.tsx:22`).
- **Change:** `class-level` — `shadow-lg` → `shadow-md`.
- **Notes:** `rounded-md`, the 1px border and `bg-card` on this line already match the Popover surface recipe; only the depth is off. The 10px figure size is acceptable here — it is a transient scrub readout, and §2 has no rule for tooltip body text (**no rule**).

### shard-025-F19 · nit · medium · motion
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:41` — `activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });`
- **Rule:** vercel-rules "Animation" bullet "Honor `prefers-reduced-motion` (provide reduced variant or disable)"
- **Current:** the rail smooth-scrolls the active card into view on every leg change during playback — an unconditional animation with no reduced-motion opt-out. Under a long trip this fires repeatedly.
- **Expected:** motion opts out per element in this codebase (§8 "**Reduced motion**: no global `prefers-reduced-motion` rule; opt-out is per element").
- **Change:** `class-level` (JS-level, additive) — gate the behaviour: `behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'`. The effect, the ref and the dependency array are unchanged.
- **Notes:** `app/index.css:99` sets `html { scroll-behavior: smooth }` globally and is a reference file, so `behavior: 'auto'` here is an explicit per-call override, not a contradiction of the foundation. `out-of-shard: src/shared/hooks/use-media-query.ts` if the fixer would rather reuse a hook than call `matchMedia` inline — prefer the inline call and touch nothing outside the shard.

### shard-025-F20 · nit · medium · RTL/i18n/a11y
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:134` — `<Moon\n  className="h-3 w-3 shrink-0 text-primary"\n  aria-label={t('tripReplay.legRail.night', 'Night window')}`
- **Rule:** vercel-rules "Accessibility" bullets "Decorative icons need `aria-hidden=\"true\"`" and "Use semantic HTML … before ARIA"
- **Current:** a meaningful `aria-label` is placed directly on a lucide `<svg>`, which lucide renders without a `role`. `aria-label` on an element with no role is not reliably exposed, so the "night window" fact reaches neither sighted-only nor screen-reader users dependably.
- **Expected:** the reference exposes compressed context with a native `title` and marks pure decoration `aria-hidden` (§9 "`aria-hidden` on dots/chevrons/severity bars/sentinel; native `title` for compressed context").
- **Change:** `class-level` (additive attributes) — add `role="img"` alongside the existing `aria-label`, and add a matching `title={t('tripReplay.legRail.night', 'Night window')}` so the meaning is available on hover too. Keep `aria-label` as-is.
- **Notes:** the same `Moon` glyph appears in the timeline leg chip (`trip-replay-timeline.tsx:370`) with no label at all; that one is genuinely redundant (the chip's `aria-label` already names the leg) and should get `aria-hidden="true"` instead.

### shard-025-F21 · nit · low · radius/border/shadow
- **Where:** `src/widgets/trip-replay-timeline/trip-replay-timeline.tsx:312` — `<div className="absolute -top-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow" />`
- **Rule:** design-system §4 "**Shadow.** … `shadow-sm` on filled/outline Button variants … `shadow-md` on every floating menu … `shadow-lg` on Dialog"; §5.3 "Status dots · `h-1.5 w-1.5 rounded-full` everywhere"
- **Current:** the playhead knob uses the bare Tailwind `shadow` step, which appears nowhere in the reference's three-step shadow scale, and is 8px where the app's dot size is 6px.
- **Expected:** `shadow-sm`; dots at `h-1.5 w-1.5`.
- **Change:** `class-level` — `h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow` → `h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary shadow-sm`.
- **Notes:** low confidence on the size half — this knob is a drag affordance on a control, not a status dot, and §5.3's rule is written about status indicators; the shadow half is the solid part. `left-1/2` is physical, but the band is deliberately `dir="ltr"` (`:221`), so C-I1 does not apply here — leave it.

### shard-025-F22 · nit · low · type
- **Where:** `src/widgets/trip-replay-leg-rail/trip-replay-leg-rail.tsx:131` — `{leg.fromName || '—'} → {leg.toName || '—'}`
- **Rule:** design-system §2 "Inline separator is ` · `; empty numeric is `—` at `opacity-40`"; §13 row **D-C11** "Empty value · Dash `—` at `opacity-40` · Trips `—` at full `text-muted-foreground`, or bare"
- **Current:** the placeholder em dash for a missing leg endpoint renders at full strength, so a missing name reads as loudly as a present one. The same bare `—` appears at `:165-166` for missing km figures.
- **Expected:** `<span className="opacity-40">—</span>` (`src/pages/dashboard/dashboard.tsx:765`).
- **Change:** `class-level` — wrap each fallback: `{leg.fromName || <span className="opacity-40">—</span>}` (same for `toName` at `:131` and for the two km fallbacks at `:165-166`).
- **Notes:** the leg name span carries `dir="auto"` (`:130`), which stays; wrapping the fallback in a `<span>` does not change the computed direction of the surrounding text. D-C11 is a trips deviation row — the dashboard value wins, so `opacity-40` is the target.

## Summary
FINDINGS: 22 (blocker 4 / should 13 / nit 5)
