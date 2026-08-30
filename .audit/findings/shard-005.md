# Findings — shard-005

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/app/router/index.tsx` | 333 | audited | `PageLoadingFallback` already matches the C-S6 ruling (`max-w-6xl gap-3 p-3 sm:p-4`, `h-[92px] rounded-lg` KPI grid, `rounded-sm` text bars). No findings. |
| `src/app/router/protected-route.tsx` | 26 | no UI content | redirects only |
| `src/entities/auth/api.ts` | 11 | no UI content | |
| `src/entities/auth/queries.ts` | 59 | no UI content | |
| `src/entities/auth/schemas.ts` | 16 | no UI content | |
| `src/pages/auth/login.tsx` | 177 | audited | no rule: split brand/form layout, `min-h-dvh` on a public page, copyright line, `text-primary-foreground/80` subline |
| `src/entities/car/api.ts` | 49 | no UI content | |
| `src/entities/car/queries.ts` | 55 | no UI content | |
| `src/entities/car/schemas.ts` | 81 | no UI content | |
| `src/widgets/car-form/car-form.tsx` | 329 | audited | no rule: `max="2099-12-31"` on DatePicker; compartment repeater limit of 8; `space-y-6` between form cards matches provisional §12.2 |
| `src/pages/cars/cars.tsx` | 117 | audited | `toast.success` after mutations = §13 D-ST3 (dashboard never toasts, but has no mutations) — pending owner ruling, not raised as a finding; `max-w-2xl` dialog is within the provisional §12.6 width scale |
| `src/widgets/cars-table/cars-table.tsx` | 265 | audited | no rule: raw `car_type` English data value; `EmptyState` lottie 100px inside DataTable (matches provisional §12.4); Badge inner icon size |
| `src/widgets/command-palette/command-palette.tsx` | 564 | reference — not audited | |

## Findings

### shard-005-F01 · blocker · high · radius/border/shadow (focus)
- **Where:** `src/pages/auth/login.tsx:128` — `focus:outline-none focus:ring-2 focus:ring-ring`
- **Rule:** design-system §14 C-B1 "`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere … Select and close buttons moved from `focus:` to `focus-visible:`"; §4 "Never plain `focus:` — a ring must not appear on mouse click" | vercel-rules "Focus States" bullet "Use `:focus-visible` over `:focus` (avoid focus ring on click)"
- **Current:** the show/hide-password button shows a ring on mouse click.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`shared/ui/dialog.tsx:56` close button, `shared/ui/button.tsx:7`).
- **Change:** `class-level` — `focus:outline-none focus:ring-2 focus:ring-ring` → `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Notes:** the `rounded` (4px) on this raw button has no rule for an inline icon button; leave.

### shard-005-F02 · blocker · high · radius/border/shadow
- **Where:** `src/pages/auth/login.tsx:50` — `rounded-xl bg-white/10 backdrop-blur`
- **Rule:** design-system §14 C-R1 "token family: `rounded-lg` everywhere; `rounded-xl` retired"; §4 "`rounded-xl` is not used, so one variable moves every surface"
- **Current:** brand icon well uses the Tailwind constant `rounded-xl`.
- **Expected:** `rounded-lg` (12px token) as on every dashboard tile/panel (`dashboard.tsx:735`); the mobile brand well two lines down already uses `rounded-lg` (`login.tsx:73`).
- **Change:** `class-level` — `rounded-xl` → `rounded-lg`
- **Notes:** `bg-white/10` is an opacity wash on an already-navy panel (§3 "de-emphasis by opacity"), not a third hue; not flagged.

### shard-005-F03 · should · high · type
- **Where:** `src/pages/auth/login.tsx:53` — `<h1 className="text-3xl font-bold">`
- **Rule:** design-system §2 "Weights used: 400, 500, 600. **700 is never used** in the reference"; §13 D-T8 "Weight ceiling 600 max"
- **Current:** `font-bold` (700) on the brand name.
- **Expected:** `font-semibold` (600) — the heaviest weight in the reference (`dashboard.tsx:103` page title, `sidebar.tsx` brand name at 500).
- **Change:** `class-level` — `font-bold` → `font-semibold`
- **Notes:** the `h2` below it (`:55`) is already `font-semibold`; after the change both headings are the same weight — acceptable, the app name is a brand mark, not a heading level.

### shard-005-F04 · should · high · radius/border/shadow
- **Where:** `src/pages/auth/login.tsx:79` — `<Card className="border-none shadow-lg md:border md:shadow-sm">`
- **Rule:** design-system §4 "Cards are `border bg-card` with **no shadow** — separation is tone (white on graphite) plus a hairline … Elevation is reserved for controls and floating layers"; §13 D-R1
- **Current:** login card has `shadow-lg` on phones and `shadow-sm` from md, and drops its border below md.
- **Expected:** `border bg-card`, no shadow, at all widths (`dashboard.tsx:135` panel).
- **Change:** `class-level` — `border-none shadow-lg md:border md:shadow-sm` → `border shadow-none`
- **Notes:** `Card` itself carries `shadow-sm` (§13 D-R1, out-of-shard: `src/shared/ui/card.tsx`), so `shadow-none` is needed at the call site to reach the reference value.

### shard-005-F05 · should · medium · type
- **Where:** `src/pages/auth/login.tsx:82` — `<h2 className="text-2xl font-semibold tracking-tight">`
- **Rule:** design-system §2 "Page title … `sm:text-xl` / `text-lg` 600 `leading-tight`"; "`tracking-tight` only on `DialogTitle`"; §13 D-T1
- **Current:** the form's title is 24px with `tracking-tight`.
- **Expected:** `text-lg font-semibold leading-tight sm:text-xl` (`dashboard.tsx:103`).
- **Change:** `class-level` — `text-2xl font-semibold tracking-tight` → `text-lg font-semibold leading-tight sm:text-xl`
- **Notes:** the subtitle `text-sm text-muted-foreground` (`:85`) is D-T2 territory (dashboard `text-[11.5px] mt-0.5`); left as a note because a login card is not a page header — judgment call for the fixer, not proposed.

### shard-005-F06 · should · high · forms (Vercel)
- **Where:** `src/pages/auth/login.tsx:98` — `type="text"` (email field, `autoComplete="username"`)
- **Rule:** vercel-rules "Forms" bullets "Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`" and "Disable spellcheck on emails, codes, usernames (`spellCheck={false}`)"
- **Current:** the email input is `type="text"` with no `spellCheck`/`inputMode`.
- **Expected:** `type="email" inputMode="email" spellCheck={false}`; keep `autoComplete="username"`.
- **Change:** `class-level` (attribute-level, additive) — add `inputMode="email" spellCheck={false}`; `type="text"` → `type="email"`.
- **Notes:** `loginSchema` (`entities/auth/schemas.ts`) decides whether non-email usernames are accepted; if it allows plain usernames, keep `type="text"` and add only `spellCheck={false}` — say so in the fix log.

