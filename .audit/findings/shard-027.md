# Findings — shard-027

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/trips-statistics/trips-statistics-excel.ts` | 600 | no UI content | Pure export/data module — no JSX, no class strings. Every user-facing label goes through `t()`. The Excel brand/series colours it consumes (`EXCEL_PALETTE.brand/violet/green`) are defined in `shared/lib/excel.ts` (out-of-shard) — §12.6 already records that palette; nothing to flag here. |
| `src/widgets/trips-statistics/trips-statistics-routes.tsx` | 304 | audited | — |
| `src/widgets/trips-statistics/trips-statistics-summary.tsx` | 252 | audited | The stat-detail Popover (`w-64 p-3`, eyebrow `text-xs font-medium`, `dl space-y-2 text-sm`) is exactly the recipe §12.5 records, and C-B6 rules that call sites may size a popover to content — not flagged. |
| `src/widgets/trips-statistics/trips-statistics-timeline.tsx` | 451 | audited | Chart series hex palette is `chart-theme.ts` (out-of-shard) and §3 permits third hues in charts — not flagged. |
| `src/widgets/trips-statistics/trips-statistics.tsx` | 229 | audited | Sub-tab state is `React.useState` and never reaches the URL (vercel-rules "Navigation & State" — "URL reflects state—filters, tabs, pagination…"). Recorded, not filed as a finding: `deferred-rulings.md` R-10 puts URL-state sync out of scope for this audit. |

## Findings

### shard-027-F01 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-summary.tsx:207` — `icon={DollarSign}` / `tone="success"` (also `:228` on the total-with-VAT card)
- **Rule:** design-system §3 "Money (amber) … `text-money` on figures"; §0.2 palette rule "Navy marks anything you can act on; amber marks anything someone gets paid"; §13 row D-C1
- **Current:** the two monetary StatCards (`totalRevenue`, `totalWithVat`) pass `tone="success"`, so the icon well renders `bg-success/10 text-success` — revenue reads as a passing status.
- **Expected:** money is amber. The dashboard's rule is stated in the reference: `--success` is "passing status — explicitly not for revenue" (`src/app/index.css` token table; `dashboard.tsx:436` uses `text-money` for the money KPI).
- **Change:** `class-level` — `tone="success"` → `tone="default"` on both cards, and give the money value the amber face via the existing prop: add `valueClassName="text-money"` (StatCard already accepts `valueClassName`). Do **not** add a new tone.
- **Notes:** `StatCard`'s `toneClasses` has no money entry; `tone="default"` is the neutral `bg-muted text-muted-foreground` well, which is what §3 prescribes for a non-status chip. Adding a `money` tone would be an out-of-shard edit (`out-of-shard: src/shared/ui/stat-card.tsx`) — the `valueClassName` route keeps the fix inside this shard.

### shard-027-F02 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-routes.tsx:182` — `<span className="block text-end tabular-nums text-success">`
- **Rule:** design-system §2 rule C-T1 "every money figure is `font-mono tabular-nums text-money`"; §3 "Money (amber)"; §13 row D-C1
- **Current:** the revenue column cell is green (`text-success`) and sans.
- **Expected:** `font-mono tabular-nums text-money` (`dashboard.tsx:436`, `:641` for the fuel-row price after C-T1 was applied).
- **Change:** `class-level` — `block text-end tabular-nums text-success` → `block text-end font-mono tabular-nums text-money`.
- **Notes:** the same cell's footer total is F03; fix both or the column and its total disagree.

### shard-027-F03 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-routes.tsx:265` — `<span className="text-success">`
- **Rule:** design-system §2 C-T1; §3 "Money (amber)"; §13 row D-C1
- **Current:** the revenue footer total is green.
- **Expected:** amber, mono, tabular — same face as the column above it.
- **Change:** `class-level` — `className="text-success"` → `className="font-mono tabular-nums text-money"`.

### shard-027-F04 · blocker · high · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-timeline.tsx:403` — `<p className="text-xl font-bold tracking-tight text-success">`
- **Rule:** design-system §3 "Money (amber)"; §2 "**700 is never used** in the reference"; §13 rows D-C1, D-T8
- **Current:** the projected-revenue headline is green and 700-weight sans.
- **Expected:** amber money figure at the reference's weight ceiling of 600, mono + tabular (§2 "Figures are mono + tabular").
- **Change:** `class-level` — `text-xl font-bold tracking-tight text-success` → `font-mono text-xl font-semibold tracking-tight tabular-nums text-money`.
- **Notes:** this figure sits directly above the min/max/avg group (F05); keep their faces consistent.

