# Fix log — shard-026
| Finding | Status | Detail |
|---|---|---|
| shard-026-F01 | applied | `text-success` → `text-money` on the group-table revenue cell in `trips-statistics-companies.tsx` |
| shard-026-F02 | applied | `text-success` → `text-money` on the group-table revenue footer total in `trips-statistics-companies.tsx` |
| shard-026-F03 | applied | `text-success` → `text-money` on the route sub-table revenue cell in `trips-statistics-companies.tsx` |
| shard-026-F04 | applied | `text-success` → `text-money` on the company card headline amount in `trips-statistics-companies.tsx` |
| shard-026-F05 | applied | `text-success` → `text-money` on the base-revenue column in `trips-statistics-car-table.tsx` |
| shard-026-F06 | applied | `text-success` → `text-money` on the base-revenue footer total in `trips-statistics-car-table.tsx` |
| shard-026-F07 | applied | `'bg-success'` → `'bg-money'` in the `barClassName` financial branch in `trips-statistics-cars.tsx` |
| shard-026-F08 | applied | all hard-coded mobile header abbreviations replaced with `t()` calls; new keys `excel.cols.volumeShort/distanceShort/revenueShort/carRentShort/totalAmountShort` and `carTable.litersShort` added to `en.json` + `ar.json`; `VAT` reuses `excel.cols.vat`, `Days` reuses `cars.workingDaysShort` |
| shard-026-F09 | applied | `border-l-2` → `border-s-2` at all eight drill-down inset sites in `trips-statistics-companies.tsx` |
| shard-026-F10 | applied | route `<tr>` given `role="button"`, `tabIndex={0}`, `aria-expanded`, an Enter/Space `onKeyDown` running the same toggle, and `focus-visible:ring-2 focus-visible:ring-ring ring-inset`; existing `onClick`/`intentProps` untouched |
| shard-026-F11 | applied | `aria-pressed={view === value}` added to the per-vehicle/per-day `toggleButton` |
| shard-026-F12 | applied | `font-bold` → `font-semibold` at all six footer sites (3 in `trips-statistics-companies.tsx`, 3 in `trips-statistics-car-table.tsx`) |
| shard-026-F13 | applied | `font-mono` added alongside `tabular-nums` on the group-table cells, footer totals, route rows, day rows and car rows in `trips-statistics-companies.tsx`; label/`group_name` cells left sans |
| shard-026-F14 | applied | `font-mono` added to the car-table cell spans (plate carries `dir="auto"` per the note) and the bare footer values wrapped in `<span className="font-mono tabular-nums">` |
| shard-026-F15 | applied | `hover:bg-muted/40` and `hover:bg-muted/30` → `hover:bg-muted/50` on the route, day and car row selectors |
| shard-026-F16 | applied | `hover:bg-muted/60` → `hover:bg-accent hover:text-accent-foreground` on the inactive tray toggle |
| shard-026-F17 | applied | nested `thead` `bg-muted/30`/`bg-muted/20` → `bg-muted/60`; expanded-row wells `bg-muted/10`/`bg-muted/30` → `bg-muted/40` (incl. the toggle tray) |
| shard-026-F18 | applied | `motion-reduce:animate-none` added to the three `animate-spin` icons (`trips-statistics-companies.tsx` day loader, `trips.tsx` export + Watanya spinners) |
| shard-026-F19 | applied | dead `h-4 w-4` / `h-3.5 w-3.5` dropped from icons that are direct children of a `Button` (`trip-new.tsx`, `trip-edit.tsx`, `trips.tsx` ×6); `rtl:rotate-180` kept; the two `TabsTrigger` icons left alone — `tabs.tsx` has no `[&_svg]:size-4`, so those sizes are real |
| shard-026-F20 | applied | the four `'—'` literals wrapped in `<span className="opacity-40">—</span>` (rent + VAT in both files) |
| shard-026-F21 | applied | `aria-hidden="true"` added to the drill-down chevrons, section icons and toggle glyphs; the mobile vehicles column header gained an `sr-only` `companies.vehiclesCol` label beside the `aria-hidden` car glyph |
| shard-026-F22 | applied | `text-xs` → `text-[10px]` on the two `RankedList` headings; `text-xs sm:text-sm` → `text-[10px]` on the companies heading; `text-[9px] sm:text-[10px]` → `text-[10px]` on the two nested theads |
| shard-026-F23 | skipped | low confidence |
| shard-026-F24 | skipped | low confidence |
Gates: tsc ok, lint-diff ok (baseline 776, now 775, 0 new)
APPLIED: 22 SKIPPED: 2
