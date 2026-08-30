# Findings — shard-012

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/pages/fuel-events/fuel-event-details.tsx` | 276 | audited | `max-w-4xl` page cap: no rule (dashboard `max-w-6xl` is its own cap, not a rule for detail pages). Icon well `h-8 w-8 rounded-md bg-muted`: no rule (provisional §12.5 StatCard tile is the same). `eff.className`/`eff.bgClassName` come from `shared/lib/fuel` (reference) — not flagged. Hard-coded ` L` / ` km` units: the dashboard fuel row does the same (`dashboard.tsx:639-640`) — no finding. |
| `src/pages/fuel-events/fuel-event-edit.tsx` | 100 | audited | `max-w-3xl`: no rule. `FuelEventForm` is out of shard. |
| `src/pages/fuel-events/fuel-event-new.tsx` | 56 | audited | — |
| `src/pages/fuel-events/fuel-events.tsx` | 494 | audited | `PageShell`, `StatCard`, `Input`, `EmptyState` internals are out of shard (§13 D-S1/D-T1/D-T2 belong to `page-shell.tsx`). URL sync for q/g/f/m/s/d present (Vercel "Navigation & State" ✓). |
| `src/widgets/fuel-events-table/fuel-events-excel.ts` | 320 | no UI content | Excel colours (`EXCEL_PALETTE.green/violet` on stats) — provisional §12.6 only; palette lives in `shared/lib/excel.ts` (out of shard). No rule. |
| `src/widgets/fuel-events-table/fuel-events-filters.tsx` | 454 | audited | `PopoverContent w-60 p-2`: C-B6 lets call sites size to content — no finding. Count pill inside a filled button (`bg-primary-foreground text-primary`) — provisional §12.3 only; D-B9 recorded, not flagged (no dashboard chip sits on a navy fill). |
| `src/widgets/fuel-events-table/fuel-events-table.tsx` | 622 | audited | `DataTable`, `Tooltip`, `Card` internals out of shard. `max-h-[280px] md:max-h-[320px]` list cap: no rule (dashboard's 420px is one panel's value). Unconditional `title={groupKey}`: dashboard also uses unconditional `title` — no finding. |
| `src/widgets/header/header.tsx` | 46 | reference — not audited | |
| `src/widgets/language-toggle/language-toggle.tsx` | 38 | reference — not audited | |
| `src/widgets/layout/layout.tsx` | 55 | reference — not audited | |

## Findings

### shard-012-F01 · blocker · high · colour
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:188` — `<p className="text-3xl font-semibold">{formatCurrency(event.price)}</p>`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`" | §3 "Money (amber) `text-money` on figures"
- **Current:** total price headline is sans, foreground colour, no tabular figures; the two DetailRow money values at `:239` and `:244` render through `DetailRow` as `truncate font-medium` (foreground).
- **Expected:** `font-mono … font-semibold tabular-nums text-money` as the KPI money value (`dashboard.tsx:385,436`) and the fuel-row price (`dashboard.tsx:634`).
- **Change:** `class-level` — `:188` `text-3xl font-semibold` → `font-mono text-[22px] font-semibold leading-none tabular-nums text-money`. For `:239` and `:244` add a `valueClassName`-free approach: wrap the value in `<span className="font-mono tabular-nums text-money">{formatCurrency(…)}</span>` at the call sites (additive; `DetailRow` keeps its props).
- **Notes:** the sub-line at `:190` (`L × price`) is hint copy; keep it muted but add `font-mono tabular-nums` (see F03). Sizing part of this headline is also covered by F02.

### shard-012-F02 · should · high · type
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:169` — `<p className={cn('text-3xl font-semibold', eff.className)}>`
- **Rule:** design-system §2 "22 `text-[22px]` 600, `leading-none`, mono + `tabular-nums` — KPI value" | §14 C-T5 "four-step figure scale (22 KPI › 18 › 17 › 15)"
- **Current:** three headline figures (`:169`, `:188`, `:202`) are `text-3xl` (30px) sans, no leading control.
- **Expected:** `font-mono text-[22px] font-semibold leading-none tabular-nums` (`dashboard.tsx:436`).
- **Change:** `class-level` — on `:169`, `:188`, `:202` replace `text-3xl font-semibold` with `font-mono text-[22px] font-semibold leading-none tabular-nums` (keep `eff.className` on `:169`; `:188` additionally takes `text-money`, F01).
- **Notes:** the unit suffix (`km/L`, `km`) stays inside the mono span as the dashboard does for `L`/`km`.

### shard-012-F03 · should · high · type
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:49` — `<p className="truncate font-medium">{value ?? '—'}</p>`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values" | §6 "`dd m-0 shrink-0 font-mono tabular-nums`"
- **Current:** every DetailRow value (date, litres, odometers, money) is sans `font-medium` and may truncate; the cost/odometer sub-lines at `:190` and `:204` are sans too.
- **Expected:** dl values `font-mono tabular-nums` (`dashboard.tsx:501-509`); identifiers/figures never truncate (§6 "identifiers are `shrink-0`").
- **Change:** `class-level` — `:49` `truncate font-medium` → `font-mono text-sm font-medium tabular-nums`; `:189` and `:203` add `font-mono tabular-nums`. The Arabic driver name at `:229` is free text, so also add `dir="auto"` on the value `<p>` (§9) — additive attribute.
- **Notes:** the `'—'` fallback should carry `opacity-40` (F17).

### shard-012-F04 · should · high · type
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:46` — `<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">`
- **Rule:** design-system §2 "10 `text-[10px]` 600, `uppercase tracking-wider text-muted-foreground` — Eyebrow: KPI label … one label style above every figure" | §10 "Eyebrow text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
- **Current:** 12px, weight 500, `tracking-wide`. The three highlight-card labels (`:165`, `:184`, `:198`) are a different third style: `text-sm text-muted-foreground`, not uppercase, with a 16px icon.
- **Expected:** `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` with `mb-1.5` between label and value (`dashboard.tsx:427`).
- **Change:** `class-level` — `:46` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; `:165/:184/:198` `flex items-center gap-2 text-sm text-muted-foreground` → `flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` and shrink the icons to `h-3 w-3` (KPI chevron size, §6 "chevron `h-3 w-3`").
- **Notes:** Arabic labels get uppercase as a no-op; the dashboard applies the same class to Arabic eyebrows.

