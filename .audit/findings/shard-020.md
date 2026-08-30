# Findings — shard-020

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/entities/trip-audit/api.ts` | 136 | no UI content | axios wrappers + zod parse; no JSX/classes |
| `src/entities/trip-audit/defaults.ts` | 49 | no UI content | filter defaults + localStorage read |
| `src/entities/trip-audit/index.ts` | 3 | no UI content | barrel (never imported per PLAN.md) |
| `src/entities/trip-audit/queries.ts` | 176 | no UI content | hooks without JSX. Note (not a finding — no classes to change): mutations use Sonner `toast.*` (`:101`, `:122`, `:132`) — §7 "never a toast" vs §13 D-ST3 (feedback channel, owner to rule); all toast copy goes through `t()` |
| `src/entities/trip-audit/schemas.ts` | 369 | no UI content | zod schemas |
| `src/pages/trip-audit/trip-audit.tsx` | 532 | audited | no rule: hero KPI spanning `sm:col-span-2` / 1.5fr column; `PopoverContent w-[340px] space-y-4` (C-B6 lets call sites size to content); `SearchInput min-w-[180px] max-w-xs`; `NativeSelect` primitive itself is out-of-shard (`shared/ui/native-select.tsx`); `PageShell`/`Tabs`/`TripsPagination` internals are out-of-shard |

## Findings
### shard-020-F01 · should · high · spacing
- **Where:** `src/pages/trip-audit/trip-audit.tsx:234` — `<div className="space-y-5">`
- **Rule:** design-system §1 "12px … gap between every top-level block" | §13 row D-S4
- **Current:** top-level blocks (KPI strip, toolbar, queue, pagination) stacked with `space-y-5` (20px)
- **Expected:** `gap-3` between top-level blocks (`dashboard.tsx:99` `flex … flex-col gap-3`)
- **Change:** `class-level` — `space-y-5` → `space-y-3` (or `flex flex-col gap-3`)
- **Notes:** the inner toolbar wrapper at `:244` already uses `gap-3`; keep it.

### shard-020-F02 · should · high · spacing
- **Where:** `src/pages/trip-audit/trip-audit.tsx:435` — `grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_…]`
- **Rule:** design-system §1 "KPI row: `grid grid-cols-2 gap-3`" | §13 row D-S5
- **Current:** KPI grid gap `gap-2.5` (10px)
- **Expected:** `gap-3` (`dashboard.tsx:359`)
- **Change:** `class-level` — `gap-2.5` → `gap-3`
- **Notes:** column template (hero 1.5fr) has no rule; leave it.

### shard-020-F03 · should · high · spacing
- **Where:** `src/pages/trip-audit/trip-audit.tsx:439` — `rounded-lg border p-4 sm:col-span-2 lg:col-span-1` and `:526` — `rounded-lg border bg-card p-4`
- **Rule:** design-system §1 "12px … KPI card padding" | §10 "KPI card … button.block.w-full.p-3" | §13 row D-S3
- **Current:** hero card and `KpiTile` use `p-4` (16px)
- **Expected:** `p-3` (`dashboard.tsx:425`)
- **Change:** `class-level` — `p-4` → `p-3` at both sites

### shard-020-F04 · should · high · type
- **Where:** `src/pages/trip-audit/trip-audit.tsx:446` — `<p className="text-xs font-medium text-muted-foreground">` and `:527` — `<p className="text-xs text-muted-foreground">{label}</p>`
- **Rule:** design-system §2 "10px … Eyebrow: KPI label … `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`" | §6 "KPI card: `dt` eyebrow (`mb-1.5` …)"
- **Current:** KPI labels are 12px sans, medium/regular, no uppercase, no bottom margin
- **Expected:** `mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (`dashboard.tsx:427`, `:382`)
- **Change:** `class-level` — `:446` `text-xs font-medium text-muted-foreground` → `mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; `:527` `text-xs text-muted-foreground` → same
- **Notes:** once `mb-1.5` is on the label, drop `mt-0.5` from the value below (see F05/F06). Arabic labels: the eyebrow rule notes Arabic plates skip `uppercase`; `uppercase` is a no-op on Arabic text, so keep the class.

### shard-020-F05 · should · high · type
- **Where:** `src/pages/trip-audit/trip-audit.tsx:451` — `'mt-0.5 text-3xl font-bold tabular-nums leading-tight'`
- **Rule:** design-system §2 "22 `text-[22px]` 600, `leading-none`, mono + `tabular-nums` — KPI value"; "700 is never used" | §13 row D-T7, D-T8
- **Current:** hero figure is 30px sans, weight 700, `leading-tight`
- **Expected:** `font-mono text-[22px] font-semibold leading-none tabular-nums` (`dashboard.tsx:436`)
- **Change:** `class-level` — `mt-0.5 text-3xl font-bold tabular-nums leading-tight` → `font-mono text-[22px] font-semibold leading-none tabular-nums`
- **Notes:** Plex Mono is not loaded at 700, so `font-bold` here would also fall back to a synthesised bold if it stayed. The colour on the same line is F09.

### shard-020-F06 · should · high · type
- **Where:** `src/pages/trip-audit/trip-audit.tsx:528` — `mt-0.5 truncate text-xl font-semibold tabular-nums`
- **Rule:** design-system §2 "22 `text-[22px]` 600, `leading-none`, mono + `tabular-nums` — KPI value" | §13 row D-T7
- **Current:** tile value 20px sans
- **Expected:** `font-mono text-[22px] font-semibold leading-none tabular-nums` (`dashboard.tsx:436`)
- **Change:** `class-level` — `mt-0.5 truncate text-xl font-semibold tabular-nums` → `truncate font-mono text-[22px] font-semibold leading-none tabular-nums`
- **Notes:** the "Excess distance" value is a translated string (`+{{km}} km`) — mono is still correct, digits dominate. `truncate` kept (Vercel Content Handling).

### shard-020-F07 · should · high · type
- **Where:** `src/pages/trip-audit/trip-audit.tsx:457` — `mt-0.5 truncate text-[11px] text-muted-foreground` and `:529` — `mt-0.5 truncate text-[11px] text-muted-foreground`
- **Rule:** design-system §2 "11.5 … KPI detail line" and §14 C-T4 "11.5px under a figure/title, 11px under a row label" | §6 "`p` detail `mt-1.5 min-h-[17px] text-[11.5px]` — the min-height keeps cards equal when detail is empty"
- **Current:** detail line under the KPI figure at 11px, 2px top margin, no min-height (tiles with no `sub` are shorter)
- **Expected:** `mt-1.5 min-h-[17px] text-[11.5px] text-muted-foreground` (`dashboard.tsx:442`)
- **Change:** `class-level` — both sites `mt-0.5 truncate text-[11px] text-muted-foreground` → `mt-1.5 min-h-[17px] truncate text-[11.5px] text-muted-foreground`. To honour the min-height when `sub` is absent, render the `<p>` unconditionally (`{sub}` inside it) — additive, no branch removed.

### shard-020-F08 · should · medium · colour
- **Where:** `src/pages/trip-audit/trip-audit.tsx:441` — `'border-success/30 bg-success/5'` / `:442` — `'border-primary/30 bg-primary/5'`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … 10% tint + 40% border" | §13 row D-C6
- **Current:** hero card tinted at 5% fill / 30% border
- **Expected:** 10% fill / 40% border (`dashboard.tsx:221`, `:1031`)
- **Change:** `class-level` — `border-success/30 bg-success/5` → `border-success/40 bg-success/10`; `border-primary/30 bg-primary/5` → `border-primary/40 bg-primary/10`
- **Notes:** the whole-card navy wash is the dashboard's *selected* tile recipe (`bg-primary/10`); acceptable here since the card holds the page's CTA. Also flagged: the tab count pill in F23.

### shard-020-F09 · should · medium · colour
- **Where:** `src/pages/trip-audit/trip-audit.tsx:452` — `allClear ? 'text-success' : 'text-primary'`
- **Rule:** design-system §3 "Actionable (navy) … navy marks anything you can act on" and §2 "KPI value (+ `text-money` when money)" — dashboard KPI figures are plain foreground
- **Current:** the pending count is painted navy (not actionable — the Button beside it is) or green
- **Expected:** figure in default foreground (`dashboard.tsx:436` — no colour class unless money); the card tint (F08) and the CTA already carry the state
- **Change:** `class-level` — remove `text-primary` from the figure; `text-success` on the zero state is a passing status and may stay (§3 "Success … passing status only"), so `allClear ? 'text-success' : ''`
- **Notes:** judgment call on `text-success` — keep it; the "all clear" number is literally a passing status.

### shard-020-F10 · should · medium · loading/empty/error
- **Where:** `src/pages/trip-audit/trip-audit.tsx:455` — `pending != null ? formatNumber(pending) : loading ? '…' : '—'` (same pattern `:475`, `:490-493`, `:505-507`)
- **Rule:** design-system §7 "Loading is always the `Skeleton` primitive shaped like the slot" | §7 table "Apex pending … `Skeleton h-[92px] rounded-lg`"
- **Current:** while the summary loads, the KPI value slot shows a text ellipsis
- **Expected:** a skeleton in the slot (`dashboard.tsx:123-128`; text-bar variant `Skeleton h-3.5 rounded-sm` `:459-467`)
- **Change:** `structural` — keep the existing ternaries; in the `loading` branch render `<Skeleton className="h-[22px] w-16 rounded-sm" />` (import from `@/shared/ui/skeleton`) instead of the `'…'` string. No branch is removed — the string is replaced by an element.
- **Notes:** `Skeleton` already carries `motion-reduce:animate-none` (C-M2).

### shard-020-F11 · nit · medium · colour
- **Where:** `src/pages/trip-audit/trip-audit.tsx:221` — `{lastRun.status || '—'}`; `:455`, `:475`, `:493`, `:507` — `'—'`
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`" | §13 row D-C11
- **Current:** em dash at full strength
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`)
- **Change:** `class-level` — wrap each `'—'` fallback in `<span className="opacity-40">—</span>`

### shard-020-F12 · should · high · buttons
- **Where:** `src/pages/trip-audit/trip-audit.tsx:283` — `size="sm" className="h-9 gap-1.5"`
- **Rule:** design-system §5.1 "chrome rows are `h-8`" (C-B3) | §13 row D-B1 "`sm` raised to `h-9`"
- **Current:** Filters trigger forced to 36px in the toolbar row
- **Expected:** 32px toolbar controls (`scope-bar.tsx:66`, `header.tsx:18`; Button `sm` is already `h-8`)
- **Change:** `class-level` — drop `h-9` (→ `className="gap-1.5"`; see F17 for the gap)
- **Notes:** `SearchInput` beside it is an `h-9` Input (out-of-shard: `src/shared/ui/search-input.tsx`, `input.tsx`) — the row will be mixed-height until the primitives are ruled on; provisional §12.2 Input is `h-9`. Fixer may instead add `className="h-8"` to `SearchInput` if it forwards className to the Input — verify.

### shard-020-F13 · should · high · buttons
- **Where:** `src/pages/trip-audit/trip-audit.tsx:336-341` — `<Button variant="ghost" size="sm" className="w-full" onClick={resetSecondaryFilters}>`
- **Rule:** design-system §5.1 "popover-internal and in-strip buttons are `h-7 text-xs`" (C-B3)
- **Current:** ghost `sm` (h-8) inside the Filters popover
- **Expected:** `h-7 text-xs` (`scope-date-picker.tsx:132-136`, Cancel/Apply)
- **Change:** `class-level` — `className="w-full"` → `className="h-7 w-full text-xs"`

### shard-020-F14 · should · medium · buttons
- **Where:** `src/pages/trip-audit/trip-audit.tsx:356` — `<Button variant="outline" onClick={() => void matchesQuery.refetch()}>` and `:376` — `<Button variant="outline" onClick={() => setView('all')}>`
- **Rule:** design-system §5.1 "outline … DegradedStrip retry (the dashboard page's only `<Button>`)" with `size=sm`; §13 row D-B4 "outline default `h-9` in dialogs"
- **Current:** default-size (h-9) outline buttons as the retry / empty-state CTA
- **Expected:** the reference retry is `Button variant="outline" size="sm"` (`dashboard.tsx:1041`)
- **Change:** `class-level` — add `size="sm"` to both
- **Notes:** the in-strip `h-7` override is specific to the strip; inside `EmptyState` `sm` (h-8) is the closest defined step.

### shard-020-F15 · should · medium · type
- **Where:** `src/pages/trip-audit/trip-audit.tsx:299` and `:319` — `<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">`
- **Rule:** design-system §2 "10 `text-[10px]` 600, `uppercase tracking-wider text-muted-foreground` — Eyebrow … one label style above every figure and panel" | §13 row D-T3 (dialog h4 `text-xs`)
- **Current:** popover section headings at 12px
- **Expected:** `text-[10px]` (`dashboard.tsx:427`, `sidebar.tsx:204`)
- **Change:** `class-level` — `text-xs` → `text-[10px]` at both sites
- **Notes:** provisional (§12.3) shows trips at `text-xs` for the same heading; the dashboard rule wins. See F20 for the element type.

