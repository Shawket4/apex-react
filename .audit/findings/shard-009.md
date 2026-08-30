# Findings — shard-009

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/fee-mappings/accuracy-badge.tsx` | 71 | audited | — |
| `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx` | 139 | audited | Full-bleed dialog bands (`gap-0 p-0`, `px-6 py-4` header, `px-6 py-3` footer) match provisional §12.6 — no dashboard rule; `max-h-[80vh]` vs provisional 90vh — no rule. Footer Close at default `h-9` — no dashboard rule for dialog footers (provisional §12.6 uses default). |
| `src/widgets/fee-mappings/fee-mappings-excel.ts` | 249 | no UI content | Excel colours (`EXCEL_PALETTE.violet/green/red`) — no rule (§12.6 only records the brand colour). |
| `src/widgets/fee-mappings/fee-mappings-filters.tsx` | 130 | audited | Container `rounded-lg border bg-card px-3 py-2.5` matches the row-card recipe. Select accessible name comes from its value text — no finding. |
| `src/widgets/fee-mappings/fee-mappings-form.tsx` | 332 | audited | `Label text-xs`, `space-y-1` field stack, required `*` — match provisional §12.2. Unsaved-changes guard — no dashboard rule; not flagged. |
| `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx` | 234 | audited | Marker hex `#2563EB` is on a map — third hues are permitted in maps; recorded only (§13 D-C2). Map box `h-[360px] rounded-lg border` — no rule beyond provisional §12.6. |
| `src/widgets/fee-mappings/fee-mappings-stats.tsx` | 119 | audited | `bg-primary/10 text-primary` icon well for "total" follows the palette icon-well wash (§3) — not flagged. |
| `src/widgets/fee-mappings/fee-mappings-table.tsx` | 195 | audited | `DataTable` chrome (thead, pager, empty state, URL-synced page) is `out-of-shard: src/shared/ui/data-table.tsx`; `pageSize={50}` — no rule. `formatCurrency` for fee — dashboard has no currency-suffix rule (§13 D-T14 records the split); not flagged beyond colour/face. |

## Findings

