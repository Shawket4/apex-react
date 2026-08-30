# Findings — shard-028

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/trips-table/receipt-status-badge.tsx` | 59 | audited | listed in §13 D-C7; §12.4 documents this component's current values |
| `src/widgets/trips-table/revenue-breakdown.tsx` | 229 | audited | §12.4 "Pressable money figure", §13 D-L2/D-T12/D-C9 |
| `src/widgets/trips-table/trip-row.ts` | 113 | no UI content | pure row model + `groupByDate`; no JSX, no classes. `DROP_SEPARATOR` (Arabic comma) is content policy, no rule |
| `src/widgets/trips-table/trips-desktop-table.tsx` | 627 | audited | §12.4 "Bespoke trips table"; §13 D-C3/C4/C5, D-T3, D-L3, D-R4, D-ST5 |
| `src/widgets/trips-table/trips-filters.tsx` | 256 | audited | §12.3 segmented tray & popover checklist; §13 D-B1/D-B2 |
| `src/widgets/trips-table/trips-mobile-list.tsx` | 391 | audited | §12.4 "Mobile card list"; §13 D-R2, D-L4, D-C3/C5, D-ST5/ST7 |
| `src/widgets/trips-table/trips-pagination.tsx` | 253 | audited | §12.4 "Pagination strip"; §13 D-B1/D-B3 |
| `src/widgets/trips-table/trips-table.tsx` | 82 | no UI content | switch component only; the desktop/mobile split at 768px is §13 D-S9, recorded there, no rule to apply here |
| `src/entities/user/api.ts` | 33 | no UI content | axios calls only |
| `src/entities/user/queries.ts` | 69 | no UI content | TanStack hooks + `prefetchUsers`; no JSX |
| `src/entities/user/schemas.ts` | 42 | no UI content | zod schemas. Validation messages are hard-coded English strings, but they are schema-level (not rendered copy the design system rules on) — no rule |
| `src/widgets/user-menu/user-menu.tsx` | 99 | reference — not audited | |

## Findings

### shard-028-F01 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/user-form-dialog/user-form-dialog.tsx:200` — `className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"`
- **Rule:** design-system §14 C-I1 "logical utilities everywhere"; §9 "no physical `ml-/mr-/left-/right-` utilities"
- **Current:** the password reveal button is pinned with the physical `right-0`, so in Arabic it sits on the wrong side of the field, on top of the text-entry edge.
- **Expected:** logical inset, as everywhere else in the reference (`dialog.tsx:52` close button uses `end-4`).
- **Change:** `absolute right-0 top-0` → `absolute end-0 top-0` — `class-level`
- **Notes:** this dialog renders in RTL; the field itself is direction-flipped by the shell, the button is not.

### shard-028-F02 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/user-form-dialog/user-form-dialog.tsx:221` — `<Loader2 className="mr-2 h-4 w-4 animate-spin" />`
- **Rule:** design-system §14 C-I1 "logical utilities everywhere"; §13 D-I1 (`mr-2` spinner listed as a trips deviation, `confirm-dialog.tsx:100`)
- **Current:** physical `mr-2` on the pending spinner; in Arabic the gap lands on the wrong side. The `Button` base already supplies `gap-2`, so the margin is also doubling the gap.
- **Expected:** logical spacing, or none — reference buttons rely on the cva base `gap-2` (`button.tsx:170` recipe in §5.1).
- **Change:** `mr-2 h-4 w-4 animate-spin` → `h-4 w-4 animate-spin` — `class-level`
- **Notes:** the icon is also 16px by rule inside a Button (§5.1/§15.4), so `h-4 w-4` is redundant but harmless; leave it or drop it with the same effect.

### shard-028-F03 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/user-form-dialog/user-form-dialog.tsx:196` — `<Button type="button" variant="ghost" size="icon"`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"
- **Current:** the show/hide-password button renders only an `Eye`/`EyeOff` icon and has no accessible name.
- **Expected:** every icon-only control in the reference carries a translated `aria-label` (§9 C-I4; `header.tsx` menu, `trips-desktop-table.tsx:524` `IconButton`).
- **Change:** add `aria-label={t(showPassword ? 'users.dialog.hidePassword' : 'users.dialog.showPassword')}` — `class-level` (attribute only; needs the two keys added to `en.json`/`ar.json`)
- **Notes:** §14 C-I4 requires the label to go through `t()`, not a hard-coded English string.

