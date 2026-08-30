# Findings — shard-018

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/features/tracking/components/fleet-panel.tsx` | 188 | audited | no rule: slide-in panel header height `h-12`, panel width `w-[300px]`, `z-30` inside the map, `aria-hidden` on a translated-off panel |
| `src/features/tracking/components/range-picker.tsx` | 254 | audited | no rule: bottom-docked sheet layout (`rounded-t-*`, `border-b-0`, `md:max-w-md`), native `<select>` pairs for HH/MM (only provisional §12.2) |
| `src/features/tracking/components/replay-transport.tsx` | 254 | audited | no rule: `<input type="range">` styling, scrubber tick geometry, `w-[70px]` time slots |
| `src/features/tracking/components/status-chips.tsx` | 77 | audited | no rule: hidden-scrollbar horizontal strip; `STATUS_COLOR` hex map lives out-of-shard in `../schemas.ts` |
| `src/features/tracking/components/time-deck.tsx` | 662 | audited | no rule: day-progress bar, leg rail (identity hues per trip come from map data), `▲`/`●` glyphs, `→` in route labels |
| `src/features/tracking/components/vehicle-card.tsx` | 95 | audited | no rule: floating card width `w-[260px]` |
| `src/features/tracking/map/layers.ts` | 373 | no UI content | deck.gl layer builders; hex/rgb map colours fall under the "third hues only in charts/maps" exception (§3) |
| `src/features/tracking/map/tracking-map.tsx` | 554 | audited | map host; marker artwork colours are map content (§3 exception) — only the InfoWindow tooltip HTML and marker-chip typography are graded |

## Findings

### shard-018-F01 · blocker · high · focus
- **Where:** `src/features/tracking/components/fleet-panel.tsx:100` — `className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"`
- **Rule:** design-system §4 "Focus ring. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element (C-B1)" | vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"
- **Current:** the close button (L100), the row-select button (L141 `min-w-0 flex-1 text-start`), the hide/show button (L167) and the focus button (L175) have no focus-visible ring.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` as on every reference clickable (`src/pages/dashboard/dashboard.tsx:735`, `src/shared/ui/button.tsx:7`).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the four buttons at L100, L141, L167, L175. The row button sits inside a `rounded-lg` row that is not `overflow-hidden`, so a plain outset ring is right.
- **Notes:** L167 already has `focus-visible:opacity-100`; keep it.

### shard-018-F02 · blocker · high · colour
- **Where:** `src/features/tracking/components/fleet-panel.tsx:129` — `? 'border-primary/40 bg-primary/5'`
- **Rule:** design-system §14 C-C1 "→ Ruling: `bg-primary/10 text-primary` (+ `border-primary` on tiles)" | §3 "Current / selected wash `bg-primary/10 text-primary`"
- **Current:** selected row is `border-primary/40 bg-primary/5` with no foreground change.
- **Expected:** `border-primary bg-primary/10 text-primary` (selected fleet tile, `src/pages/dashboard/dashboard.tsx:737`).
- **Change:** `class-level` — `border-primary/40 bg-primary/5` → `border-primary bg-primary/10 text-primary`.
- **Notes:** the inner `text-muted-foreground` spans keep their own colour; only the plate digits promote to navy, which matches the tile.

### shard-018-F03 · blocker · high · colour
- **Where:** `src/features/tracking/components/fleet-panel.tsx:135` — `className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"`
- **Rule:** design-system §14 C-C8 "→ Ruling: 6px (`h-1.5 w-1.5`)" | §5.3 "Status dots `h-1.5 w-1.5 rounded-full` everywhere"
- **Current:** 10px dot with a 2px background ring.
- **Expected:** `h-1.5 w-1.5 rounded-full` (`src/pages/dashboard/dashboard.tsx:749`, legend `:814`).
- **Change:** `class-level` — `h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background` → `h-1.5 w-1.5 shrink-0 rounded-full`; add `aria-hidden="true"` (§9 "`aria-hidden` on dots").
- **Notes:** the fill is `STATUS_COLOR[...]` inline; the hex map is `out-of-shard: src/features/tracking/schemas.ts` and is not proposed here.