### shard-009-F01 · blocker · high · colour
- **Where:** `src/widgets/fee-mappings/accuracy-badge.tsx:19` — `'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 …'` (also `:25` sky, `:31` rose)
- **Rule:** design-system §0.2 palette comment "Two hues, one job each… Adding a third accent colour breaks the whole scheme, so don't." | §3 "Status tint recipe `border-X/40 bg-X/10 text-X`… never a solid status fill" | §14 C-T3 "status variants `border-X/40 bg-X/10 text-X`"
- **Current:** three Tailwind hues (emerald/sky/rose) with hand-rolled light/dark pairs, plus matching `bg-emerald-500`/`bg-sky-500`/`bg-rose-500` dots (`:20`, `:26`, `:32`).
- **Expected:** token status colours in the pill recipe — `border-success/40 bg-success/10 text-success` etc. (`src/shared/ui/badge.tsx:8-20`, `src/pages/dashboard/dashboard.tsx:216-249`). Tokens are theme-aware so the `dark:` pairs are unnecessary.
- **Change:** `class-level` — `accurate.container` → `border-success/40 bg-success/10 text-success`, `dot` → `bg-success`; `conservative.container` → `border-warning/40 bg-warning/10 text-warning`, `dot` → `bg-warning`; `overestimate.container` → `border-destructive/40 bg-destructive/10 text-destructive`, `dot` → `bg-destructive`; `unknown.container` → `border-border bg-muted text-muted-foreground` (the badge's "connecting" recipe). Drop the `dark:` classes.
- **Notes:** "conservative → warning" is the judgment call (under-billing needs attention but is not failure); the `dot` values are unused in JSX today but keep the map coherent. The same kind→colour map lives in `fee-mappings-stats.tsx` (F39) and must agree.

### shard-009-F02 · should · high · buttons/pills
- **Where:** `src/widgets/fee-mappings/accuracy-badge.tsx:57` — `'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium'`
- **Rule:** design-system §5.3 "Badge primitive: same recipe as the ConnectionBadge: `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium`" | §4 "pill `rounded-full` — badges, chips"
- **Current:** `rounded-md`, `gap-1`, `px-2 py-0.5` — a third pill recipe (11px text but chip padding, 10px radius).
- **Expected:** `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium` (`src/shared/ui/badge.tsx:6`).
- **Change:** `class-level` — `gap-1 rounded-md px-2 py-0.5` → `gap-1.5 rounded-full px-2.5 py-1`. (Alternatively `structural`: render `<Badge variant=…>` from `@/shared/ui/badge`.)
- **Notes:** Rendered inside every table row (`fee-mappings-table.tsx:121`); 2px taller rows are expected.

### shard-009-F03 · blocker · high · a11y
- **Where:** `src/widgets/fee-mappings/accuracy-badge.tsx:61` — `<Icon className="h-3 w-3" />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`" | design-system §9 "`aria-hidden` on dots/chevrons/severity bars"
- **Current:** the status glyph is announced alongside the translated label.
- **Expected:** decorative icons carry `aria-hidden` (`src/pages/dashboard/dashboard.tsx:226`, `:431`).
- **Change:** `class-level` — add `aria-hidden="true"` to `<Icon … />`.

### shard-009-F04 · should · medium · i18n/locale
- **Where:** `src/widgets/fee-mappings/accuracy-badge.tsx:66` — `{diffKm.toFixed(1)}km`
- **Rule:** vercel-rules "Locale & i18n" bullet "Numbers/currency: use `Intl.NumberFormat` not hardcoded formats" | "Typography" bullet "Non-breaking spaces: `10&nbsp;MB`" | design-system §2 "Number formatting: `formatNumber(v, decimals)` = `Intl.NumberFormat`"; §9 "Copy… all go through `t()`"
- **Current:** `toFixed(1)` (no locale grouping/digits) concatenated to a bare untranslated `km` with no space.
- **Expected:** `formatNumber(diffKm, 1)` from `@/shared/lib/format` (`src/shared/lib/format.ts:20-23`), unit via `t()` with a non-breaking space.
- **Change:** `class-level` — `{diffKm.toFixed(1)}km` → `{formatNumber(diffKm, 1)}&nbsp;{t('common.km', 'km')}` (import `formatNumber`). Additive key `common.km` in en/ar if absent.

### shard-009-F05 · should · high · type
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:135` — `<div className="text-2xl font-bold tabular-nums">{value}</div>`
- **Rule:** design-system §2 "**700 is never used** in the reference"; "22 · `text-[22px]` · 600, `leading-none`, mono + `tabular-nums` · KPI value" | §13 D-T8 (weight ceiling 600)
- **Current:** sans `text-2xl font-bold` (24px/700).
- **Expected:** `font-mono text-[22px] font-semibold leading-none tabular-nums` (`src/pages/dashboard/dashboard.tsx:436`).
- **Change:** `class-level` — `text-2xl font-bold tabular-nums` → `font-mono text-[22px] font-semibold leading-none tabular-nums`; also wrap `{value}` in `formatNumber(value, 0)`.

### shard-009-F06 · should · medium · radius/spacing
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:134` — `cn('rounded-md p-2.5 text-center', cls)`
- **Rule:** design-system §4 C-R1 "every card, panel and tile uses the token family (`rounded-lg`)" | §1 "12px · KPI card padding" | §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"
- **Current:** `rounded-md p-2.5` mini KPI cards with borderless tints (`bg-success/10 text-success`, `bg-muted text-foreground`).
- **Expected:** `rounded-lg border p-3` and the status tint carrying its `/40` border (`dashboard.tsx:417-427`, `badge.tsx:8-20`).
- **Change:** `class-level` — `rounded-md p-2.5` → `rounded-lg border p-3`; `success` → `border-success/40 bg-success/10 text-success`; `destructive` → `border-destructive/40 bg-destructive/10 text-destructive`; `neutral` → `border-border bg-muted text-foreground`.

### shard-009-F07 · nit · medium · type
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:136` — `className="text-[10px] uppercase tracking-wider opacity-80"`
- **Rule:** design-system §2 "10 · `text-[10px]` · **600, `uppercase tracking-wider text-muted-foreground`** · Eyebrow: KPI label"
- **Current:** eyebrow at default weight 400 with `opacity-80`.
- **Expected:** `text-[10px] font-semibold uppercase tracking-wider` (`dashboard.tsx:382`). Opacity is acceptable here because the card is already tinted (§3 "De-emphasis by opacity").
- **Change:** `class-level` — add `font-semibold`.

### shard-009-F08 · should · medium · radius
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:70` — `<div className="overflow-hidden rounded-md border">`
- **Rule:** design-system §4 "12px (token) · `rounded-lg` · all cards… truck drawer, DegradedStrip" ; `rounded-md` is reserved for "Button, SelectTrigger, nav links… popover/menu surfaces" | §13 D-R3 (inner wells `rounded-md` is a trips deviation)
- **Current:** list container at `rounded-md`.
- **Expected:** `rounded-lg` like the truck drawer box (`dashboard.tsx:841`).
- **Change:** `class-level` — `rounded-md` → `rounded-lg`.

### shard-009-F09 · nit · low · colour
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:77` — `r.error && 'bg-destructive/5'`
- **Rule:** design-system §3 "Status tint recipe … 10% tint" | §13 D-C6 "Icon-well / tag alpha: `X/10` vs `X/5`"
- **Current:** 5% destructive wash on failed rows.
- **Expected:** `/10` alpha step (`dashboard.tsx:1031`).
- **Change:** `class-level` — `bg-destructive/5` → `bg-destructive/10`.

### shard-009-F10 · blocker · high · a11y
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:81` — `<XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />` (also `:83` CheckCircle2, `:110` X)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** status/close icons have no `aria-hidden`; the per-row state is already conveyed by the text (`r.error` message or metrics), the close button has a visible label.
- **Expected:** `aria-hidden` on decorative icons (`dashboard.tsx:1043`).
- **Change:** `class-level` — add `aria-hidden="true"` to the three icons.

### shard-009-F11 · should · high · buttons
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:110` — `<X className="me-1.5 h-3.5 w-3.5" />`
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule… icons inside a Button carry no size classes" | §14 C-S7 "one gap, no extra margin"
- **Current:** dead `h-3.5 w-3.5` (overridden by `[&_svg]:size-4`) plus `me-1.5` on top of the Button's `gap-2` = 14px between icon and label.
- **Expected:** bare icon; Button's own `gap-2` (`src/shared/ui/button.tsx:7`, `dashboard.tsx:1043`).
- **Change:** `class-level` — `<X className="me-1.5 h-3.5 w-3.5" />` → `<X aria-hidden="true" />`.

### shard-009-F12 · should · high · i18n/locale
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:91` — `{r.osrm_distance_km?.toFixed(2)} km · {r.osrm_duration_min?.toFixed(0)} min` (and `:95-96` `· Δ … km`)
- **Rule:** design-system §9 "Copy… all go through `t()`" (C-I4) | §2 "Number formatting: `formatNumber(v, decimals)`… Decimals by unit: … km 0" | vercel-rules "Locale & i18n" bullet "Numbers/currency: use `Intl.NumberFormat`"; "Typography" bullet "Non-breaking spaces"
- **Current:** untranslated `km`, `min`, `Δ` literals; `toFixed()` formatting; `undefined` renders as blank when the optional values are null.
- **Expected:** `formatNumber(...)` + translated units with `&nbsp;` (`src/shared/lib/format.ts:20-23`, `dashboard.tsx:648`).
- **Change:** `class-level` — `{r.osrm_distance_km?.toFixed(2)} km` → `{r.osrm_distance_km != null ? formatNumber(r.osrm_distance_km, 2) : '—'}&nbsp;{t('common.km','km')}`; same for `min` (`t('common.min','min')`) and the `Δ` line (`t('feeMappings.bulkEnrich.delta','Δ')`). Additive keys in en/ar.
- **Notes:** the metrics `div` should also be `font-mono tabular-nums` per §2 "Figures are mono + tabular" — fold into the same edit.

### shard-009-F13 · should · medium · touch
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:49` — `<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">`
- **Rule:** vercel-rules "Touch & Interaction" bullet "`overscroll-behavior: contain` in modals/drawers/sheets" | design-system §6 "CommandList … with `overscroll-contain`"
- **Current:** scrolling body inside the dialog without overscroll containment.
- **Expected:** `overscroll-contain` on the scroll container (`src/shared/ui/command.tsx:63-71`).
- **Change:** `class-level` — add `overscroll-contain`.

### shard-009-F14 · nit · medium · i18n
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:86` — `<div className="truncate font-medium">{r.drop_off_point}</div>`
- **Rule:** design-system §9 "Bidi text: `dir="auto"` on free-text labels and mixed values"
- **Current:** Arabic/Latin drop-off names rendered without a direction hint.
- **Expected:** `dir="auto"` (`dashboard.tsx:498`).
- **Change:** `class-level` — add `dir="auto"`.

### shard-009-F15 · blocker · high · a11y/forms
- **Where:** `src/widgets/fee-mappings/fee-mappings-filters.tsx:57` — `<Input type="search" placeholder={…} value={state.search} …className="ps-9" />`
- **Rule:** vercel-rules "Accessibility" bullet "Form controls need `<label>` or `aria-label`" | "Forms" bullet "Inputs need `autocomplete` and meaningful `name`" | "Accessibility" bullet "Decorative icons need `aria-hidden`" (`:56` Search icon)
- **Current:** placeholder-only search field; no `name`/`autoComplete`; the leading `Search` icon is not hidden.
- **Expected:** labelled control like the header search (`src/widgets/header/header.tsx:21-23`, translated aria per C-I4).
- **Change:** `class-level` — add `aria-label={t('feeMappings.filters.searchPlaceholder')}`, `name="search"`, `autoComplete="off"`, `spellCheck={false}` to the Input; add `aria-hidden="true"` to the `Search` icon.

### shard-009-F16 · should · high · controls
- **Where:** `src/widgets/fee-mappings/fee-mappings-filters.tsx:73` — `<SelectTrigger className="h-9 w-[180px]">` (also `:92`; Clear button `:116` `className="h-9 gap-1 text-xs"`, icon `:119` `h-3.5 w-3.5`)
- **Rule:** design-system §5.1 "chrome rows are `h-8` — scope trigger, company select, mobile filters" (C-B3); §5.4 "scope bar overrides to `h-8 w-auto min-w-32 gap-2`" | §5.1 "icons inside a Button carry no size classes" | §13 D-B1 (`sm` raised to `h-9` is a trips deviation)
- **Current:** two selects and the Clear button at 36px in a filter row; Clear icon carries a dead size.
- **Expected:** `h-8` for toolbar controls (`src/widgets/scope-bar/scope-bar.tsx:66,108`); `sm` Button is already `h-8 text-xs`.
- **Change:** `class-level` — both `h-9 w-[180px]` → `h-8 w-auto min-w-32`; Clear `className="h-9 gap-1 text-xs"` → `className="gap-1.5"`; `<X className="h-3.5 w-3.5" />` → `<X aria-hidden="true" />`.
- **Notes:** the Input at `h-9` beside them then needs `className="h-8 ps-9"` to align (Input recipe is `h-9`, provisional §12.2).

### shard-009-F17 · nit · medium · type
- **Where:** `src/widgets/fee-mappings/fee-mappings-filters.tsx:126` — `{filteredCount} / {mappings.length}`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`)"; "Number formatting: `formatNumber`"
- **Current:** sans `tabular-nums`, raw integers.
- **Expected:** `font-mono tabular-nums` with `formatNumber(n, 0)` (`dashboard.tsx:1003`).
- **Change:** `class-level` — add `font-mono`; render `formatNumber(filteredCount, 0)` / `formatNumber(mappings.length, 0)`.

