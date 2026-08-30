# Findings — shard-013

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/entities/location/api.ts` | 174 | no UI content | data/api only |
| `src/entities/location/index.ts` | 3 | no UI content | barrel |
| `src/entities/location/queries.ts` | 319 | no UI content | TanStack hooks; mutations call `toast` (see D-ST3 note under needs-attention) |
| `src/entities/location/schemas.ts` | 214 | no UI content | zod schemas |
| `src/pages/locations/locations.tsx` | 389 | audited | `Progress` primitive: no rule (dashboard bar-chart recipe is the nearest, §6, but a page-level coverage bar is a different role — not flagged). `PageShell` container/title: covered by §13 D-S1/D-T1 (out-of-shard primitive, not flagged here). |
| `src/widgets/locations-dropoff-dialog/index.ts` | 1 | no UI content | barrel |
| `src/widgets/locations-dropoff-dialog/locations-dropoff-dialog.tsx` | 243 | audited | Full-bleed dialog bands match provisional §12.6 exactly — not flagged. `PinSourceBadge` (a `div`) is rendered inside `DialogDescription` (a `p`) — invalid nesting, but no rule covers it. |
| `src/widgets/locations-dropoffs-table/columns.tsx` | 105 | audited | Action cell is a styled `<span>` "Set pin" relying on DataTable row click — no rule for a pseudo-CTA without its own control; recorded only. |
| `src/widgets/locations-dropoffs-table/index.ts` | 2 | no UI content | barrel |
| `src/widgets/locations-dropoffs-table/locations-dropoffs-table.tsx` | 40 | audited | Delegates to `DataTable` (provisional §12.4); no local classes. Clean. |
| `src/widgets/locations-dropoffs-table/pin-source-badge.tsx` | 28 | audited | see F14 |
| `src/widgets/locations-map-picker/index.ts` | 1 | no UI content | barrel |
| `src/widgets/locations-map-picker/locations-map-picker.tsx` | 126 | audited | Map viewport `h-[360px]` vs provisional `h-[380px] bg-muted/30` — provisional only, not flagged. Marker hex colours are passed to the map library (third hues allowed on maps) — recorded in F16 as medium. |
| `src/widgets/locations-needs-attention/index.ts` | 1 | no UI content | barrel |
| `src/widgets/locations-needs-attention/locations-needs-attention.tsx` | 700 | audited | `NativeSelect`: no rule (the reference uses Radix Select only). `toast.error` in `notFoundToast` contradicts §7 "never a toast" but D-ST3 is unruled and removing it deletes a handler — not proposed. `EmptyState` on empty queue: §7 says the dashboard uses bare copy; D-ST1 unruled — see F22 (medium). |

## Findings

### shard-013-F01 · should · high · type
- **Where:** `src/pages/locations/locations.tsx:225` — `<div className="text-3xl font-semibold tabular-nums text-warning">`
- **Rule:** design-system §2 "KPI value … 600, `leading-none`, **mono** + `tabular-nums`" and "Figures are mono + tabular (`font-mono tabular-nums`)"; §14 C-T5 four-step figure scale (22 › 18 › 17 › 15)
- **Current:** sans headline count at 30px (`text-3xl`).
- **Expected:** `font-mono text-[22px] font-semibold leading-none tabular-nums` (`dashboard.tsx:436`).
- **Change:** `text-3xl font-semibold tabular-nums text-warning` → `font-mono text-[22px] font-semibold leading-none tabular-nums text-warning`. `class-level`
- **Notes:** `text-warning` is the correct role (needs attention); keep it.

### shard-013-F02 · should · high · type
- **Where:** `src/pages/locations/locations.tsx:255` — `<div className="mt-1 text-2xl font-semibold tabular-nums" dir="ltr">` (same at `:268`)
- **Rule:** design-system §2 "KPI value … 600, `leading-none`, **mono** + `tabular-nums`"; §10 KPI card `dd font-mono text-[22px] font-semibold leading-none tabular-nums`
- **Current:** sans `text-2xl` (24px) figures; `mt-1` above.
- **Expected:** `font-mono text-[22px] font-semibold leading-none tabular-nums`, label→value gap `mb-1.5` on the label (`dashboard.tsx:427-436`).
- **Change:** `mt-1 text-2xl font-semibold tabular-nums` → `mt-1.5 font-mono text-[22px] font-semibold leading-none tabular-nums` on both lines. `class-level`
- **Notes:** keep `dir="ltr"` — the `a/b` pair must not flip in RTL.

### shard-013-F03 · should · medium · type
- **Where:** `src/pages/locations/locations.tsx:251` — `<div className="flex items-center gap-2 text-sm text-muted-foreground">` (same at `:264`)
- **Rule:** design-system §2 "**Eyebrow**: KPI label … `text-[10px]` 600 `uppercase tracking-wider text-muted-foreground` — one label style above every figure and panel"; §1 6px "icon↔text gaps"
- **Current:** 14px sans label with 16px icon, `gap-2`.
- **Expected:** `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (`dashboard.tsx:427`), icon gap `gap-1.5`.
- **Change:** `flex items-center gap-2 text-sm text-muted-foreground` → `flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` at `:251` and `:264`. `class-level`
- **Notes:** Arabic labels take uppercase harmlessly (no case). Icons `h-4 w-4` may be reduced to `h-3 w-3` to match the KPI chevron slot; optional.

