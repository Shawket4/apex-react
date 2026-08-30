# Findings — shard-007

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/driver-detail/documents-tab.tsx` | 453 | audited | no rule: label-above-value stack (`mb-1 text-xs text-muted-foreground` + `text-sm font-medium`); `Card`/`CardHeader` internal padding lives in `shared/ui/card.tsx` (out of shard, §13 D-S3); dialog zoom/rotate icon buttons at `size="icon"` (36px) — no rule for in-dialog control height |
| `src/widgets/driver-detail/financial-tab.tsx` | 95 | audited | — |
| `src/widgets/driver-detail/overview-tab.tsx` | 305 | audited | no rule: `StatCard` internals (out of shard, provisional §12.5); `DetailRow` icon+label+value stack |
| `src/widgets/driver-detail/pin-tab.tsx` | 152 | audited | no rule: `Tooltip` primitive; `tracking-[0.25em]` on a masked PIN; `toast.success` on copy (feedback for a clipboard action, not a data failure) |
| `src/entities/driver-expense/api.ts` | 23 | no UI content | — |
| `src/entities/driver-expense/queries.ts` | 65 | no UI content | toasts are `t()`-ed |
| `src/entities/driver-expense/schemas.ts` | 84 | audited | contains user-facing strings only (zod messages, category/method labels rendered verbatim) — see F24, F25 |
| `src/pages/driver-expenses/driver-expense-new.tsx` | 250 | audited | no rule: two-column form grid `gap-x-6 gap-y-4` (provisional §12.2 says `gap-4`; not flagged); actions row `border-t pt-4` vs provisional sticky footer (not flagged — dashboard has no form footer) |
| `src/pages/driver-expenses/driver-expenses.tsx` | 302 | audited | no rule: 5-column stat grid `lg:grid-cols-5` (provisional §12.5 pattern; §13 D-S5 records it as a trips deviation, not a shard file); `ConfirmDialog` internals (out of shard); `EmptyState` sizing matches the primitive |
| `src/widgets/driver-form/driver-form.tsx` | 221 | audited | no rule: `mode: 'onTouched'` validation timing (matches provisional §12.2 "shown only after blur") |
| `src/entities/driver-loan/api.ts` | 23 | no UI content | — |
| `src/entities/driver-loan/queries.ts` | 65 | no UI content | toasts are `t()`-ed |
| `src/entities/driver-loan/schemas.ts` | 54 | audited | user-facing zod messages only — see F25 |

## Findings

### shard-007-F01 · blocker · high · a11y/navigation
- **Where:** `src/widgets/driver-detail/financial-tab.tsx:67` — `role="button"` … `onClick={() => navigate(link.to)}`
- **Rule:** vercel-rules "Accessibility" bullet "`<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)"; "Navigation & State" bullet "Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)"; design-system §5.2 "Exception row `<Link class="grid … rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50 …">` — navigation"
- **Current:** a `Card` (`div`) with `role="button"`, `tabIndex`, `onClick` + `onKeyDown` navigating to `link.to`; no href, so no middle-click / open-in-new-tab / status-bar URL.
- **Expected:** navigation rows are `<Link to=…>` carrying the intent-prefetch props, as the dashboard's exception rows do (`dashboard.tsx:936-941`).
- **Change:** `structural` — render `<Link to={link.to} {...intentProps(…)} className="block rounded-lg border bg-card …">` around the card content (keep the existing `onClick`/`onKeyDown` handlers attached to it; they become redundant but must not be deleted per the standing constraints). The `Card` wrapper may stay as the visual shell inside the Link.
- **Notes:** the third link (`/drivers/:id/salaries`) has no route (PLAN.md "Observed while deriving routes") — out of scope, do not fix.