### shard-005-F07 · should · medium · touch (Vercel)
- **Where:** `src/pages/auth/login.tsx:101` — `autoFocus`
- **Rule:** vercel-rules "Touch & Interaction" bullet "`autoFocus` sparingly—desktop only, single primary input; avoid on mobile"; "Anti-patterns" "`autoFocus` without clear justification"
- **Current:** the email input auto-focuses on every viewport, which raises the keyboard on phones on page load.
- **Expected:** focus only on desktop (`useIsDesktop` from `shared/hooks/use-media-query.ts`, a reference hook) or no `autoFocus`.
- **Change:** `class-level` — `autoFocus` → `autoFocus={isDesktop}` with `const isDesktop = useIsDesktop();` (additive hook call, reference hook, no prop removed).
- **Notes:** single primary input on a login page is the one case the rule permits — so desktop-gated, not removed.

### shard-005-F08 · should · medium · motion
- **Where:** `src/pages/auth/login.tsx:154` — `<Loader2 className="h-4 w-4 animate-spin" />`
- **Rule:** design-system §14 C-M2 "`motion-reduce:animate-none` on the Skeleton primitive"; §8 "Reduced motion: … opt-out is per element (`motion-reduce:animate-none`)"; §13 D-ST4 "(no motion-reduce guard)" | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** spinner loops without a reduced-motion guard.
- **Expected:** every looping animation in the reference carries `motion-reduce:animate-none` (`shared/ui/skeleton.tsx`, `dashboard.tsx:227`).
- **Change:** `class-level` — `animate-spin` → `animate-spin motion-reduce:animate-none`
- **Notes:** same fix applies at `car-form.tsx:319` (F21).