### shard-027-F05 · should · high · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-timeline.tsx:422` — `<p className="text-sm font-bold tabular-nums">` (repeated at `:430`, `:438`)
- **Rule:** design-system §2 "Weights used: 400, 500 (`font-medium`), 600 (`font-semibold`). **700 is never used**"; §2 "Figures are mono + tabular"; §13 row D-T8
- **Current:** the three chart-footer figures are `font-bold` (700) and sans.
- **Expected:** `font-mono text-sm font-semibold tabular-nums`.
- **Change:** `class-level` — on all three: `text-sm font-bold tabular-nums` → `font-mono text-sm font-semibold tabular-nums`.
- **Notes:** these render money when `metric === 'revenue'` and counts/litres/km otherwise, so leave the colour neutral — only the amber *revenue projection* (F04) is a fixed money slot.

### shard-027-F06 · should · high · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-timeline.tsx:342` — `<span className="tabular">{formatValue(total)}</span>` (also `:360` `className="font-semibold tabular"`)
- **Rule:** vercel-rules "Typography" bullet "`font-variant-numeric: tabular-nums` for number columns/comparisons"; design-system §13 "Trips-internal inconsistencies" — "timeline tooltip uses className `tabular` (not a Tailwind class; `tabular-nums` intended) at `trips-statistics-timeline.tsx:342,360`"
- **Current:** `tabular` is not a Tailwind utility and compiles to nothing, so the tooltip's stacked figures are proportional and jitter as the pointer moves along the chart.
- **Expected:** `tabular-nums` (the class the design system says was intended; §2 "Tabular figures").
- **Change:** `class-level` — `:342` `className="tabular"` → `className="font-mono tabular-nums"`; `:360` `className="font-semibold tabular"` → `className="font-mono font-semibold tabular-nums"`.
- **Notes:** §13 records this exact line as a known defect; adding `font-mono` also brings the tooltip in line with §2's figure rule.

### shard-027-F07 · should · high · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-routes.tsx:236` — `<span className="font-bold">{t('trips.statistics.carTable.totals')}</span>` (also `:252`, and `:270` on the grand total)
- **Rule:** design-system §2 "**700 is never used** in the reference"; §13 row D-T8
- **Current:** three footer cells use `font-bold` (700).
- **Expected:** `font-semibold` (600) — the reference's heaviest weight, used for KPI figures and panel heads.
- **Change:** `class-level` — `font-bold` → `font-semibold` at `:236`, `:252`, `:270`. At `:270` the cell is also a money total, so make it `font-mono font-semibold tabular-nums text-money` (§2 C-T1).

### shard-027-F08 · should · high · i18n
- **Where:** `src/widgets/trips-statistics/trips-statistics-timeline.tsx:181` — `arr.push({ key: OTHER_KEY, label: 'Other', color: CHART_OTHER_COLOR });`
- **Rule:** design-system §9 "**Copy**, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)"; §13 row D-I2 lists `'Other'` in `trips-statistics-*` among the untranslated strings
- **Current:** the "Other" bucket label is hard-coded English and shows verbatim in the legend and in every tooltip row in Arabic.
- **Expected:** `t('trips.statistics.timeline.other')` with a `defaultValue`, as the dashboard does for every visible string.
- **Change:** `class-level` — `label: 'Other'` → `label: t('trips.statistics.timeline.other', { defaultValue: 'Other' })`, and add the key to `src/shared/i18n/locales/en.json` and `ar.json`. `t` is already in scope (`:71`); add it to the `useMemo` dependency array alongside `[series, hasOther]`.
- **Notes:** adding a key to en+ar is explicitly allowed (`deferred-rulings.md` R-8). The locale files are outside the shard file list but the runner permits both of them.

