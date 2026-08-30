# Findings — shard-010

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/pages/fleet-expenses/fleet-expense-edit.tsx` | 5 | no UI content | thin wrapper, no classes |
| `src/pages/fleet-expenses/fleet-expense-new.tsx` | 5 | no UI content | thin wrapper, no classes |
| `src/pages/fleet-expenses/fleet-expense-form.tsx` | 726 | audited | no rule: `border-s-4 border-s-primary` accent edge on the source-message well (:297); `min-h-11` phone tap targets; native `<datalist>` suggestions; sticky bottom action bar with safe-area padding (dashboard has none; §12.2 sticky footer is provisional and differs — not flagged) |
| `src/pages/fleet-expenses/fleet-expenses-messages.tsx` | 275 | audited | no rule: horizontal chip scroller `-mx-4 … [scrollbar-width:none]`; `EmptyState` primitive used for empties (reference primitive, §7 notes the dashboard uses bare `<p>` — not flagged) |
| `src/pages/fleet-expenses/fleet-expenses.tsx` | 775 | audited | no rule: donut hex accents `#2a78d6/#eb6834/#8A968F` (:226-227) are chart-only, allowed by §3 "third hues only in charts"; `StatCard`/`ChartCard` are provisional §12.5 primitives (their internals are out-of-shard); `Switch` has no rule |

## Findings

### shard-010-F01 · blocker · high · radius
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:297` — `rounded-xl border border-s-4 border-s-primary bg-muted/40 p-3.5`
- **Rule:** design-system §4 / §14 C-R1 "token family: `rounded-lg` everywhere; `rounded-xl` retired"
- **Current:** `rounded-xl` on the source-message well
- **Expected:** `rounded-lg` (truck drawer well `dashboard.tsx:841` `mt-3 rounded-lg border bg-muted/40 p-3`)
- **Change:** `rounded-xl` → `rounded-lg` — `class-level`
- **Notes:** —

### shard-010-F02 · should · high · spacing
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:297` — `bg-muted/40 p-3.5`
- **Rule:** design-system §1 "12px … panel body padding, KPI card padding, drawer padding" ; §6 "Truck drawer: `mt-3 rounded-lg border bg-muted/40 p-3`"
- **Current:** `p-3.5` (14px) on a `bg-muted/40` well
- **Expected:** `p-3` (`dashboard.tsx:841`)
- **Change:** `p-3.5` → `p-3` — `class-level`
- **Notes:** —

### shard-010-F03 · should · high · type
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:298` — `text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`
- **Rule:** design-system §2 "Eyebrow: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"
- **Current:** 11px eyebrow with `tracking-wide`
- **Expected:** `text-[10px] … tracking-wider` (`dashboard.tsx:999-1005` PanelHead); the trailing timestamp span should take the PanelHead aside reset `font-medium normal-case tracking-normal`
- **Change:** `text-[11px] … tracking-wide` → `text-[10px] … tracking-wider`; on the `{sourceStamp && <span>}` add `font-medium normal-case tracking-normal` — `class-level`
- **Notes:** —

### shard-010-F04 · blocker · high · colour
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:336` — `rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400`
- **Rule:** design-system §0.2 palette rule (`index.css:7-19`) "Adding a third accent colour breaks the whole scheme, so don't" ; §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"
- **Current:** raw Tailwind amber hues for an "edited by" notice
- **Expected:** token warning tint `border border-warning/40 bg-warning/10 text-warning` (DegradedStrip `dashboard.tsx:1021`)
- **Change:** `bg-amber-500/10 … text-amber-700 dark:text-amber-400` → `border border-warning/40 bg-warning/10 text-warning` — `class-level`
- **Notes:** warning, not money — nobody is paid here.

