# UI coherence audit — shard {{SHARD_ID}} (READ-ONLY)

You are auditing one shard of the Apex fleet dashboard for coherence with its design reference. You produce findings; you do not fix anything.

## Read first, in this order
1. `.audit/PLAN.md` — source of truth for the audit (standing constraints, what the reference is).
2. `.audit/design-system.md` — the design system extracted from the reference. §0–§10 are the rules (values are post-ruling and current). §14 lists the owner's rulings; treat each ruling as a rule. §12 is *provisional* gap-fill from the trips module — use it only for patterns the dashboard has no rule for (forms, tables, tabs, dialogs, charts), and say "provisional (§12)" when you cite it. §13 lists known trips deviations — if a shard file is in that list, cite the row.
3. `.audit/vercel-rules.md` — the frozen Web Interface Guidelines. Cite bullets by section name.

Then read **every file in the shard, in full** (the list is below). Do not skim. Entries marked **REFERENCE** are listed for completeness only: do not audit them and do not flag them.

## The reference is never wrong
These files are the standard and must never be flagged: {{REFERENCE_FILES}}. If a shard file *is* a reference file, record it in the coverage table as `reference — not audited`.

## What counts as a finding
A place where a shard file does a job the design system has a rule for, but does it differently. Every finding must name the rule. If the design system has no rule for something, do not invent one — say `no rule` in the coverage notes instead. Do not flag pure data/logic files (`entities/*/api|queries|schemas`, `shared/api`, hooks without JSX or classes): record them as `no UI content`.

Check each file against all of these dimensions: spacing (§1), type (§2), colour roles (§3 — money must be `text-money`, never green; navy = actionable; third hues only in charts/maps), radius/border/shadow (§4), buttons & controls (§5), tables/lists (§6), loading/empty/error states (§7), motion (§8), RTL/i18n/a11y (§9 — logical utilities, `t()` for every string, aria on non-native controls), and the Vercel rules (accessibility, focus, forms, animation, typography, content handling, images, performance, navigation & state, touch, safe areas, dark mode, locale, hydration, hover, anti-patterns).

Severity: **blocker** = contradicts a §14 ruling, the palette rule in `index.css`, or a Vercel accessibility bullet; **should** = same role as a reference element, different value; **nit** = cosmetic. Confidence: **high** = the rule is explicit and the code clearly differs; **medium** = rule exists but the mapping to this element is a judgment; **low** = you are extrapolating.

## Hard rules for this run
- READ-ONLY: do not edit, create, move or delete any project file except the findings file named below. Do not run the app, do not run tests, do not call the network. The backend is production.
- Do not use the `Skill` tool or any skill (the taste skills are for a different phase). Grade only against `.audit/design-system.md` and `.audit/vercel-rules.md`; `PLAN.md` is constraints, not rules. A finding whose **Rule** line cannot quote an existing section or bullet is invalid — delete it rather than approximate.
- Do not propose deleting props, handlers, conditional branches, effects or exports, and do not propose renaming exports. Propose class-level or additive changes; where a fix needs a structural change (e.g. replacing a bare `<p>` with the `EmptyState` primitive) say so explicitly and mark it `structural`.
- If a fix would require touching a file outside the shard, say so (`out-of-shard: <file>`) instead of proposing it.

## Output
Write exactly one file: `{{FINDINGS_PATH}}` with this structure:

```
# Findings — {{SHARD_ID}}

## Coverage
| File | LOC | Status | Notes |
(one row per shard file: audited / reference — not audited / no UI content; notes = "no rule" items worth recording)

## Findings
### {{SHARD_ID}}-F01 · <severity> · <confidence> · <dimension>
- **Where:** `src/path/file.tsx:LINE` — `<verbatim quote of the offending fragment, ≤120 chars>`
- **Rule:** design-system §N "<short quote>" | vercel-rules "<Section>" bullet "<short quote>" | §13 row D-XX | provisional (§12.x)
- **Current:** what the code does (classes/values)
- **Expected:** what the reference does (classes/values), with the reference file:line
- **Change:** the exact edit (old → new classes, or the structural swap), tagged `class-level` or `structural`; add `out-of-shard: <file>` if applicable
- **Notes:** anything the fixer must know (e.g. this element is used in RTL; the value is shared with X)

(repeat)

## Summary
FINDINGS: <total> (blocker <b> / should <s> / nit <n>)
```

Number findings consecutively. Keep each finding self-contained — the fixer will read only this file, the design system and the code. **The last non-empty line of the file must be exactly `FINDINGS: <n> (blocker <b> / should <s> / nit <n>)` — plain text starting in column 1, no bold, bullet, heading or code fence.** When you have written the file, print that line as your final output.

## Shard files
{{SHARD_FILES}}
