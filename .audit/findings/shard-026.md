# Findings — shard-026

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/pages/trips/trip-edit.tsx` | 51 | audited | `PageShell` frame is correct per §14b R-11/R-14. `EmptyState` for the invalid-id case is correct per R-1 (page-level). Only nit is the dead icon size class (F19). |
| `src/pages/trips/trip-new.tsx` | 27 | audited | Matches §12.7 "back-to-list `Button outline sm` with `ArrowLeft rtl:rotate-180`, label `hidden sm:inline`". Same dead icon-size nit (F19). |
| `src/pages/trips/trips.tsx` | 606 | audited | Tabs/segmented usage is correct per R-3 (switching views → `Tabs`). Toasts on mutations/exports correct per R-2. `?tab/q/md/rs/p/l` URL sync satisfies the Vercel "Navigation & State" bullets. No rule for the export-label dictionary passed to the server. |
| `src/widgets/trips-statistics/trips-statistics-car-table.tsx` | 216 | audited | Uses the generic `DataTable` (§12.4); the card header follows §12.4/D-T4 table-card shape. |
| `src/widgets/trips-statistics/trips-statistics-cars.tsx` | 153 | audited | Listed in PLAN.md as never-imported (candidate dead code) — audited anyway, no rule about dead code. `RankedList` is not in §12; no rule for its internals, only for the colours passed in. |
| `src/widgets/trips-statistics/trips-statistics-companies.tsx` | 1118 | audited | Named in §13 rows D-C1, D-C3, D-C4, D-C5, D-I1, D-I2, D-T3, D-T8, D-T9 and in §12.4 "Nested drill-down". The pie's `CHART_SERIES_COLORS` are explicitly allowed (§3 "third hues only in charts/maps"), so the chart palette is not flagged. |

## Findings

### shard-026-F01 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:476` — `<span className="block text-end tabular-nums text-success text-xs sm:text-sm font-medium">`
- **Rule:** design-system §3 "Money (amber) — `text-money` on figures"; `index.css` palette rule quoted in §0.2: "amber marks anything someone gets paid"; §13 row D-C1
- **Current:** the group table's revenue column paints money `text-success` (green).
- **Expected:** money figures are `text-money`; success is "passing status only" — §3 records the reason verbatim: "revenue is not a passing status, and reusing the success green for it is what made a figure look like a badge" (`dashboard.tsx:128` cited in §3).
- **Change:** `text-success` → `text-money`. `class-level`
- **Notes:** same file has three more money-as-green sites, listed separately (F02–F04) because a fixer may want to sweep them together.

### shard-026-F02 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:575` — `<span className="text-success text-xs sm:text-sm font-medium">`
- **Rule:** design-system §3 "Money (amber) — `text-money` on figures"; §13 row D-C1
- **Current:** the group table's revenue **footer total** is green.
- **Expected:** `text-money` (§3; dashboard `:1001` bar amounts and KPI money values).
- **Change:** `text-success` → `text-money`. `class-level`
- **Notes:** must move together with F01 or the column and its total disagree.

### shard-026-F03 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:762` — `<td className="px-3 py-2 text-end tabular-nums text-success font-medium">`
- **Rule:** design-system §3 "Money (amber) — `text-money` on figures"; §13 row D-C1
- **Current:** route sub-table revenue cell is green.
- **Expected:** `text-money`.
- **Change:** `text-success` → `text-money`. `class-level`

### shard-026-F04 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:190` — `<span className="tabular-nums text-success font-medium">`
- **Rule:** design-system §3 "Money (amber) — `text-money` on figures"; §13 row D-C1
- **Current:** the company card's headline amount (`total_amount || total_revenue`) is green.
- **Expected:** `text-money`.
- **Change:** `text-success` → `text-money`. `class-level`

### shard-026-F05 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-car-table.tsx:95` — `<span className="block text-end tabular-nums text-success">`
- **Rule:** design-system §3 "Money (amber) — `text-money` on figures"; §13 row D-C1
- **Current:** base-revenue column green.
- **Expected:** `text-money`.
- **Change:** `text-success` → `text-money`. `class-level`

### shard-026-F06 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-car-table.tsx:175` — `<span className="text-success">`
- **Rule:** design-system §3 "Money (amber) — `text-money` on figures"; §13 row D-C1
- **Current:** base-revenue footer total green.
- **Expected:** `text-money`.
- **Change:** `text-success` → `text-money`. `class-level`