### shard-009-F18 · should · medium · navigation & state
- **Where:** `src/widgets/fee-mappings/fee-mappings-filters.tsx:22` — `state: FeeMappingsFilterState; onChange: …`
- **Rule:** vercel-rules "Navigation & State" bullet "URL reflects state—filters, tabs, pagination, expanded panels in query params"
- **Current:** search/company/accuracy live in parent component state; not reflected in the URL.
- **Expected:** filter state in query params as the scope bar does (`src/shared/scope/use-scope.ts`, §12.7 provisional `?q` pattern).
- **Change:** `structural` — `out-of-shard: src/pages/fee-mappings/*` (the owner of `state`); no change inside this widget.

### shard-009-F19 · should · high · shadow
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:172` — `<Card>`
- **Rule:** design-system §4 "**Shadow.** None on any dashboard card, panel, tile… Cards are `border bg-card` with **no shadow**" | §13 D-R1 "`Card` = `rounded-lg … shadow-sm`"
- **Current:** trips `Card` primitive brings `shadow-sm`.
- **Expected:** `rounded-lg border bg-card` without shadow (`dashboard.tsx:135`).
- **Change:** `class-level` — `<Card>` → `<Card className="shadow-none">`.

### shard-009-F20 · should · medium · spacing
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:173` — `<CardContent className="p-4 sm:p-5">`
- **Rule:** design-system §1 "**12px** · panel body padding, KPI card padding" | §13 D-S3 (card body `p-4`/`p-6` is a trips deviation)
- **Current:** 16/20px body padding.
- **Expected:** `p-3` (`dashboard.tsx:146`).
- **Change:** `class-level` — `p-4 sm:p-5` → `p-3`.

