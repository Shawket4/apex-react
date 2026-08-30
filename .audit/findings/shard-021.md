# Findings — shard-021

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/trip-audit-detail-dialog/index.ts` | 1 | no UI content | re-export only |
| `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx` | 1275 | audited | no rule: map-layer hex colours (`#3b82f6`, `#16a34a`, `#f59e0b`, `#8b5cf6`, `#2563eb`, `#dc2626`) are map-only and §3 permits third hues in maps — not flagged; chip swatches echo them as a legend. No rule: 5-column summary grid (`lg:grid-cols-5`, the KPI rule covers 3/4 only). No rule: `←` arrow between order chips (physical glyph in RTL). No rule: interactive controls inside `DialogTitle`. No rule: `max-w-5xl` dialog width (provisional §12.6 lists up to `max-w-4xl`; width scales with content — left alone). |
| `src/widgets/trip-audit-matches-table/audit-format.tsx` | 56 | audited | `formatKm`/`formatDurationSecs` return the `—` string; the opacity treatment (F19) applies where they are rendered. |
| `src/widgets/trip-audit-matches-table/index.ts` | 6 | no UI content | re-export only |
| `src/widgets/trip-audit-queue/index.ts` | 1 | no UI content | re-export only |
| `src/widgets/trip-audit-queue/trip-audit-queue.tsx` | 260 | audited | No rule: unconditional `title={place}` (D-L6 is unruled). No rule: `cursor-pointer`, `tabIndex={-1}` on the inner Button (row is the focus target). No rule: `loading && 'opacity-60'` refetch dimming (no dashboard refetch idiom; the only opacity steps named are 70/50/40). |

## Findings

### shard-021-F01 · blocker · high · colour roles
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:713` — `previewed && 'border-emerald-600/50 bg-emerald-600/5'`
- **Rule:** design-system §0.2 palette comment "Two hues, one job each… Adding a third accent colour breaks the whole scheme, so don't." | §14 C-C1 "→ Ruling: `bg-primary/10 text-primary` (+ `border-primary` on tiles)" for selected state
- **Current:** selected (previewed) leg card uses raw Tailwind emerald at two alphas.
- **Expected:** the selected wash: `border-primary bg-primary/10 text-primary` (`dashboard.tsx:735-747` selected fleet tile; `sidebar.tsx:230`).
- **Change:** `class-level` — `border-emerald-600/50 bg-emerald-600/5` → `border-primary bg-primary/10`.
- **Notes:** the preview Button next to it already flips to `default` (navy), so navy on the card keeps one hue for "selected".

### shard-021-F02 · blocker · high · colour roles
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:870` — `'rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400'`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't." | §3 Success "`text-success`… passing status only" | §5.3 neutral chip recipe `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium`
- **Current:** "optimal" order chips use raw emerald with a manual `dark:` override; `rounded` (4px) tag.
- **Expected:** status tint recipe on tokens (`bg-success/10 text-success`, §3 "Status tint recipe"); chip shape `rounded-full px-2 py-0.5` (`dashboard.tsx:583`, `:637`).
- **Change:** `class-level` — `rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400` → `rounded-full bg-success/10 px-2 py-0.5 text-success`; the `muted` branch `rounded bg-muted px-1.5 py-0.5` → `rounded-full bg-muted px-2 py-0.5`.
- **Notes:** tokens carry their own dark values, so the `dark:` class is not needed.