### shard-027-F09 · should · high · buttons
- **Where:** `src/widgets/trips-statistics/trips-statistics.tsx:166` — `className="gap-1.5"` with `<Download className="h-3.5 w-3.5" />` on `:168`
- **Rule:** design-system §5.1 "**Icons inside a Button are 16px, by rule.** `[&_svg]:size-4` … beats any per-icon size class … so icons inside a Button carry no size classes"; §15.4 (the dead `h-3 w-3`/`h-5 w-5` overrides "were removed so code matches reality"); §13 row D-B8, whose evidence is `trips-statistics.tsx:166-168`
- **Current:** the export button overrides the Button gap to 6px and sizes its icon to 14px — a class the Button's own `[&_svg]:size-4` out-ranks, so the icon renders at 16px anyway and the class is dead code.
- **Expected:** Button default `gap-2` and no per-icon size class (`button.tsx:7`; `dashboard.tsx:1043`, `header.tsx:23`).
- **Change:** `class-level` — drop `className="gap-1.5"` from the `<Button>` and `className="h-3.5 w-3.5"` from `<Download>`.
- **Notes:** removing the className prop entirely is fine here — it carries no other value; this is a class-level, not structural, change.

### shard-027-F10 · should · high · motion
- **Where:** `src/widgets/trips-statistics/trips-statistics.tsx:157` — `<Loader2 className="h-3 w-3 animate-spin" />`
- **Rule:** design-system §8 C-M2 ruling "`motion-reduce:animate-none`" (applied to the Skeleton primitive; the badge dot already carried it); vercel-rules "Animation" bullet "Honor `prefers-reduced-motion` (provide reduced variant or disable)"; §13 row D-ST4 "no motion-reduce guard"
- **Current:** the background-refetch spinner loops with no reduced-motion opt-out. Every looping animation in the reference carries `motion-reduce:animate-none`.
- **Expected:** `animate-spin motion-reduce:animate-none` (`skeleton.tsx`, `dashboard.tsx:227`).
- **Change:** `class-level` — `h-3 w-3 animate-spin` → `h-3 w-3 animate-spin motion-reduce:animate-none`.

### shard-027-F11 · should · medium · a11y
- **Where:** `src/widgets/trips-statistics/trips-statistics.tsx:154` — `<div className="flex items-center gap-2 text-xs text-muted-foreground">`
- **Rule:** vercel-rules "Accessibility" bullet "Async updates (toasts, validation) need `aria-live="polite"`"
- **Current:** the "refreshing…" status appears and disappears asynchronously with no live region, so screen-reader users get no notice that the figures below are being replaced.
- **Expected:** the container that holds the transient status is a polite live region.
- **Change:** `class-level` — add `aria-live="polite"` (and `aria-atomic="true"`) to the wrapper `<div>` at `:154`. The wrapper already exists and is empty when not fetching, which is the correct shape for a live region.

### shard-027-F12 · should · medium · loading
- **Where:** `src/widgets/trips-statistics/trips-statistics.tsx:87` — `<Skeleton key={i} className="h-[88px] w-full" />` (also `:90`, `:91`)
- **Rule:** design-system §4 C-R2 ruling "a skeleton takes the radius of the box it stands in: cards `rounded-lg`, text bars `rounded-sm`, flush list rows `rounded-none`"; §13 row D-ST5
- **Current:** all three skeletons fall back to the Skeleton default `rounded-md` (10px) while standing in for `Card`/`ChartCard` surfaces, which are `rounded-lg` (12px).
- **Expected:** `rounded-lg` on card-shaped skeletons (`dashboard.tsx:126` KPI skeleton, `:162` fleet skeleton, both `rounded-lg` post-ruling).
- **Change:** `class-level` — `h-[88px] w-full` → `h-[88px] w-full rounded-lg`; `h-[360px] w-full` → `h-[360px] w-full rounded-lg`; `h-[400px] w-full` → `h-[400px] w-full rounded-lg`.