### shard-013-F04 · should · medium · type
- **Where:** `src/pages/locations/locations.tsx:228` — `<div className="mt-0.5 text-sm text-muted-foreground">` and `:258`/`:271` — `<div className="text-xs text-muted-foreground">`
- **Rule:** design-system §2 "`text-[11.5px]` … KPI detail line — the 'hint under a figure/title' size (C-T4)"; §6 KPI card "`p` detail `mt-1.5 min-h-[17px] text-[11.5px]`"
- **Current:** 14px hint under the attention count; 12px hint under the two ratios.
- **Expected:** `mt-1.5 text-[11.5px] text-muted-foreground` (`dashboard.tsx:442`).
- **Change:** `:228` `mt-0.5 text-sm text-muted-foreground` → `mt-1.5 text-[11.5px] text-muted-foreground`; `:258`, `:271` `text-xs text-muted-foreground` → `mt-1.5 text-[11.5px] text-muted-foreground`. `class-level`

### shard-013-F05 · should · high · spacing
- **Where:** `src/pages/locations/locations.tsx:219` — `'rounded-lg border p-4 sm:col-span-1'` (also `:250`, `:263` `rounded-lg border bg-card p-4`; wrapper `:216` `mb-4 grid gap-3 sm:grid-cols-3`)
- **Rule:** design-system §1 "**12px** … KPI card padding … the same step is reused at page, card and panel-body level"; §13 D-S3 (card body `p-3`, dashboard wins)
- **Current:** cards `p-4` (16px); grid closes with `mb-4` while the page rhythm is `gap-3`.
- **Expected:** KPI card `p-3` (`dashboard.tsx:425`); block gap 12px (`dashboard.tsx:99`).
- **Change:** `p-4` → `p-3` on `:219`, `:250`, `:263`; `mb-4 grid gap-3` → `mb-3 grid gap-3` on `:216`. `class-level`
- **Notes:** the first card lacks `bg-card` deliberately (tinted); F06 covers its tint.

### shard-013-F06 · should · high · colour
- **Where:** `src/pages/locations/locations.tsx:220` — `attentionCount > 0 ? 'border-warning/50 bg-warning/5' : 'border-success/40 bg-success/5'`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … 10% tint + 40% border"; §14 C-C3 "`border-warning/40`"
- **Current:** `/50` border and `/5` wash for warning; `/5` wash for success.
- **Expected:** `border-warning/40 bg-warning/10` / `border-success/40 bg-success/10` (`dashboard.tsx:221`, `:1031`).
- **Change:** `'border-warning/50 bg-warning/5'` → `'border-warning/40 bg-warning/10'`; `'border-success/40 bg-success/5'` → `'border-success/40 bg-success/10'`. `class-level`

### shard-013-F07 · blocker · high · a11y/focus
- **Where:** `src/pages/locations/locations.tsx:192` — `'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors'`
- **Rule:** vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"; design-system §4 "`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element (C-B1)"
- **Current:** raw `<button>` pills with no focus-visible ring.
- **Expected:** the scope presets carry the Button ring `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1` (`button.tsx:7`, `scope-date-picker.tsx:132`).
- **Change:** append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` to the base string. `class-level` (moot if F08 is applied structurally)