### shard-012-F05 · should · high · spacing
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:164` — `<CardContent className="space-y-2 p-5">`
- **Rule:** design-system §1 "12px `p-3` … panel body padding, KPI card padding" | §13 D-S3 "Card/panel body padding: Dash `p-3`"
- **Current:** `p-5` (20px, not on the ladder) on all four cards (`:164`, `:183`, `:197`, `:211`); inner grids `gap-5` (`:213`, `:248`); `Separator className="my-5"` (`:247`); grid `gap-4` (`:161`); `h2 mb-4` (`:212`).
- **Expected:** `p-3` card body, `gap-3` between every block and inside grids (`dashboard.tsx:99,124,425`).
- **Change:** `class-level` — `p-5` → `p-3` (four sites); `gap-5` → `gap-3` (`:213`, `:248`); `my-5` → `my-3`; `:161` `gap-4` → `gap-3`; `:212` `mb-4` → `mb-3`. Loading frame `:83` `space-y-4` → `space-y-3`.
- **Notes:** `Separator` is a trips-only primitive (provisional §12.4); keeping it is fine, only the margin changes.

### shard-012-F06 · should · high · radius/border/shadow
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:182` — `<Card>`
- **Rule:** design-system §4 "Cards are `border bg-card` with **no shadow** — separation is tone plus a hairline" | §13 D-R1 "Card = `rounded-lg … shadow-sm`" (dashboard wins)
- **Current:** `Card` primitive carries `shadow-sm`; the four cards on this page (`:163`, `:182`, `:196`, `:210`) inherit it.
- **Expected:** no shadow on any card/panel (`dashboard.tsx:135,417`).
- **Change:** `class-level` — add `shadow-none` to each `<Card className=…>` (`cn` lets the later class win). Fixing the primitive itself is `out-of-shard: src/shared/ui/card.tsx`.

### shard-012-F07 · should · medium · tables/lists
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:212` — `<h2 className="mb-4 text-base font-semibold">{t('common.details')}</h2>`
- **Rule:** design-system §6 "Panel head: `h2 class="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"`" | §13 D-T4 "Panel/card title: 10px uppercase eyebrow in a tinted band"
- **Current:** a 16px sans heading inside the padded body.
- **Expected:** the PanelHead band above a `p-3` body (`dashboard.tsx:999-1005`), the card `overflow-hidden` so the band clips (§4).
- **Change:** `structural` — move the `<h2>` out of `CardContent` as the first child of the `Card`: `<h2 className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">`; add `overflow-hidden` to that `Card`; drop the `mb-4`.
- **Notes:** the three highlight cards have their eyebrow inside the body like a KPI card, which is correct (F04); only the details card is a panel.

### shard-012-F08 · blocker · high · RTL/i18n/a11y
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:120` — `<span>{format(event.date, 'PPP')}</span>`
- **Rule:** design-system §14 C-I2 "→ Ruling: day-first `d MMM yyyy` everywhere" | §2 "lists and drawers `d MMM yyyy`"
- **Current:** `PPP` (e.g. "August 30th, 2026" — month-first, ordinal) at `:120` and `:217`.
- **Expected:** `format(date, 'd MMM yyyy')` (`dashboard.tsx:619`, post-ruling).
- **Change:** `class-level` (string literal) — `'PPP'` → `'d MMM yyyy'` at `:120` and `:217`.

### shard-012-F09 · should · high · loading/empty/error
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:84` — `<Skeleton className="h-32" />`
- **Rule:** design-system §14 C-R2 "a skeleton takes the radius of the box it stands in: cards `rounded-lg`" | §7 "Apex pending … `Skeleton h-[92px] rounded-lg`"
- **Current:** `h-32` and `h-64` (`:85`) skeletons at the primitive's default `rounded-md`, standing in for `rounded-lg` cards; the title skeleton `:80` `h-8 w-48` is a text bar at `rounded-md`.
- **Expected:** card slots `rounded-lg`, text bars `rounded-sm` (`dashboard.tsx:126,162,456`).
- **Change:** `class-level` — `:84` `h-32` → `h-32 rounded-lg`; `:85` `h-64` → `h-64 rounded-lg`; `:80` `h-8 w-48` → `h-8 w-48 rounded-sm`. Also mirror the real layout: the body loads as three `h-[92px] rounded-lg` cards in `grid grid-cols-1 gap-3 md:grid-cols-3` plus one tall card, so it does not reflow (C-D2/C-S6).

### shard-012-F10 · should · low · loading/empty/error
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:94` — `<EmptyState lottieSrc="/animations/warning.lottie"`
- **Rule:** design-system §7 "Failures are inline and persistent — a strip or muted copy in place … Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page" | §13 D-ST2 "Query error: Dash `DegradedStrip` in place" (dashboard wins)
- **Current:** load failure renders the trips-style `EmptyState` with a lottie and an outline `h-9` Button.
- **Expected:** `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` strip with `AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning` and a `Button variant="outline" size="sm" className="h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning hover:text-warning"` action (`dashboard.tsx:1018-1047`).
- **Change:** `structural` — replace the `EmptyState` with the strip markup above, keeping the same `t('fuelEvents.loadFailed')` text and the existing Back button (restyled as the strip button). Confidence is low because the reference has no whole-page "record not found" case; the fixer may leave this as-is and note it.
- **Notes:** the same pattern is at `fuel-event-edit.tsx:69` and `fuel-events.tsx:425` (F23).

### shard-012-F11 · should · medium · RTL/i18n/a11y
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:124` — `<span>{event.driver_name}</span>`
- **Rule:** design-system §9 "Bidi text: `dir="auto"` on free-text labels and mixed values" | §6 "Mixed-direction text gets `dir="auto"`"
- **Current:** the driver name (Arabic free text) is rendered inside an LTR `inline-flex` description with no `dir`.
- **Expected:** `dir="auto"` on the free-text span (`dashboard.tsx:498,834`).
- **Change:** `class-level` (additive attribute) — `<span dir="auto">{event.driver_name}</span>`; likewise the plate title is passed to `PageShell` unchanged (out of shard).

