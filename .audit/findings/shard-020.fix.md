# Fix log — shard-020
| Finding | Status | Detail |
|---|---|---|
| shard-020-F01 | applied | `space-y-5` → `space-y-3` on the page block wrapper in src/pages/trip-audit/trip-audit.tsx |
| shard-020-F02 | applied | KPI grid `gap-2.5` → `gap-3` |
| shard-020-F03 | applied | hero card and `KpiTile` `p-4` → `p-3` |
| shard-020-F04 | applied | hero label `text-xs font-medium …` and tile label `text-xs …` → `mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` |
| shard-020-F05 | applied | hero figure `mt-0.5 text-3xl font-bold tabular-nums leading-tight` → `font-mono text-[22px] font-semibold leading-none tabular-nums` |
| shard-020-F06 | applied | tile value `mt-0.5 truncate text-xl font-semibold tabular-nums` → `truncate font-mono text-[22px] font-semibold leading-none tabular-nums` |
| shard-020-F07 | applied | both detail lines → `mt-1.5 min-h-[17px] truncate text-[11.5px] text-muted-foreground`; the `{sub && …}` conditional in `KpiTile` kept as-is (gate forbids removing a JSX conditional), so tiles without `sub` still omit the line |
| shard-020-F08 | applied | hero tint `border-success/30 bg-success/5` → `border-success/40 bg-success/10`; `border-primary/30 bg-primary/5` → `border-primary/40 bg-primary/10` |
| shard-020-F09 | applied | hero figure colour `allClear ? 'text-success' : 'text-primary'` → `allClear ? 'text-success' : ''` |
| shard-020-F10 | applied | `'…'` loading string → `<Skeleton className="h-[22px] w-16 rounded-sm" />` at the four KPI value sites; `Skeleton` imported from `@/shared/ui/skeleton`; all ternary branches kept |
| shard-020-F11 | applied | `'—'` fallbacks wrapped in `<span className="opacity-40">—</span>` at last-scan status and the four KPI value sites |
| shard-020-F12 | applied | Filters trigger `className="h-9 gap-1.5"` removed (Button `sm` = h-8); `SearchInput` left as-is (out-of-shard primitive) |
| shard-020-F13 | applied | Clear-filters ghost button `className="w-full"` → `className="h-7 w-full text-xs"` |
| shard-020-F14 | applied | `size="sm"` added to the retry Button (now inside the strip, see F18) and the "Browse all trips" Button |
| shard-020-F15 | applied | popover section headings `text-xs` → `text-[10px]` (both) |
| shard-020-F16 | applied | `Loader2` `animate-spin` → `animate-spin motion-reduce:animate-none` |
| shard-020-F17 | applied | `h-4 w-4` / `h-3.5 w-3.5` removed from Loader2, Radar, Filter, ClipboardCheck; `gap-1.5` removed from the Filters trigger and Start-review Button (`className="shrink-0"`) |
| shard-020-F18 | applied | `isError` branch kept; `EmptyState` replaced by an inline `<div role="status">` strip (`flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`, `AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning`, message in `min-w-0` span, retry `Button variant="outline" size="sm" className="h-7 gap-1.5 border-warning/40 px-2.5 text-xs text-warning hover:text-warning"` with `RefreshCw`); same `refetch` handler |
| shard-020-F19 | skipped | needs-ruling (D-ST1; finding proposes no edit now; rendering of `empty` lives in out-of-shard `widgets/trip-audit-queue`) |
| shard-020-F20 | applied | `<p>` headings → `<label htmlFor="trip-audit-status">` / `<label htmlFor="trip-audit-sort">`; matching `id` added to each `NativeSelect` (verified: primitive spreads `...props` onto the `<select>`); `aria-label` props kept |
| shard-020-F21 | skipped | would change behaviour (URL-synced state, new effects/params), not presentation |
| shard-020-F22 | skipped | low confidence; needs-ruling (D-B2) |
| shard-020-F23 | applied | tab count pill `bg-success/15` → `bg-success/10`; `text-[11px]` → `text-[10px]` |
Gates: tsc ok, lint-diff ok (770 baseline / 770 now / 0 new)
APPLIED: 20 SKIPPED: 3
