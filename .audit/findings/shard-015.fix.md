# Fix log — shard-015
| Finding | Status | Detail |
|---|---|---|
| shard-015-F01 | applied | `font-semibold tabular-nums` → `font-mono text-sm font-semibold tabular-nums text-money` in oil-changes-table.tsx:119 |
| shard-015-F02 | applied | footer cost `font-semibold tabular-nums` → `font-mono font-semibold tabular-nums text-money` in oil-changes-table.tsx:255 |
| shard-015-F03 | applied | `font-semibold tabular-nums` → `font-mono text-sm font-semibold tabular-nums text-money` in oil-change-history.tsx:156 |
| shard-015-F04 | skipped | out-of-shard: needs `valueClassName`/`tone="money"` on `src/shared/ui/stat-card.tsx`; the in-shard selector hack is flagged fragile by the finding itself |
| shard-015-F05 | applied | hard-coded English → `t('placeholder.speedViolations')` / `t('placeholder.comingSoon')` in placeholder.tsx:28-29; keys added to en.json + ar.json (new top-level `placeholder` namespace before `nav`) |
| shard-015-F06 | applied | `font-black tracking-tight text-lg` → `font-mono text-[15px] font-semibold tabular-nums` + `dir="auto"` in service-cars-table.tsx:39 (plates may be Arabic) |
| shard-015-F07 | applied | removed `hover:bg-primary/5 hover:text-primary transition-all group` (kept `gap-2`) and `group-hover:translate-x-1 transition-transform` in service-cars-table.tsx:65,69 |
| shard-015-F08 | applied | `text-right` → `text-end`; chevron gets `rtl:rotate-180` in service-cars-table.tsx:61,69 |
| shard-015-F09 | applied | dropped `font-semibold uppercase tracking-wider` from the label span (now `text-xs`) in service-cars-table.tsx:68 |
| shard-015-F10 | applied | `'-'` → `<span className="opacity-40">—</span>` in service-cars-table.tsx:48; `opacity-40` added to the `—` fallbacks in oil-changes-table.tsx:85,92,135 and oil-change-history.tsx:105,112,172 |
| shard-015-F11 | applied | `rounded-lg bg-primary/10` → `rounded-md bg-muted`, icon `text-primary` → `text-muted-foreground` in service-cars-table.tsx:36-37 |
| shard-015-F12 | applied | `gap-2.5` → `gap-3` in oil-changes.tsx:218 and oil-change-history.tsx:316,339 |
| shard-015-F13 | applied | `rounded-lg` added to skeletons in oil-change-history.tsx:318,321 and oil-change-edit.tsx:103-105 |
| shard-015-F14 | applied | `space-y-4` → `space-y-3` in oil-change-edit.tsx:102 |
| shard-015-F15 | applied | `text-xs uppercase` → `text-[10px] font-semibold uppercase` in oil-changes-table.tsx:236 |
| shard-015-F16 | applied | `font-semibold text-foreground` → `font-mono font-semibold tabular-nums text-foreground` in oil-changes-table.tsx:250 |
| shard-015-F17 | applied | `STATUS_TONE.suppressed` → `bg-warning/10 text-warning`, `.matched` → `bg-success/10 text-success` in raw-message/schemas.ts:59-60 |
| shard-015-F18 | applied | ID chip → `rounded-full bg-muted px-2 py-0.5 font-mono text-[10.5px] font-medium tabular-nums text-muted-foreground` in oil-change-edit.tsx:73; plate chip `px-2.5 py-0.5 text-sm` → `px-2 py-0.5 text-[10.5px]` in oil-change-history.tsx:268 |
| shard-015-F19 | applied | `h-8 w-8` → `h-7 w-7` on row icon buttons in oil-changes-table.tsx (3) and oil-change-history.tsx (2) |
| shard-015-F20 | applied | `e.stopPropagation()` added inside each row Button `onClick` (oil-changes-table.tsx ×3, oil-change-history.tsx ×2); wrapper div handler kept |
| shard-015-F21 | applied | `py-8 text-sm` → `py-6 text-center text-xs` in oil-changes.tsx:280 |
| shard-015-F22 | applied | `type="search" name="q" autoComplete="off" aria-label={t('oilChanges.searchPlaceholder')}` added to the search Input in oil-changes-filters.tsx:37 |
| shard-015-F23 | applied | `aria-hidden="true"` on decorative icons in oil-changes-filters.tsx (5), oil-changes-table.tsx (3), oil-change-history.tsx (4), service-cars-table.tsx (2) |
| shard-015-F24 | applied | count chip `text-[10px] font-semibold` → `font-mono text-[10.5px] font-medium` in oil-changes-filters.tsx:124 |
| shard-015-F25 | applied | `'dd MMM yyyy'` → `'d MMM yyyy'` in oil-changes-table.tsx:77, oil-change-history.tsx:97,410 |
| shard-015-F26 | skipped | low confidence |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 24 SKIPPED: 2