### shard-013-F08 · should · high · buttons
- **Where:** `src/pages/locations/locations.tsx:192-195` — `rounded-full border px-3 … ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted/60'`
- **Rule:** design-system §5.2 "Scope presets | `Button size="sm" h-7 text-xs`, `variant` flips `default`↔`outline`, `aria-pressed` | segmented choice by variant swap (C-B4)"; §14 C-C4 "`hover:bg-accent` on chrome"
- **Current:** hand-rolled `h-8 rounded-full` pills; inactive hover `bg-muted/60` (not a named hover step).
- **Expected:** `<Button size="sm" variant={active ? 'default' : 'outline'} className="h-7 text-xs" aria-pressed>` (`scope-date-picker.tsx:132-136`).
- **Change:** `structural` — replace the raw `<button>` with `Button` as above, keeping `key`, `type`, `onClick`, `aria-pressed` and the count `<span>`. Class-level fallback: `h-8 … rounded-full` → `h-7 … rounded-md`, `hover:bg-muted/60` → `hover:bg-accent hover:text-accent-foreground`, inactive `bg-card` → `bg-background shadow-sm`.
- **Notes:** the same recipe is duplicated in `locations-needs-attention.tsx:344` (F24/F25); fix both identically. Count span `opacity-80` → `opacity-70` (§3 opacity steps 70/50/40) while there.

### shard-013-F09 · nit · medium · buttons
- **Where:** `src/pages/locations/locations.tsx:291` — `<Badge variant="warning" className="px-1.5">`
- **Rule:** design-system §5.3 "Badge primitive | same recipe as the ConnectionBadge: `… px-2.5 py-1 text-[11px]` (C-T3)"
- **Current:** horizontal padding overridden to 6px, breaking the one status-pill recipe.
- **Expected:** untouched `Badge` (`badge.tsx:5-20`).
- **Change:** remove `className="px-1.5"` (or leave the prop and pass `""`). `class-level`

### shard-013-F10 · nit · low · spacing
- **Where:** `src/pages/locations/locations.tsx:302` — `<TabsContent value="inbox" className="mt-4">` (also `:306`, `:333` `mt-4 space-y-3`)
- **Rule:** provisional (§12.3) "`TabsContent mt-2` (page overrides `mt-3 md:mt-4`)"; design-system §1 12px block gap
- **Current:** `mt-4` at all widths.
- **Expected:** `mt-3` (12px rhythm), the trips page's `mt-3 md:mt-4` at most.
- **Change:** `mt-4` → `mt-3` on the three `TabsContent`s. `class-level`

### shard-013-F11 · should · high · buttons
- **Where:** `src/widgets/locations-dropoff-dialog/locations-dropoff-dialog.tsx:232` — `<Loader2 className="me-1.5 h-4 w-4 animate-spin" />` (also `:234`, `:221`)
- **Rule:** design-system §5.1 "**Icons inside a Button are 16px, by rule.** … icons inside a Button carry no size classes"; §14 C-S7 "one gap, no extra margin"
- **Current:** `h-4 w-4` (dead, beaten by `[&_svg]:size-4`) plus `me-1.5` stacked on the Button's own `gap-2` → 14px between icon and label; the delete button at `:218` adds `gap-1.5` on top of the base `gap-2`.
- **Expected:** bare `<Save />`, spacing from Button `gap-2` (`button.tsx:7`, `header.tsx:23`).
- **Change:** `:221` `<Trash2 className="h-4 w-4" />` → `<Trash2 />`; `:232` `className="me-1.5 h-4 w-4 animate-spin"` → `className="animate-spin motion-reduce:animate-none"`; `:234` `<Save className="me-1.5 h-4 w-4" />` → `<Save />`; `:218` drop `gap-1.5`. `class-level`
- **Notes:** `me-1.5` removal also fixes RTL asymmetry. See F12 for the spinner guard.