### shard-009-F21 · should · medium · type
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:179` — `<h3 className="text-sm font-semibold">`
- **Rule:** design-system §2 "Eyebrow… one label style above every figure and panel" (`text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`) | §13 D-T3 (form card headings `text-sm font-semibold` listed as a deviation)
- **Current:** 14px sentence-case card title.
- **Expected:** panel-title eyebrow (`dashboard.tsx:1001`).
- **Change:** `class-level` — `text-sm font-semibold` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`.
- **Notes:** Arabic titles keep the size; `uppercase` is a no-op there. The 24px icon well beside it (`:176`) may look large against a 10px label — consider `h-5 w-5` with `h-3 w-3` icon, but that is taste, not a rule.

### shard-009-F22 · should · high · i18n
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:203` — `placeholder="Watanya"` (also `:220` `"Cairo"`, `:236` `"Qena"`)
- **Rule:** design-system §9 "Copy… all go through `t()` with `defaultValue` fallbacks (C-I4)" | vercel-rules "Forms" bullet "Placeholders end with `…` and show example pattern"
- **Current:** hard-coded Latin example placeholders, no ellipsis.
- **Expected:** translated placeholders (`src/widgets/scope-bar/scope-bar.tsx:109` pattern).
- **Change:** `class-level` — `placeholder={t('feeMappings.form.placeholders.company', 'Watanya…')}` etc.; additive keys in en/ar.

### shard-009-F23 · blocker · high · a11y
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:177` — `<Pencil className="h-3 w-3" />` / `<Plus className="h-3 w-3" />` (also `:241` Sparkles, `:277` X, `:282` Loader2)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** decorative icons exposed to AT next to visible text.
- **Expected:** `aria-hidden` (`dashboard.tsx:431`).
- **Change:** `class-level` — add `aria-hidden="true"` to each.