### shard-026-F07 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-cars.tsx:124` — `barClassName={hasFinancialAccess ? 'bg-success' : 'bg-primary'}`
- **Rule:** design-system §3 "Money (amber) — … `bg-money` on bar fills"; §10 recipe `Bar  span…bg-muted > i.block.h-full.rounded.bg-money`; §13 row D-C1
- **Current:** the "by revenue" ranked bars are filled with the success green; the non-financial (distance) variant uses navy.
- **Expected:** money bars are `bg-money` (dashboard category bars, `:985-991`).
- **Change:** `'bg-success'` → `'bg-money'` in the ternary's financial branch. `class-level`
- **Notes:** the `bg-primary` branch is a non-money quantity, so it stays; §3 reserves navy for actionable, but a bar fill has no rule other than the money one — flagging only the money side.

### shard-026-F08 · blocker · high · RTL/i18n
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:432` — `<span className="sm:hidden">Vol (L)</span>`
- **Rule:** design-system §14 ruling C-I4 "all aria/sr-only strings through `t()`" and §9 "Copy, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)"; §13 row D-I2 lists exactly these strings
- **Current:** the mobile abbreviations of every table header are hard-coded English: `Vol (L)` (`:432`), `Dist (km)` (`:449`), `Rev` (`:472`, `:696`), `Rent` (`:489`), `VAT` (`:504`), `Total` (`:521`, `:702`, `:980`, `:1080`), `L` (`:962`, `:1064`), `Days` (`:1073`). They render on phones in Arabic as Latin text.
- **Expected:** every visible string through `t()` (dashboard `:950-960`, `t(key, { defaultValue: … })`).
- **Change:** replace each literal with `t('trips.statistics.excel.cols.<x>Short')`-style keys and add the keys to `en.json` + `ar.json`. Per §14 R-8 adding locale keys is explicitly allowed. `class-level` (plus locale keys)
- **Notes:** twelve sites in one file; they are the `sm:hidden`/`lg:hidden` twins of already-translated `hidden sm:inline` spans, so the key names can mirror the long ones.

### shard-026-F09 · blocker · high · RTL/i18n
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:666` — `<div className="border-l-2 border-primary/30 ms-4 my-2 me-2">`
- **Rule:** design-system §14 ruling C-I1 "logical utilities everywhere"; §9 "Rule C-I1: no physical `ml-/mr-/left-/right-` utilities"; §13 row D-I1
- **Current:** every drill-down inset rule is `border-l-2` (`:657`, `:666`, `:920`, `:929`, `:937`, `:944`, `:1034`, `:1046`) — a physical left border sitting next to logical `ms-4 me-2`. In Arabic the indent flips to the right but the rule stays on the left, so the bracket detaches from the nesting.
- **Expected:** logical `border-s-2` (`select.tsx:109`, `sheet.tsx:35-67` cited in §9 as the logical-property reference).
- **Change:** `border-l-2` → `border-s-2` at all eight sites. `class-level`
- **Notes:** §12.4 records this deviation ("Note `border-l-2` is physical") — it is a known, unresolved physical utility, and C-I1 is a §14 ruling, so it governs.

### shard-026-F10 · blocker · high · a11y
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:714` — `<tr onClick={() => setExpandedRoute((prev) => …)}`
- **Rule:** vercel-rules "Accessibility" bullet "Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)"; "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"
- **Current:** the route row is expanded by a click handler on a `<tr>` with no `tabIndex`, no key handler and no `aria-expanded`. Keyboard and screen-reader users cannot open the per-vehicle / per-day breakdown at all.
- **Expected:** the comparable trips row exposes the disclosure to the keyboard — `trips-mobile-list.tsx:133` is `div role=button tabIndex=0 aria-expanded` with Enter/Space (§12.4).
- **Change:** add `tabIndex={0}`, `role="button"`, `aria-expanded={isOpen}` and an `onKeyDown` that fires the same toggle on Enter/Space, plus `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-inset` (§10 `Focus`). `structural` (adds a handler and attributes; removes nothing)
- **Notes:** the row also carries `intentProps` — §5.2 C-B5 wants prefetch on focus too, which `intentProps` already provides once the row is focusable.

### shard-026-F11 · blocker · medium · a11y
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:823` — `<button type="button" onClick={() => setView(value)}`
- **Rule:** design-system §14 ruling C-B4 "`aria-pressed` for toggles (tiles, presets), `aria-expanded` for disclosure"; vercel-rules "Accessibility" bullet "Use semantic HTML … before ARIA"
- **Current:** the per-vehicle / per-day tray is two `<button>`s whose only selected signal is `bg-primary text-primary-foreground`; nothing tells assistive tech which view is active, and the buttons have no accessible grouping.
- **Expected:** toggles carry `aria-pressed` (dashboard fleet tile `:733`, scope presets `scope-date-picker.tsx:133` after C-B4 was applied).
- **Change:** add `aria-pressed={view === value}` to the `toggleButton` element. `class-level` (attribute only)
- **Notes:** §12.3's "Segmented tray" gives the tray `role=tablist`; that is provisional (§12.3) and a bigger change, so only the `aria-pressed` half is proposed here.