### shard-021-F03 · blocker · high · colour roles
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:881` — `'space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-sm'`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't." | §3 Warning "`border-warning/40 bg-warning/10` (pill)… degraded / attention" | §4 C-R1 "token family: `rounded-lg` everywhere"
- **Current:** suboptimal-order well uses raw amber (`border-amber-500/40 bg-amber-500/5`), title `text-amber-700 dark:text-amber-400` (line 882), `rounded-md`.
- **Expected:** warning tint recipe `border-warning/40 bg-warning/10` + `text-warning` (`dashboard.tsx:1031` DegradedStrip, `:221` badge); wells are `rounded-lg` (`:841`).
- **Change:** `class-level` — line 881 `rounded-md border border-amber-500/40 bg-amber-500/5` → `rounded-lg border border-warning/40 bg-warning/10`; line 882 `text-amber-700 dark:text-amber-400` → `text-warning`.
- **Notes:** amber-500 is also visually close to `--money`; using the warning token keeps the "money = amber" association clean.

### shard-021-F04 · blocker · high · colour roles
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:907` — `'space-y-1 rounded-md border border-sky-500/40 bg-sky-500/5 p-2 text-sm'`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't." | §3 "Status tint recipe `border-X/40 bg-X/10 text-X`" | §4 C-R1 "`rounded-lg` everywhere"
- **Current:** bundling well uses raw sky blue; title `text-sky-700 dark:text-sky-400` (line 908); `rounded-md`.
- **Expected:** an informational tint on the primary token — the file already maps `info` severity to `text-primary` (line 127) — `border-primary/40 bg-primary/10` + `text-primary`; `rounded-lg`.
- **Change:** `class-level` — line 907 `rounded-md border border-sky-500/40 bg-sky-500/5` → `rounded-lg border border-primary/40 bg-primary/10`; line 908 `text-sky-700 dark:text-sky-400` → `text-primary`.
- **Notes:** if the fixer prefers a neutral well, `rounded-lg border bg-muted/40` (§3 "Sub-surface tint… wells") is the other token-only option.

### shard-021-F05 · blocker · high · colour roles
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:969` — `'flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400'`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't." | §3 Success "`text-success`… passing status only"
- **Current:** "order verified" line in raw emerald with a `dark:` override.
- **Expected:** `text-success` (`dashboard.tsx:216-249` live badge; the same file uses `text-success` at line 1051).
- **Change:** `class-level` — `text-emerald-700 dark:text-emerald-400` → `text-success`.
- **Notes:** —

### shard-021-F06 · blocker · high · buttons & controls / focus
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:369` — `'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors'`
- **Rule:** design-system §14 C-B1 "→ Ruling: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere" | vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"
- **Current:** `LayerChip` is a raw `<button>` with no focus-visible ring.
- **Expected:** every interactive element carries the ring (`dashboard.tsx:735` fleet tile button, `:940` exception row).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the base class string.
- **Notes:** the chip sits inside the dialog's scroll body (not `overflow-hidden`), so an outset ring is fine.

### shard-021-F07 · should · high · colour roles
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:371` — `'border-primary/50 bg-primary/5 text-foreground'`
- **Rule:** design-system §14 C-C1 "→ Ruling: `bg-primary/10 text-primary` (+ `border-primary` on tiles)" | §14 C-C5 "`text-muted-foreground` for secondary *text*; opacity only for secondary parts of an already-coloured element" | §5.3 status pill `text-[11px]`
- **Current:** active chip `border-primary/50 bg-primary/5 text-foreground`; inactive `text-muted-foreground opacity-60 hover:opacity-100`; label `text-xs`.
- **Expected:** selected wash `border-primary bg-primary/10 text-primary` (`dashboard.tsx:735-747`); inactive stays `text-muted-foreground` with the chrome hover `hover:bg-accent hover:text-accent-foreground` (`button.tsx:18`, C-C4) and no opacity; pill text `text-[11px]` (`badge.tsx:6`).
- **Change:** `class-level` — line 369 `text-xs` → `text-[11px]`; line 371 → `'border-primary bg-primary/10 text-primary'`; line 372 `'border-border bg-card text-muted-foreground opacity-60 hover:opacity-100'` → `'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'`.
- **Notes:** the swatch spans keep their inline map colours (legend, no rule).

### shard-021-F08 · blocker · high · buttons & controls
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:757` — `variant={previewed ? 'default' : 'outline'}`
- **Rule:** design-system §14 C-B4 "→ Ruling: `aria-pressed` for toggles (tiles, presets), `aria-expanded` for disclosure"
- **Current:** the Preview/Previewing button toggles by variant swap (`onPreview` flips `previewLeg` on/off, line 1237) with no aria state.
- **Expected:** `aria-pressed={previewed}` as on scope presets (`scope-date-picker.tsx:132-136`) and tiles (`dashboard.tsx:733`).
- **Change:** `class-level` (attribute add) — add `aria-pressed={previewed}` to the `<Button>` at line 755.
- **Notes:** —