### shard-013-F12 · should · medium · motion
- **Where:** `src/widgets/locations-dropoff-dialog/locations-dropoff-dialog.tsx:232` — `animate-spin`
- **Rule:** design-system §8 "Reduced motion … opt-out is per element (`motion-reduce:animate-none` on the badge dot and the Skeleton primitive)"; §14 C-M2; vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** looping spin with no reduced-motion guard (§13 D-ST4 records the same gap in trips).
- **Expected:** every looping animation in the reference carries `motion-reduce:animate-none` (`skeleton.tsx:4`, `dashboard.tsx:227`).
- **Change:** add `motion-reduce:animate-none` next to `animate-spin`. `class-level`

### shard-013-F13 · should · high · forms
- **Where:** `src/widgets/locations-dropoff-dialog/locations-dropoff-dialog.tsx:151-159` — `<Input id="dropoff-lat" type="number" step="0.000001" value={lat} … placeholder="30.044420"` (same `:165`, `:179`)
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`", "`autocomplete="off"` on non-auth fields", "Use correct `type` … and `inputmode`", "Placeholders end with `…` and show example pattern"
- **Current:** no `name`, no `autoComplete`, no `inputMode`; placeholders are bare example values.
- **Expected:** `name="lat" autoComplete="off" inputMode="decimal"`; placeholder `30.044420…`.
- **Change:** additive props on the three Inputs: `name="lat"|"lng"|"radius_m"`, `autoComplete="off"`, `inputMode="decimal"` (radius `inputMode="numeric"`); placeholders `"30.044420"` → `"30.044420…"`, `"31.235712"` → `"31.235712…"`; radius default placeholder `'Default ({{m}} m)'` → `'Default ({{m}} m)…'` (locale key `locations.fields.radiusDefaultPlaceholder`; `out-of-shard: src/shared/i18n/en.json, ar.json` for the translated copies). `class-level`

### shard-013-F14 · should · medium · colour
- **Where:** `src/widgets/locations-dropoffs-table/pin-source-badge.tsx:21` — `<Badge variant="success">` … `'GPS (provisional)'`
- **Rule:** design-system §3 "Success … passing status only"; "Warning … degraded / attention, not failure"
- **Current:** a *provisional* (unconfirmed) pin is painted green — the passing colour.
- **Expected:** an unconfirmed state is "attention": `variant="warning"` (`dashboard.tsx:240-248`, 'not live' badge).
- **Change:** `variant="success"` → `variant="warning"`. `class-level`
- **Notes:** judgment call on role mapping; the queue row icon for provisional items (`locations-needs-attention.tsx:494` `text-success`) should follow the same decision.

### shard-013-F15 · should · high · type
- **Where:** `src/widgets/locations-dropoffs-table/columns.tsx:73` — `<div className="text-muted-foreground tabular-nums" dir="ltr">` (also `:43` radius cell)
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values"; provisional (§12.4) "figures `font-mono text-[12.5px] tabular-nums`"
- **Current:** sans coordinates and radius.
- **Expected:** `font-mono tabular-nums` (`dashboard.tsx:501-509`).
- **Change:** `:73` `text-muted-foreground tabular-nums` → `font-mono text-muted-foreground tabular-nums`; `:43` same. `class-level`
- **Notes:** the radius cell falls back to a translated sentence ("Default (300 m)") — mono on that string is acceptable (Latin/Arabic digits), but if Arabic copy renders there keep sans by wrapping only the number; `structural` if chosen.

### shard-013-F16 · should · medium · colour
- **Where:** `src/widgets/locations-dropoffs-table/columns.tsx:61` — `<span className="text-muted-foreground">—</span>` (also `:70`)
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`"; §13 D-C11 (dashboard wins)
- **Current:** full-strength muted dash.
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`).
- **Change:** `text-muted-foreground` → `opacity-40` on both spans. `class-level`

### shard-013-F17 · should · medium · colour
- **Where:** `src/widgets/locations-map-picker/locations-map-picker.tsx:43` — `primaryColor = '#2563eb'` (and `:84` `'#16a34a'`)
- **Rule:** design-system §3 "Non-token colours in the reference: the two scrims and `theme-color`… No hex/rgb in any dashboard or shell TSX"; §0.2 palette rule "Adding a third accent colour breaks the whole scheme"; §13 D-C2
- **Current:** Tailwind blue-600 for the stored pin (not `--primary` navy) and green-600 for the suggestion.
- **Expected:** the actionable/stored hue is `--primary` (`217 60% 26%`); status hues are the tokens (`--success`).
- **Change:** `'#2563eb'` → `'hsl(var(--primary))'` and `'#16a34a'` → `'hsl(var(--success))'` if `MapView` passes marker colours to CSS/SVG; if the map library needs literal hex, resolve the tokens once via `getComputedStyle(document.documentElement)` (`structural`; `out-of-shard: src/shared/ui/map-view.tsx` to confirm). Third hues are tolerated *on the map itself*; the legend dots that echo them are F29.
- **Notes:** `STORED_PIN_COLOR`/`SUGGESTED_PIN_COLOR` in `locations-needs-attention.tsx:38-39` duplicate these values — change both together.

### shard-013-F18 · blocker · high · a11y/focus
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:586-596` — `<div role="button" tabIndex={0} onClick={onToggle} … className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/40">`
- **Rule:** vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*`"; design-system §9 "`aria-expanded` on disclosure buttons"; §4 "`ring-inset` … inside `overflow-hidden` parents"
- **Current:** keyboard-focusable row with no focus ring and no `aria-expanded`; sits inside an `overflow-hidden` card.
- **Expected:** KPI card face `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` + `aria-expanded` (`dashboard.tsx:418-433`).
- **Change:** add `aria-expanded={expanded}` and append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` to the className. `class-level`
- **Notes:** the row also nests real `<Button>`s inside a `role="button"` (interactive-in-interactive); vercel "Use semantic HTML" would prefer the toggle to be its own `<button>` and the action to sit beside it — `structural`, optional, do not remove the handlers.

