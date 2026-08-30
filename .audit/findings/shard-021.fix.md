# Fix log — shard-021
| Finding | Status | Detail |
|---|---|---|
| shard-021-F01 | applied | `border-emerald-600/50 bg-emerald-600/5` → `border-primary bg-primary/10` on the previewed leg card (trip-audit-detail-dialog.tsx LegSentence) |
| shard-021-F02 | applied | order chips: good → `rounded-full bg-success/10 px-2 py-0.5 text-success`; muted → `rounded-full bg-muted px-2 py-0.5` |
| shard-021-F03 | applied | suboptimal-order well → `rounded-lg border border-warning/40 bg-warning/10`; title → `text-warning` |
| shard-021-F04 | applied | bundling well → `rounded-lg border border-primary/40 bg-primary/10`; title → `text-primary` |
| shard-021-F05 | applied | order-verified line `text-emerald-700 dark:text-emerald-400` → `text-success` |
| shard-021-F06 | applied | LayerChip base class += `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| shard-021-F07 | applied | LayerChip `text-xs` → `text-[11px]`; active → `border-primary bg-primary/10 text-primary`; inactive → `border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground` |
| shard-021-F08 | applied | `aria-pressed={previewed}` on the Preview Button |
| shard-021-F09 | applied | `aria-hidden="true"` on SEVERITY_ICON (3), Loader2 (trace + review button), CheckCircle2 (3), Route, Play; the loading-body Loader2 was replaced by F10 |
| shard-021-F10 | applied | structural: loading spinner → `space-y-3` of `Skeleton h-[380px] rounded-lg` + 5× `Skeleton h-[60px] rounded-lg` grid (import `@/shared/ui/skeleton`); `motion-reduce:animate-none` on the two remaining Loader2 |
| shard-021-F11 | applied | load error / noLegs / noFlags → `py-6 text-center text-xs text-muted-foreground` |
| shard-021-F12 | applied | Legs/Flags `h3` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` |
| shard-021-F13 | applied | SummaryItem: `bg-card`; label eyebrow with `mb-1.5`; value `font-mono text-[15px] font-semibold leading-none tabular-nums` (inner `tabular-nums` spans kept, harmless) |
| shard-021-F14 | applied | `tabular-nums` → `font-mono tabular-nums` on duration, max-deviation and coordinate spans |
| shard-021-F15 | applied | dialog body `space-y-6` → `space-y-3` + `overscroll-contain` |
| shard-021-F16 | applied | review box → `rounded-lg border bg-card p-3`; leg + flag cards → `rounded-lg border bg-card px-3 py-2.5` |
| shard-021-F17 | applied | `km/h`, ` m`, `km` literals → `t('tripAudit.units.kmh'/'m'/'km')`; keys `tripAudit.units.{km,kmh,m,h,min,s}` added to en.json + ar.json |
| shard-021-F18 | applied | `lat/lng.toFixed(5)` → `formatNumber(v, 5)`; `ratio.toFixed(2)` → `formatNumber(ratio, 2)`; `savingsPct.toFixed(1)` → `formatNumber(savingsPct, 1)` |
| shard-021-F19 | applied | RatioBadge empty `text-muted-foreground` → `opacity-40` (audit-format.tsx) |
| shard-021-F20 | applied | `ratio.toFixed(2)` → `formatNumber(ratio, 2)` in RatioBadge; duration units: additive local hook `useFormatDurationSecs` in the dialog (units via `t('tripAudit.units.h/min/s')`) used at every dialog call site; `formatDurationSecs` export left intact (an exported hook in audit-format.tsx added a new `react-refresh/only-export-components` lint message, so the hook lives in the dialog file instead) |
| shard-021-F21 | skipped | accepted deviation per the finding's own recommendation: `div role="button"` kept (handlers/inner Button may not be deleted); F22 applied instead |
| shard-021-F22 | applied | row → `px-3 py-2.5 md:px-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` |
| shard-021-F23 | applied | `opacity-55 hover:opacity-90` → `opacity-70` |
| shard-021-F24 | applied | plate → `shrink-0 font-mono text-xs text-foreground`; deliveries count → `font-mono tabular-nums` |
| shard-021-F25 | applied | `aria-hidden="true"` on Package, CheckCircle2, ChevronRight |
| shard-021-F26 | applied | removed size classes from ChevronRight, Route, Play, and the review-button Loader2/CheckCircle2 |
| shard-021-F27 | applied | skeleton wrapper → `space-y-2 rounded-lg border bg-card p-3`; rows → `h-10 w-full rounded-none` |
| shard-021-F28 | skipped | low confidence (D-ST1 unruled) |
| shard-021-F29 | applied | removed `divide-border/60` |
| shard-021-F30 | applied | flag title and queue primary line `text-sm font-medium` → `text-[13px] font-medium leading-snug` |
| shard-021-F31 | applied | Textarea `name="review_note" autoComplete="off"` |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 29 SKIPPED: 2