### shard-020-F16 · should · medium · motion
- **Where:** `src/pages/trip-audit/trip-audit.tsx:210` — `<Loader2 className="h-4 w-4 animate-spin" />`
- **Rule:** design-system §8 "Reduced motion: … opt-out is per element (`motion-reduce:animate-none` …)" (C-M2) | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`" | §13 row D-ST4 "(no motion-reduce guard)"
- **Current:** spinner loops with no reduced-motion opt-out
- **Expected:** every looping animation carries `motion-reduce:animate-none` (`dashboard.tsx:227`, `skeleton.tsx`)
- **Change:** `class-level` — `animate-spin` → `animate-spin motion-reduce:animate-none`
- **Notes:** the spinner-in-button itself is allowed by provisional §12.6 ("`Loader2 animate-spin` replaces the leading icon on pending buttons").

### shard-020-F17 · nit · high · buttons
- **Where:** `src/pages/trip-audit/trip-audit.tsx:210` `Loader2 className="h-4 w-4 …"`, `:212` `Radar className="h-4 w-4"`, `:285` `Filter className="h-3.5 w-3.5"`, `:465` `ClipboardCheck className="h-4 w-4"`; `:283` and `:464` `gap-1.5`
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes" (§15.4) | §13 row D-B8 "Outline sm gap/icon: `gap-2` + 16px vs `gap-1.5` + 14px"
- **Current:** dead per-icon size classes (the `h-3.5 w-3.5` on Filter is silently overridden to 16px); `gap-1.5` overrides the Button's `gap-2`
- **Expected:** no size class on the icon; Button's own `gap-2` (`button.tsx:7`, `dashboard.tsx:1043`)
- **Change:** `class-level` — remove `h-4 w-4` / `h-3.5 w-3.5` from the four icons (keep `animate-spin` on Loader2); `:283` `className="h-9 gap-1.5"` → `className=""` (with F12); `:464` `className="shrink-0 gap-1.5"` → `className="shrink-0"`; `:207` `className="gap-2"` is redundant but harmless

### shard-020-F18 · should · medium · loading/empty/error
- **Where:** `src/pages/trip-audit/trip-audit.tsx:352-360` — `{matchesQuery.isError ? (<EmptyState title={t('errors.generic', …)} action={…Retry…} />`
- **Rule:** design-system §7 "Failures are inline and persistent — a strip or muted copy in place"; "Apex error: KPI row replaced by `DegradedStrip` (message + retry …)" | §13 row D-ST2 "`EmptyState` + … `Button outline` (h-9) replacing list and pagination"
- **Current:** query error renders the 64px-padded dashed `EmptyState` (`py-16`, `text-lg` title) in place of the queue
- **Expected:** the strip recipe — §10 "Strip: `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` + Button outline sm `h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning`" with `AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning` (`dashboard.tsx:1018-1047`)
- **Change:** `structural` — keep the `isError` branch; replace the `EmptyState` element with a `<div role="status">` carrying the strip classes above, the `errors.generic` message in a `min-w-0` span, and the existing retry `Button` restyled `variant="outline" size="sm" className="h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning hover:text-warning"`. `DegradedStrip` is local to `dashboard.tsx` (not exported) — do not import it; reproduce the recipe inline.
- **Notes:** the strip's retry icon (`RefreshCw`) never spins (§8). If the owner rules D-ST2 in favour of `EmptyState`, only F14 applies.

### shard-020-F19 · nit · low · loading/empty/error
- **Where:** `src/pages/trip-audit/trip-audit.tsx:368-380` — `<EmptyState icon={<CheckCircle2 className="h-6 w-6 text-success" />} title={t('tripAudit.queue.caughtUp', …)}`
- **Rule:** design-system §7 "Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page" and §10 "Empty/error `px-3 py-6 text-center text-xs text-muted-foreground`" | §13 row D-ST1
- **Current:** "All caught up" uses the `EmptyState` primitive (`py-16`, `text-lg` title, CTA)
- **Expected:** `py-6 text-center text-xs text-muted-foreground` copy (`dashboard.tsx:180-183`)
- **Change:** `structural` — awaits the owner's ruling on D-ST1; no edit proposed now. If ruled for the dashboard: pass `empty={<p className="px-3 py-6 text-center text-xs text-muted-foreground">…</p>}` and move the "Browse all trips" Button after it (`Button variant="outline" size="sm"`). The rendering of `empty` happens in `widgets/trip-audit-queue` (out-of-shard: `src/widgets/trip-audit-queue`).

### shard-020-F20 · should · medium · RTL/i18n/a11y
- **Where:** `src/pages/trip-audit/trip-audit.tsx:299-301` — `<p …>{t('tripAudit.filters.status', 'Status')}</p>` above `<NativeSelect …>` and `:319-321` above the sort `NativeSelect`
- **Rule:** vercel-rules "Forms" bullet "Labels clickable (`htmlFor` or wrapping control)" | vercel-rules "Accessibility" bullet "Use semantic HTML (`<button>`, `<a>`, `<label>` …) before ARIA"
- **Current:** visible labels are `<p>` elements; the controls rely on `aria-label` only, so clicking the label does nothing
- **Expected:** a `<label htmlFor>` bound to the select (provisional §12.2: `Label` + control, `space-y-1`)
- **Change:** `structural` — swap each `<p>` for `<label htmlFor="trip-audit-status">` / `<label htmlFor="trip-audit-sort">` (same classes as after F15) and add the matching `id` to each `NativeSelect` (verify the primitive forwards `id`; out-of-shard: `src/shared/ui/native-select.tsx`). Keep the existing `aria-label` props.

### shard-020-F21 · should · medium · navigation & state
- **Where:** `src/pages/trip-audit/trip-audit.tsx:79` — `const [view, setView] = React.useState<QueueView>('needs_review');` (also `:86` search, `:89` status, `:91` sort, `:92` page)
- **Rule:** vercel-rules "Navigation & State" bullet "URL reflects state—filters, tabs, pagination, expanded panels in query params" | provisional (§12.7) "URL-synced list state with short keys (`?tab, q, md, rs, p, l`) written with `replace:true` starting from current params so global scope keys survive"
- **Current:** view, search, status, sort and page live only in component state; a reload or shared link drops them (date range/company are already in the URL via the global scope)
- **Expected:** query-param mirror as trips does (`trips.tsx:156-189`)
- **Change:** `structural` — additive: read initial values from `useSearchParams()` and write them back (`replace: true`, starting from the current params so the scope keys `co`, `d`, … survive). Keep all existing `useState` hooks and handlers. Suggested keys: `tab`, `q`, `st`, `sort`, `p` (check `shared/scope/use-scope.ts` for reserved keys before choosing — `q` and `p` are listed as global scope params in PLAN.md, so use `aq`/`ap` or similar).
- **Notes:** `limit` is already persisted to localStorage (`:103-105`) — leave it.

### shard-020-F22 · should · low · buttons
- **Where:** `src/pages/trip-audit/trip-audit.tsx:246-266` — `<Tabs value={view} …><TabsList>{VIEWS.map((v) => (<TabsTrigger …>`
- **Rule:** design-system §5.2 "Scope presets: `Button size="sm" h-7 text-xs`, `variant` flips `default`↔`outline`, `aria-pressed` — segmented choice by variant swap (C-B4)" | §13 row D-B2 "Segmented choice … Tabs tray `h-9 rounded-lg bg-muted p-1`"
- **Current:** the three queue views are a Radix `Tabs` tray (out-of-shard primitive, `h-9`, active `bg-background shadow`)
- **Expected:** the dashboard's segmented control — a row of `h-7 text-xs` Buttons with `aria-pressed` and variant swap (`scope-date-picker.tsx:132-136`)
- **Change:** `structural` — awaits the owner's ruling on D-B2 (provisional §12.3 explicitly allows in-page Tabs). If ruled for the dashboard: replace `Tabs/TabsList/TabsTrigger` with `<div role="group" className="flex flex-wrap gap-1.5">` of `<Button size="sm" className="h-7 text-xs" variant={view===v?'default':'outline'} aria-pressed={view===v} onClick={() => setView(v)}>`; keep the count pill (F23) inside the button.
- **Notes:** low confidence — extrapolating a preset picker to a view switcher; the trips module was accepted as the gap-fill for tabs.

### shard-020-F23 · nit · medium · colour
- **Where:** `src/pages/trip-audit/trip-audit.tsx:254-257` — `'inline-flex h-5 min-w-5 … rounded-full px-1.5 text-[11px] font-semibold tabular-nums', needsReviewCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-success/15 text-success'`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X`" | §13 row D-C6 (`X/15`) | provisional (§12.3) mobile filters count badge "`rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground`"
- **Current:** zero-state pill at `bg-success/15`; count pill at 11px
- **Expected:** `bg-success/10 text-success` (10% tint); count pill at `text-[10px]` per the provisional recipe it otherwise matches
- **Change:** `class-level` — `bg-success/15` → `bg-success/10`; `text-[11px]` → `text-[10px]`
- **Notes:** `font-semibold` and `tabular-nums` are fine (§2 figures are tabular).

## Summary
FINDINGS: 23 (blocker 0 / should 19 / nit 4)