### shard-026-F12 · should · high · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:540` — `<span className="font-bold text-xs sm:text-sm">`
- **Rule:** design-system §2 "Weights used: 400, 500 (`font-medium`), 600 (`font-semibold`). **700 is never used** in the reference"; §13 row D-T8
- **Current:** `font-bold` (700) on the footer's "Totals" label and the grand-total cell (`:540`, `:559`, `:584`), and on both `font-bold` totals in `trips-statistics-car-table.tsx:154`, `:166`, `:180`.
- **Expected:** 600 max — `font-semibold`, which is what the same file's `total` column cell already uses (`:524`).
- **Change:** `font-bold` → `font-semibold` at all six sites (three here, three in `trips-statistics-car-table.tsx`). `class-level`
- **Notes:** Plex Mono is not loaded above 600 (§0.1), so a bold mono figure would synthesise anyway.

### shard-026-F13 · should · high · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:751` — `<td className="px-3 py-2 text-end tabular-nums">`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values, bar amounts, the fuel-row price"; §13 row D-T5
- **Current:** every numeric cell in this file is sans + `tabular-nums` only — group table (`:419`, `:436`, `:453`, `:476`, `:493`, `:507`, `:524`), footer (`:544`–`:591`), route rows (`:751`–`:768`), day rows (`:991`–`:1008`), car rows (`:1091`–`:1109`).
- **Expected:** `font-mono tabular-nums` on figures; the trips desktop table already does this for its own cells (`trips-desktop-table.tsx:259`, cited in §12.4 "figures `font-mono text-[12.5px] tabular-nums`").
- **Change:** add `font-mono` alongside the existing `tabular-nums` on the numeric cells and their footer totals. `class-level`
- **Notes:** large sweep, one class per site; the plate cells (`:1091`) are identifiers and take `font-mono` too (§2 "mono so plates align"). Leave the label/`group_name` text cells sans.

### shard-026-F14 · should · high · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-car-table.tsx:48` — `<span className="font-medium tabular-nums">`
- **Rule:** design-system §2 "Figures are mono + tabular … plates"; §13 row D-T5
- **Current:** the vehicle plate and every figure/currency cell in the car table are sans with `tabular-nums` (`:48`, `:61`, `:75`, `:95`, `:109`, `:123`, `:138`) — and the footer totals (`:155`–`:188`) have no numeric class at all, so they are proportional digits under a `tabular-nums` column.
- **Expected:** `font-mono tabular-nums` (dashboard plate `:744`; §12.4 table figures).
- **Change:** add `font-mono` to the cell spans, and wrap the bare footer `formatNumber`/`formatCurrency` values in `<span className="font-mono tabular-nums">`. `class-level`
- **Notes:** the plate here is Latin/mixed; §9 says Arabic text is never mono — if a plate can be Arabic, keep `dir="auto"` and drop mono for that case as the dashboard does at `:747`.

### shard-026-F15 · should · medium · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:734` — `'border-t border-border/50 cursor-pointer transition-colors hover:bg-muted/40'`
- **Rule:** design-system §14 ruling C-C4 "named roles — `hover:bg-muted/50` on content rows/cards"; §3 "Content-row hover · `hover:bg-muted/50`"; §13 row D-C3
- **Current:** content-row hover is `/40` on route rows (`:734`) and `/30` on day and car rows (`:989`, `:1089`); the level-3 toggle uses `hover:bg-muted/60` (`:830`).
- **Expected:** `hover:bg-muted/50` for content rows (dashboard `:425`, `:616`, `:940`).
- **Change:** `hover:bg-muted/40` and `hover:bg-muted/30` → `hover:bg-muted/50` on the three row selectors. `class-level`
- **Notes:** the toggle at `:830` is chrome, not a content row — C-C4 puts chrome on `hover:bg-accent`; that is F16.