### shard-027-F13 · should · medium · loading
- **Where:** `src/widgets/trips-statistics/trips-statistics.tsx:84` — `<div className="space-y-3">` (the whole `isLoading` branch, `:83-93`)
- **Rule:** design-system §7 C-D2/C-S6 — the loading frame must match the loaded footprint ("matches the KPI footprint so the page does not reflow"; the route fallback was re-shaped for the same reason)
- **Current:** the loading state renders a bare stat grid + two blocks. The loaded state renders an export/status header strip and a `TabsList` above the same grid, so both appear from nowhere and push everything down when data lands.
- **Expected:** the skeleton mirrors the rendered frame — a header-strip row and a tabs-list bar above the stat grid.
- **Change:** `class-level` — inside the `isLoading` branch, before the grid, add a row matching the header strip and the tab bar, e.g. `<div className="flex items-center justify-between gap-2"><Skeleton className="h-4 w-24 rounded-sm" /><Skeleton className="h-8 w-28 rounded-md" /></div>` and `<Skeleton className="h-9 w-64 rounded-lg" />`. Also make the outer wrapper `space-y-3 md:space-y-4` so it matches the loaded wrapper at `:151`.
- **Notes:** pairs with F12 (radii). Purely additive — no branch or prop is removed.

### shard-027-F14 · should · medium · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-summary.tsx:140` — `className="h-full cursor-pointer transition-colors hover:bg-accent/40"`
- **Rule:** design-system §3 "Content-row hover: `hover:bg-muted/50` + `transition-colors` … large content surfaces get a half-strength neutral wash, not the accent"; C-C4 ruling "named roles — `hover:bg-muted/50` on content rows/cards, `hover:bg-accent` on chrome and menu items"; §13 row D-C3
- **Current:** a KPI card (a content surface) hovers to a 40% accent tint, which §3 reserves for chrome.
- **Expected:** `hover:bg-muted/50` (`dashboard.tsx:425`, the KPI card face).
- **Change:** `class-level` — `hover:bg-accent/40` → `hover:bg-muted/50`.

### shard-027-F15 · should · medium · buttons
- **Where:** `src/widgets/trips-statistics/trips-statistics-routes.tsx:84` — `className={cn('h-9')}` on a `<Button size="sm">`
- **Rule:** design-system §5.1 "Sizes: … `sm` h-8 px-3 text-xs (32px)"; §5.1 call-site convention "chrome rows are `h-8`"; §13 row D-B1, whose evidence is `trips-statistics-routes.tsx:84`
- **Current:** each company chip is a `size="sm"` Button forced back up to 36px, so this filter row is taller than every other chrome row in the app.
- **Expected:** the `sm` height, 32px — the scope-bar presets are the reference's own chip-group-as-choice (`scope-date-picker.tsx:132-136`, `Button size="sm" h-7 text-xs`, `aria-pressed`).
- **Change:** `class-level` — `className={cn('h-9')}` → `className="h-8"`. Additionally add `aria-pressed={c.company === selectedCompany}`: C-B4 rules "`aria-pressed` for toggles (tiles, presets)", and this is a variant-swap toggle with no state exposed to assistive tech.
- **Notes:** the `cn()` wrapper around a single literal is a no-op; a plain string is equivalent. Do not remove the `variant` swap — that is the ruled-correct segmented-choice mechanic (`deferred-rulings.md` R-3: choosing a *filter value* → variant swap, not Tabs).