### shard-010-F05 · blocker · high · colour
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:491` — `border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm` (+ `:492` `text-emerald-500`)
- **Rule:** design-system §0.2 palette rule "Everything else is neutral … don't [add a third accent]" ; §3 "Success `text-success`… passing status only"; "Status tint recipe `border-X/40 bg-X/10 text-X`"
- **Current:** raw emerald for the loan-registered chip and its icon
- **Expected:** `border-success/40 bg-success/10` + icon `text-success` (ConnectionBadge live `dashboard.tsx:221`)
- **Change:** `border-emerald-500/30 bg-emerald-500/5` → `border-success/40 bg-success/10`; `text-emerald-500` → `text-success` — `class-level`
- **Notes:** —

### shard-010-F06 · should · medium · colour
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:360` — `rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … never a solid status fill"; §14 C-C2 (three muted steps)
- **Current:** `/30` border and `/5` wash — alphas outside the recipe
- **Expected:** `border-primary/40 bg-primary/10` (`dashboard.tsx:221`, `:1021`)
- **Change:** `border-primary/30 bg-primary/5` → `border-primary/40 bg-primary/10` — `class-level`
- **Notes:** —

### shard-010-F07 · blocker · high · a11y
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:412` — `<button key={d} type="button" disabled={moneyLocked} onClick={() => form.setValue('direction', d …`
- **Rule:** design-system §14 C-B4 "`aria-pressed` for toggles (tiles, presets)" ; §9 "`aria-pressed` on toggles"
- **Current:** two-way segmented choice carries no aria state
- **Expected:** `aria-pressed={form.watch('direction') === d}` (presets `scope-date-picker.tsx:132-136`, tiles `dashboard.tsx:733`)
- **Change:** add `aria-pressed={form.watch('direction') === d}` to each button — `class-level` (additive attribute)
- **Notes:** —

### shard-010-F08 · should · medium · colour
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:420` — `'bg-foreground text-background'` (selected direction)
- **Rule:** design-system §3 "Current / selected wash `bg-primary/10 text-primary`" ; §14 C-C1 "→ Ruling: `bg-primary/10 text-primary`"; §5.2 presets flip `default`↔`outline`
- **Current:** selected segment is solid foreground/background (a third, ink-on-paper scheme); inactive `bg-card text-muted-foreground hover:bg-accent`; both `font-semibold`
- **Expected:** selected `bg-primary text-primary-foreground` (preset pill, `scope-date-picker.tsx:133`) or the wash `bg-primary/10 text-primary`; `font-medium` (Button base)
- **Change:** `bg-foreground text-background` → `bg-primary text-primary-foreground`; `font-semibold` → `font-medium` — `class-level`
- **Notes:** the container `flex h-11 overflow-hidden rounded-md border sm:h-9` is fine (§5.4 control height 36px).

### shard-010-F09 · blocker · high · a11y
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:721` — `<Label>{label}</Label>` followed by `{children}` with no `htmlFor`/`id`
- **Rule:** vercel-rules "Accessibility" bullet "Form controls need `<label>` or `aria-label`" ; "Forms" bullet "Labels clickable (`htmlFor` or wrapping control)"
- **Current:** `Field` renders a `<Label>` as a sibling of the control with no association; every Input/NativeSelect/Textarea in the form (amount, currency, date, time, category, counterparty, reference, account, payment method, company, car, paid by, description) has no accessible name
- **Expected:** label associated to the control
- **Change:** `structural` — in `Field`, `const id = React.useId()`, render `<Label htmlFor={id}>` and pass `id` to the child (e.g. `React.cloneElement` of a single child, or add an `id` prop to `Field` and set `id={…}` on each control at the call sites); for the direction segmented group use `role="group" aria-labelledby={id}` on the `div.flex`
- **Notes:** `SmartPartyField` (:469) is `out-of-shard: src/widgets/fleet-expenses-table/party-picker.tsx` — check it accepts an `id`.

### shard-010-F10 · should · medium · forms
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:389` — `<Input inputMode="decimal" dir="ltr" placeholder="0.00" autoFocus={mode === 'create'}`
- **Rule:** vercel-rules "Forms" bullet "Inputs need `autocomplete` and meaningful `name`" and "`autocomplete=\"off\"` on non-auth fields to avoid password manager triggers"
- **Current:** none of the text inputs (amount, currency, counterparty, reference, account, paid_by, description) set `autoComplete`; `register()` supplies `name` only
- **Expected:** `autoComplete="off"` on these non-auth fields
- **Change:** add `autoComplete="off"` to the Inputs at :389, :402, :516, :523, :530, :589 and the Textarea at :607 — `class-level` (additive attribute)
- **Notes:** —

