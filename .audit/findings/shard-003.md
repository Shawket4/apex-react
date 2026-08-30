# Findings — shard-003

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/shared/types/index.ts` | 20 | no UI content | types only |
| `src/shared/ui/avatar.tsx` | 44 | reference — not audited | |
| `src/shared/ui/badge.tsx` | 30 | reference — not audited | |
| `src/shared/ui/button.tsx` | 52 | reference — not audited | |
| `src/shared/ui/cairo-range-calendar.tsx` | 167 | reference — not audited | |
| `src/shared/ui/card.tsx` | 54 | audited | `CardTitle` has no size/weight rule beyond §13 D-T4 (no rule for a generic card title) |
| `src/shared/ui/chart-card.tsx` | 82 | audited | inline `height` style for Recharts: no rule |
| `src/shared/ui/checkbox.tsx` | 25 | audited | recipe matches provisional §12.2 except elevation |
| `src/shared/ui/collapsible-section.tsx` | 107 | audited | no-height-animation is deliberate and matches §8 (D-ST8) |
| `src/shared/ui/command.tsx` | 147 | reference — not audited | |
| `src/shared/ui/confirm-dialog.tsx` | 106 | audited | `max-w-[400px]` width: provisional §12.6, no rule; footer `min-w-[80px]`: no rule |
| `src/shared/ui/data-table.tsx` | 311 | audited | pager "n / m" copy and `text-sm text-muted-foreground`: provisional §12.4 only; `pageSize` default 20 so no virtualisation concern |
| `src/shared/ui/date-picker.tsx` | 194 | audited | `MonthYearSelector` is out-of-shard (`month-year-selector.tsx`, §13 D-B5); `role="combobox"` on the trigger: no rule |
| `src/shared/ui/date-range-picker.tsx` | 287 | audited | never imported (PLAN "candidate dead code"); still graded. Summary box `rounded-lg bg-muted p-2.5`: reference summary box classes not recorded in the design system — no rule |
| `src/shared/ui/dialog.tsx` | 115 | reference — not audited | |
| `src/shared/ui/draggable.tsx` | 199 | audited | never imported (PLAN). `touchAction: none`, `willChange` during drag: no rule; layout reads happen in handlers, not render |
| `src/shared/ui/dropdown-menu.tsx` | 170 | reference — not audited | |
| `src/shared/ui/empty-state.tsx` | 59 | reference — not audited | |
| `src/shared/ui/form.tsx` | 170 | audited | `FormItem space-y-2` vs provisional §12.2 `space-y-1` and `FormMessage text-xs` vs provisional `text-[11px]` — provisional only, not raised |
| `src/shared/ui/input.tsx` | 28 | audited | matches §12.2 recipe verbatim; no findings |
| `src/shared/ui/label.tsx` | 18 | audited | |

## Findings

### shard-003-F01 · should · high · radius/border/shadow
- **Where:** `src/shared/ui/card.tsx:8` — `'rounded-lg border bg-card text-card-foreground shadow-sm'`
- **Rule:** design-system §4 "Cards are `border bg-card` with **no shadow** — separation is tone… plus a hairline"; §13 row D-R1
- **Current:** every `Card` carries `shadow-sm`
- **Expected:** `rounded-lg border bg-card` with no shadow (`dashboard.tsx:135`, `:417`; §10 "Panel")
- **Change:** `class-level` — remove `shadow-sm` from the base string: `'rounded-lg border bg-card text-card-foreground'`
- **Notes:** `Card` is consumed by `chart-card.tsx`, `collapsible-section.tsx` (this shard) and by trips/stat-card/form cards elsewhere; all lose the shadow at once, which is the intended coherence.

### shard-003-F02 · should · medium · spacing
- **Where:** `src/shared/ui/card.tsx:17` — `'flex flex-col space-y-1.5 p-6'` (also `:42` `'p-6 pt-0'`, `:49` `'flex items-center p-6 pt-0'`)
- **Rule:** design-system §1 "12px… panel body padding, KPI card padding… the same step is reused at page, card and panel-body level"; §13 row D-S3 "Card/panel body padding — Dash `p-3` / Trips `CardContent p-6`"
- **Current:** `CardHeader`, `CardContent`, `CardFooter` default to 24px padding
- **Expected:** card body padding `p-3` (`dashboard.tsx:146`, `:425`; §10 "Panel … div.p-3")
- **Change:** `class-level` — `CardHeader`: `p-6` → `p-3`; `CardContent`: `p-6 pt-0` → `p-3 pt-0`; `CardFooter`: `p-6 pt-0` → `p-3 pt-0`
- **Notes:** call sites that pass their own padding via `className` (e.g. `CardContent p-4 md:p-6`, §12.2) keep winning through `cn`; only defaults change.

### shard-003-F03 · should · medium · spacing
- **Where:** `src/shared/ui/chart-card.tsx:61` — `"flex items-start justify-between gap-3 border-b px-4 py-3 md:px-5 md:py-4"`
- **Rule:** design-system §6 "Panel head: `h2 class="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 …"`"; §13 row D-S6 "Section head strip — Dash `px-3 py-2` tinted band / Trips … `px-4 py-3 md:px-5 md:py-3.5|4`, no tint"
- **Current:** untinted header, 16–20px × 12–16px padding, `gap-3`
- **Expected:** `border-b bg-muted/60 px-3 py-2 gap-2` (`dashboard.tsx:999-1005`)
- **Change:** `class-level` — `gap-3 border-b px-4 py-3 md:px-5 md:py-4` → `gap-2 border-b bg-muted/60 px-3 py-2`
- **Notes:** keep `items-start` (the description line below the title needs top alignment).

### shard-003-F04 · should · medium · type
- **Where:** `src/shared/ui/chart-card.tsx:63` — `<h3 className="text-sm font-semibold tracking-tight md:text-base">`
- **Rule:** design-system §2 "**10** `text-[10px]` 600, `uppercase tracking-wider text-muted-foreground` — Eyebrow: KPI label, PanelHead"; §13 row D-T4 "Panel/card title — Dash 10px uppercase eyebrow in a tinted band / `ChartCard h3 text-sm md:text-base font-semibold tracking-tight`"
- **Current:** 14→16px sans title, `tracking-tight`
- **Expected:** `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (§10 "Eyebrow"; `dashboard.tsx:1001`)
- **Change:** `class-level` — `text-sm font-semibold tracking-tight md:text-base` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
- **Notes:** the description `<p>` at `:67` (`mt-0.5 text-xs text-muted-foreground`) is acceptable as a PanelHead aside; if it should read as the aside recipe use `text-[10px] font-medium normal-case tracking-normal` (§2 "PanelHead aside").