### shard-009-F24 · should · high · motion
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:282` — `<Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />`
- **Rule:** design-system §8 "Looping… both with `motion-reduce:animate-none` (C-M2)"; "Nothing else loops; the `RefreshCw` retry icon never spins" | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`" | §13 D-ST4
- **Current:** spinner with no reduced-motion guard.
- **Expected:** every loop carries `motion-reduce:animate-none` (`src/shared/ui/skeleton.tsx:4`, `dashboard.tsx:227`).
- **Change:** `class-level` — add `motion-reduce:animate-none`.

### shard-009-F25 · should · high · buttons
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:277` — `<X className="me-1.5 h-3.5 w-3.5" />` (also `:282` Loader2 `me-1.5 h-3.5 w-3.5`)
- **Rule:** design-system §5.1 "icons inside a Button carry no size classes" | §14 C-S7 "one gap, no extra margin"
- **Current:** dead 14px size classes and `me-1.5` stacked on the Button's `gap-2`.
- **Expected:** bare icon, Button gap (`button.tsx:7`).
- **Change:** `class-level` — drop `me-1.5 h-3.5 w-3.5` from both (keep `animate-spin motion-reduce:animate-none` on Loader2).

### shard-009-F26 · should · medium · forms
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:321` — `<Input id={id} type={type} step={step} value={value} …/>`
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`"; "Use correct `type`… and `inputmode`"; "`autocomplete="off"` on non-auth fields"
- **Current:** number inputs have no `name`, `inputMode` or `autoComplete`.
- **Expected:** `name`, `inputMode="decimal"`, `autoComplete="off"`.
- **Change:** `class-level` (additive props) — in `Field`, pass `name={id}`, `autoComplete="off"`, and `inputMode={type === 'number' ? 'decimal' : undefined}`.

### shard-009-F27 · should · medium · states/forms
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:145` — `toast.error(t('feeMappings.form.validation.fillRequired'))`
- **Rule:** vercel-rules "Forms" bullet "Errors inline next to fields; focus first error on submit" | design-system §7 "Failures are **inline and persistent** — a strip or muted copy in place — never a toast" | provisional (§12.2) validation recipe `border-destructive` + `aria-invalid` + `p text-[11px] font-medium text-destructive`
- **Current:** one generic toast for any invalid field; no field is marked or focused.
- **Expected:** inline message under the offending field with `aria-invalid`/`aria-describedby` (provisional §12.2, `trip-form.tsx:1198-1208`).
- **Change:** `structural` — additive: keep the toast, add per-field `aria-invalid` + `<p className="text-[11px] font-medium text-destructive">` and focus the first invalid control in `handleSubmit`.

### shard-009-F28 · blocker · high · a11y
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:124` — `<MapPin className="h-4 w-4 text-primary" />` (also `:224` Loader2, `:226` Save)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** icons beside visible text without `aria-hidden`.
- **Expected:** `aria-hidden` (`dashboard.tsx:431`).
- **Change:** `class-level` — add `aria-hidden="true"` to the three icons.

### shard-009-F29 · should · high · motion
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:224` — `<Loader2 className="me-1.5 h-4 w-4 animate-spin" />`
- **Rule:** design-system §8 C-M2 "`motion-reduce:animate-none`" | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** unguarded spinner.
- **Expected:** `animate-spin motion-reduce:animate-none` (`skeleton.tsx:4`).
- **Change:** `class-level` — add `motion-reduce:animate-none`.