### shard-021-F09 · blocker · high · a11y
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:127` — `info: <Info className="h-4 w-4 shrink-0 text-primary" />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`" | design-system §9 "`aria-hidden` on dots/chevrons/severity bars/sentinel"
- **Current:** decorative icons carry no `aria-hidden`: `SEVERITY_ICON` (lines 127-129), `Loader2` (647, 1090, 1177), `CheckCircle2` (970, 1051, 1092), `Route` (762), `Play` (1158). The severity icons duplicate the adjacent severity `Badge` text, so they are decorative.
- **Expected:** `aria-hidden` on decorative glyphs (`dashboard.tsx:424`, `:756`).
- **Change:** `class-level` (attribute add) — add `aria-hidden="true"` to each listed icon.
- **Notes:** the `Moon` icon at line 732 carries an `aria-label` and is the only meaningful glyph — leave it.

### shard-021-F10 · should · high · loading states
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:1176` — `<div className="flex h-64 items-center justify-center text-muted-foreground">` + `Loader2 h-6 w-6 animate-spin`
- **Rule:** design-system §7 "Loading is always the `Skeleton` primitive shaped like the slot" | §13 row D-ST4 | §14 C-M2 "`motion-reduce:animate-none`"
- **Current:** centred spinner while the match loads; no reduced-motion guard.
- **Expected:** slot-shaped skeletons: map slot `Skeleton h-[380px] rounded-lg`, summary `grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5` of `Skeleton h-[60px] rounded-lg` (`dashboard.tsx:123-128`, `:162`, `:174-179`).
- **Change:** `structural` — replace the spinner block with a `space-y-3` of `Skeleton` boxes as above (import `Skeleton` from `@/shared/ui/skeleton`). If the spinner is kept, `class-level`: add `motion-reduce:animate-none` to the `Loader2` at lines 647, 1090 and 1177.
- **Notes:** the button spinner (1090) and the "Loading GPS trace…" indicator (647) match provisional §12.6 spinners; only the reduced-motion guard is missing there.

### shard-021-F11 · should · high · error/empty states
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:1182` — `<p className="text-sm text-destructive">`
- **Rule:** design-system §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground`" | §7 "Fuel error / empty `px-3 py-6 text-center text-xs text-muted-foreground`"
- **Current:** load error in `text-sm text-destructive`; empties at lines 786 and 979 in `text-sm text-muted-foreground` with no padding/centering.
- **Expected:** `py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:170-173`, `:605-608`).
- **Change:** `class-level` — line 1182 `text-sm text-destructive` → `py-6 text-center text-xs text-muted-foreground`; lines 786 and 979 `text-sm text-muted-foreground` → `py-6 text-center text-xs text-muted-foreground`.
- **Notes:** —

