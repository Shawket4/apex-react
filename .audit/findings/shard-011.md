# Findings — shard-011

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/fleet-expenses-table/cash-in-review.tsx` | 243 | audited | `bg-warning/5` section tint — no rule for a "review pocket" panel tint beyond the status-tint recipe (§3), flagged as should. Bottom-sheet `rounded-t-2xl`: no rule for sheet-edge radius (Sheet primitive has none) — no rule. |
| `src/widgets/fleet-expenses-table/ledger-list.tsx` | 657 | audited | Sticky day header: dashboard has none (D-L4 records trips' as a deviation, no dashboard rule) — no rule. Desktop `<table>` structure: only provisional §12.4. Tooltip primitive: no rule. |
| `src/widgets/fleet-expenses-table/party-picker.tsx` | 320 | audited | `z-[10060]` literal on PopoverContent: §0.5 says overlays use `OVERLAY_Z` — recorded as finding. Suggestion card `bg-muted/30` — C-C2 three-step scale. |
| `src/widgets/fleet-expenses-table/split-editor.tsx` | 481 | audited | Part index eyebrow `text-xs uppercase tracking-wide` vs §2 eyebrow. Sheet `max-w-lg` sizing — call sites may size to content (C-B6), no rule. |
| `src/entities/fuel-event/api.ts` | 47 | no UI content | — |
| `src/entities/fuel-event/defaults.ts` | 16 | no UI content | — |
| `src/entities/fuel-event/queries.ts` | 105 | no UI content | `toast.*` on mutation feedback — §7 says the reference never toasts, but §12.6 (provisional) records toasts for mutations and D-ST3 lists it as an unruled deviation; not flagged (data/logic file). |
| `src/entities/fuel-event/schemas.ts` | 115 | no UI content | Zod messages are hard-coded English (`'Please select a vehicle'`, …) and surface via `FormMessage`; C-I4 governs aria/sr-only strings, §9 "copy … all go through `t()`". Recorded here, not flagged: pure schema file per the run's rule; fixing would be `out-of-shard`-adjacent (needs locale files). |
| `src/widgets/fuel-event-form/fuel-event-form.tsx` | 496 | audited | `Card` shadow (D-R1) and `space-y-6` form rhythm (D-S4) come from provisional §12.2 — noted, not flagged against §12. Efficiency box classes come from `shared/lib/fuel.ts` (reference) — not flagged. |

## Findings

### shard-011-F01 · blocker · high · colour
- **Where:** `src/widgets/fleet-expenses-table/cash-in-review.tsx:171` — `text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400`
- **Rule:** design-system §0.2 palette rule "Two hues, one job each … amber marks anything someone gets paid … Adding a third accent colour breaks the whole scheme, so don't"; §3 Money "revenue is not a passing status, and reusing the success green for it is what made a figure look like a badge"; §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"
- **Current:** incoming amount in Tailwind emerald (a non-token third hue), sans, `font-semibold`
- **Expected:** `font-mono text-sm font-semibold tabular-nums text-money` (`dashboard.tsx:632`)
- **Change:** `class-level` — `text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400` → `font-mono text-sm font-semibold tabular-nums text-money`
- **Notes:** the `+` sign already distinguishes direction; `dir="ltr"` stays.

### shard-011-F02 · blocker · high · colour
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:365` — `isIn && 'text-emerald-600 dark:text-emerald-400'`
- **Rule:** design-system §0.2 palette rule "Adding a third accent colour breaks the whole scheme, so don't"; §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"
- **Current:** `Amount` renders `whitespace-nowrap font-semibold tabular-nums` in sans, and emerald for `direction === 'in'`
- **Expected:** `font-mono text-sm font-semibold tabular-nums text-money` (`dashboard.tsx:632`)
- **Change:** `class-level` — base string `'whitespace-nowrap font-semibold tabular-nums'` → `'whitespace-nowrap font-mono font-semibold tabular-nums text-money'`; the `isIn && 'text-emerald-600 dark:text-emerald-400'` branch value → `'text-money'` (keep the conditional; it just no longer changes colour)
- **Notes:** used by both `TxnCard` (mobile) and `TxnRow` (desktop, `text-end` cell). The `+`/`−` prefix carries direction.