### shard-012-F12 · nit · high · buttons & controls
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:101` — `<ArrowLeft className="h-4 w-4 rtl:rotate-180" />`
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes" | §15.4
- **Current:** dead `h-4 w-4` on every icon inside a `Button`: `:101`, `:133`, `:142`, `:148`.
- **Expected:** `<ArrowLeft className="rtl:rotate-180" />`, `<Edit />` (`header.tsx:23`, `dashboard.tsx:1043`).
- **Change:** `class-level` — drop `h-4 w-4` on those four icons (keep `rtl:rotate-180`).
- **Notes:** same nit in `fuel-event-edit.tsx:62`, `fuel-event-new.tsx:37`, `fuel-events.tsx:278,283,446`, `fuel-events-filters.tsx:87,281` — fix all in one pass.

### shard-012-F13 · nit · high · buttons & controls
- **Where:** `src/pages/fuel-events/fuel-event-details.tsx:153` — `<Badge variant="warning" className="gap-1">`
- **Rule:** design-system §5.3 "Badge primitive: `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium`" (C-T3)
- **Current:** the call site overrides the pill's `gap-1.5` with `gap-1`.
- **Expected:** the primitive's own gap (`badge.tsx:6`).
- **Change:** `class-level` — remove `className="gap-1"`.
- **Notes:** same override at `fuel-events-table.tsx:198`.

### shard-012-F14 · should · high · loading/empty/error
- **Where:** `src/pages/fuel-events/fuel-event-edit.tsx:82` — `<Skeleton className="h-40" />`
- **Rule:** design-system §14 C-R2 "cards `rounded-lg`" | §7 Fleet pending "`Skeleton h-40 rounded-lg`"
- **Current:** three card-sized skeletons (`:82-84`) at default `rounded-md`, stacked with `space-y-4`.
- **Expected:** `rounded-lg` card skeletons, `gap-3` rhythm (`dashboard.tsx:162`, §1).
- **Change:** `class-level` — add `rounded-lg` to each of the three; `space-y-4` → `space-y-3` (`:81`).

### shard-012-F15 · nit · low · buttons & controls
- **Where:** `src/pages/fuel-events/fuel-event-edit.tsx:63` — `{t('common.back')}`
- **Rule:** provisional (§12.7) "Back-to-list `Button outline sm` with `ArrowLeft rtl:rotate-180`, label `hidden sm:inline`" | provisional (§12.1) "labels `hidden sm:inline`"
- **Current:** the Back label is always visible here and in `fuel-event-new.tsx:38`; the sibling details page hides it below `sm` (`fuel-event-details.tsx:134`).
- **Expected:** `<span className="hidden sm:inline">{t('common.back')}</span>` as in the details page.
- **Change:** `class-level` — wrap the label in `<span className="hidden sm:inline">` in both files.

### shard-012-F16 · should · high · spacing
- **Where:** `src/pages/fuel-events/fuel-events.tsx:356` — `<div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">`
- **Rule:** design-system §1 "KPI row: `grid grid-cols-2 gap-3` + `lg:grid-cols-4`" | §13 D-S5 "KPI/stat grid: Dash `grid-cols-2 gap-3`; Trips `gap-2.5 md:grid-cols-3 lg:grid-cols-5`"
- **Current:** `gap-2.5` (10px) between stat cards; every other block on the page is 12px apart.
- **Expected:** `gap-3` (`dashboard.tsx:359`).
- **Change:** `class-level` — `gap-2.5` → `gap-3`. Column counts (`md:3 lg:5`) are a content decision; no rule forces 4.
- **Notes:** the card face padding/type live in `StatCard` — `out-of-shard: src/shared/ui/stat-card.tsx`.

### shard-012-F17 · blocker · medium · colour
- **Where:** `src/pages/fuel-events/fuel-events.tsx:379` — `label={t('fuelEvents.stats.totalCost')} … icon={DollarSign} tone="primary"`
- **Rule:** design-system §0.2 palette rule "Navy marks anything you can act on; amber marks anything someone gets paid. Everything else is neutral, so colour on this screen is information rather than decoration" | §3 "Money (amber) `text-money` on figures"
- **Current:** two money cards (`:379-386` total cost, `:388-396` cost per day) get `tone="primary"` (navy) and `tone="warning"` icon tiles and their values render in plain foreground; total fuel `tone="primary"` (`:365`) and avg efficiency `tone="success"` (`:376`) are coloured regardless of value — navy on non-actionable cards and green as decoration.
- **Expected:** money values `font-mono tabular-nums text-money`; non-status cards neutral (`bg-muted text-muted-foreground` tile); success only when the value is a passing status (`dashboard.tsx:385,436`; §3).
- **Change:** `class-level` — `:365` and `:385` `tone="primary"` → `tone="default"`; `:395` `tone="warning"` → `tone="default"`; `:376` `tone="success"` → `tone="default"` (or drive it from `evaluateEfficiency(stats.avgFuelRate)` so green means "good"). For the amber money figure wrap the two money `value` strings: `full: <span className="text-money">{formatCurrency(…)}</span>` (value accepts `ReactNode`). A `money` tone on `StatCard` would be the clean fix — `out-of-shard: src/shared/ui/stat-card.tsx`.

### shard-012-F18 · blocker · high · RTL/i18n/a11y
- **Where:** `src/pages/fuel-events/fuel-events.tsx:294` — `<Input value={search} onChange={…} placeholder={t('fuelEvents.searchPlaceholder')} className="ps-9" />`
- **Rule:** vercel-rules "Accessibility" bullet "Form controls need `<label>` or `aria-label`" | "Forms" bullet "Inputs need `autocomplete` and meaningful `name`"
- **Current:** the search input has only a placeholder — no label, `aria-label`, `name`, `type` or `autoComplete`.
- **Expected:** a labelled control; the header search (`header.tsx`) and scope-bar controls all carry translated `aria-label`s (§9 C-I4).
- **Change:** `class-level` (additive attributes) — add `type="search" name="q" aria-label={t('fuelEvents.searchPlaceholder')} autoComplete="off" spellCheck={false}`.