### shard-021-F12 · should · medium · type
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:1230` — `<h3 className="text-sm font-semibold">`
- **Rule:** design-system §2 "Eyebrow: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`… one label style above every figure and panel" | §13 row D-T3
- **Current:** section headings "Legs"/"Flags" (lines 1230, 1243) at `text-sm font-semibold`.
- **Expected:** the eyebrow (`dashboard.tsx:776` 'Service vehicles', `:1001` PanelHead).
- **Change:** `class-level` — `text-sm font-semibold` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` on both `h3`s.
- **Notes:** Arabic has no uppercase; the eyebrow already accepts this (`:747`).

### shard-021-F13 · should · medium · type / tables
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:1271` — `<p className="text-xs text-muted-foreground">{label}</p>` / `<div className="mt-1 text-sm font-medium">`
- **Rule:** design-system §6 "KPI card: `dt` eyebrow (`mb-1.5`…), `dd` 22px mono value" | §2 "Figures are mono + tabular (`font-mono tabular-nums`)" | §1 6px "label→value in KPI cards"
- **Current:** `SummaryItem` label `text-xs`, value `text-sm font-medium` sans, gap `mt-1`; card `rounded-lg border p-3` without `bg-card`.
- **Expected:** eyebrow label, mono figure, 6px gap, `bg-card` (`dashboard.tsx:417-442`).
- **Change:** `class-level` — line 1270 `rounded-lg border p-3` → `rounded-lg border bg-card p-3`; line 1271 `text-xs text-muted-foreground` → `mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; line 1272 `mt-1 text-sm font-medium` → `font-mono text-[15px] font-semibold leading-none tabular-nums`. Drop the now-redundant `tabular-nums` on the value spans at lines 1197, 1205, 1213 (harmless if kept).
- **Notes:** 15px = the drawer-figure step (§14 C-T5); 22px would overflow "1h 23m / 58m" in a 5-column grid. Two items render a `RatioBadge` instead of text — the mono class is inert there.

### shard-021-F14 · should · medium · type
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:743` — `<span className="tabular-nums" dir="ltr">`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values, bar amounts" | §13 row D-T5
- **Current:** durations / max-deviation figures (lines 743, 747), stop coordinates (833) and the seq badge (716) are sans `tabular-nums`.
- **Expected:** `font-mono tabular-nums` (`dashboard.tsx:501-509` dl values).
- **Change:** `class-level` — lines 743, 747, 833: `tabular-nums` → `font-mono tabular-nums`.
- **Notes:** the `Badge` seq (716) is a pill; leave it.

### shard-021-F15 · should · medium · spacing
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:1174` — `<div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">`
- **Rule:** design-system §1 12px "gap between every top-level block… one vertical rhythm" | §13 row D-S4 | vercel-rules "Touch & Interaction" bullet "`overscroll-behavior: contain` in modals/drawers/sheets"
- **Current:** dialog body stacks sections at 24px; scroll body has no `overscroll-contain`.
- **Expected:** `gap-3`/`space-y-3` between blocks (`dashboard.tsx:99`); portaled scroll containers use `overscroll-contain` (`command.tsx:63-71`).
- **Change:** `class-level` — `space-y-6` → `space-y-3`, add `overscroll-contain`.
- **Notes:** `px-6 py-4` matches the provisional full-bleed dialog band (§12.6) — left alone.

### shard-021-F16 · should · medium · spacing / lists
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:1048` — `<div className="space-y-3 rounded-lg border p-4">`
- **Rule:** design-system §1 12px "panel body padding, KPI card padding, drawer padding" | §13 row D-S3 | §6 row card `rounded-lg border bg-card px-3 py-2.5`
- **Current:** review box `p-4`, no `bg-card`; leg cards (712) and flag cards (998) `rounded-lg border p-3` without `bg-card`.
- **Expected:** `p-3` and `bg-card` on bordered boxes (`dashboard.tsx:841` truck drawer, `:940` row card).
- **Change:** `class-level` — line 1048 `rounded-lg border p-4` → `rounded-lg border bg-card p-3`; lines 712 and 998 `rounded-lg border p-3` → `rounded-lg border bg-card px-3 py-2.5`.
- **Notes:** inside the dialog the ground is already `bg-background`; `bg-card` makes the boxes read as cards in dark mode where the two tokens differ.

### shard-021-F17 · should · medium · i18n
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:577` — `` title: `${Math.round(tick.sample.speed)} km/h` ``
- **Rule:** design-system §9 C-I4 "Copy, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks" | §13 row D-I2
- **Current:** literal units outside `t()`: `km/h` (577), ` m` (749), `km` (847-848, 885, 915-916), `%` join text is inside `t()` but the unit strings are not.
- **Expected:** every user-visible string through `t()`.
- **Change:** `class-level` (string) — wrap each unit in `t()` with a `defaultValue` (e.g. `t('units.kmh', '{{v}} km/h', { v })`, `t('units.km', 'km')`, `t('units.m', 'm')`); keys added to en/ar.
- **Notes:** `out-of-shard: src/shared/i18n/locales/en.json, ar.json` for the new keys (locale files are allowed by the runner).

