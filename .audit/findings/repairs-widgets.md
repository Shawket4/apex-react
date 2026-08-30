# Repair pass — widgets

| Item | Status | Detail |
|---|---|---|
| R10 | applied | `format(new Date(invoice.date), …)` (throws on unparseable) replaced by the guarded `format` from `@/shared/lib/format` via a single `dateLabel`, falling back to an em dash. `service-invoice-details.tsx:25,49-52,68-69,93` |
| R11 | applied | semantic chip `border-primary/20` → `border-primary/40`; `font-black` → `font-medium` on all three match chips. `service-invoice-details.tsx:176,182,188` |
| R12 | applied | `role="button"`/`tabIndex={0}` dropped from the `<Link>` (anchor keeps native link role); the `onClick` handler kept but changed to `e.preventDefault(); navigate(link.to)` so exactly one history entry is pushed. `onKeyDown` kept (it already preventDefaults). `financial-tab.tsx:65-77` |
| R14 | applied | `Amount` base no longer hardcodes `text-money`; direction branch is now `isIn ? 'text-money' : 'text-foreground'`, restoring the in/out distinction the doc comment describes. `ledger-list.tsx:363-368` |
| R15 | applied | coordinate readout reverted to `lat.toFixed(5)` / `lng.toFixed(5)` — locale-independent digits for a machine-readable identifier. `trip-audit-detail-dialog.tsx:859` |
| R16 | applied | same edit as R10 (one fix covers both). |
| R20 | applied | dead `active ? '' : ''` replaced by a real distinction: `bg-primary-foreground/20 text-primary-foreground` when selected vs `bg-muted text-muted-foreground`; the permanently-active `bg-muted text-foreground` removed from the base. `fuel-events-filters.tsx:218-224` |
| R30 | applied | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended to the `TabButton` base class. `oil-changes-filters.tsx:114` |
| R32 | applied | CommandEmpty body → `block px-3 py-6 text-center text-xs text-muted-foreground`. `party-picker.tsx:145` |
| R33 | applied (partial) | The `text-success` revenue figures were already converted to `text-money` by shards 026/027; the only remaining gap was the missing `font-mono` at :190, now added. The `bg-success` bar in `trips-statistics-cars.tsx` is **not in this group** — left for the pages/shared groups or a later pass. |
| R34 | applied (partial) | `text-success` at routes :182/:265 already fixed by shard-027 (both are `font-mono … text-money` now). Remaining part applied: `font-mono` added to the car_rental and vat cells, and the total cell is now `font-mono font-semibold tabular-nums text-money`. Kept car_rental/vat on `text-muted-foreground` — they are sub-components of the amber total, and stacking `text-money` on `text-muted-foreground` in one class list is order-dependent and unreliable. `trips-statistics-car-table.tsx` and `trips-statistics-timeline.tsx` are **not in this group**. |
| R35 | applied | Six empty/error bodies collapsed to `py-6 text-center text-xs text-muted-foreground` (keeping `px-3`/`ms-4`/`px-4` insets and the chart card's `rounded-lg border bg-muted/20`); `italic` and the status-hued `border-s-2 border-primary/30` / `border-destructive/40` / `border-success/40` dropped from them. `trips-statistics-companies.tsx:252,631,676,965,973,1077`. The spinner row at :956 was left alone — it is a loading state, not empty/error copy, and needs its flex row for the spinner. |
| R36 | skipped | Already fixed in this file before this pass: :119 and :140 both carry the ring, and the `role="tab"` chip at :201 is now a `<Button>`, whose primitive base class supplies `focus-visible:ring-2 focus-visible:ring-ring`. The other sites R36 lists (trips-statistics-*, trip-replay, trips-desktop-table, shared/ui/*) are not in this group. |

`npx tsc --noEmit` — clean. `python3 .audit/lint-diff.py` — baseline 776, now 774, NEW 0.

APPLIED: 12 SKIPPED: 1