### shard-012-F19 · blocker · high · buttons & controls
- **Where:** `src/pages/fuel-events/fuel-events.tsx:485` — `'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors'`
- **Rule:** design-system §14 C-B1 "→ Ruling: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere" | vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"
- **Current:** the three grouping tabs (`GroupingButton`) have no focus ring classes.
- **Expected:** the ring on every interactive element (`dashboard.tsx:735`, `scope-date-picker.tsx:132` presets).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the base class string at `:485`.

### shard-012-F20 · should · medium · buttons & controls
- **Where:** `src/pages/fuel-events/fuel-events.tsx:303` — `className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"`
- **Rule:** design-system §5.2 "Scope presets: `Button size="sm" h-7 text-xs`, `variant` flips `default`↔`outline`, `aria-pressed` — segmented choice by variant swap (C-B4)" | §13 D-B2 "Segmented choice: Dash separate `h-7` pills, variant swap; Trips bordered tray" (dashboard wins) | §4 "`rounded` (4px): category bar track+fill, kbd chips"
- **Current:** a bordered `h-9` tray with `rounded` (4px) options, active = `bg-background shadow-sm`, inactive `text-muted-foreground hover:text-foreground`; state via `role=tab`/`aria-selected`.
- **Expected:** the scope-bar preset recipe: sibling `Button size="sm" className="h-7 text-xs"` with `variant={active ? 'default' : 'outline'}` and `aria-pressed` (`scope-date-picker.tsx:132-136`), inside a plain `flex gap-1.5` (§1 icon/label step).
- **Change:** `structural` — render `GroupingButton` as `<Button type="button" variant={active ? 'default' : 'outline'} size="sm" className="h-7 text-xs" aria-pressed={active} onClick={onClick}>`; replace the tray `div` classes with `flex items-center gap-1.5` and drop `role="tablist"`/`role="tab"`/`aria-selected` in favour of `aria-pressed` (keep the `aria-label` on the wrapper as `role="group"`). Keep all props and the `hidden sm:inline` label.
- **Notes:** identical tray in `fuel-events-filters.tsx:158-186` (F31); do both the same way so the two toolbar rows match. Icon size classes inside the Button become dead (F12).

### shard-012-F21 · should · medium · buttons & controls
- **Where:** `src/pages/fuel-events/fuel-events.tsx:294` — `<Input … className="ps-9" />` (36px) beside the `h-9` tray
- **Rule:** design-system §5.1 "Call-site override convention: chrome rows are `h-8`" (C-B3) | §13 D-B1 "Toolbar height: Dash `sm` shrunk to `h-8`/`h-7`; Trips `sm` raised to `h-9`"
- **Current:** both toolbar rows run at 36px: Input default `h-9`, grouping tray `h-9`, and in the filters widget the Filter button `h-9`, method tray `h-9`, sort Select `h-9`, direction button `h-9 w-9`.
- **Expected:** the header/scope toolbar rows are `h-8` (`scope-bar.tsx:66,108`, `header.tsx`); page-header actions here already use `size="sm"` = `h-8`.
- **Change:** `class-level` — `:298` `className="ps-9"` → `className="h-8 ps-9"`; the tray becomes `h-7` pills via F20. In `fuel-events-filters.tsx`: `:86` `h-9` → `h-8`; `:259` `h-9 w-[130px]` → `h-8 w-auto min-w-32`; `:274` `h-9 w-9` → `h-8 w-8`; `:257` wrapper `h-9` → `h-8`.
- **Notes:** judgment call — the rule is stated for chrome rows; these are page toolbars, but the page's own `size="sm"` header buttons are already 32px, so the toolbar would otherwise be the only 36px row.

### shard-012-F22 · should · medium · radius/border/shadow
- **Where:** `src/pages/fuel-events/fuel-events.tsx:417` — `rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground`
- **Rule:** design-system §4 "every card, panel and tile uses the token family (`rounded-lg`)" (C-R1) | §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … 10% tint + 40% border" | §7 DegradedStrip "`flex items-start gap-2 rounded-lg border border-dashed … px-3 py-2.5 text-[12.5px]`"
- **Current:** informational strip at `rounded-md`, `/20` border + `/5` fill in navy (navy = actionable, this is not), `p-2.5`, `text-xs`; icon `text-primary`.
- **Expected:** the strip recipe: `rounded-lg … px-3 py-2.5 text-[12.5px]` with `items-start` + `mt-0.5 h-3.5 w-3.5` icon (`dashboard.tsx:1018-1047`); for a neutral note the dashed hairline tone `border-dashed border-border/60 bg-muted/40` (§4 "Dashed = not live / placeholder", C-R4).
- **Change:** `class-level` — `:417` → `flex items-start gap-2 rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2.5 text-[12.5px] text-muted-foreground`; `:418` `text-primary` → `text-muted-foreground` (paired context is still signalled by the `bg-primary/10 text-primary` badge in rows, §3 "fuel paired status").

### shard-012-F23 · should · medium · loading/empty/error
- **Where:** `src/pages/fuel-events/fuel-events.tsx:425` — `<EmptyState lottieSrc="/animations/warning.lottie" … title={t('errors.generic')}`
- **Rule:** design-system §7 "Apex error: KPI row replaced by `DegradedStrip` (message + retry)" | §13 D-ST2 "Query error: Dash `DegradedStrip` in place, content still renders; Trips `EmptyState` + warning lottie + `Button outline` (h-9) replacing list" (dashboard wins)
- **Current:** query error replaces the table with a lottie `EmptyState` and a default-height outline retry.
- **Expected:** `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` + `AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning` + `Button variant="outline" size="sm" className="h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning hover:text-warning"` retry (`dashboard.tsx:1018-1047`).
- **Change:** `structural` — swap the `EmptyState` for the strip markup, keeping `t('errors.generic')`, `t('common.retry')` and the `refetch` handler.

