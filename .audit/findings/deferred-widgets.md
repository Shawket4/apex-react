# Deferred findings — widgets group

| Item | Status | Detail |
|---|---|---|
| shard-005-F22 | skipped | ruling R-6 — submit-enabled change is behavioural; also the `invalidCoords`-style follow-up, not a presentation fix (`car-form.tsx:316`) |
| shard-005-F30 | applied | icon well radius `rounded-lg` → `rounded-md` per §4; kept `bg-primary/10 text-primary` (colour part was low-confidence and has no explicit rule for a per-row brand well), `cars-table.tsx:113` |
| shard-005-F33 | skipped | logic change (Cairo day boundary in expiry status), not presentational; low confidence per the finding |
| shard-007-F12 | skipped | target of the fix is `src/shared/ui/stat-card.tsx` (tone union has no destructive member) — outside this group; R-7 does not put it in an editable file here |
| shard-007-F14 | skipped | low confidence + logic change (`new Date()` → Cairo helper); only matters near midnight |
| shard-007-F52 | skipped | ruling R-6 — deletes a conditional branch on the submit button (`driver-form.tsx:208`) |
| shard-008-F26 | applied | brand fallback wrapped in `<span translate="no">`, `drivers-table.tsx:90` |
| shard-009-F09 | applied | failed-row wash `bg-destructive/5` → `bg-destructive/10` (§3 10% tint), `fee-mappings-bulk-enrich-dialog.tsx:77` |
| shard-009-F18 | skipped | filter state is owned by `src/pages/fee-mappings/*` — outside this group; also URL-state sync (R-10) |
| shard-009-F27 | skipped | ruling R-10 — focus-first-invalid in `handleSubmit` is a behaviour change |
| shard-009-F38 | skipped | ruling R-6 — keep skipped; the unreachable `invalidCoords` toast is raised as a separate follow-up |
| shard-009-F51 | applied | location action button `text-success hover:bg-success/10 hover:text-success` → `text-primary hover:bg-primary/10 hover:text-primary` (§3: success = passing status only; actions are navy), `fee-mappings-table.tsx:150` |
| shard-011-F08 | skipped | ruling R-9 — `<Link>` wrap would nest `<button>` inside `<a>` (invalid HTML) |
| shard-011-F13 | skipped | moving `onClick` off the `<span>` deletes a handler (standing constraint); span is not user-interactive |
| shard-011-F26 | skipped | ruling R-10 — IntersectionObserver auto-fetch is a behaviour change |
| shard-011-F32 | skipped | ruling R-10 — `beforeunload` guard is a behaviour change; dirty-gate untouched per R-6 |
| shard-011-F37 | skipped | `NativeSelect`'s `className` lands on the wrapper div; the real fix is in `src/shared/ui/native-select.tsx` — outside this group |
| shard-012-F51 | skipped | ruling R-10 — `onClick` navigate → `<Link>` swap is a navigation-behaviour change |
| shard-012-F58 | applied | group-card grid + skeleton `xl:grid-cols-3` → `lg:grid-cols-3` (§0.4 breakpoints in use), `fuel-events-table.tsx:585,609` |
| shard-013-F14 | applied | provisional GPS pin `Badge variant="success"` → `"warning"` (§3: success is passing status only, unconfirmed = attention), `pin-source-badge.tsx:21`; the queue row icon was left alone (not in this finding's scope) |
| shard-013-F17 | skipped | ruling R-7 keeps the structural `google-provider.tsx` hex-only marker parsing item; `hsl(var(--primary))` would break markers |
| shard-013-F22 | skipped | ruling R-1 — page/tab-level empty → `EmptyState` accepted as-is |
| shard-014-F05 | applied | ruling R-8 — literal `EGP` → `{t('common.currencyCode', 'EGP')}`; new key en `EGP` / ar `ج.م`, `oil-change-form.tsx:429` |
| shard-014-F07 | applied | ruling R-5 — three `CardTitle`s `text-base` → `text-sm font-semibold uppercase tracking-wider`, `oil-change-form.tsx:191,270,319` |
| shard-014-F11 | applied | ruling R-8 — glued heading replaced by a single `t('oilChanges.form.sections.vehiclePersonnel')`; existing `vehicle`/`personnel` keys kept, `oil-change-form.tsx:193` |
| shard-014-F33 | applied | ruling R-8 — regex placeholder → `t('locations.receiptPatterns.patternPlaceholder', '^WT-\\d{5}$')`, new key in en+ar, `locations-terminal-dialog.tsx:501` |
| shard-015-F26 | applied | date cell gets `font-mono tabular-nums` (§12.4 date recipe; `text-sm` kept for the DataTable scale), `oil-changes-table.tsx:75` |
| shard-016-F41 | skipped | ruling R-10 — `DropdownMenuItem asChild`+`<Link>` changes navigation semantics |
| shard-016-F42 | applied | destructive menu item `focus:bg-destructive/10` removed (§3, matches `user-menu.tsx:92`), `service-invoices-table.tsx:126` |
| shard-021-F21 | skipped | accepted deviation per the finding's own recommendation — `div role="button"` kept (handlers + inner Button may not be deleted); F22 focus ring already applied |
| shard-021-F28 | skipped | ruling R-1 — list-is-the-tab-content empty → `EmptyState` accepted as-is |

Gates: `npx tsc --noEmit` clean; `python3 .audit/lint-diff.py` → baseline 776, now 774, NEW 0.

APPLIED: 11 SKIPPED: 20