### shard-010-F11 · should · medium · touch
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:393` — `autoFocus={mode === 'create'}`
- **Rule:** vercel-rules "Touch & Interaction" bullet "`autoFocus` sparingly—desktop only, single primary input; avoid on mobile"
- **Current:** amount autofocuses on every create, including phones (this form is explicitly phone-first: sticky action bar, `min-h-11`)
- **Expected:** desktop-only autofocus
- **Change:** `autoFocus={mode === 'create'}` → `autoFocus={mode === 'create' && isDesktop}` with `const isDesktop = useIsDesktop()` from `@/shared/hooks/use-media-query` (reference hook, import only) — `class-level` (additive)
- **Notes:** —

### shard-010-F12 · nit · high · typography
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:392` — `placeholder="0.00"`
- **Rule:** vercel-rules "Forms" bullet "Placeholders end with `…` and show example pattern"
- **Current:** `0.00`
- **Expected:** `0.00…`-style hint via `t()` (§9 "Copy … all go through `t()`")
- **Change:** `placeholder="0.00"` → `placeholder={t('fleetExpenses.amountPlaceholder', { defaultValue: '0.00…' })}` — `class-level`; new key `out-of-shard: src/shared/i18n/locales/en.json, ar.json`
- **Notes:** —

### shard-010-F13 · blocker · high · money
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:365` — `<p className="text-xs text-muted-foreground" dir="auto">` wrapping `formatMoney(row.parent_amount)`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`" ; §3 "Money (amber) `text-money` on figures"
- **Current:** parent split amount rendered as muted sans text inside an interpolated string
- **Expected:** the figure in `font-mono tabular-nums text-money` (`dashboard.tsx:522`)
- **Change:** `structural` — render the amount as its own `<span className="font-mono tabular-nums text-money">` (split the `t()` string with a `<Trans>` or a `{amount}` component slot) — or minimally add `font-mono tabular-nums` to the `<p>`
- **Notes:** —

### shard-010-F14 · should · medium · states
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:254` — `toast.success(t('fleetExpenses.copied'));` (and `:256` `toast.error`)
- **Rule:** design-system §7 "Failures are inline and persistent — a strip or muted copy in place — never a toast" ; §13 row D-ST3
- **Current:** copy feedback via Sonner toast
- **Expected:** inline feedback in place (e.g. the "tap to copy" caption swaps to "copied" for a moment, `aria-live="polite"`)
- **Change:** `structural` — keep the handler; add a local `copied` state and render the caption at :321 as `copied ? t('fleetExpenses.copied') : t('fleetExpenses.tapToCopy')` with `aria-live="polite"`; leave the toast calls in place if the fixer must not remove them (constraint), otherwise this is the owner's call
- **Notes:** the mutation-error toasts live in `entities/transaction/queries` (out of shard).

### shard-010-F15 · should · medium · forms
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:631` — `<Save className="h-4 w-4" />` then `{saving ? t('common.saving') : t('common.save')}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request" ; provisional (§12.2) "primary default with `Save` icon → `Loader2 animate-spin` while pending"
- **Current:** label text changes but the icon stays static while `saving`
- **Expected:** `Loader2 animate-spin motion-reduce:animate-none` replaces the icon while pending (§8 C-M2 guard)
- **Change:** `<Save className="h-4 w-4" />` → `{saving ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Save />}` — `class-level` (import `Loader2` from lucide-react)
- **Notes:** —

### shard-010-F16 · nit · high · buttons
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:287` — `<ArrowLeft className="h-4 w-4 rtl:rotate-180" />` (also `:631`, `:645`, `:659`)
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes"
- **Current:** dead `h-4 w-4` on icons inside `<Button>`
- **Expected:** no size classes (`dashboard.tsx:1043`, `header.tsx:23`)
- **Change:** drop `h-4 w-4` from the four Button icons (keep `rtl:rotate-180`) — `class-level`
- **Notes:** —

