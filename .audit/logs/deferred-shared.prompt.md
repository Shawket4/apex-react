# Deferred findings — shared

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
3. Append to `.audit/findings/deferred-shared.md` one row per item: `| shard-0NN-FNN | applied | what changed, file:line |` or `| … | skipped | ruling R-N / reason |`, ending with a line exactly `APPLIED: <n> SKIPPED: <m>`.

Print that last line as your final output.

## Your files
- `src/entities/driver-expense/schemas.ts` (shard-007-F25)
- `src/features/tracking/tracking-page.tsx` (shard-017-F03, shard-017-F12, shard-017-F13)
- `src/shared/lib/format-number.ts` (shard-001-F05)
- `src/shared/lib/maps/google-provider.tsx` (shard-002-F08)
- `src/shared/lib/maps/leaflet-provider.tsx` (shard-002-F19)
- `src/shared/ui/collapsible-section.tsx` (shard-003-F07)
- `src/shared/ui/draggable.tsx` (shard-003-F39)
