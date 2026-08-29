# UI coherence fix — shard {{SHARD_ID}}

You are applying the audited findings for one shard of the Apex fleet dashboard. The findings were produced against the design reference; your job is to make the shard match the reference, nothing more.

## Read first, in this order
1. `.audit/PLAN.md` — standing constraints (they apply to you verbatim).
2. `.audit/design-system.md` — §0–§10 rules, §14 rulings, §12 provisional patterns.
3. `{{FINDINGS_PATH}}` — the findings for this shard.
Then read every shard file you will touch, in full, before editing it.

## What to apply
- Every **blocker** and **should** finding with confidence **high** or **medium**.
- **nit** findings only when the change is a pure class-level edit.
- Skip (and log why, as `needs-ruling`) any finding whose **Notes** say the owner may rule, that the role may be distinct, or that the value is "listed for ruling" — those are decisions, not fixes.
- Skip (and log why) any finding that: is `low` confidence; is tagged `out-of-shard`; would touch a reference file ({{REFERENCE_FILES}}); would require deleting a prop, handler, conditional branch, effect or export, or renaming an export; would change behaviour rather than presentation; or contradicts a §14 ruling.
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
3. **Always** write `{{FIXLOG_PATH}}`, even when nothing was applied:

```
# Fix log — {{SHARD_ID}}
| Finding | Status | Detail |
|---|---|---|
| {{SHARD_ID}}-F01 | applied | `old-class` → `new-class` in file:line |
| {{SHARD_ID}}-F02 | skipped | reason (needs-ruling / out-of-shard: … / reference file / would delete handler / low confidence / …) |
…
Gates: tsc <ok|errors>, lint-diff <ok|N new>
APPLIED: <n> SKIPPED: <m>
```
**The final line of the file must be exactly `APPLIED: <n> SKIPPED: <m>` in column 1 with no markdown formatting; nothing may follow it.** Print that line as your final output.

## Shard files
{{SHARD_FILES}}