### shard-011-F03 · blocker · high · colour
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:414` — `<Fuel className="h-3.5 w-3.5 shrink-0 text-amber-500" />`
- **Rule:** design-system §0.2 palette rule "Everything else is neutral … Adding a third accent colour breaks the whole scheme, so don't"; §3 Non-token colours "No hex/rgb in any dashboard or shell TSX"
- **Current:** source-flag icons in raw Tailwind hues: `text-amber-500` (Fuel, :414), `text-sky-500` (HandCoins, :415), `text-amber-600 dark:text-amber-400` (PenLine, :427)
- **Expected:** neutral `text-muted-foreground` for informational icons (the Lock icon on :419 already does this; `dashboard.tsx` icons use only `text-muted-foreground`/`text-warning`)
- **Change:** `class-level` — `text-amber-500` → `text-muted-foreground`; `text-sky-500` → `text-muted-foreground`; `text-amber-600 dark:text-amber-400` → `text-muted-foreground`
- **Notes:** identity is still carried by the glyph and the tooltip. If the fixer wants the "edited" flag to read as attention, `text-warning` is the token role for that (§3 Warning).

### shard-011-F04 · blocker · high · colour
- **Where:** `src/widgets/fleet-expenses-table/split-editor.tsx:357` — `? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'`
- **Rule:** design-system §0.2 palette rule "Adding a third accent colour breaks the whole scheme, so don't"; §3 Success "passing status only"; Warning "degraded / attention, not failure"
- **Current:** remainder line uses emerald for "fully allocated" and amber for "remaining"
- **Expected:** token status colours: `text-success` (passing status) and `text-warning` (needs attention); `text-destructive` is already correct
- **Change:** `class-level` — `'text-emerald-600 dark:text-emerald-400'` → `'text-success'`; `'text-amber-600 dark:text-amber-400'` → `'text-warning'`
- **Notes:** this line contains money figures inside a sentence; the status colour is the sentence's role, so `text-money` is not required here.

### shard-011-F05 · blocker · high · colour
- **Where:** `src/widgets/fleet-expenses-table/split-editor.tsx:321` — `<p className="text-xs text-amber-600 dark:text-amber-400">`
- **Rule:** design-system §0.2 palette rule "Adding a third accent colour breaks the whole scheme, so don't"; provisional (§12.2) validation "message `p text-[11px] font-medium text-destructive`"
- **Current:** "party required" inline validation in raw amber
- **Expected:** token colour; the provisional form rule puts required-field messages in `text-destructive`
- **Change:** `class-level` — `text-xs text-amber-600 dark:text-amber-400` → `text-[11px] font-medium text-destructive` (or `text-warning` if the fixer prefers the non-blocking-hint reading; either is a token)

### shard-011-F06 · blocker · high · colour
- **Where:** `src/widgets/fleet-expenses-table/party-picker.tsx:278` — `<CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />`
- **Rule:** design-system §0.2 palette rule "Adding a third accent colour breaks the whole scheme, so don't"; §3 Success `text-success` "passing status"
- **Current:** matched-suggestion check in raw emerald
- **Expected:** `text-success`
- **Change:** `class-level` — `text-emerald-500` → `text-success`; add `aria-hidden="true"` (decorative icon, vercel-rules "Accessibility" "Decorative icons need `aria-hidden`")