### shard-010-F17 · should · medium · spacing
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:292` — `grid items-start gap-6 lg:grid-cols-3` (and `:295` `space-y-4`, `:355` `space-y-4`)
- **Rule:** design-system §1 "12px … gap between every top-level block" ; §13 row D-S4 (dashboard `gap-3` wins)
- **Current:** 24px between the side panel and the form, 16px between stacked blocks
- **Expected:** `gap-3` (`dashboard.tsx:99`, `:134`)
- **Change:** `gap-6` → `gap-3`; `space-y-4` → `space-y-3` at :295 and :355 — `class-level`
- **Notes:** `PageShell` itself is a provisional §12.1 primitive (out of shard).

### shard-010-F18 · nit · low · type
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:723` — `<p className="text-xs text-destructive">{error.message}</p>` (also `:478`)
- **Rule:** provisional (§12.2) "message `p text-[11px] font-medium text-destructive`" ; vercel-rules "Forms" bullet "Errors inline next to fields"
- **Current:** `text-xs`, regular weight, not linked to the control
- **Expected:** `text-[11px] font-medium text-destructive`, control `aria-invalid` + `aria-describedby`
- **Change:** `text-xs` → `text-[11px] font-medium`; additive `id` on the `<p>` and `aria-describedby` on the control once F09's ids exist — `class-level`
- **Notes:** —

### shard-010-F19 · blocker · high · a11y
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:99` — `<button key={s} type="button" onClick={() => setStatus(s)}` (status chips)
- **Rule:** design-system §14 C-B4 "`aria-pressed` for toggles (tiles, presets)"
- **Current:** the four status chips carry no aria state (the media chip at :116 does)
- **Expected:** `aria-pressed={status === s}` (`scope-date-picker.tsx:132-136`)
- **Change:** add `aria-pressed={status === s}` — `class-level` (additive)
- **Notes:** —

### shard-010-F20 · should · medium · colour
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:106` — `'border-foreground bg-foreground text-background'` (also `:120`; `fleet-expenses.tsx:768`)
- **Rule:** design-system §14 C-C1 "→ Ruling: `bg-primary/10 text-primary`" ; §5.2 scope presets "`Button size=sm h-7 text-xs`, `variant` flips `default`↔`outline`" ; §3 "navy marks anything you can act on"
- **Current:** selected chip is solid ink on paper with `font-semibold`; unselected `bg-card text-muted-foreground hover:bg-accent`
- **Expected:** selected `border-primary bg-primary text-primary-foreground` (preset pill) and `font-medium`
- **Change:** `border-foreground bg-foreground text-background` → `border-primary bg-primary text-primary-foreground`; `font-semibold` → `font-medium` at :104, :118 and `fleet-expenses.tsx:766` — `class-level`
- **Notes:** same recipe in both files' chips and in `FilterChip`; apply all three together.

### shard-010-F21 · blocker · high · a11y
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:130` — `<Input value={search} onChange … placeholder={t('messages.searchPlaceholder')} className="ps-9" dir="auto" />`
- **Rule:** vercel-rules "Accessibility" bullet "Form controls need `<label>` or `aria-label`" ; "Anti-patterns" "Form inputs without labels"
- **Current:** placeholder is the only name
- **Expected:** `aria-label` (header search `header.tsx` carries a translated aria-label, §14 C-I4)
- **Change:** add `aria-label={t('messages.searchPlaceholder')}` and `type="search"` — `class-level` (additive)
- **Notes:** same at `fleet-expenses.tsx:580` (use `t('fleetExpenses.searchPlaceholder')`).

### shard-010-F22 · should · high · motion
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:89` — `<RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />`
- **Rule:** design-system §8 "Nothing else loops; the `RefreshCw` retry icon never spins" ; §14 C-M2 "`motion-reduce:animate-none`"
- **Current:** refresh icon spins while fetching, with no reduced-motion guard
- **Expected:** static icon (`dashboard.tsx:1041-1043`); if a spin is kept it must carry `motion-reduce:animate-none`
- **Change:** `cn('h-4 w-4', query.isFetching && 'animate-spin')` → `cn(query.isFetching && 'animate-spin motion-reduce:animate-none')` (drop `h-4 w-4`, §5.1) — `class-level`
- **Notes:** same at `fleet-expenses.tsx:285` (RefreshCw) and `:295` (`Download … animate-pulse` — add `motion-reduce:animate-none`).