### shard-012-F24 · should · medium · loading/empty/error
- **Where:** `src/pages/fuel-events/fuel-events.tsx:437` — `<EmptyState lottieSrc="/animations/no_results.json" … title={t('fuelEvents.noEvents')}`
- **Rule:** design-system §7 "Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page" | §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground`" | §13 D-ST1
- **Current:** empty list is a dashed `py-16` `EmptyState` with a 100px lottie, `text-lg` title and an `h-9` CTA.
- **Expected:** `px-3 py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:180-183,605-608`).
- **Change:** `structural` — `<div className="rounded-lg border bg-card px-3 py-6 text-center text-xs text-muted-foreground"><p>{t('fuelEvents.noEvents')}</p><p className="mt-0.5">{t('fuelEvents.noEventsDescription')}</p>{canEditFuel && <Button size="sm" className="mt-3 h-7 text-xs" …>…</Button>}</div>` — keep the `canEditFuel` branch and the `intentProps` warm exactly as they are.
- **Notes:** medium confidence: the dashboard has no CTA in an empty state; the `mt-3 h-7 text-xs` sizing follows §5.1 popover-internal buttons.

### shard-012-F25 · should · high · type
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:98` — `<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">`
- **Rule:** design-system §2 "10 `text-[10px]` 600, `uppercase tracking-wider text-muted-foreground` — Eyebrow … sidebar section headings" | §13 D-T3
- **Current:** popover heading at 12px.
- **Expected:** `text-[10px]` (`sidebar.tsx:204`).
- **Change:** `class-level` — `text-xs` → `text-[10px]`.

### shard-012-F26 · blocker · high · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:105` — `className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"`
- **Rule:** design-system §14 C-B1 "`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere" | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** the "clear" text button has no focus ring.
- **Expected:** ring as on the dashboard's inline text button (`dashboard.tsx:244` pre-C-B2 refresh link: plain outset ring).
- **Change:** `class-level` — append `rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

### shard-012-F27 · blocker · high · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:122` — `'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors'`
- **Rule:** design-system §14 C-B1 (as above) | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** the five status option buttons have no focus-visible classes (they are raw `<button>`s, not Radix items, so no `data-highlighted` fallback).
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`dashboard.tsx:735`).
- **Change:** `class-level` — append the ring classes to the base string at `:122`.

### shard-012-F28 · blocker · high · colour
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:123` — `selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'`
- **Rule:** design-system §14 C-C1 "→ Ruling: `bg-primary/10 text-primary`" | §3 "Selected/current state is the `bg-primary/10 text-primary` wash, never the accent" | §3 "Hover / keyboard highlight `hover:bg-accent hover:text-accent-foreground` (menu items)"
- **Current:** selected rows use the accent (hover) tint; hover is a diluted `bg-accent/60` (D-C3).
- **Expected:** selected `bg-primary/10 text-primary`; hover `hover:bg-accent hover:text-accent-foreground` (`sidebar.tsx:230-231`, `dropdown-menu.tsx:77`).
- **Change:** `class-level` — `:123` → `selected ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground'`.

### shard-012-F29 · blocker · high · colour
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:126` — `<span className={cn('h-2 w-2 rounded-full', meta.dot)} />`
- **Rule:** design-system §14 C-C8 "→ Ruling: 6px (`h-1.5 w-1.5`)" | §5.3 "Status dots `h-1.5 w-1.5 rounded-full` everywhere"
- **Current:** 8px dots.
- **Expected:** `h-1.5 w-1.5 rounded-full` (`dashboard.tsx:226,749,814`).
- **Change:** `class-level` — `h-2 w-2` → `h-1.5 w-1.5`; add `aria-hidden` (§9 "`aria-hidden` on dots").

### shard-012-F30 · blocker · high · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:213` — `'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors'`
- **Rule:** design-system §14 C-B1 (ring everywhere) | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** the three method tab buttons have no focus ring.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
- **Change:** `class-level` — append the ring classes to the base string at `:213` (or take the `Button` recipe via F31, which carries them).

### shard-012-F31 · should · medium · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:159` — `className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"`
- **Rule:** design-system §5.2 "Scope presets … segmented choice by variant swap (C-B4)" | §14 C-B4 "`aria-pressed` for toggles (tiles, presets)" | §13 D-B2 (dashboard wins)
- **Current:** same bordered tray as F20 with `rounded` options, `active` = `bg-background shadow-sm`, `role=tab`/`aria-selected`.
- **Expected:** `Button size="sm" className="h-7 text-xs"` with `variant={active ? 'default' : 'outline'}` + `aria-pressed` in a `flex items-center gap-1.5` group (`scope-date-picker.tsx:132-136`).
- **Change:** `structural` — as F20, applied to `MethodButton`. Keep `disabled`, `icon`, `label`, `count` props; the disabled look then comes from the Button primitive (F32).

### shard-012-F32 · should · high · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:217` — `disabled && 'cursor-not-allowed opacity-40 hover:text-muted-foreground'`
- **Rule:** design-system §5.4 "Disabled everywhere = `opacity-50` (+ `pointer-events-none` or `cursor-not-allowed`)" | §13 D-C12
- **Current:** `opacity-40`.
- **Expected:** `opacity-50` (`button.tsx:7`, `select.tsx`).
- **Change:** `class-level` — `opacity-40` → `opacity-50`.

### shard-012-F33 · should · medium · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:225` — `'hidden rounded-full px-1 text-[10px] font-semibold tabular-nums sm:inline-block'`
- **Rule:** design-system §5.3 "Method chip `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground` + mono `text-foreground` amount" (C-T3: "neutral chips are `px-2 py-0.5 text-[10.5px] font-medium`")
- **Current:** count chip `px-1 text-[10px] font-semibold`, background swapped by active state (`bg-muted`/`bg-background`).
- **Expected:** the neutral chip recipe with the number promoted: `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground` and the count `font-mono tabular-nums text-foreground` (`dashboard.tsx:583-586`).
- **Change:** `class-level` — `:225` → `'hidden rounded-full bg-muted px-2 py-0.5 font-mono text-[10.5px] font-medium tabular-nums text-foreground sm:inline-block'`; drop the active/inactive colour swap on `:226` (keep the ternary expression if the fixer prefers, both branches identical).

