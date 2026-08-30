# Findings — shard-015

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/pages/oil-changes/oil-change-edit.tsx` | 120 | audited | PageShell frame is §13 D-S1/D-T1 (provisional gap, dashboard wins) — not re-flagged per file; form itself is out-of-shard |
| `src/pages/oil-changes/oil-change-history.tsx` | 409 | audited | StatCard/DataTable/ConfirmDialog primitives are out-of-shard; only call-site classes flagged |
| `src/pages/oil-changes/oil-change-new.tsx` | 67 | audited | no findings; PageShell frame as above |
| `src/pages/oil-changes/oil-changes.tsx` | 319 | audited | URL-synced filters (`q`, `status`) OK per vercel "Navigation & State" |
| `src/widgets/oil-changes-table/oil-change-status-badge.tsx` | 56 | audited | icon inside Badge at 12px — no rule (Badge primitive has no icon slot) |
| `src/widgets/oil-changes-table/oil-changes-excel.ts` | 205 | audited | Excel colour palette is `shared/lib/excel.ts` (out-of-shard); status→green/amber/red in a spreadsheet: no rule (palette rule is screen-scoped) |
| `src/widgets/oil-changes-table/oil-changes-filters.tsx` | 128 | audited | segmented tray matches provisional §12.3 recipe |
| `src/widgets/oil-changes-table/oil-changes-table.tsx` | 255 | audited | — |
| `src/pages/placeholder/placeholder.tsx` | 46 | audited | — |
| `src/entities/raw-message/api.ts` | 32 | no UI content | — |
| `src/entities/raw-message/queries.ts` | 49 | no UI content | — |
| `src/entities/raw-message/schemas.ts` | 61 | audited | contains `STATUS_TONE` Tailwind class map (F17) |
| `src/entities/receipt/api.ts` | 32 | no UI content | — |
| `src/entities/receipt/queries.ts` | 80 | no UI content | — |
| `src/entities/receipt/schemas.ts` | 49 | no UI content | — |
| `src/entities/receipt-batch/api.ts` | 32 | no UI content | — |
| `src/entities/receipt-batch/queries.ts` | 59 | no UI content | never imported (PLAN "Observed") |
| `src/entities/receipt-batch/schemas.ts` | 27 | no UI content | — |
| `src/widgets/scope-bar/scope-bar.tsx` | 119 | reference — not audited | — |
| `src/widgets/scope-bar/scope-date-picker.tsx` | 188 | reference — not audited | — |
| `src/widgets/service-cars-table/service-cars-table.tsx` | 86 | audited | — |

## Findings

### shard-015-F01 · blocker · high · colour
- **Where:** `src/widgets/oil-changes-table/oil-changes-table.tsx:119` — `<span className="font-semibold tabular-nums">{formatCurrency(row.original.cost)}`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"; §3 "Money (amber) `text-money` on figures"
- **Current:** sans, `font-semibold tabular-nums`, foreground colour
- **Expected:** `font-mono tabular-nums text-money` (`dashboard.tsx:641` fuel-row price)
- **Change:** `font-semibold tabular-nums` → `font-mono text-sm font-semibold tabular-nums text-money` — `class-level`
- **Notes:** same cell recipe in F02/F03/F04.

### shard-015-F02 · blocker · high · colour
- **Where:** `src/widgets/oil-changes-table/oil-changes-table.tsx:244` — `<span className="font-semibold tabular-nums">{formatCurrency(totalCost)}`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"
- **Current:** footer cost sum in sans foreground
- **Expected:** `font-mono tabular-nums text-money` (`dashboard.tsx:641`)
- **Change:** → `font-mono font-semibold tabular-nums text-money` — `class-level`

### shard-015-F03 · blocker · high · colour
- **Where:** `src/pages/oil-changes/oil-change-history.tsx:156` — `<span className="font-semibold tabular-nums">{formatCurrency(row.original.cost)}`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"
- **Current:** sans foreground
- **Expected:** `font-mono tabular-nums text-money` (`dashboard.tsx:641`)
- **Change:** → `font-mono text-sm font-semibold tabular-nums text-money` — `class-level`

### shard-015-F04 · should · medium · colour
- **Where:** `src/pages/oil-changes/oil-change-history.tsx:346-354` — `<StatCard label={t('oilChanges.history.stats.totalSpent')} … tone="primary"`
- **Rule:** design-system §3 "Money (amber) `text-money` on figures … KPI money values"; §2 "KPI value (+ `text-money` when money)"
- **Current:** money KPI (total spent, avg cost) rendered in the default foreground; tone only tints the icon well navy
- **Expected:** KPI money value carries `text-money` (`dashboard.tsx:385`, `:436`)
- **Change:** add `className="[&_p.truncate.font-semibold]:text-money"` is fragile; preferred: pass a value-colour class if `StatCard` exposes one — it does not → `structural`, `out-of-shard: src/shared/ui/stat-card.tsx` (add a `valueClassName`/`tone="money"`). Same for the avg-cost card at `:355-362` and `oil-changes.tsx:243-251` (`totalCost`).
- **Notes:** StatCard is a trips primitive (§12.5); §13 D-C1 records the same money-colour gap there.

### shard-015-F05 · blocker · high · a11y
- **Where:** `src/pages/placeholder/placeholder.tsx:28-29` — `'Speed violations tracking and telemetry radar are currently being compiled.'`
- **Rule:** design-system §9 "Copy, aria-labels and sr-only text all go through `t()`" (C-I4); §13 row D-I2
- **Current:** two hard-coded English description strings
- **Expected:** `t('…')` with keys in en/ar (`dashboard.tsx:950-960` pattern)
- **Change:** `description={isSpeedViolations ? t('placeholder.speedViolations') : t('placeholder.comingSoon')}` and add both keys to `src/shared/i18n/en.json` + `ar.json` — `class-level` (locale files are allowed per runner); `descriptionKey` prop already exists and is unused — using it needs no prop deletion.

### shard-015-F06 · should · high · type
- **Where:** `src/widgets/service-cars-table/service-cars-table.tsx:39` — `<div className="font-black tracking-tight text-lg">`
- **Rule:** design-system §2 "700 is never used in the reference"; "Figures are mono + tabular … plates"; §13 D-T8
- **Current:** plate at `font-black` (900), sans, 18px
- **Expected:** plate as `font-mono text-[15px] font-semibold tabular-nums` (drawer plate, `dashboard.tsx:843`) or the trips table cell `font-mono text-[13px] font-medium tabular-nums` (provisional §12.4)
- **Change:** `font-black tracking-tight text-lg` → `font-mono text-[15px] font-semibold tabular-nums` — `class-level`
- **Notes:** Arabic plates should be sans with `dir="rtl"` (§2); if plates here are Arabic add `dir="auto"` and drop `font-mono`.

### shard-015-F07 · should · high · motion
- **Where:** `src/widgets/service-cars-table/service-cars-table.tsx:65` — `className="gap-2 hover:bg-primary/5 hover:text-primary transition-all group"`
- **Rule:** vercel-rules "Animation" bullet "Never `transition: all`—list properties explicitly"; design-system §8 "Hover: colour only, `transition-colors` … Nothing scales, lifts"; §3 hover for ghost Button = `hover:bg-accent hover:text-accent-foreground`
- **Current:** `transition-all`, bespoke `hover:bg-primary/5` and a `group-hover:translate-x-1` chevron slide (`:69`)
- **Expected:** Button's own `transition-colors hover:bg-accent hover:text-accent-foreground` (`button.tsx:7,18`); no translate on hover
- **Change:** remove `hover:bg-primary/5 hover:text-primary transition-all group` and `group-hover:translate-x-1 transition-transform` → keep `gap-2`; chevron gets `rtl:rotate-180` (see F08) — `class-level`

### shard-015-F08 · should · high · RTL
- **Where:** `src/widgets/service-cars-table/service-cars-table.tsx:61,69` — `<div className="text-right">` / `<ChevronRight className="h-4 w-4 …">`
- **Rule:** design-system §9 C-I1 "no physical `ml-/mr-/left-/right-` utilities"; "Directional chevrons get `rtl:rotate-180`"
- **Current:** physical `text-right`; forward chevron does not mirror
- **Expected:** `text-end`; `rtl:rotate-180` (`dropdown-menu.tsx:28`)
- **Change:** `text-right` → `text-end`; add `rtl:rotate-180` to the chevron — `class-level`

### shard-015-F09 · should · medium · type
- **Where:** `src/widgets/service-cars-table/service-cars-table.tsx:68` — `<span className="font-semibold text-xs uppercase tracking-wider">{t('common.view')}`
- **Rule:** design-system §2 "`uppercase` appears only in the 10px eyebrow"; §5.1 Button text is `text-sm font-medium` (`sm`: `text-xs`)
- **Current:** button label styled as an eyebrow
- **Expected:** plain `sm` Button label (`button.tsx:24`)
- **Change:** drop `font-semibold uppercase tracking-wider` from the span — `class-level`

### shard-015-F10 · nit · high · content
- **Where:** `src/widgets/service-cars-table/service-cars-table.tsx:48` — `{row.getValue('car_type') || '-'}`
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`"
- **Current:** hyphen
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`)
- **Change:** `'-'` → `<span className="opacity-40">—</span>` — `class-level`
- **Notes:** the `'—'` fallbacks at `oil-changes-table.tsx:85,92,135` and `oil-change-history.tsx:105,112,172` already use the em dash but lack `opacity-40` (§13 D-C11) — same fix, `nit`.

### shard-015-F11 · should · medium · colour
- **Where:** `src/widgets/service-cars-table/service-cars-table.tsx:36` — `<div className="h-8 w-8 rounded-lg bg-primary/10 flex …">`
- **Rule:** design-system §4 "10px `rounded-md` … palette quick-action tile"; §12.5 provisional StatCard icon tile `h-8 w-8 rounded-md`
- **Current:** `rounded-lg` (12px) icon well beside a plain text plate; navy tint on a non-actionable cell
- **Expected:** `rounded-md bg-muted text-muted-foreground` neutral well (§3 "Neutral chip"; navy = actionable)
- **Change:** `rounded-lg bg-primary/10` → `rounded-md bg-muted`, icon `text-primary` → `text-muted-foreground` — `class-level`

### shard-015-F12 · should · high · spacing
- **Where:** `src/pages/oil-changes/oil-changes.tsx:218` — `className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5"`
- **Rule:** design-system §1 "KPI row: `grid grid-cols-2 gap-3` + `lg:grid-cols-4`"; §13 D-S5
- **Current:** `gap-2.5`, 5 columns
- **Expected:** `gap-3` (`dashboard.tsx:359`); column count is a page decision (5 cards → no rule)
- **Change:** `gap-2.5` → `gap-3` — `class-level`. Same at `oil-change-history.tsx:316,339`.

