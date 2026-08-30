# Repair pass — {{GROUP}}

You are fixing defects that a verification pass found in the output of an automated UI coherence audit. These are mistakes the audit itself introduced, plus coherence issues it missed.

## Read first
1. `.audit/PLAN.md` — standing constraints (they bind you).
2. `.audit/design-system.md` — §0–§10 rules, §14 rulings, §14b R-11..R-14.
3. `.audit/repairs.md` — the full repair list. **Work only on the items whose file is in your group, listed at the bottom.**

## What to do
For each repair item in your group: read the file, confirm the problem still exists, apply the stated fix. If the problem is already gone, or the stated fix would violate a constraint, skip it and say why.

## Hard rules
- Edit only the files in your group, plus `src/shared/i18n/locales/en.json` **and** `ar.json` together when a fix needs a translation key (never leave an English string as the Arabic value).
- Never delete a prop, handler, conditional branch, effect or export; never rename an exported symbol. A repair that says "remove the redundant onClick" is removing a *duplicate navigation*, which is allowed — the `<Link to=…>` keeps the behaviour. Read the surrounding code and be sure before you remove anything.
- Never edit `e2e/`, tests, `.audit/design-system.md`, `.audit/vercel-rules.md`, `.audit/PLAN.md`, or `eslint.config.js`.
- Do not run the app, Playwright, or the network. The backend is production.
- Do not use the `Skill` tool.

## After editing
1. `npx tsc --noEmit` — fix errors in files you touched; report others.
2. `python3 .audit/lint-diff.py` — fix NEW messages you introduced.
3. Append to `.audit/findings/repairs-{{GROUP}}.md` a table row per item: `| R01 | applied | what changed, file:line |` or `| R01 | skipped | why |`, ending with a line exactly `APPLIED: <n> SKIPPED: <m>`.

Print that last line as your final output.

## Your files
{{FILES}}