### shard-026-F16 · should · medium · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:830` — `'text-muted-foreground hover:bg-muted/60'`
- **Rule:** design-system §14 ruling C-C4 "`hover:bg-accent` on chrome and menu items"; §3 "Hover / keyboard highlight · `hover:bg-accent hover:text-accent-foreground`"
- **Current:** the inactive per-vehicle/per-day toggle hovers to a neutral `bg-muted/60`.
- **Expected:** chrome controls hover to the pale-navy accent (`button.tsx:18`, `sidebar.tsx:231`).
- **Change:** `hover:bg-muted/60` → `hover:bg-accent hover:text-accent-foreground`. `class-level`

### shard-026-F17 · should · medium · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:674` — `<thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">`
- **Rule:** design-system §14 ruling C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"; §13 row D-C4
- **Current:** four different head-band tints in one file — `bg-muted/30` (`:674`) and `bg-muted/20` (`:950`, `:1052`) on the nested theads, with expanded wells at `bg-muted/10` (`:774`) and `bg-muted/30` (`:735`, `:841`).
- **Expected:** the ruled three-step scale: head bands `/60`, hover `/50`, wells `/40` (dashboard `:1001`, `:425`, `:494`).
- **Change:** nested `thead` `bg-muted/30` and `bg-muted/20` → `bg-muted/60`; the expanded-row wells `bg-muted/10` and `bg-muted/30` → `bg-muted/40`. `class-level`
- **Notes:** raising the nested theads to `/60` is what makes the three-level drill-down read as three bands of the same kind rather than a fade-out.

### shard-026-F18 · should · medium · motion
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:921` — `<Loader2 className="h-3 w-3 animate-spin" />`
- **Rule:** design-system §14 ruling C-M2 "`motion-reduce:animate-none`" (applied to the Skeleton primitive); §8 "Looping: `animate-pulse` … both with `motion-reduce:animate-none`"; vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"; §13 row D-ST4 ("no motion-reduce guard")
- **Current:** the per-day loader spins unconditionally; same in `trips.tsx:368` and `:383`.
- **Expected:** every looping animation in the reference carries `motion-reduce:animate-none`.
- **Change:** add `motion-reduce:animate-none` to the three `animate-spin` icons (`trips-statistics-companies.tsx:921`, `trips.tsx:368`, `trips.tsx:383`). `class-level`
- **Notes:** the spinner is the only motion the user cannot dismiss; the button stays disabled either way, so removing the spin loses nothing.

### shard-026-F19 · nit · high · buttons
- **Where:** `src/pages/trips/trip-new.tsx:19` — `<ArrowLeft className="h-4 w-4 rtl:rotate-180" />`
- **Rule:** design-system §5.1 "**Icons inside a Button are 16px, by rule.** `[&_svg]:size-4` … beats any per-icon size class … so icons inside a Button carry no size classes"; §15.4 (the dead overrides "were removed so code matches reality")
- **Current:** `h-4 w-4` is written on icons that are already forced to 16px by the Button base — dead classes, at `trip-new.tsx:19`, `trip-edit.tsx:43`, `trips.tsx:368`, `:370`, `:382`, `:385`, `:396`, `:540`. `trips.tsx:429`, `:437`, `:462`, `:497` go further and write `h-3.5 w-3.5`, which reads as 14px but renders 16px.
- **Expected:** no size class on an icon inside a `<Button>` / `TabsTrigger`-in-Button; keep `rtl:rotate-180`.
- **Change:** drop the `h-*/w-*` pair from the icons that are direct children of a `Button`, keeping any other classes. `class-level`
- **Notes:** `TabsTrigger` is not the Button primitive — verify before stripping `:429`/`:437`; if it has no `[&_svg]:size-4`, those two are real and §12.3 says trigger icons are 14px, so leave them.

### shard-026-F20 · nit · medium · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:496` — `: '—'}`
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`"; §7 "Zero revenue · `<span class="opacity-40">—</span>`"; §13 row D-C11
- **Current:** the em dash for a missing rent/VAT value renders at full `text-muted-foreground` (`:496`, `:508`; same in `trips-statistics-car-table.tsx:110`, `:124`).
- **Expected:** `<span className="opacity-40">—</span>` (dashboard `:765`).
- **Change:** wrap the `'—'` literals in `<span className="opacity-40">…</span>` at the four sites. `class-level`

### shard-026-F21 · nit · medium · a11y
- **Where:** `src/widgets/trips-statistics/trips-statistics-companies.tsx:398` — `<ChevronRight className={cn('h-3 w-3 text-muted-foreground shrink-0 transition-transform rtl:rotate-180', …)}`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9 "ARIA: … `aria-hidden` on dots/chevrons/severity bars/sentinel"
- **Current:** the drill-down chevrons (`:398`, `:740`), the section icons (`:668`, `:946`, `:1048`), the toggle glyphs (`:844`, `:849`) and the mobile column-header car glyph (`:972`) carry no `aria-hidden`; the last one is a bare icon standing in for a text header, so a screen reader announces an unlabelled column.
- **Expected:** decorative icons `aria-hidden` (dashboard `:756`, `sidebar.tsx:234`).
- **Change:** add `aria-hidden="true"` to the decorative icons; for `:972` also add an sr-only translated column name so the header is still announced. `class-level`
- **Notes:** the `:972` case is the one with a user-visible consequence; the rest are hygiene.

### shard-026-F22 · nit · medium · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-cars.tsx:111` — `<h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">`
- **Rule:** design-system §2 "**10** · `text-[10px]` · **600, `uppercase tracking-wider text-muted-foreground`** · **Eyebrow**"; §10 "Eyebrow  text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"; §13 row D-T3
- **Current:** the two ranked-list headings are 12px eyebrows (`:111`, `:117`); the companies heading is `text-xs sm:text-sm` (`trips-statistics-companies.tsx:86`) and the nested table eyebrows are 10px/9px (`:667`, `:945`, `:950`, `:1047`, `:1052`) — four eyebrow sizes across the shard.
- **Expected:** one eyebrow at `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`.
- **Change:** `text-xs` → `text-[10px]` on `trips-statistics-cars.tsx:111`, `:117`; `text-xs sm:text-sm` → `text-[10px]` on `trips-statistics-companies.tsx:86`; `text-[9px] sm:text-[10px]` → `text-[10px]` on `:950`, `:1052`. `class-level`
- **Notes:** R-5 raised *form section* headings to `text-sm` — these are not form headings, so §2's eyebrow governs. §14b R-11/R-14 changed only the page frame, not the eyebrow.