### shard-015-F13 · should · high · loading
- **Where:** `src/pages/oil-changes/oil-change-history.tsx:318,321` — `<Skeleton key={i} className="h-20 w-full" />` / `<Skeleton className="h-96 w-full" />`
- **Rule:** design-system §14 C-R2 "cards `rounded-lg`"; §7 "Apex pending … `Skeleton h-[92px] rounded-lg`"
- **Current:** default `rounded-md` radius on card-shaped skeletons
- **Expected:** `rounded-lg` (`dashboard.tsx:126`, `app/router/index.tsx` fallback `h-96 rounded-lg`)
- **Change:** add `rounded-lg` to all three — `class-level`. Same for `oil-change-edit.tsx:103-105` (`h-40`/`h-56` card stand-ins).

### shard-015-F14 · should · high · spacing
- **Where:** `src/pages/oil-change-edit.tsx:102` — `<div className="space-y-4">`
- **Rule:** design-system §1 "12px … gap between every top-level block"; §13 D-S4
- **Current:** 16px between skeleton blocks
- **Expected:** `gap-3`/`space-y-3` (`dashboard.tsx:99`)
- **Change:** `space-y-4` → `space-y-3` — `class-level`

### shard-015-F15 · should · high · type
- **Where:** `src/widgets/oil-changes-table/oil-changes-table.tsx:225` — `<span className="text-xs uppercase tracking-wider text-muted-foreground">`
- **Rule:** design-system §2 eyebrow "`text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §13 D-T3
- **Current:** 12px, regular weight
- **Expected:** `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (`dashboard.tsx:382`)
- **Change:** `text-xs uppercase` → `text-[10px] font-semibold uppercase` — `class-level`

### shard-015-F16 · should · high · type
- **Where:** `src/widgets/oil-changes-table/oil-changes-table.tsx:239-241` — `<span className="font-semibold text-foreground">{formatNumber(avgKmRemaining, 0)} km`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`)"
- **Current:** sans figure in the footer
- **Expected:** `font-mono tabular-nums` (`dashboard.tsx:509` dd)
- **Change:** → `font-mono font-semibold tabular-nums text-foreground` — `class-level`