### shard-027-F16 · should · medium · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-routes.tsx:74` — `<h3 className="mb-3 text-sm font-semibold text-muted-foreground">`
- **Rule:** design-system §10 "Eyebrow `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §2 (the 10px row: "one label style above every figure and panel"); §13 row D-T3
- **Current:** the "select company" label above the chip group is a 14px muted heading — a fourth size for the "label above a group" job.
- **Expected:** the 10px eyebrow (`dashboard.tsx:382`, `:427`, `:776`).
- **Change:** `class-level` — `mb-3 text-sm font-semibold text-muted-foreground` → `mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (C-S4 rules the eyebrow's bottom margin at `mb-1.5`).

### shard-027-F17 · should · medium · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-routes.tsx:285` — `<h3 className="text-base font-semibold">`
- **Rule:** design-system §13 row D-T4 "Panel/card title — Dash: 10px uppercase eyebrow in a tinted band; Trips: `h3 text-base font-semibold` + `text-xs` subtitle; no band" (evidence: `trips-statistics-routes.tsx:285-290`); §10 `PanelHead`
- **Current:** the routes table card carries a 16px sans title and a 12px subtitle in an unbanded block; every panel in the reference is titled by a 10px eyebrow inside a `border-b bg-muted/60 px-3 py-2` band.
- **Expected:** the PanelHead recipe — and `ChartCard` (`shared/ui/chart-card.tsx`) now renders exactly that band, so the sibling chart on the same tab already looks like the reference while this card does not.
- **Change:** `structural` — replace the `<div className="mb-3">` title block (`:284-293`) with the PanelHead band: move the `<h3>`/`<p>` out of `CardContent` into a `border-b bg-muted/60 px-3 py-2` header on the `Card`, `h3` at `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` with the count line as the aside (`font-medium normal-case tracking-normal`). If a structural change is not wanted in this pass, the class-level minimum is `text-base font-semibold` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` on `:285`.
- **Notes:** the subtitle at `:290` (`text-xs text-muted-foreground`) is the PanelHead aside once moved.

### shard-027-F18 · should · medium · spacing
- **Where:** `src/widgets/trips-statistics/trips-statistics-routes.tsx:283` — `<CardContent className="p-4 md:p-5">` (also `:73` `<CardContent className="p-4">`, `:57` and `:133`/`:101` `p-6` in the sibling files)
- **Rule:** design-system §1 "**12px** … panel body padding"; §10 "Panel `section.overflow-hidden.rounded-lg.border.bg-card > PanelHead + div.p-3`"; §13 row D-S3
- **Current:** three different panel-body insets on one tab — 16px, 16/20px and 24px — none of which is the 12px the reference uses for a panel body.
- **Expected:** `p-3` (`dashboard.tsx:146`), which is also what `ChartCard`'s padded body now uses (`chart-card.tsx`, `padded && 'p-3'`).
- **Change:** `class-level` — `:73` `p-4` → `p-3`; `:283` `p-4 md:p-5` → `p-3`.
- **Notes:** the `p-6` at `routes.tsx:57` and at `trips-statistics.tsx:101`/`:133` wraps a full-panel `EmptyState`, whose own `py-16` supplies the vertical air — those are the §12.6 error/empty-card recipe accepted under `deferred-rulings.md` R-1 and are left alone.

### shard-027-F19 · should · medium · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-timeline.tsx:336` — `{format(String(label), 'PPP')}`
- **Rule:** design-system §2 "Dates: … day-first everywhere"; C-I2 ruling "day-first `d MMM yyyy` everywhere"; §13 row D-T16 (`PPP` in chart tooltips)
- **Current:** the chart tooltip's date header uses date-fns `PPP` (`August 30th, 2026`) while the X axis directly beneath it uses `d MMM` — two date orders in one chart.
- **Expected:** `d MMM yyyy` (`dashboard.tsx:869`, the truck-drawer date; the fuel list was changed to this under C-I2).
- **Change:** `class-level` — `format(String(label), 'PPP')` → `format(String(label), 'd MMM yyyy')`.

### shard-027-F20 · should · medium · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-summary.tsx:191` — `n: formatNumber(totals.distance / safeTrips, 2)`
- **Rule:** design-system §2 "Decimals by unit: counts/money 0, litres 2, km 0, km/L 1"; §13 row D-T15
- **Current:** distance-per-trip is rendered at 2 decimal places; the timeline renders km at 1 (`timeline.tsx:189`) and the mobile list at 0 — three precisions for one unit.
- **Expected:** 0 dp for km (`shared/lib/format.ts` usage on the dashboard).
- **Change:** `class-level` — `:191` `formatNumber(totals.distance / safeTrips, 2)` → `formatNumber(totals.distance / safeTrips, 0)`; `:187` `formatNumber(totals.distance, 2)` → `formatNumber(totals.distance, 0)`; `timeline.tsx:189` `formatNumber(v, 1)` → `formatNumber(v, 0)`; `routes.tsx:153`/`:161` and the matching footer sums keep litres at 2 but move distance to 0.
- **Notes:** volume stays at 2 dp — that is the reference's litre precision. Only the km sites change.

### shard-027-F21 · should · medium · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-summary.tsx:152` — `<dd className="font-semibold tabular-nums">` (also `:159`)
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values, bar amounts…"; §10 Drawer recipe `dd … font-mono tabular-nums`; §13 row D-T5
- **Current:** the trips-breakdown popover's `dd` figures are sans; two stacked counts in a `justify-between` column do not align.
- **Expected:** `font-mono tabular-nums` on every `dd` figure (`dashboard.tsx:501-509`).
- **Change:** `class-level` — `font-semibold tabular-nums` → `font-mono font-semibold tabular-nums` at `:152` and `:159`.