### shard-021-F18 · should · medium · locale
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:834` — `({lat.toFixed(5)}, {lng.toFixed(5)})`
- **Rule:** vercel-rules "Locale & i18n" bullet "Numbers/currency: use `Intl.NumberFormat` not hardcoded formats" | design-system §2 "Number formatting: `formatNumber(v, decimals)` = `Intl.NumberFormat`"
- **Current:** `toFixed` at 834, 849 (`ratio.toFixed(2)`), 917 (`savingsPct.toFixed(1)`).
- **Expected:** `formatNumber(v, d)` from `shared/lib/format.ts` (already imported).
- **Change:** `class-level` (expression) — `lat.toFixed(5)` → `formatNumber(lat, 5)` (same for `lng`), `ratio.toFixed(2)` → `formatNumber(ratio, 2)`, `savingsPct.toFixed(1)` → `formatNumber(savingsPct, 1)`.
- **Notes:** spans are `dir="ltr"` already.

### shard-021-F19 · should · medium · type / empty value
- **Where:** `src/widgets/trip-audit-matches-table/audit-format.tsx:48` — `return <span className="text-muted-foreground">—</span>;`
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`" | §13 row D-C11
- **Current:** em dash in full `text-muted-foreground`.
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`).
- **Change:** `class-level` — `text-muted-foreground` → `opacity-40`.
- **Notes:** `formatKm`/`formatDurationSecs` return `'—'` as plain strings; call sites in the dialog (704-705, 722, 724) inline them into sentences — no change proposed there.

### shard-021-F20 · should · medium · i18n / locale
- **Where:** `src/widgets/trip-audit-matches-table/audit-format.tsx:37` — `` if (h > 0) return `${h}h ${m}m`; ``
- **Rule:** design-system §9 C-I4 "Copy… all go through `t()` with `defaultValue` fallbacks" | vercel-rules "Locale & i18n" bullet "Numbers/currency: use `Intl.NumberFormat` not hardcoded formats"
- **Current:** duration units `h`/`m`/`s` hard-coded English (37-39); `ratio.toFixed(2)` (53).
- **Expected:** translated unit strings; `formatNumber(ratio, 2)`.
- **Change:** `class-level` (expression) — `formatDurationSecs` cannot call `t()` (plain function; do not change its signature/export): render the units through `t()` at the call sites, or add an additive `useFormatDurationSecs()` hook in this file that wraps it with `t('units.h','h')` etc. Line 53 `ratio.toFixed(2)` → `formatNumber(ratio, 2)`.
- **Notes:** `out-of-shard: src/shared/i18n/locales/en.json, ar.json` for unit keys. Keep the existing export intact.

### shard-021-F21 · blocker · high · a11y / semantics
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:98` — `<div role="button" tabIndex={0} onClick={() => onOpen(match)}`
- **Rule:** vercel-rules "Accessibility" bullet "`<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)" | "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"
- **Current:** the whole row is a `div role="button"` (keyboard handled) that also contains a real `<Button>` — a native `<button>` cannot nest a button, which is why the div was used.
- **Expected:** the dashboard's rows are native `<button>`/`<Link>` elements (`dashboard.tsx:418`, `:611`, `:936`).
- **Change:** `structural` — make the inner `Button` the only control (row `div` without `role`/`tabIndex`/handlers is not allowed — handlers must stay), *or* keep the `div role="button"` and remove nothing: at minimum add the focus ring (F22). Recommended: keep the `div` (provisional §12.4 mobile rows use the same `div role=button tabIndex=0` pattern) and apply F22; note this as an accepted deviation.
- **Notes:** do not delete the `onKeyDown`/`onClick` handlers or the inner Button (standing constraints).