### shard-015-F17 · blocker · high · colour
- **Where:** `src/entities/raw-message/schemas.ts:59-60` — `suppressed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', matched: 'bg-emerald-500/10 text-emerald-600 …'`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't"; §3 status tint recipe `border-X/40 bg-X/10 text-X`
- **Current:** raw Tailwind amber/emerald hues
- **Expected:** tokens — warning `bg-warning/10 text-warning`, success `bg-success/10 text-success` (`badge.tsx:5-20`)
- **Change:** `'bg-amber-500/10 text-amber-600 dark:text-amber-400'` → `'bg-warning/10 text-warning'`; `'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'` → `'bg-success/10 text-success'` — `class-level`
- **Notes:** consumed by `widgets/fleet-expenses-*` (out-of-shard, no change needed there).

### shard-015-F18 · should · high · type
- **Where:** `src/pages/oil-change-edit.tsx:73` — `className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"`
- **Rule:** design-system §5.3 chip "`rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`" (C-T3)
- **Current:** `px-2.5 text-xs`
- **Expected:** `px-2 text-[10.5px]` (`dashboard.tsx:583`); the ID figure `font-mono tabular-nums text-foreground`
- **Change:** → `rounded-full bg-muted px-2 py-0.5 font-mono text-[10.5px] font-medium tabular-nums text-muted-foreground` — `class-level`. Same chip at `oil-change-history.tsx:268` (`px-2.5 py-0.5 text-sm` → `px-2 py-0.5 text-[10.5px]`).

