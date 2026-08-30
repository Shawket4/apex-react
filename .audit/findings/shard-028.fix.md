# Fix log — shard-028
| Finding | Status | Detail |
|---|---|---|
| shard-028-F01 | applied | `absolute right-0 top-0` → `absolute end-0 top-0` in user-form-dialog.tsx:200 |
| shard-028-F02 | applied | `mr-2 h-4 w-4 animate-spin` → `h-4 w-4 animate-spin` in user-form-dialog.tsx:221 |
| shard-028-F03 | applied | added `aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}` on the reveal Button; reused the existing `auth.showPassword`/`auth.hidePassword` keys rather than adding `users.dialog.*` duplicates |
| shard-028-F04 | applied | `bg-accent text-accent-foreground` → `bg-primary/10 text-primary`, `hover:bg-accent/60` → `hover:bg-accent` in trips-filters.tsx:141 |
| shard-028-F05 | applied | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` added to the inline clear and the option rows; the segmented chips now use `Button`, which carries the ring in its base (F13) |
| shard-028-F06 | applied | `rounded-xl` → `rounded-lg` in trips-mobile-list.tsx:65 |
| shard-028-F07 | applied | `rounded-xl` → `rounded-lg` in trips-mobile-list.tsx:54 |
| shard-028-F08 | applied | `<tr>` given `role="button" tabIndex={0} aria-expanded={isExpanded}` + Enter/Space `onKeyDown` and an inset focus ring, mirroring trips-mobile-list.tsx (the row-level option in the finding; the nested-button option was avoided) in trips-desktop-table.tsx:213 |
| shard-028-F09 | applied | added `aria-label={t('trips.pagination.goTo')}` and `inputMode="numeric"` in trips-pagination.tsx:135 |
| shard-028-F10 | applied | `aria-hidden` added to the five icons in trips-pagination.tsx (`ChevronsLeft`, `ChevronLeft`, `MoreHorizontal`, `ChevronRight`, `ChevronsRight`) |
| shard-028-F11 | applied | `<Icon … aria-hidden />` and `aria-label={label}` on the wrapping span when `compact` in receipt-status-badge.tsx:43,50 |
| shard-028-F12 | applied | `role="tablist"` → `role="group"`, `role="tab" aria-selected` → `aria-pressed` in trips-filters.tsx:189-206 (folded into F13) |
| shard-028-F13 | applied | tray + raw buttons → `flex flex-wrap gap-1.5` of `Button size="sm" variant={active ? 'default' : 'outline'} className="h-7 gap-1.5 text-xs"`; comment rewritten to keep the recorded wrap hazard |
| shard-028-F14 | applied | `bg-muted/40` → `bg-muted/60` on the header band, trips-desktop-table.tsx:84 |
| shard-028-F15 | applied | `hover:bg-muted/40` → `hover:bg-muted/50` in trips-desktop-table.tsx:216 |
| shard-028-F16 | applied | `bg-muted/20` → `bg-muted/40` (:303) and `isExpanded && 'bg-muted/30'` → `'bg-muted/40'` (:217) |
| shard-028-F17 | applied | `text-[10.5px]` → `text-[10px]` at trips-desktop-table.tsx:84,437, revenue-breakdown.tsx:201, trips-mobile-list.tsx:246 |
| shard-028-F18 | applied | `transition-transform` → `transition-transform duration-200` at trips-desktop-table.tsx:224 and trips-mobile-list.tsx:171 |
| shard-028-F19 | applied | `rounded bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground` → `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground` at trips-desktop-table.tsx:234 and trips-mobile-list.tsx:150 |
| shard-028-F20 | applied | `formatNumber(row.km, 1)` → `formatNumber(row.km, 0)` at trips-desktop-table.tsx:370,371 |
| shard-028-F21 | applied | `hover:bg-muted/40` → `hover:bg-muted/50` (:143); `bg-muted/30` → `bg-muted/40` (:233); `active:bg-muted/60` left as recorded |
| shard-028-F22 | applied | `bg-muted/95 … supports-[backdrop-filter]:bg-muted/80` → `bg-muted/80 … supports-[backdrop-filter]:bg-muted/60` at trips-mobile-list.tsx:73 |
| shard-028-F23 | applied | `text-[11px] font-semibold uppercase tracking-wider` → `text-[10px] … text-muted-foreground` at trips-mobile-list.tsx:76; the count half left at `text-[11px]` (allowed by the finding's note) |
| shard-028-F24 | applied | status tints → `border-warning/40 bg-warning/10 text-warning` / `border-success/40 bg-success/10 text-success`; `pending` unchanged |
| shard-028-F25 | applied | `gap-1 … px-2 py-0.5 text-xs` → `gap-1.5 … px-2.5 py-1 text-[11px]` at receipt-status-badge.tsx:45 |
| shard-028-F26 | applied | `text-foreground/90` → `text-foreground` at revenue-breakdown.tsx:114 |
| shard-028-F27 | skipped | low confidence |
| shard-028-F28 | skipped | out-of-shard: `src/pages/trips/trips.tsx` still sets `h-9` on the sibling Filters/Clear buttons (:458, :495) and the finding states the two must land together or not at all |
| shard-028-F29 | applied | `h-7` → `h-8` at trips-pagination.tsx:114 (SelectTrigger), :145 (Input), :150 (Go Button) |
| shard-028-F30 | applied | added `aria-current={entry === page ? 'page' : undefined}` at trips-pagination.tsx:196 |
| shard-028-F31 | applied | three placeholders through `t()`; added `users.placeholders.name/email/phone` to en.json and ar.json |
| shard-028-F32 | applied | `"+201..."` → `"+201…"` as the value of `users.placeholders.phone` |
| shard-028-F33 | applied | name `autoComplete="name"`; email `autoComplete="email" spellCheck={false}`; phone `type="tel" autoComplete="tel"` |
| shard-028-F34 | skipped | low confidence |
| shard-028-F35 | applied | `gap-x-4` → `gap-4` at user-form-dialog.tsx:122 |
| shard-028-F36 | applied | `className="w-72 bg-popover text-popover-foreground shadow-lg"` → `className="w-72"` at trips-desktop-table.tsx:390 |
| shard-028-F37 | skipped | low confidence (and the `:217` half is structural) |
| shard-028-F38 | skipped | low confidence; nit; the alternative named is a behaviour change |
Gates: tsc ok, lint-diff ok (baseline 776, now 775, 0 new)
APPLIED: 33 SKIPPED: 5