### shard-009-F30 · should · high · buttons
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:226` — `<Save className="me-1.5 h-4 w-4" />` (also `:224`)
- **Rule:** design-system §14 C-S7 "one gap, no extra margin" | §5.1 "icons inside a Button carry no size classes"
- **Current:** `me-1.5` stacked on the Button's `gap-2`; redundant `h-4 w-4`.
- **Expected:** bare icon (`dashboard.tsx:1043`).
- **Change:** `class-level` — drop `me-1.5 h-4 w-4` on both icons.

### shard-009-F31 · should · high · spacing/colour/radius
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:184` — `"grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-2 text-xs"`
- **Rule:** design-system §3 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells" | §4 C-R1 `rounded-lg` for wells | §6 "**Truck drawer**: `mt-3 rounded-lg border bg-muted/40 p-3 text-[12px]`"
- **Current:** `/30` tint, `rounded-md`, `p-2`, `text-xs`.
- **Expected:** `rounded-lg border bg-muted/40 p-3 text-[12px]` (`dashboard.tsx:841`).
- **Change:** `class-level` — `rounded-md border bg-muted/30 p-2 text-xs` → `rounded-lg border bg-muted/40 p-3 text-[12px]`.

### shard-009-F32 · should · high · type
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:189` — `<div className="font-semibold tabular-nums">` (also `:197`, `:205`)
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values" | §13 D-T5 (sans figures in dialogs is a trips deviation)
- **Current:** sans-serif semibold figures.
- **Expected:** `font-mono tabular-nums` dd values (`dashboard.tsx:501-509`).
- **Change:** `class-level` — `font-semibold tabular-nums` → `font-mono tabular-nums` on the three value divs.

### shard-009-F33 · should · high · i18n/locale
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:190` — `{formatNumber(mapping.distance, 2)} km` (also `:198`; `:207` `${mapping.osrmDurationMin.toFixed(0)} min`)
- **Rule:** design-system §9 C-I4 "Copy… through `t()`" | §2 "`formatNumber(v, decimals)`" | vercel-rules "Typography" bullet "Non-breaking spaces: `10&nbsp;MB`"; "Locale & i18n" bullet "Numbers… `Intl.NumberFormat`"
- **Current:** untranslated `km`/`min` with a breaking space; duration uses `toFixed(0)`.
- **Expected:** `formatNumber(v, 0)` and translated units joined by `&nbsp;`.
- **Change:** `class-level` — `km` → `&nbsp;{t('common.km','km')}`; `${…toFixed(0)} min` → `` `${formatNumber(mapping.osrmDurationMin, 0)} ${t('common.min','min')}` ``. Shares keys with F12.

### shard-009-F34 · nit · high · type
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:208` — `: '—'}`
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`" | §13 D-C11
- **Current:** full-strength em dash.
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`).
- **Change:** `class-level` — wrap the dash in `<span className="opacity-40">—</span>`.

### shard-009-F35 · should · medium · touch
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:134` — `<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">`
- **Rule:** vercel-rules "Touch & Interaction" bullet "`overscroll-behavior: contain` in modals/drawers/sheets"
- **Current:** scrolling dialog body without containment (and a map inside it that captures wheel events).
- **Expected:** `overscroll-contain` (`command.tsx:63-71`).
- **Change:** `class-level` — add `overscroll-contain`.

### shard-009-F36 · nit · medium · RTL/i18n
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:129` — `` `${mapping.company} · ${mapping.terminal} → ${mapping.dropOffPoint}` ``
- **Rule:** design-system §9 "Bidi text: `dir="auto"` on free-text labels and mixed values"; "Directional chevrons get `rtl:rotate-180`"
- **Current:** mixed Arabic/Latin names in a `truncate` description with no `dir`, and a literal `→` that does not mirror in Arabic.
- **Expected:** `dir="auto"` (`dashboard.tsx:498`); direction glyph rendered as an icon with `rtl:rotate-180` or a neutral separator.
- **Change:** `class-level` — add `dir="auto"` to `DialogDescription`; replace ` → ` with ` · ` (the reference's inline separator, §2) or a `<ArrowRight className="inline h-3 w-3 rtl:rotate-180" aria-hidden="true" />`.

### shard-009-F37 · should · medium · forms
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:141` — `<Input id="loc-lat" type="number" step="0.000001" … placeholder="30.044420" />` (also `:155`)
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`"; "correct `type`… and `inputmode`"; "Placeholders end with `…`"
- **Current:** no `name`, `inputMode`, `autoComplete`; example placeholder without ellipsis.
- **Expected:** `name`, `inputMode="decimal"`, `autoComplete="off"`, placeholder `30.044420…`.
- **Change:** `class-level` — add `name="lat"`/`name="lng"`, `inputMode="decimal"`, `autoComplete="off"`; placeholders → `"30.044420…"` / `"31.235712…"`.

### shard-009-F38 · nit · medium · forms
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:221` — `disabled={!coordValid || setLocation.isPending}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request"
- **Current:** Save is disabled while coordinates are invalid, so the `invalidCoords` toast path (`:100-103`) is unreachable and the user gets no explanation.
- **Expected:** enabled until the request starts; validation feedback on press.
- **Change:** `class-level` — `disabled={setLocation.isPending}` (the existing `coordValid` guard in `handleSave` already blocks submission).
- **Notes:** provisional §12.2 (trips sticky footer) does "disabled until valid" — this finding follows the frozen Vercel rule; owner may prefer the trips pattern.

### shard-009-F39 · blocker · high · colour
- **Where:** `src/widgets/fee-mappings/fee-mappings-stats.tsx:98` — `info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't." | §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"
- **Current:** Tailwind blue for the "conservative" bucket.
- **Expected:** a token status colour; must agree with the badge (F01).
- **Change:** `class-level` — `info` → `'bg-warning/10 text-warning'`; drop the `dark:` class.
- **Notes:** keep the `'info'` tone key (renaming would touch the prop union); only its class string changes.