### shard-028-F04 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/trips-table/trips-filters.tsx:141` — `? 'bg-accent text-accent-foreground'`
- **Rule:** design-system §14 C-C1 "Ruling: `bg-primary/10 text-primary`"; §3 "Selected/current state is the `bg-primary/10 text-primary` wash (C-C1), **never** the accent"
- **Current:** the selected missing-data option is filled with `bg-accent text-accent-foreground` — the same tint the unselected rows use on hover (`hover:bg-accent/60`), so selected and hovered read as the same state.
- **Expected:** selected = `bg-primary/10 text-primary` (`sidebar.tsx:230`, `cairo-range-calendar.tsx:138`).
- **Change:** `selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'` → `selected ? 'bg-primary/10 text-primary' : 'hover:bg-accent'` — `class-level`
- **Notes:** §13 D-C10 records trips' selected-row alphas; C-C1 is the ruling that settles them for the accent case.

### shard-028-F05 · blocker · high · buttons & controls
- **Where:** `src/widgets/trips-table/trips-filters.tsx:132` — `<button type="button" onClick={() => { onChange(selected ? '' : opt.value); setOpen(false); }}`
- **Rule:** design-system §14 C-B1 "Ruling: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere"; vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** three raw `<button>`s in this file carry no focus style at all — the option rows (`:132`), the inline clear (`:113`) and the segmented status chips (`:201`). Keyboard users get no indication of position inside the popover.
- **Expected:** every interactive element in the reference has the ring; C-B1 explicitly added it to elements that had none (NavLink, calendar days).
- **Change:** append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the class list of all three buttons (`:139`, `:119`, `:208`) — `class-level`
- **Notes:** the option rows sit inside a `PopoverContent` with no `overflow-hidden`, so a plain outset ring is correct — no `ring-inset` needed.

### shard-028-F06 · blocker · high · radius/border/shadow
- **Where:** `src/widgets/trips-table/trips-mobile-list.tsx:65` — `<div className="overflow-hidden rounded-xl border bg-card">`
- **Rule:** design-system §14 C-R1 "Ruling: token family: `rounded-lg` everywhere; `rounded-xl` retired"; §4 "`rounded-xl` is not used, so one variable moves every surface"; §13 D-R2
- **Current:** the mobile list container is `rounded-xl` (16px, a Tailwind constant), the only `rounded-xl` surface left in the app.
- **Expected:** `rounded-lg` (the `--radius` token, 12px), as on every card, panel and tile (`dashboard.tsx:135`, `card.tsx:8`).
- **Change:** `overflow-hidden rounded-xl border bg-card` → `overflow-hidden rounded-lg border bg-card` — `class-level`
- **Notes:** fix together with F07 so the loading state and the loaded list keep the same corner.

### shard-028-F07 · should · high · loading/empty/error
- **Where:** `src/widgets/trips-table/trips-mobile-list.tsx:54` — `<Skeleton key={i} className="h-[84px] w-full rounded-xl" />`
- **Rule:** design-system §14 C-R2 "Ruling: a skeleton takes the radius of the box it stands in: cards `rounded-lg`" (+ C-R1 as above); §13 D-ST5
- **Current:** the row skeleton is `rounded-xl`, matching the pre-fix container rather than the token family.
- **Expected:** `rounded-lg` (`dashboard.tsx:126` KPI skeleton, post-ruling).
- **Change:** `h-[84px] w-full rounded-xl` → `h-[84px] w-full rounded-lg` — `class-level`
- **Notes:** the 84px height is a deliberate match for the real row and should not change.

### shard-028-F08 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:213` — `<tr onClick={onToggle} className={cn('cursor-pointer border-b transition-colors hover:bg-muted/40',`
- **Rule:** vercel-rules "Accessibility" bullets "Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)" and "`<button>` for actions … (not `<div onClick>`)"; anti-pattern "`<div>` or `<span>` with click handlers"
- **Current:** the whole row expands on click, with no `tabIndex`, no `role`, no key handler and no `aria-expanded`. The expand/collapse affordance (the leading chevron) is not focusable either, so the expanded detail is unreachable by keyboard.
- **Expected:** the mobile list solves the same problem correctly — `role="button" tabIndex={0} aria-expanded={open}` plus an Enter/Space handler (`trips-mobile-list.tsx:133-142`); the dashboard uses a real `<button>` with `aria-expanded` for disclosure (§5.2, C-B4).
- **Change:** put a real `<button type="button" aria-expanded={isExpanded} aria-label={t('trips.columns.expand')}>` around the chevron in the first `Td` (`:220-228`) and keep the row `onClick` as the mouse shortcut; or give the `<tr>` `tabIndex={0} aria-expanded onKeyDown` mirroring `trips-mobile-list.tsx:137-142` — `structural`
- **Notes:** the first column already has an sr-only header for exactly this control (`:85-87`), so the button belongs there. Row-level action buttons already `stopPropagation`, so adding a nested button needs the same guard.

