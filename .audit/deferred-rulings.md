# Rulings on the deviations that blocked deferred findings (2026-08-30)

Owner delegated ("Do the remaining shards and any skipped stuff"). Each ruling splits a
"deviation" into two roles rather than declaring one side wrong, where the code shows the
two modules are answering different questions.

## R-1 (D-ST1) Empty states — split by scope
- A list/table that IS the page or tab's whole content → `EmptyState` primitive (dashed border,
  lottie, `text-lg` title, optional CTA). The dashboard has no full-page empty, so §12 governs.
- A panel sitting alongside other panels → the dashboard recipe
  `py-6 text-center text-xs text-muted-foreground` (C-S3).
Resolves: shard-013-F22, shard-020-F19, shard-021-F28 → **accepted as-is** (all page/tab-level).

## R-2 (D-ST3) Feedback channel — split by cause
- State of the data on screen (load failed, stream down, degraded) → inline and persistent
  (DegradedStrip / muted copy). Never a toast.
- Outcome of an action the user just took (saved, deleted, exported, copied) → toast.
  The dashboard is read-only, which is why it never shows this case.
Resolves: shard-008-F42, shard-010-F14 → **accepted as-is**.

## R-3 (D-B2) Segmented choice — split by what changes
- Switching *views* (different content/columns) → `Tabs` primitive.
- Choosing a *filter value* (same content, narrowed) → `h-7 text-xs` Buttons, variant swap,
  `aria-pressed` (C-B4).
Resolves: shard-020-F22 → **accepted as-is** (three queue views).

## R-4 (D-T14) Money formatting — split by role
- Headline tile/KPI figure whose exact value is one interaction away → compact, no currency suffix.
- Ledger/table cell, detail view, total → exact, 2 dp + currency.
Both helpers must spell compact the dashboard's way (lowercase `k`, 2 dp `M`) — done in shard-001-F04.
Resolves: shard-001-F05, shard-007-F46 → **accepted as-is**.

## R-5 (D-T3) Form section headings
The dashboard has no forms, so §12's trips value governs:
`text-sm font-semibold uppercase tracking-wider`.
Resolves: shard-014-F07 → **apply**.

## R-6 Vercel "submit stays enabled until the request starts"
A behaviour change (an unchanged form could be submitted), so out of scope for a presentation
audit — but shard-009-F38 shows the disable makes the `invalidCoords` toast unreachable, which is
a real bug. Keep skipped; raise as a separate follow-up.
Affects: shard-005-F22, shard-007-F52, shard-009-F38.

## R-7 Out-of-shard items
Every shard is audited now, so cross-file fixes are safe. Apply the class-level ones in editable
files (`stat-card.tsx`, `native-select.tsx`, `fee-mappings`); keep the structural ones
(`google-provider.tsx` hex-only marker parsing, `form.tsx` FormMessage precedence).

## R-8 Locale-key nits
"Not a pure class-level edit" was the fixer obeying its own nit rule; adding a key to en+ar is
explicitly allowed. Apply.
Affects: shard-010-F12, shard-014-F05, shard-014-F11, shard-014-F33.

## R-9 Structural changes that would produce invalid HTML
Nested `<button>` (shard-003-F07) or `<button>` inside `<a>` (shard-011-F08) — keep skipped;
the fixer was right.

## R-10 Behaviour changes
Scroll effects, IntersectionObserver auto-fetch, `beforeunload` guards, URL-state sync,
`onClick`→`<Link>` navigation swaps, focus-first-invalid: all out of scope. Keep skipped.