### shard-009-F40 · should · high · type
- **Where:** `src/widgets/fee-mappings/fee-mappings-stats.tsx:113` — `"truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground"`
- **Rule:** design-system §2 "10 · `text-[10px]` · **600, `uppercase tracking-wider text-muted-foreground`** · Eyebrow: KPI label"; "`tracking-wider` only on the eyebrow" | §13 D-T3 ("`tracking-widest` once")
- **Current:** `font-medium tracking-widest`.
- **Expected:** `font-semibold tracking-wider` (`dashboard.tsx:382`).
- **Change:** `class-level` — `font-medium … tracking-widest` → `font-semibold … tracking-wider`.

### shard-009-F41 · should · high · type
- **Where:** `src/widgets/fee-mappings/fee-mappings-stats.tsx:116` — `<p className="text-lg font-semibold leading-tight tabular-nums">{value}</p>`
- **Rule:** design-system §2 "22 · `text-[22px]` · 600, `leading-none`, **mono** + `tabular-nums` · **KPI value**" | §6 "KPI card… `dd` 22px mono value" | §13 D-T7
- **Current:** sans 18px KPI value.
- **Expected:** `font-mono text-[22px] font-semibold leading-none tabular-nums` (`dashboard.tsx:436`).
- **Change:** `class-level` — `text-lg font-semibold leading-tight tabular-nums` → `font-mono text-[22px] font-semibold leading-none tabular-nums`; render `formatNumber(value, 0)`.

### shard-009-F42 · should · medium · spacing
- **Where:** `src/widgets/fee-mappings/fee-mappings-stats.tsx:76` — `"grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5"`
- **Rule:** design-system §1 "**12px** · KPI grid gap"; "KPI row: `grid grid-cols-2 gap-3` + `lg:grid-cols-4`" | §13 D-S5
- **Current:** 8px gap between KPI cards.
- **Expected:** `gap-3` (`dashboard.tsx:359`).
- **Change:** `class-level` — `gap-2` → `gap-3` (keep the 5-column count; the page has five stats).