### shard-013-F19 · should · high · colour
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:596` — `hover:bg-muted/40`; `:584` — `expanded && 'bg-muted/30'`
- **Rule:** design-system §3 "Content-row hover `hover:bg-muted/50`"; §14 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"; §13 D-C3/D-C5
- **Current:** hover `/40`, expanded well `/30`.
- **Expected:** `hover:bg-muted/50` (`dashboard.tsx:616`), expanded/drawer `bg-muted/40` (`dashboard.tsx:494`).
- **Change:** `hover:bg-muted/40` → `hover:bg-muted/50`; `'bg-muted/30'` → `'bg-muted/40'`. `class-level`

### shard-013-F20 · should · high · type
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:601` — `<span className="min-w-0 truncate text-sm font-medium" dir="auto">`; `:610` — `<p className="truncate text-xs text-muted-foreground" dir="auto">`
- **Rule:** design-system §2 "13 | `text-[13px]` | 500, `leading-snug` | Exception row label"; "11 | `text-[11px]` | exception hint … 'hint under a row label' size (C-T4)"
- **Current:** row title 14px, hint 12px.
- **Expected:** `text-[13px] font-medium leading-snug` + hint `text-[11px] text-muted-foreground` (`dashboard.tsx:958-960`).
- **Change:** `:601` `text-sm font-medium` → `text-[13px] font-medium leading-snug`; `:610` `text-xs` → `text-[11px]`. `class-level`

### shard-013-F21 · should · high · buttons
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:604` — `<Badge variant="outline" className="shrink-0 text-[10px]">`
- **Rule:** design-system §5.3 "Badge primitive | … `text-[11px] font-medium` (C-T3)"; §3 "Neutral chip `bg-muted text-muted-foreground` … `rounded-full bg-muted px-2 py-0.5 text-[10.5px]`"
- **Current:** outline Badge shrunk to 10px — a third pill size.
- **Expected:** either the 11px status pill untouched, or (for a non-status kind tag) the neutral chip `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground` (`dashboard.tsx:637`).
- **Change:** `className="shrink-0 text-[10px]"` → `className="shrink-0"` (class-level); or `structural` swap to `<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">` — recommended, since "Terminal/Drop-off" is a kind, not a status.

