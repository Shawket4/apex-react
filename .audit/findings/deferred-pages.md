# Deferred findings — pages group

| id | status | note |
|---|---|---|
| shard-005-F11 | applied | login submit `size="lg"` dropped → default `h-9`, matching the 36px Input stack (§12.2), `src/pages/auth/login.tsx:148` |
| shard-005-F12 | skipped | low confidence / provisional — the finding's own Notes hand the login card's extra air to the owner; §12.2 form-card padding is provisional and no ruling covers it |
| shard-007-F28 | applied | back-to-list Button `variant="ghost"` → `"outline"` (§12.1/§12.7), `driver-expense-new.tsx:95` and `driver-expenses.tsx:92` |
| shard-007-F31 | skipped | ruling R-10 — `beforeunload`/router-blocker is a behaviour change |
| shard-007-F35 | skipped | already satisfied: `StatCard` now exposes `valueClassName` and the three money KPIs already pass `font-mono text-money` (`driver-expenses.tsx:126,132,142`) — nothing left to apply |
| shard-007-F46 | skipped | ruling R-4 — ledger/KPI money split by role; `formatCurrency` (2 dp + EGP) accepted as-is here |
| shard-008-F07 | applied | required marker `*` wrapped in `<span className="text-destructive">` on all four labels (§12.2), `driver-loan-new.tsx:93,124,151,174` |
| shard-008-F17 | skipped | already satisfied — the year-card list is `space-y-3` at `driver-loans.tsx:294` |
| shard-008-F41 | skipped | ruling R-10 — scroll effects are explicitly out of scope |
| shard-008-F42 | skipped | ruling R-2 — mutation/export outcome is an action result, so a toast is the right channel |
| shard-010-F12 | applied | ruling R-8 — `placeholder="0.00"` → `t('fleetExpenses.amountPlaceholder', …)`, `fleet-expense-form.tsx:400`; key added to en.json + ar.json (numeric sample, identical in both) |
| shard-010-F14 | skipped | ruling R-2 — "copied" is an action outcome; toast accepted as-is |
| shard-010-F18 | applied | inline field errors `text-xs` → `text-[11px] font-medium` (§12.2 message recipe), `fleet-expense-form.tsx:503,796` |
| shard-010-F38 | applied | literal `›` → `<ChevronRight className="inline h-3 w-3 rtl:rotate-180" aria-hidden>` (§9 directional chevrons), `fleet-expenses.tsx:726`; `ChevronRight` was already imported |
| shard-012-F10 | skipped | low confidence — the reference has no whole-page "record not found" case and the finding itself allows leaving the `EmptyState`; swapping it for the DegradedStrip is structural with no rule that clearly governs a page-level load failure |
| shard-012-F15 | applied | Back label wrapped in `<span className="hidden sm:inline">` to match the sibling details page, `fuel-event-edit.tsx:62` (`fuel-event-new.tsx` is out of group) |
| shard-013-F10 | applied | three `TabsContent` `mt-4` → `mt-3` (§1 12px block rhythm), `locations.tsx:299,303,330` |
| shard-015-F04 | skipped | already satisfied: `StatCard` gained `valueClassName` and both money KPIs already carry `font-mono text-money` (`oil-change-history.tsx:357,366`) |
| shard-016-F35 | skipped | ruling R-10 — state→URL sync changes refresh/deep-link behaviour |
| shard-016-F55 | applied | both `<thead>` bands → `bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (C-C2 + §12.4), `tires.tsx:88,200` |
| shard-016-F56 | applied | ruling R-8 — the two example placeholders wrapped in `t()` with `…`, `tires.tsx:131,227`; `tiresStock.sizePlaceholder` / `oilTypePlaceholder` added to en.json + ar.json |
| shard-020-F19 | skipped | ruling R-1 — a page/tab-level empty keeps the `EmptyState` primitive |
| shard-020-F21 | skipped | ruling R-10 — URL-synced list state is a behaviour change |
| shard-020-F22 | skipped | ruling R-3 — three queue *views* are a Tabs case, not a filter-value segmented control |

`npx tsc --noEmit` clean · `lint-diff.py`: baseline 776, now 774, NEW 0.

APPLIED: 10 SKIPPED: 14
