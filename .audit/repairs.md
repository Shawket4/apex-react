# Repair list — defects introduced or missed by the audit (verified 2026-08-30)

## R01 · should-fix · [constraints] src/shared/ui/data-table.tsx:233
**Problem:** Landed in 3ca8d04 (shard-003): every clickable/expandable DataTable row now renders `role="button"` on the `<tr>`. Overriding the implicit `row` role strips the row (and therefore its `<td>`s' `cell` roles and column/row context) out of the table's accessibility tree, so screen-reader table navigation breaks on every table that passes `onRowClick` or `renderSubComponent` — cars, drivers, oil-changes, fuel-events, service-invoices, fee-mappings, etc. The gate could not see this: nothing was deleted, only an attribute added. `tabIndex`/`onKeyDown` are enough for keyboard operation and `aria-expanded` is already valid on a row.

**Fix:** Delete the `role={onRowClick || canExpand ? 'button' : undefined}` line (233) and keep `tabIndex` (234), `aria-expanded` (235) and the new `onKeyDown` handler; the row stays keyboard-operable while keeping table semantics.

## R02 · should-fix · [constraints] src/shared/ui/collapsible-section.tsx:94
**Problem:** Landed in 3ca8d04 (shard-003): the header title was wrapped in a native `<button aria-expanded>` while the surrounding header `<div>` still carries `role="button"` (line 67), `tabIndex={0}` (68), `aria-expanded` (69), `onClick={toggle}` (70) and an Enter/Space `onKeyDown` (71-82). That is interactive content nested inside `role="button"` — invalid, and it produces two tab stops and two identically-named "button, expanded" announcements for one disclosure. (Double-firing is avoided only by the `e.target === e.currentTarget` guard.) Affects every CollapsibleSection instance.

**Fix:** Keep one control: move the existing `toggle` onClick onto the inner `<button>` at line 94 and drop `role="button"`, `tabIndex` and `aria-expanded` from the wrapper `<div>` (attributes only — the handler is preserved, as the standing constraints require). Alternatively revert line 94 to the plain `<div className="min-w-0 flex-1">{title}</div>` and leave the row as the sole control.

## R03 · should-fix · [constraints] src/pages/driver-detail/driver-detail.tsx:109
**Problem:** Landed in e1d370d (shard-006): to keep the `navigate` handler while converting the back Buttons to links, the code became `<Button asChild><Link to="/drivers" onClick={() => navigate('/drivers')}>`. Both the onClick and the Link itself navigate, so one click pushes `/drivers` onto the history stack twice — the browser Back button then appears dead on the first press. Same pattern at line 146. Per-file token counts are unchanged (handler kept, Link added), so the gate passed it.

**Fix:** Remove the redundant `onClick={() => navigate('/drivers')}` from the `<Link>` on lines 109 and 146 (the `<Link to="/drivers">` performs the navigation), or revert those two call sites to the previous `<Button onClick={() => navigate('/drivers')}>` without `asChild`/`Link`.

## R04 · note · [constraints] src/pages/trip-audit/trip-audit.tsx:476
**Problem:** Landed in bd8cb40 (shard-020): the hero KPI's loading state renders `<Skeleton />` (which is a `<div>`, src/shared/ui/skeleton.tsx:3) inside the `<p>` opened at line 467. `<div>` is not permitted inside `<p>`, so the browser auto-closes the paragraph and React logs a DOM-nesting warning; the skeleton also escapes the paragraph's typography box. The three sibling KpiTile slots already use a `<div>` for the same value, so only this one is wrong.

**Fix:** Change the `<p>` wrapper at lines 467-479 to a `<div>` with the same className (matching KpiTile's value container at line 563).

## R05 · note · [constraints] src/features/tracking/components/time-deck.tsx:611
**Problem:** Dead conditionals left behind by the colour-token rewrites: `tripActive ? 'text-muted-foreground' : 'text-muted-foreground'` here and at lines 619 and 684 (both branches identical), `active ? '' : ''` in src/widgets/fuel-events-table/fuel-events-filters.tsx:221, and `!isSatellite && ''` in src/shared/lib/maps/google-provider.tsx:773. They compile and render correctly but read as unfinished state logic and will mislead the next editor.

**Fix:** Collapse each to the single surviving class: `className="text-muted-foreground"` at time-deck.tsx:611/619/684, drop the `active ? '' : ''` argument from the `cn(...)` call at fuel-events-filters.tsx:221, and drop the `!isSatellite && ''` argument at google-provider.tsx:773.

## R06 · note · [constraints] src/pages/auth/login.tsx:49
**Problem:** Landed in 51f5ef0 (shard-005): the radial-gradient overlay was emptied but the element was kept, leaving `<div className="absolute inset-0" />` — an empty absolutely-positioned layer over the brand panel that paints nothing and can only intercept future layout/stacking.

**Fix:** Delete the empty `<div className="absolute inset-0" />` on line 49 (it has no children, no handlers and no remaining styling).

## R07 · note · [constraints] src/shared/lib/zod-utils.ts:32
**Problem:** Landed in ea917be (shard-001): the three `refine` validators take a lazy message factory, but `zDateString`'s `.regex(..., { message: i18n.t('validation.invalidDate', ...) })` resolves `t()` once at module import. The date error is therefore frozen in whatever language was active when the module first loaded and never follows a runtime language switch — inconsistent with the sibling validators. (shard-001.fix.md records this as a known limitation of `.regex`.)

**Fix:** Replace the `.regex(...)` call with `.refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), () => ({ message: i18n.t('validation.invalidDate', { defaultValue: 'Invalid date' }) }))` — the export name, type and validation behaviour are unchanged, and the message becomes lazy like the others.

## R08 · should-fix · [fidelity] src/pages/fee-mappings/fee-mappings.tsx:190
**Problem:** shard-008-F37 cites §7/C-D2 — "Skeleton h-[92px] rounded-lg (matches the KPI footprint so the page does not reflow)" — and its Change said to "match the breakpoints/height to FeeMappingsStats". The applied fix instead copied the dashboard's KPI height verbatim: `h-16` → `h-[92px]`. The real card in `src/widgets/fee-mappings/fee-mappings-stats.tsx` is `flex items-center gap-2.5 rounded-lg border bg-card p-3` with a 10px label (≈15px line box) over a `text-[22px] leading-none` value = 24px padding + 2px border + 37px content ≈ 63px. The original `h-16` (64px) already matched it almost exactly; the fix moved it 29px away and reintroduces exactly the reflow the cited rule exists to prevent.

**Fix:** Restore `h-16` (or `h-[64px]`) on the five skeletons at fee-mappings.tsx:190 — the grid/gap changes from the same finding (`gap-3 sm:grid-cols-3 md:grid-cols-5`) are correct and should stay. `h-[92px]` is the dashboard KPI card's height and does not apply to this page's smaller stat well.

## R09 · should-fix · [fidelity] src/pages/driver-expenses/driver-expenses.tsx:151
**Problem:** shard-007-F43 cites the same C-D2 rule ("matches the KPI footprint so the page does not reflow") and adds a new loading grid of 5 × `Skeleton h-[92px] rounded-lg`. The slot it stands in renders the shared `src/shared/ui/stat-card.tsx`, whose height is `p-3 sm:p-3.5` (28px) + 1px borders + label `sm:text-[11px]` (≈16.5px) + `space-y-0.5` (2px) + value `md:text-lg leading-tight` (22.5px) ≈ 71px — not 92px. The grid and gap match the real row (`grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5`), so only the height is wrong, and it is wrong by ~21px on the one axis the cited rule governs.

**Fix:** Change the skeleton height at driver-expenses.tsx:151 from `h-[92px]` to the shared StatCard's height, e.g. `h-[70px]` (or `h-[68px] sm:h-[72px]` if you want the sm padding step reflected). Keep the rest of the block as applied.

## R10 · note · [fidelity] src/widgets/service-invoice-details/service-invoice-details.tsx:66
**Problem:** shard-016-F10 is labelled `class-level` ("additive import of `format` from `date-fns`") but changes runtime behaviour: `invoice.date.split('T')[0]` never throws, while `format(new Date(invoice.date), 'd MMM yyyy')` throws `RangeError: Invalid time value` on an empty or unparseable string. `date` is typed `z.string()` in src/entities/service-invoice/schemas.ts:49 with no format constraint, so an empty/absent date now unmounts the whole details page instead of rendering a blank. The same call was added at line 90 (the StatCard value). The sibling change in shard-016-F38 (service-invoices-table.tsx) is not affected — `toISOString()` threw on the same input already.

**Fix:** Guard both call sites, e.g. `const d = new Date(invoice.date); const dateLabel = Number.isNaN(d.getTime()) ? '—' : format(d, 'd MMM yyyy');` and use `dateLabel` at lines 66 and 90 (the em dash matching the §3 `<span className="opacity-40">—</span>` empty-value recipe already used elsewhere in this file).

## R11 · note · [fidelity] src/widgets/service-invoice-details/service-invoice-details.tsx:173
**Problem:** shard-016-F01 cites §3's status-tint recipe (`border-X/40 bg-X/10 text-X`) and rewrote the keyword chip (line 179) and the hybrid chip (line 185, now `border-primary/40`), but its Change list only named lines 180/186/295, so the sibling semantic chip at line 173 kept `border-primary/20`. The three chips are one family in one row and now carry two different border alphas, which is the inconsistency the cited section forbids. All three also still carry `font-black` (900) although the same finding's design-system citation (§2, "700 is never used… Plex isn't loaded above 600") is what motivated the rewrite of these exact class strings.

**Fix:** At line 173 change `border-primary/20` → `border-primary/40` so the semantic and hybrid chips match, and drop `font-black` → `font-medium` on lines 173, 179 and 185 (the neutral/status chip recipe in §5.3 is `font-medium`).

## R12 · should-fix · [regressions] src/widgets/driver-detail/financial-tab.tsx:72
**Problem:** shard-006/007 converted the financial-tab cards from `<Card>` to react-router `<Link to={link.to}>` but kept the old `onClick={() => navigate(link.to)}`. React Router 7's Link composes handlers as `if (onClick) onClick(event); if (!event.defaultPrevented) internalOnClick(event);` (node_modules/react-router/dist/development/chunk-EVOBXE3Y.mjs:10242-10247), so a single mouse click fires `navigate()` twice and pushes two identical history entries — the user has to press Back twice to leave. Additionally `role="button"` (line 68) on an anchor that has an href overrides the link role, so AT announces a button and `tabIndex={0}` (line 69) is redundant. The keyboard path is fine (preventDefault suppresses the synthesized click) — only the mouse path double-navigates.

**Fix:** Drop the redundant `onClick={() => navigate(link.to)}` and the `onKeyDown` block and let `<Link>` do the navigation (Enter already activates an anchor); also remove `role="button"` and `tabIndex={0}` so the anchor keeps its native link semantics. If the constraint against removing handlers must hold, change the handler to `onClick={(e) => { e.preventDefault(); navigate(link.to); }}` so exactly one navigation happens.

## R13 · should-fix · [regressions] src/pages/driver-detail/driver-detail.tsx:146
**Problem:** Same double-navigation defect as financial-tab: the Back action became `<Button asChild><Link to="/drivers" onClick={() => navigate('/drivers')} …>`. The custom onClick runs, then Link's internal handler runs because nothing called preventDefault, so one click pushes two `/drivers` entries onto the history stack. The identical pattern is at line 109 in the not-found branch. Screenshots never catch this because the rendered page looks correct; only the browser Back button reveals it.

**Fix:** Remove the `onClick={() => navigate('/drivers')}` from both `<Link to="/drivers">` elements (lines 109 and 146) — the Link already navigates. If the handler must stay, make it `onClick={(e) => { e.preventDefault(); navigate('/drivers'); }}`.

## R14 · should-fix · [regressions] src/widgets/fleet-expenses-table/ledger-list.tsx:365
**Problem:** The `Amount` component's base class list now starts with `text-money`, and the direction branch immediately below is `isIn && 'text-money'` — the same class. Cash-in and cash-out amounts therefore render in an identical colour. The doc comment directly above the function (lines 348-352) still states the contract that was broken: "Received money is the rare case so it gets the colour; spending stays quiet ink." The only remaining in/out cue is the ± glyph, and the conditional is now dead code that reads as if a distinction still exists.

**Fix:** Give the two directions different tokens, e.g. base `'whitespace-nowrap font-mono font-semibold tabular-nums'` plus `isIn ? 'text-money' : 'text-foreground'` (or `text-success` for inflow if that is the intended semantic), so the branch actually changes the rendering; update the comment if the intended semantic changed.

## R15 · should-fix · [regressions] src/widgets/trip-audit-detail-dialog/trip-audit-detail-dialog.tsx:859
**Problem:** shard-021 replaced the raw coordinate readout `({lat.toFixed(5)}, {lng.toFixed(5)})` with `({formatNumber(lat, 5)}, {formatNumber(lng, 5)})`. `formatNumber` in src/shared/lib/format.ts:20-27 is `new Intl.NumberFormat(undefined, …)` — the *browser* locale, not `i18n.language`. Verified with node: `Intl.NumberFormat('ar-EG', {minimumFractionDigits:5,maximumFractionDigits:5}).format(30.04442)` returns "٣٠٫٠٤٤٤٢". So on any ar-EG browser (the app's primary market) an unplanned-stop's lat/lng renders in Arabic-Indic digits with U+066B as the decimal mark, even when the UI language is English. The surrounding span is `dir="ltr" font-mono tabular-nums`, i.e. this is a machine-readable identifier meant to be read off or pasted into a map, not a quantity to localize.

**Fix:** Revert this one call site to `lat.toFixed(5)` / `lng.toFixed(5)` (leave the `font-mono tabular-nums` styling), or add a locale-independent helper for coordinates that pins `Intl.NumberFormat('en-US', { useGrouping: false, minimumFractionDigits: 5, maximumFractionDigits: 5 })`.

## R16 · note · [regressions] src/widgets/service-invoice-details/service-invoice-details.tsx:66
**Problem:** shard-016 replaced the crash-safe `invoice.date.split('T')[0]` with `format(new Date(invoice.date), 'd MMM yyyy')` here and at line 90. `ServiceInvoice.date` is typed only as `z.string()` (src/entities/service-invoice/schemas.ts:49) with no format constraint, so an empty or non-ISO value yields `Invalid Date`, and date-fns v3 `format` throws `RangeError: Invalid time value` — which unmounts the whole invoice-details view into the route error boundary instead of degrading to one bad field. The previous string split could not throw.

**Fix:** Use the repo's own guarded helper instead of raw date-fns: `import { format as fmtDate } from '@/shared/lib/format'` and call `fmtDate(invoice.date, 'd MMM yyyy')` — it runs `parseISO` + `isValid` and returns `''` for unparseable input (src/shared/lib/format.ts:10-14). Apply at both line 66 and line 90.

## R17 · note · [regressions] src/pages/driver-expenses/driver-expenses.tsx:44
**Problem:** `groupByYearMonth` now builds the month label with date-fns `format(d, 'MMMM')` where `d = new Date(e.date)`. If any single expense row carries an unparseable date, `format` throws `RangeError: Invalid time value` and the entire Driver Expenses page falls to the error boundary; the previous `d.toLocaleString('default', { month: 'long' })` returned the string "Invalid Date" and the page kept rendering. The value is also used as a grouping key and as part of the React key at line 199 (`${year}-${month}`).

**Fix:** Guard the parse before formatting, e.g. `const parsed = parseISO(e.date); const month = parsed ? format(parsed, 'MMMM') : '';` using `parseISO` from `@/shared/lib/format`, or call the guarded `format(e.date, 'MMMM')` wrapper from `@/shared/lib/format` which already returns `''` on invalid input.

## R18 · note · [regressions] src/pages/trip-audit/trip-audit.tsx:476
**Problem:** The KPI hero's loading branch renders `<Skeleton className="h-[22px] w-16 rounded-sm" />` inside the `<p>` opened at line 470. `Skeleton` is a `<div>` (src/shared/ui/skeleton.tsx:4), so this is a block element inside a paragraph — invalid HTML nesting. React's client-side createElement path means it does render, but the div is a block box inside an inline-formatted `<p>` with `leading-none`, so the skeleton's box does not sit where the number does, and any future SSR/hydration or HTML-validation pass will flag it. The three sibling uses at lines 503, 524 and 540 are fine because `KpiTile` wraps its value in a `<div>`.

**Fix:** Change the wrapper at line 470 from `<p className={cn('font-mono text-[22px] …')}>` to `<div className={cn('font-mono text-[22px] …')}>` (matching `KpiTile`'s own value container at line 564), so the Skeleton div has a legal parent.

## R19 · note · [regressions] src/shared/i18n/locales/ar.json:505
**Problem:** shard-007 added `driverExpenses.countLabel` / `countLabel_other` and wires it with `{ count }` at src/pages/driver-expenses/driver-expenses.tsx:191-194. Arabic has six plural categories; only the bare key and `_other` were authored. Verified against the installed i18next 24.2.3: with lng='ar' and only those two forms, counts 0, 1, 2, 3 and 11 all fall back to the singular "{{count}} مصروف" and only 100 picks `_other`. So an Arabic user sees "3 مصروف" instead of "3 مصروفات". The repo already authors the full Arabic set elsewhere (e.g. `fleetExpenses.party.matchedTimes_zero/_two/_few/_many` and `fleetExpenses.cashIn.strip_*`), so this key is inconsistent with the established convention.

**Fix:** Add the missing Arabic categories next to the existing pair: `countLabel_zero`, `countLabel_two`, `countLabel_few`, `countLabel_many` (mirroring the shape used by `fleetExpenses.cashIn.strip_*` in the same file). English needs no change — `countLabel`/`countLabel_other` already covers one/other.

## R20 · note · [regressions] src/widgets/fuel-events-table/fuel-events-filters.tsx:221
**Problem:** `MethodButton` was converted from a `role="tab"` button to a `<Button aria-pressed>`, and while doing so the count pill's active/inactive branch was flattened to `active ? '' : ''` — both arms are empty strings, so the ternary is dead and the count badge renders identically whether the method is selected or not. The previous code distinguished them (`bg-muted text-foreground` vs `bg-background text-muted-foreground`). The base class list now hardcodes `bg-muted … text-foreground`, i.e. every pill permanently wears the old *active* styling.

**Fix:** Either delete the dead ternary and keep only the base classes, or restore a real distinction, e.g. `active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'`, so the pill still reads differently inside a `variant="default"` (filled) button than inside an outline one.

## R21 · blocker · [coherence] src/shared/ui/stat-card.tsx:23
**Problem:** ROOT CAUSE for the whole 'money figure' dimension. `valueClassName` already existed on StatCard before the audit started (confirmed: `git show 43a4eba:src/shared/ui/stat-card.tsx` has it at :23/:45/:74/:82/:92), yet five separate shards deferred every money-KPI fix on the premise that the hook does not exist: shard-007-F35 ("the StatCard has no money tone/value class hook; a `tone=\"money\"` (or a `valueClassName`) must be added there" → fix.md: skipped "out-of-shard: stat-card.tsx has no money tone hook"), shard-008.md:105, shard-010.md:260, shard-012-F17, shard-015-F04 (fix.md: skipped "needs valueClassName/tone=money"). The prop is unused at every one of the 344 call sites. Result: ~13 money KPI values across 6 files still render sans, in default foreground, violating §14 C-T1 ("every money figure is font-mono tabular-nums text-money"). This is a finding that exists five times over and was blocked five times by a false premise — not a miss of detection, a miss of verification.

**Fix:** No edit needed in stat-card.tsx itself (shard-004:350 separately proposes making the base value face `font-mono text-[22px] font-semibold leading-none tabular-nums`). Unblock the five deferred findings now by passing `valueClassName="font-mono text-money"` on every money StatCard (the per-file lines are the findings below). If a `tone="money"` member is still wanted, add `money: 'bg-money/10 text-money'` to `toneClasses` — additive, deletes nothing.

## R22 · blocker · [coherence] src/pages/driver-expenses/driver-expenses.tsx:127
**Problem:** Money figures (§2 C-T1: font-mono tabular-nums text-money). Three money KPI values — totalAmount :127, avgAmount :132, unpaidAmount :142 — pass a bare `formatCurrency()` string to StatCard, so they render sans, `tabular-nums` only, in `text-foreground`. Covered by shard-007-F35 (blocker/high), skipped as out-of-shard on the false stat-card premise above. Still present in current src.

**Fix:** Add `valueClassName="font-mono text-money"` to the three `<StatCard>` calls at :126-128, :131-133, :141-143.

## R23 · blocker · [coherence] src/pages/driver-loans/driver-loans.tsx:245
**Problem:** Money figures (§2 C-T1). totalAmount :245, avgAmount :250, unpaidAmount :260 are `value={formatCurrency(...)}` — sans, foreground, no amber. Covered only as a coverage-table note in shard-008.md:7 and a Notes line at shard-008.md:105 ("the StatCard amounts (:245, :250, :260) have the same problem but the face is set by the primitive — out-of-shard"); never raised as its own finding, so it is not in shard-008.fix.md at all.

**Fix:** Add `valueClassName="font-mono text-money"` to the three money `<StatCard>` calls (:243-246, :248-251, :258-261). Leave the count cards (`stats.total`, `paidCount / total`) alone — they are counts, not money.

## R24 · blocker · [coherence] src/pages/fleet-expenses/fleet-expenses.tsx:324
**Problem:** Money figures (§2 C-T1). The two money summary tiles — spent `full: `${formatMoney(stats?.total_out)} EGP`` at :324 and fees at :340 — render sans in default foreground, and both still carry `tone="primary"` (navy on a non-actionable card, §0.2). shard-010.md:260 records it as a Notes line only ("out-of-shard: stat-card.tsx (no money tone exists there)"); shard-010-F31 fixed every *other* money figure in this file (donut legend, by-category, advances, cash-in total → `font-mono tabular-nums text-money`) and explicitly wrote "StatCard values are out-of-shard". So the file is now internally inconsistent: the same figure is amber mono in the legend and grey sans in the tile above it.

**Fix:** On both `<StatCard>`s add `valueClassName="font-mono text-money"`, and change `tone="primary"` → `tone="default"` (§3: navy marks what you can act on; a summary tile is not actionable).

## R25 · blocker · [coherence] src/pages/oil-changes/oil-change-history.tsx:355
**Problem:** Money figures (§2 C-T1) and money colour (§3). totalSpent :355 and avgCost :364 render with no `text-money` and no `font-mono`; the same pair exists at oil-changes.tsx:246. Covered by shard-015-F04 (should/medium) which proposed a `[&_p.truncate.font-semibold]:text-money` selector hack, called it fragile, and skipped with "needs valueClassName/tone=money on stat-card.tsx" — the prop it asked for was already there.

**Fix:** Add `valueClassName="font-mono text-money"` to the totalSpent card (:352-359) and the avgCost card (:360-367), and to the totalCost card in src/pages/oil-changes/oil-changes.tsx:243-251. Also drop `tone="primary"` on the money cards (§3).

## R26 · should-fix · [coherence] src/pages/fuel-events/fuel-events.tsx:385
**Problem:** Money figures (§2 C-T1) — partially applied finding. shard-012-F17's Expected line reads "money values `font-mono tabular-nums text-money`", but the applied change (fix.md: "money values wrapped in `<span className=\"text-money\">`") landed the colour and dropped the face. Lines :385, :386, :394, :395 are amber but sans, so the fuel totals do not align with the mono money figures the same audit installed in fleet-expenses.tsx and ledger-list.tsx. These are the only four `text-money` occurrences in non-reference src that lack `font-mono`.

**Fix:** Change all four spans to `<span className="font-mono text-money">`, or better, drop the spans and put `valueClassName="font-mono text-money"` on the two `<StatCard>`s at :382-390 and :392-400.

## R27 · blocker · [coherence] src/pages/fleet-expenses/fleet-expense-form.tsx:433
**Problem:** Focus rings (§14 C-B1: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element). The out/in direction segmented control is a raw `<button>` whose className is `'flex-1 text-sm font-medium transition-colors'` plus a selected/unselected branch — no ring in either branch, and no `focus:` fallback either, so the control is invisible under keyboard focus. MISSED ENTIRELY: shard-010 filed 40 findings and edited this exact button twice — F07 added `aria-pressed` at :438 and F08 recoloured :441-443 — without ever noticing the missing ring. shard-010.md contains zero occurrences of "focus-visible".

**Fix:** Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` to the base string at :440 (ring-inset because the parent at :429 is `overflow-hidden rounded-md border`, which would clip an outset ring).

## R28 · blocker · [coherence] src/pages/fleet-expenses/fleet-expenses-messages.tsx:107
**Problem:** Focus rings (§14 C-B1). The status filter chips (:107, base class at :113) and the include-media toggle (:122, base class at :126) are raw `<button aria-pressed>` elements with `transition-colors` and a hover tint but no focus ring. Same miss as above and by the same shard: shard-010-F19 added `aria-pressed` to these very chips at :110 and F20 recoloured :112-114 and :126-128 — the ring was never raised.

**Fix:** Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to both base class strings (:114 and :127). These are the dashboard's scope-preset pattern (`scope-date-picker.tsx:132`), which carries the ring.

## R29 · blocker · [coherence] src/pages/fleet-expenses/fleet-expenses.tsx:774
**Problem:** Focus rings (§14 C-B1). The `FilterChip` component — the third copy of the same pill-toggle recipe — is a raw `<button>` with `'min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1 text-xs font-medium transition-colors lg:min-h-8 lg:px-3'` and no ring. MISSED ENTIRELY, even though shard-010-F20 edited this exact class block at :786-788 to fix its colours.

**Fix:** Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the base string at :780. Fixing this one, plus the two in fleet-expenses-messages.tsx, makes all three copies of the chip agree.

## R30 · blocker · [coherence] src/widgets/oil-changes-table/oil-changes-filters.tsx:106
**Problem:** Focus rings (§14 C-B1). The `TabButton` (`role="tab" aria-selected`) is a raw `<button>` with `'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors'` and no ring — a tablist that cannot be operated visibly by keyboard. MISSED ENTIRELY: shard-015.md contains zero occurrences of "focus-visible" despite auditing 21 files including this one.

**Fix:** Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the base string at :112.

## R31 · should-fix · [coherence] src/pages/fleet-expenses/fleet-expenses.tsx:716
**Problem:** Focus rings (§14 C-B1). The intent-prefetched review link into Messages (`className="inline-block py-1 font-semibold text-primary hover:underline"`) has hover affordance but no focus ring; the same bare-`<Link>` pattern repeats at fleet-expenses-messages.tsx:262 (`className="font-semibold text-primary hover:underline"`). C-B1 covers nav links explicitly — the ruling added rings to the sidebar NavLink for exactly this reason. Neither is in shard-010's findings.

**Fix:** Append `rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to both link classNames (:719 and fleet-expenses-messages.tsx:265).

## R32 · should-fix · [coherence] src/widgets/fleet-expenses-table/party-picker.tsx:145
**Problem:** Empty/error copy (§14 C-S3: one recipe, `py-6 text-center text-xs text-muted-foreground`). The CommandEmpty body is `block px-3 py-2 text-sm text-muted-foreground` — wrong size (14px not 12px), wrong pad (8px not 24px) and start-aligned, and the override also cancels the `py-6 text-center` the CommandEmpty primitive supplies. MISSED ENTIRELY: shard-011 audited this file and filed findings on its z-index (:132), its suggestion-card tint (:265), its focus rings (:183), its icon sizes (:125) and its aria-hidden gaps (:268, :313, :317) — never on this empty copy. It is the only remaining bespoke empty/error recipe in a landed shard.

**Fix:** `<span className="block px-3 py-6 text-center text-xs text-muted-foreground">` (px-3 kept because CommandList supplies no horizontal padding).

## R33 · note · [coherence] src/widgets/trips-statistics/trips-statistics-companies.tsx:190
**Problem:** Money colour (§3: "revenue is not a passing status, and reusing the success green for it is what made a figure look like a badge"). Revenue is rendered in `text-success` at :190, :476, :575 and :762, and none of the four carries `font-mono` — so this file breaks the money-colour rule and the money-face rule at the same four sites. NOT YET AUDITED, not missed: this file belongs to shard-026, which is still PENDING (no .audit/findings/shard-026.md exists). Recording it so it is not lost if the run is cut short — it is the single largest remaining concentration of money-in-green in the repo.

**Fix:** At each of :190, :476, :575, :762 replace `text-success` with `text-money` and add `font-mono` (the existing `tabular-nums` becomes redundant but is harmless). Same substitution for the `bg-success` revenue bar at trips-statistics-cars.tsx:124 → `bg-money` (§6: bar fills are `bg-money`).

## R34 · note · [coherence] src/widgets/trips-statistics/trips-statistics-routes.tsx:182
**Problem:** Money colour (§3) + money face (§14 C-T1). `total_revenue` cell at :182 and the footer total at :265 are `text-success` with no `font-mono`; the sibling money columns in the same table (car_rental :196, vat :209, total :221) are neither amber nor mono either, so within one table revenue is green and its own components are grey. The identical pair exists at trips-statistics-car-table.tsx:95 and :175, and the projected-revenue headline at trips-statistics-timeline.tsx:403 is `text-xl font-bold tracking-tight text-success` (also the only `font-bold` figure, over §2's 600 ceiling). NOT YET AUDITED — shard-026/027 are PENDING.

**Fix:** `text-success` → `font-mono text-money` at routes :182/:265 and car-table :95/:175; add `font-mono tabular-nums text-money` to the uncoloured money cells beside them; timeline :403 → `font-mono text-[22px] font-semibold leading-none tabular-nums text-money`.

## R35 · note · [coherence] src/widgets/trips-statistics/trips-statistics-companies.tsx:612
**Problem:** Empty/error copy (§14 C-S3). Four different recipes for empty/error copy live in this one file: :252 `flex h-full items-center justify-center text-xs text-muted-foreground px-4 text-center`, :612 `flex items-center justify-center rounded-lg border bg-muted/20 p-6 sm:p-8 text-xs sm:text-sm text-muted-foreground text-center`, :657 `border-l-2 border-primary/30 ms-4 my-2 p-3 text-xs text-muted-foreground italic`, and :929/:937/:1034 `border-l-2 border-X/40 ms-4 my-2 p-2.5 text-[11px] text-muted-foreground italic` — none is `py-6 text-center text-xs text-muted-foreground`, and the last group colours an error/empty message by its parent's status hue. NOT YET AUDITED (shard-026 PENDING).

**Fix:** Collapse all six to `py-6 text-center text-xs text-muted-foreground` (keep `px-3`/`ms-4` where the parent supplies no inset). Drop the `italic` and the `border-l-2 border-success/40` on empty states — §14 C-T8 ruled the italic drawer caveat into the same recipe.

## R36 · note · [coherence] src/widgets/trips-table/trips-filters.tsx:201
**Problem:** Focus rings (§14 C-B1) still open across the not-yet-run shards, listed here so the remaining shards can be checked against them rather than rediscovering: trips-filters.tsx :113 (clear button), :132 (option row), :201 (`role="tab"` chip); trips-statistics-companies.tsx:823 (view switch); trips-statistics-summary.tsx:128; trip-replay.tsx:572 (satellite toggle); trips-desktop-table.tsx:213 and trips-statistics-companies.tsx:714 (`<tr onClick>` rows with `cursor-pointer` and no keyboard path at all). All are in PENDING shards 024/026/027/028. Two more are covered-but-unlanded: shared/ui/month-year-selector.tsx :75/:118 (shard-004.md:78) and shared/ui/multi-select.tsx :189/:216/:159 (shard-004.md:126/:150). In landed shards, the only raw interactive elements left without a ring are the five reported above — the audit's ring coverage is otherwise complete.

**Fix:** For the raw buttons, append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. For the two clickable `<tr>`s, the row needs a real keyboard path (`tabIndex={0}` + `onKeyDown` for Enter/Space + `aria-expanded`) alongside the ring, or the toggle should move onto a `<button>` in the first cell — a class-level fix alone would leave them unreachable.


TOTAL: 36