### shard-013-F22 · should · medium · states
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:294` — `<EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title=…`
- **Rule:** design-system §7 "Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page"; "Exceptions empty | `py-6 text-center text-xs text-muted-foreground` 'all clear' — the one empty/error recipe (C-S3)"
- **Current:** dashed `py-16` EmptyState with `text-lg` title and CTA for the "all caught up" queue.
- **Expected:** `py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:180-183`).
- **Change:** `structural` — replace `EmptyState` with `<div className="rounded-lg border bg-card"><p className="py-6 text-center text-xs text-muted-foreground">{title} — {description}</p>{action}</div>`, keeping the `onBrowseDropoffs` branch and its Button. §13 D-ST1 lists this trips pattern as unruled; apply only if the owner rules for the dashboard recipe, otherwise leave.

### shard-013-F23 · should · high · states
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:398` — `<p className="p-6 text-center text-sm text-muted-foreground">`
- **Rule:** design-system §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground` (with `px-3` where the parent has no padding)"; §10 "Empty/error px-3 py-6 text-center text-xs text-muted-foreground"
- **Current:** `p-6 … text-sm`.
- **Expected:** `px-3 py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:605-608`).
- **Change:** `p-6 text-center text-sm text-muted-foreground` → `px-3 py-6 text-center text-xs text-muted-foreground`. `class-level`

### shard-013-F24 · blocker · high · a11y/focus
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:344` — `'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors'`
- **Rule:** vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"; design-system §4 C-B1
- **Current:** raw `<button>` pills, no focus-visible ring.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1` (`button.tsx:7`).
- **Change:** append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`. `class-level` (moot if F25 applied)

### shard-013-F25 · should · high · buttons
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:344-347` — `rounded-full border px-3 … 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted/60'`
- **Rule:** design-system §5.2 "Scope presets | `Button size="sm" h-7 text-xs`, `variant` flips `default`↔`outline`, `aria-pressed` (C-B4)"; §14 C-C4 "`hover:bg-accent` on chrome"
- **Current:** duplicate of the hand-rolled pill in `locations.tsx` (F08).
- **Expected:** `<Button size="sm" variant={active ? 'default' : 'outline'} className="h-7 text-xs" aria-pressed>` (`scope-date-picker.tsx:132-136`).
- **Change:** `structural` — same swap as F08, keeping `key`, `type`, `onClick`, `aria-pressed`, label and count span; class-level fallback identical to F08. Count span `opacity-80` → `opacity-70`.
- **Notes:** `NativeSelect … h-8` beside them (`:358`) then sits one step taller than `h-7` pills; the reference's toolbar mixes `h-8` chrome with `h-7` in-strip buttons (§5.1), so leave the select at `h-8`.

### shard-013-F26 · should · high · states
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:323-324` — `rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-muted-foreground` + `<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />`
- **Rule:** design-system §7 "**DegradedStrip**: `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`; `AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning`"; §10 Strip
- **Current:** solid `rounded-md`, `/5` wash, `p-3 text-sm`, 16px icon, muted copy.
- **Expected:** the DegradedStrip recipe (`dashboard.tsx:1018-1047`).
- **Change:** container → `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` (drop `text-muted-foreground`; wrap the text in `<span className="min-w-0">`); icon `h-4 w-4` → `h-3.5 w-3.5`. `class-level`
- **Notes:** "unavailable" here is a degraded source exactly like the stream-down strip; a retry (`suggestionsQuery.refetch`) as `Button variant="outline" size="sm" className="h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning hover:text-warning"` would complete the recipe — additive, optional.

### shard-013-F27 · should · high · states
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:282-284` — `<Skeleton className="h-12 w-full" />` ×3 in `space-y-2`
- **Rule:** design-system §14 C-R2 "a skeleton takes the radius of the box it stands in: cards `rounded-lg`, text bars `rounded-sm`, flush list rows `rounded-none`"; §7 "Fuel pending | `space-y-2 p-3` of 4 × `Skeleton h-10 w-full rounded-none`"
- **Current:** default `rounded-md` (10px) bars standing in for rows of a `divide-y` bordered card.
- **Expected:** a `rounded-lg border bg-card` frame with `rounded-none` row skeletons (`dashboard.tsx:599-604`), or `h-12 rounded-lg` cards in `grid gap-2` (`:174-179`).
- **Change:** wrap the three skeletons in `<div className="space-y-2 rounded-lg border bg-card p-3">` and use `className="h-10 w-full rounded-none"`. `class-level` (wrapper is additive)