### shard-012-F34 · nit · medium · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-filters.tsx:259` — `<SelectTrigger className="h-9 w-[130px] gap-1 rounded-e-none border-e-0 text-xs">`
- **Rule:** design-system §5.4 "SelectTrigger … `text-sm` (scope bar overrides to `h-8 w-auto min-w-32 gap-2`)" | §13 D-B3
- **Current:** `gap-1 text-xs w-[130px]`.
- **Expected:** `h-8 w-auto min-w-32 gap-2` at the primitive's `text-sm` (`scope-bar.tsx:108`).
- **Change:** `class-level` — `:259` → `h-8 w-auto min-w-32 gap-2 rounded-e-none border-e-0` (height also in F21). Logical `rounded-e-none border-e-0`/`rounded-s-none` are correct for RTL — keep.

### shard-012-F35 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:119` — `cell: ({ row }) => format(row.original.date, 'MMM d, yyyy'),`
- **Rule:** design-system §14 C-I2 "→ Ruling: day-first `d MMM yyyy` everywhere (fuel list changed)" | §2 "lists and drawers `d MMM yyyy`"
- **Current:** month-first `MMM d, yyyy` — the exact pre-ruling pattern C-I2 removed from the dashboard fuel list — at `:119` and `:412`; tooltips use `MMM d` at `:161` and `:474`.
- **Expected:** `'d MMM yyyy'` (`dashboard.tsx:619`); short form `'d MMM'` (§2 range `d MMM`).
- **Change:** `class-level` (string literals) — `:119`, `:412` → `'d MMM yyyy'`; `:161`, `:474` → `'d MMM'`.

### shard-012-F36 · blocker · high · colour
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:436` — `<span className="text-sm font-semibold tabular-nums">{formatCurrency(e.price)}</span>`
- **Rule:** design-system §14 C-T1 "`text-sm font-semibold tabular-nums text-money` in sans [fuel-row price] → Ruling: `font-mono tabular-nums text-money`" | §3 money
- **Current:** the row price is sans and foreground-coloured (no `text-money`, no mono); same for the flat-table price cell `:129` (`formatCurrency` bare) and the group header cost stat `:374` (`Stat` = `font-medium` + `tabular-nums`).
- **Expected:** `font-mono text-sm font-semibold tabular-nums text-money` (`dashboard.tsx:634`).
- **Change:** `class-level` — `:436` → `font-mono text-sm font-semibold tabular-nums text-money`; `:129` wrap: `<span className="font-mono tabular-nums text-money">{formatCurrency(row.original.price)}</span>`; `:373-375` pass `className="font-mono text-money"` to that `Stat` (prop exists).

### shard-012-F37 · should · medium · type
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:109` — `<span className="font-medium">{row.original.car_no_plate}</span>`
- **Rule:** design-system §2 "Figures are mono + tabular — KPI values, plates, dl values" | §6 "identifiers (date, plate) are `shrink-0`" | §2 "a value inside a muted context is promoted back with `text-foreground` (plate in meta line `:621`)"
- **Current:** plates are sans: flat table `:109` `font-medium`; group rows `:416` `truncate` (plate may be clipped) inside a muted line, not promoted.
- **Expected:** `shrink-0 font-mono tabular-nums text-foreground` (`dashboard.tsx:620-622`); Latin plates mono, Arabic plates sans `dir="rtl"` (§2/§9).
- **Change:** `class-level` — `:109` `font-medium` → `font-mono font-medium tabular-nums`; `:416` `truncate` → `shrink-0 font-mono tabular-nums text-foreground`. The group title `:308` (a plate when grouping by vehicle) → see F41.
- **Notes:** plates in this fleet may be Arabic — the dashboard still applies mono to `car_no_plate` in the fuel row, so follow that.

### shard-012-F38 · should · medium · type
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:443` — `<Droplet className="h-3 w-3" />{formatNumber(e.liters, 2)} L`
- **Rule:** design-system §2 "Figures are mono + tabular" | §6 fuel row litres/km "`tabular-nums`" (`dashboard.tsx:639-640`) | vercel-rules "Typography" bullet "`font-variant-numeric: tabular-nums` for number columns/comparisons"
- **Current:** litres/km in group rows (`:441-448`), the flat-table litres cell `:124`, and the rate cells `:147`, `:173`, `:459`, `:484` carry no `tabular-nums`; group-header stats do (`Stat` `:516`).
- **Expected:** `tabular-nums` on every figure (`dashboard.tsx:639-640,648`).
- **Change:** `class-level` — add `tabular-nums` to the spans at `:441`, `:445`, `:483`, `:453`, `:173`, `:141`; wrap `:124` in `<span className="tabular-nums">…</span>`.

### shard-012-F39 · should · medium · RTL/i18n/a11y
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:141` — `<span className={cn('cursor-help font-medium underline decoration-dotted underline-offset-2', a.className)}>`
- **Rule:** vercel-rules "Accessibility" bullet "Interactive elements need keyboard handlers" | "Focus States" bullet "Interactive elements need visible focus"
- **Current:** Radix `TooltipTrigger asChild` on a non-focusable `<span>` (`:141`, `:453`) — the paired-rate explanation is hover-only.
- **Expected:** the dashboard exposes compressed context through native `title` (§9 "native `title` for compressed context") or on a focusable element.
- **Change:** `class-level` (additive attributes) — add `tabIndex={0}` and `rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to both spans so Radix opens the tooltip on focus.

### shard-012-F40 · should · medium · colour
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:193` — `: a.status === 'paired' ? 'default' : 'secondary';`
- **Rule:** design-system §3 "Current / selected wash `bg-primary/10 text-primary` … fuel "paired" status" | §3 "Status tint recipe … never a solid status fill"
- **Current:** paired rows get `Badge variant="default"` = solid `bg-primary text-primary-foreground` (`badge.tsx:10`).
- **Expected:** the 10% navy wash: `bg-primary/10 text-primary` with a `border-primary/40` hairline as the other status variants.
- **Change:** `class-level` — keep the variant mapping and add `className={cn(a.status === 'paired' && 'border-primary/40 bg-primary/10 text-primary')}` on the `Badge` at `:196-199` (replacing the `gap-1` override, F13). Adding a `paired`/`primary` tint variant to the primitive is `out-of-shard: src/shared/ui/badge.tsx`.