### shard-011-F07 · blocker · high · a11y
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:567` — `<tr data-txn-id={row.id} onClick={tappable ? onOpen : undefined}`
- **Rule:** vercel-rules "Accessibility" bullet "Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)" and "`<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)"; "Focus States" "Interactive elements need visible focus"; design-system §5.2 fuel row = `<Link … focus-visible:ring-inset>`
- **Current:** the desktop row is a click-only `<tr>` with no `tabIndex`, no `onKeyDown`, no `role`, no focus ring; keyboard users cannot open the edit page from the table
- **Expected:** navigation as a `<Link>` carrying `state.from` (`dashboard.tsx:611-617`) or, at minimum, a focusable row with Enter/Space and `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-inset`
- **Change:** `structural` (additive) — add `tabIndex={tappable ? 0 : undefined}`, `role={tappable ? 'link' : undefined}`, `onKeyDown={tappable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}`, and append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-inset` to the `tappable` class branch. Also add the same `focus-visible:…` classes to the mobile `TxnCard` div (`:483`), which has keyboard handling but no visible ring.
- **Notes:** keep `onClick` and the `onPointerOver` delegation on `<tbody>` as they are; add `onFocus` warm parity per C-B5 if convenient (focus already fires nothing today).

### shard-011-F08 · blocker · high · a11y
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:470` — `<div role={tappable ? 'button' : undefined} tabIndex={tappable ? 0 : undefined} onClick={tappable ? onOpen : undefined}`
- **Rule:** vercel-rules "Anti-patterns" bullet "Inline `onClick` navigation without `<a>`"; "Navigation & State" "Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)"; design-system §5.2 Fuel-event row "`<Link … >` carrying `state.from` for back-navigation" — navigation
- **Current:** the mobile card navigates to `/fleet-expenses/:id/edit` via `navigate()` from a `role="button"` div (and via `<tr onClick>` on desktop); no middle-click/Cmd-click, wrong role for navigation
- **Expected:** a `<Link to=… state={{ from: 'ledger' }}>` as the dashboard fuel row (`dashboard.tsx:611-617`)
- **Change:** `structural` — wrap the card content in `<Link to={`/fleet-expenses/${row.id}/edit`} state={{ from: 'ledger' }} className="…">` when `tappable` (keep `onOpen` prop and handler wiring; `onClick={onOpen}` can remain on the Link for parity). Inner buttons already `stopPropagation`; they must additionally call `e.preventDefault()` when nested in an anchor.
- **Notes:** nesting `<button>` inside `<a>` is invalid HTML; if the fixer keeps the div, at least F07's focus ring applies. Mark as `structural`; acceptable to defer with F07 applied.

### shard-011-F09 · blocker · high · a11y
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:419` — `<Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />` as `TooltipTrigger asChild`
- **Rule:** vercel-rules "Accessibility" bullet "Interactive elements need keyboard handlers"; "Focus States" "Interactive elements need visible focus"; "Accessibility" "Decorative icons need `aria-hidden`"
- **Current:** Lock (:419) and PenLine (:427) SVGs are tooltip triggers with no focusable element; the "read-only source" / "edited by" information is hover-only and unreachable by keyboard or touch. The Fuel/HandCoins icons (:414-415) have no accessible name at all.
- **Expected:** trigger on a focusable element with a name (dashboard uses native `title` for compressed context, §9 ARIA)
- **Change:** `structural` (additive) — wrap each icon trigger in `<span tabIndex={0} className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" aria-label={…}>` (or add `aria-label`/`title` + `tabIndex={0}` on the svg via lucide props) and `aria-hidden` on the glyph; add `aria-label={t('fleetExpenses.sourceFuel', { defaultValue: 'Fuel event' })}` / loan equivalents to the Fuel/HandCoins icons (`out-of-shard: src/shared/i18n/en.json, ar.json` for the two new keys — or reuse `title` with an existing key if one exists)

### shard-011-F10 · blocker · high · a11y
- **Where:** `src/widgets/fleet-expenses-table/split-editor.tsx:279` — `<Label className="text-xs">{t('fleetExpenses.fields.amount')}</Label>` followed by `<Input … />`
- **Rule:** vercel-rules "Forms" bullet "Labels clickable (`htmlFor` or wrapping control)"; "Accessibility" "Form controls need `<label>` or `aria-label`"; "Anti-patterns" "Form inputs without labels"
- **Current:** amount Input (:280), category NativeSelect (:294) and the "to whom" Label (:311) have no `htmlFor`/`id` pairing — the labels are visual only; the inputs have no accessible name
- **Expected:** `htmlFor={id}` + `id` per draft (`useId()` or `split-${draft.key}-amount`)
- **Change:** `class-level` (attribute-level) — add `htmlFor={`split-${draft.key}-amount`}` / `id="split-…-amount"` and `htmlFor={`split-${draft.key}-category`}` / `id` on the NativeSelect; the party field's Label can use `id` + `aria-labelledby` on the SmartPartyField's trigger if the primitive forwards props (else `out-of-shard: src/shared/ui/searchable-select.tsx` — no, the picker here is in-shard: add `aria-labelledby` prop pass-through to `PartyPicker`'s Button)
- **Notes:** also add `name` and `autoComplete="off"` to the amount input (vercel "Forms" "Inputs need `autocomplete` and meaningful `name`").

### shard-011-F11 · blocker · high · a11y
- **Where:** `src/widgets/fuel-event-form/fuel-event-form.tsx:262` — `<button type="button" onClick={…} className="ms-auto inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">`
- **Rule:** vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*`"; design-system §4 Focus ring "`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element (C-B1)"
- **Current:** raw clear button with hover only, no focus ring. Same on: `ledger-list.tsx:263` category tile, `:501` add-category chip, `:521` split chip, `:635` split icon button; `split-editor.tsx:265` remove-part button, `:464` `SplitChip`; `party-picker.tsx:183` create-employee row
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`dashboard.tsx:735`, `:940`)
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to each of the eight raw buttons listed (`ring-inset` on the party-picker footer row and the table icon button, which sit inside clipped/overflow parents)