### shard-009-F43 · blocker · high · a11y
- **Where:** `src/widgets/fee-mappings/fee-mappings-stats.tsx:42` — `icon: <MapPin className="h-3.5 w-3.5" />` (also `:49`, `:56`, `:63`, `:70`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** five decorative well icons without `aria-hidden`.
- **Expected:** `aria-hidden` (`dashboard.tsx:431`).
- **Change:** `class-level` — add `aria-hidden="true"` to each icon element (or to the wrapping `<span>` at `:104`).

### shard-009-F44 · nit · medium · locale
- **Where:** `src/widgets/fee-mappings/fee-mappings-stats.tsx:116` — `{value}`
- **Rule:** design-system §2 "Number formatting: `formatNumber(v, decimals)` = `Intl.NumberFormat`" | vercel-rules "Locale & i18n" bullet "Numbers… `Intl.NumberFormat`"
- **Current:** raw integer (no grouping above 999).
- **Expected:** `formatNumber(value, 0)` (`src/shared/lib/format.ts:20-23`).
- **Change:** `class-level` — `{value}` → `{formatNumber(value, 0)}` (import from `@/shared/lib/format`). Covered by F41's edit if applied together.

### shard-009-F45 · blocker · high · colour/type
- **Where:** `src/widgets/fee-mappings/fee-mappings-table.tsx:130` — `<span className="block text-end font-semibold tabular-nums">{formatCurrency(row.original.fee)}</span>`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`" | §3 "Money (amber) `text-money` on figures"
- **Current:** sans semibold fee in the default foreground.
- **Expected:** `font-mono tabular-nums text-money` (`dashboard.tsx:641`, `:522`).
- **Change:** `class-level` — `font-semibold tabular-nums` → `font-mono tabular-nums text-money`.

### shard-009-F46 · blocker · high · a11y
- **Where:** `src/widgets/fee-mappings/fee-mappings-table.tsx:145` — `<Button size="icon" variant="ghost" … title={…}>` (also `:162`, `:171`)
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`" | provisional (§12.4) row actions "ghost icon `h-7 w-7` with `aria-label`+`title`"
- **Current:** three icon-only buttons rely on `title` alone; icons have no `aria-hidden`.
- **Expected:** `aria-label` mirroring `title` (`src/widgets/theme-toggle/theme-toggle.tsx:25`).
- **Change:** `class-level` — add `aria-label={…same expression as title…}` to each Button and `aria-hidden="true"` to `MapPin`/`Pencil`/`Trash2`.

### shard-009-F47 · nit · high · buttons
- **Where:** `src/widgets/fee-mappings/fee-mappings-table.tsx:160` — `<MapPin className="h-3.5 w-3.5" />` (also `:169`, `:178`)
- **Rule:** design-system §5.1 "icons inside a Button carry no size classes" (§15.4)
- **Current:** dead 14px size classes; rendered at 16px.
- **Expected:** bare icons (`header.tsx:23`).
- **Change:** `class-level` — drop `h-3.5 w-3.5` on the three icons.
- **Notes:** if 14px was intended inside `h-7 w-7`, that needs a Button-level override and would be a rule change — leave at 16px.

### shard-009-F48 · nit · high · type
- **Where:** `src/widgets/fee-mappings/fee-mappings-table.tsx:86` — `{v != null ? formatNumber(v, 2) : '—'}` (also `:102`)
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`"
- **Current:** full-strength dash in a muted span.
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`).
- **Change:** `class-level` — wrap both dashes in `<span className="opacity-40">—</span>`.

### shard-009-F49 · should · high · i18n/locale
- **Where:** `src/widgets/fee-mappings/fee-mappings-table.tsx:102` — `` `${v.toFixed(0)} min` ``
- **Rule:** design-system §9 C-I4 "Copy… through `t()`" | §2 "`formatNumber`" | vercel-rules "Typography" bullet "Non-breaking spaces"
- **Current:** `toFixed` and an untranslated `min` with a breaking space.
- **Expected:** `formatNumber(v, 0)` + `t('common.min','min')` joined by ` `.
- **Change:** `class-level` — `` `${v.toFixed(0)} min` `` → `` `${formatNumber(v, 0)} ${t('common.min', 'min')}` ``. Shares the key with F12/F33.

### shard-009-F50 · nit · medium · i18n
- **Where:** `src/widgets/fee-mappings/fee-mappings-table.tsx:59` — `<span className="block max-w-[180px] truncate" title={row.original.dropOffPoint}>` (also `:45` company, `:52` terminal)
- **Rule:** design-system §9 "Bidi text: `dir="auto"` on free-text labels and mixed values"
- **Current:** Arabic/Latin names without a direction hint in `text-start` cells.
- **Expected:** `dir="auto"` (`dashboard.tsx:498`, `:982`).
- **Change:** `class-level` — add `dir="auto"` to the three text spans.

### shard-009-F51 · nit · low · colour
- **Where:** `src/widgets/fee-mappings/fee-mappings-table.tsx:150` — `'h-7 w-7 text-success hover:bg-success/10 hover:text-success'`
- **Rule:** design-system §3 "Actionable (navy)… navy marks anything you can act on"; "Success… passing status only" | §14 C-C4 "`hover:bg-accent` on chrome and menu items"
- **Current:** an action button coloured success to encode "has a location", with a bespoke green hover.
- **Expected:** action buttons in navy/ghost (`text-primary hover:bg-primary/10` as the sibling edit button `:165`, or the ghost default `hover:bg-accent`); status is better shown by a dot/`Badge`.
- **Change:** `class-level` — `text-success hover:bg-success/10 hover:text-success` → `text-primary hover:bg-primary/10`; keep the `title`/`aria-label` text as the state signal.
- **Notes:** low confidence — the mapping of "located" to a status is a judgment; the two `title` strings already distinguish the states.

## Summary
FINDINGS: 51 (blocker 10 / should 29 / nit 12)