### shard-015-F19 · should · medium · buttons
- **Where:** `src/widgets/oil-changes-table/oil-changes-table.tsx:155,170,189` — `size="icon" className="h-8 w-8"`
- **Rule:** provisional (§12.4) row actions "ghost icon `h-7 w-7` with `aria-label`+`title`, 14px icons"; design-system §5.1 "popover-internal and in-strip buttons are `h-7`"
- **Current:** `h-8 w-8` in-row icon buttons
- **Expected:** `h-7 w-7` (`trips-desktop-table.tsx:527-594`)
- **Change:** `h-8 w-8` → `h-7 w-7` — `class-level`. Same at `oil-change-history.tsx:190,205`.
- **Notes:** the `h-4 w-4` on the icons is dead (§5.1 icons inside a Button are 16px) — harmless.

### shard-015-F20 · should · high · a11y
- **Where:** `src/widgets/oil-changes-table/oil-changes-table.tsx:143-147` — `<div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>`
- **Rule:** vercel-rules "Anti-patterns" bullet "`<div>` or `<span>` with click handlers (should be `<button>`)"
- **Current:** div with an onClick used only to stop bubbling (no keyboard equivalent needed, but the handler flags the anti-pattern)
- **Expected:** stop propagation on each Button's own `onClick` instead
- **Change:** `structural` — add `e.stopPropagation()` inside each Button `onClick`; the wrapper's handler may stay (do not delete handlers). Same at `oil-change-history.tsx:180-183`.