### shard-011-F12 · blocker · high · a11y
- **Where:** `src/widgets/fuel-event-form/fuel-event-form.tsx:259` — `<div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 text-xs text-primary">`
- **Rule:** design-system §9 "Rule C-I1: no physical `ml-/mr-/left-/right-` utilities"; §14 C-I1 "logical utilities everywhere"
- **Current:** `left-0 right-0` (physical); also the parent `FormItem` has no `relative`, so `absolute bottom-0` positions against an ancestor
- **Expected:** `inset-x-0` (direction-neutral) — dashboard uses `end-1.5`/`start-*` (`dashboard.tsx:741`)
- **Change:** `class-level` — `left-0 right-0` → `inset-x-0`
- **Notes:** the absolute overlay and its `bottom-0` placement have no rule; only the physical utilities are flagged.

### shard-011-F13 · blocker · medium · a11y
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:601` — `<span onClick={(e) => e.stopPropagation()}>`
- **Rule:** vercel-rules "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"
- **Current:** a click-swallowing `<span>` wrapper around the NativeSelect
- **Expected:** stop propagation on the control itself
- **Change:** `class-level` (attribute-level) — move `onClick={(e) => e.stopPropagation()}` onto the `NativeSelect` (keep the span if the primitive does not forward `onClick`; then `out-of-shard: src/shared/ui/native-select.tsx`)
- **Notes:** medium confidence: the span is not itself interactive to users; flagged because it literally matches the anti-pattern bullet.

### shard-011-F14 · should · high · loading
- **Where:** `src/widgets/fuel-event-form/fuel-event-form.tsx:196` — `<Skeleton className="h-40 w-full" />`
- **Rule:** design-system §14 C-R2 "a skeleton takes the radius of the box it stands in: cards `rounded-lg`"; §7 "Loading is always the `Skeleton` primitive shaped like the slot"
- **Current:** three card-height skeletons at the primitive default `rounded-md`, `space-y-4` (form cards are `rounded-lg` in `space-y-6`)
- **Expected:** `rounded-lg` (`dashboard.tsx:126`, `:162`) in the same rhythm as the content they replace
- **Change:** `class-level` — each `h-40 w-full` / `h-56 w-full` → add `rounded-lg`; wrapper `space-y-4` → `space-y-6`

### shard-011-F15 · should · high · type
- **Where:** `src/widgets/fuel-event-form/fuel-event-form.tsx:434` — `<p className="text-xl font-semibold">{formatNumber(calc.distance, 0)} km</p>`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values …"; §2 table row 22px "KPI value" `font-mono text-[22px] font-semibold leading-none tabular-nums`
- **Current:** distance (:434) and fuel-rate (:439) headline figures in sans `text-xl font-semibold`, no tabular-nums
- **Expected:** `font-mono text-[22px] font-semibold leading-none tabular-nums` (`dashboard.tsx:433`); label above as the eyebrow `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` with `mb-1.5` (`dashboard.tsx:427`, §10 KPI card) instead of `text-xs text-muted-foreground` (:433, :437)
- **Change:** `class-level` — `text-xl font-semibold` → `font-mono text-[22px] font-semibold leading-none tabular-nums` on both figures; `text-xs text-muted-foreground` → `mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` on both labels
- **Notes:** the unit strings (`km`, `t('fuelEvents.efficiency.unit')`) may stay inline; " km" is untranslated (see F22).

### shard-011-F16 · should · high · colour
- **Where:** `src/widgets/fuel-event-form/fuel-event-form.tsx:366` — `<div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-semibold shadow-sm">{formatCurrency(calc.totalPrice)}</div>`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"; §14 C-C2 muted steps "`/60` head band, `/50` hover, `/40` wells"; provisional (§12.2) Input `h-9`
- **Current:** total price in sans, foreground colour, `bg-muted/30` well, `h-10` (taller than the 36px inputs beside it)
- **Expected:** `font-mono tabular-nums text-money` (`dashboard.tsx:632`), `bg-muted/40`, `h-9`
- **Change:** `class-level` — `h-10 … bg-muted/30 px-3 text-sm font-semibold` → `h-9 … bg-muted/40 px-3 font-mono text-sm font-semibold tabular-nums text-money`