### shard-005-F09 · nit · high · buttons & controls
- **Where:** `src/pages/auth/login.tsx:154` — `<Loader2 className="h-4 w-4 animate-spin" />` (also `:159` `<LogIn className="h-4 w-4" />`)
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes"; §15.4
- **Current:** dead `h-4 w-4` on icons inside `<Button>`.
- **Expected:** no size class (`dashboard.tsx:1043`, `header.tsx:23`).
- **Change:** `class-level` — drop `h-4 w-4` from both icons (keep `animate-spin`).
- **Notes:** cosmetic; behaviour unchanged. Same pattern at `car-form.tsx:237,319,321` and `cars-table.tsx:187,235,256` — fold into F14/F25/F26.

### shard-005-F10 · should · medium · colour roles
- **Where:** `src/pages/auth/login.tsx:46-47` — `bg-gradient-to-br from-primary to-primary/70` / `bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]`
- **Rule:** design-system §3 "Non-token colours in the reference: the two scrims and `theme-color`. No hex/rgb in any dashboard or shell TSX"; §4 "separation is tone … plus a hairline" (surfaces are flat)
- **Current:** brand panel is a two-stop navy gradient with an arbitrary `rgba()` radial highlight.
- **Expected:** a flat token fill (`bg-primary text-primary-foreground`, as the mobile brand well at `:73` already does).
- **Change:** `class-level` — `:46` `bg-gradient-to-br from-primary to-primary/70` → `bg-primary`; `:47` drop the `bg-[radial-gradient(…)]` class (keep the `div` so no element is removed; it becomes an empty absolute layer).
- **Notes:** medium confidence — the gradient stays inside the navy hue (not a third accent), so this is "same role, different value", not a palette breach. Hand to the owner if brand feel is wanted here.

### shard-005-F11 · nit · low · buttons & controls
- **Where:** `src/pages/auth/login.tsx:149` — `size="lg"`
- **Rule:** design-system §5.1 "`lg` h-11 px-6 text-base (unused)"
- **Current:** the only `lg` button in the app; 44px next to 36px inputs.
- **Expected:** default size (`h-9`), matching the Input height so the form stacks on one control height (§12.2 "so controls line up at 36px").
- **Change:** `class-level` — remove `size="lg"` (default) — note this removes a prop value, not a prop the component needs; if the fixer reads the constraint strictly, override with `className="h-9 w-full text-sm"` instead.
- **Notes:** low confidence: the primitive defines `lg`, so using it is not contradicted by a rule, only by usage.

### shard-005-F12 · nit · low · spacing
- **Where:** `src/pages/auth/login.tsx:80` — `<CardContent className="space-y-6 p-6 md:p-8">`
- **Rule:** provisional (§12.2) "Form card = `Card` + `CardContent space-y-4 p-4 md:p-6`"; §13 D-S3 (dashboard body padding `p-3`)
- **Current:** `p-6 md:p-8`, `space-y-6`.
- **Expected:** `space-y-4 p-4 md:p-6` (trips form cards, `trip-form.tsx:691`).
- **Change:** `class-level` — `space-y-6 p-6 md:p-8` → `space-y-4 p-4 md:p-6`
- **Notes:** provisional; a single-purpose login card may deserve more air — owner's call.

### shard-005-F13 · blocker · high · RTL/i18n
- **Where:** `src/widgets/car-form/car-form.tsx:204` — `className="pr-8"`; `:208` — `absolute right-3 top-1/2`
- **Rule:** design-system §14 C-I1 "logical utilities everywhere"; §9 "Rule C-I1: no physical `ml-/mr-/left-/right-` utilities"
- **Current:** the compartment input's unit suffix is pinned to the physical right; in Arabic (RTL) the padding is on the wrong side and the "L" overlaps the typed digits.
- **Expected:** `pe-8` / `end-3` (`login.tsx:122,128` uses `pe-10` / `end-2` for the same pattern).
- **Change:** `class-level` — `pr-8` → `pe-8`; `right-3` → `end-3`
- **Notes:** this form renders in RTL.