### shard-013-F28 · should · high · motion
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:619` — `'h-4 w-4 text-muted-foreground transition-transform'`
- **Rule:** design-system §14 C-M1 "`duration-200` for every chevron/collapse/icon transition"; §9 "`aria-hidden` on dots/chevrons"; §6 KPI card chevron `h-3 w-3`
- **Current:** 150ms default, no `aria-hidden`, 16px chevron.
- **Expected:** `ChevronDown h-3 w-3 transition-transform duration-200` + `rotate-180`, `aria-hidden` (`dashboard.tsx:431-433`).
- **Change:** `'h-4 w-4 text-muted-foreground transition-transform'` → `'h-3 w-3 text-muted-foreground transition-transform duration-200'`; add `aria-hidden="true"`. `class-level`

### shard-013-F29 · should · high · colour
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:654` — `<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STORED_PIN_COLOR }} />` (and `:658`); wrapper `:652` `gap-3 text-xs text-muted-foreground`
- **Rule:** design-system §14 C-C8 "6px (`h-1.5 w-1.5`)"; §6 "**Legend**: `mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground`, items `gap-1.5` with `<i class="h-1.5 w-1.5 rounded-full">`"; §3 "No hex/rgb in any dashboard or shell TSX"
- **Current:** 10px dots with inline hex backgrounds (blue-600 / green-600) on DOM elements; 12px legend text.
- **Expected:** `h-1.5 w-1.5 rounded-full` dots coloured by token class, `text-[11px]` (`dashboard.tsx:811-818`).
- **Change:** `h-2.5 w-2.5 rounded-full` → `h-1.5 w-1.5 rounded-full bg-primary` / `bg-success` and drop the `style` props; wrapper `text-xs` → `text-[11px]`; add `aria-hidden="true"` to the dots. `class-level`
- **Notes:** must stay in step with the marker colours (F17) so legend and map agree — if the map keeps hex, resolve those hex values from the same tokens.

### shard-013-F30 · should · high · buttons
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:531` — `{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}` (also `:547`, `:563`, `:681`; Buttons at `:524`, `:540`, `:556`, `:677` add `gap-1.5`)
- **Rule:** design-system §5.1 "**Icons inside a Button are 16px, by rule** … icons inside a Button carry no size classes"; base `gap-2`; §8 reduced motion per element (C-M2)
- **Current:** dead `h-3.5 w-3.5` classes (overridden to 16px by `[&_svg]:size-4`), `gap-1.5` overriding the base `gap-2`, spinners without `motion-reduce:animate-none`.
- **Expected:** bare icons, Button `gap-2` (`button.tsx:7`, `dashboard.tsx:1043`).
- **Change:** remove `h-3.5 w-3.5` from all six icons; spinners → `className="animate-spin motion-reduce:animate-none"`; drop `gap-1.5` from the four Buttons' `className` (keep the prop). `class-level`

### shard-013-F31 · should · medium · spacing
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:321` — `<div className="space-y-4">`
- **Rule:** design-system §1 "**12px** … gap between every top-level block … one vertical rhythm"; §13 D-S4 (dashboard wins)
- **Current:** 16px between strip, toolbar, queue and pagination.
- **Expected:** 12px (`dashboard.tsx:99` `gap-3`).
- **Change:** `space-y-4` → `space-y-3`. `class-level`

### shard-013-F32 · nit · medium · colour
- **Where:** `src/widgets/locations-dropoff-dialog/locations-dropoff-dialog.tsx:140` — `rounded-md border border-primary/30 bg-primary/5 p-2.5 text-sm`
- **Rule:** design-system §3 "Current / selected wash `bg-primary/10 text-primary`"; §4 "Inner wells `rounded-lg`" (§13 D-R3, dashboard wins); provisional (§12.2) inline banners `rounded-md border px-3 py-2 text-xs` + icon `mt-0.5 shrink-0`
- **Current:** a fourth primary alpha pair (`/30`, `/5`) and 14px copy.
- **Expected:** `rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-[12.5px]` mirroring the strip build (`dashboard.tsx:1021`).
- **Change:** `rounded-md border border-primary/30 bg-primary/5 p-2.5 text-sm` → `rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-[12.5px]`. `class-level`

## Summary
FINDINGS: 32 (blocker 3 / should 26 / nit 3)