### shard-028-F09 · blocker · medium · RTL/i18n/a11y
- **Where:** `src/widgets/trips-table/trips-pagination.tsx:135` — `<Input type="number" min={1} max={pages} value={jumpValue}`
- **Rule:** vercel-rules "Accessibility" bullet "Form controls need `<label>` or `aria-label`"; anti-pattern "Form inputs without labels"
- **Current:** the jump-to-page input has only a `placeholder={String(page)}`; the adjacent "Go to:" text is a plain `<span>` with no `htmlFor` association.
- **Expected:** a programmatic name on the control.
- **Change:** add `aria-label={t('trips.pagination.goTo')}` to the `Input` (and `inputMode="numeric"` per vercel "Forms" bullet "Use correct `type` … and `inputmode`") — `class-level`
- **Notes:** the visible "Go to:" label already exists as a translated string, so no new key is needed for the aria-label.

### shard-028-F10 · blocker · medium · RTL/i18n/a11y
- **Where:** `src/widgets/trips-table/trips-pagination.tsx:190` — `<MoreHorizontal className="h-4 w-4" />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden=\"true\"`"; design-system §9 "`aria-hidden` on dots/chevrons"
- **Current:** the ellipsis glyph and every chevron in this file (`:170`, `:181`, `:219`, `:230`) are exposed to assistive tech. The chevrons sit inside buttons that already carry a translated `aria-label`, so the icon is announced twice.
- **Expected:** the reference marks such icons `aria-hidden` (`dashboard.tsx:756`, `trips-desktop-table.tsx:221`).
- **Change:** add `aria-hidden` to the five icons at `:170`, `:181`, `:190`, `:219`, `:230` — `class-level`

### shard-028-F11 · blocker · medium · RTL/i18n/a11y
- **Where:** `src/widgets/trips-table/receipt-status-badge.tsx:50` — `<Icon className="h-3 w-3" />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden=\"true\"`"
- **Current:** in the default (non-compact) form the icon duplicates the label text beside it and is not hidden. In `compact` form the badge is icon-only and its only name is the native `title`, which is not a reliable accessible name on a `<span>`.
- **Expected:** decorative icon hidden; compact form given a real name.
- **Change:** `<Icon className="h-3 w-3" aria-hidden />` and, on the wrapping `<span>` (`:43`), add `aria-label={t(...)}` when `compact` is true — `class-level`
- **Notes:** the translated string is already computed for `title`; reuse it rather than adding a key.

### shard-028-F12 · should · high · buttons & controls
- **Where:** `src/widgets/trips-table/trips-filters.tsx:204` — `role="tab" aria-selected={active}`
- **Rule:** design-system §14 C-B4 "Ruling: `aria-pressed` for toggles … `aria-expanded` for disclosure"; `.audit/deferred-rulings.md` R-3 "Choosing a *filter value* (same content, narrowed) → `h-7 text-xs` Buttons, variant swap, `aria-pressed`"; vercel-rules "Accessibility" bullet "Use semantic HTML … before ARIA"
- **Current:** the receipt-status filter is marked up as a `role="tablist"` of `role="tab"` buttons with `aria-selected`, but nothing it controls is a tab panel — it narrows the same list. Screen readers announce a tab set that does not exist and there is no `aria-controls` target.
- **Expected:** filter-value choice = plain buttons with `aria-pressed` (scope presets, `scope-date-picker.tsx:132-136`, post-C-B4).
- **Change:** on the wrapper (`:189-195`) drop `role="tablist"` in favour of `role="group"` keeping `aria-label`; on each option (`:201-206`) `role="tab" aria-selected={active}` → `aria-pressed={active}` — `class-level`
- **Notes:** R-3 also prescribes the `h-7 text-xs` variant-swap Button shape, but the file's own comment records a real failure with a fixed-height chip (labels wrapped and burst the control); keeping the auto-height tray and fixing only the ARIA is the safe half. See F13 for the visual half.