### shard-012-F41 · should · medium · type
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:308` — `<span className="truncate text-sm font-semibold md:text-base" title={groupKey}>`
- **Rule:** design-system §2 "15 `text-[15px]` 600, mono — Truck-drawer plate" | §13 D-T9 "Responsive text: Dash fixed px except h1"
- **Current:** the group headline (a plate or driver name) steps `text-sm`→`md:text-base`, sans.
- **Expected:** a fixed size; for a plate the drawer headline `font-mono text-[15px] font-semibold` (`dashboard.tsx:843`); for a driver name the same size in sans with `dir="auto"`.
- **Change:** `class-level` — `:308` → `cn('truncate text-[15px] font-semibold', grouping === 'vehicle' && 'font-mono tabular-nums')` and add `dir="auto"` when `grouping === 'driver'`.

### shard-012-F42 · should · high · colour
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:284` — `!alwaysOpen && 'cursor-pointer select-none transition-colors hover:bg-muted/40'`
- **Rule:** design-system §14 C-C4 "`hover:bg-muted/50` on content rows/cards" | §13 D-C3 "Row hover: Dash `bg-muted/50`; Trips `bg-muted/40`"
- **Current:** `hover:bg-muted/40`.
- **Expected:** `hover:bg-muted/50` (`dashboard.tsx:425`).
- **Change:** `class-level` — `hover:bg-muted/40` → `hover:bg-muted/50`.

### shard-012-F43 · blocker · high · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:283` — `'border-b bg-card p-3 md:p-4',`
- **Rule:** design-system §14 C-B1 "ring everywhere; `ring-inset` only inside `overflow-hidden`" | vercel-rules "Focus States" bullet "Interactive elements need visible focus" | vercel-rules "Accessibility" bullet "`<button>` for actions … (not `<div onClick>`)"
- **Current:** the collapsible header is a `div role="button" tabIndex=0` with keyboard handling but no focus-visible ring, inside an `overflow-hidden` Card.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` (KPI card face, `dashboard.tsx:431`).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` to the base class at `:283`. A `<button>` swap is not possible without nesting the export button (interactive inside interactive), so the `div role=button` stays.

### shard-012-F44 · should · medium · spacing
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:283` — `'border-b bg-card p-3 md:p-4'`
- **Rule:** design-system §1 "12px `p-3` … KPI card padding, panel body padding" | §14 C-S2 "The `md:px-4` bump exists only because fuel rows are flush"
- **Current:** header block `p-3 md:p-4` (also skeleton `:528`, `:539`).
- **Expected:** `p-3` at every width (`dashboard.tsx:425`); the `md:px-4` bump belongs to flush list rows only (`:408` already has it correctly).
- **Change:** `class-level` — `p-3 md:p-4` → `p-3` at `:283`, `:528`, `:539`.

### shard-012-F45 · blocker · high · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:338` — `className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"`
- **Rule:** design-system §14 C-B1 (ring everywhere) | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** raw icon button with no focus ring.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`button.tsx`).
- **Change:** `class-level` — append the ring classes at `:338`.

### shard-012-F46 · should · high · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:338` — `rounded text-muted-foreground … hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40`
- **Rule:** design-system §5.1 "`ghost` `hover:bg-accent hover:text-accent-foreground`" + "Button … `rounded-md` … `disabled:opacity-50`" | §14 C-C4 "`hover:bg-accent` on chrome and menu items" | §4 "`rounded` (4px): category bar track+fill, kbd chips"
- **Current:** 4px radius, `hover:bg-muted` (calendar-day hover), `opacity-40` disabled.
- **Expected:** ghost-button recipe at the popover-internal size: `rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50` (`button.tsx:11-24`, C-B3 `h-7 w-7`).
- **Change:** `class-level` — `:338` → `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50` (+ ring from F45).

### shard-012-F47 · should · medium · motion
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:342` — `<Loader2 className="h-3.5 w-3.5 animate-spin" />`
- **Rule:** design-system §8 "Looping: `animate-pulse` on skeletons and on the live/connecting badge dot, both with `motion-reduce:animate-none` (C-M2) … Nothing else loops; the `RefreshCw` retry icon never spins" | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** an unguarded spinning icon during export (D-ST4).
- **Expected:** at minimum the reduced-motion guard the reference puts on every loop.
- **Change:** `class-level` — `animate-spin` → `animate-spin motion-reduce:animate-none`. (Replacing the spinner with the static icon + `disabled` state would match the reference fully; left to the fixer.)

### shard-012-F48 · should · high · motion
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:354` — `'h-4 w-4 shrink-0 text-muted-foreground transition-transform',`
- **Rule:** design-system §14 C-M1 "→ Ruling: `duration-200` for every chevron/collapse/icon transition" | §5.2 KPI card "`ChevronDown h-3 w-3 transition-transform` → `rotate-180`" | §13 D-L3
- **Current:** 16px chevron, default 150ms.
- **Expected:** `h-3 w-3 transition-transform duration-200` (`dashboard.tsx:431`, post-ruling).
- **Change:** `class-level` — `:354` → `'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200'`; add `aria-hidden` (§9).

### shard-012-F49 · should · high · loading/empty/error
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:387` — `<div className="flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">`
- **Rule:** design-system §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground` (with `px-3` where the parent has no padding)" | §7 "Fuel error / empty `px-3 py-6 text-center text-xs text-muted-foreground`"
- **Current:** `px-4 py-8` with a 24px `FilterX` icon above the copy.
- **Expected:** `px-3 py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:605-608`).
- **Change:** `class-level` — `:387` → `px-3 py-6 text-center text-xs text-muted-foreground`; the icon at `:388` may stay (no rule) but should be `aria-hidden`.