### shard-018-F04 · should · high · type
- **Where:** `src/features/tracking/components/fleet-panel.tsx:113` — `className="flex items-center gap-1.5 px-2 pb-1 pt-2.5 font-mono text-[9px] font-semibold uppercase tracking-widest"`
- **Rule:** design-system §2 "**10** `text-[10px]` **600, `uppercase tracking-wider text-muted-foreground`** Eyebrow … one label style above every figure and panel" | §10 "Eyebrow text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
- **Current:** group heading is mono, 9px, `tracking-widest`, coloured by `STATUS_COLOR[g]` via inline style.
- **Expected:** sans `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (`src/pages/dashboard/dashboard.tsx:776`, `sidebar.tsx:204`).
- **Change:** `class-level` — `font-mono text-[9px] font-semibold uppercase tracking-widest` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; drop the inline `style={{ color: STATUS_COLOR[g] }}` so the label reads muted like every eyebrow (the dot on each row already carries the status hue).
- **Notes:** the count span keeps `font-normal text-muted-foreground`. Arabic group labels must not be mono (§9 "Arabic never in mono").

### shard-018-F05 · should · high · type
- **Where:** `src/features/tracking/components/fleet-panel.tsx:144` — `className="font-mono text-sm font-bold tabular-nums"`
- **Rule:** design-system §2 "Weights used: 400, 500 (`font-medium`), 600 (`font-semibold`). **700 is never used** in the reference (and Plex Mono isn't loaded above 600)"
- **Current:** plate digits in `font-bold` mono — Plex Mono has no 700 cut, so the browser synthesises it.
- **Expected:** `font-semibold` (tile plate `src/pages/dashboard/dashboard.tsx:744`).
- **Change:** `class-level` — `font-bold` → `font-semibold`.
- **Notes:** —

### shard-018-F06 · should · high · colour
- **Where:** `src/features/tracking/components/fleet-panel.tsx:130` — `: 'hover:bg-muted/60',`
- **Rule:** design-system §14 C-C4 "→ Ruling: named roles — `hover:bg-muted/50` on content rows/cards, `hover:bg-accent` on chrome and menu items" | §8 "Hover: colour only, `transition-colors`"
- **Current:** row hover `hover:bg-muted/60` with no `transition-colors`; the chrome icon buttons at L100, L167, L175 hover to `hover:bg-muted` (L175 `hover:bg-primary/10 hover:text-primary`).
- **Expected:** rows `hover:bg-muted/50 transition-colors` (`src/pages/dashboard/dashboard.tsx:940`); icon buttons `hover:bg-accent hover:text-accent-foreground` (ghost Button, `src/shared/ui/button.tsx:18`).
- **Change:** `class-level` — L130 `hover:bg-muted/60` → `hover:bg-muted/50`, add `transition-colors` to the row base at L127; L100 and L167 `hover:bg-muted` → `hover:bg-accent hover:text-accent-foreground`; L175 `hover:bg-primary/10 hover:text-primary` → `hover:bg-accent hover:text-accent-foreground`.
- **Notes:** —

### shard-018-F07 · should · high · shadow
- **Where:** `src/features/tracking/components/fleet-panel.tsx:81` — `'border-e bg-card/95 shadow-xl backdrop-blur transition-transform duration-200',`
- **Rule:** design-system §4 "Shadow. None on any dashboard card, panel … `shadow-lg` on Dialog, CommandDialog, Sheet"
- **Current:** `shadow-xl` on the slide-in panel.
- **Expected:** the largest depth the reference uses on a floating container is `shadow-lg` (Sheet, `src/shared/ui/sheet.tsx:30`).
- **Change:** `class-level` — `shadow-xl` → `shadow-lg`.
- **Notes:** `transition-transform duration-200` already matches §8 (`duration-200`).

### shard-018-F08 · nit · medium · forms
- **Where:** `src/features/tracking/components/fleet-panel.tsx:92` — `placeholder={t('tracking.searchPlaceholder', 'Search plate or codename')}`
- **Rule:** vercel-rules "Forms" bullets "Placeholders end with `…` and show example pattern" and "Inputs need `autocomplete` and meaningful `name`" | "Typography" bullet "`…` not `...`"
- **Current:** placeholder has no trailing `…`; the search `<input>` at L89 has no `name`, `autocomplete` or `type="search"`.
- **Expected:** placeholder ending in `…`; `name="fleet-search" autoComplete="off" type="search"`.
- **Change:** `class-level` (additive attributes) — add `type="search" name="fleet-search" autoComplete="off" spellCheck={false}` to the input; change the default value to `'Search plate or codename…'` (also the `ar.json`/`en.json` value if the key exists — `out-of-shard: src/shared/i18n/*.json`).
- **Notes:** —

### shard-018-F09 · nit · medium · colour
- **Where:** `src/features/tracking/components/fleet-panel.tsx:131` — `hidden && 'opacity-50',`
- **Rule:** design-system §3 "De-emphasis by opacity `opacity-70` (yesterday revenue, untracked tile …), `opacity-50` (separator dot, select chevron, disabled)"
- **Current:** a hidden-from-map vehicle row fades to `opacity-50`, the disabled step.
- **Expected:** a whole de-emphasised but still interactive element uses `opacity-70` (untracked tile, `src/pages/dashboard/dashboard.tsx:683`).
- **Change:** `class-level` — `opacity-50` → `opacity-70`.
- **Notes:** the row stays clickable (show/focus), so it is not "disabled".

### shard-018-F10 · blocker · high · radius
- **Where:** `src/features/tracking/components/range-picker.tsx:173` — `className="pointer-events-auto w-full rounded-t-2xl border border-b-0 bg-card/95 p-3 shadow-2xl backdrop-blur md:mx-auto md:max-w-md"`
- **Rule:** design-system §14 C-R1 "→ Ruling: token family: `rounded-lg` everywhere; `rounded-xl` retired" | §4 "every card, panel and tile uses the token family (`rounded-lg`)"
- **Current:** `rounded-t-2xl` (16px, Tailwind constant) on the docked picker.
- **Expected:** token radius `rounded-t-lg` (12px, follows `--radius`).
- **Change:** `class-level` — `rounded-t-2xl` → `rounded-t-lg`.
- **Notes:** same class on `time-deck.tsx:284` (F31).

### shard-018-F11 · should · high · shadow
- **Where:** `src/features/tracking/components/range-picker.tsx:173` — `shadow-2xl backdrop-blur`
- **Rule:** design-system §4 "Elevation is reserved for controls and floating layers: … `shadow-lg` on Dialog, CommandDialog, Sheet"
- **Current:** `shadow-2xl`.
- **Expected:** `shadow-lg` (Sheet, `src/shared/ui/sheet.tsx:30`).
- **Change:** `class-level` — `shadow-2xl` → `shadow-lg`.
- **Notes:** —

### shard-018-F12 · blocker · high · focus
- **Where:** `src/features/tracking/components/range-picker.tsx:199` — `className="ms-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"`
- **Rule:** design-system §4 "Focus ring … on every interactive element (C-B1) — including … the dialog/sheet close buttons" | §14 C-C4 "`hover:bg-accent` on chrome and menu items" | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** raw close button without a focus ring, hover `bg-muted`.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `hover:bg-accent hover:text-accent-foreground` (ghost Button recipe, `src/shared/ui/button.tsx:18`; calendar nav is `ghost h-7 w-7`, `src/shared/ui/cairo-range-calendar.tsx`).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` and replace `hover:bg-muted` with `hover:bg-accent hover:text-accent-foreground`.
- **Notes:** —

### shard-018-F13 · should · medium · buttons
- **Where:** `src/features/tracking/components/range-picker.tsx:187` — `variant="outline"` (preset pills)
- **Rule:** design-system §5.2 "Scope presets `Button size="sm" h-7 text-xs`, `variant` flips `default`↔`outline`, `aria-pressed`" | §14 C-B4 "`aria-pressed` for toggles (tiles, presets)"
- **Current:** the five presets are always `outline` and carry no `aria-pressed`; the chosen preset is not shown.
- **Expected:** the active preset is `variant="default"` with `aria-pressed` (`src/widgets/scope-bar/scope-date-picker.tsx:132-136`).
- **Change:** `structural` — track the last applied preset in local state (cleared when the calendar or a time select changes) and flip `variant={active ? 'default' : 'outline'}` + `aria-pressed={active}` per pill. Additive only; no prop or handler removed.
- **Notes:** sizes already match (`size="sm" className="h-7 text-xs"`).

### shard-018-F14 · blocker · medium · buttons
- **Where:** `src/features/tracking/components/range-picker.tsx:246` — `onPointerEnter={() => range && onIntendLoad?.(range[0], range[1])}`
- **Rule:** design-system §14 C-B5 "→ Ruling: pointer + focus + touch everywhere" | §5.2 "Intent prefetch is part of every clickable: `onPointerEnter` + `onFocus` + `onTouchStart` (C-B5)"
- **Current:** the Load button warms the history query on pointer-enter and focus only.
- **Expected:** also `onTouchStart` (`src/pages/dashboard/dashboard.tsx:421-423`).
- **Change:** `class-level` (additive prop) — add `onTouchStart={() => range && onIntendLoad?.(range[0], range[1])}` beside the two existing handlers.
- **Notes:** —

### shard-018-F15 · nit · medium · forms
- **Where:** `src/features/tracking/components/range-picker.tsx:138` — `'h-7 appearance-none rounded-md border bg-background px-1.5 text-center font-mono ' +`
- **Rule:** provisional (§12.2) "Input `… border border-input bg-background … shadow-sm transition-colors … focus-visible:ring-2 ring-ring ring-offset-1`" | vercel-rules "Dark Mode & Theming" bullet "Native `<select>`: explicit `background-color` and `color` (Windows dark mode)"
- **Current:** native selects have `bg-background` but no explicit text colour, no `shadow-sm`, no `ring-offset-1`.
- **Expected:** control recipe with `text-foreground shadow-sm focus-visible:ring-offset-1` (SelectTrigger §5.4, `src/shared/ui/select.tsx:18`).
- **Change:** `class-level` — add `text-foreground shadow-sm focus-visible:ring-offset-1` to `cls`.
- **Notes:** `dir="ltr"` on the wrapper is correct for clock digits.

### shard-018-F16 · blocker · high · colour
- **Where:** `src/features/tracking/components/replay-transport.tsx:150` — `className="absolute top-0 h-2 w-[3px] rounded-sm bg-amber-500/80"`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't" | §3 "Non-token colours in the reference: the two scrims and `theme-color`" | §3 "Warning `bg-warning` … degraded / attention"
- **Current:** stop ticks on the scrubber use Tailwind `amber-500`, a non-token hue.
- **Expected:** the token that carries the "stop/attention" role: `bg-warning/80`.
- **Change:** `class-level` — `bg-amber-500/80` → `bg-warning/80`.
- **Notes:** the scrubber is a control, not a chart, so the charts/maps exception does not apply. Same tick class in `time-deck.tsx:186` (F32).

### shard-018-F17 · blocker · high · colour
- **Where:** `src/features/tracking/components/replay-transport.tsx:226` — `? 'border-emerald-600/50 bg-emerald-600/10 text-emerald-600'`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't" | §3 "Status tint recipe `border-X/40 bg-X/10 text-X`" | §3 "Success `text-success` … passing status only"
- **Current:** the race toggle (L226) and the "ahead" delta chip (L238 `bg-emerald-600/10 text-emerald-600`) use Tailwind emerald.
- **Expected:** success token recipe `border-success/40 bg-success/10 text-success` (`src/pages/dashboard/dashboard.tsx:221`, `badge.tsx`).
- **Change:** `class-level` — L226 → `border-success/40 bg-success/10 text-success`; L238 → `bg-success/10 text-success`.
- **Notes:** the "behind" branch already uses `bg-destructive/10 text-destructive`, which is correct.

### shard-018-F18 · blocker · high · focus
- **Where:** `src/features/tracking/components/replay-transport.tsx:183` — `className="grid h-8 w-8 place-items-center rounded-lg border bg-background hover:bg-muted"`
- **Rule:** design-system §4 "Focus ring … on every interactive element (C-B1) … Never plain `focus:`" | vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"
- **Current:** none of the transport controls has a ring: restart L183, play L191, speed chips L202-207, race toggle L223-228, and the range input L164 (`appearance-none` with no replacement focus style).
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (+ `ring-offset-1` on button-like controls, `src/shared/ui/button.tsx:7`).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1` to L183, L191, L203, L224; append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-2` to the range input at L164.
- **Notes:** —

### shard-018-F19 · should · high · buttons
- **Where:** `src/features/tracking/components/replay-transport.tsx:191` — `className="grid h-8 w-12 place-items-center rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90"`
- **Rule:** design-system §5.1 "`default` `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90`; `outline` `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`" and base "`rounded-md … transition-colors`" | §4 "10px `rounded-md` Button"
- **Current:** play is `rounded-lg … shadow`; restart (L183) and the inactive race toggle (L227) are `rounded-lg border bg-background hover:bg-muted`; none has `transition-colors`.
- **Expected:** Button radius `rounded-md`, `shadow-sm`, outline hover `hover:bg-accent hover:text-accent-foreground`, `transition-colors` (`src/shared/ui/button.tsx:7-17`).
- **Change:** `class-level` — L191 `rounded-lg … shadow` → `rounded-md … shadow-sm transition-colors`; L183 and L224 `rounded-lg` → `rounded-md`, add `shadow-sm transition-colors`; L183 and L227 `hover:bg-muted` → `hover:bg-accent hover:text-accent-foreground`.
- **Notes:** icons stay `h-3.5 w-3.5` because these are raw buttons; if a fixer swaps to `<Button size="icon" className="h-8 w-8">` (structural) the icons become 16px by rule (§5.1).

### shard-018-F20 · should · high · colour
- **Where:** `src/features/tracking/components/replay-transport.tsx:205` — `? 'border-primary/50 bg-primary/10 text-primary'`
- **Rule:** design-system §14 C-C1 "→ Ruling: `bg-primary/10 text-primary` (+ `border-primary` on tiles)" | §4 "selected `border-primary bg-primary/10 text-primary`"
- **Current:** selected speed chip border is `border-primary/50`; inactive chips `hover:bg-muted`.
- **Expected:** `border-primary bg-primary/10 text-primary` (`src/pages/dashboard/dashboard.tsx:737`); chrome hover `hover:bg-accent`.
- **Change:** `class-level` — L205 `border-primary/50` → `border-primary`; L206 `hover:bg-muted` → `hover:bg-accent hover:text-accent-foreground`; add `transition-colors` to the base at L203.
- **Notes:** `aria-pressed` is already present (C-B4 ✓).

### shard-018-F21 · should · high · type
- **Where:** `src/features/tracking/components/replay-transport.tsx:236` — `'rounded-md px-2 py-1 font-mono text-[10.5px] font-bold tabular-nums',`
- **Rule:** design-system §2 "**700 is never used** in the reference (and Plex Mono isn't loaded above 600)"
- **Current:** `font-bold` mono delta chip.
- **Expected:** `font-semibold` (§2 weight ceiling; chips are `font-medium`, §5.3).
- **Change:** `class-level` — `font-bold` → `font-semibold`.
- **Notes:** —

### shard-018-F22 · should · medium · i18n
- **Where:** `src/features/tracking/components/replay-transport.tsx:24` — `const timeFmt = new Intl.DateTimeFormat('en-GB', {`
- **Rule:** design-system §2 "The scope bar/calendar use `Intl.DateTimeFormat` with `ar-EG`/`en-GB` and `timeZone: 'Africa/Cairo'`" | §9 "Language: `i18n.changeLanguage` …"
- **Current:** clock readouts are hard-locked to `en-GB` regardless of the active language.
- **Expected:** locale chosen from `i18n.language` (`ar-EG` when it starts with `ar`, else `en-GB`) as `range-picker.tsx:52` already does and as the reference calendar does (`src/shared/ui/cairo-range-calendar.tsx`).
- **Change:** `class-level` (additive) — build the formatter inside the component from `i18n.language` (memoised), keeping `timeZone: 'Africa/Cairo'` and `hour12: false`.
- **Notes:** `time-deck.tsx:54,71`, `vehicle-card.tsx:11` and `tracking-map.tsx:102` have the same hard-coded locale (F43, F57, F63). If the owner prefers Latin digits on the scrubber, add `numberingSystem: 'latn'` rather than pinning the locale.

### shard-018-F23 · should · high · i18n
- **Where:** `src/features/tracking/components/replay-transport.tsx:36` — `const span = h > 0 ? \`${h}h ${m}m\` : \`${m}m\`;`
- **Rule:** design-system §9 "Copy, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)"
- **Current:** the `h`/`m` unit suffixes in `fmtDelta` are hard-coded English.
- **Expected:** unit strings from `t()` (e.g. `t('tracking.unit.h', 'h')`, `t('tracking.unit.m', 'm')`).
- **Change:** `class-level` (additive) — pass `t` into `fmtDelta` (or move it inside the component) and read the suffixes via `t()`; add keys to `en.json`/`ar.json` (`out-of-shard: src/shared/i18n/en.json, ar.json`).
- **Notes:** `time-deck.tsx:66,596,652` has the same pattern (F42).

### shard-018-F24 · should · medium · rtl
- **Where:** `src/features/tracking/components/replay-transport.tsx:166` — `background: \`linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%)\`,`
- **Rule:** design-system §9 "Logical properties for RTL … Rule C-I1: no physical `ml-/mr-/left-/right-` utilities" | §14 C-I1 "logical utilities everywhere"
- **Current:** the progress fill is painted `to right`; in RTL the native range thumb moves from the right while the fill still grows from the left.
- **Expected:** direction-aware fill.
- **Change:** `class-level` — `to right` → `to inline-end` is not supported by browsers; use `linear-gradient(to right, …)` only under `dir="ltr"` on the input (add `dir="ltr"` to the `<input type="range">` so thumb and fill agree, as `range-picker.tsx:142` does for its clock digits) — additive attribute.
- **Notes:** same at `time-deck.tsx:202` (F47).

### shard-018-F25 · nit · medium · spacing
- **Where:** `src/features/tracking/components/replay-transport.tsx:137` — `<div className={cn('space-y-2 p-2.5', className)}>`
- **Rule:** design-system §1 "**12px** … panel body padding" | §10 "Panel … div.p-3"
- **Current:** `p-2.5` body.
- **Expected:** `p-3` (`src/pages/dashboard/dashboard.tsx:146`).
- **Change:** `class-level` — `p-2.5` → `p-3`.
- **Notes:** the host dialog can still override through `className`.

### shard-018-F26 · blocker · high · colour
- **Where:** `src/features/tracking/components/status-chips.tsx:59` — `? 'border-transparent text-white'`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … 10% tint + 40% border + full-strength text; never a solid status fill" | §5.3 "ConnectionBadge `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium` + state tint" | §2 "Arabic text is always sans"
- **Current:** the active chip is a solid `STATUS_COLOR` fill (inline style) with hard-coded `text-white` and a white dot; all chips are `font-mono font-semibold px-2 sm:px-2.5`.
- **Expected:** status pill recipe: sans `font-medium px-2.5 py-1 text-[11px]`, active state as a 10% tint + 40% border + full-strength text (`src/pages/dashboard/dashboard.tsx:216-249`, `src/shared/ui/badge.tsx:5-20`).
- **Change:** `class-level` — L57 drop `font-mono`, `font-semibold` → `font-medium`, `px-2 … sm:px-2.5` → `px-2.5`; L59 `border-transparent text-white` → tint recipe via inline style (`style={{ borderColor: color+'66', background: color+'1a', color }}` where `color = STATUS_COLOR[g]`) instead of the solid `background`; L66 dot keeps `STATUS_COLOR[g]` in both states (remove the `'#fff'` branch); L69 active count `opacity-90` → `opacity-70` (§3 "secondary parts of an already-coloured element fade by opacity").
- **Notes:** the hue source itself is `out-of-shard: src/features/tracking/schemas.ts` (`STATUS_COLOR` hex map); `STATUS_STYLES` in `dashboard.tsx:669-676` is the token-based reference map for the same statuses.

### shard-018-F27 · blocker · high · colour
- **Where:** `src/features/tracking/components/status-chips.tsx:65` — `className="h-2 w-2 rounded-full"`
- **Rule:** design-system §14 C-C8 "→ Ruling: 6px (`h-1.5 w-1.5`)"
- **Current:** 8px dot.
- **Expected:** `h-1.5 w-1.5 rounded-full` (`src/pages/dashboard/dashboard.tsx:226`).
- **Change:** `class-level` — `h-2 w-2` → `h-1.5 w-1.5`; add `aria-hidden="true"`.
- **Notes:** —

### shard-018-F28 · blocker · high · focus
- **Where:** `src/features/tracking/components/status-chips.tsx:57` — `'flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[11px] font-semibold shadow-sm backdrop-blur transition-colors sm:px-2.5',`
- **Rule:** design-system §4 "Focus ring … on every interactive element (C-B1)" | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** chip buttons have no focus-visible style.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1`.
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1`.
- **Notes:** —

### shard-018-F29 · nit · medium · a11y
- **Where:** `src/features/tracking/components/vehicle-card.tsx:42` — `<span className="h-2.5 w-2.5 rounded-full"`
- **Rule:** design-system §9 "ARIA: … `aria-hidden` on dots/chevrons/severity bars/sentinel" | vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** decorative status dots and lucide icons next to text carry no `aria-hidden`: `vehicle-card.tsx:42`, `fleet-panel.tsx:134`, `status-chips.tsx:64`, `time-deck.tsx:131,579,634`, plus the in-button icons that sit beside a visible label (`vehicle-card.tsx:81,89`, `replay-transport.tsx:230`).
- **Expected:** `aria-hidden="true"` on the dot spans and labelled-button icons (`src/pages/dashboard/dashboard.tsx:756`).
- **Change:** `class-level` (additive attribute) — add `aria-hidden="true"` at each listed line.
- **Notes:** icon-only buttons that already have `aria-label` do not need the attribute on the icon, but it is harmless.

### shard-018-F30 · blocker · high · i18n
- **Where:** `src/features/tracking/components/time-deck.tsx:199` — `aria-label="scrub"`
- **Rule:** design-system §14 C-I4 "→ Ruling: all aria/sr-only strings through `t()`"
- **Current:** hard-coded English (and lowercase) accessible name on the scrubber.
- **Expected:** `aria-label={t('tracking.scrub', 'Playback position')}` — the key already exists and is used by `replay-transport.tsx:163`.
- **Change:** `class-level` — `aria-label="scrub"` → `aria-label={t('tracking.scrub', 'Playback position')}`.
- **Notes:** `t` is already in scope in `ScrubRow`.

### shard-018-F31 · blocker · high · radius
- **Where:** `src/features/tracking/components/time-deck.tsx:284` — `className="pointer-events-auto w-full rounded-t-2xl border border-b-0 bg-card/95 shadow-2xl backdrop-blur md:mx-auto md:max-w-3xl"`
- **Rule:** design-system §14 C-R1 "token family: `rounded-lg` everywhere; `rounded-xl` retired" | §4 "`shadow-lg` on Dialog, CommandDialog, Sheet"
- **Current:** `rounded-t-2xl shadow-2xl`.
- **Expected:** `rounded-t-lg shadow-lg` (token radius; Sheet depth, `src/shared/ui/sheet.tsx:30`).
- **Change:** `class-level` — `rounded-t-2xl` → `rounded-t-lg`; `shadow-2xl` → `shadow-lg`.
- **Notes:** keeps it identical to the range picker after F10/F11.

### shard-018-F32 · blocker · high · colour
- **Where:** `src/features/tracking/components/time-deck.tsx:186` — `className="absolute top-0 h-2 w-[3px] rounded-sm bg-amber-500/80"`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't" | §3 "Warning `bg-warning`"
- **Current:** stop ticks in Tailwind amber.
- **Expected:** `bg-warning/80`.
- **Change:** `class-level` — `bg-amber-500/80` → `bg-warning/80`.
- **Notes:** mirrors F16.

### shard-018-F33 · blocker · high · colour
- **Where:** `src/features/tracking/components/time-deck.tsx:322` — `className="shrink-0 rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-amber-600"`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't" | §5.3 "Badge primitive … `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium`; status variants `border-X/40 bg-X/10 text-X` (C-T3)"
- **Current:** "beyond range" pill in amber, mono, 9px, semibold, `px-2 py-0.5`.
- **Expected:** warning status pill `rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning` (`src/shared/ui/badge.tsx`, `dashboard.tsx:221`).
- **Change:** `class-level` — `border-amber-500/50 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-amber-600` → `border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning`.
- **Notes:** the `‹ … ›` glyphs are untranslated punctuation; keep.

### shard-018-F34 · blocker · high · colour
- **Where:** `src/features/tracking/components/time-deck.tsx:427` — `? 'border-amber-500/50 bg-amber-500/10 text-amber-600'`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't" | §14 C-C1 "selected … `bg-primary/10 text-primary` (+ `border-primary`)"
- **Current:** the Stops toggle's pressed state is amber.
- **Expected:** pressed toggles take the selected wash `border-primary bg-primary/10 text-primary` (fleet tile `src/pages/dashboard/dashboard.tsx:737`); the toggles at L413 (follow) and L455 (places) already use the primary wash.
- **Change:** `class-level` — `border-amber-500/50 bg-amber-500/10 text-amber-600` → `border-primary bg-primary/10 text-primary`.
- **Notes:** if the owner wants the stop-tick hue echoed on the toggle, the token version is `border-warning/40 bg-warning/10 text-warning`; either is token-based.

### shard-018-F35 · blocker · high · colour
- **Where:** `src/features/tracking/components/time-deck.tsx:469` — `? 'border-violet-500/50 bg-violet-500/10 text-violet-600'`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't" | §14 C-C1 "selected … `bg-primary/10 text-primary`"
- **Current:** the Legs toggle's pressed state is violet — a fourth hue.
- **Expected:** `border-primary bg-primary/10 text-primary`.
- **Change:** `class-level` — `border-violet-500/50 bg-violet-500/10 text-violet-600` → `border-primary bg-primary/10 text-primary`.
- **Notes:** —

### shard-018-F36 · blocker · high · motion
- **Where:** `src/features/tracking/components/time-deck.tsx:297` — `d.status === 'pending' && 'animate-pulse bg-muted',`
- **Rule:** design-system §14 C-M2 "→ Ruling: `motion-reduce:animate-none` on the Skeleton primitive" | §8 "`animate-pulse` … both with `motion-reduce:animate-none` (C-M2)" | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** the pending day segment pulses with no reduced-motion guard.
- **Expected:** `animate-pulse bg-muted motion-reduce:animate-none` (`src/shared/ui/skeleton.tsx`).
- **Change:** `class-level` — `'animate-pulse bg-muted'` → `'animate-pulse bg-muted motion-reduce:animate-none'`.
- **Notes:** —

### shard-018-F37 · blocker · high · focus
- **Where:** `src/features/tracking/components/time-deck.tsx:332` — `className="ms-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"`
- **Rule:** design-system §4 "Focus ring … on every interactive element (C-B1)" | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** no focus-visible ring on any control in the deck: exit L332, restart L353, prev/next leg L363/L371, play L381, speed chips L393, the five toggles L411/L425/L439/L453/L467, the trip header button L576, the trip lock button L605, the leg cards L627, and the range input L200.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (+ `ring-offset-1` on buttons; the trip lock button sits inside an `overflow-hidden` wrapper at L559 so it takes `ring-inset`, §4).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1` at L332, L353, L363, L371, L381, L393, L411, L425, L439, L453, L467, L576, L627; `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-inset` at L605; `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-2` on the range input at L200.
- **Notes:** —

### shard-018-F38 · should · high · states
- **Where:** `src/features/tracking/components/time-deck.tsx:493` — `<p className="py-1 text-center text-xs text-muted-foreground">`
- **Rule:** design-system §14 C-S3 "→ Ruling: one recipe `py-6 text-center text-xs text-muted-foreground`" | §7 "Loading is always the `Skeleton` primitive shaped like the slot" | §7 "Apex error … `py-6 text-center text-xs text-muted-foreground` 'unavailable'"
- **Current:** loading (L493), error (L497, `text-destructive`) and empty (L501) copy use `py-1`; the error is red; loading is a sentence instead of a skeleton.
- **Expected:** empty/error `py-6 text-center text-xs text-muted-foreground` (`src/pages/dashboard/dashboard.tsx:171,180`); loading = `Skeleton` shaped like the scrub row + transport row.
- **Change:** `class-level` for L497/L501 — `py-1` → `py-6`, and L497 `text-destructive` → `text-muted-foreground`; `structural` for L493 — replace the loading `<p>` with `<div className="space-y-2"><Skeleton className="h-3.5 w-2/3 rounded-sm" /><Skeleton className="h-8 w-full rounded-md" /></div>` (import from `@/shared/ui/skeleton`). Keep the `history.isLoading` branch.
- **Notes:** the deck is a compact dock; if `py-6` is judged too tall here, `py-3` is the nearest ladder step — say so in the fix note rather than keeping `py-1`.

### shard-018-F39 · should · high · buttons
- **Where:** `src/features/tracking/components/time-deck.tsx:353` — `className="grid h-8 w-8 place-items-center rounded-lg border bg-background hover:bg-muted"`
- **Rule:** design-system §5.1 "cva base … `rounded-md … transition-colors`"; "`outline` `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`"; "`default` `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90`" | §14 C-C4 "`hover:bg-accent` on chrome"
- **Current:** every square control (L353, L363, L371, L411-414, L425-428, L439-442, L453-456, L467-470) is `rounded-lg … hover:bg-muted`, play (L381) is `rounded-lg … shadow`; no `transition-colors`.
- **Expected:** `rounded-md shadow-sm transition-colors`, outline hover `hover:bg-accent hover:text-accent-foreground`, filled `shadow-sm` (`src/shared/ui/button.tsx:7-17`).
- **Change:** `class-level` — at each listed line `rounded-lg` → `rounded-md`, add `shadow-sm transition-colors`; `hover:bg-muted` → `hover:bg-accent hover:text-accent-foreground`; L381 `shadow` → `shadow-sm`. Speed chips (L393-396): add `transition-colors`, `hover:bg-muted` → `hover:bg-accent hover:text-accent-foreground`.
- **Notes:** `replay-transport.tsx` gets the same treatment in F19.

### shard-018-F40 · should · high · colour
- **Where:** `src/features/tracking/components/time-deck.tsx:395` — `? 'border-primary/50 bg-primary/10 text-primary'`
- **Rule:** design-system §14 C-C1 "→ Ruling: `bg-primary/10 text-primary` (+ `border-primary` on tiles)"
- **Current:** pressed states at L395, L413, L455 use `border-primary/50`; the Ignitions toggle at L441 uses a neutral `border-muted-foreground/40 bg-muted text-foreground` for its pressed state.
- **Expected:** one selected wash `border-primary bg-primary/10 text-primary` (`src/pages/dashboard/dashboard.tsx:737`).
- **Change:** `class-level` — L395, L413, L455 `border-primary/50` → `border-primary`; L441 `border-muted-foreground/40 bg-muted text-foreground` → `border-primary bg-primary/10 text-primary`.
- **Notes:** with F34/F35 all five toggles then share one pressed recipe.

### shard-018-F41 · should · high · type
- **Where:** `src/features/tracking/components/time-deck.tsx:143` — `'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums',`
- **Rule:** design-system §2 "**700 is never used** in the reference (and Plex Mono isn't loaded above 600)"
- **Current:** `font-bold` on the speed readout (L143), the trip chip title (L578) and the leg card title (L633).
- **Expected:** `font-semibold`.
- **Change:** `class-level` — `font-bold` → `font-semibold` at L143, L578, L633.
- **Notes:** —

### shard-018-F42 · should · high · i18n
- **Where:** `src/features/tracking/components/time-deck.tsx:66` — `return h > 0 ? \`${h}h ${m}m\` : \`${m}m\`;`
- **Rule:** design-system §9 "Copy … all go through `t()` with `defaultValue` fallbacks (C-I4)"
- **Current:** hard-coded English units: `fmtSecs` (`h`, `m`, `0m` at L63-66), ` km` at L596 and L652 (while L311 correctly uses `t('tracking.km')`).
- **Expected:** `t('tracking.km', 'km')` for the km suffix; `t()`-sourced `h`/`m` unit strings.
- **Change:** `class-level` (additive) — L596/L652: `` ` · ${…} km` `` → `` ` · ${…} ${t('tracking.km', 'km')}` ``; pass `t` into `fmtSecs` (or inline it) and read `t('tracking.unit.h', 'h')` / `t('tracking.unit.m', 'm')`; new keys `out-of-shard: src/shared/i18n/en.json, ar.json`.
- **Notes:** —

### shard-018-F43 · should · medium · i18n
- **Where:** `src/features/tracking/components/time-deck.tsx:54` — `const timeFmt = new Intl.DateTimeFormat('en-GB', {`
- **Rule:** design-system §2 "The scope bar/calendar use `Intl.DateTimeFormat` with `ar-EG`/`en-GB` and `timeZone: 'Africa/Cairo'`"
- **Current:** `timeFmt` (L54) and `fullFmt` (L71) are pinned to `en-GB`.
- **Expected:** locale from `i18n.language` as in `range-picker.tsx:52`.
- **Change:** `class-level` (additive) — derive the locale inside `ScrubRow`/`LegRail` from `useTranslation().i18n.language` and memoise the two formatters.
- **Notes:** see F22.

### shard-018-F44 · nit · medium · colour
- **Where:** `src/features/tracking/components/time-deck.tsx:332` — `hover:bg-destructive/15 hover:text-destructive`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … 10% tint"
- **Current:** 15% destructive wash on the exit button hover.
- **Expected:** 10% (`bg-destructive/10`) — the only status alpha the reference uses.
- **Change:** `class-level` — `hover:bg-destructive/15` → `hover:bg-destructive/10`.
- **Notes:** —

### shard-018-F45 · nit · medium · type
- **Where:** `src/features/tracking/components/time-deck.tsx:128` — `className="flex min-w-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold"`
- **Rule:** design-system §5.3 "Method chip `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium`" | §14 C-T3 "neutral chips are `px-2 py-0.5 text-[10.5px] font-medium`"
- **Current:** current-leg chip is `text-[10px] font-semibold`.
- **Expected:** chip size/weight `text-[10.5px] font-medium`.
- **Change:** `class-level` — `text-[10px] font-semibold` → `text-[10.5px] font-medium`.
- **Notes:** the border colour comes from the leg's map hue via inline style — map-derived identity colour, not flagged.

### shard-018-F46 · should · medium · a11y
- **Where:** `src/features/tracking/components/time-deck.tsx:409` — `title={t('tracking.follow', 'Follow the truck')}`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`" | design-system §9 "native `title` for compressed context"
- **Current:** the five icon-only toggles (L409, L423, L437, L451, L465) and the trip-lock button (L603) rely on `title` alone for their accessible name.
- **Expected:** `aria-label` (translated) on icon-only buttons, `title` kept as the hover hint (`src/widgets/sidebar/sidebar.tsx:234` pattern).
- **Change:** `class-level` (additive attribute) — add `aria-label={t(...)}` with the same key as the `title` at each listed line.
- **Notes:** —

### shard-018-F47 · should · medium · rtl
- **Where:** `src/features/tracking/components/time-deck.tsx:202` — `background: \`linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%)\`,`
- **Rule:** design-system §9 "Logical properties for RTL … Rule C-I1: no physical … utilities" | §14 C-I1
- **Current:** physical `to right` fill under a native range input that mirrors in RTL.
- **Expected:** thumb and fill agree in both directions.
- **Change:** `class-level` (additive attribute) — add `dir="ltr"` to the `<input type="range">` at L192 so the physical gradient and the thumb share one direction (the leg bands and stop ticks at L169/L187 already use `insetInlineStart`, so they would need to stay logical — alternatively compute the gradient direction from `document.dir` and drop `dir="ltr"`).
- **Notes:** —

### shard-018-F48 · nit · medium · spacing
- **Where:** `src/features/tracking/components/time-deck.tsx:286` — `<div className="flex items-center gap-3 border-b px-3 py-1.5">`
- **Rule:** design-system §6 "Panel head: `h2 class="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 …"`" | §1 "8px … PanelHead vertical pad"
- **Current:** head strip `px-3 py-1.5`, no tint; body at L338 is `px-3 py-2.5`.
- **Expected:** head `px-3 py-2 bg-muted/60`, body `p-3` (`src/pages/dashboard/dashboard.tsx:1001`, `:146`).
- **Change:** `class-level` — L286 `py-1.5` → `py-2`, add `bg-muted/60`; L338 `px-3 py-2.5` → `p-3`.
- **Notes:** —

### shard-018-F49 · should · medium · colour
- **Where:** `src/features/tracking/components/time-deck.tsx:560` — `tripActive ? 'border-transparent text-white' : 'bg-background',`
- **Rule:** design-system §3 "never a solid status fill" | §3 "Non-token colours in the reference: the two scrims and `theme-color`"
- **Current:** the locked trip chip (L560/L563) and locked leg card (L628/L631) fill solid with the trip hue and hard-coded `text-white` / `#fff` dots (L581, L636); inner text uses `text-white/80`.
- **Expected:** the tint recipe used for every selected/status surface: 10% background + 40–50% border in the same hue, full-strength text — no white-on-fill.
- **Change:** `class-level` — replace the solid `background` inline style with `{ background: \`rgb(${r} ${g} ${b} / .12)\`, borderColor: \`rgb(${r} ${g} ${b} / .5)\`, color: \`rgb(${r} ${g} ${b})\` }` at L563 and L631; drop `text-white` at L560/L628 and the `text-white/80` branches at L584/L592/L647 (use `text-muted-foreground`); dots at L581/L636 keep the hue in both states.
- **Notes:** the trip hues themselves are map identity colours (chart/map exception) and are not flagged; only the solid-fill treatment and the hard-coded white are. Check contrast of the hue at full strength on `bg-background` in dark mode.

### shard-018-F50 · blocker · high · radius
- **Where:** `src/features/tracking/components/vehicle-card.tsx:38` — `<div className="pointer-events-auto w-[260px] rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur">`
- **Rule:** design-system §14 C-R1 "→ Ruling: token family: `rounded-lg` everywhere; `rounded-xl` retired"
- **Current:** `rounded-xl`.
- **Expected:** `rounded-lg` (all cards, `src/pages/dashboard/dashboard.tsx:135`).
- **Change:** `class-level` — `rounded-xl` → `rounded-lg`.
- **Notes:** —

### shard-018-F51 · should · high · shadow
- **Where:** `src/features/tracking/components/vehicle-card.tsx:38` — `shadow-xl backdrop-blur`
- **Rule:** design-system §4 "`shadow-md` on every floating menu (Popover …); `shadow-lg` on Dialog, CommandDialog, Sheet"
- **Current:** `shadow-xl` on a floating card.
- **Expected:** floating layer depth `shadow-md` (Popover, `src/shared/ui/popover.tsx:22`).
- **Change:** `class-level` — `shadow-xl` → `shadow-md`.
- **Notes:** —

### shard-018-F52 · blocker · high · colour
- **Where:** `src/features/tracking/components/vehicle-card.tsx:43` — `className="h-2.5 w-2.5 rounded-full"`
- **Rule:** design-system §14 C-C8 "→ Ruling: 6px (`h-1.5 w-1.5`)"
- **Current:** 10px dot.
- **Expected:** `h-1.5 w-1.5 rounded-full`.
- **Change:** `class-level` — `h-2.5 w-2.5` → `h-1.5 w-1.5`; add `aria-hidden="true"`.
- **Notes:** —

### shard-018-F53 · blocker · high · focus
- **Where:** `src/features/tracking/components/vehicle-card.tsx:69` — `className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"`
- **Rule:** design-system §4 "Focus ring … on every interactive element (C-B1)" | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** close (L69), Focus (L79) and Replay (L87) buttons have no focus-visible ring.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1`.
- **Change:** `class-level` — append the ring classes at L69, L79, L87; L69 `hover:bg-muted` → `hover:bg-accent hover:text-accent-foreground` (C-C4 chrome hover).
- **Notes:** —

### shard-018-F54 · should · high · type
- **Where:** `src/features/tracking/components/vehicle-card.tsx:46` — `<span className="font-mono text-lg font-bold tabular-nums">`
- **Rule:** design-system §2 "**700 is never used**" | §14 C-T5 "four-step figure scale (22 KPI › 18 count › 17 tile › 15 drawer)" | §2 "17 `text-[17px]` 600, `leading-tight`, mono — Fleet tile plate"
- **Current:** plate digits `text-lg font-bold` (18px/700).
- **Expected:** the plate headline step `text-[17px] font-semibold leading-tight` (`src/pages/dashboard/dashboard.tsx:744`).
- **Change:** `class-level` — `text-lg font-bold` → `text-[17px] font-semibold leading-tight`.
- **Notes:** —

### shard-018-F55 · should · high · colour
- **Where:** `src/features/tracking/components/vehicle-card.tsx:60` — `<p className="font-mono text-[10px] text-muted-foreground/80 tabular-nums">`
- **Rule:** design-system §14 C-C5 "→ Ruling: `text-muted-foreground` for secondary *text*; opacity only for secondary parts of an already-coloured element"
- **Current:** `text-muted-foreground/80`.
- **Expected:** `text-muted-foreground` (truck-drawer date, `src/pages/dashboard/dashboard.tsx:855`, `text-[10.5px]`).
- **Change:** `class-level` — `text-[10px] text-muted-foreground/80` → `text-[10.5px] text-muted-foreground`.
- **Notes:** —

### shard-018-F56 · should · high · buttons
- **Where:** `src/features/tracking/components/vehicle-card.tsx:79` — `className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border bg-background text-xs font-medium hover:bg-muted"`
- **Rule:** design-system §5.1 "`outline` `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`; `default` `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90`; base `rounded-md text-sm font-medium transition-colors`; `sm` h-8 px-3 text-xs"
- **Current:** Focus is `rounded-lg border bg-background hover:bg-muted`; Replay (L87) is `rounded-lg bg-primary text-xs font-semibold shadow`.
- **Expected:** the Button primitive at `size="sm"` (`h-8 text-xs rounded-md`), outline + default variants (`src/shared/ui/button.tsx`; DegradedStrip retry `dashboard.tsx:1041`).
- **Change:** `structural` — `<Button variant="outline" size="sm" className="flex-1 gap-1.5">` and `<Button size="sm" className="flex-1 gap-1.5">` from `@/shared/ui/button`, keeping `onClick`; drop the per-icon `h-3.5 w-3.5` (icons become 16px by rule §5.1). `class-level` fallback if the primitive is not used: `rounded-lg` → `rounded-md`, add `shadow-sm transition-colors`, `hover:bg-muted` → `hover:bg-accent hover:text-accent-foreground`, L87 `font-semibold shadow` → `font-medium shadow-sm`.
- **Notes:** —

### shard-018-F57 · should · medium · i18n
- **Where:** `src/features/tracking/components/vehicle-card.tsx:11` — `const tsFmt = new Intl.DateTimeFormat('en-GB', {`
- **Rule:** design-system §2 "The scope bar/calendar use `Intl.DateTimeFormat` with `ar-EG`/`en-GB` and `timeZone: 'Africa/Cairo'`"
- **Current:** last-seen timestamp locked to `en-GB`.
- **Expected:** locale from `i18n.language`.
- **Change:** `class-level` (additive) — build the formatter from `useTranslation().i18n.language` (memoised) as in `range-picker.tsx:52,67-75`.
- **Notes:** see F22.

### shard-018-F58 · should · high · type
- **Where:** `src/features/tracking/map/tracking-map.tsx:123` — `\`<div dir="auto" style="font:12px system-ui;display:grid;gap:3px;min-width:150px;max-width:250px;\` +`
- **Rule:** design-system §0.1 "Sans (everything) `'IBM Plex Sans Arabic', 'IBM Plex Sans', system-ui, sans-serif`"; "Mono (figures) `'IBM Plex Mono', ui-monospace, monospace` … weights 400/500/600 only" | §2 "700 is never used"
- **Current:** the InfoWindow tooltip sets `font:12px system-ui`, the title `font-weight:700` (L126), and the plate `font:700 14px ui-monospace,monospace` (L147).
- **Expected:** Plex families and weight ≤ 600.
- **Change:** `class-level` (string edit) — L123 `font:12px system-ui` → `font:12px 'IBM Plex Sans Arabic','IBM Plex Sans',system-ui,sans-serif`; L126 `font-weight:700` → `font-weight:600`; L147 `font:700 14px ui-monospace,monospace` → `font:600 14px 'IBM Plex Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums`.
- **Notes:** the InfoWindow is a Google-owned DOM node, so Tailwind classes do not apply; inline styles are the only channel.

### shard-018-F59 · should · high · colour
- **Where:** `src/features/tracking/map/tracking-map.tsx:129` — `\`border:1px solid #d6d9e0;color:#1f3a5f;text-decoration:none;background:#fff">\` +`
- **Rule:** design-system §3 "No hex/rgb in any dashboard or shell TSX" | §0.2 "used as `hsl(var(--x))`" | §3 "Hairlines … `--border`", "Labels … `text-muted-foreground`", "Warning `text-warning`"
- **Current:** tooltip chrome is hard-coded: `#d6d9e0` border, `#1f3a5f` link, `#fff` background (L129), `#6b7280` dim rows (L142), `#b45309` warning line (L210) — fixed light-mode colours that also ignore dark mode.
- **Expected:** token references, which resolve inside the map container because the CSS variables are on `:root`: `hsl(var(--border))`, `hsl(var(--primary))`, `hsl(var(--card))`, `hsl(var(--muted-foreground))`, `hsl(var(--warning))`.
- **Change:** `class-level` (string edit) — L129 `#d6d9e0` → `hsl(var(--border))`, `#1f3a5f` → `hsl(var(--primary))`, `#fff` → `hsl(var(--card))`; L142 `#6b7280` → `hsl(var(--muted-foreground))`; L210 `#b45309` → `hsl(var(--warning))`.
- **Notes:** marker artwork colours (L77 drop-shadow, L82 chip, L94 `#1d4ed8`) are map content and are not flagged. Google's InfoWindow shell background is still white by default; that is outside this file.

### shard-018-F60 · should · high · i18n
- **Where:** `src/features/tracking/map/tracking-map.tsx:223` — `const label = kind === 'route-start' ? 'Route start' : 'Route end';`
- **Rule:** design-system §9 "Copy, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)"
- **Current:** hard-coded English in tooltip HTML: `Route start`/`Route end` (L223), `⟷ continues beyond the loaded range` (L210), `km/h` (L150), `km` (L207), `h`/`m` in `fmtDwell` (L175), `title="Google Maps"` (L127, brand — acceptable with `translate="no"`).
- **Expected:** strings resolved through i18next.
- **Change:** `class-level` (additive) — import `i18n` from the app's i18n module (`out-of-shard: src/shared/i18n`) or pass a `t` function into the `*InfoHtml` builders, and use `t('tracking.routeStart', 'Route start')`, `t('tracking.routeEnd', 'Route end')`, `t('tracking.beyondRangeLine', 'continues beyond the loaded range')`, `t('tracking.kmh', 'km/h')`, `t('tracking.km', 'km')`; add keys to `en.json`/`ar.json` (`out-of-shard`). Add `translate="no"` to the Google Maps link (vercel-rules "Locale & i18n" bullet "Brand names … wrap with `translate="no"`").
- **Notes:** the builders are module-level functions; using `i18n.t` directly avoids threading `t` through the imperative handle.

### shard-018-F61 · should · medium · a11y
- **Where:** `src/features/tracking/map/tracking-map.tsx:127` — `\`<a href="${mapsUrl}" target="_blank" rel="noopener" title="Google Maps" \` +`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`" | "Focus States" bullet "Interactive elements need visible focus"
- **Current:** icon-only link with `title` only and no focus style (inline HTML cannot use Tailwind).
- **Expected:** `aria-label` and a visible focus ring.
- **Change:** `class-level` (string edit) — add `aria-label="Google Maps"` to the anchor and `outline:2px solid hsl(var(--ring));outline-offset:1px` via a `:focus-visible` rule — since inline styles cannot target `:focus-visible`, add a small global rule in `out-of-shard: src/app/index.css` (reference file — **do not edit**; report instead) or accept the browser default outline by not overriding it (currently nothing suppresses it, so the default outline shows — acceptable).
- **Notes:** the practical in-shard change is the `aria-label` only.

### shard-018-F62 · nit · medium · type
- **Where:** `src/features/tracking/map/tracking-map.tsx:83` — `'font:600 10px ui-monospace,monospace;letter-spacing:.03em;line-height:15px;' +`
- **Rule:** design-system §0.1 "Mono (figures) `'IBM Plex Mono', ui-monospace, monospace`"
- **Current:** the plate chip under each live marker uses `ui-monospace`.
- **Expected:** `'IBM Plex Mono',ui-monospace,monospace` (`tailwind.config.ts:17`).
- **Change:** `class-level` (string edit) — `font:600 10px ui-monospace,monospace` → `font:600 10px 'IBM Plex Mono',ui-monospace,monospace`.
- **Notes:** the chip's colours are map content (§3 exception) and are not flagged.

### shard-018-F63 · should · medium · i18n
- **Where:** `src/features/tracking/map/tracking-map.tsx:102` — `const infoTimeFmt = new Intl.DateTimeFormat('en-GB', {`
- **Rule:** design-system §2 "The scope bar/calendar use `Intl.DateTimeFormat` with `ar-EG`/`en-GB` and `timeZone: 'Africa/Cairo'`"
- **Current:** tooltip timestamps locked to `en-GB`.
- **Expected:** locale following the active language.
- **Change:** `class-level` (additive) — resolve the locale at call time from `document.documentElement.lang` or the i18n instance (`out-of-shard: src/shared/i18n`) and create the formatter lazily per locale (cache in a `Map`).
- **Notes:** see F22.

## Summary
Blockers cluster in four groups: missing focus rings on every raw button in the tracking chrome (F01, F12, F18, F28, F37, F53), non-token amber/emerald/violet hues on the transport and time-deck (F16, F17, F32–F35), retired `rounded-*xl` radii on the docks and vehicle card (F10, F31, F50), and the 6px status-dot ruling (F03, F27, F52). The remaining shoulds are mostly mechanical: Button recipe alignment (`rounded-md`, `shadow-sm`, `hover:bg-accent`), `font-bold` → `font-semibold`, hard-coded `en-GB` locales and English unit strings.

FINDINGS: 63 (blocker 23 / should 31 / nit 9)
