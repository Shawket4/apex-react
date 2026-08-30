# Findings — shard-008

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/pages/driver-loans/driver-loan-new.tsx` | 212 | audited | `min-h-11 sm:min-h-9` touch heights: no rule. `pb-[env(safe-area-inset-bottom)]`: no rule (§0.3 `.safe-bottom` exists but is unused by the reference). `PageShell` container/header values (D-S1/D-S2/D-T1) are `out-of-shard: src/shared/ui/page-shell.tsx`. |
| `src/pages/driver-loans/driver-loans.tsx` | 410 | audited | `StatCard` value face (sans, D-T7) and money colour inside `StatCard` are `out-of-shard: src/shared/ui/stat-card.tsx`. Count chip inside the kind filter button (`text-xs opacity-70`): no rule. `d.toLocaleString('default', …)` month names ignore the active i18n language: no rule. Excel column/number formats: no rule. |
| `src/pages/drivers/drivers.tsx` | 60 | audited | Mutation error surfacing lives in the entity hook: no UI here. |
| `src/widgets/drivers-table/drivers-table.tsx` | 188 | audited | `DataTable` row-as-click-target (not `<Link>`), header/td paddings and `SearchInput` labelling are `out-of-shard: src/shared/ui/data-table.tsx`, `src/shared/ui/search-input.tsx`. `StatCard tone` for status counts: no rule (status hues on status counts). |
| `src/pages/error/not-found.tsx` | 31 | audited | Renders outside `<Layout>`; `min-h-dvh` matches the shell's `h-dvh`. |
| `src/pages/error/route-error.tsx` | 100 | audited | `console.error` in render: no rule. `t(key, 'English default')` fallbacks are allowed by C-I4. |
| `src/entities/fee-mapping/api.ts` | 83 | no UI content | — |
| `src/entities/fee-mapping/queries.ts` | 159 | no UI content | — |
| `src/entities/fee-mapping/schemas.ts` | 137 | no UI content | — |
| `src/pages/fee-mappings/fee-mappings.tsx` | 252 | audited | `Card` primitive `shadow-sm` (D-R1) is `out-of-shard: src/shared/ui/card.tsx`. Stats grid is rendered by `FeeMappingsStats` (`out-of-shard: src/widgets/fee-mappings/*`, shard-009); only the skeleton grid is judged here. |

## Findings

### shard-008-F01 · blocker · high · RTL/i18n
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:122` — `<DollarSign className="mr-1 inline h-3.5 w-3.5" />` (also `:147`, `:170`)
- **Rule:** design-system §14 C-I1 "logical utilities everywhere" / §9 "Rule C-I1: no physical `ml-/mr-/left-/right-` utilities"
- **Current:** `mr-1` on the three label icons — in Arabic the icon sits flush against the label with the gap on the wrong side.
- **Expected:** `me-1` (`dashboard.tsx` uses `ms-/me-` only; `sidebar.tsx`/`user-menu.tsx` post-ruling)
- **Change:** `mr-1` → `me-1` on lines 122, 147, 170. `class-level`
- **Notes:** page is used in RTL (Arabic driver names).

### shard-008-F02 · blocker · high · buttons & controls
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:97` — `<Button key={k} type="button" className="min-h-11 sm:min-h-9" variant={field.value === k ? 'default' : 'outline'}`
- **Rule:** design-system §14 C-B4 "`aria-pressed` for toggles (tiles, presets)"; §5.2 "Scope presets … `variant` flips `default`↔`outline`, `aria-pressed`"
- **Current:** advance/loan segmented choice is a variant swap with no ARIA state.
- **Expected:** `aria-pressed={field.value === k}` as on the presets (`scope-date-picker.tsx:132-136`).
- **Change:** add `aria-pressed={field.value === k}` to the Button. `class-level` (additive attribute)
- **Notes:** none.

### shard-008-F03 · should · high · motion
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:201` — `<Loader2 className="h-4 w-4 animate-spin" />`
- **Rule:** design-system §8 "Reduced motion: … opt-out is per element (`motion-reduce:animate-none` …)"; §14 C-M2; vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** spinner loops with no reduced-motion guard.
- **Expected:** `animate-spin motion-reduce:animate-none` (as `dashboard.tsx:227` badge dot, `skeleton.tsx`).
- **Change:** `animate-spin` → `animate-spin motion-reduce:animate-none`. `class-level`
- **Notes:** the `h-4 w-4` is dead inside a Button (see F06).

### shard-008-F04 · should · medium · RTL/i18n
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:78` — `<ArrowLeft className="h-4 w-4" />`
- **Rule:** design-system §9 "Directional chevrons get `rtl:rotate-180`"; provisional (§12.7) "Back-to-list `Button outline sm` with `ArrowLeft rtl:rotate-180`"
- **Current:** back arrow points left in Arabic, i.e. away from "back".
- **Expected:** `rtl:rotate-180` (`sidebar.tsx:282`, `dropdown-menu.tsx:28`).
- **Change:** add `rtl:rotate-180`. `class-level`
- **Notes:** same fix in `driver-loans.tsx:168` (F11) and `route-error.tsx:81` (F26).

### shard-008-F05 · should · medium · spacing
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:84` — `className="mx-auto max-w-2xl space-y-6"`
- **Rule:** design-system §1 "**12px** … gap between every top-level block … one vertical rhythm"; §13 D-S4 (forms `space-y-6` is a listed trips deviation — dashboard wins)
- **Current:** 24px between field groups and before the action row.
- **Expected:** `gap-3`/`space-y-3` between blocks (`dashboard.tsx:99`); the field grid's `gap-x-6 gap-y-4` (`:114`) likewise steps to `gap-4` / `gap-3` ladder values (16px column gap is on the ladder; 24px is not).
- **Change:** `space-y-6` → `space-y-3`; `gap-x-6 gap-y-4` → `gap-x-4 gap-y-3`. `class-level`
- **Notes:** PageShell's own `gap-6` is out-of-shard.

### shard-008-F06 · nit · high · buttons & controls
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:78` — `<ArrowLeft className="h-4 w-4" />` (also `:201`, `:203`)
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes"; §15.4
- **Current:** per-icon `h-4 w-4` inside `<Button>` — dead classes overridden by `[&_svg]:size-4`.
- **Expected:** no size class (`dashboard.tsx:1043`, `header.tsx:23`).
- **Change:** drop `h-4 w-4` from the icons on lines 78, 201, 203 (keep `animate-spin`). `class-level`
- **Notes:** cosmetic; the rendered size is already 16px.

### shard-008-F07 · nit · low · forms
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:93` — `<FormLabel>{t('driverLoans.fields.kind')} *</FormLabel>` (also `:123`, `:148`, `:171`)
- **Rule:** provisional (§12.2) "required marker `<span class="text-destructive">*</span>`"
- **Current:** bare ` *` in the label text.
- **Expected:** `<span className="text-destructive">*</span>` (`trip-form.tsx:701`).
- **Change:** wrap the asterisk: `{t(…)} <span className="text-destructive">*</span>`. `structural` (adds an element)
- **Notes:** provisional rule only.

### shard-008-F08 · should · medium · forms
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:126` — `<Input type="number" step="any" min="0" placeholder="0" {...field}`
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`", "Use correct `type` … and `inputmode`", "`autocomplete="off"` on non-auth fields"
- **Current:** amount and method inputs carry `name` via `field` but no `autoComplete`/`inputMode`.
- **Expected:** `autoComplete="off"` on both; `inputMode="decimal"` on the amount.
- **Change:** add `autoComplete="off" inputMode="decimal"` to the amount Input (line 126) and `autoComplete="off"` to the method Input (line 174). `class-level` (additive attributes)
- **Notes:** none.

### shard-008-F09 · blocker · medium · a11y
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:122` — `<DollarSign className="mr-1 inline h-3.5 w-3.5" />` (also `:75`, `:78`, `:147`, `:170`, `:201`, `:203`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9 "`aria-hidden` on dots/chevrons/severity bars/sentinel"
- **Current:** decorative lucide icons beside visible text are exposed to assistive tech.
- **Expected:** `aria-hidden="true"` (`dashboard.tsx:749` dot, `:431` chevron).
- **Change:** add `aria-hidden="true"` to each listed icon. `class-level` (additive attribute)
- **Notes:** every icon here sits next to a text label, so none needs a label of its own.

### shard-008-F10 · blocker · high · colour roles
- **Where:** `src/pages/driver-loans/driver-loans.tsx:322` — `'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/20'` (also `:331` `bg-green-100 text-green-600 …`, `:347` `bg-green-100 text-green-700 hover:bg-green-100 …`)
- **Rule:** design-system §0.2 palette rule "Adding a third accent colour breaks the whole scheme, so don't"; §3 "Success | `text-success`, `border-success/40 bg-success/10` … passing status only"; §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"
- **Current:** raw Tailwind green palette with hand-written dark variants for the paid row, its icon disc and its badge.
- **Expected:** token success recipe, theme-aware by itself: row `border-success/40 bg-success/10`; disc `bg-success/10 text-success`; badge `<Badge variant="success">` (`badge.tsx` status variants, `dashboard.tsx:678` moving tile).
- **Change:** `:322` → `'border-success/40 bg-success/10'`; `:331` → `'bg-success/10 text-success'`; `:347` `<Badge className="bg-green-100 … text-[10px]">` → `<Badge variant="success">` with no className. `class-level`
- **Notes:** dropping the `dark:` classes is intended — the tokens flip with `.dark`.

### shard-008-F11 · blocker · high · colour roles / type
- **Where:** `src/pages/driver-loans/driver-loans.tsx:343` — `<span className="text-sm font-semibold">{formatCurrency(loan.amount)}</span>`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"; §3 "Money (amber) `text-money` on figures"
- **Current:** loan amount in sans, foreground colour.
- **Expected:** `font-mono text-sm font-semibold tabular-nums text-money` (fuel-row price `dashboard.tsx:641`).
- **Change:** `text-sm font-semibold` → `font-mono text-sm font-semibold tabular-nums text-money`. `class-level`
- **Notes:** the `StatCard` amounts (`:245`, `:250`, `:260`) have the same problem but the face is set by the primitive — `out-of-shard: src/shared/ui/stat-card.tsx`.

### shard-008-F12 · blocker · high · a11y
- **Where:** `src/pages/driver-loans/driver-loans.tsx:369` — `<Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-destructive …" onClick={() => setDeleteTarget(loan)}>`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"; design-system §9 "aria-labels … go through `t()`" (C-I4)
- **Current:** trash icon button with no accessible name.
- **Expected:** `aria-label={t('common.delete')}` (translated, as `scope-bar.tsx:109`).
- **Change:** add `aria-label={t('common.delete')}` (and `title` for hover context, §9). `class-level` (additive attribute)
- **Notes:** `common.delete` already exists (used at `:397`).

### shard-008-F13 · blocker · high · buttons & controls
- **Where:** `src/pages/driver-loans/driver-loans.tsx:172` — `<Badge variant="outline" className="text-xs">` (also `:300` `<Badge variant="secondary" className="text-xs">`)
- **Rule:** design-system §14 C-T3 "the `Badge` primitive now matches [the status pill] (`gap-1.5 px-2.5 py-1 text-[11px]` …)"; §5.3
- **Current:** call sites override the pill back to 12px.
- **Expected:** the primitive's `text-[11px]` (`badge.tsx:6`).
- **Change:** remove `className="text-xs"` from both Badges. `class-level`
- **Notes:** the year-count badge at `:300` is a neutral count; `variant="secondary"` is fine.

### shard-008-F14 · should · medium · tables/lists
- **Where:** `src/pages/driver-loans/driver-loans.tsx:295` — `<div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">` + `:296` `text-sm font-semibold`
- **Rule:** design-system §6 "Panel head: `h2 … border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` + aside `font-medium normal-case tracking-normal`"; §14 C-C2 "`/60` head band"
- **Current:** year header band at `/50`, `px-4 py-2.5`, 14px semibold title.
- **Expected:** PanelHead recipe (`dashboard.tsx:999-1005`).
- **Change:** `border-b bg-muted/50 px-4 py-2.5` → `border-b bg-muted/60 px-3 py-2`; inner `text-sm font-semibold` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`. `class-level`
- **Notes:** the `Calendar` icon can stay (`h-3.5 w-3.5` → `h-3 w-3` to sit in the 10px line). Structural upgrade to `<h2>` is optional.

### shard-008-F15 · blocker · medium · colour roles
- **Where:** `src/pages/driver-loans/driver-loans.tsx:309` — `rounded-md bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary`
- **Rule:** design-system §0.2 palette rule "Navy marks anything you can act on"; §3 "Neutral chip `bg-muted text-muted-foreground` … non-status chips are neutral"; §14 C-C2 (tint alphas `/60 /50 /40`; `/5` is not a step)
- **Current:** a non-interactive month label wears the actionable navy at a non-scale alpha.
- **Expected:** neutral chip `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground` (`dashboard.tsx:583`), or the eyebrow style (§2 10px).
- **Change:** `rounded-md bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary` → `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`. `class-level`
- **Notes:** the unpaid-row icon disc `bg-primary/10 text-primary` (`:332`) is a neutral "money owed" marker, not an action either — consider `bg-muted text-muted-foreground` (medium confidence, folded here).

### shard-008-F16 · should · medium · buttons & controls
- **Where:** `src/pages/driver-loans/driver-loans.tsx:320` — `'flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors'` + `:323` `'hover:border-border/80 hover:bg-muted/30'`
- **Rule:** design-system §5.2 "Untracked tile … no hover/transition — motion/hover signal interactivity; non-interactive tiles carry neither"; §14 C-C4 "`hover:bg-muted/50` on content rows/cards"
- **Current:** a plain `<div>` row (not a link/button) changes border and background on hover, at a non-scale `/30`.
- **Expected:** no hover on a non-interactive row (`dashboard.tsx:781-786`); if the row is later made a link, `hover:bg-muted/50`.
- **Change:** remove `transition-colors` and `hover:border-border/80 hover:bg-muted/30` from the row classes. `class-level`
- **Notes:** the row's only control is the delete button, which has its own hover.

### shard-008-F17 · should · low · spacing
- **Where:** `src/pages/driver-loans/driver-loans.tsx:291` — `<div className="space-y-4">`
- **Rule:** design-system §1 "**12px** … gap between every top-level block"
- **Current:** 16px between year cards.
- **Expected:** `gap-3` / `space-y-3` (`dashboard.tsx:99`; the loading skeleton on `:268` already uses `space-y-3`).
- **Change:** `space-y-4` → `space-y-3`. `class-level`
- **Notes:** the month block `p-3 md:p-4` (`:307`) matches the panel-body `p-3` at base; `md:p-4` has no reference counterpart but is on the ladder — left.

### shard-008-F18 · should · medium · RTL/i18n
- **Where:** `src/pages/driver-loans/driver-loans.tsx:168` — `<ArrowLeft className="h-4 w-4" />`
- **Rule:** design-system §9 "Directional chevrons get `rtl:rotate-180`"; provisional (§12.7)
- **Current:** back arrow not mirrored in Arabic.
- **Expected:** `rtl:rotate-180`.
- **Change:** add `rtl:rotate-180`. `class-level`
- **Notes:** —

### shard-008-F19 · blocker · medium · a11y
- **Where:** `src/pages/driver-loans/driver-loans.tsx:297` — `<Calendar className="h-4 w-4 text-muted-foreground" />` (also `:160`, `:168`, `:206`, `:211`, `:283`, `:310`, `:336`, `:338`, `:354`, `:359`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9
- **Current:** decorative icons next to text are not hidden from assistive tech.
- **Expected:** `aria-hidden="true"`.
- **Change:** add `aria-hidden="true"` to each listed icon. `class-level`
- **Notes:** the `Trash2` at `:375` is the only icon that conveys meaning; once the button has an `aria-label` (F12) it can also be hidden.

### shard-008-F20 · nit · high · buttons & controls
- **Where:** `src/pages/driver-loans/driver-loans.tsx:168` — `<ArrowLeft className="h-4 w-4" />` (also `:206`, `:211`, `:283`, `:375`)
- **Rule:** design-system §5.1 "icons inside a Button carry no size classes"
- **Current:** dead `h-4 w-4` on icons inside `<Button>`.
- **Expected:** no size class.
- **Change:** drop `h-4 w-4` (keep `rtl:rotate-180` from F18). `class-level`
- **Notes:** —

### shard-008-F21 · should · medium · touch
- **Where:** `src/pages/drivers/drivers.tsx:46` — `<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">`
- **Rule:** vercel-rules "Touch & Interaction" bullet "`overscroll-behavior: contain` in modals/drawers/sheets"; design-system §6 "CommandList … with `overscroll-contain`"
- **Current:** the dialog body scrolls without overscroll containment, so a flick at the end scrolls the page behind.
- **Expected:** `overscroll-contain` on the scrolling element (`command.tsx:63-71`).
- **Change:** `max-w-2xl max-h-[90vh] overflow-y-auto` → `max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain`. `class-level`
- **Notes:** provisional (§12.6) prefers a `flex max-h-[90vh] flex-col gap-0 p-0` shell with an inner scrolling body so the header stays put — `structural`, optional.

### shard-008-F22 · should · medium · spacing
- **Where:** `src/widgets/drivers-table/drivers-table.tsx:117` — `<div className="space-y-6">`
- **Rule:** design-system §1 "**12px** … gap between every top-level block"
- **Current:** 24px between stats, toolbar and table.
- **Expected:** `space-y-3` (`dashboard.tsx:99`).
- **Change:** `space-y-6` → `space-y-3`. `class-level`
- **Notes:** —

### shard-008-F23 · should · medium · spacing
- **Where:** `src/widgets/drivers-table/drivers-table.tsx:119` — `<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">`
- **Rule:** design-system §1 "KPI row: `grid grid-cols-2 gap-3` + `lg:grid-cols-4` (money) / `lg:grid-cols-3` (no money)"
- **Current:** a four-column grid holding three cards leaves an empty fourth cell from `sm` up.
- **Expected:** column count follows the card count: `grid grid-cols-2 gap-3 lg:grid-cols-3` (`dashboard.tsx:359`).
- **Change:** `sm:grid-cols-4` → `lg:grid-cols-3`. `class-level`
- **Notes:** —

### shard-008-F24 · blocker · medium · a11y
- **Where:** `src/widgets/drivers-table/drivers-table.tsx:70` — `<Users className="h-4 w-4" />` (also `:76`, `:89`, `:101`, `:106`, `:151`, `:179`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9
- **Current:** decorative icons exposed to assistive tech.
- **Expected:** `aria-hidden="true"`.
- **Change:** add `aria-hidden="true"` to each listed icon; drop the dead `h-4 w-4` on `:151`, `:179` (§5.1). `class-level`
- **Notes:** —

### shard-008-F25 · nit · low · loading/empty
- **Where:** `src/widgets/drivers-table/drivers-table.tsx:171` — `lottieSrc="/animations/no_results.json" lottieWidth={100} lottieHeight={100}`
- **Rule:** design-system §7 "`EmptyState` primitive … lottie 120×120"; §13 D-ST6 (sizes 70–140 across trips are a listed deviation)
- **Current:** 100px.
- **Expected:** the primitive's default 120 (`empty-state.tsx`).
- **Change:** remove `lottieWidth`/`lottieHeight` overrides or set both to 120. `class-level`
- **Notes:** `driver-loans.tsx:276` already uses 120; `not-found.tsx:16` uses 180 (F27).

### shard-008-F26 · nit · low · i18n
- **Where:** `src/widgets/drivers-table/drivers-table.tsx:90` — `{row.original.transporter || 'Apex'}`
- **Rule:** vercel-rules "Locale & i18n" bullet "Brand names, code tokens, identifiers: wrap with `translate="no"`"
- **Current:** brand fallback rendered as plain text.
- **Expected:** `<span translate="no">Apex</span>`.
- **Change:** wrap the cell text in `<span translate="no">`. `structural` (adds an element)
- **Notes:** —

### shard-008-F27 · blocker · high · RTL/i18n
- **Where:** `src/pages/error/not-found.tsx:22` — `<Home className="h-4 w-4 mr-2" />`
- **Rule:** design-system §14 C-I1 "logical utilities everywhere"; §14 C-S7 "one gap, no extra margin"; §5.1 base `gap-2`
- **Current:** physical `mr-2` on top of the Button's own `gap-2` — 16px gap in LTR, icon glued to text in RTL.
- **Expected:** no margin; Button `gap-2` carries the spacing (`dashboard.tsx:1043`).
- **Change:** `h-4 w-4 mr-2` → `` (no className; also removes the dead size class per §5.1) and add `aria-hidden="true"`. `class-level`
- **Notes:** —

### shard-008-F28 · nit · medium · buttons & controls
- **Where:** `src/pages/error/not-found.tsx:21` — `<Button onClick={() => navigate('/')} size="lg" className="mt-4">`
- **Rule:** design-system §5.1 "`lg` h-11 px-6 text-base (unused)"; §7 EmptyState "action `mt-2`"
- **Current:** 44px button at a size the reference never renders, plus `mt-4` on top of EmptyState's own `mt-2` action slot.
- **Expected:** default size (h-9), no extra margin (`empty-state.tsx:57`).
- **Change:** remove `size="lg"` and `className="mt-4"`. `class-level`
- **Notes:** lottie 180×180 (`:16-17`) vs the primitive's 120 — fold into the same edit (nit, D-ST6).

### shard-008-F29 · should · high · radius/border/shadow
- **Where:** `src/pages/error/route-error.tsx:55` — `<Card className="w-full max-w-md shadow-2xl border-2 border-primary/10">`
- **Rule:** design-system §4 "Border. 1px everywhere; no `border-2`. Cards are `border bg-card` with **no shadow**"; §3 "Actionable (navy) … `border-primary`" (a navy border marks an actionable tile)
- **Current:** 2px navy-tinted border and a 2xl drop shadow on a static card.
- **Expected:** `rounded-lg border bg-card` (`dashboard.tsx:135`).
- **Change:** `shadow-2xl border-2 border-primary/10` → `shadow-none`. `class-level`
- **Notes:** `Card` itself adds `shadow-sm` (D-R1, out-of-shard); `shadow-none` neutralises it here.

### shard-008-F30 · should · high · type
- **Where:** `src/pages/error/route-error.tsx:60` — `<CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>` (also `:74` `text-base font-bold`)
- **Rule:** design-system §2 "Weights used: 400, 500, 600. **700 is never used** in the reference"; §13 D-T8
- **Current:** 700 weight on the title and on the refresh button.
- **Expected:** `font-semibold` (page title `dashboard.tsx:103` `text-lg sm:text-xl font-semibold leading-tight`).
- **Change:** `:60` `text-2xl font-bold tracking-tight` → `text-lg font-semibold leading-tight sm:text-xl`; `:74` drop `font-bold`. `class-level`
- **Notes:** —

### shard-008-F31 · should · high · buttons & controls
- **Where:** `src/pages/error/route-error.tsx:74` — `className="w-full gap-2 py-6 text-base font-bold shadow-lg shadow-primary/20" size="lg"`
- **Rule:** design-system §5.1 "`default` | `bg-primary text-primary-foreground shadow-sm`"; "`lg` … (unused)"; §4 "Elevation is reserved for controls and floating layers: `shadow-sm` on filled/outline Button"
- **Current:** a 48px+ button with a tinted `shadow-lg` glow.
- **Expected:** default Button (`h-9`, `shadow-sm`), `w-full` is fine.
- **Change:** `w-full gap-2 py-6 text-base font-bold shadow-lg shadow-primary/20` → `w-full`; remove `size="lg"`. `class-level`
- **Notes:** `:80` `size="lg"` on Go back → remove for the same reason; `gap-2` is already the base.

### shard-008-F32 · should · medium · colour roles
- **Where:** `src/pages/error/route-error.tsx:54` — `bg-muted/30` (also `:72` `bg-muted/20`, `:67` `bg-primary/5 … border-primary/10 … text-primary`)
- **Rule:** design-system §14 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"; §0.2 "Navy marks anything you can act on"
- **Current:** page ground at `/30`, footer band at `/20`; the chunk-load hint is a non-actionable box in navy at `/5`.
- **Expected:** page ground `bg-background` (`layout.tsx`, `not-found.tsx:12`); footer well `bg-muted/40` (`dashboard.tsx:494`); hint as the neutral dashed note `rounded-lg border border-dashed border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground` (§4 dashed = placeholder/degraded; §7 empty/error copy `text-xs text-muted-foreground`).
- **Change:** `:54` `bg-muted/30` → `bg-background`; `:72` `bg-muted/20` → `bg-muted/40`; `:67` `mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10 text-sm font-medium text-primary` → `mt-3 rounded-lg border border-dashed border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground`. `class-level`
- **Notes:** `min-h-screen` (`:54`) → `min-h-dvh` to match the shell's `h-dvh` (§1 shell dimensions) and `not-found.tsx:12`.

### shard-008-F33 · should · medium · RTL/i18n
- **Where:** `src/pages/error/route-error.tsx:81` — `<ChevronLeft className="h-5 w-5" />`
- **Rule:** design-system §9 "Directional chevrons get `rtl:rotate-180`"
- **Current:** "Go back" chevron points the wrong way in Arabic.
- **Expected:** `rtl:rotate-180`.
- **Change:** `h-5 w-5` → `rtl:rotate-180` (size class is dead inside a Button, §5.1). `class-level`
- **Notes:** —

### shard-008-F34 · blocker · medium · a11y
- **Where:** `src/pages/error/route-error.tsx:58` — `<AlertTriangle className="h-8 w-8" />` (also `:75`, `:81`, `:86`, `:90`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9
- **Current:** decorative icons exposed to assistive tech.
- **Expected:** `aria-hidden="true"`.
- **Change:** add `aria-hidden="true"`; drop the dead size classes on the four in-Button icons (`:75`, `:81`, `:86`, `:90`, §5.1). `class-level`
- **Notes:** the `h-16 w-16 rounded-full bg-destructive/10 text-destructive` disc (`:57`) has no dashboard rule; provisional (§12.6) uses `h-10 w-10 rounded-full bg-warning/15` — recorded, not flagged.

### shard-008-F35 · should · medium · type
- **Where:** `src/pages/error/route-error.tsx:63` — `<p className="text-muted-foreground leading-relaxed">`
- **Rule:** design-system §7 / §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground`" for error copy; §13 D-T12 (`leading-relaxed` is a trips deviation)
- **Current:** 16px body with relaxed leading.
- **Expected:** `text-xs text-muted-foreground` (`dashboard.tsx:171`).
- **Change:** `text-muted-foreground leading-relaxed` → `text-xs text-muted-foreground`. `class-level`
- **Notes:** the `CardContent px-8 pb-8` / `CardHeader pt-8` / `CardFooter p-6` paddings (`:56`, `:62`, `:72`) are 32/24px against the `p-3` panel-body rule (§1) — fold in: `pt-8` → `pt-6`, `px-8 pb-8` → `px-6 pb-6`, keep `p-6` for the footer (dialog padding step).

### shard-008-F36 · should · high · loading/empty/error
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:165` — `<Card className="border-destructive/30 bg-destructive/5">` … `:170` `<Button variant="link" size="sm" className="h-auto p-0"`
- **Rule:** design-system §7 "DegradedStrip: `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`; `AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning`; retry `Button variant=outline size=sm` … `h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning hover:text-warning`"; §5.1 `link` variant "not rendered anywhere in the reference"; §14 C-B2 "the strip's Button is the retry"
- **Current:** a destructive-tinted Card with `p-4`, 14px copy and an underlined link-style retry.
- **Expected:** the DegradedStrip recipe (`dashboard.tsx:1018-1047`).
- **Change:** `:165` `border-destructive/30 bg-destructive/5` → `rounded-lg border border-dashed border-warning/40 bg-warning/10 shadow-none`; `:166` `flex items-start gap-3 p-4` → `flex items-start gap-2 px-3 py-2.5 text-[12.5px]`; `:167` `mt-0.5 h-4 w-4 shrink-0 text-destructive` → `mt-0.5 h-3.5 w-3.5 shrink-0 text-warning` (swap `AlertCircle` → `AlertTriangle` optional); `:168` `flex-1 text-sm` → `min-w-0 flex-1`; `:169` drop `font-medium`; `:170-173` `variant="link" size="sm" className="h-auto p-0"` → `variant="outline" size="sm" className="mt-2 h-7 gap-1.5 border-warning/40 px-2.5 text-xs text-warning hover:text-warning"` with a `<RefreshCw />` icon inside. `class-level` (icon insertion is additive)
- **Notes:** `Card`'s own `shadow-sm` is neutralised by `shadow-none`; a query failure is "degraded", not "critical", in the reference's vocabulary (§3).

### shard-008-F37 · should · medium · loading/empty/error
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:185` — `<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">` + `:187` `<Skeleton key={i} className="h-16 rounded-lg" />`
- **Rule:** design-system §7 "Apex pending: `grid grid-cols-2 gap-3` … of … `Skeleton h-[92px] rounded-lg` (matches the KPI footprint so the page does not reflow; C-D2)"; §1 "KPI grid gap-3"
- **Current:** 8px gaps and 64px bars standing in for stat cards.
- **Expected:** the grid the real `FeeMappingsStats` renders, at `gap-3`, with the skeleton the height of a stat card.
- **Change:** `gap-2` → `gap-3`; match the breakpoints/height to `FeeMappingsStats` (`out-of-shard: src/widgets/fee-mappings/fee-mappings-stats.tsx` — read it for the exact grid before editing). `class-level`
- **Notes:** provisional (§12.5) StatCard grid is `grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5`; the dashboard's `gap-3` wins.

### shard-008-F38 · should · high · motion
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:137` — `<Loader2 className="h-3.5 w-3.5 animate-spin" />`
- **Rule:** design-system §8 "opt-out is per element (`motion-reduce:animate-none` …)"; vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** spinner with no reduced-motion guard.
- **Expected:** `animate-spin motion-reduce:animate-none`.
- **Change:** `h-3.5 w-3.5 animate-spin` → `animate-spin motion-reduce:animate-none` (size class dead inside a Button, §5.1; same for `:139`, `:149`). `class-level`
- **Notes:** —

### shard-008-F39 · nit · medium · buttons & controls
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:134` — `className="gap-1.5"` (also `:147`)
- **Rule:** design-system §5.1 base "`gap-2`"; §13 D-B8 "Outline sm gap/icon | `gap-2` + 16px | `gap-1.5` + 14px" (trips deviation — dashboard wins)
- **Current:** header actions tightened to 6px with 14px icons (the icon size is dead anyway).
- **Expected:** primitive `gap-2` + 16px (`header.tsx:23`).
- **Change:** remove `className="gap-1.5"` on both Buttons and the `h-3.5 w-3.5` on their icons. `class-level`
- **Notes:** —

### shard-008-F40 · should · medium · RTL/i18n
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:82` — `` parts.push(`Company: ${filters.company}`) `` (also `:84` `Accuracy:`, `:86` `Search:`)
- **Rule:** design-system §9 "Copy, aria-labels and sr-only text all go through `t()`" (C-I4)
- **Current:** English labels concatenated into the export's filter-summary line.
- **Expected:** `t('feeMappings.export.filterCompany', { value })` etc.
- **Change:** replace the three literals with `t()` keys (add keys to `en.json`/`ar.json` — allowed locale edits). `class-level` (string swap)
- **Notes:** the value reaches the Excel sheet, which follows `i18n.dir()` elsewhere (`driver-loans.tsx:199`).

### shard-008-F41 · should · medium · navigation & state
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:94` — `window.scrollTo({ top: 0, behavior: 'smooth' });`
- **Rule:** design-system §1 "Shell dimensions. Root `flex h-dvh` … the main column becomes its own scroll context instead of letting the whole page scroll past the sidebar"; §8 "Scroll: `scroll-behavior: smooth`"
- **Current:** scrolls the `window`, which never scrolls inside the shell — clicking Edit does not bring the form into view.
- **Expected:** scroll the element into view (`scrollIntoView` on the form container, which honours the global smooth behaviour).
- **Change:** keep the handler; add a `ref` on the form wrapper and call `ref.current?.scrollIntoView({ block: 'start' })` in `handleEdit`. `structural`
- **Notes:** do not delete the existing `window.scrollTo` call if the desktop Tauri shell relies on it — add the `scrollIntoView` alongside.

### shard-008-F42 · should · low · loading/empty/error
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:101` — `toast.success(t('feeMappings.delete.success'));` (also `:104`, `:113`, `:119`)
- **Rule:** design-system §7 "Failures are **inline and persistent** — a strip or muted copy in place — never a toast"; §13 D-ST3 "Feedback channel | inline, never toast | Sonner toasts" (listed for owner ruling)
- **Current:** mutation and export feedback via Sonner toasts.
- **Expected:** inline strip/copy per §7 — but D-ST3 is pending a ruling, so no edit is proposed until the owner rules.
- **Change:** none now — `needs-ruling` (D-ST3). If ruled inline: render a `DegradedStrip`-style row above the table on error.
- **Notes:** recorded so the toast channel is not silently accepted.

### shard-008-F43 · blocker · medium · a11y
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:139` — `<RefreshCw className="h-3.5 w-3.5" />` (also `:149`, `:159`, `:167`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9
- **Current:** decorative icons beside visible text are not hidden.
- **Expected:** `aria-hidden="true"`.
- **Change:** add `aria-hidden="true"` to each listed icon. `class-level`
- **Notes:** —

## Summary
FINDINGS: 43 (blocker 13 / should 23 / nit 7)