### shard-028-F13 · should · medium · buttons & controls
- **Where:** `src/widgets/trips-table/trips-filters.tsx:193` — `"inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"`
- **Rule:** design-system §13 D-B2 "Segmented choice — Dash: separate `h-7` pills, variant swap"; `.audit/deferred-rulings.md` R-3
- **Current:** a bordered tray with `bg-background shadow-sm` active chips — a third segmented idiom alongside the reference's variant-swap pills and the `Tabs` primitive.
- **Expected:** `Button size="sm"` pills at `h-7 text-xs`, `variant` flipping `default`↔`outline`, no tray.
- **Change:** replace the tray + raw buttons with a `flex flex-wrap gap-1.5` of `Button size="sm" variant={active ? 'default' : 'outline'} className="h-7 gap-1.5 text-xs"` — `structural`
- **Notes:** wrapping labels are the known hazard here (see the file's comment); `Button` has `whitespace-nowrap` in its base, and the short labels (`opt.shortKey`) already exist for narrow screens, so the wrap failure does not recur. Apply after F12 or fold the `aria-pressed` change into the same edit.

### shard-028-F14 · should · high · colour roles
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:84` — `className="border-b bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground"`
- **Rule:** design-system §14 C-C2 "Ruling: three steps: `/60` head band, `/50` hover, `/40` wells"; §13 D-C4
- **Current:** the table header band is `bg-muted/40`, the tint the ruling reserves for nested wells; the head band step is `/60`.
- **Expected:** `bg-muted/60` (`dashboard.tsx:1001` PanelHead).
- **Change:** `border-b bg-muted/40` → `border-b bg-muted/60` — `class-level`
- **Notes:** pairs with F15/F16 — the three tints in this file are currently `/40` head, `/40` hover, `/20|/30` wells, which is the ruling's scale shifted one step down across the board.

### shard-028-F15 · should · high · colour roles
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:216` — `'cursor-pointer border-b transition-colors hover:bg-muted/40',`
- **Rule:** design-system §14 C-C4 "Ruling: named roles — `hover:bg-muted/50` on content rows/cards"; §13 D-C3
- **Current:** content-row hover is `bg-muted/40`; the same `/40` value is also the header band tint in this file, so hovering a row makes it match the header.
- **Expected:** `hover:bg-muted/50` (`dashboard.tsx:425`, `:616`, `:940`).
- **Change:** `hover:bg-muted/40` → `hover:bg-muted/50` — `class-level`
- **Notes:** the same substitution applies to `trips-mobile-list.tsx:143` (see F21).

### shard-028-F16 · should · medium · colour roles
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:303` — `<tr className="border-b bg-muted/20">`
- **Rule:** design-system §14 C-C2 "Ruling: three steps: `/60` head band, `/50` hover, `/40` wells"; §13 D-C5
- **Current:** two well tints in one row pair — the expanded detail row is `bg-muted/20` while the row that opened it is `bg-muted/30` (`:217`), and neither is the `/40` the ruling defines for a well.
- **Expected:** `bg-muted/40` for the disclosed well (`dashboard.tsx:494` KPI drawer, `:841` truck drawer).
- **Change:** `:303` `border-b bg-muted/20` → `border-b bg-muted/40`; `:217` `isExpanded && 'bg-muted/30'` → `isExpanded && 'bg-muted/40'` — `class-level`
- **Notes:** keeping the parent row and its detail on the same tint is what makes them read as one open unit; `hover:bg-muted/50` (F15) still distinguishes the pointer.

### shard-028-F17 · should · high · type
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:84` — `text-[10.5px] uppercase tracking-wider text-muted-foreground`
- **Rule:** design-system §2 "Eyebrow … `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §10 "Eyebrow"; §13 D-T3
- **Current:** 10.5px for the table's column headers — a fourth eyebrow size in the codebase (the same file uses 10px at `:495` and 10.5px again at `:437`).
- **Expected:** the single 10px eyebrow (`dashboard.tsx:382`, `:427`).
- **Change:** `text-[10.5px]` → `text-[10px]` at `:84`, `:437`; and in `revenue-breakdown.tsx:201`, `trips-mobile-list.tsx:246` — `class-level`
- **Notes:** the `Th` component supplies `font-semibold`, so no weight change is needed on the header row; the `:437`/`:246` container eyebrows are already `font-semibold`.

### shard-028-F18 · should · high · motion
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:224` — `'h-4 w-4 text-muted-foreground transition-transform',`
- **Rule:** design-system §14 C-M1 "Ruling: `duration-200` for every chevron/collapse/icon transition"; §8 "Disclosure: a chevron rotates (`transition-transform duration-200` + `rotate-180`, C-M1)"
- **Current:** the expand chevron animates at Tailwind's default 150ms; the same omission is at `trips-mobile-list.tsx:171`.
- **Expected:** `transition-transform duration-200` (`dashboard.tsx:431` post-ruling, `sidebar.tsx:281`).
- **Change:** `transition-transform` → `transition-transform duration-200` at `trips-desktop-table.tsx:224` and `trips-mobile-list.tsx:171` — `class-level`

### shard-028-F19 · should · medium · radius/border/shadow
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:234` — `"inline-flex shrink-0 items-center gap-1 rounded bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground"`
- **Rule:** design-system §14 C-T3 "Ruling: … neutral chips are `px-2 py-0.5 text-[10.5px] font-medium`"; §5.3 "Chip `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`"; §13 D-R4/D-B9
- **Current:** the multi-container count marker is a 4px-radius `bg-accent` tag at 10px/600 — a fourth "small pill" recipe. `trips-mobile-list.tsx:150` repeats it.
- **Expected:** the neutral chip recipe; the accent tint is reserved for hover/selected chrome (§3).
- **Change:** `rounded bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground` → `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground` (both sites), keeping the inner `Layers` icon and count — `class-level`
- **Notes:** the count itself is a figure inside a muted context; §2 promotes such values with `text-foreground` if the fixer wants the number to lead.

### shard-028-F20 · should · medium · tables/lists
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:370` — `? t('trips.mobile.maxDistance', { km: formatNumber(row.km, 1) })`
- **Rule:** design-system §2 "Decimals by unit: counts/money 0, litres 2, km 0"; §13 D-T15 "Distance decimals — Dash 0 dp; Trips 1 dp (desktop row) / 0 dp (mobile)"
- **Current:** the same `TripRow.km`, from the same model, prints with 1 decimal on desktop (`:370`, `:371`) and 0 on the phone (`trips-mobile-list.tsx:197-198`) — the two surfaces this shard exists to keep in agreement disagree about a figure.
- **Expected:** 0 dp for km (`dashboard.tsx` fuel rows via `format.ts`).
- **Change:** `formatNumber(row.km, 1)` → `formatNumber(row.km, 0)` at `trips-desktop-table.tsx:370` and `:371` — `class-level`
- **Notes:** the container-level distances in the expanded list are already 0 dp (`:467`), so this also makes the row and its own detail agree.

### shard-028-F21 · should · medium · colour roles
- **Where:** `src/widgets/trips-table/trips-mobile-list.tsx:143` — `className="cursor-pointer px-3 py-2.5 transition-colors hover:bg-muted/40`
- **Rule:** design-system §14 C-C4 "Ruling: … `hover:bg-muted/50` on content rows/cards"; §13 D-C3
- **Current:** `hover:bg-muted/40` on the row, and the disclosed well below it is `bg-muted/30` (`:233`).
- **Expected:** `hover:bg-muted/50` for the row; `bg-muted/40` for the well (C-C2 three steps).
- **Change:** `:143` `hover:bg-muted/40` → `hover:bg-muted/50`; `:233` `border-t bg-muted/30` → `border-t bg-muted/40` — `class-level`
- **Notes:** `active:bg-muted/60` at `:145` is the deliberate touch state recorded in §12.7/D-ST7 — leave it.

### shard-028-F22 · should · medium · colour roles
- **Where:** `src/widgets/trips-table/trips-mobile-list.tsx:73` — `bg-muted/95 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-muted/80`
- **Rule:** design-system §14 C-C2 "Ruling: three steps: `/60` head band, `/50` hover, `/40` wells"; §13 D-C4
- **Current:** the sticky day header uses a fourth and fifth tint step (`/95`, `/80`) — the two darkest muted values in the app.
- **Expected:** the head-band step `/60`; the glass treatment in the reference is the header's `bg-background/80 … supports-[backdrop-filter]:bg-background/60` pair (§3 "Header glass").
- **Change:** `bg-muted/95 … supports-[backdrop-filter]:bg-muted/80` → `bg-muted/80 … supports-[backdrop-filter]:bg-muted/60` — `class-level`
- **Notes:** this band is sticky over scrolling rows, so it must stay opaque enough to hide them — hence keeping the un-blurred fallback one step above the blurred value, exactly as the app header does. Do not drop to a bare `/60` without the fallback.

### shard-028-F23 · should · medium · type
- **Where:** `src/widgets/trips-table/trips-mobile-list.tsx:76` — `<span className="text-[11px] font-semibold uppercase tracking-wider">`
- **Rule:** design-system §2 "Eyebrow … `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §13 D-T3 "mobile day header `text-[11px] font-semibold` not muted"
- **Current:** 11px and full-strength foreground for the day header, against the eyebrow's 10px muted.
- **Expected:** the eyebrow recipe, muted like every other label (§2 "Labels recede, figures lead").
- **Change:** `text-[11px] font-semibold uppercase tracking-wider` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` — `class-level`
- **Notes:** the count on the same line is already `text-[11px] … text-muted-foreground` (`:79`) — if the fixer prefers the two halves to match, move it to `text-[10px]` as well; the eyebrow's "aside resets" rule (§2) allows the data half to stay `normal-case`.

### shard-028-F24 · should · medium · colour roles
- **Where:** `src/widgets/trips-table/receipt-status-badge.tsx:22` — `complete: 'bg-success/15 text-success border-success/30',`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"; §14 C-T3 "Ruling: ConnectionBadge recipe is *the* status pill and the `Badge` primitive now matches it"; §13 D-C7
- **Current:** every status uses `/15` fill and `/30` border, one step off the app-wide tint recipe.
- **Expected:** `border-X/40 bg-X/10 text-X` (`dashboard.tsx:216-249`, `badge.tsx:5-20`).
- **Change:** in `RECEIPT_STATUS_STYLES` (`:15-23`) `bg-warning/15 … border-warning/30` → `border-warning/40 bg-warning/10 text-warning`; same for `success`; `pending` keeps `bg-muted text-muted-foreground border-border` (that is the ConnectionBadge's own "connecting" state) — `class-level`

### shard-028-F25 · should · medium · type
- **Where:** `src/widgets/trips-table/receipt-status-badge.tsx:45` — `'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium'`
- **Rule:** design-system §14 C-T3 "Ruling: … `gap-1.5 px-2.5 py-1 text-[11px]`"; §5.3 "Badge primitive … same recipe as the ConnectionBadge"; §13 D-C7
- **Current:** 12px text, 8px/2px padding, 4px gap — the pre-ruling `Badge` geometry, which C-T3 replaced.
- **Expected:** `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium`.
- **Change:** `gap-1 … px-2 py-0.5 text-xs` → `gap-1.5 … px-2.5 py-1 text-[11px]` — `class-level`
- **Notes:** this badge renders in a `text-center` table cell and inline in a mobile meta row; the extra 4px of height was measured as safe when the same change landed on the `Badge` primitive (C-T3, three routes moved 1–2px). Consider using the `Badge` primitive itself instead — but that is `structural` and adds an import, so the class-level change above is the minimum.

### shard-028-F26 · should · medium · colour roles
- **Where:** `src/widgets/trips-table/revenue-breakdown.tsx:114` — `strong ? 'font-semibold text-money' : 'text-foreground/90',`
- **Rule:** design-system §14 C-C5 "Ruling: `text-muted-foreground` for secondary *text*; opacity only for secondary parts of an already-coloured element"; §13 D-C9
- **Current:** breakdown values are faded with `text-foreground/90` — an opacity step applied to plain text, which C-C5 rules against.
- **Expected:** the `dl` build in §6.1/§10: `dt` muted, `dd` at full `text-foreground` (`dashboard.tsx:501-509`); the label side of this `Line` already does exactly that (`:110`).
- **Change:** `'shrink-0 font-mono tabular-nums', strong ? 'font-semibold text-money' : 'text-foreground/90'` → `… : 'text-foreground'` — `class-level`
- **Notes:** the money values keep `text-money`; this only affects the non-strong (base/rental/VAT/charged-on) values.

### shard-028-F27 · should · low · radius/border/shadow
- **Where:** `src/widgets/trips-table/revenue-breakdown.tsx:210` — `<span className="shrink-0 rounded border px-1 font-mono text-[10px]">`
- **Rule:** design-system §5.3 "Chip `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`"; §13 D-R4 "Small tags — Dash `rounded-full` pills; Trips `rounded` (4px) tags: … `×N`"
- **Current:** the `×N` multiplier and the container index tags (`trips-desktop-table.tsx:449`, `trips-mobile-list.tsx:257`) are 4px-radius outlined tags at 10px.
- **Expected:** the neutral chip pill.
- **Change:** `rounded border px-1 font-mono text-[10px]` → `rounded-full bg-muted px-2 py-0.5 font-mono text-[10.5px] font-medium text-muted-foreground` at the three sites — `class-level`
- **Notes:** §4 keeps `rounded` (4px) for the category bar track and kbd chips only; these are neither. The index tags are inside a `ps-7`-aligned list — widening them by ~6px shifts nothing, since the following line is indented by a fixed `ps-7`, not by the tag.

### shard-028-F28 · should · medium · buttons & controls
- **Where:** `src/widgets/trips-table/trips-filters.tsx:93` — `className="h-9 gap-1.5"`
- **Rule:** design-system §14 C-B3 "Ruling: chrome rows `h-8`"; §13 D-B1 "Toolbar height — Dash `sm` shrunk to `h-8`/`h-7`; Trips `sm` **raised** to `h-9`"
- **Current:** the missing-data trigger and the company filter wrapper (`:49`, `:56`) are `h-9`, so the trips toolbar stands 4px taller than every other control row in the app (scope trigger, company select, mobile filters, toggles are all `h-8`).
- **Expected:** `h-8` for chrome-row controls (`scope-bar.tsx:66,108`, `header.tsx:18`).
- **Change:** `h-9 gap-1.5` → `h-8 gap-1.5` at `:93`; `inline-flex h-9 min-w-[180px]` → `inline-flex h-8 min-w-[180px]` at `:49`; `className="h-9 text-xs"` → `className="h-8 text-xs"` at `:56` — `class-level`
- **Notes:** the toolbar these sit in lives in `pages/trips/trips.tsx`, which also sets `h-9` on its own Filters/Clear buttons — `out-of-shard: src/pages/trips/trips.tsx`. Changing only this shard leaves that row mixed at 32/36px; flag to the fixer that the two must land together or not at all.

### shard-028-F29 · should · medium · buttons & controls
- **Where:** `src/widgets/trips-table/trips-pagination.tsx:114` — `<SelectTrigger className="h-7 w-[70px] text-xs">`
- **Rule:** design-system §14 C-B3 "Ruling: chrome rows `h-8` …; popover-internal buttons `h-7 text-xs`"; §13 D-B3
- **Current:** the pagination strip mixes both heights in one row — `h-7` per-page select, `h-7` jump input and Go button (`:145`, `:150`) beside `h-8` page buttons (`:164`–`:231`). Neither of these is popover-internal; the whole strip is a chrome row.
- **Expected:** one height per row: `h-8`.
- **Change:** `h-7` → `h-8` at `:114` (SelectTrigger), `:145` (Input), `:150` (Go Button) — `class-level`
- **Notes:** `text-xs` stays; only the height changes. `w-[70px]`/`w-16` widths are unaffected.

### shard-028-F30 · should · medium · buttons & controls
- **Where:** `src/widgets/trips-table/trips-pagination.tsx:196` — `variant={entry === page ? 'default' : 'ghost'}`
- **Rule:** design-system §14 C-B4 "Ruling: `aria-pressed` for toggles (tiles, presets)"; the ruling was applied to exactly this pattern — "variant swap with no aria state (presets `scope-date-picker.tsx:133`)"
- **Current:** the current page is signalled only by the filled variant; assistive tech gets no state, matching the pre-ruling scope presets.
- **Expected:** state exposed as well as drawn.
- **Change:** add `aria-current={entry === page ? 'page' : undefined}` to the page-number `Button` (and, if the fixer prefers strict C-B4 parity, `aria-pressed={entry === page}`) — `class-level`
- **Notes:** `aria-current="page"` is the more precise fit for pagination than `aria-pressed`; both satisfy "state is announced", and C-B4's point is that a variant swap alone does not.

### shard-028-F31 · should · medium · RTL/i18n/a11y
- **Where:** `src/widgets/user-form-dialog/user-form-dialog.tsx:115` — `<Input {...field} placeholder="John Doe" />`
- **Rule:** design-system §14 C-I4 "Ruling: all aria/sr-only strings through `t()`"; §9 "**Copy**, aria-labels and sr-only text all go through `t()`"; §13 D-I2 "Untranslated strings"
- **Current:** three hard-coded English placeholders — `"John Doe"` (`:115`), `"john@example.com"` (`:130`), `"+201..."` (`:144`). In Arabic the form shows Latin sample data.
- **Expected:** every user-visible string through `t()`.
- **Change:** `placeholder="John Doe"` → `placeholder={t('users.placeholders.name')}` and likewise for email and phone; add the three keys to `en.json` and `ar.json` — `class-level`
- **Notes:** per `.audit/deferred-rulings.md` R-8, adding keys to both locale files is explicitly in scope. See F32 for the ellipsis in the phone placeholder — fix both in the new string.

### shard-028-F32 · nit · high · type
- **Where:** `src/widgets/user-form-dialog/user-form-dialog.tsx:144` — `<Input {...field} placeholder="+201..." />`
- **Rule:** vercel-rules "Typography" bullet "`…` not `...`"; "Forms" bullet "Placeholders end with `…` and show example pattern"
- **Current:** three ASCII periods.
- **Expected:** the single ellipsis character.
- **Change:** `"+201..."` → `"+201…"` (as the value of the new `users.placeholders.phone` key from F31) — `class-level`

### shard-028-F33 · should · medium · RTL/i18n/a11y
- **Where:** `src/widgets/user-form-dialog/user-form-dialog.tsx:130` — `<Input {...field} type="email" placeholder="john@example.com" />`
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`", "Disable spellcheck on emails, codes, usernames (`spellCheck={false}`)", "Use correct `type` (`email`, `tel`, `url`, `number`)"
- **Current:** the email field has `type="email"` but no `autocomplete` and no `spellCheck={false}`; the phone field (`:144`) has neither `type="tel"` nor `autocomplete`; the name field (`:115`) has no `autocomplete`. Only the password field is wired (`autoComplete="new-password"`, `:194`).
- **Expected:** each control declares its purpose so the browser fills and checks it correctly.
- **Change:** name → `autoComplete="name"`; email → `autoComplete="email" spellCheck={false}`; phone → `type="tel" autoComplete="tel"` — `class-level`
- **Notes:** `{...field}` from react-hook-form already supplies `name`, so only the autocomplete tokens are missing.

### shard-028-F34 · should · low · forms
- **Where:** `src/widgets/user-form-dialog/user-form-dialog.tsx:113` — `<FormLabel>{t('users.fields.name')} *</FormLabel>`
- **Rule:** design-system §12.2 (provisional) "required marker `<span class=\"text-destructive\">*</span>`"
- **Current:** the required asterisk is a bare character in the label text, at label colour, on two fields (`:113`, `:128`).
- **Expected:** provisional (§12.2) — the marker is a `text-destructive` span (`trip-form.tsx:701`).
- **Change:** `{t('users.fields.name')} *` → `{t('users.fields.name')} <span className="text-destructive">*</span>` (same at `:128`) — `class-level`
- **Notes:** provisional (§12.2) — the dashboard has no forms, so trips governs here.

### shard-028-F35 · nit · medium · spacing
- **Where:** `src/widgets/user-form-dialog/user-form-dialog.tsx:122` — `<div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">`
- **Rule:** design-system §12.2 (provisional) "trip-level grid `grid gap-4 md:grid-cols-2 lg:grid-cols-3`"; §1 (12px master step)
- **Current:** a column gap only. Below `sm` the grid is one column, so the email and phone fields stack with **zero** vertical gap between them, while every other pair of fields in the form is separated by the `space-y-1` on the `<form>`.
- **Expected:** a gap on both axes.
- **Change:** `grid grid-cols-1 gap-x-4 sm:grid-cols-2` → `grid grid-cols-1 gap-4 sm:grid-cols-2` — `class-level`
- **Notes:** provisional (§12.2). The form's own `space-y-1` (`:107`) is tighter than §12.2's `space-y-4` between field stacks, but that is a whole-form rhythm change and is left alone here.

### shard-028-F36 · nit · low · radius/border/shadow
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:390` — `className="w-72 bg-popover text-popover-foreground shadow-lg"`
- **Rule:** design-system §4 "Shadow … `shadow-md` on every floating menu (Popover, DropdownMenuContent, …)"; §14 C-R5 "Ruling: `shadow-md`"; §13 D-R1
- **Current:** this one popover overrides the primitive to `shadow-lg` (the Dialog/Sheet depth) and re-declares `bg-popover text-popover-foreground`, which `PopoverContent` already sets. The sibling popover in `revenue-breakdown.tsx:160` shows the same breakdown with the primitive's `shadow-md` — so the same content has two elevations depending on which surface opened it.
- **Expected:** the primitive's `shadow-md` (`popover.tsx:22`).
- **Change:** `className="w-72 bg-popover text-popover-foreground shadow-lg"` → `className="w-72"` — `class-level`

### shard-028-F37 · nit · low · tables/lists
- **Where:** `src/widgets/trips-table/revenue-breakdown.tsx:217` — `value={line.revenue != null ? formatCurrency(line.revenue) : '—'}`
- **Rule:** design-system §3 "De-emphasis by opacity … `opacity-40` (em dash)"; §2 "empty numeric is `—` at `opacity-40`"; §13 D-C11
- **Current:** the em dash for a missing figure renders at full strength here, at `text-muted-foreground` in `revenue-breakdown.tsx:142` and `trips-desktop-table.tsx:284`, and bare in the expanded lists (`trips-desktop-table.tsx:428`, `:459`) — four treatments of one glyph.
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`).
- **Change:** wrap the dash in `<span className="opacity-40">—</span>` at `revenue-breakdown.tsx:142`, `trips-desktop-table.tsx:284`, `:428`, `:459` and `trips-mobile-list.tsx:238`, `:266`; at `revenue-breakdown.tsx:217` the `value` prop is typed `string`, so the opacity has to be applied by the `Line` component instead — `structural` for `:217` only, `class-level` elsewhere
- **Notes:** don't change `Line`'s prop type; the simplest structural form is a `value === '—'` check inside `Line` that adds `opacity-40` to the `dd`.

### shard-028-F38 · nit · low · performance
- **Where:** `src/widgets/trips-table/trips-desktop-table.tsx:108` — `: rows.map((row) => (`
- **Rule:** vercel-rules "Performance" bullet "Large lists (>50 items): virtualize (`virtua`, `content-visibility: auto`)"; anti-pattern "Large arrays `.map()` without virtualization"
- **Current:** both surfaces map the full page of rows. The page-size selector offers 100 (`trips-pagination.tsx:39`), so a user can render 100 nine-column rows — each with a Popover, a `Truncate` ResizeObserver and up to four buttons — plus every expanded row's contents.
- **Expected:** rows above ~50 are virtualized, or the container opts into `content-visibility`.
- **Change:** add `[content-visibility:auto]` to the row containers, or introduce a virtualizer — `structural`; and note that the cheapest mitigation is capping `LIMIT_OPTIONS` at 50 (`trips-pagination.tsx:39`), which is a behaviour change
- **Notes:** low confidence that this is worth acting on — pagination already bounds the list, and the reference's own infinite fuel list is unvirtualized behind a `max-h-[420px]` scroller (§6.2). Recorded because the rule is explicit and 100 is an offered page size.

## Summary
FINDINGS: 38 (blocker 10 / should 23 / nit 5)
