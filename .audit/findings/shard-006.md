# Findings — shard-006

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/entities/dashboard/api.ts` | 141 | no UI content | data fetch/decode only |
| `src/entities/dashboard/queries.ts` | 139 | no UI content | query hooks, no JSX/classes |
| `src/entities/dashboard/schemas.ts` | 231 | no UI content | zod schemas |
| `src/pages/dashboard/dashboard.tsx` | 1038 | reference — not audited | — |
| `src/entities/driver/api.ts` | 106 | no UI content | data only |
| `src/entities/driver/queries.ts` | 199 | no UI content | mutation hooks call `toast.success/error` via `t()` — toasts are provisional (§12.6 / D-ST3), no dashboard rule; no rule |
| `src/entities/driver/schemas.ts` | 103 | no UI content | zod schemas |
| `src/entities/driver-analytics/api.ts` | 18 | no UI content | data only (module never imported per PLAN) |
| `src/entities/driver-analytics/queries.ts` | 27 | no UI content | query hook |
| `src/entities/driver-analytics/schemas.ts` | 107 | no UI content | zod schemas |
| `src/pages/driver-detail/driver-detail.tsx` | 259 | audited | Page frame, title size and children gap come from `PageShell` (out-of-shard: `shared/ui/page-shell.tsx`, §13 D-S1/D-T1) — not flagged here. Tabs (§12.3), ConfirmDialog (§12.6) and Dialog width `max-w-2xl` (§12.6) are provisional patterns and match trips; no rule. Badge icons `h-3 w-3` inside a Badge: no rule. `driver.transporter \|\| 'Apex'` is a brand name, not copy: no rule. |

## Findings
### shard-006-F01 · blocker · high · a11y
- **Where:** `src/pages/driver-detail/driver-detail.tsx:130` — `<ShieldCheck className="h-3 w-3" />` (also `:88`, `:101`, `:109`, `:140`, `:144`, `:150`, `:154`, `:160`, `:171`, `:184`, `:186`, `:198`, `:200`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`" | design-system §9 "`aria-hidden` on dots/chevrons/severity bars/sentinel"
- **Current:** every lucide icon on the page (page icon, badge icons, button icons, banner icon, spinners) renders without `aria-hidden`; those beside visible text are announced as empty SVGs.
- **Expected:** decorative glyphs carry `aria-hidden="true"` as the dashboard does on its dots/chevrons (`dashboard.tsx:424`, `:733`, `:756`).
- **Change:** `class-level` (additive attribute) — add `aria-hidden="true"` to each icon element listed. For the icons inside the action Buttons see F02: they stay decorative once the button has an accessible name.
- **Notes:** additive only; no props or branches removed.