### shard-027-F22 · nit · medium · charts
- **Where:** `src/widgets/trips-statistics/trips-statistics-timeline.tsx:318` — `tick={{ fontSize: 11 }}` (also `:322`)
- **Rule:** design-system §12.5 provisional (§12.5) "Chart theme … axis ticks `fontSize 11 fill muted-foreground`"; §13 "Trips-internal inconsistencies" — "the timeline … passes `tick={{ fontSize: 11 }}` without the muted fill"
- **Current:** both axes get the right size but no fill, so ticks render in Recharts' default `#666` instead of the token, and they do not change in dark mode.
- **Expected:** the themed tick object from `shared/lib/chart-theme.ts` — `{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }`.
- **Change:** `class-level` — `tick={{ fontSize: 11 }}` → `tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}` on both axes.
- **Notes:** `chart-theme.ts` exports the themed props but is out of shard for any edit — inline the two values here rather than importing a new helper (`out-of-shard: src/shared/lib/chart-theme.ts` if the fixer prefers to reuse an exported constant).

### shard-027-F23 · nit · medium · type
- **Where:** `src/widgets/trips-statistics/trips-statistics-timeline.tsx:400` — `<p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">` (also `:419`, `:427`, `:435`)
- **Rule:** design-system §10 "Eyebrow `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §13 row D-T3 (StatCard & footer eyebrows `text-[10px] font-medium`)
- **Current:** the four chart-footer eyebrows are 500-weight; the reference eyebrow is 600.
- **Expected:** `font-semibold`.
- **Change:** `class-level` — `font-medium` → `font-semibold` on all four.

### shard-027-F24 · nit · medium · spacing
- **Where:** `src/widgets/trips-statistics/trips-statistics-timeline.tsx:288` — `<div className="px-3 pt-2 pb-1" style={{ height: '360px' }}>`
- **Rule:** design-system §1 "**12px** … panel body padding"; §10 Panel `> div.p-3`
- **Current:** the chart body opts out of `ChartCard`'s padding (`padded={false}`) and re-implements it asymmetrically — 12/8/4px — so the chart sits off-centre in its card.
- **Expected:** the 12px body inset the panel recipe uses; the reference has no asymmetric body pad.
- **Change:** `class-level` — `px-3 pt-2 pb-1` → `p-3`. Keep `padded={false}` and the inline height (Recharts needs the measured box).
- **Notes:** `pb-1` was presumably shaving space above the footer band; the band already supplies its own `py-3`.

### shard-027-F25 · nit · medium · colour
- **Where:** `src/widgets/trips-statistics/trips-statistics-routes.tsx:198` — `: '—'}` inside `<span className="block text-end tabular-nums text-muted-foreground">` (also `:209`)
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`" (`dashboard.tsx:765`); §13 row D-C11
- **Current:** the empty-value dash renders at full muted strength, the same weight as a real figure in the neighbouring rows.
- **Expected:** `<span className="opacity-40">—</span>`.
- **Change:** `class-level` — wrap the fallback: `: <span className="opacity-40">—</span>}` at `:198` and `:209`.

### shard-027-F26 · nit · low · spacing
- **Where:** `src/widgets/trips-statistics/trips-statistics-routes.tsx:70` — `<div className="space-y-4">`
- **Rule:** design-system §1 "**12px** … gap between every top-level block"; §13 row D-S4 "Section rhythm — Dash `gap-3` at all widths; Trips `space-y-3 md:space-y-4`"
- **Current:** the routes tab stacks its two cards at 16px, while the overview tab next to it stacks at 12/16px responsive (`trips-statistics.tsx:191`) — the same tab strip yields two rhythms.
- **Expected:** one rhythm across the sub-tabs.
- **Change:** `class-level` — `space-y-4` → `space-y-3 md:space-y-4`, matching `trips-statistics.tsx:151` and `:191`.
- **Notes:** low confidence — §14b R-14 moved the *page* frame to `gap-6`, and it is a judgment whether these in-tab cards are "top-level blocks" or panel siblings. The internal disagreement between the two sub-tabs is the concrete defect; matching them is safe either way.

## Summary
FINDINGS: 26 (blocker 4 / should 17 / nit 5)