### shard-011-F17 · should · high · colour
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:193` — `<span className="tabular-nums" dir="ltr">− {formatMoney(total.out)}</span>`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"
- **Current:** day total in sans, muted (inherits `text-muted-foreground` from the header)
- **Expected:** `font-mono tabular-nums text-money`; the PanelHead aside pattern keeps size but promotes data (`dashboard.tsx:1003`)
- **Change:** `class-level` — `tabular-nums` → `font-mono tabular-nums text-money`
- **Notes:** same rule applies to the money in `SplitChip` (`split-editor.tsx:476` `tabular-nums` → `font-mono tabular-nums`; colour stays `text-primary` because the chip is actionable) and the tooltip principal/fee lines (`ledger-list.tsx:379-385`: add `font-mono tabular-nums`).

### shard-011-F18 · should · high · type
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:404` — `rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground`
- **Rule:** design-system §5.3 Chip / In-row tag "`rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium` (C-T3/C-S7)"
- **Current:** category chip at `text-xs` (12px)
- **Expected:** `text-[10.5px]` (`dashboard.tsx:637`)
- **Change:** `class-level` — `text-xs` → `text-[10.5px]`

### shard-011-F19 · should · medium · type
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:507` — `min-h-9 rounded-full border border-dashed border-primary/50 px-3 py-0.5 text-xs font-semibold text-primary lg:min-h-8 lg:px-2.5`
- **Rule:** design-system §5.3 "Two pill recipes remain: the 11px status pill and the 10.5px neutral chip (C-T3)"; §4 Border "Dashed = 'not live / placeholder / degraded'"; §14 C-R4 "`border-border/60` for dashed hairlines"
- **Current:** add-category (:507) and split (:527) affordances are dashed pills at `text-xs font-semibold` with `border-primary/50`; `SplitChip` (`split-editor.tsx:471`) is `text-xs font-medium`
- **Expected:** pill text at `text-[11px] font-medium` (status pill, `badge.tsx:6`) or `text-[10.5px] font-medium` (chip); dashed border alpha `/60`-family rather than `/50`
- **Change:** `class-level` — `:507` `text-xs font-semibold` → `text-[11px] font-medium`, `border-primary/50` → `border-primary/60`; `:527` `text-xs font-semibold` → `text-[11px] font-medium`; `split-editor.tsx:471` `text-xs` → `text-[11px]`
- **Notes:** the `min-h-9`/`lg:min-h-8` touch heights have no rule and stay. Medium: the "placeholder" dashed reading is a judgment.

### shard-011-F20 · should · high · spacing
- **Where:** `src/widgets/fleet-expenses-table/cash-in-review.tsx:106` — `<section className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-4">`
- **Rule:** design-system §14 C-R1 "token family: `rounded-lg` everywhere; `rounded-xl` retired"; §3 Status tint recipe "`border-X/40 bg-X/10 text-X` … 10% tint + 40% border"; §1 12px "panel body padding"
- **Current:** `rounded-xl`, `bg-warning/5`, `p-4`
- **Expected:** `rounded-lg border-warning/40 bg-warning/10 p-3` (DegradedStrip `dashboard.tsx:1031`; panel body `p-3`)
- **Change:** `class-level` — `rounded-xl … bg-warning/5 p-4` → `rounded-lg … bg-warning/10 p-3`