### shard-010-F23 · blocker · medium · a11y
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:79` — `<Button variant="outline" size="sm" onClick …><ArrowLeft …/><span className="hidden sm:inline">`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"
- **Current:** below `sm` the label is `display:none` (removed from the accessibility tree), leaving an icon-only button with no name — Back and Refresh here; Refresh, Export and Add at `fleet-expenses.tsx:276-306`
- **Expected:** a name that survives the hidden label
- **Change:** add `aria-label={t('messages.backToExpenses')}` / `aria-label={t('common.refresh')}` (and in `fleet-expenses.tsx`: `common.refresh`, `common.export`, `fleetExpenses.addExpense`) to each Button — `class-level` (additive)
- **Notes:** —

### shard-010-F24 · should · high · pills
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:215` — `'rounded-full px-2 py-0.5 text-xs font-medium'` + `STATUS_TONE[message.status]`
- **Rule:** design-system §5.3 "Status pill `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium` + `border-X/40 bg-X/10 text-X`" ; §14 C-T3
- **Current:** borderless chip geometry with `text-xs`, colours from `STATUS_TONE`
- **Expected:** the Badge/ConnectionBadge recipe (`badge.tsx:5-20`, `dashboard.tsx:216-249`)
- **Change:** `rounded-full px-2 py-0.5 text-xs font-medium` → `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium` — `class-level`; the tone classes are `out-of-shard: src/entities/raw-message/schemas.ts` (`STATUS_TONE` must yield `border-X/40 bg-X/10 text-X`)
- **Notes:** —

### shard-010-F25 · should · high · loading
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:144` — `<Skeleton key={i} className="h-28 w-full" />`
- **Rule:** design-system §14 C-R2 "a skeleton takes the radius of the box it stands in: cards `rounded-lg`"
- **Current:** default `rounded-md` skeleton standing in for `rounded-lg` cards (:211)
- **Expected:** `rounded-lg` (`dashboard.tsx:126`, `:162`)
- **Change:** `h-28 w-full` → `h-28 w-full rounded-lg` — `class-level`
- **Notes:** —

### shard-010-F26 · should · medium · spacing
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:211` — `rounded-lg border bg-card p-3 sm:p-4`
- **Rule:** design-system §1 "12px … KPI card padding … the same step is reused at page, card and panel-body level" ; §13 row D-S3
- **Current:** card padding steps up to 16px at `sm`
- **Expected:** `p-3` at all widths (`dashboard.tsx:425`)
- **Change:** `p-3 sm:p-4` → `p-3` — `class-level`
- **Notes:** —

### shard-010-F27 · nit · medium · type
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:233` — `<span className="italic text-muted-foreground">{t('messages.emptyBody')}</span>`
- **Rule:** design-system §2 "`italic` appears only on 11px caveats" ; §14 C-T2 empty copy `text-xs`
- **Current:** italic at the parent's `text-sm`
- **Expected:** `text-xs text-muted-foreground`, no italic (`dashboard.tsx:605-608`)
- **Change:** `italic text-muted-foreground` → `text-xs text-muted-foreground` — `class-level`
- **Notes:** —

### shard-010-F28 · should · medium · buttons
- **Where:** `src/pages/fleet-expenses/fleet-expenses-messages.tsx:261` — `<Button variant="secondary" className="min-h-11 w-full sm:min-h-9 sm:w-auto"`
- **Rule:** design-system §5.1 "`destructive`, `secondary`, `link`, `success` — defined, not rendered anywhere in the reference" ; §3 "Actionable (navy) … Default Button"
- **Current:** the card's one action is the unused `secondary` (muted) variant
- **Expected:** `default` (navy) for the primary action, or `outline` as the neutral in-card button (DegradedStrip retry `dashboard.tsx:1041`)
- **Change:** `variant="secondary"` → `variant="outline"` — `class-level`
- **Notes:** —

### shard-010-F29 · blocker · high · radius
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:353` — `'col-span-2 rounded-xl text-start outline-none transition-shadow …'` (also `:380` cash-in strip, `:402-403` chart skeletons)
- **Rule:** design-system §14 C-R1 "`rounded-lg` everywhere; `rounded-xl` retired"
- **Current:** `rounded-xl` on the uncategorized tile button, the cash-in strip and both chart skeletons
- **Expected:** `rounded-lg` (`dashboard.tsx:135`, `:126`)
- **Change:** `rounded-xl` → `rounded-lg` at :353, :380, :402, :403 — `class-level`
- **Notes:** the `StatCard` inside :358 is `rounded-lg` (Card), so the button's ring currently mismatches its child's corner.