### shard-003-F05 · should · medium · spacing
- **Where:** `src/shared/ui/chart-card.tsx:75` — `cn(padded && 'p-4 md:p-5', bodyClassName)`
- **Rule:** design-system §1 "12px … panel body padding"; §13 row D-S3 "`p-4 md:p-5` (charts/tables)"
- **Current:** body padding 16px / 20px at md
- **Expected:** `p-3` (`dashboard.tsx:146`)
- **Change:** `class-level` — `'p-4 md:p-5'` → `'p-3'`
- **Notes:** `bodyClassName` still overrides via `cn`.

### shard-003-F06 · nit · medium · radius/border/shadow
- **Where:** `src/shared/ui/checkbox.tsx:13` — `'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow …'`
- **Rule:** design-system §4 "Elevation is reserved for controls and floating layers: `shadow-sm` on filled/outline Button variants, SelectTrigger, calendar endpoints"
- **Current:** unqualified `shadow` (Tailwind's medium shadow) on a 16px control
- **Expected:** control elevation is `shadow-sm` (`button.tsx:11-17`, `select.tsx:18`; `input.tsx:12` in this shard also uses `shadow-sm`)
- **Change:** `class-level` — `shadow` → `shadow-sm`
- **Notes:** none.

### shard-003-F07 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/collapsible-section.tsx:61-69` — `<div … role={alwaysOpen ? undefined : 'button'} tabIndex=… onClick={alwaysOpen ? undefined : toggle}`
- **Rule:** vercel-rules "Accessibility" bullet "`<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)"; "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"
- **Current:** a `<div>` with `role="button"`, `tabIndex`, `onClick` and a hand-rolled Enter/Space handler
- **Expected:** a native `<button type="button" aria-expanded>` as the disclosure control (`dashboard.tsx:418-433` KPI card face)
- **Change:** `structural` — keep the outer header `<div>` as the row (it contains the `actions` slot, which may hold buttons and cannot be nested inside a `<button>`); wrap the icon + title part in `<button type="button" aria-expanded={isOpen} onClick={toggle} className="flex min-w-0 flex-1 items-center gap-3 text-start …">` and move the `ChevronDown` inside it. Keep `onKeyDown`/`onClick`/`role`/`tabIndex` props in place (do not delete handlers); the native button makes them redundant but harmless.
- **Notes:** if the fixer keeps the div (to avoid a structural change), F08 is still required. `alwaysOpen` branch unchanged.

### shard-003-F08 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/collapsible-section.tsx:64` — `'cursor-pointer select-none transition-colors hover:bg-muted/40'`
- **Rule:** design-system §4 "Focus ring. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element (C-B1) … `ring-inset` … inside `overflow-hidden` parents"; §14 C-B1; vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"
- **Current:** focusable header (`tabIndex=0`) with no focus-visible style at all
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` (`dashboard.tsx:431` KPI face inside an `overflow-hidden` card)
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` to the collapsible-only class string at `:64`
- **Notes:** the Card at `:60` is `overflow-hidden`, hence `ring-inset`.

### shard-003-F09 · blocker · high · motion
- **Where:** `src/shared/ui/collapsible-section.tsx:98` — `'h-4 w-4 shrink-0 text-muted-foreground transition-transform'`
- **Rule:** design-system §14 C-M1 "→ Ruling: `duration-200` for every chevron/collapse/icon transition"; §8 "Disclosure: a chevron rotates (`transition-transform duration-200` + `rotate-180`, C-M1)"
- **Current:** `transition-transform` at the 150ms default
- **Expected:** `transition-transform duration-200` (`dashboard.tsx:437`, `sidebar.tsx:281`)
- **Change:** `class-level` — `transition-transform` → `transition-transform duration-200`
- **Notes:** none.

### shard-003-F10 · should · high · colour roles
- **Where:** `src/shared/ui/collapsible-section.tsx:64` — `hover:bg-muted/40`
- **Rule:** design-system §3 "Content-row hover `hover:bg-muted/50` + `transition-colors` — KPI card face"; §14 C-C4 "`hover:bg-muted/50` on content rows/cards"; §13 row D-C3
- **Current:** `hover:bg-muted/40`
- **Expected:** `hover:bg-muted/50` (`dashboard.tsx:425`)
- **Change:** `class-level` — `hover:bg-muted/40` → `hover:bg-muted/50`
- **Notes:** `/40` is the "well" tint per C-C2, not a hover.

### shard-003-F11 · should · medium · spacing
- **Where:** `src/shared/ui/collapsible-section.tsx:63` — `'flex items-center gap-3 border-b px-4 py-3 md:px-5 md:py-3.5'`
- **Rule:** design-system §6 "Panel head … `gap-2 border-b bg-muted/60 px-3 py-2`"; §13 row D-S6
- **Current:** untinted, `px-4 py-3 md:px-5 md:py-3.5`, `gap-3`
- **Expected:** `gap-2 border-b bg-muted/60 px-3 py-2` (`dashboard.tsx:999-1005`)
- **Change:** `class-level` — `gap-3 border-b px-4 py-3 md:px-5 md:py-3.5` → `gap-2 border-b bg-muted/60 px-3 py-2`
- **Notes:** the `title` slot is free content; callers set their own title type (§12.5 "Company card variant"), which is out of this shard.

### shard-003-F12 · should · medium · buttons & controls
- **Where:** `src/shared/ui/collapsible-section.tsx:96-101` — `<ChevronDown className={cn('h-4 w-4 shrink-0 …', isOpen && 'rotate-180')} />`
- **Rule:** design-system §5.2 "KPI card face … `ChevronDown h-3 w-3 transition-transform` → `rotate-180` when open"; §13 row D-L3; §9 "`aria-hidden` on dots/chevrons/severity bars"; vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** 16px chevron, no explicit `aria-hidden`
- **Expected:** `h-3 w-3` + `aria-hidden` (`dashboard.tsx:431-433`)
- **Change:** `class-level` — `h-4 w-4` → `h-3 w-3`; add `aria-hidden="true"` to the icon (additive)
- **Notes:** lucide-react may already emit `aria-hidden`; adding it explicitly matches the reference and is harmless.

### shard-003-F13 · should · high · type
- **Where:** `src/shared/ui/confirm-dialog.tsx:74` — `<DialogTitle className="text-xl font-bold tracking-tight text-center">`
- **Rule:** design-system §2 "Weights used: 400, 500, 600. **700 is never used** in the reference"; §13 rows D-T8, D-T10 "Dialog title — Dash `text-lg font-semibold leading-none tracking-tight` / ConfirmDialog `text-xl font-bold tracking-tight text-center`"
- **Current:** 20px / 700
- **Expected:** the `DialogTitle` default `text-lg font-semibold leading-none tracking-tight` (`dialog.tsx`)
- **Change:** `class-level` — `text-xl font-bold tracking-tight text-center` → `text-center` (let the primitive's size/weight apply)
- **Notes:** `text-center` must stay — the dialog is centred by design (`:59`).

### shard-003-F14 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/confirm-dialog.tsx:100` — `<Loader2 className="h-4 w-4 animate-spin mr-2" />`
- **Rule:** design-system §14 C-I1 "→ Ruling: logical utilities everywhere"; §9 "Rule C-I1: no physical `ml-/mr-/left-/right-` utilities"; §13 row D-I1 "`mr-2` spinner"
- **Current:** `mr-2` — does not mirror in Arabic
- **Expected:** `me-2`
- **Change:** `class-level` — `mr-2` → `me-2`. The `h-4 w-4` is dead inside a `Button` (§5.1 "Icons inside a Button are 16px, by rule") and may be dropped, or left.
- **Notes:** rendered inside `Button`, whose `gap-2` already separates icon and label; `me-2` is then a double gap (C-S7 "one gap, no extra margin") — dropping the margin entirely is the cleaner fix.

### shard-003-F15 · blocker · medium · motion
- **Where:** `src/shared/ui/confirm-dialog.tsx:100` — `animate-spin`
- **Rule:** design-system §8 "Reduced motion: … opt-out is per element (`motion-reduce:animate-none` on the badge dot and the Skeleton primitive)"; §14 C-M2; §13 row D-ST4 "(no motion-reduce guard)"; vercel-rules "Animation" bullet "Honor `prefers-reduced-motion` (provide reduced variant or disable)"
- **Current:** looping spin with no reduced-motion guard
- **Expected:** `animate-spin motion-reduce:animate-none` (`skeleton.tsx`, `dashboard.tsx:227`)
- **Change:** `class-level` — `animate-spin` → `animate-spin motion-reduce:animate-none`
- **Notes:** none.

### shard-003-F16 · should · medium · spacing
- **Where:** `src/shared/ui/confirm-dialog.tsx:59` — `className="max-w-[400px] text-center p-6 gap-6"`; `:85` — `"flex flex-col-reverse sm:flex-row sm:justify-center gap-2 sm:gap-2"`
- **Rule:** design-system §1 "Dialog `w-[calc(100%-2rem)] max-w-lg gap-4 p-6`"; §13 row D-S8 "Dialog padding — Dash `gap-4 p-6`, footer `sm:justify-end` / ConfirmDialog `gap-6`, footer `sm:justify-center`"
- **Current:** `gap-6` between blocks; footer centred
- **Expected:** `gap-4` (`dialog.tsx:43-45`); footer `sm:justify-end` (DialogFooter default)
- **Change:** `class-level` — `:59` `p-6 gap-6` → `p-6 gap-4`; `:85` `sm:justify-center` → `sm:justify-end`. If the owner wants the centred footer kept for the centred layout, keep `sm:justify-center` and apply only the `gap-4` change.
- **Notes:** `gap-2 sm:gap-2` is redundant (`sm:gap-2` no-op) — may be collapsed to `gap-2`.

### shard-003-F17 · blocker · medium · RTL/i18n/a11y
- **Where:** `src/shared/ui/confirm-dialog.tsx:62-70` — `<div className="flex h-20 w-20 …"><React.Suspense …><LazyDotLottieReact … loop autoplay />`
- **Rule:** vercel-rules "Accessibility" bullet "Media controls need keyboard support; decorative media needs assistive-tech hiding"; "Animation" bullet "Muted decorative loops must stop under `prefers-reduced-motion`"
- **Current:** decorative looping animation, not hidden from assistive tech, loops regardless of motion preference
- **Expected:** decorative media `aria-hidden` (§9 "`aria-hidden` on dots/chevrons/severity bars/sentinel"); reference lottie use is limited to empty states (§8 "Lottie loops only in empty states")
- **Change:** `class-level` — add `aria-hidden="true"` to the wrapper `<div>` at `:62` and `motion-reduce:hidden` to its class list (the wrapper keeps its `h-20 w-20` box otherwise). Do not remove the `loop`/`autoplay` props.
- **Notes:** `motion-reduce:hidden` collapses the 80px slot under reduced motion; if the layout jump matters, use `motion-reduce:invisible` instead.

### shard-003-F18 · should · medium · tables/lists
- **Where:** `src/shared/ui/data-table.tsx:180` — `<thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">`; `:186` — `"h-11 px-4 text-start font-medium"`; `:244` — `"px-4 py-3 align-middle"`
- **Rule:** design-system §6 "Panel head … `bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §1 "the standard list row pad is 12px × 10px"; §13 rows D-T3 ("DataTable `text-xs` (th medium)"), D-C4 ("thead … `/50` (DataTable)")
- **Current:** head band `/50`, 12px medium, `px-4` cells, body `px-4 py-3`
- **Expected:** head band `bg-muted/60`, `text-[10px] font-semibold`, cells `px-3`, rows `px-3 py-2.5` (`dashboard.tsx:999-1005`, `:616`)
- **Change:** `class-level` — `:180` `bg-muted/50 text-xs` → `bg-muted/60 text-[10px]`; `:186` `h-11 px-4 text-start font-medium` → `h-10 px-3 text-start font-semibold`; `:244` `px-4 py-3` → `px-3 py-2.5`; `:160` footer `td px-4 py-3` → `px-3 py-2.5`; `:211` skeleton `td p-4` → `px-3 py-2.5`
- **Notes:** consumers that set `meta.align` are unaffected. `h-10` is a judgment (row-pad rhythm); keep `h-11` if header wrapping is a concern.

### shard-003-F19 · should · high · colour roles
- **Where:** `src/shared/ui/data-table.tsx:228` — `'border-b transition-colors last:border-0 hover:bg-muted/40 data-[state=selected]:bg-muted'`
- **Rule:** design-system §3 "Content-row hover `hover:bg-muted/50`"; §14 C-C4; §13 row D-C3 "`bg-muted/40` (… DataTable …)"
- **Current:** `hover:bg-muted/40`
- **Expected:** `hover:bg-muted/50` (`dashboard.tsx:616`)
- **Change:** `class-level` — `hover:bg-muted/40` → `hover:bg-muted/50`
- **Notes:** selected rows should use the selected wash `bg-primary/10 text-primary` (§3 "Current / selected wash", C-C1) rather than `bg-muted`; row selection is not enabled by any prop here, so listed as a note only.

### shard-003-F20 · blocker · medium · colour roles
- **Where:** `src/shared/ui/data-table.tsx:230` — `isExpanded && 'bg-muted/30'`; `:250` — `<tr … className="bg-muted/10">`
- **Rule:** design-system §14 C-C2 "→ Ruling: three steps: `/60` head band, `/50` hover, `/40` wells"; §3 "Sub-surface tint … three steps (C-C2)"; §13 row D-C5 "`/10` (DataTable sub-row)"
- **Current:** two off-scale tints (`/30` expanded row, `/10` sub-row)
- **Expected:** wells are `bg-muted/40` (`dashboard.tsx:494` inline drawer, `:841` truck drawer)
- **Change:** `class-level` — `:230` `bg-muted/30` → `bg-muted/40`; `:250` `bg-muted/10` → `bg-muted/40`
- **Notes:** with F19 applied, the expanded row and its hover share `/40`–`/50`, matching the dashboard's card/drawer pairing.

### shard-003-F21 · should · high · radius/border/shadow
- **Where:** `src/shared/ui/data-table.tsx:152` — `<tr className="border-t-2 bg-muted/40 font-semibold">`
- **Rule:** design-system §4 "Border. 1px everywhere; no `border-2`."
- **Current:** 2px top rule on the footer row
- **Expected:** a 1px hairline `border-t` (§4 "Hairlines … one hairline token")
- **Change:** `class-level` — `border-t-2` → `border-t`
- **Notes:** none.

### shard-003-F22 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/data-table.tsx:192` — `className="flex items-center gap-1 hover:text-foreground"`
- **Rule:** design-system §4 "Focus ring … on every interactive element (C-B1)"; vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"; "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** sort `<button>` has no focus-visible style; `ArrowUpDown` has no explicit `aria-hidden`
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (§10 "Focus"); reference icons are `aria-hidden` (§9)
- **Change:** `class-level` — `:192` → `"flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`; `:196` add `aria-hidden="true"` to `<ArrowUpDown>`
- **Notes:** the `th` is inside `overflow-hidden`/`overflow-auto` wrappers; if the outset ring is clipped, use `focus-visible:ring-inset`.

### shard-003-F23 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/data-table.tsx:224-242` — `<tr … className={cn('… hover:bg-muted/40 …', (onRowClick || canExpand) && 'cursor-pointer', …)} onClick={() => {…}}`
- **Rule:** vercel-rules "Accessibility" bullet "Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)"; "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"; design-system §9 "Keyboard parity: every hover-prefetch also fires on focus"
- **Current:** clickable/expandable rows are plain `<tr onClick>`; not focusable, so `onFocus` prefetch (`:240`) and expansion can never fire from the keyboard; no `aria-expanded` on expandable rows
- **Expected:** the reference makes rows real controls — `<Link>` for navigation rows (`dashboard.tsx:611-617`), `<button aria-expanded>` for disclosure (`:418-433`)
- **Change:** `structural` — additive: when `onRowClick || canExpand`, add `tabIndex={0}`, `role="button"`, `aria-expanded={canExpand ? !!isExpanded : undefined}`, an `onKeyDown` that calls the same toggle/onRowClick on Enter/Space, and the focus ring `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`. Keep every existing handler.
- **Notes:** a `<tr>` cannot become a `<button>` without breaking table semantics, hence the role/tabIndex route. Rows without handlers stay inert.

### shard-003-F24 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/data-table.tsx:291-306` — `<Button variant="outline" size="icon" …><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></Button>` (and the `ChevronRight` twin)
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"; "Anti-patterns" bullet "Icon buttons without `aria-label`"; design-system §14 C-I4 "all aria/sr-only strings through `t()`"
- **Current:** two icon-only pager buttons with no accessible name
- **Expected:** `aria-label={t('…')}` on every icon-only button (`header.tsx:21` `common.openMenu`, `sidebar.tsx:277`)
- **Change:** `class-level` (additive attributes) — add `aria-label={t('common.previous', { defaultValue: 'Previous page' })}` / `aria-label={t('common.next', { defaultValue: 'Next page' })}`; add `aria-hidden="true"` to both chevrons. If matching keys already exist in `en.json`/`ar.json`, use them; otherwise `out-of-shard: src/shared/i18n/locales/en.json, ar.json` (adding keys is permitted by the runner).
- **Notes:** `h-4 w-4` on the chevrons is dead inside `Button` (§5.1) — harmless.

### shard-003-F25 · should · medium · buttons & controls
- **Where:** `src/shared/ui/data-table.tsx:293` — `size="icon"` (and `:301`)
- **Rule:** design-system §5.1 "Call-site override convention: chrome rows are `h-8`"; §14 C-B3 "chrome rows `h-8`"; §13 row D-B1
- **Current:** `size="icon"` = 36px pager buttons
- **Expected:** `h-8 w-8` icon buttons in a toolbar row (`sidebar.tsx:276`, `theme-toggle.tsx:25`)
- **Change:** `class-level` — add `className="h-8 w-8"` to both pager `Button`s
- **Notes:** none.

### shard-003-F26 · should · medium · loading/empty/error
- **Where:** `src/shared/ui/data-table.tsx:212` — `<Skeleton className="h-4 w-full" />`
- **Rule:** design-system §14 C-R2 "a skeleton takes the radius of the box it stands in: cards `rounded-lg`, text bars `rounded-sm`, flush list rows `rounded-none`"; §7 "KPI drawer pending … `Skeleton h-3.5 rounded-sm`"
- **Current:** 16px text bars at the default `rounded-md` (10px, near-pill)
- **Expected:** text bars `rounded-sm` (`dashboard.tsx:459-467`)
- **Change:** `class-level` — `h-4 w-full` → `h-3.5 w-full rounded-sm`
- **Notes:** `h-3.5` matches the reference text bar; `h-4` may be kept if row height must stay identical.

### shard-003-F27 · should · medium · loading/empty/error
- **Where:** `src/shared/ui/data-table.tsx:266-272` — `<EmptyState lottieSrc="/animations/no_results.json" lottieWidth={100} lottieHeight={100} … className="border-0 bg-transparent py-12 shadow-none" />`
- **Rule:** design-system §7 "the palette strips it to `border-0 bg-transparent py-6 shadow-none` with `no_results.json` at 110px (`command-palette.tsx:273-281`)"; §13 rows D-ST1, D-ST6
- **Current:** `py-12`, 100px lottie
- **Expected:** `py-6`, 110px (the one in-container EmptyState usage in the reference)
- **Change:** `class-level` — `py-12` → `py-6`; `lottieWidth={100} lottieHeight={100}` → `110`/`110`
- **Notes:** `shadow-none` is a no-op once F01 lands but harmless.

### shard-003-F28 · should · high · type
- **Where:** `src/shared/ui/date-picker.tsx:139` — `"py-1 text-center text-[10px] font-semibold text-muted-foreground"`
- **Rule:** design-system §13 row D-T13 "Calendar weekday header — Dash `text-xs font-semibold` / Trips `text-[10px] font-semibold` (`date-picker.tsx:139`)"
- **Current:** 10px weekday header
- **Expected:** `text-xs font-semibold` (`cairo-range-calendar.tsx`)
- **Change:** `class-level` — `text-[10px]` → `text-xs`
- **Notes:** none.

### shard-003-F29 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/date-picker.tsx:163` — `'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors'`
- **Rule:** design-system §14 C-B1 "→ Ruling: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere … rings added to NavLink and calendar days"; §5.2 "Calendar day … focus-visible ring (`cairo-range-calendar.tsx:138-156`)"; vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** day buttons have no focus-visible style
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`cairo-range-calendar.tsx:138-156`)
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the base string at `:163`
- **Notes:** none.

### shard-003-F30 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/date-picker.tsx:184` — `className="text-xs font-medium text-primary hover:underline"`
- **Rule:** design-system §4 "Focus ring … on every interactive element (C-B1) … plain outset on … the inline refresh link"; vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** raw "Today" `<button>` with no focus-visible style
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` plus a small radius so the ring reads (§4 `rounded-sm` on small controls)
- **Change:** `class-level` — → `"rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Notes:** none.

### shard-003-F31 · should · high · buttons & controls
- **Where:** `src/shared/ui/date-picker.tsx:188` — `<Button variant="ghost" size="sm" onClick={() => setOpen(false)}>`
- **Rule:** design-system §5.1 "popover-internal and in-strip buttons are `h-7 text-xs` (presets, Cancel/Apply, calendar nav `h-7 w-7`)"; §14 C-B3; §13 row D-B4 "ghost sm unmodified (`h-8`)"
- **Current:** `size="sm"` = `h-8`
- **Expected:** `h-7 text-xs` (`scope-date-picker.tsx` Cancel/Apply)
- **Change:** `class-level` — add `className="h-7 text-xs"`
- **Notes:** none.

### shard-003-F32 · blocker · high · buttons & controls
- **Where:** `src/shared/ui/date-range-picker.tsx:146-151` — `<Button key={p.key} variant={isPresetActive(p) ? 'default' : 'outline'} size="sm" …>` (also `:157-161` all-time, `:169-172` custom trigger)
- **Rule:** design-system §14 C-B4 "→ Ruling: `aria-pressed` for toggles (tiles, presets) … Applied to the presets"; §5.2 "Scope presets `Button size="sm" h-7 text-xs`, `variant` flips `default`↔`outline`, `aria-pressed`"
- **Current:** variant swap with no aria state
- **Expected:** `aria-pressed={isPresetActive(p)}` (`scope-date-picker.tsx:132-136`)
- **Change:** `class-level` (additive attribute) — add `aria-pressed={isPresetActive(p)}` at `:146`, `aria-pressed={isAllTime}` at `:157`, `aria-pressed={isCustom}` at `:169`
- **Notes:** file is currently never imported (PLAN), so no visual change is expected.

### shard-003-F33 · should · medium · buttons & controls
- **Where:** `src/shared/ui/date-range-picker.tsx:151` — `className="h-7 shrink-0 px-2 text-[11px] sm:h-8 sm:px-3 sm:text-xs"` (also `:161`, `:172`)
- **Rule:** design-system §5.2 "Scope presets `Button size="sm" h-7 text-xs`"; §5.1 "popover-internal and in-strip buttons are `h-7 text-xs`"; §2 "the shell stays on Tailwind's `xs/sm/base/lg` scale"; §13 row D-T9 "many roles step with breakpoints"
- **Current:** 28px/11px on phones stepping to 32px/12px at sm
- **Expected:** `h-7 text-xs` at all widths (`scope-date-picker.tsx:132-136`)
- **Change:** `class-level` — `h-7 shrink-0 px-2 text-[11px] sm:h-8 sm:px-3 sm:text-xs` → `h-7 shrink-0 text-xs` (three sites); at `:172` keep `gap-1` → drop `sm:gap-1.5` too
- **Notes:** the `sm:hidden`/`hidden sm:inline` label swap is fine (§12.1 pattern) and untouched.

### shard-003-F34 · should · high · type
- **Where:** `src/shared/ui/date-range-picker.tsx:214` — `"py-1 text-center text-[10px] font-semibold text-muted-foreground"`
- **Rule:** design-system §13 row D-T13 "Calendar weekday header — Dash `text-xs font-semibold`"
- **Current:** 10px
- **Expected:** `text-xs font-semibold` (`cairo-range-calendar.tsx`)
- **Change:** `class-level` — `text-[10px]` → `text-xs`
- **Notes:** none.

### shard-003-F35 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/date-range-picker.tsx:252` — `'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium'`
- **Rule:** design-system §14 C-B1 "rings added to NavLink and calendar days"; §8 "Hover: colour only, `transition-colors`"; vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** day buttons have no focus-visible style and no `transition-colors`
- **Expected:** `transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`cairo-range-calendar.tsx:138-156`; `date-picker.tsx:163` already has `transition-colors`)
- **Change:** `class-level` — append `transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Notes:** none.

### shard-003-F36 · should · high · buttons & controls
- **Where:** `src/shared/ui/date-range-picker.tsx:276-281` — `<Button variant="ghost" size="sm" …>{t('common.cancel')}</Button>` / `<Button size="sm" onClick={handleApply} …>`
- **Rule:** design-system §5.1 "popover-internal … buttons are `h-7 text-xs` (presets, Cancel/Apply …)"; §14 C-B3; §13 row D-B4
- **Current:** `size="sm"` = `h-8`
- **Expected:** `h-7 text-xs` (`scope-date-picker.tsx` Cancel/Apply)
- **Change:** `class-level` — add `className="h-7 text-xs"` to both
- **Notes:** none.

### shard-003-F37 · nit · medium · spacing
- **Where:** `src/shared/ui/date-range-picker.tsx:179` — `"mb-4 flex items-center gap-3 rounded-lg bg-muted p-2.5 text-xs"`; `:267` — `"mt-4 flex items-center justify-between border-t pt-3"`
- **Rule:** design-system §1 "12px as the master step … gap between every top-level block"; sibling `date-picker.tsx:177` uses `mt-3 … pt-3`
- **Current:** 16px block gaps inside the popover
- **Expected:** 12px (`mt-3`), as in `date-picker.tsx:177` and the dashboard's block rhythm
- **Change:** `class-level` — `mb-4` → `mb-3`; `mt-4` → `mt-3`
- **Notes:** none.

### shard-003-F38 · should · medium · RTL/i18n/a11y
- **Where:** `src/shared/ui/draggable.tsx:191` — `'pointer-events-none absolute top-1 start-1/2 -translate-x-1/2 z-10'`
- **Rule:** design-system §9 "Rule C-I1: … `origin-left` is always paired with `rtl:origin-right`" (physical transforms must be mirrored); §14 C-I1 "logical utilities everywhere"
- **Current:** `start-1/2` mirrors to `right:50%` in RTL but `-translate-x-1/2` still shifts left, so the grip sits off-centre in Arabic
- **Expected:** a mirrored pair, e.g. `-translate-x-1/2 rtl:translate-x-1/2` (pattern: `sidebar.tsx` `origin-left rtl:origin-right`)
- **Change:** `class-level` — `-translate-x-1/2` → `-translate-x-1/2 rtl:translate-x-1/2`
- **Notes:** file is currently never imported (PLAN).

### shard-003-F39 · nit · low · motion
- **Where:** `src/shared/ui/draggable.tsx:192` — `'opacity-0 group-hover:opacity-50 transition-opacity duration-150'`
- **Rule:** design-system §14 C-M1 "`duration-200` for every chevron/collapse/icon transition"
- **Current:** 150ms icon reveal
- **Expected:** `duration-200` (`sidebar.tsx:172-282`, `dialog.tsx:56` close button `transition-opacity`)
- **Change:** `class-level` — `duration-150` → `duration-200`
- **Notes:** the drag wrapper itself deliberately has no transition (comment at `:180-183`) — leave it.

### shard-003-F40 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/form.tsx:151` — `'absolute bottom-0 left-0 right-0 text-xs font-medium text-destructive'`
- **Rule:** design-system §14 C-I1 "→ Ruling: logical utilities everywhere"; §9 "no physical `ml-/mr-/left-/right-` utilities"
- **Current:** `left-0 right-0`
- **Expected:** `start-0 end-0` (or `inset-x-0`, which is direction-neutral)
- **Change:** `class-level` — `left-0 right-0` → `inset-x-0`
- **Notes:** the message is `text-start` by inheritance, so it already aligns per direction; only the anchoring was physical.

### shard-003-F41 · blocker · medium · RTL/i18n/a11y
- **Where:** `src/shared/ui/form.tsx:147-157` — `<p ref={ref} id={formMessageId} className={…} {...props}>{body}</p>`
- **Rule:** vercel-rules "Accessibility" bullet "Async updates (toasts, validation) need `aria-live="polite"`"
- **Current:** validation message appears after blur/submit with no live region
- **Expected:** `aria-live="polite"` on the message element (or its reserved slot)
- **Change:** `class-level` (additive attribute) — add `aria-live="polite"` to the `<p>` at `:147`. Because the element unmounts when empty, screen readers may miss the first render; the more robust option is `structural`: always render the `<p>` (with `aria-live="polite"`) and let `body` be empty — the slot is already reserved by `FormItem pb-[1.125rem]`.
- **Notes:** `FormControl` already wires `aria-describedby`/`aria-invalid` (`:111-112`), which is correct.

### shard-003-F42 · should · medium · colour roles
- **Where:** `src/shared/ui/label.tsx:7` — `'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'`
- **Rule:** design-system §5.4 "Disabled everywhere = `opacity-50` (+ `pointer-events-none` or `cursor-not-allowed`)"; §13 row D-C12 "Disabled — Dash `opacity-50` / … `opacity-70` (Label)"
- **Current:** `peer-disabled:opacity-70`
- **Expected:** `opacity-50` (`button.tsx` `disabled:opacity-50`, `select.tsx`, `dropdown-menu.tsx:77`)
- **Change:** `class-level` — `peer-disabled:opacity-70` → `peer-disabled:opacity-50`
- **Notes:** `input.tsx:16` and `checkbox.tsx:13` in this shard already use `disabled:opacity-50`, so the label will match its control.

## Summary
FINDINGS: 42 (blocker 16 / should 23 / nit 3)