### shard-011-F21 · should · high · empty
- **Where:** `src/widgets/fleet-expenses-table/cash-in-review.tsx:65` — `flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center`
- **Rule:** design-system §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground`"; §7 "Empties are bare muted paragraphs"; §10 Empty/error `px-3 py-6 text-center text-xs text-muted-foreground`
- **Current:** a bespoke dashed box with icon, `text-sm font-medium` title and `text-xs` hint at `py-8`, `bg-muted/20`
- **Expected:** `px-3 py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:181`)
- **Change:** `structural` — replace the box with `<p className="px-3 py-6 text-center text-xs text-muted-foreground">{t('fleetExpenses.cashIn.empty')} · {t('fleetExpenses.cashIn.emptyHint')}</p>` (both strings kept; icon dropped). If the fixer must keep the two-line box, at least `py-8` → `py-6`, `bg-muted/20` → `bg-muted/40` (C-C2), `text-sm font-medium` → `text-xs`.
- **Notes:** `split-editor.tsx:247` load-failed message (`rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive`) is the error twin: expected `px-3 py-6 text-center text-xs text-muted-foreground`; class-level change there.

### shard-011-F22 · should · high · i18n
- **Where:** `src/widgets/fuel-event-form/fuel-event-form.tsx:434` — `{formatNumber(calc.distance, 0)} km`
- **Rule:** design-system §9 "Copy, aria-labels and sr-only text all go through `t()`" (C-I4)
- **Current:** hard-coded ` km` unit; also `&amp;` joiner on :211 (`{t('fuelEvents.fields.car')} &amp; {t('fuelEvents.fields.driver')}`) and ` / ` on :380 are English-assembled titles
- **Expected:** translated unit/title keys
- **Change:** `class-level` (string-level) — `km` → `{t('fuelEvents.fields.km', { defaultValue: 'km' })}`; :211 → `t('fuelEvents.fields.carAndDriver', { defaultValue: 'Car & Driver' })`; `out-of-shard: src/shared/i18n/en.json, ar.json` for the new keys (the `defaultValue` keeps it safe without them)

### shard-011-F23 · should · high · a11y
- **Where:** `src/widgets/fleet-expenses-table/cash-in-review.tsx:204` — `<ArrowRightLeft className="h-4 w-4" />` inside `<Button>`
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes (`button.tsx:7`, §15.4)"; vercel-rules "Accessibility" "Decorative icons need `aria-hidden='true'`"
- **Current:** dead `h-4 w-4` size classes on icons inside Buttons (`cash-in-review.tsx:116, 204, 214`; `party-picker.tsx:125`; `split-editor.tsx:339`; `fuel-event-form.tsx:473, 487, 489`); none are `aria-hidden`
- **Expected:** no size class; `aria-hidden="true"` on decorative glyphs beside a text label (`dashboard.tsx:1043`, `header.tsx:23`)
- **Change:** `class-level` — remove `h-4 w-4` on each listed icon and add `aria-hidden="true"` (keep `animate-spin` on the Loader2; add `motion-reduce:animate-none` per §8 C-M2)

### shard-011-F24 · should · high · a11y
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:635` — `<Split className="h-3.5 w-3.5" />` in the raw icon button
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden='true'`"
- **Current:** decorative SVGs with no `aria-hidden`: `ledger-list.tsx:529, 644`; `split-editor.tsx:222, 272, 475`; `party-picker.tsx:268, 313, 317, 188`; `fuel-event-form.tsx:210, 260, 271, 287, 379, 451`; the Sparkles/Info icons sit beside text
- **Expected:** `aria-hidden="true"` (`dashboard.tsx` dots/chevrons, §9 ARIA)
- **Change:** `class-level` (attribute) — add `aria-hidden="true"` to each

### shard-011-F25 · should · high · buttons
- **Where:** `src/widgets/fleet-expenses-table/party-picker.tsx:132` — `<PopoverContent className="z-[10060] w-[--radix-popover-trigger-width] p-0" align="start">`
- **Rule:** design-system §0.5 "`OVERLAY_Z` = `z-[10100]` (menus, popovers, selects) … A TRANSIENT overlay always floats above the CONTAINER it was opened from"; §14 C-I3 "Sheet imports `CONTAINER_Z`/`STACKED_CONTAINER_Z` instead of literals"
- **Current:** hand-coded `z-[10060]` literal (the dialog-stacked tier, not the overlay tier); a stacked `ConfirmDialog` (`z-[10060]`) opened alongside would tie with it
- **Expected:** the Popover primitive already renders at `OVERLAY_Z` (`popover.tsx`); no override needed
- **Change:** `class-level` — remove `z-[10060]` (if a bump is still needed, import `OVERLAY_Z` from `@/shared/ui/z-index` and use it instead of the literal)

### shard-011-F26 · should · high · loading
- **Where:** `src/widgets/fleet-expenses-table/cash-in-review.tsx:88` — `{query.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}`
- **Rule:** design-system §6 Flush divided list "Infinite: `<li ref aria-hidden class="h-px">` sentinel observed … loading-more `li p-3` + `Skeleton h-10`"; §7 "Loading is always the `Skeleton` primitive shaped like the slot"
- **Current:** a "Load more" outline button whose label swaps to "Loading" while fetching
- **Expected:** sentinel + `Skeleton` loading-more row (`dashboard.tsx:547-660`)
- **Change:** `structural` — add an IntersectionObserver sentinel (`rootMargin: '200px'`) below the list and render `<Skeleton className="h-24 w-full rounded-lg" />` while `isFetchingNextPage`; keep the Button as the no-JS/keyboard fallback (do not delete the handler)
- **Notes:** if the Button stays, the pending label must end with `…` (vercel "Typography" "Loading states end with `…`") — check `common.loading` in the locale files (`out-of-shard`).

### shard-011-F27 · should · high · motion
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:483` — `tappable && 'cursor-pointer active:bg-muted/40'`
- **Rule:** design-system §8 Hover "colour only, `transition-colors` … No `active:` state"; §3 Content-row hover "`hover:bg-muted/50` + `transition-colors`"; §14 C-C4 "`hover:bg-muted/50` on content rows/cards"
- **Current:** mobile card uses `active:bg-muted/40`, no `hover:`, no `transition-colors`; desktop row `hover:bg-muted/40` (`:570`) without `transition-colors`
- **Expected:** `transition-colors hover:bg-muted/50` (`dashboard.tsx:616`)
- **Change:** `class-level` — `:483` `active:bg-muted/40` → `transition-colors hover:bg-muted/50`; `:570` `hover:bg-muted/40` → `transition-colors hover:bg-muted/50`
- **Notes:** vercel "Hover & Interactive States" also asks for a `hover:` state on the card.