### shard-007-F02 · blocker · high · focus
- **Where:** `src/widgets/driver-detail/financial-tab.tsx:80` — `'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'`
- **Rule:** design-system §14 C-B1 "`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere … Never plain `focus:` — a ring must not appear on mouse click"; vercel-rules "Focus States" bullet "Use `:focus-visible` over `:focus` (avoid focus ring on click)"
- **Current:** plain `focus:` ring, `ring-offset-2`.
- **Expected:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (exception row, `dashboard.tsx:940`); `ring-offset-2` is reserved for close buttons (§4).
- **Change:** `class-level` — `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2` → `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Notes:** applies to whichever element ends up being the Link after F01.

### shard-007-F03 · should · high · colour
- **Where:** `src/widgets/driver-detail/financial-tab.tsx:79` — `'hover:border-primary/40 hover:bg-muted/40'`
- **Rule:** design-system §14 C-C4 "`hover:bg-muted/50` on content rows/cards, `hover:bg-accent` on chrome and menu items, `hover:border-primary` on tiles"; §3 "Content-row hover `hover:bg-muted/50` + `transition-colors`"
- **Current:** `/40` neutral wash plus a 40%-alpha primary border on hover — a mix of the row recipe and the tile recipe at non-standard alphas.
- **Expected:** navigation row cards use `hover:bg-muted/50` only (`dashboard.tsx:940`).
- **Change:** `class-level` — `hover:border-primary/40 hover:bg-muted/40` → `hover:bg-muted/50`

### shard-007-F04 · should · medium · spacing
- **Where:** `src/widgets/driver-detail/financial-tab.tsx:83` — `<CardContent className="flex items-center gap-3 p-4">`
- **Rule:** design-system §1 "12px … panel body padding, KPI card padding" and §5.2 "Exception row … `px-3 py-2.5`"
- **Current:** `p-4` (16px) inside a row card.
- **Expected:** row card padding `px-3 py-2.5` (`dashboard.tsx:940`).
- **Change:** `class-level` — `p-4` → `px-3 py-2.5`

### shard-007-F05 · blocker · high · a11y
- **Where:** `src/widgets/driver-detail/financial-tab.tsx:84` — `<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />` (also `:89` ChevronRight)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9 "`aria-hidden` on dots/chevrons/severity bars/sentinel"
- **Current:** decorative lucide icons next to text with no `aria-hidden`.
- **Expected:** `aria-hidden="true"` on every decorative icon (`dashboard.tsx:424-433` chevron).
- **Change:** `class-level` (additive attribute) — add `aria-hidden="true"` to the icons at `:84` and `:89`.

### shard-007-F06 · blocker · high · a11y
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:166` — `<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />` (also `:183`, `:188`, `:194`, `:200`, `:209`, `:211`, `:218`, `:223`, `:251`, `:287`, `:295`, `:302`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9 "`aria-hidden` on dots/chevrons/severity bars/sentinel"
- **Current:** all icons in the tab are decorative (label text always accompanies them) and lack `aria-hidden`.
- **Expected:** `aria-hidden="true"` (dashboard, `dashboard.tsx:1024` AlertTriangle in DegradedStrip pattern; §9).
- **Change:** `class-level` (additive attribute) — add `aria-hidden="true"` to each listed icon.

### shard-007-F07 · should · high · spacing
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:150` — `<div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">`
- **Rule:** design-system §1 "KPI row: `grid grid-cols-2 gap-3` + `lg:grid-cols-4`"; §14 C-S6 "KPI grid `gap-3 lg:grid-cols-4`"
- **Current:** `gap-2.5` (10px) and the 4-column step at `md`.
- **Expected:** `grid grid-cols-2 gap-3 lg:grid-cols-4` (`dashboard.tsx:359`).
- **Change:** `class-level` — `gap-2.5 md:grid-cols-4` → `gap-3 lg:grid-cols-4`

### shard-007-F08 · should · high · colour/border
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:165` — `rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs text-muted-foreground`
- **Rule:** design-system §7 "DegradedStrip … `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`; `AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning`"; §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"; §14 C-C3 "`border-warning/40`"
- **Current:** a warning summary strip at `/30` border, `/5` tint, `rounded-md`, `p-2.5`, 12px.
- **Expected:** the dashboard's attention strip (`dashboard.tsx:1018-1047`).
- **Change:** `class-level` — `rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs text-muted-foreground` → `rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` (keep `flex items-start gap-2`; icon classes already match).

### shard-007-F09 · should · medium · spacing
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:148` — `<div className="space-y-4">` (same at `documents-tab.tsx:178`)
- **Rule:** design-system §1 "12px … gap between every top-level block … one vertical rhythm"; §13 D-S4 (trips `space-y-3 md:space-y-4` recorded as a deviation)
- **Current:** 16px between the top-level blocks of the tab.
- **Expected:** `gap-3` / `space-y-3` (`dashboard.tsx:99`).
- **Change:** `class-level` — `space-y-4` → `space-y-3` in both files.

### shard-007-F10 · should · medium · spacing/type
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:179-180` — `<CardContent className="p-4 md:p-5">` / `<h2 className="mb-4 text-sm font-semibold">` (same pair at `:235-236`)
- **Rule:** design-system §1 "panel body padding … `p-3`"; §6 "Panel head: `h2 class="… border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"`"; §2 "one label style above every figure and panel"
- **Current:** 16/20px body padding and a 14px sans section title inside the body.
- **Expected:** body `p-3`; section title as the PanelHead eyebrow (`dashboard.tsx:999-1005`).
- **Change:** `class-level` — `p-4 md:p-5` → `p-3`; `mb-4 text-sm font-semibold` → `mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (a full PanelHead band would be `structural`: move the `h2` outside `CardContent` with `border-b bg-muted/60 px-3 py-2` and `overflow-hidden` on the Card).

### shard-007-F11 · should · medium · colour/border
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:245-247` — `'flex items-center justify-between gap-3 rounded-md border p-3'` … `'border-destructive/30 bg-destructive/5'` / `'border-warning/30 bg-warning/5'`
- **Rule:** design-system §4 "12px (token) `rounded-lg` … exception rows"; §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"; §5.2 "Exception row … `rounded-lg border bg-card px-3 py-2.5`"
- **Current:** license rows at `rounded-md p-3` with `/30` borders and `/5` tints.
- **Expected:** `rounded-lg border px-3 py-2.5`; status tints `border-destructive/40 bg-destructive/10` and `border-warning/40 bg-warning/10` (`dashboard.tsx:940`, §3).
- **Change:** `class-level` — `rounded-md border p-3` → `rounded-lg border px-3 py-2.5`; `border-destructive/30 bg-destructive/5` → `border-destructive/40 bg-destructive/10`; `border-warning/30 bg-warning/5` → `border-warning/40 bg-warning/10`
- **Notes:** the same `/30` border alphas appear on the document cards (`documents-tab.tsx:222-223`) — see F16.

### shard-007-F12 · should · medium · colour
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:43-45` — `case 'expired': case 'warning': return 'warning';`
- **Rule:** design-system §3 "Destructive … critical / negative"; "Warning … degraded / attention, not failure"
- **Current:** an expired licence is rendered with the warning tone on the StatCard while the same state is `destructive` in `ExpirationBadge` (`:286`) and on the document card (`documents-tab.tsx:245`).
- **Expected:** expired = destructive, expiring = warning (as the file's own badges do).
- **Change:** `class-level` — return a destructive tone for `'expired'`. `out-of-shard: src/shared/ui/stat-card.tsx` — the `tone` union (`'primary' | 'success' | 'warning'`) has no destructive member; without that addition this cannot be applied.
- **Notes:** do not remove the `case 'warning'` branch; only split the return value.

### shard-007-F13 · should · medium · type
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:94` — `{value ?? '—'}` (also `:190` `driver.mobile_number || '—'`, `:255` `: '—'`, `documents-tab.tsx:271` `: '—'`)
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`"; §7 "Zero revenue: `<span class="opacity-40">—</span>`"
- **Current:** the em dash renders at full foreground opacity.
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`).
- **Change:** `class-level` — wrap each `'—'` fallback in `<span className="opacity-40">—</span>` (at `:94` keep `value ?? …`, only the fallback changes).

### shard-007-F14 · should · low · i18n/date
- **Where:** `src/widgets/driver-detail/overview-tab.tsx:29` — `const now = new Date();` (also `documents-tab.tsx:57` `Date.now()`)
- **Rule:** design-system §2 "the dashboard's 'today' is Cairo's day — [comment] 'at 00:58 Cairo the UTC date is still yesterday and the headline said so' (`shared/lib/cairo.ts`)"
- **Current:** days-until-expiry is computed from the browser's local clock.
- **Expected:** the Cairo day boundary from `shared/lib/cairo.ts` (reference).
- **Change:** `class-level` (logic, additive) — compute `diff` from the Cairo "today" helper exported by `shared/lib/cairo.ts` instead of `new Date()`/`Date.now()`.
- **Notes:** only matters near midnight; low confidence that the rule extends past the dashboard headline.

### shard-007-F15 · blocker · high · i18n
- **Where:** `src/widgets/driver-detail/documents-tab.tsx:340` — `aria-label="Zoom out"` (also `:348` `"Zoom in"`, `:356` `"Rotate"`)
- **Rule:** design-system §14 C-I4 "all aria/sr-only strings through `t()`"; §9 "Copy, aria-labels and sr-only text all go through `t()`"
- **Current:** three hard-coded English aria-labels on icon-only buttons.
- **Expected:** `aria-label={t('…')}` (`theme-toggle.tsx:25`, `scope-bar.tsx:109`).
- **Change:** `class-level` — `aria-label="Zoom out"` → `aria-label={t('drivers.docs.zoomOut', { defaultValue: 'Zoom out' })}` and likewise `zoomIn`, `rotate`. `out-of-shard: src/shared/i18n/locales/en.json, ar.json` for the keys (the runner permits both locale files).

### shard-007-F16 · should · medium · colour
- **Where:** `src/widgets/driver-detail/documents-tab.tsx:222-223` — `status === 'expired' && 'border-destructive/30'` / `'border-warning/30'`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … never a solid status fill"; §14 C-C3 "`border-warning/40`"
- **Current:** `/30` status borders on the document cards.
- **Expected:** `/40` (`dashboard.tsx:221`, `:1031`).
- **Change:** `class-level` — `border-destructive/30` → `border-destructive/40`; `border-warning/30` → `border-warning/40`

### shard-007-F17 · should · medium · colour/border
- **Where:** `src/widgets/driver-detail/documents-tab.tsx:321` — `rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground`
- **Rule:** design-system §3 "Current / selected wash `bg-primary/10 text-primary`"; index.css palette rule (§0.2) "Navy marks anything you can act on"; §4 "12px (token) `rounded-lg` … DegradedStrip"; provisional (§12.2) "neutral hint `border-dashed bg-muted/30 text-muted-foreground`"
- **Current:** a non-interactive "files ready" hint tinted navy at off-scale alphas (`/20`, `/5`), `rounded-md`.
- **Expected:** a status hint is not actionable, so it should not wear the navy; nearest reference recipe is the strip (`rounded-lg border border-dashed … px-3 py-2.5`) with neutral tones.
- **Change:** `class-level` — `rounded-md border border-primary/20 bg-primary/5 p-2.5` → `rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2.5` (keep the `text-primary` check icon at `:322` — it marks a positive state, acceptable).

### shard-007-F18 · should · high · colour
- **Where:** `src/widgets/driver-detail/documents-tab.tsx:362` — `overflow-auto rounded-lg bg-muted/30 p-4`
- **Rule:** design-system §14 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"
- **Current:** `bg-muted/30` well behind the image preview, `p-4`.
- **Expected:** wells are `bg-muted/40 p-3` (`dashboard.tsx:494`).
- **Change:** `class-level` — `bg-muted/30 p-4` → `bg-muted/40 p-3`

### shard-007-F19 · blocker · high · a11y/focus
- **Where:** `src/widgets/driver-detail/documents-tab.tsx:432-436` — `<input id={fileInputId} type="file" accept="image/*" className="hidden"`
- **Rule:** vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"; "Accessibility" bullet "Interactive elements need keyboard handlers"; design-system §14 C-B1 "`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere"
- **Current:** the file input is `display:none` (`hidden`), so the Upload/Replace control at `:423-431` (a `<label>`) is unreachable by keyboard and has no focus ring; the label also uses `hover:bg-muted/50` instead of the outline-button hover.
- **Expected:** every interactive element is focusable and shows the navy ring; outline buttons hover `hover:bg-accent hover:text-accent-foreground` (§5.1, `button.tsx:11-17`).
- **Change:** `class-level` — input `className="hidden"` → `className="peer sr-only"`; label `hover:bg-muted/50` → `hover:bg-accent hover:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1` (the input must precede the label in DOM order for `peer` — move the `<input>` above the `<label>`; that is a reorder, not a deletion).
- **Notes:** used in RTL; classes are all logical already.

### shard-007-F20 · should · medium · images
- **Where:** `src/widgets/driver-detail/documents-tab.tsx:366-374` — `<img src={previewUrl} alt={previewTitle} className="transition-transform duration-200"`
- **Rule:** vercel-rules "Images" bullet "`<img>` needs explicit `width` and `height` (prevents CLS)"; "Anti-patterns" bullet "Images without dimensions"
- **Current:** no `width`/`height`; the preview well grows when the blob decodes.
- **Expected:** explicit dimensions (or a reserved box) so the dialog does not reflow.
- **Change:** `class-level` — give the wrapper at `:361-364` a reserved height (`min-h-[40vh]`) or add `width`/`height` attributes to the `<img>` once the blob's natural size is known (`onLoad`, additive).
- **Notes:** the image is a runtime blob URL, so exact intrinsic dimensions are not known at render; reserving the box is the practical fix.

### shard-007-F21 · nit · high · buttons
- **Where:** `src/widgets/driver-detail/documents-tab.tsx:194` — `<Loader2 className="h-4 w-4 animate-spin" />` (also `:196`, `:342`, `:350`, `:358`, `:416`; `pin-tab.tsx:98`, `:115`, `:117`, `:137`, `:139`; `driver-expense-new.tsx:96`, `:239`, `:241`; `driver-expenses.tsx:99`, `:109`, `:164`, `:267`; `driver-form.tsx:211`, `:213`)
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes"; §15.4
- **Current:** `h-4 w-4` / `h-3.5 w-3.5` size classes on icons inside `<Button>` — dead (the `[&_svg]:size-4` rule wins) and misleading at `:416` where `h-3.5` is written but 16px renders.
- **Expected:** no size classes on icons inside a Button (`dashboard.tsx:1043`, `header.tsx:23`).
- **Change:** `class-level` — drop `h-4 w-4` / `h-3.5 w-3.5` from each listed icon (keep `animate-spin`, colour classes).

### shard-007-F22 · blocker · high · a11y
- **Where:** `src/widgets/driver-detail/documents-tab.tsx:229` — `<DocIcon className="h-4 w-4 shrink-0 text-muted-foreground" />` (also `:234`, `:240`, `:246`, `:322`, `:448`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; design-system §9
- **Current:** decorative icons beside text without `aria-hidden`.
- **Expected:** `aria-hidden="true"`.
- **Change:** `class-level` (additive attribute) — add `aria-hidden="true"` to each listed icon.

### shard-007-F23 · nit · medium · pills
- **Where:** `src/widgets/driver-detail/documents-tab.tsx:233` — `<Badge variant="success" className="gap-1 shrink-0">` (also `:239`, `:245`; `overview-tab.tsx:217`, `:222`, `:286`, `:294`, `:301`)
- **Rule:** design-system §5.3 "Badge primitive: same recipe as the ConnectionBadge: `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium`"; §14 C-T3
- **Current:** `gap-1` override tightens the icon gap to 4px.
- **Expected:** the primitive's `gap-1.5` (`badge.tsx:5-20`).
- **Change:** `class-level` — remove `gap-1` from each listed Badge (`shrink-0` stays).

### shard-007-F24 · blocker · high · i18n
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:170` — `{cat}` (also `:199` `{m}`; `driver-expenses.tsx:230` `{expense.category}`, `:252` `{expense.payment_method}`); source lists `src/entities/driver-expense/schemas.ts:58-84`
- **Rule:** design-system §9 "Copy … all go through `t()` with `defaultValue` fallbacks (C-I4)"; §7 "Unknown i18n key `t(key, { defaultValue: … })`"
- **Current:** category and payment-method labels (`'Fuel'`, `'Credit Card'`, …) are English constants rendered verbatim in the Select and in the list.
- **Expected:** every visible string through `t()` with a `defaultValue` (`dashboard.tsx:950-960`).
- **Change:** `class-level` — `{cat}` → `{t(\`driverExpenses.categories.${cat}\`, { defaultValue: cat })}`; `{m}` → `{t(\`driverExpenses.paymentMethods.${m}\`, { defaultValue: m })}`; same for the two list sites. `out-of-shard: src/shared/i18n/locales/en.json, ar.json` for the key tables. The constants in `schemas.ts` stay as the stored API values.
- **Notes:** stored values must remain English (they are what the backend receives).

### shard-007-F25 · blocker · high · i18n/forms
- **Where:** `src/entities/driver-expense/schemas.ts:30-31` — `.positive('Enter a valid amount')`, `.min(1, 'Select a date')` (also `src/entities/driver-loan/schemas.ts:34-37`)
- **Rule:** design-system §9 "Copy … all go through `t()` (C-I4)"; vercel-rules "Forms" bullet "Errors inline next to fields"
- **Current:** zod messages are hard-coded English; `FormMessage` (`driver-expense-new.tsx:124,146`) prints them to the user.
- **Expected:** translated messages.
- **Change:** `class-level` — replace each literal with an i18n key (`'driverExpenses.validation.amount'`, `'driverExpenses.validation.date'`, `'driverLoans.validation.amount'`, `'driverLoans.validation.date'`, `'driverLoans.validation.method'`) and translate at the display site: `<FormMessage>` in `driver-expense-new.tsx` renders `t(message, { defaultValue: message })` — or resolve via `t()` in `FormMessage` itself (`out-of-shard: src/shared/ui/form.tsx`). Locale keys `out-of-shard: en.json, ar.json`.
- **Notes:** `driver-loan/schemas.ts` is consumed by the loans page in shard-008; changing the literal to a key there is safe only if that page's `FormMessage` also translates — record for shard-008.

### shard-007-F26 · blocker · high · RTL
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:111` — `<DollarSign className="mr-1 inline h-3.5 w-3.5" />` (also `:136`, `:158`, `:187`, `:217`; `driver-expenses.tsx:229` `<Tag className="mr-1 h-3 w-3" />`)
- **Rule:** design-system §14 C-I1 "logical utilities everywhere"; §9 "Rule C-I1: no physical `ml-/mr-/left-/right-` utilities"
- **Current:** `mr-1` — in Arabic the icon sits on the wrong side with no gap.
- **Expected:** `me-1` (`dashboard.tsx:313`, `select.tsx:109`).
- **Change:** `class-level` — `mr-1` → `me-1` at all six sites.

### shard-007-F27 · should · high · RTL
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:96` — `<ArrowLeft className="h-4 w-4" />` (also `driver-expenses.tsx:99`)
- **Rule:** design-system §9 "Directional chevrons get `rtl:rotate-180`"; provisional (§12.7) "Back-to-list `Button outline sm` with `ArrowLeft rtl:rotate-180`"
- **Current:** the back arrow points left in RTL, i.e. *away* from "back".
- **Expected:** `rtl:rotate-180` (`cairo-range-calendar.tsx:97`, `dropdown-menu.tsx:28`).
- **Change:** `class-level` — add `rtl:rotate-180` to both `ArrowLeft` icons (and drop `h-4 w-4`, F21).

### shard-007-F28 · should · low · buttons
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:95` — `<Button variant="ghost" size="sm" onClick={goBack}>` (also `driver-expenses.tsx:94-96`)
- **Rule:** provisional (§12.7) "Back-to-list `Button outline sm` with `ArrowLeft rtl:rotate-180`, label `hidden sm:inline`"; §12.1 "actions `flex flex-wrap items-center gap-2` of `Button outline size=sm`"
- **Current:** ghost variant for the back action in the page-header actions cluster.
- **Expected:** `outline` (`trip-new.tsx:18-19`).
- **Change:** `class-level` — `variant="ghost"` → `variant="outline"` at both sites.

### shard-007-F29 · should · medium · spacing
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:102` — `className="mx-auto max-w-2xl space-y-6"` (also `driver-form.tsx:67` `space-y-6`; `driver-expenses.tsx:172` `space-y-4`)
- **Rule:** design-system §1 "12px … gap between every top-level block"; §13 D-S4 (trips `space-y-6` forms recorded as a deviation)
- **Current:** 24px / 16px between top-level blocks.
- **Expected:** `space-y-3` (`dashboard.tsx:99`).
- **Change:** `class-level` — `space-y-6` → `space-y-3` (both forms); `space-y-4` → `space-y-3` (expenses list).

### shard-007-F30 · should · medium · forms
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:115-119` — `<Input type="number" step="any" min="0" placeholder="0.00"`
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`", "Use correct `type` … and `inputmode`", "`autocomplete="off"` on non-auth fields to avoid password manager triggers"
- **Current:** no `inputMode`, no `autoComplete` on the amount field; description textarea `:221` likewise.
- **Expected:** `inputMode="decimal"` and `autoComplete="off"` on the amount; `autoComplete="off"` on the textarea.
- **Change:** `class-level` (additive attributes) — add `inputMode="decimal" autoComplete="off"` to the amount Input; add `autoComplete="off"` to the Textarea.

### shard-007-F31 · should · medium · forms
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:102` — `<form onSubmit={form.handleSubmit(onSubmit)}` (also `driver-form.tsx:67`)
- **Rule:** vercel-rules "Forms" bullet "Warn before navigation with unsaved changes (`beforeunload` or router guard)"
- **Current:** neither form guards against leaving with a dirty state; the Back/Cancel buttons navigate immediately.
- **Expected:** a `beforeunload` listener or a react-router `useBlocker` bound to `form.formState.isDirty`.
- **Change:** `structural` — add a `useBlocker(form.formState.isDirty && !mutation.isPending)` (react-router v7) or a `beforeunload` effect in both forms; additive, no handler removed.

### shard-007-F32 · nit · medium · forms
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:112` — `{t('driverExpenses.fields.amount')} *` (also `:137`)
- **Rule:** provisional (§12.2) "required marker `<span class="text-destructive">*</span>`"
- **Current:** a bare ` *` in the label text.
- **Expected:** `<span className="text-destructive">*</span>` (`trip-form.tsx:701`).
- **Change:** `class-level` — ` *` → `{' '}<span className="text-destructive" aria-hidden="true">*</span>`

### shard-007-F33 · blocker · high · a11y
- **Where:** `src/pages/driver-expenses/driver-expense-new.tsx:93` — `icon={<Receipt className="h-5 w-5" />}` and the five FormLabel icons at `:111`, `:136`, `:158`, `:187`, `:217`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** decorative icons inside labels and the page-shell icon well without `aria-hidden`; inside a `<label>` they are read as part of the field name.
- **Expected:** `aria-hidden="true"`.
- **Change:** `class-level` (additive attribute) — add `aria-hidden="true"` to each.

### shard-007-F34 · blocker · high · colour (§14 ruling)
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:224-226` — `<span className="text-sm font-semibold">{formatCurrency(expense.cost)}</span>`
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"; §3 "Money (amber) `text-money` on figures"
- **Current:** an expense amount in sans, foreground colour.
- **Expected:** `font-mono text-sm font-semibold tabular-nums text-money` (fuel-row price, `dashboard.tsx:641`).
- **Change:** `class-level` — `text-sm font-semibold` → `font-mono text-sm font-semibold tabular-nums text-money`

### shard-007-F35 · blocker · high · colour (§14 ruling)
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:126` — `value={formatCurrency(stats.totalAmount)}` (also `:131`, `:141`)
- **Rule:** design-system §14 C-T1 "every money figure is `font-mono tabular-nums text-money`"; §2 "KPI value (+ `text-money` when money)"
- **Current:** three money KPI values rendered in the StatCard's default foreground, sans.
- **Expected:** `font-mono … text-money` (`dashboard.tsx:385`, `:436`).
- **Change:** `out-of-shard: src/shared/ui/stat-card.tsx` — the StatCard has no money tone/value class hook; a `tone="money"` (or a `valueClassName`) must be added there before these three call sites can pass it. Record for the `shared/ui` shard; nothing to change in this file until then.

### shard-007-F36 · blocker · high · colour (palette rule)
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:203` — `'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/20'` (also `:212` `bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400`; `:234` `className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400 text-[10px]"`)
- **Rule:** index.css palette rule (design-system §0.2) "Two hues, one job each … Everything else is neutral … Adding a third accent colour breaks the whole scheme, so don't"; §3 "Success `text-success`, `border-success/40 bg-success/10`"; §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … never a solid status fill"; §3 "No hex/rgb in any dashboard or shell TSX"
- **Current:** Tailwind `green-*` hard-coded hues with separate dark-mode overrides for the paid state — off-token, and a raw-green "paid" reads as revenue (the exact confusion the palette comment warns about).
- **Expected:** the tokenised success recipe (`dashboard.tsx:221` pattern): row `border-success/40 bg-success/10`; icon disc `bg-success/10 text-success`; badge `variant="success"`.
- **Change:** `class-level` — `:203` → `'border-success/40 bg-success/10'`; `:212` → `'bg-success/10 text-success'`; `:234` → `<Badge variant="success">` with no className (the 10px override is also F38).

### shard-007-F37 · blocker · medium · colour (palette rule)
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:190` — `rounded-md bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary`
- **Rule:** index.css palette rule (design-system §0.2) "Navy marks anything you can act on"; §3 "Current / selected wash `bg-primary/10 text-primary` — 'you are here / this is actionable context'"; §2 "Eyebrow: KPI label, PanelHead, 'largest', 'Service vehicles' … `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"
- **Current:** a static month label wears the navy wash (at an off-scale `/5`) although it is not actionable or selected.
- **Expected:** a group label is an eyebrow (`dashboard.tsx:776` 'Service vehicles': `mb-1.5 mt-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`).
- **Change:** `class-level` — `mb-3 inline-flex items-center gap-1.5 rounded-md bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary` → `mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
- **Notes:** Arabic month names must not be uppercased — harmless (no case in Arabic), matches the Arabic-plate eyebrow at `dashboard.tsx:747`.

### shard-007-F38 · should · high · pills
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:228` — `<Badge variant="secondary" className="text-[10px]">` (also `:234` `text-[10px]`; `:103` `<Badge variant="outline" className="text-xs">`; `:181` `<Badge variant="secondary" className="text-xs">`)
- **Rule:** design-system §14 C-T3 "ConnectionBadge recipe is *the* status pill and the `Badge` primitive now matches it (`… text-[11px]`); neutral chips are `px-2 py-0.5 text-[10.5px] font-medium`"; §5.3 "Two pill recipes remain: the 11px status pill and the 10.5px neutral chip"
- **Current:** Badge text size overridden to 10px and 12px — a third and fourth pill size.
- **Expected:** the primitive's 11px (`badge.tsx:6`); a category tag is a neutral chip (`rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`, `dashboard.tsx:637`).
- **Change:** `class-level` — remove `text-[10px]` / `text-xs` from all four Badges; for the category tag at `:228` optionally swap to the chip recipe `className="px-2 py-0.5 text-[10.5px]"` on the secondary Badge.

### shard-007-F39 · should · high · lists
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:176-177` — `border-b bg-muted/50 px-4 py-2.5` / `text-sm font-semibold`
- **Rule:** design-system §6 "Panel head: `h2 class="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"` + aside `font-medium normal-case tracking-normal`"; §14 C-C2 "`/60` head band"
- **Current:** year header band at `/50`, `px-4 py-2.5`, 14px semibold foreground.
- **Expected:** the PanelHead recipe (`dashboard.tsx:999-1005`); the count badge is the aside.
- **Change:** `class-level` — `border-b bg-muted/50 px-4 py-2.5` → `border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; inner `text-sm font-semibold` → remove (inherit).

### shard-007-F40 · should · medium · lists/colour
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:201-204` — `'flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors'` … `'hover:border-border/80 hover:bg-muted/30'`
- **Rule:** design-system §5.2 "Untracked tile … no hover/transition — non-interactive tiles carry neither"; §14 C-C4 "`hover:bg-muted/50` on content rows/cards"; §5.2 "Exception row … `px-3 py-2.5`"
- **Current:** a non-clickable expense row has a hover wash at an off-scale `/30` plus a border-alpha hover; padding `p-3`.
- **Expected:** rows that are not links carry no hover/transition (`dashboard.tsx:781-786`); row-card padding `px-3 py-2.5`.
- **Change:** `class-level` — `p-3 transition-colors` → `px-3 py-2.5`; drop `'hover:border-border/80 hover:bg-muted/30'` (keep the conditional branch; make its else-value `''`).

### shard-007-F41 · blocker · high · a11y
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:261-268` — `<Button variant="ghost" size="icon" … onClick={() => setDeleteTarget(expense)}> <Trash2 …/>`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"; "Anti-patterns" bullet "Icon buttons without `aria-label`"
- **Current:** icon-only delete button with no accessible name.
- **Expected:** `aria-label={t('common.delete')}` (translated per §14 C-I4).
- **Change:** `class-level` (additive attribute) — add `aria-label={t('common.delete')}` to the Button.

### shard-007-F42 · blocker · high · a11y
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:91` — `icon={<Receipt className="h-5 w-5" />}` (also `:178`, `:191`, `:217`, `:219`, `:229`, `:246`, `:251`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** decorative icons beside text without `aria-hidden`.
- **Expected:** `aria-hidden="true"`.
- **Change:** `class-level` (additive attribute) — add `aria-hidden="true"` to each listed icon.

### shard-007-F43 · should · medium · loading
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:117` — `{expenses.length > 0 && (` … `:148-153` `<Skeleton key={i} className="h-16 w-full rounded-lg" />`
- **Rule:** design-system §7 "Apex pending: `grid grid-cols-2 gap-3` + `lg:grid-cols-4|3` of … `Skeleton h-[92px] rounded-lg` (matches the KPI footprint so the page does not reflow; C-D2)"; §14 C-D2
- **Current:** the stats row is absent while loading and pops in afterwards; only the list has a skeleton.
- **Expected:** a KPI-shaped skeleton grid in the stats slot during `isLoading` (`dashboard.tsx:123-128`).
- **Change:** `structural` — add `{isLoading && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{5 × <Skeleton className="h-[92px] rounded-lg" />}</div>}` above the list skeleton; keep the existing `expenses.length > 0` branch.

### shard-007-F44 · should · medium · i18n/date
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:43` — `d.toLocaleString('default', { month: 'long' })`
- **Rule:** design-system §14 C-I2 "date-fns `format()` stays the display engine for page content"; §2 "Dates: date-fns `format()` … is the display engine"
- **Current:** month names come from the browser's default locale via `toLocaleString`, so they ignore the app language and use a second engine.
- **Expected:** `format(d, 'MMMM')` from date-fns (`dashboard.tsx:104`).
- **Change:** `class-level` (logic) — `d.toLocaleString('default', { month: 'long' })` → `format(d, 'MMMM')` (import `format` from `date-fns`).

### shard-007-F45 · should · medium · i18n
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:182` — `{Object.values(grouped[year]).flat().length} {t('driverExpenses.title').toLowerCase()}`
- **Rule:** design-system §9 "Copy … all go through `t()` with `defaultValue` fallbacks (C-I4)"
- **Current:** a count phrase assembled by concatenating a number with a lower-cased page title — word order and plural form are fixed in code, not in the locale.
- **Expected:** one interpolated key, e.g. `t('driverExpenses.countLabel', { count })`.
- **Change:** `class-level` — replace the concatenation with `t('driverExpenses.countLabel', { count: Object.values(grouped[year]).flat().length, defaultValue: '{{count}} expenses' })`. `out-of-shard: en.json, ar.json` for the key.

### shard-007-F46 · should · low · type
- **Where:** `src/pages/driver-expenses/driver-expenses.tsx:126` — `formatCurrency(stats.totalAmount)` (also `:131`, `:141`, `:225`, `:287`)
- **Rule:** design-system §2 "Decimals by unit: counts/money 0 … No currency symbol on the dashboard"; §13 D-T14 records `formatCurrency` (2 dp + ` EGP`) as a trips deviation
- **Current:** 2-decimal figures with an `EGP` suffix in KPI cards and rows.
- **Expected:** 0-dp money via `formatNumber(v, 0)` / `compactMoney` (`shared/lib/format.ts`, `dashboard.tsx:59-66`).
- **Change:** `class-level` — `formatCurrency(x)` → `formatNumber(x, 0)` at the five sites (keep the `formatCurrency` import if the dialog copy is meant to keep the unit).
- **Notes:** low confidence — the dialog description at `:287` arguably benefits from the unit; the owner has not ruled on D-T14.

### shard-007-F47 · should · high · colour
- **Where:** `src/widgets/driver-detail/pin-tab.tsx:74` — `rounded-md border bg-muted/30 p-4` (also `:145` `rounded-md border bg-muted/30 p-2.5`)
- **Rule:** design-system §14 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"; §6 "Truck drawer: `mt-3 rounded-lg border bg-muted/40 p-3 text-[12px]` box"; §4 "12px (token) `rounded-lg` … truck drawer"
- **Current:** two wells at `/30`, `rounded-md`, `p-4` / `p-2.5`.
- **Expected:** `rounded-lg border bg-muted/40 p-3` (`dashboard.tsx:841`).
- **Change:** `class-level` — `:74` `rounded-md border bg-muted/30 p-4` → `rounded-lg border bg-muted/40 p-3`; `:145` `rounded-md border bg-muted/30 p-2.5` → `rounded-lg border bg-muted/40 p-3`

### shard-007-F48 · should · medium · type
- **Where:** `src/widgets/driver-detail/pin-tab.tsx:81` — `'font-mono text-2xl font-semibold tabular-nums tracking-[0.25em]'`
- **Rule:** design-system §2 "22 `text-[22px]` 600, `leading-none`, mono + `tabular-nums` — KPI value"; §14 C-T5 "four-step figure scale (22 KPI › 18 count › 17 tile › 15 drawer)"
- **Current:** the PIN figure at 24px (`text-2xl`), outside the figure scale.
- **Expected:** the headline-figure step `text-[22px] leading-none` (`dashboard.tsx:436`).
- **Change:** `class-level` — `text-2xl` → `text-[22px] leading-none`

### shard-007-F49 · blocker · high · a11y
- **Where:** `src/widgets/driver-detail/pin-tab.tsx:64` — `<Key className="h-4 w-4 text-muted-foreground" />` (also `:146` `<Lock …/>`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** decorative icons beside text without `aria-hidden`.
- **Expected:** `aria-hidden="true"`.
- **Change:** `class-level` (additive attribute) — add `aria-hidden="true"` at `:64` and `:146`.

### shard-007-F50 · should · medium · type
- **Where:** `src/widgets/driver-form/driver-form.tsx:71` — `<CardTitle className="flex items-center gap-2 text-base">` (also `:119`)
- **Rule:** design-system §2 "one label style above every figure and panel — `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §6 Panel head; §13 D-T3 (form card headings `text-sm font-semibold` recorded as a trips deviation)
- **Current:** 16px section titles on the two form cards.
- **Expected:** the eyebrow (`dashboard.tsx:427`, `:1001`).
- **Change:** `class-level` — `text-base` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` on both CardTitles (icons keep `text-muted-foreground`).

### shard-007-F51 · should · medium · forms
- **Where:** `src/widgets/driver-form/driver-form.tsx:84-86` — `<Input placeholder={t('drivers.fields.namePlaceholder')} {...field} />` (also `:103-107` `type="tel"`)
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`", "Use correct `type` (`email`, `tel`, …) and `inputmode`", "`autocomplete="off"` on non-auth fields to avoid password manager triggers"
- **Current:** name and phone inputs carry `name` (from RHF) but no `autoComplete`; the phone input has no `inputMode`.
- **Expected:** `autoComplete="off"` on both; `inputMode="tel"` on the phone field.
- **Change:** `class-level` (additive attributes) — add `autoComplete="off"` to both Inputs and `inputMode="tel"` to the phone Input.

### shard-007-F52 · should · low · forms
- **Where:** `src/widgets/driver-form/driver-form.tsx:208` — `disabled={submitting || (mode === 'edit' && !form.formState.isDirty)}`
- **Rule:** vercel-rules "Forms" bullet "Submit button stays enabled until request starts; spinner during request"
- **Current:** in edit mode the Save button is disabled until the form is dirty.
- **Expected:** submit enabled; disabled only while the request is pending.
- **Change:** `class-level` — cannot be applied without removing a condition (standing constraint: do not delete conditional branches). Record only; the owner may waive.

### shard-007-F53 · blocker · high · a11y
- **Where:** `src/widgets/driver-form/driver-form.tsx:72` — `<User className="h-4 w-4 text-muted-foreground" />` (also `:120`)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** decorative icons beside text without `aria-hidden`.
- **Expected:** `aria-hidden="true"`.
- **Change:** `class-level` (additive attribute) — add `aria-hidden="true"` at `:72` and `:120`.

## Summary
Blockers cluster in three groups: navy/green misuse and untinted money on the expenses page (§14 C-T1, index.css palette rule), physical `mr-*` and untranslated strings (C-I1/C-I4), and Vercel accessibility gaps (`aria-hidden`, icon-button labels, an unreachable file input, a `div`-as-link). Most "should" items are the same three values repeated — `/30` tints, `rounded-md` wells, and 16px paddings/gaps — that resolve to `/40`, `rounded-lg`, and `p-3`/`gap-3`.

FINDINGS: 53 (blocker 19 / should 31 / nit 3)
