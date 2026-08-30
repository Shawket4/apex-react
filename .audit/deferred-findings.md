# Deferred findings — 64 items skipped across the audit

### shard-001-F05 · should · low · colour roles
- **Where:** `src/shared/lib/format-number.ts:42` — `` return `${formatCompactNumber(value, decimals)} ${currency}`; `` and `:44`
- **Rule:** design-system §2 "No currency symbol on the dashboard"; §13 row D-T14 "Money format — Dash `compactMoney`, no currency | Trips `formatCurrency` (2 dp + ` EGP`)".
- **Current:** `formatCompactCurrency` appends ` EGP` (or the passed `currency`) to every compact money figure.
- **Expected:** the reference renders money as a bare figure whose role is carried by `font-mono tabular-nums text-money` (C-T1), not by a currency suffix.
- **Change:** no in-file edit recommended — the suffix is the function's contract and callers rely on the shape. Fix belongs at the call sites (`out-of-shard: src/widgets/trips-statistics-*`) by calling `formatCompactNumber` and applying `text-money`. Recorded here so the fixer of those shards can cite it.
- **Notes:** low confidence because D-T14 is a listed deviation awaiting the owner's ruling, not a §14 ruling; leave the export intact (never rename/delete exports).
- **SKIPPED BECAUSE:** low confidence; D-T14 listed for ruling; fix belongs at call sites (out-of-shard: widgets/trips-statistics-*)

### shard-002-F08 · should · low · RTL/i18n/a11y
- **Where:** `src/shared/lib/maps/google-provider.tsx:267` — `keyboardShortcuts: false,`
- **Rule:** vercel-rules "Touch & Interaction" bullet "Drag/swipe/pinch/path gestures need tap/click and keyboard alternatives unless essential"
- **Current:** the map's built-in keyboard panning/zooming (arrow keys, +/−) is switched off; the only keyboard-reachable map actions are the two overlay buttons and the SDK zoom control.
- **Expected:** keyboard alternative for pan/zoom gestures.
- **Change:** `class-level` (option value): `keyboardShortcuts: false` → `keyboardShortcuts: true`, or leave as is if the owner confirms it was disabled deliberately (no comment explains it).
- **Notes:** Low confidence — the option may have been disabled to stop the map swallowing arrow keys inside form dialogs. Leaflet (`keyboard` default true) currently differs, so the two providers behave differently.
- **SKIPPED BECAUSE:** low confidence (`keyboardShortcuts: false` may be deliberate)

### shard-002-F19 · nit · low · buttons & controls
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:40` — `.leaflet-control-zoom { border: none; border-radius: 8px; …}` and `:49` `width: 40px; height: 40px; line-height: 40px; font-size: 18px;` (`:86` 36px below 640px)
- **Rule:** design-system §4 "10px `rounded-md` Button, SelectTrigger…"; §14 C-B3 "chrome rows `h-8`"; §4 "Border. 1px everywhere"
- **Current:** the zoom button group is 8px-radius, borderless, 40px-tall buttons (36px on phones).
- **Expected:** control radius `rounded-md` (10px, token-derived), 1px `--border` hairline, 32px (`h-8`) control height — the overlay Button beside it is `h-8 w-8 rounded-md` after F11.
- **Change:** `class-level` (CSS string): `border-radius: 8px` → `10px` (or `calc(var(--radius) - 2px)`); `border: none` → `border: 1px solid hsl(var(--border))`; `width/height/line-height: 40px` → `32px` and `font-size: 18px` → `16px`; drop or align the 640px override to the same 32px.
- **Notes:** low confidence on the height — Leaflet's zoom anchors are third-party chrome, and a larger touch target may have been deliberate; the radius/border part is high confidence.
- **SKIPPED BECAUSE:** low confidence (zoom-anchor height/radius flagged as possibly deliberate third-party touch target)

### shard-003-F07 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/ui/collapsible-section.tsx:61-69` — `<div … role={alwaysOpen ? undefined : 'button'} tabIndex=… onClick={alwaysOpen ? undefined : toggle}`
- **Rule:** vercel-rules "Accessibility" bullet "`<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)"; "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"
- **Current:** a `<div>` with `role="button"`, `tabIndex`, `onClick` and a hand-rolled Enter/Space handler
- **Expected:** a native `<button type="button" aria-expanded>` as the disclosure control (`dashboard.tsx:418-433` KPI card face)
- **Change:** `structural` — keep the outer header `<div>` as the row (it contains the `actions` slot, which may hold buttons and cannot be nested inside a `<button>`); wrap the icon + title part in `<button type="button" aria-expanded={isOpen} onClick={toggle} className="flex min-w-0 flex-1 items-center gap-3 text-start …">` and move the `ChevronDown` inside it. Keep `onKeyDown`/`onClick`/`role`/`tabIndex` props in place (do not delete handlers); the native button makes them redundant but harmless.
- **Notes:** if the fixer keeps the div (to avoid a structural change), F08 is still required. `alwaysOpen` branch unchanged.
- **SKIPPED BECAUSE:** structural rewrap of the header into a native `<button>` not applied: `title` is a free-content slot that callers may fill with interactive elements (nested-button risk); the finding's own fallback (keep the div, apply F08) was taken — role/tabIndex/aria-expanded/onKeyDown already give keyboard parity

### shard-003-F39 · nit · low · motion
- **Where:** `src/shared/ui/draggable.tsx:192` — `'opacity-0 group-hover:opacity-50 transition-opacity duration-150'`
- **Rule:** design-system §14 C-M1 "`duration-200` for every chevron/collapse/icon transition"
- **Current:** 150ms icon reveal
- **Expected:** `duration-200` (`sidebar.tsx:172-282`, `dialog.tsx:56` close button `transition-opacity`)
- **Change:** `class-level` — `duration-150` → `duration-200`
- **Notes:** the drag wrapper itself deliberately has no transition (comment at `:180-183`) — leave it.
- **SKIPPED BECAUSE:** low confidence

### shard-005-F11 · nit · low · buttons & controls
- **Where:** `src/pages/auth/login.tsx:149` — `size="lg"`
- **Rule:** design-system §5.1 "`lg` h-11 px-6 text-base (unused)"
- **Current:** the only `lg` button in the app; 44px next to 36px inputs.
- **Expected:** default size (`h-9`), matching the Input height so the form stacks on one control height (§12.2 "so controls line up at 36px").
- **Change:** `class-level` — remove `size="lg"` (default) — note this removes a prop value, not a prop the component needs; if the fixer reads the constraint strictly, override with `className="h-9 w-full text-sm"` instead.
- **Notes:** low confidence: the primitive defines `lg`, so using it is not contradicted by a rule, only by usage.
- **SKIPPED BECAUSE:** low confidence

### shard-005-F12 · nit · low · spacing
- **Where:** `src/pages/auth/login.tsx:80` — `<CardContent className="space-y-6 p-6 md:p-8">`
- **Rule:** provisional (§12.2) "Form card = `Card` + `CardContent space-y-4 p-4 md:p-6`"; §13 D-S3 (dashboard body padding `p-3`)
- **Current:** `p-6 md:p-8`, `space-y-6`.
- **Expected:** `space-y-4 p-4 md:p-6` (trips form cards, `trip-form.tsx:691`).
- **Change:** `class-level` — `space-y-6 p-6 md:p-8` → `space-y-4 p-4 md:p-6`
- **Notes:** provisional; a single-purpose login card may deserve more air — owner's call.
- **SKIPPED BECAUSE:** low confidence / provisional, owner's call