### shard-021-F22 · blocker · high · focus / lists
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:109` — `'group flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40'`
- **Rule:** design-system §14 C-B1 "`focus-visible:… ring-ring` everywhere; `ring-inset` only inside `overflow-hidden`" | §14 C-C4 "`hover:bg-muted/50` on content rows/cards" | §6 flush list rows "`px-3 py-2.5 md:px-4`"
- **Current:** focusable row with no focus-visible ring; hover `/40`; padding `px-4 py-3.5`.
- **Expected:** `px-3 py-2.5 md:px-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` (`dashboard.tsx:611-617` fuel row; the list wrapper is `overflow-hidden`, line 251, so inset).
- **Change:** `class-level` — `px-4 py-3.5 transition-colors hover:bg-muted/40` → `px-3 py-2.5 md:px-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`.
- **Notes:** —

### shard-021-F23 · should · medium · colour roles
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:110` — `reviewed && 'opacity-55 hover:opacity-90'`
- **Rule:** design-system §3 "De-emphasis by opacity: `opacity-70` (yesterday revenue, untracked tile…), `opacity-50`…, `opacity-40`" | §5.2 untracked tile "`border-dashed opacity-70`"
- **Current:** reviewed rows fade to an off-scale `opacity-55` and brighten on hover.
- **Expected:** whole-element fade is `opacity-70` (`dashboard.tsx:683`), no hover brightening (§8 "Hover: colour only").
- **Change:** `class-level` — `opacity-55 hover:opacity-90` → `opacity-70`.
- **Notes:** —

### shard-021-F24 · should · medium · type
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:123` — `<span className="shrink-0 text-xs text-muted-foreground" dir="ltr">` (plate)
- **Rule:** design-system §2 "Figures are mono + tabular… plates" | §6 "identifiers (date, plate) are `shrink-0`" | §2 "a value inside a muted context is promoted back with `text-foreground` (plate in meta line `:621`)"
- **Current:** plate in sans, muted; deliveries count (line 150) sans `tabular-nums` (parent 144).
- **Expected:** plate `font-mono text-foreground` in the meta line (`dashboard.tsx:621`); counts `font-mono tabular-nums`.
- **Change:** `class-level` — line 123 `shrink-0 text-xs text-muted-foreground` → `shrink-0 font-mono text-xs text-foreground`; line 144 `tabular-nums` → `font-mono tabular-nums`.
- **Notes:** Arabic plates are sans (`dir="rtl"`); this span is `dir="ltr"` so it is Latin here — if a plate can be Arabic, keep sans and use `dir="auto"`.

### shard-021-F25 · blocker · high · a11y
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:148` — `<Package className="h-3 w-3" />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`" | design-system §9 "`aria-hidden` on dots/chevrons"
- **Current:** `Package` (148), `CheckCircle2` (165), `ChevronRight` (195) lack `aria-hidden`.
- **Expected:** `aria-hidden` on decorative glyphs (`dashboard.tsx:424`).
- **Change:** `class-level` (attribute add) — add `aria-hidden="true"` to the three icons.
- **Notes:** —

