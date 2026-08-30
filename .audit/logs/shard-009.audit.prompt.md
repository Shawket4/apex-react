# UI coherence audit — shard shard-009 (READ-ONLY)

You are auditing one shard of the Apex fleet dashboard for coherence with its design reference. You produce findings; you do not fix anything.

## Read first, in this order
1. `.audit/PLAN.md` — source of truth for the audit (standing constraints, what the reference is).
2. `.audit/design-system.md` — the design system extracted from the reference. §0–§10 are the rules (values are post-ruling and current). §14 lists the owner's rulings; treat each ruling as a rule. §12 is *provisional* gap-fill from the trips module — use it only for patterns the dashboard has no rule for (forms, tables, tabs, dialogs, charts), and say "provisional (§12)" when you cite it. §13 lists known trips deviations — if a shard file is in that list, cite the row.
3. `.audit/vercel-rules.md` — the frozen Web Interface Guidelines. Cite bullets by section name.

Then read **every file in the shard, in full** (the list is below). Do not skim. Entries marked **REFERENCE** are listed for completeness only: do not audit them and do not flag them.

## The reference is never wrong
These files are the standard and must never be flagged: `index.html`, `src/app/index.css`, `src/pages/dashboard/dashboard.tsx`, `src/shared/hooks/use-etit-live.ts`, `src/shared/hooks/use-layout-store.ts`, `src/shared/hooks/use-media-query.ts`, `src/shared/hooks/use-mounted.ts`, `src/shared/hooks/use-permissions.ts`, `src/shared/lib/animations.ts`, `src/shared/lib/cairo.ts`, `src/shared/lib/cn.ts`, `src/shared/lib/format.ts`, `src/shared/lib/fuel.ts`, `src/shared/ui/avatar.tsx`, `src/shared/ui/badge.tsx`, `src/shared/ui/button.tsx`, `src/shared/ui/cairo-range-calendar.tsx`, `src/shared/ui/command.tsx`, `src/shared/ui/dialog.tsx`, `src/shared/ui/dropdown-menu.tsx`, `src/shared/ui/empty-state.tsx`, `src/shared/ui/popover.tsx`, `src/shared/ui/scroll-area.tsx`, `src/shared/ui/select.tsx`, `src/shared/ui/sheet.tsx`, `src/shared/ui/skeleton.tsx`, `src/shared/ui/z-index.ts`, `src/widgets/command-palette/command-palette.tsx`, `src/widgets/header/header.tsx`, `src/widgets/language-toggle/language-toggle.tsx`, `src/widgets/layout/layout.tsx`, `src/widgets/scope-bar/scope-bar.tsx`, `src/widgets/scope-bar/scope-date-picker.tsx`, `src/widgets/sidebar/sidebar.tsx`, `src/widgets/theme-toggle/theme-toggle.tsx`, `src/widgets/user-menu/user-menu.tsx`, `tailwind.config.ts`. If a shard file *is* a reference file, record it in the coverage table as `reference — not audited`.

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
Write exactly one file: `.audit/findings/shard-009.md` with this structure:

```
# Findings — shard-009

## Coverage
| File | LOC | Status | Notes |
(one row per shard file: audited / reference — not audited / no UI content; notes = "no rule" items worth recording)

## Findings
### shard-009-F01 · <severity> · <confidence> · <dimension>
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
- `src/widgets/fee-mappings/accuracy-badge.tsx` (71 lines)
- `src/widgets/fee-mappings/fee-mappings-bulk-enrich-dialog.tsx` (139 lines)
- `src/widgets/fee-mappings/fee-mappings-excel.ts` (249 lines)
- `src/widgets/fee-mappings/fee-mappings-filters.tsx` (130 lines)
- `src/widgets/fee-mappings/fee-mappings-form.tsx` (332 lines)
- `src/widgets/fee-mappings/fee-mappings-location-dialog.tsx` (234 lines)
- `src/widgets/fee-mappings/fee-mappings-stats.tsx` (119 lines)
- `src/widgets/fee-mappings/fee-mappings-table.tsx` (195 lines)