### shard-005-F22 · should · medium · forms (Vercel)
- **Where:** `src/widgets/car-form/car-form.tsx:316` — `disabled={submitting || (mode === 'edit' && !form.formState.isDirty)}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request"
- **Current:** in edit mode the Save button is disabled until a field is dirty, so a user who presses Save gets no feedback.
- **Expected:** enabled until `submitting`; the spinner already covers the request.
- **Change:** `class-level` — `disabled={submitting || (mode === 'edit' && !form.formState.isDirty)}` → `disabled={submitting}` — **this edits a conditional expression**; if the fixer treats it as "removing a conditional branch" under the standing constraints, leave it and record `needs-ruling`.
- **Notes:** the provisional §12.2 sticky footer says "disabled until valid", which is the trips convention and conflicts with the Vercel bullet; the Vercel rule is the graded one.
- **SKIPPED BECAUSE:** needs-ruling — edits a conditional expression on the submit button (removing a branch); conflicts with provisional §12.2

### shard-005-F30 · should · low · radius/border/shadow
- **Where:** `src/widgets/cars-table/cars-table.tsx:113` — `rounded-lg bg-primary/10 text-primary` (8×8 icon well)
- **Rule:** design-system §4 radius table "`rounded-md` — … brand mark, … palette quick-action tile"; §3 "`bg-primary/10 text-primary` … 'you are here / this is actionable context'"; §13 D-B11 icon well `rounded-md bg-primary/10`
- **Current:** a 32px decorative well with the 12px card radius, in the navy "selected/actionable" wash for a non-interactive cell.
- **Expected:** small wells are `rounded-md` (`sidebar.tsx` brand mark, `page-shell.tsx` icon well `rounded-lg bg-muted text-muted-foreground` per §12.1); neutral `bg-muted text-muted-foreground` since the cell is not actionable (`dashboard.tsx:583` neutral chip).
- **Change:** `class-level` — `rounded-lg bg-primary/10 text-primary` → `rounded-md bg-muted text-muted-foreground`
- **Notes:** low confidence on the colour part (navy wash is "current/selected", §3, but a per-row brand well has no explicit rule); the radius part is §4.
- **SKIPPED BECAUSE:** low confidence

### shard-005-F33 · nit · low · locale
- **Where:** `src/widgets/cars-table/cars-table.tsx:52` — `return new Date(dateString) < new Date();`
- **Rule:** design-system §2 "the dashboard's 'today' is Cairo's day — [comment] at 00:58 Cairo the UTC date is still yesterday"; §14 C-I2 "`Intl` + Cairo stays where day *boundaries* are computed (… `cairo.ts`)"
- **Current:** "expired" / "expiring in ≤30 days" compares against the browser clock, not the Cairo day; a date-only string parses as UTC midnight.
- **Expected:** a Cairo day boundary from `shared/lib/cairo.ts` (reference lib).
- **Change:** `class-level` (logic, additive) — compute `today` via the `cairo.ts` helper and compare date parts; keep both helper functions.
- **Notes:** low — this is status logic, not a visual rule; recorded because the design system states the day-boundary rule explicitly.

## Summary
FINDINGS: 33 (blocker 11 / should 18 / nit 4)
- **SKIPPED BECAUSE:** low confidence; logic change, not presentation

### shard-007-F12 · should · medium · colour
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:43-45` — `case 'expired': case 'warning': return 'warning';`
- **Rule:** design-system §3 "Destructive … critical / negative"; "Warning … degraded / attention, not failure"
- **Current:** an expired licence is rendered with the warning tone on the StatCard while the same state is `destructive` in `ExpirationBadge` (`:286`) and on the document card (`documents-tab.tsx:245`).
- **Expected:** expired = destructive, expiring = warning (as the file's own badges do).
- **Change:** `class-level` — return a destructive tone for `'expired'`. `out-of-shard: src/shared/ui/stat-card.tsx` — the `tone` union (`'primary' | 'success' | 'warning'`) has no destructive member; without that addition this cannot be applied.
- **Notes:** do not remove the `case 'warning'` branch; only split the return value.
- **SKIPPED BECAUSE:** out-of-shard: `src/shared/ui/stat-card.tsx` tone union has no destructive member

### shard-007-F14 · should · low · i18n/date
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:29` — `const now = new Date();` (also `documents-tab.tsx:57` `Date.now()`)
- **Rule:** design-system §2 "the dashboard's 'today' is Cairo's day — [comment] 'at 00:58 Cairo the UTC date is still yesterday and the headline said so' (`shared/lib/cairo.ts`)"
- **Current:** days-until-expiry is computed from the browser's local clock.
- **Expected:** the Cairo day boundary from `shared/lib/cairo.ts` (reference).
- **Change:** `class-level` (logic, additive) — compute `diff` from the Cairo "today" helper exported by `shared/lib/cairo.ts` instead of `new Date()`/`Date.now()`.
- **Notes:** only matters near midnight; low confidence that the rule extends past the dashboard headline.
- **SKIPPED BECAUSE:** low confidence

### shard-007-F25 · blocker · high · i18n/forms
- **Where:** `src/entities/driver-expense/schemas.ts:30-31` — `.positive('Enter a valid amount')`, `.min(1, 'Select a date')` (also `src/entities/driver-loan/schemas.ts:34-37`)
- **Rule:** design-system §9 "Copy … all go through `t()` (C-I4)"; vercel-rules "Forms" bullet "Errors inline next to fields"
- **Current:** zod messages are hard-coded English; `FormMessage` (`driver-expense-new.tsx:124,146`) prints them to the user.
- **Expected:** translated messages.
- **Change:** `class-level` — replace each literal with an i18n key (`'driverExpenses.validation.amount'`, `'driverExpenses.validation.date'`, `'driverLoans.validation.amount'`, `'driverLoans.validation.date'`, `'driverLoans.validation.method'`) and translate at the display site: `<FormMessage>` in `driver-expense-new.tsx` renders `t(message, { defaultValue: message })` — or resolve via `t()` in `FormMessage` itself (`out-of-shard: src/shared/ui/form.tsx`). Locale keys `out-of-shard: en.json, ar.json`.
- **Notes:** `driver-loan/schemas.ts` is consumed by the loans page in shard-008; changing the literal to a key there is safe only if that page's `FormMessage` also translates — record for shard-008.
- **SKIPPED BECAUSE:** out-of-shard: `src/shared/ui/form.tsx` FormMessage renders `error.message` verbatim (error wins over children), so a key in the schema would display raw; loan schema also consumed by shard-008 — record for shared/ui + shard-008

### shard-007-F28 · should · low · buttons
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:95` — `<Button variant="ghost" size="sm" onClick={goBack}>` (also `driver-expenses.tsx:94-96`)
- **Rule:** provisional (§12.7) "Back-to-list `Button outline sm` with `ArrowLeft rtl:rotate-180`, label `hidden sm:inline`"; §12.1 "actions `flex flex-wrap items-center gap-2` of `Button outline size=sm`"
- **Current:** ghost variant for the back action in the page-header actions cluster.
- **Expected:** `outline` (`trip-new.tsx:18-19`).
- **Change:** `class-level` — `variant="ghost"` → `variant="outline"` at both sites.
- **SKIPPED BECAUSE:** low confidence

### shard-007-F31 · should · medium · forms
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:102` — `<form onSubmit={form.handleSubmit(onSubmit)}` (also `driver-form.tsx:67`)
- **Rule:** vercel-rules "Forms" bullet "Warn before navigation with unsaved changes (`beforeunload` or router guard)"
- **Current:** neither form guards against leaving with a dirty state; the Back/Cancel buttons navigate immediately.
- **Expected:** a `beforeunload` listener or a react-router `useBlocker` bound to `form.formState.isDirty`.
- **Change:** `structural` — add a `useBlocker(form.formState.isDirty && !mutation.isPending)` (react-router v7) or a `beforeunload` effect in both forms; additive, no handler removed.
- **SKIPPED BECAUSE:** would change behaviour (navigation blocker), not presentation

### shard-007-F35 · blocker · high · colour (§14 ruling)
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:126` — `value={formatCurrency(stats.totalAmount)}` (also `:131`, `:141`)
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"; §2 "KPI value (+ `text-money` when money)"
- **Current:** three money KPI values rendered in the StatCard's default foreground, sans.
- **Expected:** `font-mono … text-money` (`dashboard.tsx:385`, `:436`).
- **Change:** `out-of-shard: src/shared/ui/stat-card.tsx` — the StatCard has no money tone/value class hook; a `tone="money"` (or a `valueClassName`) must be added there before these three call sites can pass it. Record for the `shared/ui` shard; nothing to change in this file until then.
- **SKIPPED BECAUSE:** out-of-shard: `src/shared/ui/stat-card.tsx` has no money tone hook

### shard-007-F46 · should · low · type
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:126` — `formatCurrency(stats.totalAmount)` (also `:131`, `:141`, `:225`, `:287`)
- **Rule:** design-system §2 "Decimals by unit: counts/money 0 … No currency symbol on the dashboard"; §13 D-T14 records `formatCurrency` (2 dp + ` EGP`) as a trips deviation
- **Current:** 2-decimal figures with an `EGP` suffix in KPI cards and rows.
- **Expected:** 0-dp money via `formatNumber(v, 0)` / `compactMoney` (`shared/lib/format.ts`, `dashboard.tsx:59-66`).
- **Change:** `class-level` — `formatCurrency(x)` → `formatNumber(x, 0)` at the five sites (keep the `formatCurrency` import if the dialog copy is meant to keep the unit).
- **Notes:** low confidence — the dialog description at `:287` arguably benefits from the unit; the owner has not ruled on D-T14.
- **SKIPPED BECAUSE:** low confidence (D-T14 not ruled)

### shard-007-F52 · should · low · forms
- **Where:** `src/widgets/driver-form/driver-form.tsx:208` — `disabled={submitting || (mode === 'edit' && !form.formState.isDirty)}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request"
- **Current:** in edit mode the Save button is disabled until the form is dirty.
- **Expected:** submit enabled; disabled only while the request is pending.
- **Change:** `class-level` — cannot be applied without removing a condition (standing constraint: do not delete conditional branches). Record only; the owner may waive.
- **SKIPPED BECAUSE:** low confidence; would delete a conditional branch — needs-ruling

### shard-008-F07 · nit · low · forms
- **Where:** `src/pages/driver-loans/driver-loan-new.tsx:93` — `<FormLabel>{t('driverLoans.fields.kind')} *</FormLabel>` (also `:123`, `:148`, `:171`)
- **Rule:** provisional (§12.2) "required marker `<span class="text-destructive">*</span>`"
- **Current:** bare ` *` in the label text.
- **Expected:** `<span className="text-destructive">*</span>` (`trip-form.tsx:701`).
- **Change:** wrap the asterisk: `{t(…)} <span className="text-destructive">*</span>`. `structural` (adds an element)
- **Notes:** provisional rule only.
- **SKIPPED BECAUSE:** low confidence; structural (provisional rule only)

### shard-008-F17 · should · low · spacing
- **Where:** `src/pages/driver-loans/driver-loans.tsx:291` — `<div className="space-y-4">`
- **Rule:** design-system §1 "**12px** … gap between every top-level block"
- **Current:** 16px between year cards.
- **Expected:** `gap-3` / `space-y-3` (`dashboard.tsx:99`; the loading skeleton on `:268` already uses `space-y-3`).
- **Change:** `space-y-4` → `space-y-3`. `class-level`
- **Notes:** the month block `p-3 md:p-4` (`:307`) matches the panel-body `p-3` at base; `md:p-4` has no reference counterpart but is on the ladder — left.
- **SKIPPED BECAUSE:** low confidence

### shard-008-F26 · nit · low · i18n
- **Where:** `src/widgets/drivers-table/drivers-table.tsx:90` — `{row.original.transporter || 'Apex'}`
- **Rule:** vercel-rules "Locale & i18n" bullet "Brand names, code tokens, identifiers: wrap with `translate="no"`"
- **Current:** brand fallback rendered as plain text.
- **Expected:** `<span translate="no">Apex</span>`.
- **Change:** wrap the cell text in `<span translate="no">`. `structural` (adds an element)
- **Notes:** —
- **SKIPPED BECAUSE:** low confidence; structural

### shard-008-F41 · should · medium · navigation & state
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:94` — `window.scrollTo({ top: 0, behavior: 'smooth' });`
- **Rule:** design-system §1 "Shell dimensions. Root `flex h-dvh` … the main column becomes its own scroll context instead of letting the whole page scroll past the sidebar"; §8 "Scroll: `scroll-behavior: smooth`"
- **Current:** scrolls the `window`, which never scrolls inside the shell — clicking Edit does not bring the form into view.
- **Expected:** scroll the element into view (`scrollIntoView` on the form container, which honours the global smooth behaviour).
- **Change:** keep the handler; add a `ref` on the form wrapper and call `ref.current?.scrollIntoView({ block: 'start' })` in `handleEdit`. `structural`
- **Notes:** do not delete the existing `window.scrollTo` call if the desktop Tauri shell relies on it — add the `scrollIntoView` alongside.
- **SKIPPED BECAUSE:** structural change adding a ref/effect-adjacent behaviour (scroll) — behaviour change, not presentation

### shard-008-F42 · should · low · loading/empty/error
- **Where:** `src/pages/fee-mappings/fee-mappings.tsx:101` — `toast.success(t('feeMappings.delete.success'));` (also `:104`, `:113`, `:119`)
- **Rule:** design-system §7 "Failures are **inline and persistent** — a strip or muted copy in place — never a toast"; §13 D-ST3 "Feedback channel | inline, never toast | Sonner toasts" (listed for owner ruling)
- **Current:** mutation and export feedback via Sonner toasts.
- **Expected:** inline strip/copy per §7 — but D-ST3 is pending a ruling, so no edit is proposed until the owner rules.
- **Change:** none now — `needs-ruling` (D-ST3). If ruled inline: render a `DegradedStrip`-style row above the table on error.
- **Notes:** recorded so the toast channel is not silently accepted.
- **SKIPPED BECAUSE:** needs-ruling (D-ST3)

### shard-009-F09 · nit · low · colour
- **Where:** `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx:77` — `r.error && 'bg-destructive/5'`
- **Rule:** design-system §3 "Status tint recipe … 10% tint" | §13 D-C6 "Icon-well / tag alpha: `X/10` vs `X/5`"
- **Current:** 5% destructive wash on failed rows.
- **Expected:** `/10` alpha step (`dashboard.tsx:1031`).
- **Change:** `class-level` — `bg-destructive/5` → `bg-destructive/10`.
- **SKIPPED BECAUSE:** low confidence

### shard-009-F18 · should · medium · navigation & state
- **Where:** `src/widgets/fee-mappings/fee-mappings-filters.tsx:22` — `state: FeeMappingsFilterState; onChange: …`
- **Rule:** vercel-rules "Navigation & State" bullet "URL reflects state—filters, tabs, pagination, expanded panels in query params"
- **Current:** search/company/accuracy live in parent component state; not reflected in the URL.
- **Expected:** filter state in query params as the scope bar does (`src/shared/scope/use-scope.ts`, §12.7 provisional `?q` pattern).
- **Change:** `structural` — `out-of-shard: src/pages/fee-mappings/*` (the owner of `state`); no change inside this widget.
- **SKIPPED BECAUSE:** out-of-shard: src/pages/fee-mappings/* owns the filter state

### shard-009-F27 · should · medium · states/forms
- **Where:** `src/widgets/fee-mappings/fee-mappings-form.tsx:145` — `toast.error(t('feeMappings.form.validation.fillRequired'))`
- **Rule:** vercel-rules "Forms" bullet "Errors inline next to fields; focus first error on submit" | design-system §7 "Failures are **inline and persistent** — a strip or muted copy in place — never a toast" | provisional (§12.2) validation recipe `border-destructive` + `aria-invalid` + `p text-[11px] font-medium text-destructive`
- **Current:** one generic toast for any invalid field; no field is marked or focused.
- **Expected:** inline message under the offending field with `aria-invalid`/`aria-describedby` (provisional §12.2, `trip-form.tsx:1198-1208`).
- **Change:** `structural` — additive: keep the toast, add per-field `aria-invalid` + `<p className="text-[11px] font-medium text-destructive">` and focus the first invalid control in `handleSubmit`.
- **SKIPPED BECAUSE:** structural change adding focus-first-invalid logic in handleSubmit changes behaviour, not presentation

### shard-009-F38 · nit · medium · forms
- **Where:** `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx:221` — `disabled={!coordValid || setLocation.isPending}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request"
- **Current:** Save is disabled while coordinates are invalid, so the `invalidCoords` toast path (`:100-103`) is unreachable and the user gets no explanation.
- **Expected:** enabled until the request starts; validation feedback on press.
- **Change:** `class-level` — `disabled={setLocation.isPending}` (the existing `coordValid` guard in `handleSave` already blocks submission).
- **Notes:** provisional §12.2 (trips sticky footer) does "disabled until valid" — this finding follows the frozen Vercel rule; owner may prefer the trips pattern.
- **SKIPPED BECAUSE:** needs-ruling (Notes: owner may prefer the trips disabled-until-valid pattern)

### shard-009-F51 · nit · low · colour
- **Where:** `src/widgets/fee-mappings/fee-mappings-table.tsx:150` — `'h-7 w-7 text-success hover:bg-success/10 hover:text-success'`
- **Rule:** design-system §3 "Actionable (navy)… navy marks anything you can act on"; "Success… passing status only" | §14 C-C4 "`hover:bg-accent` on chrome and menu items"
- **Current:** an action button coloured success to encode "has a location", with a bespoke green hover.
- **Expected:** action buttons in navy/ghost (`text-primary hover:bg-primary/10` as the sibling edit button `:165`, or the ghost default `hover:bg-accent`); status is better shown by a dot/`Badge`.
- **Change:** `class-level` — `text-success hover:bg-success/10 hover:text-success` → `text-primary hover:bg-primary/10`; keep the `title`/`aria-label` text as the state signal.
- **Notes:** low confidence — the mapping of "located" to a status is a judgment; the two `title` strings already distinguish the states.

## Summary
FINDINGS: 51 (blocker 10 / should 29 / nit 12)
- **SKIPPED BECAUSE:** low confidence

### shard-010-F12 · nit · high · typography
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:392` — `placeholder="0.00"`
- **Rule:** vercel-rules "Forms" bullet "Placeholders end with `…` and show example pattern"
- **Current:** `0.00`
- **Expected:** `0.00…`-style hint via `t()` (§9 "Copy … all go through `t()`")
- **Change:** `placeholder="0.00"` → `placeholder={t('fleetExpenses.amountPlaceholder', { defaultValue: '0.00…' })}` — `class-level`; new key `out-of-shard: src/shared/i18n/locales/en.json, ar.json`
- **Notes:** —
- **SKIPPED BECAUSE:** nit that is not a pure class-level edit (needs a new locale key in en/ar)

### shard-010-F14 · should · medium · states
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:254` — `toast.success(t('fleetExpenses.copied'));` (and `:256` `toast.error`)
- **Rule:** design-system §7 "Failures are inline and persistent — a strip or muted copy in place — never a toast" ; §13 row D-ST3
- **Current:** copy feedback via Sonner toast
- **Expected:** inline feedback in place (e.g. the "tap to copy" caption swaps to "copied" for a moment, `aria-live="polite"`)
- **Change:** `structural` — keep the handler; add a local `copied` state and render the caption at :321 as `copied ? t('fleetExpenses.copied') : t('fleetExpenses.tapToCopy')` with `aria-live="polite"`; leave the toast calls in place if the fixer must not remove them (constraint), otherwise this is the owner's call
- **Notes:** the mutation-error toasts live in `entities/transaction/queries` (out of shard).
- **SKIPPED BECAUSE:** structural: adds local state and swaps the caption — changes behaviour; toast calls must stay; owner's call (needs-ruling)

### shard-010-F18 · nit · low · type
- **Where:** `src/pages/fleet-expenses/fleet-expense-form.tsx:723` — `<p className="text-xs text-destructive">{error.message}</p>` (also `:478`)
- **Rule:** provisional (§12.2) "message `p text-[11px] font-medium text-destructive`" ; vercel-rules "Forms" bullet "Errors inline next to fields"
- **Current:** `text-xs`, regular weight, not linked to the control
- **Expected:** `text-[11px] font-medium text-destructive`, control `aria-invalid` + `aria-describedby`
- **Change:** `text-xs` → `text-[11px] font-medium`; additive `id` on the `<p>` and `aria-describedby` on the control once F09's ids exist — `class-level`
- **Notes:** —
- **SKIPPED BECAUSE:** low confidence

### shard-010-F38 · nit · medium · rtl
- **Where:** `src/pages/fleet-expenses/fleet-expenses.tsx:710` — `{t('fleetExpenses.reviewLink')} ›`
- **Rule:** design-system §9 "Directional chevrons get `rtl:rotate-180`"
- **Current:** a literal `›` glyph that points the wrong way in Arabic and is outside `t()`
- **Expected:** a `ChevronRight h-3 w-3 rtl:rotate-180 aria-hidden` icon (`dashboard.tsx:389` pattern in this file's own cash-in strip)
- **Change:** `structural` — replace the text glyph with `<ChevronRight className="inline h-3 w-3 rtl:rotate-180" aria-hidden="true" />`
- **Notes:** —
- **SKIPPED BECAUSE:** nit that is structural (replaces a text glyph with an icon), not a pure class-level edit

### shard-011-F08 · blocker · high · a11y
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:470` — `<div role={tappable ? 'button' : undefined} tabIndex={tappable ? 0 : undefined} onClick={tappable ? onOpen : undefined}`
- **Rule:** vercel-rules "Anti-patterns" bullet "Inline `onClick` navigation without `<a>`"; "Navigation & State" "Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)"; design-system §5.2 Fuel-event row "`<Link … >` carrying `state.from` for back-navigation" — navigation
- **Current:** the mobile card navigates to `/fleet-expenses/:id/edit` via `navigate()` from a `role="button"` div (and via `<tr onClick>` on desktop); no middle-click/Cmd-click, wrong role for navigation
- **Expected:** a `<Link to=… state={{ from: 'ledger' }}>` as the dashboard fuel row (`dashboard.tsx:611-617`)
- **Change:** `structural` — wrap the card content in `<Link to={`/fleet-expenses/${row.id}/edit`} state={{ from: 'ledger' }} className="…">` when `tappable` (keep `onOpen` prop and handler wiring; `onClick={onOpen}` can remain on the Link for parity). Inner buttons already `stopPropagation`; they must additionally call `e.preventDefault()` when nested in an anchor.
- **Notes:** nesting `<button>` inside `<a>` is invalid HTML; if the fixer keeps the div, at least F07's focus ring applies. Mark as `structural`; acceptable to defer with F07 applied.
- **SKIPPED BECAUSE:** structural Link wrap would nest buttons inside an anchor (invalid HTML) and change navigation semantics; finding itself allows deferring with F07 applied

### shard-011-F13 · blocker · medium · a11y
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:601` — `<span onClick={(e) => e.stopPropagation()}>`
- **Rule:** vercel-rules "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"
- **Current:** a click-swallowing `<span>` wrapper around the NativeSelect
- **Expected:** stop propagation on the control itself
- **Change:** `class-level` (attribute-level) — move `onClick={(e) => e.stopPropagation()}` onto the `NativeSelect` (keep the span if the primitive does not forward `onClick`; then `out-of-shard: src/shared/ui/native-select.tsx`)
- **Notes:** medium confidence: the span is not itself interactive to users; flagged because it literally matches the anti-pattern bullet.
- **SKIPPED BECAUSE:** moving `onClick` off the `<span>` would delete a handler; leaving it as-is (medium confidence, span not user-interactive)

### shard-011-F26 · should · high · loading
- **Where:** `src/widgets/fleet-expenses-table/cash-in-review.tsx:88` — `{query.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}`
- **Rule:** design-system §6 Flush divided list "Infinite: `<li ref aria-hidden class="h-px">` sentinel observed … loading-more `li p-3` + `Skeleton h-10`"; §7 "Loading is always the `Skeleton` primitive shaped like the slot"
- **Current:** a "Load more" outline button whose label swaps to "Loading" while fetching
- **Expected:** sentinel + `Skeleton` loading-more row (`dashboard.tsx:547-660`)
- **Change:** `structural` — add an IntersectionObserver sentinel (`rootMargin: '200px'`) below the list and render `<Skeleton className="h-24 w-full rounded-lg" />` while `isFetchingNextPage`; keep the Button as the no-JS/keyboard fallback (do not delete the handler)
- **Notes:** if the Button stays, the pending label must end with `…` (vercel "Typography" "Loading states end with `…`") — check `common.loading` in the locale files (`out-of-shard`).
- **SKIPPED BECAUSE:** IntersectionObserver auto-fetch is a behaviour change (adds an effect that fires network fetches); `common.loading` already ends with "..."

### shard-011-F32 · should · medium · forms
- **Where:** `src/widgets/fuel-event-form/fuel-event-form.tsx:484` — `disabled={submitting || (mode === 'edit' && !form.formState.isDirty)}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request"; "Forms" "Warn before navigation with unsaved changes (`beforeunload` or router guard)"
- **Current:** submit is disabled while not dirty in edit mode (the spinner part is correct); no unsaved-changes guard on a dirty form
- **Expected:** enabled submit that validates on click; a `beforeunload`/router blocker while `isDirty`
- **Change:** `class-level` — drop the `!form.formState.isDirty` gate from `disabled` is a behaviour change, so instead keep it and add `structural` (additive): `React.useEffect` registering `beforeunload` while `form.formState.isDirty && !submitting`
- **Notes:** medium — the dirty-gate is arguably intentional; the guard is the safe additive part.
- **SKIPPED BECAUSE:** `beforeunload` guard is a behaviour change (new effect); dirty-gate untouched

### shard-011-F37 · nit · high · typography
- **Where:** `src/widgets/fleet-expenses-table/ledger-list.tsx:611` — `<option value="">+ {t('fleetExpenses.addCategory')}</option>`
- **Rule:** vercel-rules "Dark Mode & Theming" bullet "Native `<select>`: explicit `background-color` and `color` (Windows dark mode)"
- **Current:** `NativeSelect` used with `className="w-36"`; whether it sets `bg-background text-foreground` lives in the primitive
- **Expected:** explicit `bg-background text-foreground` on the native select
- **Change:** `class-level` — `className="w-36"` → `className="w-36 bg-background text-foreground"` (harmless if the primitive already sets them; the primitive itself is `out-of-shard: src/shared/ui/native-select.tsx`). Same for `split-editor.tsx:294`.

## Summary
FINDINGS: 37 (blocker 13 / should 19 / nit 5)
- **SKIPPED BECAUSE:** NativeSelect's `className` lands on the wrapper div, not the `<select>` (which already sets `bg-background`); fix lives in the primitive — out-of-shard: src/shared/ui/native-select.tsx

### shard-012-F10 · should · low · loading/empty/error
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:94` — `<EmptyState lottieSrc="/animations/warning.lottie"`
- **Rule:** design-system §7 "Failures are inline and persistent — a strip or muted copy in place … Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page" | §13 D-ST2 "Query error: Dash `DegradedStrip` in place" (dashboard wins)
- **Current:** load failure renders the trips-style `EmptyState` with a lottie and an outline `h-9` Button.
- **Expected:** `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` strip with `AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning` and a `Button variant="outline" size="sm" className="h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning hover:text-warning"` action (`dashboard.tsx:1018-1047`).
- **Change:** `structural` — replace the `EmptyState` with the strip markup above, keeping the same `t('fuelEvents.loadFailed')` text and the existing Back button (restyled as the strip button). Confidence is low because the reference has no whole-page "record not found" case; the fixer may leave this as-is and note it.
- **Notes:** the same pattern is at `fuel-event-edit.tsx:69` and `fuel-events.tsx:425` (F23).
- **SKIPPED BECAUSE:** low confidence

### shard-012-F15 · nit · low · buttons & controls
- **Where:** `src/pages/fuel-events/fuel-event-edit.tsx:63` — `{t('common.back')}`
- **Rule:** provisional (§12.7) "Back-to-list `Button outline sm` with `ArrowLeft rtl:rotate-180`, label `hidden sm:inline`" | provisional (§12.1) "labels `hidden sm:inline`"
- **Current:** the Back label is always visible here and in `fuel-event-new.tsx:38`; the sibling details page hides it below `sm` (`fuel-event-details.tsx:134`).
- **Expected:** `<span className="hidden sm:inline">{t('common.back')}</span>` as in the details page.
- **Change:** `class-level` — wrap the label in `<span className="hidden sm:inline">` in both files.
- **SKIPPED BECAUSE:** low confidence

### shard-012-F51 · should · medium · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:401` — `<button type="button" onClick={() => navigate(\`/fuel-events/${e.ID}\`, { state: { from: … } })}`
- **Rule:** design-system §5.2 "Fuel-event row: `<Link … >` carrying `state.from` for back-navigation" | vercel-rules "Navigation & State" bullet "Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)" | vercel-rules "Accessibility" bullet "`<a>`/`<Link>` for navigation"
- **Current:** navigation through a `<button onClick={navigate}>`; the flat table's `onRowClick` (`:215`) navigates the same way (DataTable is out of shard).
- **Expected:** `<Link to=… state={{ from }} …>` with the identical classes (`dashboard.tsx:609-617`).
- **Change:** `structural` — swap the `<button type="button" onClick=…>` for `<Link to={\`/fuel-events/${e.ID}\`} state={{ from: … }}>` keeping `{...intentProps(...)}` and the className unchanged; import `Link` from `react-router-dom`.
- **SKIPPED BECAUSE:** would delete handler (`onClick` navigate → `<Link>`)

### shard-012-F58 · nit · low · spacing
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:601` — `grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3`
- **Rule:** design-system §0.4 "Breakpoints in use: `sm` 640, `md` 768, `lg` 1024" | §13 D-S9 "adds `xl`"
- **Current:** the card grid (and its skeleton `:577`) introduces `xl` (1280).
- **Expected:** `lg:grid-cols-3` (`dashboard.tsx:134,359` use `lg` for the widest step).
- **Change:** `class-level` — `xl:grid-cols-3` → `lg:grid-cols-3` at `:577` and `:601`. Low confidence: `PageShell` has no `max-w` cap, so three columns at 1024 may be tight — the fixer may keep `xl` and note it.

## Summary
FINDINGS: 58 (blocker 16 / should 35 / nit 7)
- **SKIPPED BECAUSE:** low confidence

### shard-013-F10 · nit · low · spacing
- **Where:** `src/pages/locations/locations.tsx:302` — `<TabsContent value="inbox" className="mt-4">` (also `:306`, `:333` `mt-4 space-y-3`)
- **Rule:** provisional (§12.3) "`TabsContent mt-2` (page overrides `mt-3 md:mt-4`)"; design-system §1 12px block gap
- **Current:** `mt-4` at all widths.
- **Expected:** `mt-3` (12px rhythm), the trips page's `mt-3 md:mt-4` at most.
- **Change:** `mt-4` → `mt-3` on the three `TabsContent`s. `class-level`
- **SKIPPED BECAUSE:** low confidence

### shard-013-F14 · should · medium · colour
- **Where:** `src/widgets/locations-dropoffs-table/pin-source-badge.tsx:21` — `<Badge variant="success">` … `'GPS (provisional)'`
- **Rule:** design-system §3 "Success … passing status only"; "Warning … degraded / attention, not failure"
- **Current:** a *provisional* (unconfirmed) pin is painted green — the passing colour.
- **Expected:** an unconfirmed state is "attention": `variant="warning"` (`dashboard.tsx:240-248`, 'not live' badge).
- **Change:** `variant="success"` → `variant="warning"`. `class-level`
- **Notes:** judgment call on role mapping; the queue row icon for provisional items (`locations-needs-attention.tsx:494` `text-success`) should follow the same decision.
- **SKIPPED BECAUSE:** needs-ruling — Notes say the success→warning role mapping is a judgment call (also coupled to the queue row icon)

### shard-013-F17 · should · medium · colour
- **Where:** `src/widgets/locations-map-picker/locations-map-picker.tsx:43` — `primaryColor = '#2563eb'` (and `:84` `'#16a34a'`)
- **Rule:** design-system §3 "Non-token colours in the reference: the two scrims and `theme-color`… No hex/rgb in any dashboard or shell TSX"; §0.2 palette rule "Adding a third accent colour breaks the whole scheme"; §13 D-C2
- **Current:** Tailwind blue-600 for the stored pin (not `--primary` navy) and green-600 for the suggestion.
- **Expected:** the actionable/stored hue is `--primary` (`217 60% 26%`); status hues are the tokens (`--success`).
- **Change:** `'#2563eb'` → `'hsl(var(--primary))'` and `'#16a34a'` → `'hsl(var(--success))'` if `MapView` passes marker colours to CSS/SVG; if the map library needs literal hex, resolve the tokens once via `getComputedStyle(document.documentElement)` (`structural`; `out-of-shard: src/shared/ui/map-view.tsx` to confirm). Third hues are tolerated *on the map itself*; the legend dots that echo them are F29.
- **Notes:** `STORED_PIN_COLOR`/`SUGGESTED_PIN_COLOR` in `locations-needs-attention.tsx:38-39` duplicate these values — change both together.
- **SKIPPED BECAUSE:** out-of-shard: `src/shared/lib/maps/google-provider.tsx` parses marker colours as hex (`hex(d.color)`), so `hsl(var(--primary))` would break markers; the token-resolution path is structural and needs the out-of-shard MapView confirmation

### shard-013-F22 · should · medium · states
- **Where:** `src/widgets/locations-needs-attention/locations-needs-attention.tsx:294` — `<EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title=…`
- **Rule:** design-system §7 "Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page"; "Exceptions empty | `py-6 text-center text-xs text-muted-foreground` 'all clear' — the one empty/error recipe (C-S3)"
- **Current:** dashed `py-16` EmptyState with `text-lg` title and CTA for the "all caught up" queue.
- **Expected:** `py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:180-183`).
- **Change:** `structural` — replace `EmptyState` with `<div className="rounded-lg border bg-card"><p className="py-6 text-center text-xs text-muted-foreground">{title} — {description}</p>{action}</div>`, keeping the `onBrowseDropoffs` branch and its Button. §13 D-ST1 lists this trips pattern as unruled; apply only if the owner rules for the dashboard recipe, otherwise leave.
- **SKIPPED BECAUSE:** needs-ruling — Notes say apply only if the owner rules for the dashboard recipe (§13 D-ST1 unruled)

### shard-014-F05 · nit · medium · RTL/i18n
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:429` — `EGP`
- **Rule:** design-system §9 "**Copy**, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)" | vercel-rules "Locale & i18n" bullet "Brand names, code tokens, identifiers: wrap with `translate="no"`"
- **Current:** hard-coded literal `EGP` in JSX.
- **Expected:** `t('common.currency', 'EGP')` (or whatever key the locale files already hold — check `en.json`/`ar.json` for an existing currency key before adding).
- **Change:** `EGP` → `{t('common.currency', 'EGP')}` — `class-level` (JSX text swap, additive); `out-of-shard: src/shared/i18n/en.json, ar.json` if the key does not already exist
- **Notes:** The Arabic UI would show the Latin code; a key lets the owner decide `ج.م` vs `EGP`.
- **SKIPPED BECAUSE:** nit that needs a new locale key (`common.currency` exists but is the label "Currency", not the code) — not a pure class-level edit

### shard-014-F07 · should · medium · type
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:191` — `<CardTitle className="flex items-center gap-2 text-base">`
- **Rule:** provisional (§12.2) "Form card = `Card` … heading `text-sm font-semibold uppercase tracking-wider`" | §13 row D-T3
- **Current:** `CardTitle` at `text-base` (16px) sentence-case with a 16px muted icon — three cards, lines 191, 270, 319.
- **Expected:** provisional form-card heading `text-sm font-semibold uppercase tracking-wider` (`trip-form.tsx:692`); the dashboard's own panel-title role is the 10px eyebrow (§10 PanelHead), which D-T3 lists as the open conflict.
- **Change:** `text-base` → `text-sm font-semibold uppercase tracking-wider` on all three `CardTitle`s — `class-level`
- **Notes:** Medium confidence: the exact form-heading size is provisional and awaits the owner's ruling on D-T3; the fix aligns with the same-role trips value, not the dashboard eyebrow.
- **SKIPPED BECAUSE:** needs-ruling — Notes say the form-heading size awaits the owner's ruling on D-T3

### shard-014-F11 · nit · medium · type
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:193` — `{t('oilChanges.form.sections.vehicle')} &amp; {t('oilChanges.form.sections.personnel')}`
- **Rule:** design-system §9 "Copy … all go through `t()` with `defaultValue` fallbacks (C-I4)"
- **Current:** two translated fragments joined by a hard-coded ` & ` glue; the conjunction is not localised and the word order is fixed for Arabic.
- **Expected:** one key for the whole heading (e.g. `t('oilChanges.form.sections.vehiclePersonnel', 'Vehicle & Personnel')`).
- **Change:** replace the interpolated heading with a single `t()` call — `class-level` (JSX text), `out-of-shard: src/shared/i18n/en.json, ar.json` (new key)
- **Notes:** Additive: keep the existing keys; add the combined one.
- **SKIPPED BECAUSE:** nit that needs a new locale key — not a pure class-level edit

### shard-014-F33 · nit · medium · RTL/i18n
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:501` — `placeholder="^WT-\d{5}$"`
- **Rule:** §13 row D-I2 "placeholders 'WT-12345'" (untranslated) | design-system §9 C-I4 "Copy … through `t()`" | vercel-rules "Forms" bullet "Placeholders end with `…` and show example pattern"
- **Current:** hard-coded English/regex placeholders (`^WT-\d{5}$` line 501; `30.044420` / `31.235712` lines 185, 199 are numeric examples and are fine).
- **Expected:** `t('locations.receiptPatterns.patternPlaceholder', '^WT-\\d{5}$')` so the Arabic locale can supply its own sample.
- **Change:** wrap the placeholder in `t()` with the current value as `defaultValue` — `class-level`; `out-of-shard: src/shared/i18n/en.json, ar.json` (optional key)
- **Notes:** Low impact; the regex is the same in both languages.
- **SKIPPED BECAUSE:** nit that needs a new locale key — not a pure class-level edit

### shard-015-F04 · should · medium · colour
- **Where:** `src/pages/oil-changes/oil-change-history.tsx:346-354` — `<StatCard label={t('oilChanges.history.stats.totalSpent')} … tone="primary"`
- **Rule:** design-system §3 "Money (amber) `text-money` on figures … KPI money values"; §2 "KPI value (+ `text-money` when money)"
- **Current:** money KPI (total spent, avg cost) rendered in the default foreground; tone only tints the icon well navy
- **Expected:** KPI money value carries `text-money` (`dashboard.tsx:385`, `:436`)
- **Change:** add `className="[&_p.truncate.font-semibold]:text-money"` is fragile; preferred: pass a value-colour class if `StatCard` exposes one — it does not → `structural`, `out-of-shard: src/shared/ui/stat-card.tsx` (add a `valueClassName`/`tone="money"`). Same for the avg-cost card at `:355-362` and `oil-changes.tsx:243-251` (`totalCost`).
- **Notes:** StatCard is a trips primitive (§12.5); §13 D-C1 records the same money-colour gap there.
- **SKIPPED BECAUSE:** out-of-shard: needs `valueClassName`/`tone="money"` on `src/shared/ui/stat-card.tsx`; the in-shard selector hack is flagged fragile by the finding itself

### shard-015-F26 · nit · low · type
- **Where:** `src/widgets/oil-changes-table/oil-changes-table.tsx:75` — `<div className="flex items-center gap-2 text-sm text-muted-foreground">` (date cell)
- **Rule:** provisional (§12.4) "date `font-mono text-[12.5px] tabular-nums`"; design-system §6 "identifiers (date, plate) are `shrink-0`"
- **Current:** sans `text-sm`
- **Expected:** `font-mono text-[12.5px] tabular-nums`
- **Change:** add `font-mono tabular-nums` (keep `text-sm` if the table is on the DataTable 14px scale) — `class-level`

## Summary
FINDINGS: 26 (blocker 5 / should 15 / nit 6)
- **SKIPPED BECAUSE:** low confidence

### shard-016-F35 · should · medium · navigation & state
- **Where:** `src/pages/service-invoices/service-invoices.tsx:49` — `const [carPage, setCarPage] = React.useState(1);`
- **Rule:** vercel-rules "Navigation & State" bullet "URL reflects state—filters, tabs, pagination, expanded panels in query params" | provisional (§12.7) "URL-synced list state with short keys (`?tab, q, md, rs, p, l`) written with `replace:true` starting from current params"
- **Current:** `q` is in the URL but `carPage`, `invoicePage`, `searchPage` and `selectedCar` live in `useState` — a refresh or shared link loses the page and the selected car.
- **Expected:** `p` (and the car id) in search params, as trips does (`trips.tsx:156-189`).
- **Change:** `structural` — mirror the `q` pattern already in the file (lines 41-47) for `p` and a car-id key; keep the existing `useState` setters as wrappers so no handler is removed.
- **Notes:** Medium: the dashboard has no pagination of its own; the rule is the Vercel bullet plus the provisional trips pattern.
- **SKIPPED BECAUSE:** structural state→URL sync changes behaviour (refresh/deep-link semantics), not presentation

### shard-016-F41 · should · medium · navigation
- **Where:** `src/widgets/service-invoices-table/service-invoices-table.tsx:105` — `<DropdownMenuItem onClick={() => { … navigate(url, { state: { invoice } }); }}>`
- **Rule:** vercel-rules "Navigation & State" bullet "Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)" | "Anti-patterns" "Inline `onClick` navigation without `<a>`"
- **Current:** View (105) and Edit (115) navigate via `onClick`; the Edit item has intent prefetch but no href.
- **Expected:** `DropdownMenuItem asChild` wrapping a `<Link to=… state=…>` (the `onClick` handler can stay on the item). Reference: `dashboard.tsx:611-617` fuel row is a `<Link>` carrying `state.from`; `sidebar.tsx` uses `NavLink`.
- **Change:** `structural` — wrap each navigating item's content in `<Link>` via `asChild`, keeping the existing `onClick`/intent props.
- **Notes:** —
- **SKIPPED BECAUSE:** structural: wrapping menu items in `<Link asChild>` changes navigation behaviour (href/modifier-click semantics), not presentation

### shard-016-F42 · nit · low · colour roles
- **Where:** `src/widgets/service-invoices-table/service-invoices-table.tsx:126` — `className="text-destructive focus:bg-destructive/10 focus:text-destructive"`
- **Rule:** design-system §3 "destructive menu item keeps red on focus (`user-menu.tsx:92`)"
- **Current:** adds a `focus:bg-destructive/10` fill the reference sign-out item does not have.
- **Expected:** `text-destructive focus:text-destructive` only (focus background stays the accent). Reference: `user-menu.tsx:92`.
- **Change:** `class-level` — remove `focus:bg-destructive/10`.
- **Notes:** —
- **SKIPPED BECAUSE:** low confidence

### shard-016-F55 · nit · low · tables
- **Where:** `src/pages/tires/tires.tsx:88` — `<thead className="bg-muted/50 text-xs text-muted-foreground">`
- **Rule:** design-system §3 C-C2 "`/60` head band"; §6 panel head 10px eyebrow | provisional (§12.4) DataTable thead `bg-muted/50 text-xs uppercase tracking-wider`, `th font-medium`
- **Current:** `bg-muted/50`, no uppercase/tracking, `th px-3 py-2` unweighted (88-93, 198-201).
- **Expected:** `bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`, `th px-3 py-2`. Reference: `dashboard.tsx:1001`.
- **Change:** `class-level` — thead → `bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` at both tables.
- **Notes:** No dashboard `<table>` rule — nit, mapping via the head-band recipe.
- **SKIPPED BECAUSE:** low confidence

### shard-016-F56 · nit · low · i18n
- **Where:** `src/pages/tires/tires.tsx:131` — `placeholder="315/80R22.5"`
- **Rule:** vercel-rules "Forms" bullet "Placeholders end with `…` and show example pattern" | design-system §9 C-I4 copy through `t()`
- **Current:** literal example placeholders (131, 225) outside `t()` and without `…`.
- **Expected:** `t('tiresStock.sizePlaceholder', { defaultValue: '315/80R22.5…' })`.
- **Change:** `class-level` — wrap in `t()` with `defaultValue`; `out-of-shard: locale files` for keys.
- **Notes:** —
- **SKIPPED BECAUSE:** low confidence

### shard-017-F03 · blocker · medium · buttons & controls / states
- **Where:** `src/features/tracking/tracking-page.tsx:511-520` — `{fleet.connection === 'down' && ( <button type="button" onClick={fleet.refresh} …`
- **Rule:** design-system §14 C-B2 "the strip's Button is the retry; the badge shows state only" | §7 "Retry is always a human action … retry lives only in the DegradedStrip" (`:262`, `:258`)
- **Current:** the connection pill embeds an inline icon-only refresh button when the stream is down — the exact pattern the owner removed from the dashboard's ConnectionBadge on 2026-08-29.
- **Expected:** badge = state only; retry = a compact `DegradedStrip` (`flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` + `Button variant=outline size=sm h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning hover:text-warning` with `RefreshCw`, `dashboard.tsx:1018-1047`).
- **Change:** `structural` — move `fleet.refresh` into a DegradedStrip-recipe strip rendered under the top bar while `fleet.connection === 'down'` (message `t('tracking.conn.down', …)`, retry Button as above) and leave the pill as state only. Removing the inline button deletes a conditional branch + handler, which the standing constraints forbid without an explicit owner go — flag for the owner exactly as C-B2 was; do not apply unilaterally. Additive alternative that needs no deletion: keep the inline button but give it the ring (F01) and `hover:bg-accent` (F08).
- **Notes:** The `FleetPanel` (shard-018) may already host a strip; check before adding a second retry (C-B2's point was one retry per condition).
- **SKIPPED BECAUSE:** needs-ruling — moving the inline refresh into a DegradedStrip deletes a branch + handler (C-B2 precedent requires explicit owner go); additive alternative applied via F01/F08 (ring + `hover:bg-accent`)

### shard-017-F12 · nit · low · colour roles
- **Where:** `src/features/tracking/tracking-page.tsx:477` — `bg-card/90 … backdrop-blur` (also `:494`, `:536`, `:545`)
- **Rule:** design-system §3 "Header glass `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60` — sticky header — content shows through"
- **Current:** a second glass recipe (`bg-card/90 backdrop-blur`, no `supports-[backdrop-filter]` fallback step).
- **Expected:** the shell's one glass recipe (`header.tsx:15`).
- **Change:** `class-level` — `bg-card/90 backdrop-blur` → `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60` on `:477`, `:494`, `:536`, `:545`.
- **Notes:** Low confidence — the header rule is for a sticky bar; over map tiles `bg-card` (white) may read better than graphite `bg-background`. Owner's call; recorded for completeness.
- **SKIPPED BECAUSE:** low confidence; notes defer to owner (glass recipe over map tiles)

### shard-017-F13 · nit · low · spacing
- **Where:** `src/features/tracking/tracking-page.tsx:581` — `className="absolute inset-x-2 bottom-2 z-20 flex justify-center md:inset-x-auto md:bottom-auto md:end-3 md:top-16 md:block"`
- **Rule:** design-system §1 "12px `gap-3`, `p-3` … page padding (mobile), gap between every top-level block"; 8px is "rows inside a panel"
- **Current:** the selected-vehicle card is inset 8px from the viewport edge on phones while the top bar (`:472` `p-3`) and the desktop position (`md:end-3`) use 12px.
- **Expected:** 12px page-level inset everywhere (`dashboard.tsx:99` `p-3`).
- **Change:** `class-level` — `inset-x-2 bottom-2` → `inset-x-3 bottom-3`.
- **Notes:** Extrapolating a page-padding rule to an overlay; low confidence.
- **SKIPPED BECAUSE:** low confidence (page-padding rule extrapolated to an overlay)

### shard-020-F19 · nit · low · loading/empty/error
- **Where:** `src/pages/trip-audit/trip-audit.tsx:368-380` — `<EmptyState icon={<CheckCircle2 className="h-6 w-6 text-success" />} title={t('tripAudit.queue.caughtUp', …)}`
- **Rule:** design-system §7 "Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page" and §10 "Empty/error `px-3 py-6 text-center text-xs text-muted-foreground`" | §13 row D-ST1
- **Current:** "All caught up" uses the `EmptyState` primitive (`py-16`, `text-lg` title, CTA)
- **Expected:** `py-6 text-center text-xs text-muted-foreground` copy (`dashboard.tsx:180-183`)
- **Change:** `structural` — awaits the owner's ruling on D-ST1; no edit proposed now. If ruled for the dashboard: pass `empty={<p className="px-3 py-6 text-center text-xs text-muted-foreground">…</p>}` and move the "Browse all trips" Button after it (`Button variant="outline" size="sm"`). The rendering of `empty` happens in `widgets/trip-audit-queue` (out-of-shard: `src/widgets/trip-audit-queue`).
- **SKIPPED BECAUSE:** needs-ruling (D-ST1; finding proposes no edit now; rendering of `empty` lives in out-of-shard `widgets/trip-audit-queue`)

### shard-020-F21 · should · medium · navigation & state
- **Where:** `src/pages/trip-audit/trip-audit.tsx:79` — `const [view, setView] = React.useState<QueueView>('needs_review');` (also `:86` search, `:89` status, `:91` sort, `:92` page)
- **Rule:** vercel-rules "Navigation & State" bullet "URL reflects state—filters, tabs, pagination, expanded panels in query params" | provisional (§12.7) "URL-synced list state with short keys (`?tab, q, md, rs, p, l`) written with `replace:true` starting from current params so global scope keys survive"
- **Current:** view, search, status, sort and page live only in component state; a reload or shared link drops them (date range/company are already in the URL via the global scope)
- **Expected:** query-param mirror as trips does (`trips.tsx:156-189`)
- **Change:** `structural` — additive: read initial values from `useSearchParams()` and write them back (`replace: true`, starting from the current params so the scope keys `co`, `d`, … survive). Keep all existing `useState` hooks and handlers. Suggested keys: `tab`, `q`, `st`, `sort`, `p` (check `shared/scope/use-scope.ts` for reserved keys before choosing — `q` and `p` are listed as global scope params in PLAN.md, so use `aq`/`ap` or similar).
- **Notes:** `limit` is already persisted to localStorage (`:103-105`) — leave it.
- **SKIPPED BECAUSE:** would change behaviour (URL-synced state, new effects/params), not presentation

### shard-020-F22 · should · low · buttons
- **Where:** `src/pages/trip-audit/trip-audit.tsx:246-266` — `<Tabs value={view} …><TabsList>{VIEWS.map((v) => (<TabsTrigger …>`
- **Rule:** design-system §5.2 "Scope presets: `Button size="sm" h-7 text-xs`, `variant` flips `default`↔`outline`, `aria-pressed` — segmented choice by variant swap (C-B4)" | §13 row D-B2 "Segmented choice … Tabs tray `h-9 rounded-lg bg-muted p-1`"
- **Current:** the three queue views are a Radix `Tabs` tray (out-of-shard primitive, `h-9`, active `bg-background shadow`)
- **Expected:** the dashboard's segmented control — a row of `h-7 text-xs` Buttons with `aria-pressed` and variant swap (`scope-date-picker.tsx:132-136`)
- **Change:** `structural` — awaits the owner's ruling on D-B2 (provisional §12.3 explicitly allows in-page Tabs). If ruled for the dashboard: replace `Tabs/TabsList/TabsTrigger` with `<div role="group" className="flex flex-wrap gap-1.5">` of `<Button size="sm" className="h-7 text-xs" variant={view===v?'default':'outline'} aria-pressed={view===v} onClick={() => setView(v)}>`; keep the count pill (F23) inside the button.
- **Notes:** low confidence — extrapolating a preset picker to a view switcher; the trips module was accepted as the gap-fill for tabs.
- **SKIPPED BECAUSE:** low confidence; needs-ruling (D-B2)

### shard-021-F21 · blocker · high · a11y / semantics
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:98` — `<div role="button" tabIndex={0} onClick={() => onOpen(match)}`
- **Rule:** vercel-rules "Accessibility" bullet "`<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)" | "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"
- **Current:** the whole row is a `div role="button"` (keyboard handled) that also contains a real `<Button>` — a native `<button>` cannot nest a button, which is why the div was used.
- **Expected:** the dashboard's rows are native `<button>`/`<Link>` elements (`dashboard.tsx:418`, `:611`, `:936`).
- **Change:** `structural` — make the inner `Button` the only control (row `div` without `role`/`tabIndex`/handlers is not allowed — handlers must stay), *or* keep the `div role="button"` and remove nothing: at minimum add the focus ring (F22). Recommended: keep the `div` (provisional §12.4 mobile rows use the same `div role=button tabIndex=0` pattern) and apply F22; note this as an accepted deviation.
- **Notes:** do not delete the `onKeyDown`/`onClick` handlers or the inner Button (standing constraints).
- **SKIPPED BECAUSE:** accepted deviation per the finding's own recommendation: `div role="button"` kept (handlers/inner Button may not be deleted); F22 applied instead

### shard-021-F28 · should · low · empty states
- **Where:** `src/widgets/trip-audit-queue/trip-audit-queue.tsx:236` — `<EmptyState title={…} description={…} />`
- **Rule:** design-system §7 "Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page" | §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground`" | §13 row D-ST1
- **Current:** default `EmptyState` (dashed, `py-16`, `text-lg` title).
- **Expected:** `py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:180-183`).
- **Change:** `structural` — swap the default `EmptyState` for `<p className="py-6 text-center text-xs text-muted-foreground">{title}</p>` (description may follow as a second line). The `empty` prop branch stays.
- **Notes:** `EmptyState` is a reference primitive; the deviation is in *using* it for a list empty. D-ST1 is unruled, hence low confidence — the fixer may leave it.
- **SKIPPED BECAUSE:** low confidence (D-ST1 unruled)