### shard-026-F23 · nit · low · buttons
- **Where:** `src/pages/trips/trips.tsx:458` — `className="h-9 shrink-0 gap-1.5 sm:hidden"`
- **Rule:** design-system §14 ruling C-B3 "chrome rows `h-8`"; §5.1 "chrome rows are `h-8` — scope trigger, company select, mobile filters, hamburger…"; §13 row D-B1
- **Current:** the phone Filters button and the Clear button override `size="sm"` (32px) up to `h-9` (36px) (`:458`, `:495`), while the `SearchInput` beside them is the 36px `Input`.
- **Expected:** C-B3 names "mobile filters" explicitly as an `h-8` chrome control.
- **Change:** `h-9` → `h-8` on both buttons. `class-level`
- **Notes:** this row also holds `SearchInput` (36px, `h-9` per §12.2), so the row will end up mixing 32px buttons with a 36px field — the same mix the dashboard header has (`h-8` controls beside a 36px search). Flagged as a nit for that reason; if the owner prefers the row to align, the ruling to change is C-B3, not this call site.

### shard-026-F24 · nit · low · buttons
- **Where:** `src/pages/trips/trips.tsx:465` — `<span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">`
- **Rule:** design-system §14 ruling C-T3 "neutral chips are `px-2 py-0.5 text-[10.5px] font-medium`"; §5.3 "Method chip · `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`"; §13 row D-B9
- **Current:** the refinement count is a solid navy pill at `px-1.5 text-[10px] font-semibold` with no vertical padding.
- **Expected:** the count is a neutral chip; §3 reserves a solid `bg-primary` fill for actionable elements (the Button `default` variant), and this span is not itself actionable.
- **Change:** `rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground` → `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-foreground`. `class-level`
- **Notes:** the chip sits inside an outline Button; §5.3 promotes the number inside a muted chip with `text-foreground`, which is why the value is not left muted.

## Summary
FINDINGS: 24 (blocker 11 / should 7 / nit 6)