### shard-011-F28 · should · high · type
- **Where:** `src/widgets/fleet-expenses-table/split-editor.tsx:261` — `text-xs font-semibold uppercase tracking-wide text-muted-foreground`
- **Rule:** design-system §2 Eyebrow "`text-[10px]` 600, `uppercase tracking-wider text-muted-foreground` … one label style above every figure and panel"
- **Current:** part index eyebrow at 12px with `tracking-wide`
- **Expected:** `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (`dashboard.tsx:427`)
- **Change:** `class-level` — `text-xs … tracking-wide` → `text-[10px] … tracking-wider`

### shard-011-F29 · should · medium · spacing
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:189` — `sticky top-0 z-10 flex items-center justify-between gap-3 border-y bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground`
- **Rule:** design-system §6 Panel head "`h2 class="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"` + aside `font-medium normal-case tracking-normal`"
- **Current:** day header as a 12px semibold band on `bg-background`, `py-1.5`
- **Expected:** the PanelHead recipe: `bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider` with the total as the aside (`dashboard.tsx:999-1005`)
- **Change:** `class-level` — `bg-background px-3 py-1.5 text-xs font-semibold` → `bg-background px-3 py-2 text-[10px] font-semibold uppercase tracking-wider`; wrap the total span with `font-medium normal-case tracking-normal` (combine with F17). Keep `bg-background` opaque if `bg-muted/60` would let rows show through while sticky (sticky itself is `no rule`).
- **Notes:** medium — a sticky day header is a role the dashboard lacks; the mapping to PanelHead is a judgment.

### shard-011-F30 · should · medium · buttons
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:268` — `min-h-11 rounded-lg border px-3 py-2 text-start text-sm font-medium hover:bg-accent disabled:opacity-50`
- **Rule:** design-system §14 C-C4 "`hover:bg-muted/50` on content rows/cards, `hover:bg-accent` on chrome and menu items"; §5.2 Fleet tile "`rounded-lg border bg-card … transition-colors hover:border-primary`"
- **Current:** category tiles in the sheet are bordered cards with the chrome hover and no `transition-colors`/`bg-card`
- **Expected:** tile recipe `bg-card transition-colors hover:border-primary` (`dashboard.tsx:735`)
- **Change:** `class-level` — `rounded-lg border px-3 py-2 … hover:bg-accent` → `rounded-lg border bg-card px-3 py-2 … transition-colors hover:border-primary`

### shard-011-F31 · should · high · a11y
- **Where:** `src/widgets/fleet-expenses-table/split-editor.tsx:280` — `<Input inputMode="decimal" dir="ltr" placeholder="0.00" …>`
- **Rule:** vercel-rules "Forms" bullet "Inputs need `autocomplete` and meaningful `name`"; "Forms" "Placeholders end with `…` and show example pattern"
- **Current:** amount inputs (`split-editor.tsx:280`; `fuel-event-form.tsx:317, 341, 392, 414`) have no `name`/`autoComplete`; placeholders `0.00` / `0` without `…`
- **Expected:** `name="amount"` etc., `autoComplete="off"`, placeholder `0.00…`
- **Change:** `class-level` (attribute) — add `name` and `autoComplete="off"` to each; placeholders → `0.00…` / `0…` (the `{...field}` spread in fuel-event-form already supplies `name`; add `autoComplete="off"` there)

### shard-011-F32 · should · medium · forms
- **Where:** `src/widgets/fuel-event-form/fuel-event-form.tsx:484` — `disabled={submitting || (mode === 'edit' && !form.formState.isDirty)}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request"; "Forms" "Warn before navigation with unsaved changes (`beforeunload` or router guard)"
- **Current:** submit is disabled while not dirty in edit mode (the spinner part is correct); no unsaved-changes guard on a dirty form
- **Expected:** enabled submit that validates on click; a `beforeunload`/router blocker while `isDirty`
- **Change:** `class-level` — drop the `!form.formState.isDirty` gate from `disabled` is a behaviour change, so instead keep it and add `structural` (additive): `React.useEffect` registering `beforeunload` while `form.formState.isDirty && !submitting`
- **Notes:** medium — the dirty-gate is arguably intentional; the guard is the safe additive part.