### shard-005-F14 · blocker · high · RTL/i18n
- **Where:** `src/widgets/car-form/car-form.tsx:237` — `<Plus className="h-4 w-4 mr-2" />`; `:319` — `<Loader2 className="h-4 w-4 animate-spin mr-2" />`; `:321` — `<Save className="h-4 w-4 mr-2" />`
- **Rule:** design-system §14 C-I1 "no physical `ml-/mr-/left-/right-` utilities"; §14 C-S7 "one gap, no extra margin"; §5.1 base has `gap-2` and "icons inside a Button carry no size classes"
- **Current:** physical `mr-2` (wrong side in RTL) stacked on the Button's own `gap-2` = 16px between icon and label; dead `h-4 w-4`.
- **Expected:** icon with no margin and no size class inside `<Button>` (`dashboard.tsx:1043`, `header.tsx:23`).
- **Change:** `class-level` — `:237` `h-4 w-4 mr-2` → (no className); `:319` `h-4 w-4 animate-spin mr-2` → `animate-spin motion-reduce:animate-none`; `:321` `h-4 w-4 mr-2` → (no className)
- **Notes:** the Button's `gap-2` supplies the 8px.

### shard-005-F15 · blocker · high · RTL/i18n
- **Where:** `src/widgets/car-form/car-form.tsx:136-138` — `<SelectItem value="No Trailer">No Trailer</SelectItem>` (and `Trailer`, `Truck`)
- **Rule:** design-system §9 "Copy, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)"; §13 D-I2
- **Current:** three option labels hard-coded in English.
- **Expected:** `t('cars.types.noTrailer', 'No Trailer')` etc. — keep the `value` strings (they are API keys).
- **Change:** `class-level` (additive, children only) — `>No Trailer<` → `>{t('cars.types.noTrailer', 'No Trailer')}<`, `>Trailer<` → `>{t('cars.types.trailer', 'Trailer')}<`, `>Truck<` → `>{t('cars.types.truck', 'Truck')}<`; add the three keys to `en.json`/`ar.json` (locale files are allowed by the gate).
- **Notes:** `cars-table.tsx:120` prints the raw `car_type` data value; the same keys could translate it, but that is a data value and has no rule — not flagged.