### shard-010-F30 · blocker · high · colour
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:649` — `<Fuel className="h-4 w-4 text-amber-500" />` and `:656` `<HandCoins className="h-4 w-4 text-sky-500" />`
- **Rule:** design-system §0.2 palette rule "Two hues, one job each … Adding a third accent colour breaks the whole scheme, so don't" ; §3 "third hues only in charts/maps"
- **Current:** raw amber and sky icons decorating the source toggles
- **Expected:** neutral `text-muted-foreground` (labels/hints recede, §2) — or `text-money` for the fuel icon only if it denotes payment
- **Change:** `text-amber-500` → `text-muted-foreground`; `text-sky-500` → `text-muted-foreground` — `class-level`; add `aria-hidden="true"` (vercel "Decorative icons need `aria-hidden`")
- **Notes:** —

### shard-010-F31 · blocker · high · money
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:501` — `<span className="tabular-nums font-medium">{formatMoney(slice.amount)}</span>` (also `:537`, `:565`, `:385-386` `ms-2 tabular-nums text-muted-foreground` + `formatMoney(pendingIn.total)`)
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`" ; §3 "Money (amber) `text-money` on figures"
- **Current:** sans `tabular-nums font-medium` (donut legend, by-category list, advances-by-person) and muted sans for the cash-in total
- **Expected:** `font-mono tabular-nums text-money` (`dashboard.tsx:522`, `:641`, `:991`)
- **Change:** `tabular-nums font-medium` → `font-mono tabular-nums text-money` at :501, :537, :565; `ms-2 tabular-nums text-muted-foreground` → `ms-2 font-mono tabular-nums text-money` at :385 — `class-level`
- **Notes:** the `StatCard` values at :319/:335 (`${formatMoney(...)} EGP`, `tone="primary"`) are also money — `out-of-shard: src/shared/ui/stat-card.tsx` (no money tone exists there); record for the shard that owns it.

### shard-010-F32 · should · high · states
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:469` — `<p className="py-6 text-center text-sm text-muted-foreground">`
- **Rule:** design-system §14 C-S3/C-T2 "one recipe `py-6 text-center text-xs text-muted-foreground`"
- **Current:** `text-sm`
- **Expected:** `text-xs` (`dashboard.tsx:180-183`)
- **Change:** `text-sm` → `text-xs` — `class-level`
- **Notes:** —

### shard-010-F33 · should · high · pills
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:558` — `shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground`
- **Rule:** design-system §5.3 "Chip `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`" ; §14 C-T3
- **Current:** 11px, regular weight
- **Expected:** `text-[10.5px] font-medium` (`dashboard.tsx:583`)
- **Change:** `text-[11px]` → `text-[10.5px] font-medium` — `class-level`
- **Notes:** —

### shard-010-F34 · should · high · colour
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:647` — `rounded-lg border bg-muted/30 px-3 py-2`
- **Rule:** design-system §14 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"
- **Current:** `bg-muted/30` tray
- **Expected:** `bg-muted/40` (`dashboard.tsx:494`)
- **Change:** `bg-muted/30` → `bg-muted/40` — `class-level`
- **Notes:** —

