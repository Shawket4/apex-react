# Findings — shard-022

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/trip-form/drop-off-picker-modal.tsx` | 276 | audited | no rule: icon well `h-8 w-8 rounded-md bg-muted` beside a row (only D-B11 for company cards); `ScrollArea h-[340px]` list height; PAGE_SIZE pager text `text-xs text-muted-foreground` (provisional §12.4 pagination strip matches). |
| `src/widgets/trip-form/duplicate-comparison-dialog.tsx` | 276 | audited | no rule: 3-column diff grid layout, `contents` wrapper, `max-h-[60vh]` scroll body; `bg-warning/10` changed-cell tint matches the status tint recipe. |
| `src/widgets/trip-form/trip-form.tsx` | 1331 | audited | no rule: `sticky bottom-4` submit footer (provisional §12.2 only); `hover:bg-destructive/10` on the remove button; ConfirmDialog/MultiSelect/SearchableSelect/DatePicker internals are out-of-shard primitives (`shared/ui/*`) and are not graded here; `Card` primitive's own `shadow-sm` is out-of-shard (`shared/ui/card.tsx`, D-R1). |
| `src/widgets/trip-location-dialog/trip-location-dialog.tsx` | 466 | audited | no rule: Leaflet/Google marker colours on the map surface itself (third hues allowed in maps); `MapView` is out-of-shard (`shared/ui/map-view.tsx`); `max-w-4xl` full-bleed dialog is provisional §12.6. |

## Findings

### shard-022-F01 · blocker · high · colour
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:207` — `<span className="tabular-nums text-success">{formatCurrency(fee)}</span>`
- **Rule:** design-system §3 "Money (amber) `text-money` on figures … reusing the success green for it is what made a figure look like a badge"; §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"; `index.css` palette rule "amber marks anything someone gets paid"; §13 row D-C1
- **Current:** fee shown in green, sans `tabular-nums`
- **Expected:** `font-mono tabular-nums text-money` (`dashboard.tsx:641` fuel-row price)
- **Change:** `class-level` — `tabular-nums text-success` → `font-mono tabular-nums text-money`
- **Notes:** the same fee is rendered again in the form preview (F13); keep both identical.

### shard-022-F02 · blocker · high · a11y
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:240` — `<Button size="icon" variant="ghost" className="h-7 w-7" disabled={currentPage === 1}` (and `:252`)
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"; design-system §9 "aria-labels … all go through `t()`" (C-I4)
- **Current:** prev/next page buttons contain only a chevron; no accessible name
- **Expected:** `aria-label={t('common.previous')}` / `aria-label={t('common.next')}` (pattern: `header.tsx:21` `aria-label={t('common.openMenu')}`)
- **Change:** `class-level` (additive prop) — add `aria-label={t(…)}` to both Buttons; `out-of-shard: src/shared/i18n/en.json, ar.json` if the keys do not already exist
- **Notes:** also see F05 for the dead icon size classes on the same buttons.

### shard-022-F03 · blocker · high · focus
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:135` — `'flex w-full items-center gap-2.5 rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-start transition-colors hover:bg-muted/60'` (and the row button at `:185`)
- **Rule:** design-system §4 "Focus ring. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element (C-B1)"; vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*`"
- **Current:** raw `<button>` rows with no focus-visible ring (browser default outline only)
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`dashboard.tsx:735` fleet tile); rows inside the `overflow-hidden`-like ScrollArea should use `ring-inset` (`dashboard.tsx:616`)
- **Change:** `class-level` — `:135` append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; `:185` append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`

### shard-022-F04 · should · high · colour
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:136` — `value === UNREGISTERED_VALUE && 'border-solid border-primary bg-primary/5'` (and `:187` `isSelected && 'bg-primary/5'`)
- **Rule:** design-system §14 C-C1 "Selected fill → `bg-primary/10 text-primary` (+ `border-primary` on tiles)"; §3 "Current / selected wash `bg-primary/10 text-primary`"; §13 row D-C10
- **Current:** selected option `bg-primary/5`, no foreground change
- **Expected:** `bg-primary/10 text-primary` (`dashboard.tsx:737` selected tile; `sidebar.tsx:230` active nav)
- **Change:** `class-level` — `:136` `bg-primary/5` → `bg-primary/10 text-primary`; `:187` `bg-primary/5` → `bg-primary/10 text-primary`

### shard-022-F05 · should · high · hover
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:135` — `hover:bg-muted/60` (and `:186` `'hover:bg-muted/60'`)
- **Rule:** design-system §14 C-C4 "`hover:bg-muted/50` on content rows/cards"; §3 "Content-row hover `hover:bg-muted/50`"; §13 row D-C3
- **Current:** `hover:bg-muted/60`
- **Expected:** `hover:bg-muted/50` (`dashboard.tsx:616`)
- **Change:** `class-level` — `hover:bg-muted/60` → `hover:bg-muted/50` at both sites

### shard-022-F06 · should · high · loading
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:156` — `<div className="flex h-full items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />`
- **Rule:** design-system §7 "Loading is always the `Skeleton` primitive shaped like the slot"; §7 table "Fuel pending `space-y-2 p-3` of 4 × `Skeleton h-10 w-full rounded-none`"; §13 row D-ST4
- **Current:** centred spinner while the drop-off list loads; no `motion-reduce` guard
- **Expected:** `space-y-2 p-3` of `Skeleton h-10 w-full rounded-none` rows (`dashboard.tsx:599-604`)
- **Change:** `structural` — replace the spinner block with `<div className="space-y-2 p-3">` + 4 × `<Skeleton className="h-10 w-full rounded-none" />` (Skeleton import needed from `@/shared/ui/skeleton`)

### shard-022-F07 · should · medium · type
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:195` — `<span className="truncate text-sm font-medium">{dropOff}</span>` (and `:141`)
- **Rule:** design-system §2 "13 `text-[13px]` 500 `leading-snug` — Exception row label — row-title size"
- **Current:** row title at 14px `text-sm`
- **Expected:** `text-[13px] font-medium leading-snug` (`dashboard.tsx:960`)
- **Change:** `class-level` — `text-sm font-medium` → `text-[13px] font-medium leading-snug` at `:195` and `:141`
- **Notes:** these are user-entered Arabic place names; add `dir="auto"` on the span (§9 "Bidi text: `dir="auto"` on free-text labels").

### shard-022-F08 · should · medium · buttons
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:267` — `<Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>`
- **Rule:** design-system §5.1 "`ghost` … Cancel"; §13 row D-B4 "Cancel/Close: ghost `h-7 text-xs` (popover) | outline default `h-9` in dialogs"
- **Current:** outline, default 36px
- **Expected:** `variant="ghost"` (`scope-date-picker.tsx` Cancel is ghost)
- **Change:** `class-level` — `variant="outline"` → `variant="ghost"`
- **Notes:** dialog-footer height has no dashboard rule (dialogs are a §12 gap); only the variant is graded.

### shard-022-F09 · nit · high · buttons
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:247` — `<ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />` (and `:259`)
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes"
- **Current:** dead `h-3.5 w-3.5` overridden by `[&_svg]:size-4`
- **Expected:** no size classes (`header.tsx:23`)
- **Change:** `class-level` — `h-3.5 w-3.5 rtl:rotate-180` → `rtl:rotate-180` at both sites

### shard-022-F10 · nit · medium · i18n
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:203` — `{formatNumber(distance, 1)} km`
- **Rule:** design-system §9 "Copy … all go through `t()`" (C-I4); §13 row D-I2 (untranslated units 'L', 'Vol (L)', 'Dist (km)')
- **Current:** literal English unit `km` after a formatted number
- **Expected:** unit inside a translated string, e.g. `t('common.units.km', { value: formatNumber(distance, 1) })`
- **Change:** `class-level` (string) — wrap in `t()`; `out-of-shard: src/shared/i18n/en.json, ar.json` for the key

### shard-022-F11 · nit · medium · touch
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:126` — `autoFocus`
- **Rule:** vercel-rules "Touch & Interaction" bullet "`autoFocus` sparingly—desktop only, single primary input; avoid on mobile"; "Anti-patterns" bullet "`autoFocus` without clear justification"
- **Current:** search input autofocuses on every open, including phones (opens the keyboard over the list)
- **Expected:** gate on desktop, e.g. `autoFocus={isDesktop}` via `useIsDesktop()` (`shared/hooks/use-media-query.ts`, a reference hook)
- **Change:** `class-level` (prop) — `autoFocus` → `autoFocus={useIsDesktop()}` (hook called at component top)

### shard-022-F12 · nit · low · empty
- **Where:** `src/widgets/trip-form/drop-off-picker-modal.tsx:163` — `lottieWidth={80} lottieHeight={80} … className="border-0 bg-transparent py-4 shadow-none"`
- **Rule:** design-system §7 "the palette strips it to `border-0 bg-transparent py-6 shadow-none` with `no_results.json` at 110px"; §13 row D-ST6
- **Current:** 80px lottie, `py-4`
- **Expected:** 110px, `py-6` (`command-palette.tsx:273-281`)
- **Change:** `class-level` — `lottieWidth={110} lottieHeight={110}`, `py-4` → `py-6`

### shard-022-F13 · blocker · high · colour
- **Where:** `src/widgets/trip-form/trip-form.tsx:1295` — `<span className="inline-flex items-center gap-1 tabular-nums text-success">{formatCurrency(fee)}</span>`
- **Rule:** design-system §3 "Money (amber) `text-money` on figures"; §14 C-T1 "`font-mono tabular-nums text-money`"; `index.css` palette rule "amber marks anything someone gets paid"; §13 row D-C1
- **Current:** driver fee preview in green, sans
- **Expected:** `font-mono tabular-nums text-money` (`dashboard.tsx:641`)
- **Change:** `class-level` — `tabular-nums text-success` → `font-mono tabular-nums text-money`

### shard-022-F14 · should · high · colour
- **Where:** `src/widgets/trip-form/trip-form.tsx:663` — `<Card className="border-warning/30 bg-warning/5">` and `:665` `rounded-full bg-warning/20 text-warning`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … never a solid status fill"; §14 C-C3 "`border-warning/40`"; §13 rows D-C6, D-C8
- **Current:** `/30` border, `/5` fill, `/20` icon well
- **Expected:** `border-warning/40 bg-warning/10`; icon well `bg-warning/10` (`dashboard.tsx:1021` DegradedStrip; `:221` badge)
- **Change:** `class-level` — `:663` `border-warning/30 bg-warning/5` → `border-warning/40 bg-warning/10`; `:665` `bg-warning/20` → `bg-warning/10`

### shard-022-F15 · should · high · colour
- **Where:** `src/widgets/trip-form/trip-form.tsx:1013` — `'border-success/30 bg-success/5 text-success' : 'border-warning/30 bg-warning/5 text-warning'` (also `:1139`, `:1167` `border-warning/30 bg-warning/5`)
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"; §14 C-C3; §13 row D-C8 "Warning banner … dashed `border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`"
- **Current:** `/30` borders and `/5` fills on the capacity, receipt-pattern and duplicate banners
- **Expected:** `border-warning/40 bg-warning/10` / `border-success/40 bg-success/10`; the warning strip is also `rounded-lg border-dashed … px-3 py-2.5 text-[12.5px]` (`dashboard.tsx:1021`)
- **Change:** `class-level` — at `:1011-1014` `'flex items-start gap-2.5 rounded-md border px-3 py-2 text-xs'` → `'flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[12.5px]'` and alphas `/30`→`/40`, `/5`→`/10`; at `:1139` and `:1167` `rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs` → `rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`
- **Notes:** the strip icon in the reference is `mt-0.5 h-3.5 w-3.5 text-warning`; `:1018/:1020` use `h-4 w-4` — align to `h-3.5 w-3.5`.

### shard-022-F16 · should · high · colour
- **Where:** `src/widgets/trip-form/trip-form.tsx:1030` — `<div className="text-foreground/80">` (also `:1146`, `:1173`)
- **Rule:** design-system §14 C-C5 "`text-muted-foreground` for secondary *text*; opacity only for secondary parts of an already-coloured element"; §13 row D-C9
- **Current:** banner body copy at `text-foreground/80`
- **Expected:** `text-muted-foreground` (`dashboard.tsx:106`, `:442`)
- **Change:** `class-level` — `text-foreground/80` → `text-muted-foreground` at all three sites

### shard-022-F17 · should · high · type
- **Where:** `src/widgets/trip-form/trip-form.tsx:692` — `<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">` (and `:819`)
- **Rule:** design-system §2 "10 `text-[10px]` 600, `uppercase tracking-wider text-muted-foreground` — Eyebrow … one label style above every figure and panel"; §13 row D-T3
- **Current:** 14px uppercase section heading
- **Expected:** `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (`dashboard.tsx:1001` PanelHead)
- **Change:** `class-level` — `text-sm` → `text-[10px]` at `:692` and `:819`

### shard-022-F18 · should · high · colour
- **Where:** `src/widgets/trip-form/trip-form.tsx:1109` — `'rounded-lg border bg-muted/20 p-3 md:p-4'`
- **Rule:** design-system §14 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"; §3 "Sub-surface tint … `bg-muted/40` wells"; §13 row D-C5
- **Current:** repeater item well at `bg-muted/20`, `p-3 md:p-4`
- **Expected:** `bg-muted/40 p-3` (`dashboard.tsx:841` truck drawer `mt-3 rounded-lg border bg-muted/40 p-3`)
- **Change:** `class-level` — `bg-muted/20 p-3 md:p-4` → `bg-muted/40 p-3`

### shard-022-F19 · should · medium · shadow
- **Where:** `src/widgets/trip-form/trip-form.tsx:901` — `sticky bottom-4 flex flex-col-reverse gap-2 rounded-lg border bg-card p-3 shadow-md`
- **Rule:** design-system §4 "Shadow. None on any dashboard card, panel, tile … Elevation is reserved for controls and floating layers"; §13 row D-R1
- **Current:** `shadow-md` on a card-styled footer
- **Expected:** `border bg-card` with no shadow (`dashboard.tsx:135` panels)
- **Change:** `class-level` — remove `shadow-md`
- **Notes:** the footer is sticky over content; if a separation cue is wanted the reference idiom is tone + hairline, not shadow.

### shard-022-F20 · should · medium · spacing
- **Where:** `src/widgets/trip-form/trip-form.tsx:660` — `<div className="space-y-6">` and `:691` `CardContent className="space-y-4 p-4 md:p-6"` (also `:817`, `:1313`, `:1325`)
- **Rule:** design-system §1 "**12px** … gap between every top-level block, panel body padding … one vertical rhythm"; §13 rows D-S3, D-S4
- **Current:** 24px block rhythm, 16/24px card padding
- **Expected:** `gap-3`/`space-y-3` between blocks and `p-3` panel body (`dashboard.tsx:99`, `:146`)
- **Change:** `class-level` — `:660` `space-y-6` → `space-y-3`; `:691`, `:817`, `:1313`, `:1325` `p-4 md:p-6` → `p-3` (keep `space-y-4`/`space-y-3` inner stacks; the field grid gap is provisional §12.2 and untouched)
- **Notes:** `FormSkeleton` (`:1311`) must move with it so the loading frame doesn't reflow (C-S6).

### shard-022-F21 · should · medium · forms
- **Where:** `src/widgets/trip-form/trip-form.tsx:1257` — `<Label className="text-xs">{t('trips.fields.dropOffPoint')}`
- **Rule:** vercel-rules "Forms" bullet "Labels clickable (`htmlFor` or wrapping control)"; "Accessibility" bullet "Form controls need `<label>` or `aria-label`"
- **Current:** the drop-off label has no `htmlFor`; the picker Button (`:1261`) has no `id`, so the label neither focuses nor names the control
- **Expected:** `htmlFor={`dropoff-${idx}`}` + `id={`dropoff-${idx}`}` on the Button (pattern: `:1186` + `:1191`)
- **Change:** `class-level` (additive props) — add `htmlFor` to the Label and matching `id` to the Button

### shard-022-F22 · should · medium · forms
- **Where:** `src/widgets/trip-form/trip-form.tsx:591` — `toast.error(t('trips.form.validation.fillRequired'));` (also `:595`, `:600`)
- **Rule:** vercel-rules "Forms" bullet "Errors inline next to fields; focus first error on submit"; design-system §7 "Failures are **inline and persistent** — a strip or muted copy in place — never a toast"
- **Current:** validation failures surface as transient toasts
- **Expected:** inline strip in place (`dashboard.tsx:1018-1047` DegradedStrip recipe) and focus moved to the first invalid field
- **Change:** `structural` — render a `DegradedStrip`-style `div` above the submit footer bound to a `submitError` state (additive), keep the existing toast calls (do not delete), and call `.focus()` on the first invalid control
- **Notes:** the toast calls are handlers and must stay; the inline strip is additive.

### shard-022-F23 · should · medium · forms
- **Where:** `src/widgets/trip-form/trip-form.tsx:911` — `disabled={!isValid || capacityBlocked || receiptPatternBlocked || isPending}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request"
- **Current:** submit disabled until every field is valid; the user gets no feedback on what is missing
- **Expected:** enabled until `isPending`; validation reported inline on click (see F22)
- **Change:** `class-level` (prop) — `disabled={isPending}`; keep the guard logic inside `submit()` (already present at `:590-611`)
- **Notes:** provisional §12.2 records "disabled until valid" as trips' current behaviour; the frozen Vercel bullet is the rule, provisional §12 is not.

### shard-022-F24 · should · medium · forms
- **Where:** `src/widgets/trip-form/trip-form.tsx:130` — `export function TripForm({ parentId }: TripFormProps) {`
- **Rule:** vercel-rules "Forms" bullet "Warn before navigation with unsaved changes (`beforeunload` or router guard)"
- **Current:** no `beforeunload` / `useBlocker`; a long multi-container entry is lost on accidental navigation
- **Expected:** a router guard (`useBlocker` from react-router-dom 7) or `beforeunload` while the form is dirty and not pending
- **Change:** `structural` — add an effect registering `beforeunload` when `containers`/fields differ from their initial values and `!isPending`

### shard-022-F25 · nit · medium · forms
- **Where:** `src/widgets/trip-form/trip-form.tsx:1195` — `placeholder="WT-12345"`
- **Rule:** vercel-rules "Forms" bullets "Placeholders end with `…` and show example pattern"; "Inputs need `autocomplete` and meaningful `name`"; "`autocomplete="off"` on non-auth fields"; design-system §13 row D-I2 (placeholder 'WT-12345' untranslated)
- **Current:** literal placeholder, no `name`, no `autoComplete`, no `spellCheck={false}` on a code field
- **Expected:** `placeholder={t('trips.form.placeholder.receipt')}` ending in `…`, `name={`receipt-${idx}`}`, `autoComplete="off"`, `spellCheck={false}`; the capacity input (`:1223`) gets `inputMode="decimal"` and `autoComplete="off"`
- **Change:** `class-level` (additive props) as listed; `out-of-shard: src/shared/i18n/en.json, ar.json` for the placeholder key

### shard-022-F26 · nit · high · buttons
- **Where:** `src/widgets/trip-form/trip-form.tsx:834` — `<SplitSquareHorizontal className="h-3.5 w-3.5" />` (also `:848`, `:683`, `:1131`, `:1271`, `:914`, `:916`)
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes"
- **Current:** per-icon size classes that `[&_svg]:size-4` overrides
- **Expected:** no size class (`header.tsx:23`)
- **Change:** `class-level` — drop `h-3.5 w-3.5` / `h-4 w-4` from the seven icons (keep `animate-spin` on `:914`)

### shard-022-F27 · nit · medium · radius
- **Where:** `src/widgets/trip-form/trip-form.tsx:1000` — `rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground`
- **Rule:** design-system §14 C-R4 "`border-border/60` for dashed hairlines"; C-R1 "token family: `rounded-lg` everywhere"; C-C2 wells `/40`
- **Current:** dashed hint box `rounded-md`, full-strength dashed border, `bg-muted/30`
- **Expected:** `rounded-lg border border-dashed border-border/60 bg-muted/40` (`dashboard.tsx:497`, `:841`)
- **Change:** `class-level` — `rounded-md border border-dashed bg-muted/30` → `rounded-lg border border-dashed border-border/60 bg-muted/40`

### shard-022-F28 · nit · medium · i18n
- **Where:** `src/widgets/trip-form/trip-form.tsx:1032` — `{formatNumber(total, 1)} L` (also `:1034`, `:1038`, `:1291` `km`, `:713` `${c.tank_capacity}L`)
- **Rule:** design-system §9 "Copy … all go through `t()`" (C-I4); §13 row D-I2 (untranslated 'L')
- **Current:** literal English units; `:713` also bypasses `formatNumber`
- **Expected:** units inside translated strings; numbers via `formatNumber` (§2 "Number formatting: `formatNumber(v, decimals)`")
- **Change:** `class-level` (strings) — wrap in `t('common.units.litres', { value })` / `t('common.units.km', { value })`; `:713` `${c.tank_capacity}L` → `t('common.units.litres', { value: formatNumber(c.tank_capacity, 0) })`; `out-of-shard: src/shared/i18n/en.json, ar.json`

### shard-022-F29 · nit · medium · type
- **Where:** `src/widgets/trip-form/trip-form.tsx:1031` — `<span className="tabular-nums">{formatNumber(total, 1)} L</span>` (also `:1289` distance)
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`)"; §13 row D-T5 "forms … use no `font-mono` at all"
- **Current:** sans `tabular-nums`
- **Expected:** `font-mono tabular-nums` (`dashboard.tsx:648`)
- **Change:** `class-level` — `tabular-nums` → `font-mono tabular-nums` at `:1031`, `:1036`, `:1289`

### shard-022-F30 · nit · medium · loading
- **Where:** `src/widgets/trip-form/trip-form.tsx:704` — `<Skeleton className="h-10 w-full" />` (also `:732`, `:776`, `:1316-1320`)
- **Rule:** design-system §7 "Loading is always the `Skeleton` primitive shaped like the slot"; §12.2 provisional "Input `h-9` … so controls line up at 36px"
- **Current:** 40px skeleton standing in for a 36px control
- **Expected:** `h-9`
- **Change:** `class-level` — `h-10` → `h-9` at all five sites

### shard-022-F31 · blocker · high · rtl
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:76` — `<ScrollArea className="max-h-[60vh] pr-2">`
- **Rule:** design-system §14 C-I1 "logical utilities everywhere"; §9 "Rule C-I1: no physical `ml-/mr-/left-/right-` utilities"; §13 row D-I1
- **Current:** `pr-2` — padding lands on the wrong side in Arabic
- **Expected:** `pe-2` (`select.tsx:109` `pe-2`)
- **Change:** `class-level` — `pr-2` → `pe-2`

### shard-022-F32 · should · high · type
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:154` — `<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">`
- **Rule:** design-system §2 eyebrow "`text-[10px]` 600 `uppercase tracking-wider text-muted-foreground`"; §13 row D-T3
- **Current:** 12px eyebrow
- **Expected:** `text-[10px]` (`dashboard.tsx:1001`)
- **Change:** `class-level` — `text-xs` → `text-[10px]`
- **Notes:** `:247` and `:261` use `text-[10px] uppercase tracking-wider` without `font-semibold` — add `font-semibold` there for the same eyebrow.

### shard-022-F33 · should · high · i18n
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:101` — `existing.date ? format(existing.date, 'PPP') : '—'` (and `:102`)
- **Rule:** design-system §14 C-I2 "day-first `d MMM yyyy` everywhere"; §2 "lists and drawers `d MMM yyyy`"; §13 row D-T16
- **Current:** `PPP` (e.g. "April 29th, 2026")
- **Expected:** `format(x, 'd MMM yyyy')` (`dashboard.tsx:869`)
- **Change:** `class-level` (format string) — `'PPP'` → `'d MMM yyyy'` at both sites

### shard-022-F34 · should · medium · type
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:159` — `<span className="ms-2 text-sm font-semibold tabular-nums">#{dup.receipt_no}</span>`
- **Rule:** design-system §2 "Figures are mono + tabular … the mono carries receipt numbers, plates" (§0.1 comment); §13 row D-T5
- **Current:** receipt number in sans
- **Expected:** `font-mono tabular-nums` (`dashboard.tsx:843` plate `text-[15px] font-semibold font-mono`)
- **Change:** `class-level` — `text-sm font-semibold tabular-nums` → `font-mono text-sm font-semibold tabular-nums`

### shard-022-F35 · should · medium · lists
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:152` — `<div className="flex items-center justify-between border-b px-3 py-2">`
- **Rule:** design-system §6 "Panel head: `flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §13 row D-C4
- **Current:** untinted head row inside a `rounded-lg border bg-card` panel; parent lacks `overflow-hidden` so a tint would not clip
- **Expected:** `border-b bg-muted/60 px-3 py-2` + `overflow-hidden` on the panel (`dashboard.tsx:135`, `:1001`)
- **Change:** `class-level` — `:150` `rounded-lg border bg-card` → `overflow-hidden rounded-lg border bg-card`; `:152` add `gap-2 bg-muted/60`

### shard-022-F36 · should · medium · colour
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:62` — `rounded-full bg-warning/15 text-warning`
- **Rule:** design-system §3 "Status tint recipe … 10% tint"; §13 row D-C6 "Icon-well / tag alpha `X/10` vs `X/15`"
- **Current:** `bg-warning/15`
- **Expected:** `bg-warning/10` (`dashboard.tsx:221`)
- **Change:** `class-level` — `bg-warning/15` → `bg-warning/10`

### shard-022-F37 · nit · medium · locale
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:133` — `` `${existing.tank_capacity} L` `` (and `:137`)
- **Rule:** vercel-rules "Locale & i18n" bullet "Numbers/currency: use `Intl.NumberFormat` not hardcoded formats"; design-system §2 "`formatNumber(v, decimals)`"; §13 row D-I2
- **Current:** raw number interpolated, literal `L`
- **Expected:** `t('common.units.litres', { value: formatNumber(x, 1) })`
- **Change:** `class-level` (string) — use `formatNumber` + `t()`; `out-of-shard: src/shared/i18n/en.json, ar.json`

### shard-022-F38 · nit · high · chips
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:164` — `rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground`
- **Rule:** design-system §5.3 "Method chip `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`" (C-T3)
- **Current:** `text-[10px]`
- **Expected:** `text-[10.5px]` (`dashboard.tsx:583`)
- **Change:** `class-level` — `text-[10px]` → `text-[10.5px]`

### shard-022-F39 · nit · low · radius
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:243` — `'col-span-1 flex flex-col rounded px-2 py-1 sm:col-span-1'` (and `:257`)
- **Rule:** design-system §4 "4px `rounded` — category bar track+fill, kbd chips" (only); §13 row D-R3 "`rounded` (diff cells)"
- **Current:** 4px radius on a tinted text cell
- **Expected:** `rounded-sm` (8px, the smallest token step used on text-sized boxes — `dashboard.tsx:456` skeleton text bars)
- **Change:** `class-level` — `rounded` → `rounded-sm` at both sites

### shard-022-F40 · nit · medium · motion
- **Where:** `src/widgets/trip-form/duplicate-comparison-dialog.tsx:213` — `<Loader2 className="h-4 w-4 animate-spin" />` (also `trip-form.tsx:914`)
- **Rule:** design-system §14 C-M2 "`motion-reduce:animate-none`"; §8 "Reduced motion … opt-out is per element"; vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"; §13 row D-ST4
- **Current:** spinning icon with no reduced-motion guard
- **Expected:** `animate-spin motion-reduce:animate-none` (`dashboard.tsx:227`)
- **Change:** `class-level` — append `motion-reduce:animate-none` (and drop the dead size class per §5.1)

### shard-022-F41 · blocker · high · rtl
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:279` — `absolute bottom-3 left-3 z-[1000] flex items-center gap-3 rounded-md border bg-background/90`
- **Rule:** design-system §14 C-I1 "logical utilities everywhere"; §9 C-I1 "no physical `ml-/mr-/left-/right-` utilities"; §13 row D-I1
- **Current:** `left-3` legend pinned to the physical left in RTL
- **Expected:** `start-3` (`dashboard.tsx:741` `end-1.5`)
- **Change:** `class-level` — `left-3` → `start-3`
- **Notes:** `z-[1000]` sits outside the §0.5 scale (D-C14) but is needed above Leaflet panes inside the dialog's own stacking context — recorded, not changed.

### shard-022-F42 · blocker · high · i18n
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:416` — `Retry` (and `:428` `Loading map…`)
- **Rule:** design-system §14 C-I4 "all aria/sr-only strings through `t()`"; §9 "Copy … all go through `t()` with `defaultValue` fallbacks"; §13 row D-I2
- **Current:** hard-coded English UI copy
- **Expected:** `t('common.retry')`, `t('trips.location.loadingMap')`
- **Change:** `class-level` (string) — wrap both in `t()`; `out-of-shard: src/shared/i18n/en.json, ar.json` if keys are missing
- **Notes:** `MapErrorState`/`MapLoadingState` don't call `useTranslation` — add the hook inside them or pass the strings as props.

### shard-022-F43 · blocker · medium · colour
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:392` — `className="h-2.5 w-2.5 rounded-full ring-2 ring-background"`
- **Rule:** design-system §14 C-C8 "Status dot size … → 6px (`h-1.5 w-1.5`). Applied to the legend"; §5.3 "Status dots `h-1.5 w-1.5 rounded-full` everywhere — badge, tile corner, legend"
- **Current:** 10px legend dots
- **Expected:** `h-1.5 w-1.5` (`dashboard.tsx:814`)
- **Change:** `class-level` — `h-2.5 w-2.5` → `h-1.5 w-1.5`
- **Notes:** the marker hex colours themselves are map colours (allowed); only the dot size is graded here. The legend text `text-xs` → `text-[11px]` (§6 "Legend: `text-[11px] text-muted-foreground`") at `:390` and `:287`.

### shard-022-F44 · should · medium · colour
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:454` — `color:#71717a` (popup label) and `:288` `bg-blue-500` (route legend swatch)
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme"; §3 "Non-token colours in the reference: the two scrims and `theme-color`"; §13 row D-C2
- **Current:** popup label uses Tailwind zinc-500 hex; route swatch is Tailwind blue (not `--primary`)
- **Expected:** popup label `color:hsl(var(--muted-foreground))`; route swatch `bg-primary` (navy is the app's only blue) — the marker colours stay as map colours
- **Change:** `class-level` — `:454` `color:#71717a` → `color:hsl(var(--muted-foreground))`; `:288` `bg-blue-500` → `bg-primary`
- **Notes:** the actual polyline colour is drawn by `MapView` (`out-of-shard: src/shared/ui/map-view.tsx`); if it stays blue-500 the swatch must match it — flag for the owner rather than diverge.

### shard-022-F45 · should · medium · colour
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:229` — `rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive` (comment at `:57` says "amber warning banner")
- **Rule:** design-system §3 "Warning … degraded / attention, not failure"; §7 DegradedStrip "`flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`"; §14 C-C5 (secondary text)
- **Current:** destructive-tinted `/5` fill for a "partial data" condition; body at `text-foreground/80`
- **Expected:** warning strip recipe (`dashboard.tsx:1021`); body `text-muted-foreground`
- **Change:** `class-level` — `rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive` → `rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px] text-warning`; `:230` `h-4 w-4` → `h-3.5 w-3.5`; `:235` `text-foreground/80` → `text-muted-foreground`

### shard-022-F46 · should · high · type
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:363` — `truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground`
- **Rule:** design-system §2 eyebrow "600, `uppercase tracking-wider`"; "`tracking-wider` only on the eyebrow"; §13 row D-T3 (`tracking-widest` once)
- **Current:** `font-medium tracking-widest`
- **Expected:** `font-semibold tracking-wider` (`dashboard.tsx:382`)
- **Change:** `class-level` — `font-medium … tracking-widest` → `font-semibold … tracking-wider`

### shard-022-F47 · should · medium · type
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:366` — `<p className="truncate text-sm font-semibold leading-tight">{value}</p>`
- **Rule:** design-system §2 "Figures are mono + tabular"; §6 "KPI card … `dd` 22px mono value"; §13 row D-T5 (dialogs use no `font-mono`)
- **Current:** date / plate / km / minutes in sans
- **Expected:** `font-mono tabular-nums` (`dashboard.tsx:843` drawer plate `text-[15px] font-semibold font-mono`)
- **Change:** `class-level` — `text-sm font-semibold leading-tight` → `font-mono text-sm font-semibold leading-tight tabular-nums`
- **Notes:** Arabic plates must stay sans (§2) — if `car_no_plate` can be Arabic, wrap that one value in `dir="rtl"` sans as `dashboard.tsx:747` does.

### shard-022-F48 · should · high · i18n
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:206` — `value={format(trip.date, 'PPP')}`
- **Rule:** design-system §14 C-I2 "day-first `d MMM yyyy` everywhere"; §13 row D-T16
- **Current:** `PPP`
- **Expected:** `'d MMM yyyy'` (`dashboard.tsx:869`)
- **Change:** `class-level` (format string) — `'PPP'` → `'d MMM yyyy'`

### shard-022-F49 · should · high · colour
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:202` — `grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4` (also `:245`, `:374` `bg-muted/30`)
- **Rule:** design-system §14 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"; §13 row D-C5
- **Current:** `bg-muted/30` wells
- **Expected:** `bg-muted/40` (`dashboard.tsx:841`)
- **Change:** `class-level` — `bg-muted/30` → `bg-muted/40` at `:202`, `:245`, `:374`

### shard-022-F50 · should · medium · error
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:408` — `flex h-full flex-col items-center justify-center gap-3 text-muted-foreground` + `:409` `rounded-full bg-destructive/10 p-3` + `:412` `text-sm` + `:414` `Button variant="outline" size="sm"`
- **Rule:** design-system §7 "DegradedStrip … message + retry `Button variant=outline size=sm` overridden `h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning`"; §14 C-S3 "`py-6 text-center text-xs text-muted-foreground`"; §13 row D-ST2
- **Current:** destructive icon disc, 14px copy, 32px retry
- **Expected:** copy `py-6 text-center text-xs text-muted-foreground`; retry `h-7 px-2.5 gap-1.5 text-xs` (`dashboard.tsx:1041`)
- **Change:** `class-level` — `:412` `text-sm` → `text-xs`; `:414` `className="gap-1.5"` → `className="h-7 px-2.5 gap-1.5 text-xs"`; `:415` drop `h-3.5 w-3.5` (§5.1); `:409-411` `bg-destructive/10` → `bg-warning/10`, `text-destructive` → `text-warning` (degraded, not failure)

### shard-022-F51 · should · medium · loading
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:427` — `<Loader2 className="h-7 w-7 animate-spin text-primary" />`
- **Rule:** design-system §7 "Loading is always the `Skeleton` primitive shaped like the slot"; §14 C-M2; §13 row D-ST4
- **Current:** spinner overlay over the map slot, no reduced-motion guard
- **Expected:** one `Skeleton h-full w-full rounded-lg` filling the 380px slot (`dashboard.tsx:162` fleet pending `Skeleton h-40 rounded-lg`)
- **Change:** `structural` — replace the `MapLoadingState` inner content with `<Skeleton className="absolute inset-0 rounded-lg" />` (keep the component and its render branch); at minimum `class-level` append `motion-reduce:animate-none`

### shard-022-F52 · should · high · loading
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:379` — `<Skeleton className="h-2.5 w-12" />` and `:380` `<Skeleton className="h-3.5 w-20" />`
- **Rule:** design-system §14 C-R2 "a skeleton takes the radius of the box it stands in: … text bars `rounded-sm`"; §7 "KPI drawer pending … `Skeleton h-3.5 rounded-sm`"
- **Current:** default `rounded-md` (10px) on 10–14px-tall text bars
- **Expected:** `rounded-sm` (`dashboard.tsx:459-467`)
- **Change:** `class-level` — append `rounded-sm` to both text-bar skeletons

### shard-022-F53 · nit · high · buttons
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:304` — `<ExternalLink className="h-3 w-3" />` (also `:312`, `:322`, `:415`)
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … carry no size classes"
- **Current:** dead `h-3 w-3` / `h-3.5 w-3.5` inside `Button`
- **Expected:** no size class (`header.tsx:23`)
- **Change:** `class-level` — remove the size classes at all four sites

### shard-022-F54 · nit · medium · i18n
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:216` — `` `${formatNumber(distance, 1)} km` `` and `:221` `` `${durationMin} min` ``
- **Rule:** design-system §9 C-I4 (copy through `t()`); §2 "Number formatting: `formatNumber`"; §13 row D-I2; vercel-rules "Locale & i18n" bullet "Numbers … `Intl.NumberFormat`"
- **Current:** literal `km`/`min`; `durationMin` not passed through `formatNumber`
- **Expected:** `t('common.units.km', { value })`, `t('common.units.min', { value: formatNumber(durationMin, 0) })`
- **Change:** `class-level` (strings); `out-of-shard: src/shared/i18n/en.json, ar.json`

### shard-022-F55 · nit · low · rtl
- **Where:** `src/widgets/trip-location-dialog/trip-location-dialog.tsx:179` — `` `${trip.terminal} → ${trip.drop_off_point}` ``
- **Rule:** design-system §9 "Bidi text: `dir="auto"` on free-text labels and mixed values"
- **Current:** Arabic place names joined by a literal LTR arrow in a `DialogDescription` with no `dir`
- **Expected:** `dir="auto"` on the description (`dashboard.tsx:498`)
- **Change:** `class-level` (additive prop) — `<DialogDescription className="truncate" dir="auto">`

## Summary
FINDINGS: 55 (blocker 9 / should 30 / nit 16)