### shard-005-F16 · blocker · medium · RTL/i18n
- **Where:** `src/widgets/car-form/car-form.tsx:186` — `{totalCapacity.toLocaleString()} L`; `:208` — `>L</span>`
- **Rule:** design-system §9 C-I4 "Copy … all go through `t()`"; §13 D-I2 lists the untranslated unit "'L'"
- **Current:** the litre unit is a bare English letter, twice.
- **Expected:** `t('units.litre', 'L')` (or an existing litres key — the dashboard's fuel meta prints litres via `t()`).
- **Change:** `class-level` (additive) — `{totalCapacity.toLocaleString()} L` → `{totalCapacity.toLocaleString()} {t('units.litre', 'L')}`; `>L<` → `>{t('units.litre', 'L')}<`; add the key to both locale files if no litres key exists.
- **Notes:** medium — a unit symbol is arguably an identifier, but §13 D-I2 already records "L" as an untranslated string. Same at `cars-table.tsx:142` (F27).

### shard-005-F17 · should · medium · type
- **Where:** `src/widgets/car-form/car-form.tsx:186` — `<span>{totalCapacity.toLocaleString()} L</span>`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values, bar amounts"; §13 D-T5
- **Current:** the running capacity total is sans, proportional digits.
- **Expected:** `font-mono tabular-nums` (`dashboard.tsx:436`, dl values `:501-509`).
- **Change:** `class-level` — `<span>` → `<span className="font-mono tabular-nums">`
- **Notes:** not money — no `text-money`.

### shard-005-F18 · blocker · high · a11y (Vercel)
- **Where:** `src/widgets/car-form/car-form.tsx:212-220` — `<Button type="button" variant="ghost" size="icon" … onClick={() => remove(index)}>` with only `<Trash2 …/>` inside
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"; "Anti-patterns" "Icon buttons without `aria-label`"; design-system §9 aria strings through `t()` (C-I4)
- **Current:** the remove-compartment button has no accessible name.
- **Expected:** `aria-label={t('cars.sections.removeCompartment', 'Remove compartment')}` (+ `title` per provisional §12.4 row actions, optional).
- **Change:** `class-level` (attribute, additive) — add `aria-label={t('cars.sections.removeCompartment', 'Remove compartment')}`; add the key to both locale files.
- **Notes:** the `Trash2` inside a Button also carries dead `h-4 w-4` (§5.1) — drop it; keep `text-destructive`.

### shard-005-F19 · should · medium · buttons & controls
- **Where:** `src/widgets/car-form/car-form.tsx:216` — `className="h-10 w-10 shrink-0"`
- **Rule:** design-system §5.1 sizes "`icon` h-9 w-9"; §13 D-B6 "Control height 36px … 40px beside 36px inputs"; provisional (§12.2) repeater remove "ghost icon h-7 w-7 text-destructive hover:bg-destructive/10"
- **Current:** a 40px button beside a 36px Input (`Input` is `h-9`, §12.2).
- **Expected:** at most the primitive's `h-9 w-9`; the trips repeater uses `h-7 w-7 text-destructive hover:bg-destructive/10`.
- **Change:** `class-level` — `h-10 w-10 shrink-0` → `h-9 w-9 shrink-0` (aligns with the input row); optionally add `text-destructive hover:bg-destructive/10` on the Button and drop `text-destructive` from the icon (provisional §12.2).
- **Notes:** the 36px value comes from a reference rule; the destructive-hover recipe is provisional.

### shard-005-F20 · should · medium · type
- **Where:** `src/widgets/car-form/car-form.tsx:104` — `<CardTitle className="flex items-center gap-2 text-base font-semibold">` (same at `:151`, `:180`, `:246`)
- **Rule:** design-system §2 Eyebrow "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground … one label style above every figure and panel"; §13 D-T3/D-T4; provisional (§12.2) form-card heading "`text-sm font-semibold uppercase tracking-wider`"
- **Current:** four 16px sentence-case card titles.
- **Expected:** the reference panel title is the 10px eyebrow in a `bg-muted/60` band (`dashboard.tsx:999-1005`); the closest provisional form value is `text-sm font-semibold uppercase tracking-wider`.
- **Change:** `class-level` — `text-base font-semibold` → `text-sm font-semibold uppercase tracking-wider` on all four `CardTitle`s (provisional value; the full PanelHead band would be `structural`).
- **Notes:** `CardTitle` itself may add its own size classes (out-of-shard: `src/shared/ui/card.tsx`); `cn` lets the call-site class win. The 16px icons beside the titles are 14px in the reference eyebrow contexts — no explicit rule, left.

### shard-005-F21 · should · medium · motion
- **Where:** `src/widgets/car-form/car-form.tsx:319` — `<Loader2 className="h-4 w-4 animate-spin mr-2" />`
- **Rule:** design-system §14 C-M2 / §8 "opt-out is per element (`motion-reduce:animate-none`)"; §13 D-ST4 | vercel-rules "Animation" "Honor `prefers-reduced-motion`"
- **Current:** unguarded spinner.
- **Expected:** `animate-spin motion-reduce:animate-none` (`skeleton.tsx`, `dashboard.tsx:227`).
- **Change:** `class-level` — covered by the F14 edit for this line.
- **Notes:** listed separately so the motion count is visible; one edit.

### shard-005-F22 · should · medium · forms (Vercel)
- **Where:** `src/widgets/car-form/car-form.tsx:316` — `disabled={submitting || (mode === 'edit' && !form.formState.isDirty)}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request"
- **Current:** in edit mode the Save button is disabled until a field is dirty, so a user who presses Save gets no feedback.
- **Expected:** enabled until `submitting`; the spinner already covers the request.
- **Change:** `class-level` — `disabled={submitting || (mode === 'edit' && !form.formState.isDirty)}` → `disabled={submitting}` — **this edits a conditional expression**; if the fixer treats it as "removing a conditional branch" under the standing constraints, leave it and record `needs-ruling`.
- **Notes:** the provisional §12.2 sticky footer says "disabled until valid", which is the trips convention and conflicts with the Vercel bullet; the Vercel rule is the graded one.

### shard-005-F23 · should · medium · touch (Vercel)
- **Where:** `src/pages/cars/cars.tsx:95` — `<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">`
- **Rule:** vercel-rules "Touch & Interaction" bullet "`overscroll-behavior: contain` in modals/drawers/sheets"; design-system §6 scroll containers use `overscroll-contain` (`command.tsx:63-71`)
- **Current:** a scrolling dialog body without overscroll containment — wheel/touch at the end scrolls the page behind.
- **Expected:** `overscroll-contain` on the scroll container.
- **Change:** `class-level` — `max-w-2xl max-h-[90vh] overflow-y-auto` → `max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain`
- **Notes:** provisional §12.6 full-bleed dialog (`flex max-h-[90vh] flex-col … body overflow-y-auto`) would be `structural`; not required here.

### shard-005-F24 · blocker · high · RTL/i18n
- **Where:** `src/widgets/cars-table/cars-table.tsx:154` — `<ShieldAlert className="h-3 w-3 mr-1" />` (also `:163` `Clock`, `:169` `ShieldCheck`)
- **Rule:** design-system §14 C-I1 "no physical `ml-/mr-/left-/right-` utilities"; §14 C-S7 "one gap, no extra margin"; §5.3 Badge recipe already `inline-flex gap-1.5`
- **Current:** physical `mr-1` on three badge icons, stacked on the Badge's `gap-1.5` (10px total; wrong side in Arabic).
- **Expected:** no margin — the Badge's `gap-1.5` spaces icon and text (`badge.tsx:5`).
- **Change:** `class-level` — `h-3 w-3 mr-1` → `h-3 w-3` on all three icons.
- **Notes:** table renders in RTL.

### shard-005-F25 · blocker · high · RTL/i18n
- **Where:** `src/widgets/cars-table/cars-table.tsx:235` — `<Plus className="h-4 w-4 mr-2" />` (also `:256`)
- **Rule:** design-system §14 C-I1; §14 C-S7; §5.1 "icons inside a Button carry no size classes"
- **Current:** physical `mr-2` + Button `gap-2` = 16px; dead `h-4 w-4`.
- **Expected:** bare `<Plus />` inside `<Button>` (`header.tsx:23`).
- **Change:** `class-level` — `className="h-4 w-4 mr-2"` → remove the className on both `Plus` icons.
- **Notes:** —

### shard-005-F26 · blocker · high · a11y (Vercel)
- **Where:** `src/widgets/cars-table/cars-table.tsx:179-188` — `<Button variant="ghost" size="icon" onClick={…}><Edit className="h-4 w-4" /></Button>`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"; design-system §9 C-I4 aria strings through `t()`; provisional (§12.4) row actions "ghost icon `h-7 w-7` with `aria-label`+`title`"
- **Current:** the per-row edit button has no accessible name.
- **Expected:** `aria-label={t('cars.editCar')}` (key already exists — used at `cars.tsx:99`).
- **Change:** `class-level` (attribute, additive) — add `aria-label={t('cars.editCar')} title={t('cars.editCar')}`; drop the dead `h-4 w-4` on `Edit` (§5.1). Optionally `className="h-7 w-7"` per provisional §12.4.
- **Notes:** —

### shard-005-F27 · blocker · medium · RTL/i18n
- **Where:** `src/widgets/cars-table/cars-table.tsx:142` — `{row.original.tank_capacity?.toLocaleString()} L`
- **Rule:** design-system §9 C-I4 "Copy … all go through `t()`"; §13 D-I2 lists "'L'"
- **Current:** bare English unit.
- **Expected:** `t('units.litre', 'L')` (same key as F16).
- **Change:** `class-level` (additive) — `} L` → `} {t('units.litre', 'L')}`
- **Notes:** share the key with car-form.

### shard-005-F28 · should · medium · type
- **Where:** `src/widgets/cars-table/cars-table.tsx:140-143` — `<div className="flex items-center gap-2 text-sm">…{tank_capacity?.toLocaleString()} L</div>`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`)"; §6 "Numeric alignment: … `text-end` on a fixed grid column"; provisional (§12.4) "Numeric columns `block text-end tabular-nums`"
- **Current:** capacity figure in sans, proportional, start-aligned.
- **Expected:** `font-mono tabular-nums` on the figure (`dashboard.tsx:501-509`).
- **Change:** `class-level` — wrap the number: `<span className="font-mono tabular-nums">{row.original.tank_capacity?.toLocaleString()}</span>` (additive span); `text-end` on the cell is optional (DataTable headers are `text-start`, §12.4).
- **Notes:** —

### shard-005-F29 · should · medium · type / RTL
- **Where:** `src/widgets/cars-table/cars-table.tsx:117` — `<p className="truncate font-medium">{row.original.car_no_plate}</p>`
- **Rule:** design-system §2 "Figures are mono + tabular … plates"; "Arabic text is always sans (`dir="rtl"` plates)"; §9 "`dir="rtl"` on Arabic plates; Arabic never in mono"; §6 "identifiers (date, plate) are `shrink-0`"
- **Current:** plate is sans `font-medium`, `truncate`, no `dir`. Plates in this fleet are Arabic (e.g. `ف م س 9247`, PLAN.md) and Latin.
- **Expected:** the fleet tile renders Latin plates `font-mono font-semibold` and Arabic plates sans with `dir="rtl"` (`dashboard.tsx:744-747`); identifiers never truncate.
- **Change:** `class-level` — `truncate font-medium` → `font-medium tabular-nums` + `dir="auto"` on the `<p>`. Applying `font-mono` conditionally on Latin-only plates would need a script check — `structural`, optional.
- **Notes:** `dir="auto"` rather than `rtl` because the column mixes scripts.

### shard-005-F30 · should · low · radius/border/shadow
- **Where:** `src/widgets/cars-table/cars-table.tsx:113` — `rounded-lg bg-primary/10 text-primary` (8×8 icon well)
- **Rule:** design-system §4 radius table "`rounded-md` — … brand mark, … palette quick-action tile"; §3 "`bg-primary/10 text-primary` … 'you are here / this is actionable context'"; §13 D-B11 icon well `rounded-md bg-primary/10`
- **Current:** a 32px decorative well with the 12px card radius, in the navy "selected/actionable" wash for a non-interactive cell.
- **Expected:** small wells are `rounded-md` (`sidebar.tsx` brand mark, `page-shell.tsx` icon well `rounded-lg bg-muted text-muted-foreground` per §12.1); neutral `bg-muted text-muted-foreground` since the cell is not actionable (`dashboard.tsx:583` neutral chip).
- **Change:** `class-level` — `rounded-lg bg-primary/10 text-primary` → `rounded-md bg-muted text-muted-foreground`
- **Notes:** low confidence on the colour part (navy wash is "current/selected", §3, but a per-row brand well has no explicit rule); the radius part is §4.

### shard-005-F31 · should · medium · spacing
- **Where:** `src/widgets/cars-table/cars-table.tsx:197` — `<div className="space-y-6">`
- **Rule:** design-system §1 "12px … gap between every top-level block"; §13 D-S4 "Section rhythm: Dash `gap-3` at all widths"
- **Current:** 24px between stats, toolbar and table.
- **Expected:** `gap-3` / `space-y-3` (`dashboard.tsx:99`).
- **Change:** `class-level` — `space-y-6` → `space-y-3`
- **Notes:** `PageShell` around it is `gap-6` (D-S1, out-of-shard: `src/shared/ui/page-shell.tsx`).

### shard-005-F32 · should · medium · spacing
- **Where:** `src/widgets/cars-table/cars-table.tsx:198` — `grid grid-cols-2 gap-3 sm:grid-cols-4`
- **Rule:** design-system §1 "KPI row: `grid grid-cols-2 gap-3` + `lg:grid-cols-4`"; §0.4 breakpoints "`lg` 1024 (KPI 4-col…)"
- **Current:** stat cards go 4-up at 640px.
- **Expected:** `lg:grid-cols-4` (`dashboard.tsx:359`).
- **Change:** `class-level` — `sm:grid-cols-4` → `lg:grid-cols-4`
- **Notes:** `StatCard` itself is D-L1/D-T7 (out-of-shard: `src/shared/ui/stat-card.tsx`).

### shard-005-F33 · nit · low · locale
- **Where:** `src/widgets/cars-table/cars-table.tsx:52` — `return new Date(dateString) < new Date();`
- **Rule:** design-system §2 "the dashboard's 'today' is Cairo's day — [comment] at 00:58 Cairo the UTC date is still yesterday"; §14 C-I2 "`Intl` + Cairo stays where day *boundaries* are computed (… `cairo.ts`)"
- **Current:** "expired" / "expiring in ≤30 days" compares against the browser clock, not the Cairo day; a date-only string parses as UTC midnight.
- **Expected:** a Cairo day boundary from `shared/lib/cairo.ts` (reference lib).
- **Change:** `class-level` (logic, additive) — compute `today` via the `cairo.ts` helper and compare date parts; keep both helper functions.
- **Notes:** low — this is status logic, not a visual rule; recorded because the design system states the day-boundary rule explicitly.

## Summary
FINDINGS: 33 (blocker 11 / should 18 / nit 4)