### shard-015-F21 · should · high · empty state
- **Where:** `src/pages/oil-changes/oil-changes.tsx:280` — `<div className="flex flex-col items-center gap-2 py-8 text-sm">`
- **Rule:** design-system §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground`"
- **Current:** `py-8 text-sm`
- **Expected:** `py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:171`)
- **Change:** → `flex flex-col items-center gap-2 py-6 text-center text-xs` — `class-level`

### shard-015-F22 · nit · medium · a11y
- **Where:** `src/widgets/oil-changes-table/oil-changes-filters.tsx:37-42` — `<Input value={search} … placeholder={…} className="ps-9" />`
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`", "Form controls need `<label>` or `aria-label`"
- **Current:** no `name`, `aria-label` or `autoComplete`
- **Expected:** `aria-label={t('oilChanges.searchPlaceholder')} name="q" autoComplete="off" type="search"`
- **Change:** add those attributes — `class-level`

### shard-015-F23 · nit · high · a11y
- **Where:** `src/widgets/oil-changes-table/oil-changes-filters.tsx:36,53,60,68,76` and `oil-changes-table.tsx:66,76,131`, `oil-change-history.tsx:85,96,168,269` — decorative lucide icons
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9 "`aria-hidden` on dots/chevrons"
- **Current:** no `aria-hidden`
- **Expected:** `aria-hidden="true"` (`dashboard.tsx:756`)
- **Change:** add `aria-hidden="true"` to each icon — `class-level`

### shard-015-F24 · nit · medium · type
- **Where:** `src/widgets/oil-changes-table/oil-changes-filters.tsx:120` — `'rounded-full px-1 text-[10px] font-semibold tabular-nums'`
- **Rule:** design-system §5.3 chip "`text-[10.5px] font-medium`"; §13 D-B9
- **Current:** count chip `text-[10px] font-semibold`
- **Expected:** `text-[10.5px] font-medium font-mono tabular-nums` (`dashboard.tsx:583`)
- **Change:** → `rounded-full px-1 font-mono text-[10.5px] font-medium tabular-nums` — `class-level`

### shard-015-F25 · nit · medium · type
- **Where:** `src/widgets/oil-changes-table/oil-changes-table.tsx:77` / `oil-change-history.tsx:97,399` — `format(row.original.date, 'dd MMM yyyy')`
- **Rule:** design-system §14 C-I2 "day-first `d MMM yyyy` everywhere"
- **Current:** zero-padded `dd`
- **Expected:** `d MMM yyyy` (`dashboard.tsx:869`)
- **Change:** `'dd MMM yyyy'` → `'d MMM yyyy'` — `class-level`

### shard-015-F26 · nit · low · type
- **Where:** `src/widgets/oil-changes-table/oil-changes-table.tsx:75` — `<div className="flex items-center gap-2 text-sm text-muted-foreground">` (date cell)
- **Rule:** provisional (§12.4) "date `font-mono text-[12.5px] tabular-nums`"; design-system §6 "identifiers (date, plate) are `shrink-0`"
- **Current:** sans `text-sm`
- **Expected:** `font-mono text-[12.5px] tabular-nums`
- **Change:** add `font-mono tabular-nums` (keep `text-sm` if the table is on the DataTable 14px scale) — `class-level`

## Summary
FINDINGS: 26 (blocker 5 / should 15 / nit 6)