### shard-010-F35 · should · high · loading
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:203` — `full: <Skeleton className="h-5 w-24" />, compact: <Skeleton className="h-5 w-16" />` (also `:669` `h-14 w-full`)
- **Rule:** design-system §14 C-R2 "text bars `rounded-sm`, flush list rows `rounded-none`, cards `rounded-lg`"
- **Current:** default `rounded-md` for a 20px text bar and for the ledger-row placeholders
- **Expected:** `rounded-sm` for the value bars (`dashboard.tsx:459-467`); the ledger placeholders take the radius of `LedgerList` rows (`out-of-shard: src/widgets/fleet-expenses-table/ledger-list.tsx` — `rounded-lg` if row-cards, `rounded-none` if flush)
- **Change:** `h-5 w-24` → `h-5 w-24 rounded-sm`, `h-5 w-16` → `h-5 w-16 rounded-sm`; :669 add the row radius once known — `class-level`
- **Notes:** —

### shard-010-F36 · should · medium · colour
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:354` — `uncatOnly && 'ring-2 ring-warning'`
- **Rule:** design-system §14 C-C1 "selected fill … `bg-primary/10 text-primary` (+ `border-primary` on tiles)" ; §3 "Focus ring … `ring-ring`" (the ring channel is focus, not selection)
- **Current:** selected state expressed as a warning-coloured ring, which collides with the focus ring on the same element
- **Expected:** selected tile `border-primary bg-primary/10 text-primary` (`dashboard.tsx:737`)
- **Change:** `'ring-2 ring-warning'` → `'[&>*]:border-primary [&>*]:bg-primary/10'` (targets the child `StatCard`) — `class-level`; or pass the state to `StatCard` via `className="border-primary bg-primary/10"` on :368 conditionally
- **Notes:** the warning *tone* on the card (`tone={uncatCount > 0 ? 'warning' : 'default'}`) may stay — it is status, not selection.

### shard-010-F37 · should · medium · spacing
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:312` — `grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3` (also `:401`, `:407`, `:518` `grid gap-4`)
- **Rule:** design-system §1 "KPI grid gap … 12px" ; "Fleet+exceptions: `grid gap-3 lg:grid-cols-[1.6fr_1fr]`" ; §13 rows D-S4/D-S5
- **Current:** 16px gaps between stat cards (≥sm) and between chart/breakdown cards
- **Expected:** `gap-3` at all widths (`dashboard.tsx:359`, `:134`)
- **Change:** `gap-3 sm:gap-4` → `gap-3`; `gap-4` → `gap-3` at :401, :407, :518 — `class-level`
- **Notes:** —

### shard-010-F38 · nit · medium · rtl
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:710` — `{t('fleetExpenses.reviewLink')} ›`
- **Rule:** design-system §9 "Directional chevrons get `rtl:rotate-180`"
- **Current:** a literal `›` glyph that points the wrong way in Arabic and is outside `t()`
- **Expected:** a `ChevronRight h-3 w-3 rtl:rotate-180 aria-hidden` icon (`dashboard.tsx:389` pattern in this file's own cash-in strip)
- **Change:** `structural` — replace the text glyph with `<ChevronRight className="inline h-3 w-3 rtl:rotate-180" aria-hidden="true" />`
- **Notes:** —

### shard-010-F39 · nit · high · buttons
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:304` — `<Plus className="h-4 w-4" />` (also `:689`; `fleet-expenses-messages.tsx:80`)
- **Rule:** design-system §5.1 "icons inside a Button carry no size classes"
- **Current:** dead `h-4 w-4` on Button icons
- **Expected:** no size classes (`dashboard.tsx:1043`)
- **Change:** drop `h-4 w-4` — `class-level`
- **Notes:** the RefreshCw/Download icons are covered by F22.

### shard-010-F40 · should · medium · a11y
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:382` — `<ArrowDownLeft className="h-4 w-4 shrink-0 text-warning" />` (also `:389` ChevronRight, `:493` legend `<i>`, `:579` Search icon, `messages.tsx:129`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden=\"true\"`" ; design-system §9 "`aria-hidden` on dots/chevrons/severity bars"
- **Current:** decorative icons and legend dots without `aria-hidden`
- **Expected:** `aria-hidden="true"` (`dashboard.tsx:749`, `:814`)
- **Change:** add `aria-hidden="true"` to each — `class-level` (additive)
- **Notes:** —

## Summary
FINDINGS: 40 (blocker 13 / should 21 / nit 6)
