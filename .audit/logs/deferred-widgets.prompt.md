# Deferred findings — widgets

You are applying findings that the shard fixers deliberately skipped. The owner has since ruled on the questions that blocked them.

## Read first
1. `.audit/PLAN.md` — standing constraints (they bind you).
2. `.audit/design-system.md` — §0–§10 rules, §14 rulings, §14b R-11..R-14.
3. `.audit/deferred-rulings.md` — **rulings R-1..R-10, which decide most of these.**
4. `.audit/deferred-findings.md` — the full list, each item with its original finding and the reason it was skipped. **Work only on items whose `**Where:**` file is in your group, listed at the bottom.**

## How the rulings decide each item
- **R-1/R-2/R-3/R-4** mark whole classes of item as *accepted as-is* — a role difference, not a deviation. Skip those, logging the ruling.
- **R-5, R-8** say apply.
- **R-6, R-9, R-10** say keep skipped: behaviour changes, invalid-HTML risks.
- **R-7** unblocks the out-of-shard items whose target file is in your group now.
- An item skipped only for "low confidence" is yours to judge: apply it if the design system clearly supports it and the change is presentational; otherwise skip and say why.

## Hard rules
- Edit only files in your group, plus `src/shared/i18n/locales/en.json` **and** `ar.json` together for a new key (never leave English text as the Arabic value).
- Never delete a prop, handler, conditional branch, effect or export; never rename an exported symbol.
- Never edit `e2e/`, tests, `.audit/*.md`, or `eslint.config.js`.
- Do not run the app, Playwright, or the network. The backend is production. Do not use the `Skill` tool.

## After editing
1. `npx tsc --noEmit` — fix errors in files you touched.
2. `python3 .audit/lint-diff.py` — fix NEW messages you introduced.
3. Append to `.audit/findings/deferred-widgets.md` one row per item: `| shard-0NN-FNN | applied | what changed, file:line |` or `| … | skipped | ruling R-N / reason |`, ending with a line exactly `APPLIED: <n> SKIPPED: <m>`.

Print that last line as your final output.

## Your files
- `src/widgets/car-form/car-form.tsx` (shard-005-F22)
- `src/widgets/cars-table/cars-table.tsx` (shard-005-F30, shard-005-F33)
- `src/widgets/driver-detail/overview-tab.tsx` (shard-007-F12, shard-007-F14)
- `src/widgets/driver-form/driver-form.tsx` (shard-007-F52)
- `src/widgets/drivers-table/drivers-table.tsx` (shard-008-F26)
- `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx` (shard-009-F09)
- `src/widgets/fee-mappings/fee-mappings-filters.tsx` (shard-009-F18)
- `src/widgets/fee-mappings/fee-mappings-form.tsx` (shard-009-F27)
- `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx` (shard-009-F38)
- `src/widgets/fee-mappings/fee-mappings-table.tsx` (shard-009-F51)
- `src/widgets/fleet-expenses-table/cash-in-review.tsx` (shard-011-F26)
- `src/widgets/fleet-expenses-table/ledger-list.tsx` (shard-011-F08, shard-011-F13, shard-011-F37)
- `src/widgets/fuel-event-form/fuel-event-form.tsx` (shard-011-F32)
- `src/widgets/fuel-events-table/fuel-events-table.tsx` (shard-012-F51, shard-012-F58)
- `src/widgets/locations-dropoffs-table/pin-source-badge.tsx` (shard-013-F14)
- `src/widgets/locations-map-picker/locations-map-picker.tsx` (shard-013-F17)
- `src/widgets/locations-needs-attention/locations-needs-attention.tsx` (shard-013-F22)
- `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx` (shard-014-F33)
- `src/widgets/oil-change-form/oil-change-form.tsx` (shard-014-F05, shard-014-F07, shard-014-F11)
- `src/widgets/oil-changes-table/oil-changes-table.tsx` (shard-015-F26)
- `src/widgets/service-invoices-table/service-invoices-table.tsx` (shard-016-F41, shard-016-F42)
- `src/widgets/trip-audit-queue/trip-audit-queue.tsx` (shard-021-F21, shard-021-F28)