### shard-006-F02 · blocker · medium · a11y
- **Where:** `src/pages/driver-detail/driver-detail.tsx:143-146` — `<Button variant="outline" size="sm" onClick={() => navigate('/drivers')}><ArrowLeft … /><span className="hidden sm:inline">` (also `:149-152`, `:153-156`)
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`" | design-system §9 "aria-labels and sr-only text all go through `t()`" (C-I4)
- **Current:** below `sm` the label span is `display:none`, so Back / Edit / Delete become icon-only buttons with no accessible name.
- **Expected:** an icon-only control always has a translated `aria-label` (reference: `header.tsx:21` `common.openMenu`, `theme-toggle.tsx:25`).
- **Change:** `class-level` (additive attribute) — add `aria-label={t('common.back')}`, `aria-label={t('common.edit')}`, `aria-label={t('common.delete')}` to the three Buttons (keys already exist and are used for the visible text). Alternatively replace `hidden sm:inline` with `sr-only sm:not-sr-only` on the label spans.
- **Notes:** the `hidden sm:inline` pattern is provisional (§12.1) and may be kept; only the accessible name is missing.

### shard-006-F03 · blocker · medium · colour / radius
- **Where:** `src/pages/driver-detail/driver-detail.tsx:169` — `rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs sm:flex-row sm:items-center sm:gap-3`
- **Rule:** design-system §14 C-C3 "→ Ruling: `border-warning/40`" | §7 DegradedStrip "`flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`" | §10 "Strip" recipe | §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"; §13 D-C8 records this trips-derived banner as a deviation (dashboard wins)
- **Current:** a warning strip with actions built as the trips banner — `rounded-md`, solid `border-warning/30`, `bg-warning/5`, `p-2.5`, `text-xs`, body `text-muted-foreground`.
- **Expected:** the dashboard's one attention-strip-with-action (`dashboard.tsx:1018-1047`): `rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`, icon `mt-0.5 h-3.5 w-3.5 shrink-0 text-warning`, message `min-w-0`.
- **Change:** `class-level` — line 169: `rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs` → `rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`; keep `flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3`. Line 172: drop `text-muted-foreground` on the message span (the strip's copy is foreground) and add `min-w-0`.
- **Notes:** the code comment says "styled to match fuel-events paired banner" — that banner is out-of-shard (`widgets/fuel-event-form` / `pages/fuel-events`) and will be graded in its own shard; the reference for this role is the DegradedStrip.

### shard-006-F04 · should · high · buttons
- **Where:** `src/pages/driver-detail/driver-detail.tsx:181` — `className="h-8"` (also `:195`)
- **Rule:** design-system §5.1 "popover-internal and in-strip buttons are `h-7 text-xs` (… the DegradedStrip retry `h-7 px-2.5 gap-1.5 text-xs`)" (C-B3) | §14 C-B3 "→ Ruling: … popover-internal buttons `h-7 text-xs`"
- **Current:** Approve/Reject inside the warning strip are `size="sm"` (h-8 px-3 text-xs) with an explicit `h-8`.
- **Expected:** in-strip buttons `h-7 px-2.5 gap-1.5 text-xs` (`dashboard.tsx:1041`).
- **Change:** `class-level` — `className="h-8"` → `className="h-7 px-2.5 gap-1.5"` on both Buttons (lines 181, 195).
- **Notes:** variants (`default` / `destructive`) are left alone; no rule assigns a variant to approve/reject.

### shard-006-F05 · should · high · loading
- **Where:** `src/pages/driver-detail/driver-detail.tsx:87` — `<Skeleton className="h-8 w-48" />` (also `:91` `h-32`, `:92` `h-64`)
- **Rule:** design-system §14 C-R2 "→ Ruling: a skeleton takes the radius of the box it stands in: cards `rounded-lg`, text bars `rounded-sm`, flush list rows `rounded-none`" | §10 "Skeleton … cards h-[92px]/h-40 rounded-lg · text bars h-3.5 rounded-sm"
- **Current:** all three skeletons use the primitive default `rounded-md` (10px): a title bar and two card-sized blocks.
- **Expected:** title bar `rounded-sm`, card blocks `rounded-lg` (`app/router/index.tsx` fallback: title bars `rounded-sm`, panels `rounded-lg`; `dashboard.tsx:126`, `:162`).
- **Change:** `class-level` — `:87` `h-8 w-48` → `h-8 w-48 rounded-sm`; `:91` `h-32` → `h-32 rounded-lg`; `:92` `h-64` → `h-64 rounded-lg`.
- **Notes:** —

### shard-006-F06 · should · medium · loading
- **Where:** `src/pages/driver-detail/driver-detail.tsx:90` — `<div className="mx-auto w-full max-w-4xl space-y-4">`
- **Rule:** design-system §14 C-S6 "fallback mirrors the … frame … so the layout doesn't reflow when the real page mounts" | §7 "Loading is always the `Skeleton` primitive shaped like the slot" | §1 "gap-3 … gap between every top-level block"
- **Current:** the loading frame is a `max-w-4xl` column with `space-y-4`, whereas the loaded page renders full-width `PageShell` children (banner strip + `TabsList h-9` + tab body) with no `max-w`; on load the content jumps wider and the rhythm changes from 16px to the shell's.
- **Expected:** a skeleton frame that mirrors the mounted layout: no extra `max-w`, a `h-9 w-72 rounded-lg` bar standing in for the TabsList, then a `rounded-lg` panel block; blocks spaced with the page's `gap-3` step (`app/router/index.tsx:96-115`, `dashboard.tsx:123-128`).
- **Change:** `class-level` — `mx-auto w-full max-w-4xl space-y-4` → `flex w-full flex-col gap-3`; replace the `h-32` block with `<Skeleton className="h-9 w-72 rounded-lg" />` (tab tray footprint) and keep the `h-64 rounded-lg` panel block.
- **Notes:** the shell-level page gap (`gap-6`) is set by `PageShell` (out-of-shard: `shared/ui/page-shell.tsx`, D-S1); only the inner frame is proposed here.

### shard-006-F07 · should · medium · type
- **Where:** `src/pages/driver-detail/driver-detail.tsx:123` — `text-xs text-muted-foreground`
- **Rule:** design-system §2 "11.5 `text-[11.5px]` … Page subtitle (range · company · updated)" | §13 D-T2 "Page subtitle — Dash `text-[11.5px]`, Trips `text-sm`" (dashboard wins)
- **Current:** the subtitle line (ID · transporter · status pill) is `text-xs` (12/16).
- **Expected:** the page-subtitle role is `text-[11.5px] text-muted-foreground` (`dashboard.tsx:106`).
- **Change:** `class-level` — `text-xs` → `text-[11.5px]` on the description span.
- **Notes:** `PageShell` wraps the description in its own `text-sm` (out-of-shard, D-T2); this span already overrides it, so the change is local.

### shard-006-F08 · should · high · motion
- **Where:** `src/pages/driver-detail/driver-detail.tsx:184` — `<Loader2 className="h-3.5 w-3.5 animate-spin" />` (also `:198`)
- **Rule:** design-system §14 C-M2 "→ Ruling: `motion-reduce:animate-none` on the Skeleton primitive" | §8 "Looping: `animate-pulse` … both with `motion-reduce:animate-none`" | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"; §13 D-ST4 records the unguarded spinner as a trips deviation
- **Current:** the pending spinners loop unconditionally.
- **Expected:** every looping animation in the reference carries `motion-reduce:animate-none` (`dashboard.tsx:227`, `skeleton.tsx`).
- **Change:** `class-level` — `animate-spin` → `animate-spin motion-reduce:animate-none` on both Loader2 icons.
- **Notes:** —

### shard-006-F09 · should · high · navigation
- **Where:** `src/pages/driver-detail/driver-detail.tsx:143` — `<Button variant="outline" size="sm" onClick={() => navigate('/drivers')}>` (also `:108`)
- **Rule:** vercel-rules "Navigation & State" bullet "Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)" | "Anti-patterns" bullet "Inline `onClick` navigation without `<a>`" | design-system §5.2 "Fuel-event row `<Link …>` … navigation"
- **Current:** the two Back controls navigate imperatively from a `<button>`; no href, so modifier-click/middle-click and link semantics are lost.
- **Expected:** navigation is a `<Link>` (`dashboard.tsx:611-617`, `:936-941`).
- **Change:** `structural` — render the Button `asChild` around `<Link to="/drivers">…</Link>` (keep the `onClick` prop on the Link so the handler is not deleted), at lines 108 and 143.
- **Notes:** `Button` supports `asChild` (shadcn cva primitive, reference `button.tsx`); the `navigate` handler stays in place.

### shard-006-F10 · nit · high · badges
- **Where:** `src/pages/driver-detail/driver-detail.tsx:129` — `<Badge variant="success" className="gap-1">` (also `:134`, `:159`)
- **Rule:** design-system §5.3 "Badge primitive — same recipe as the ConnectionBadge: `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium`" (C-T3)
- **Current:** each Badge overrides the primitive's `gap-1.5` to `gap-1`.
- **Expected:** the primitive's 6px icon gap (`badge.tsx:5-20`, `dashboard.tsx:216-249`).
- **Change:** `class-level` — remove `className="gap-1"` (or change to `gap-1.5`) on the three Badges.
- **Notes:** —

### shard-006-F11 · nit · high · buttons
- **Where:** `src/pages/driver-detail/driver-detail.tsx:109` — `<ArrowLeft className="h-4 w-4 rtl:rotate-180" />` (also `:144`, `:150`, `:154`, `:184`, `:186`, `:198`, `:200`)
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … so icons inside a Button carry no size classes" | §15.4 "the dead `h-3 w-3` / `h-5 w-5` overrides … were removed so code matches reality"
- **Current:** icons inside Buttons carry `h-4 w-4` (no-op) and `h-3.5 w-3.5` (dead — `[&_svg]:size-4` wins, so the spinners and shields render at 16px anyway).
- **Expected:** no size classes on icons inside a Button (`dashboard.tsx:1043`, `header.tsx:23`).
- **Change:** `class-level` — drop `h-4 w-4` / `h-3.5 w-3.5` from the eight icons; keep `rtl:rotate-180` and `animate-spin`.
- **Notes:** purely cosmetic in code; rendered size does not change.

### shard-006-F12 · nit · medium · type
- **Where:** `src/pages/driver-detail/driver-detail.tsx:124` — `<span className="tabular-nums">#{driver.ID}</span>`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values … kbd hints"
- **Current:** the identifier is sans with `tabular-nums` only.
- **Expected:** identifiers/figures are `font-mono tabular-nums` (`dashboard.tsx:744`, `:843`).
- **Change:** `class-level` — `tabular-nums` → `font-mono tabular-nums`.
- **Notes:** `font-mono` is already tabular per §0.1; keeping `tabular-nums` is harmless.

## Summary
FINDINGS: 12 (blocker 3 / should 6 / nit 3)