### shard-011-F33 · nit · high · motion
- **Where:** `src/widgets/fuel-event-form/fuel-event-form.tsx:487` — `<Loader2 className="h-4 w-4 animate-spin" />`
- **Rule:** design-system §8 "Reduced motion … opt-out is per element (`motion-reduce:animate-none`)"; vercel-rules "Animation" "Honor `prefers-reduced-motion`"
- **Current:** spinner with no reduced-motion guard
- **Expected:** `animate-spin motion-reduce:animate-none` (`skeleton.tsx:4`)
- **Change:** `class-level` — add `motion-reduce:animate-none` (and remove `h-4 w-4`, F23)

### shard-011-F34 · nit · high · spacing
- **Where:** `src/widgets/fleet-expenses-table/party-picker.tsx:265` — `<div className="rounded-lg border bg-muted/30 p-3">`
- **Rule:** design-system §14 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"
- **Current:** suggestion card well at `bg-muted/30`
- **Expected:** `bg-muted/40` (`dashboard.tsx:841`)
- **Change:** `class-level` — `bg-muted/30` → `bg-muted/40`

### shard-011-F35 · nit · high · type
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:493` — `font-mono text-[11px] [overflow-wrap:anywhere]`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`)"; §6 Truncation "identifiers (date, plate) are `shrink-0`" — reference mono identifiers are never smaller than the surrounding meta
- **Current:** reference token at 11px inside a 12px meta line; desktop `:623` at `text-xs`
- **Expected:** same size as the meta line (`text-xs`) like the plate in the fuel-row meta line (`dashboard.tsx:621`)
- **Change:** `class-level` — `text-[11px]` → remove (inherit `text-xs`)

### shard-011-F36 · nit · medium · a11y
- **Where:** `src/widgets/fleet-expenses-table/cash-in-review.tsx:128` — `max-h-[85dvh] overflow-y-auto rounded-t-2xl p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]`
- **Rule:** vercel-rules "Touch & Interaction" bullet "`overscroll-behavior: contain` in modals/drawers/sheets"
- **Current:** scrolling bottom sheets (`cash-in-review.tsx:128`, `ledger-list.tsx:253`, `split-editor.tsx:239` body) without `overscroll-contain`
- **Expected:** `overscroll-contain` on the scrolling element (`command.tsx:63-71` list uses `overscroll-contain`, §6)
- **Change:** `class-level` — add `overscroll-contain` beside each `overflow-y-auto`

### shard-011-F37 · nit · high · typography
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:611` — `<option value="">+ {t('fleetExpenses.addCategory')}</option>`
- **Rule:** vercel-rules "Dark Mode & Theming" bullet "Native `<select>`: explicit `background-color` and `color` (Windows dark mode)"
- **Current:** `NativeSelect` used with `className="w-36"`; whether it sets `bg-background text-foreground` lives in the primitive
- **Expected:** explicit `bg-background text-foreground` on the native select
- **Change:** `class-level` — `className="w-36"` → `className="w-36 bg-background text-foreground"` (harmless if the primitive already sets them; the primitive itself is `out-of-shard: src/shared/ui/native-select.tsx`). Same for `split-editor.tsx:294`.

## Summary
FINDINGS: 37 (blocker 13 / should 19 / nit 5)
