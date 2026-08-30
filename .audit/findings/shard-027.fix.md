# Fix log — shard-027
| Finding | Status | Detail |
|---|---|---|
| shard-027-F01 | applied | `tone="success"` → `tone="default"` + `valueClassName="text-money"` on both money StatCards in trips-statistics-summary.tsx:207,228 |
| shard-027-F02 | applied | `block text-end tabular-nums text-success` → `block text-end font-mono tabular-nums text-money` in trips-statistics-routes.tsx:181 |
| shard-027-F03 | applied | `text-success` → `font-mono tabular-nums text-money` on the revenue footer total in trips-statistics-routes.tsx:264 |
| shard-027-F04 | applied | `text-xl font-bold tracking-tight text-success` → `font-mono text-xl font-semibold tracking-tight tabular-nums text-money` in trips-statistics-timeline.tsx:403 |
| shard-027-F05 | applied | `text-sm font-bold tabular-nums` → `font-mono text-sm font-semibold tabular-nums` on all three chart-footer figures in trips-statistics-timeline.tsx |
| shard-027-F06 | applied | `tabular` → `font-mono tabular-nums` / `font-semibold tabular` → `font-mono font-semibold tabular-nums` in trips-statistics-timeline.tsx:342,360 |
| shard-027-F07 | applied | `font-bold` → `font-semibold` at routes.tsx:236,252; grand total → `font-mono font-semibold tabular-nums text-money` |
| shard-027-F08 | applied | `label: 'Other'` → `t('trips.statistics.timeline.other', { defaultValue: 'Other' })`, `t` added to deps; key added to en.json and ar.json ("أخرى") |
| shard-027-F09 | applied | dropped `className="gap-1.5"` from the export Button and `h-3.5 w-3.5` from `<Download>` in trips-statistics.tsx:166-168 |
| shard-027-F10 | applied | `animate-spin` → `animate-spin motion-reduce:animate-none` in trips-statistics.tsx:157 |
| shard-027-F11 | applied | added `aria-live="polite" aria-atomic="true"` to the status wrapper in trips-statistics.tsx:154 |
| shard-027-F12 | applied | `rounded-lg` added to the three card-shaped skeletons in trips-statistics.tsx |
| shard-027-F13 | applied | loading branch gained a header-strip row and a tabs-bar skeleton; wrapper `space-y-3` → `space-y-3 md:space-y-4` |
| shard-027-F14 | applied | `hover:bg-accent/40` → `hover:bg-muted/50` in trips-statistics-summary.tsx:140 |
| shard-027-F15 | applied | `className={cn('h-9')}` → `className="h-8"` + `aria-pressed`; now-unused `cn` import removed to keep lint clean |
| shard-027-F16 | applied | `mb-3 text-sm font-semibold text-muted-foreground` → `mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` in routes.tsx:74 |
| shard-027-F17 | applied | structural (in-file): title block moved out of CardContent into a `border-b bg-muted/60 px-3 py-2` PanelHead band, `h3` to the 10px eyebrow, subtitle as the aside; Card given `overflow-hidden` so the band clips |
| shard-027-F18 | applied | `p-4` → `p-3` (routes.tsx:73) and `p-4 md:p-5` → `p-3` (routes.tsx:283); `p-6` EmptyState cards left alone per the finding's Notes |
| shard-027-F19 | applied | `format(String(label), 'PPP')` → `'d MMM yyyy'` in trips-statistics-timeline.tsx:336 |
| shard-027-F20 | applied | km precision to 0 dp: summary.tsx:187,191; timeline.tsx:189; routes.tsx distance cell and footer sum. Litres kept at 2 dp |
| shard-027-F21 | applied | `font-semibold tabular-nums` → `font-mono font-semibold tabular-nums` on both `dd` figures in summary.tsx:152,159 |
| shard-027-F22 | applied | `tick={{ fontSize: 11 }}` → `{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }` on both axes (inlined, chart-theme.ts is out-of-shard) |
| shard-027-F23 | applied | `font-medium` → `font-semibold` on all four chart-footer eyebrows in timeline.tsx |
| shard-027-F24 | applied | `px-3 pt-2 pb-1` → `p-3` on the chart body in timeline.tsx:288; `padded={false}` and the inline height kept |
| shard-027-F25 | applied | empty dash wrapped as `<span className="opacity-40">—</span>` at routes.tsx:198,209 |
| shard-027-F26 | skipped | low confidence (finding is graded `nit · low` and its own Notes call the change a judgment call) |
Gates: tsc ok, lint-diff ok (baseline 776, now 775, NEW 0)
APPLIED: 25 SKIPPED: 1
