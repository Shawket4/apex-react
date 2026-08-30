# UI coherence fix — shard shard-014

You are applying the audited findings for one shard of the Apex fleet dashboard. The findings were produced against the design reference; your job is to make the shard match the reference, nothing more.

## Read first, in this order
1. `.audit/PLAN.md` — standing constraints (they apply to you verbatim).
2. `.audit/design-system.md` — §0–§10 rules, §14 rulings, §12 provisional patterns.
3. `.audit/findings/shard-014.md` — the findings for this shard.
Then read every shard file you will touch, in full, before editing it.

## What to apply
- Every **blocker** and **should** finding with confidence **high** or **medium**.
- **nit** findings only when the change is a pure class-level edit.
- Skip (and log why, as `needs-ruling`) any finding whose **Notes** say the owner may rule, that the role may be distinct, or that the value is "listed for ruling" — those are decisions, not fixes.
- Skip (and log why) any finding that: is `low` confidence; is tagged `out-of-shard`; would touch a reference file (`index.html`, `src/app/index.css`, `src/pages/dashboard/dashboard.tsx`, `src/shared/hooks/use-etit-live.ts`, `src/shared/hooks/use-layout-store.ts`, `src/shared/hooks/use-media-query.ts`, `src/shared/hooks/use-mounted.ts`, `src/shared/hooks/use-permissions.ts`, `src/shared/lib/animations.ts`, `src/shared/lib/cairo.ts`, `src/shared/lib/cn.ts`, `src/shared/lib/format.ts`, `src/shared/lib/fuel.ts`, `src/shared/ui/avatar.tsx`, `src/shared/ui/badge.tsx`, `src/shared/ui/button.tsx`, `src/shared/ui/cairo-range-calendar.tsx`, `src/shared/ui/command.tsx`, `src/shared/ui/dialog.tsx`, `src/shared/ui/dropdown-menu.tsx`, `src/shared/ui/empty-state.tsx`, `src/shared/ui/popover.tsx`, `src/shared/ui/scroll-area.tsx`, `src/shared/ui/select.tsx`, `src/shared/ui/sheet.tsx`, `src/shared/ui/skeleton.tsx`, `src/shared/ui/z-index.ts`, `src/widgets/command-palette/command-palette.tsx`, `src/widgets/header/header.tsx`, `src/widgets/language-toggle/language-toggle.tsx`, `src/widgets/layout/layout.tsx`, `src/widgets/scope-bar/scope-bar.tsx`, `src/widgets/scope-bar/scope-date-picker.tsx`, `src/widgets/sidebar/sidebar.tsx`, `src/widgets/theme-toggle/theme-toggle.tsx`, `src/widgets/user-menu/user-menu.tsx`, `tailwind.config.ts`); would require deleting a prop, handler, conditional branch, effect or export, or renaming an export; would change behaviour rather than presentation; or contradicts a §14 ruling.
- A `structural` change is allowed only when it stays inside one shard file and keeps every prop, handler, branch and export intact (e.g. wrapping existing content in `EmptyState`, swapping a hand-rolled pill for `Badge` while passing the same children).

## Hard rules for this run
- Edit only files listed in the shard below (entries marked **REFERENCE** are excluded from the edit set even though they are listed), plus — when a finding needs a new translation key — `src/shared/i18n/locales/en.json` **and** `ar.json` (always both; never leave an English literal as the Arabic value). This locale exception overrides PLAN.md's out-of-shard rule; the gate allows exactly these two files. Reuse an existing key when the English text already exists; otherwise follow the file's namespace convention (`<feature>.<element>`) and add the key at the same position in both files.
- Never edit reference files, `e2e/`, tests, `.audit/design-system.md`, `.audit/vercel-rules.md`, `.audit/PLAN.md`.
- Never delete a prop, handler, conditional branch, effect or export; never rename an exported symbol; never "clean up" code a finding does not name.
- Do not run the app, tests or Playwright; do not call the network; do not commit. The backend is production. Do not use the `Skill` tool or any skill.
- Keep edits minimal and local: change the classes/values the finding names; do not reformat surrounding code.

## After editing
1. Run `npx tsc --noEmit`. If it reports errors in files you touched, fix them (without violating the rules above). If the errors are in files you did not touch, do not try to fix them — record them under Gates and continue to step 3.
2. Run `python3 .audit/lint-diff.py`. If it reports NEW messages in files you touched, fix them (a new `react-hooks/exhaustive-deps` or unused import you introduced counts). Never edit `eslint.config.js`.
3. **Always** write `.audit/findings/shard-014.fix.md`, even when nothing was applied:

```
# Fix log — shard-014
| Finding | Status | Detail |
|---|---|---|
| shard-014-F01 | applied | `old-class` → `new-class` in file:line |
| shard-014-F02 | skipped | reason (needs-ruling / out-of-shard: … / reference file / would delete handler / low confidence / …) |
…
Gates: tsc <ok|errors>, lint-diff <ok|N new>
APPLIED: <n> SKIPPED: <m>
```
**The final line of the file must be exactly `APPLIED: <n> SKIPPED: <m>` in column 1 with no markdown formatting; nothing may follow it.** Print that line as your final output.

## Shard files
- `src/widgets/locations-terminal-dialog/index.ts` (1 lines)
- `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx` (577 lines)
- `src/widgets/locations-terminals-table/columns.tsx` (122 lines)
- `src/widgets/locations-terminals-table/index.ts` (1 lines)
- `src/widgets/locations-terminals-table/locations-terminals-table.tsx` (30 lines)
- `src/entities/maint-stock/api.ts` (38 lines)
- `src/entities/maint-stock/queries.ts` (44 lines)
- `src/entities/maint-stock/schemas.ts` (43 lines)
- `src/entities/mapping/api.ts` (30 lines)
- `src/entities/mapping/queries.ts` (82 lines)
- `src/entities/mapping/schemas.ts` (36 lines)
- `src/entities/oil-change/api.ts` (83 lines)
- `src/entities/oil-change/queries.ts` (104 lines)
- `src/entities/oil-change/schemas.ts` (160 lines)
- `src/widgets/oil-change-form/oil-change-form.tsx` (485 lines)
- `src/widgets/oil-change-form/oil-change-status-preview.tsx` (101 lines)

