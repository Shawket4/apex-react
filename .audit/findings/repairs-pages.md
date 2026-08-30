# Repair pass — pages group

| Item | Status | Notes |
|---|---|---|
| R03 | applied | removed redundant `onClick={() => navigate('/drivers')}` from both back `<Link to="/drivers">`; `navigate` still used at :79 — driver-detail.tsx:109, :146 |
| R04 | applied | KPI hero value wrapper `<p>` → `<div>` (same className) so the loading `<Skeleton>` div has a legal parent — trip-audit.tsx:467-480 |
| R06 | applied | deleted the empty `<div className="absolute inset-0" />` overlay — login.tsx:49 |
| R08 | applied | loading skeletons `h-[92px]` → `h-16` to match FeeMappingsStats' real card height; grid/gap left as applied — fee-mappings.tsx:190 |
| R09 | applied | loading skeleton `h-[92px]` → `h-[70px]` (shared StatCard height) — driver-expenses.tsx:151 |
| R13 | applied | same two call sites as R03 (driver-detail.tsx:109, :146) — one navigation per click now |
| R17 | applied | `groupByYearMonth` now uses the guarded `format` from `@/shared/lib/format` (returns '' on unparseable input) instead of raw date-fns; date-fns import dropped — driver-expenses.tsx:28, :44 |
| R22 | applied | `valueClassName="font-mono text-money"` on the totalAmount / average / unpaid StatCards — driver-expenses.tsx:126-130, :132-136, :143-147 |
| R23 | applied | `valueClassName="font-mono text-money"` on totalAmount / average / unpaid StatCards; count cards untouched — driver-loans.tsx:243-248, :249-254, :260-265 |
| R24 | applied | both money tiles get `valueClassName="font-mono text-money"`; spent tile `tone="primary"` → `tone="default"` — fleet-expenses.tsx:318-335, :336-349 |
| R25 | applied (partial) | `valueClassName="font-mono text-money"` on totalSpent + avgCost, `tone="primary"` dropped from totalSpent — oil-change-history.tsx:352-360, :361-369. The totalCost card in `oil-changes.tsx` is out of this group and was left to the owning group. |
| R26 | applied | all four money spans `text-money` → `font-mono text-money` — fuel-events.tsx:385, :386, :394, :395 |
| R27 | applied | direction segmented control base string gains `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` — fleet-expense-form.tsx:440 |
| R28 | applied | focus ring appended to both raw chip base strings (status chips, include-media toggle) — fleet-expenses-messages.tsx:113, :127 |
| R29 | applied | focus ring appended to `FilterChip`'s base string — fleet-expenses.tsx:780 |
| R31 | applied | `rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on both bare `<Link>`s — fleet-expenses.tsx:722 and fleet-expenses-messages.tsx:265 |

Gates: `npx tsc --noEmit` clean; `python3 .audit/lint-diff.py` → baseline 776, now 774, NEW 0.

APPLIED: 16 SKIPPED: 0