### shard-021-F26 · nit · high · buttons & controls
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:195` — `<ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />`
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule… icons inside a Button carry no size classes" (§15.4)
- **Current:** dead `h-3.5 w-3.5` on icons inside `<Button>` here, and in the dialog at `trip-audit-detail-dialog.tsx:762` (`Route h-3.5 w-3.5`), `:1158` (`Play h-3.5 w-3.5`), `:1090`/`:1092` (`h-4 w-4`).
- **Expected:** no size classes (`button.tsx:7`, `header.tsx:23`).
- **Change:** `class-level` — remove `h-3.5 w-3.5` / `h-4 w-4` from those icons (keep `rtl:rotate-180`, `animate-spin`).
- **Notes:** —

### shard-021-F27 · should · high · loading states
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:226` — `<Skeleton key={i} className="h-[60px] w-full" />`
- **Rule:** design-system §14 C-R2 "a skeleton takes the radius of the box it stands in: cards `rounded-lg`, text bars `rounded-sm`, flush list rows `rounded-none`" | §7 "Fuel pending: `space-y-2 p-3` of 4 × `Skeleton h-10 w-full rounded-none`"
- **Current:** default `rounded-md` skeletons standing in for flush rows of a divided list, outside any card.
- **Expected:** flush-row skeletons inside the list card (`dashboard.tsx:599-604`).
- **Change:** `class-level` — wrapper `space-y-2` → `space-y-2 rounded-lg border bg-card p-3`; skeleton `h-[60px] w-full` → `h-10 w-full rounded-none`.
- **Notes:** —

### shard-021-F28 · should · low · empty states
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:236` — `<EmptyState title={…} description={…} />`
- **Rule:** design-system §7 "Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page" | §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground`" | §13 row D-ST1
- **Current:** default `EmptyState` (dashed, `py-16`, `text-lg` title).
- **Expected:** `py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:180-183`).
- **Change:** `structural` — swap the default `EmptyState` for `<p className="py-6 text-center text-xs text-muted-foreground">{title}</p>` (description may follow as a second line). The `empty` prop branch stays.
- **Notes:** `EmptyState` is a reference primitive; the deviation is in *using* it for a list empty. D-ST1 is unruled, hence low confidence — the fixer may leave it.

### shard-021-F29 · should · medium · colour roles / lists
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:251` — `'divide-y divide-border/60 overflow-hidden rounded-lg border bg-card'`
- **Rule:** design-system §3 "Hairlines: bare `border`, `border-b/t/e`, `divide-y` → `--border`" | §6 "Flush divided list: `ul class="… divide-y …"`" | §13 row D-C13
- **Current:** list dividers at 60% alpha (the dashed-dl alpha, not the list alpha).
- **Expected:** full `divide-y` (`dashboard.tsx:604`).
- **Change:** `class-level` — remove `divide-border/60`.
- **Notes:** —

### shard-021-F30 · nit · medium · type
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:1002` — `<span className="text-sm font-medium">{typeLabel}</span>`
- **Rule:** design-system §2 "13 `text-[13px]` 500 `leading-snug` — Exception row label — row-title size"
- **Current:** flag row title at 14px.
- **Expected:** `text-[13px] font-medium leading-snug` (`dashboard.tsx:960`).
- **Change:** `class-level` — `text-sm font-medium` → `text-[13px] font-medium leading-snug`. Same for the queue primary line `trip-audit-queue.tsx:119` `text-sm font-medium` → `text-[13px] font-medium leading-snug`.
- **Notes:** —

### shard-021-F31 · nit · low · forms
- **Where:** `src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:1075` — `<Textarea id="trip-audit-review-note" value={note}`
- **Rule:** vercel-rules "Forms" bullet "Inputs need `autocomplete` and meaningful `name`"
- **Current:** no `name`, no `autoComplete`.
- **Expected:** `name="review_note" autoComplete="off"` (non-auth free text; vercel-rules "Forms" bullet "`autocomplete="off"` on non-auth fields").
- **Change:** `class-level` (attribute add) — add `name="review_note" autoComplete="off"`.
- **Notes:** label is bound via `htmlFor` already.

## Summary
FINDINGS: 31 (blocker 11 / should 17 / nit 3)