### shard-012-F50 · blocker · high · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:408` — `className="grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-3 py-2.5 text-start transition-colors hover:bg-muted/50 md:px-4"`
- **Rule:** design-system §14 C-B1 "`ring-inset` only inside `overflow-hidden`" | §5.2 fuel row "`focus-visible:ring-inset`" | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** the row button (inside an `overflow-hidden` Card) has every class of the reference fuel row except the focus ring.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` (`dashboard.tsx:616`).
- **Change:** `class-level` — append those four classes at `:408`.

### shard-012-F51 · should · medium · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:401` — `<button type="button" onClick={() => navigate(\`/fuel-events/${e.ID}\`, { state: { from: … } })}`
- **Rule:** design-system §5.2 "Fuel-event row: `<Link … >` carrying `state.from` for back-navigation" | vercel-rules "Navigation & State" bullet "Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)" | vercel-rules "Accessibility" bullet "`<a>`/`<Link>` for navigation"
- **Current:** navigation through a `<button onClick={navigate}>`; the flat table's `onRowClick` (`:215`) navigates the same way (DataTable is out of shard).
- **Expected:** `<Link to=… state={{ from }} …>` with the identical classes (`dashboard.tsx:609-617`).
- **Change:** `structural` — swap the `<button type="button" onClick=…>` for `<Link to={\`/fuel-events/${e.ID}\`} state={{ from: … }}>` keeping `{...intentProps(...)}` and the className unchanged; import `Link` from `react-router-dom`.

### shard-012-F52 · blocker · medium · type
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:486` — `<span className="ms-1 text-[10px] text-muted-foreground">({t('fuelEvents.efficiency.excluded')})</span>`
- **Rule:** design-system §14 C-T3 "the 9.5px in-row tag becomes a chip" + C-S7 "one gap, no extra margin — tag `ms-1` removed" | §5.3 "In-row tag: `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium`"
- **Current:** a bare 10px parenthesised tag with an extra `ms-1` beside the rate.
- **Expected:** the neutral chip (`dashboard.tsx:637`), spaced by the parent's gap.
- **Change:** `class-level` — wrap the rate span's contents in `inline-flex items-center gap-1.5` and make `:486` `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground` (drop `ms-1`, keep the parentheses out: chip text is the label alone).

### shard-012-F53 · should · high · loading/empty/error
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:530` — `<Skeleton className="h-5 flex-1" />`
- **Rule:** design-system §14 C-R2 "text bars `rounded-sm`, flush list rows `rounded-none`" | §7 KPI drawer pending "`Skeleton h-3.5 rounded-sm`"
- **Current:** text-bar skeletons (`:530`, `:534-536`) at default `rounded-md`; the body stand-in `:540` `h-14 w-full` at `rounded-md` for a flush `divide-y` list.
- **Expected:** `rounded-sm` for bars, `h-10 rounded-none` rows for the list (`dashboard.tsx:456,599-604`).
- **Change:** `class-level` — add `rounded-sm` to `:530`, `:534`, `:535`, `:536`; `:540` → `h-10 w-full rounded-none` (and drop the wrapper padding at `:539` to `p-3`, F44).

### shard-012-F54 · nit · medium · buttons & controls
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:315` — `rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary`
- **Rule:** design-system §5.3 "neutral chips are `px-2 py-0.5 text-[10.5px] font-medium`" (C-T3) | §3 paired = `bg-primary/10 text-primary`
- **Current:** paired-count pill at `px-1.5 text-[10px]` with a `h-2.5` icon.
- **Expected:** chip recipe `px-2 py-0.5 text-[10.5px] font-medium` with the wash it already has; icon `h-3 w-3` as the other in-row `Link2` (`:200`, `:428`).
- **Change:** `class-level` — `px-1.5 py-0.5 text-[10px]` → `px-2 py-0.5 text-[10.5px]`; `:316` `h-2.5 w-2.5` → `h-3 w-3`; count `font-mono tabular-nums`.

### shard-012-F55 · nit · medium · colour
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:114` — `cell: ({ row }) => row.original.driver_name || '—',`
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`" | §13 D-C11
- **Current:** bare `'—'` here and in `fuel-event-details.tsx:49` (`value ?? '—'`).
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`).
- **Change:** `class-level` — `:114` → `row.original.driver_name || <span className="opacity-40">—</span>`; `fuel-event-details.tsx:49` → `{value ?? <span className="opacity-40">—</span>}`.

### shard-012-F56 · should · high · radius/border/shadow
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:279` — `<Card className="flex flex-col overflow-hidden">`
- **Rule:** design-system §4 "Cards are `border bg-card` with **no shadow**" | §13 D-R1 (dashboard wins)
- **Current:** `Card` primitive `shadow-sm` on every group card and skeleton (`:279`, `:527`).
- **Expected:** no shadow (`dashboard.tsx:135`).
- **Change:** `class-level` — add `shadow-none` at `:279` and `:527`. Primitive fix is `out-of-shard: src/shared/ui/card.tsx`.

### shard-012-F57 · should · medium · RTL/i18n/a11y
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:422` — `<span className="truncate">{e.driver_name}</span>`
- **Rule:** design-system §9 "Bidi text: `dir="auto"` on free-text labels and mixed values"
- **Current:** driver names (`:422`, `:114`) have no `dir`.
- **Expected:** `dir="auto"` on free text (`dashboard.tsx:498`).
- **Change:** `class-level` (additive) — add `dir="auto"` at `:422`; wrap `:114` in `<span dir="auto" className="truncate">`.

### shard-012-F58 · nit · low · spacing
- **Where:** `src/widgets/fuel-events-table/fuel-events-table.tsx:601` — `grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3`
- **Rule:** design-system §0.4 "Breakpoints in use: `sm` 640, `md` 768, `lg` 1024" | §13 D-S9 "adds `xl`"
- **Current:** the card grid (and its skeleton `:577`) introduces `xl` (1280).
- **Expected:** `lg:grid-cols-3` (`dashboard.tsx:134,359` use `lg` for the widest step).
- **Change:** `class-level` — `xl:grid-cols-3` → `lg:grid-cols-3` at `:577` and `:601`. Low confidence: `PageShell` has no `max-w` cap, so three columns at 1024 may be tight — the fixer may keep `xl` and note it.

## Summary
FINDINGS: 58 (blocker 16 / should 35 / nit 7)
