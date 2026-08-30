# Findings — shard-016

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/entities/service-invoice/api.ts` | 54 | no UI content | — |
| `src/entities/service-invoice/queries.ts` | 96 | no UI content | — |
| `src/entities/service-invoice/schemas.ts` | 100 | no UI content | zod messages are English (`'Driver name is required'`) but surface via `FormMessage` in the form — recorded under F-form i18n, fix is out-of-shard for locale keys only |
| `src/widgets/service-invoice-details/service-invoice-details.tsx` | 326 | audited | print-specific classes (`print:*`) — no rule; `StatCard`/`EmptyState` usage — provisional only |
| `src/widgets/service-invoice-form/service-invoice-form.tsx` | 385 | audited | duplicate Save/Cancel (header + fixed mobile bar) — no rule; 15 default blank rows — no rule |
| `src/pages/service-invoices/service-invoice-details.tsx` | 35 | audited | — |
| `src/pages/service-invoices/service-invoice-edit.tsx` | 52 | audited | toast on mutation — D-ST3 unruled, not flagged |
| `src/pages/service-invoices/service-invoice-new.tsx` | 36 | audited | toast on mutation — D-ST3 unruled, not flagged |
| `src/pages/service-invoices/service-invoices.tsx` | 225 | audited | `description` ternary yields the same string both branches — no rule; toasts — D-ST3 unruled |
| `src/widgets/service-invoices-table/service-invoices-table.tsx` | 150 | audited | `DataTable` primitive itself is out of shard; `any` row typing — no rule |
| `src/pages/settings/settings.tsx` | 114 | audited | imports `toast` from `sonner` directly instead of `shared/ui/toaster` — no rule |
| `src/widgets/sidebar/sidebar.tsx` | 290 | reference — not audited | — |
| `src/widgets/terminal-select/index.ts` | 1 | no UI content | — |
| `src/widgets/terminal-select/terminal-select.tsx` | 163 | audited | hint recipe matches provisional §12.2 exactly; not listed in §13 |
| `src/widgets/theme-toggle/theme-toggle.tsx` | 49 | reference — not audited | — |
| `src/pages/tires/tires.tsx` | 254 | audited | `<table>` markup — dashboard has no table rule; provisional §12.4 only; `dir="ltr"` on part numbers — no rule |

## Findings

### shard-016-F01 · blocker · high · colour roles
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:180` — `bg-blue-500/10 px-2 py-0.5 rounded-full text-[9px] font-black text-blue-500 … border-blue-500/20`
- **Rule:** design-system §0.2 palette comment "Two hues, one job each… Adding a third accent colour breaks the whole scheme, so don't." | §3 "third hues only in charts/maps"
- **Current:** keyword chip uses `blue-500`, hybrid chip (line 186) uses `indigo-500`; line 295 `Search … text-blue-500` in the sidebar card.
- **Expected:** token colours only. Semantic chip at line 174 already uses `primary`; keyword/hybrid should be neutral chip (`bg-muted text-muted-foreground`, §5.3 chip) or the same navy wash. Reference: `dashboard.tsx:583` neutral chip, `:637`.
- **Change:** `class-level` — line 180: `bg-blue-500/10 … text-blue-500 … border-blue-500/20 … print:bg-blue-500/5` → `bg-muted text-muted-foreground border-border print:bg-muted`; line 186: `bg-indigo-500/10 … text-indigo-500 … border-indigo-500/20 … print:bg-indigo-500/5` → `bg-primary/10 text-primary border-primary/40 print:bg-primary/5`; line 295: `text-blue-500` → `text-muted-foreground`.
- **Notes:** Same blue appears in `service-invoices.tsx:158` (F20) — keep the two in sync.

### shard-016-F02 · blocker · high · a11y
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:57` — `<Button variant="ghost" size="icon" onClick={onBack}>`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`" | design-system §9 C-I4 "all aria/sr-only strings through `t()`"
- **Current:** back button contains only an `ArrowLeft` icon, no accessible name.
- **Expected:** `aria-label={t('common.back')}` (key exists — used at `service-invoices.tsx:111`). Reference: `header.tsx:21` hamburger carries a translated `aria-label`.
- **Change:** `class-level` (additive prop) — add `aria-label={t('common.back')}` and `aria-hidden="true"` on the icon.
- **Notes:** —

### shard-016-F03 · blocker · high · RTL/i18n
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:166` — `"text-sm text-right"`
- **Rule:** design-system §9 C-I1 "no physical `ml-/mr-/left-/right-` utilities" | §14 C-I1 "logical utilities everywhere"
- **Current:** `text-right` at lines 166, 196, 200; `mr-2` on the Printer icon at line 76.
- **Expected:** `text-end`; icon gap comes from Button's `gap-2` (`button.tsx:7`), no margin. Reference: `dashboard.tsx:991` `text-end`.
- **Change:** `class-level` — lines 166/196/200 `text-right` → `text-end`; line 76 remove `mr-2`.
- **Notes:** Page is used in Arabic; `text-right` currently pins notes to the right in both directions.

### shard-016-F04 · should · high · type
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:61` — `<h1 className="text-2xl font-bold tracking-tight">`
- **Rule:** design-system §2 "Page title `sm:text-xl` / `text-lg` 600 `leading-tight`" and "700 is never used in the reference" | §13 D-T1
- **Current:** 24px / 700.
- **Expected:** `text-lg font-semibold leading-tight sm:text-xl`; subtitle line 64 `text-sm` → `text-[11.5px]` with `mt-0.5` (§2 hint size, D-T2). Reference: `dashboard.tsx:103-106`.
- **Change:** `class-level` — `text-2xl font-bold tracking-tight` → `text-lg font-semibold leading-tight sm:text-xl`; line 64 `text-sm text-muted-foreground` → `mt-0.5 text-[11.5px] text-muted-foreground`.
- **Notes:** Same header block in `service-invoice-form.tsx:138-141` (F13).

### shard-016-F05 · should · high · type
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:130` — `text-3xl font-black uppercase tracking-tighter`
- **Rule:** design-system §2 "Weights used: 400, 500, 600. 700 is never used"; "`uppercase` appears only in the 10px eyebrow"; "`tracking-tight` only on `DialogTitle`"
- **Current:** receipt heading 30px / 900 / uppercase / `tracking-tighter`; line 133 `text-lg font-medium … uppercase tracking-[0.3em]`.
- **Expected:** heading ≤ `text-lg font-semibold leading-tight`; the subtitle as an eyebrow `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`. Reference: `dashboard.tsx:103`, `:382`.
- **Change:** `class-level` — line 130 → `text-lg font-semibold leading-tight text-foreground print:text-base`; line 133 → `mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`.
- **Notes:** Print variants keep their own sizes; only the weights/tracking need to move.

### shard-016-F06 · should · high · radius/border/shadow
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:123` — `border-2 border-muted shadow-lg print:shadow-none print:border-muted/50 print:border-2`
- **Rule:** design-system §4 "Border. 1px everywhere; no `border-2`. Cards are `border bg-card` with no shadow" | §4 C-R1 "`rounded-xl` retired"
- **Current:** card `border-2 shadow-lg`; line 139 `rounded-xl border-2 border-muted`; line 148 `divide-y-2 divide-muted`; line 161 `md:border-e-2 border-muted`; line 309 `border-dashed border-2`; line 127 `rounded-xl` icon well; chips at 174/180/186 carry `shadow-sm`.
- **Expected:** `rounded-lg border` hairlines, `divide-y`, `border-e`, no shadow on cards or chips. Reference: `dashboard.tsx:135` panel, `:940` row card, `empty-state.tsx:35` dashed.
- **Change:** `class-level` — 123: `border-2 border-muted shadow-lg print:shadow-none print:border-muted/50 print:border-2` → `print:border-border/60`; 139: `rounded-xl border-2 border-muted` → `rounded-lg border`; 148: `divide-y-2 divide-muted` → `divide-y`; 161: `md:border-e-2 border-muted` → `md:border-e`; 309: `border-dashed border-2` → `border-dashed border-border/60`; 127: `rounded-xl` → `rounded-lg`; 174/180/186: remove `shadow-sm`.
- **Notes:** `Card` primitive already supplies `rounded-lg border` (D-R1 shadow-sm on Card is out-of-shard: `shared/ui/card.tsx`).

### shard-016-F07 · should · high · tables/lists
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:140` — `bg-foreground text-background font-bold text-[10px] uppercase tracking-widest`
- **Rule:** design-system §6 "Panel head: `border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`" | §3 "Sub-surface tint `bg-muted/60` head band"
- **Current:** inverted solid head band (foreground on background) with `font-bold tracking-widest`.
- **Expected:** tinted band `bg-muted/60 text-muted-foreground font-semibold tracking-wider`. Reference: `dashboard.tsx:999-1005`.
- **Change:** `class-level` — `bg-foreground text-background font-bold text-[10px] uppercase tracking-widest` → `border-b bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; line 141 `border-background/20` → `border-e` (drop the alpha colour).
- **Notes:** Same band in `service-invoice-form.tsx:308` (F15).

### shard-016-F08 · should · high · type
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:162` — `text-[10px] font-bold text-muted-foreground uppercase tracking-widest`
- **Rule:** design-system §2 "Eyebrow: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`" | §10 `Eyebrow`
- **Current:** eyebrows use `font-bold` + `tracking-widest` (lines 162, 196, 235, 243, 285, 294); line 230 `font-bold mb-4 uppercase tracking-wider text-xs`; line 258 `font-bold text-primary text-sm uppercase tracking-wider`; line 266 `text-xs … uppercase font-bold tracking-widest`.
- **Expected:** one eyebrow recipe at 10px/600/`tracking-wider`. Reference: `dashboard.tsx:382`, `:427`.
- **Change:** `class-level` — every listed line → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (line 258 keeps `text-primary` in place of muted; line 230 keeps `mb-4` → `mb-3`).
- **Notes:** —

### shard-016-F09 · should · high · type
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:238` — `<span className="text-xl font-black">{invoice.plate_number}</span>`
- **Rule:** design-system §2 "Figures are mono + tabular — KPI values, plates"; "Truck-drawer plate `text-[15px]` 600 mono"; weight ceiling 600
- **Current:** plate in sans at 20px / 900; table plate in `service-invoices-table.tsx:63` (F26) is `font-black tracking-tight`.
- **Expected:** `font-mono text-[15px] font-semibold` (drawer plate step). Reference: `dashboard.tsx:843`.
- **Change:** `class-level` — `text-xl font-black` → `font-mono text-[15px] font-semibold`; line 246 `font-semibold` unchanged; line 269 Badge `font-black` → remove (Badge already `font-medium`).
- **Notes:** Arabic plates are sans with `dir="rtl"` (§2) — plate strings here may be Arabic; if so add `dir="auto"` and keep sans: use `text-[15px] font-semibold` only.

### shard-016-F10 · should · high · locale
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:65` — `{invoice.plate_number} • {invoice.date.split('T')[0]}`
- **Rule:** design-system §2 "Dates: date-fns `format()`… day-first everywhere — lists and drawers `d MMM yyyy` (C-I2)" | vercel-rules "Locale & i18n" bullet "Dates/times: use `Intl.DateTimeFormat` not hardcoded formats" | §2 "Inline separator is ` · `"
- **Current:** raw ISO `YYYY-MM-DD` slice at lines 65 and 89; `•` separator.
- **Expected:** `format(new Date(invoice.date), 'd MMM yyyy')` and ` · `. Reference: `dashboard.tsx:109`, `:110`.
- **Change:** `class-level` (additive import of `format` from `date-fns`) — lines 65/89: `invoice.date.split('T')[0]` → `format(new Date(invoice.date), 'd MMM yyyy')`; line 65 `•` → `·`.
- **Notes:** Keep the form's `split('T')[0]` (`service-invoice-form.tsx:65`) — that one is a value, not display.

### shard-016-F11 · should · medium · spacing
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:53` — `flex flex-col gap-6 print:gap-4`
- **Rule:** design-system §1 "12px … gap between every top-level block, panel body padding, KPI card padding" | §13 D-S1, D-S3, D-S4
- **Current:** `gap-6` (53, 82), `space-y-6` (84, 227), `gap-4` grid (86), `p-8` (124), `p-6` (229, 262, 310), `mb-10 … pb-8` (126), `p-4` cells (161, 195).
- **Expected:** `gap-3` between blocks and grids, `p-3` bodies, `px-3 py-2.5` list cells. Reference: `dashboard.tsx:99`, `:134`, `:146`, `:940`.
- **Change:** `class-level` — 53 `gap-6 print:gap-4` → `gap-3`; 82 `gap-6` → `gap-3`; 84/227 `space-y-6` → `space-y-3`; 86 `gap-4 print:gap-2` → `gap-3 print:gap-2`; 124 `p-8` → `p-3 sm:p-4`; 229/262/310 `p-6` → `p-3`; 126 `mb-10 … pb-8` → `mb-3 … pb-3`; 161/195 `p-4` → `px-3 py-2.5`.
- **Notes:** Medium because this whole page is a "receipt" artefact with print concerns; the fixer should keep the print variants working.

### shard-016-F12 · should · medium · colour roles
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:158` — `isMatched ? "bg-primary/5" : "hover:bg-muted/30"`
- **Rule:** design-system §3 "Content-row hover `hover:bg-muted/50`"; "Current/selected wash `bg-primary/10 text-primary`"; C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"
- **Current:** `bg-primary/5` selected, `hover:bg-muted/30`, `bg-muted/5` (195), `border-primary/20 bg-primary/5` card (255), `bg-primary/10 … border-primary/20` band (256), `border-primary/10` (278, 284, 293), `bg-background/50` wells (284, 293); StatCard tones `success` (97) for a meter reading and `warning` (108) for a supervisor name — status hues used decoratively.
- **Expected:** selected `bg-primary/10`; hover `bg-muted/50`; wells `bg-muted/40`; tint recipe `border-X/40 bg-X/10`; status colours only for status (§3 "Success — passing status only"). Reference: `dashboard.tsx:425`, `:494`, `:737`.
- **Change:** `class-level` — 158 `bg-primary/5` → `bg-primary/10`, `hover:bg-muted/30` → `hover:bg-muted/50`; 195 drop `bg-muted/5`; 255 `border-primary/20 bg-primary/5` → `border-primary/40 bg-primary/10`; 256 `border-primary/20` → `border-primary/40`; 278/284/293 `border-primary/10` → `border-border/60`, `bg-background/50` → `bg-muted/40`; 97 `tone="success"` → remove prop value (neutral) and 108 `tone="warning"` → remove.
- **Notes:** `tone` values are props on `StatCard` (provisional §12.5) — removing a prop *value* is a class-level change, not a prop deletion.

### shard-016-F13 · nit · medium · content
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:169` — `{item.notes || '-'}`
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`"
- **Current:** hyphen placeholder at lines 169 and 246.
- **Expected:** `<span className="opacity-40">—</span>`. Reference: `dashboard.tsx:765`.
- **Change:** `class-level` — `'-'` → `<span className="opacity-40">—</span>` at both sites.
- **Notes:** —

### shard-016-F14 · nit · high · buttons
- **Where:** `src/widgets/service-invoice-details/service-invoice-details.tsx:58` — `<ArrowLeft className="h-5 w-5" />`
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule… icons inside a Button carry no size classes"
- **Current:** `h-5 w-5` (58) and `h-4 w-4` (76) on icons inside `<Button>` — dead classes.
- **Expected:** no size class. Reference: `header.tsx:23`.
- **Change:** `class-level` — remove `h-5 w-5` / `h-4 w-4` on lines 58 and 76 (keep `aria-hidden`, F02).
- **Notes:** Same pattern in form (134, 153, 155, 361, 374, 376), list page (110, 115, 128), table (101), settings (101), tires (149, 151, 246, 248).

### shard-016-F15 · blocker · high · a11y
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:134` — `<Button variant="ghost" size="icon" onClick={onBack} disabled={submitting}>`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`" | design-system §9 C-I4
- **Current:** back button (134) and the per-row clear button (330-342, has `title` only) have no `aria-label`.
- **Expected:** translated `aria-label`. Reference: `header.tsx:21`.
- **Change:** `class-level` (additive) — 134: add `aria-label={t('common.back')}`; 330: add `aria-label={t('serviceInvoices.form.clearItem')}`; icons `aria-hidden="true"`.
- **Notes:** —

### shard-016-F16 · blocker · high · focus
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:326` — `border-0 rounded-none bg-transparent focus-visible:ring-0 px-4 py-3`
- **Rule:** vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*`" and "Never `outline-none` … without focus replacement" | design-system §4 "Focus ring… on every interactive element (C-B1); `ring-inset` … inside `overflow-hidden` parents"
- **Current:** Textarea (326) and Input (351) strip the ring with `focus-visible:ring-0`, inside an `overflow-hidden` box — 30 cells with no visible focus.
- **Expected:** `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`. Reference: `dashboard.tsx:431`, `:623`.
- **Change:** `class-level` — both lines `focus-visible:ring-0` → `focus-visible:ring-inset focus-visible:ring-offset-0`.
- **Notes:** Input/Textarea primitives already provide `ring-2 ring-ring`; only the reset needs to go.

### shard-016-F17 · blocker · high · RTL/i18n
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:153` — `<Loader2 className="mr-2 h-4 w-4 animate-spin" />`
- **Rule:** design-system §9 C-I1 "no physical `ml-/mr-/left-/right-` utilities" | §14 C-I1
- **Current:** `mr-2` at 153, 155, 361, 374, 376.
- **Expected:** no margin — Button `gap-2` handles spacing (`button.tsx:7`).
- **Change:** `class-level` — remove `mr-2` on all five icons.
- **Notes:** —

### shard-016-F18 · should · high · type
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:138` — `<h1 className="text-2xl font-bold tracking-tight">`
- **Rule:** design-system §2 page title `text-lg sm:text-xl font-semibold leading-tight`; weight ceiling 600; uppercase only at 10px | §13 D-T1/D-T2
- **Current:** h1 24px/700; subtitle `text-sm` (141); card heading h2 `text-2xl font-bold` (168), h3 `text-lg … uppercase tracking-widest` (171); items heading `font-bold text-lg` (303); mobile eyebrows `font-bold … tracking-widest` (321, 346).
- **Expected:** h1 `text-lg font-semibold leading-tight sm:text-xl`; subtitle `mt-0.5 text-[11.5px]`; card heading as eyebrow `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; row eyebrows same. Reference: `dashboard.tsx:103-106`, `:382`.
- **Change:** `class-level` — 138 → `text-lg font-semibold leading-tight sm:text-xl`; 141 `text-sm` → `mt-0.5 text-[11.5px]`; 168 → `text-lg font-semibold leading-tight text-foreground`; 171 → `mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; 303 `font-bold text-lg` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; 321/346 `font-bold … tracking-widest` → `font-semibold … tracking-wider`.
- **Notes:** —

### shard-016-F19 · should · high · radius/border/shadow
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:301` — `rounded-xl border-2 border-muted overflow-hidden bg-card`
- **Rule:** design-system §4 "no `border-2`"; C-R1 "`rounded-xl` retired"; §6 panel head `bg-muted/60`
- **Current:** 165 `border-2 border-muted/50`; 301 `rounded-xl border-2 border-muted`; 302 `bg-muted/50 p-4 border-b`; 308 `bg-foreground text-background font-semibold text-sm` head band; 317 `divide-y-2 divide-muted`; 320 `md:border-e-2 border-muted`; 346 `border-muted/50`; 359 `border-t-2 border-muted bg-muted/5`.
- **Expected:** `rounded-lg border`, `divide-y`, `border-e`, head band `border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`. Reference: `dashboard.tsx:135`, `:999-1005`.
- **Change:** `class-level` — 165 remove `border-2 border-muted/50`; 301 → `rounded-lg border overflow-hidden bg-card`; 302 → `bg-muted/60 px-3 py-2 border-b`; 308 → `border-b bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; 309 `border-background/20` → drop colour (`border-e`); 317 → `divide-y`; 320 → `md:border-e`; 346 → drop colour; 359 → `border-t bg-muted/40`.
- **Notes:** —

### shard-016-F20 · should · high · colour roles
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:319` — `group hover:bg-muted/10 transition-colors`
- **Rule:** design-system §3 "Content-row hover `hover:bg-muted/50`"; C-C2 three tint steps
- **Current:** `hover:bg-muted/10` (319), `bg-muted/5` (345), `bg-muted/5` (359).
- **Expected:** `hover:bg-muted/50`, wells `bg-muted/40`. Reference: `dashboard.tsx:616`.
- **Change:** `class-level` — 319 `/10` → `/50`; 345 drop `bg-muted/5`; 359 `bg-muted/5` → `bg-muted/40`.
- **Notes:** —

### shard-016-F21 · should · high · hover/focus
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:329` — `absolute top-2 start-2 opacity-0 group-hover:opacity-100 transition-opacity`
- **Rule:** vercel-rules "Focus States" bullet "Group focus with `:focus-within` for compound controls"; "Interactive elements need visible focus"
- **Current:** the clear button is invisible until mouse hover; a keyboard user tabbing onto it never sees it.
- **Expected:** reveal on focus too. Reference: `command-palette.tsx:305` uses `group-aria-selected:opacity-100` (state-driven, keyboard-safe).
- **Change:** `class-level` — add `group-focus-within:opacity-100 focus-within:opacity-100`.
- **Notes:** —

### shard-016-F22 · should · medium · spacing
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:163` — `className="space-y-8 pb-20"`
- **Rule:** design-system §1 12px master step | §13 D-S1/D-S4 | provisional (§12.2) form grid `grid gap-4 md:grid-cols-2`
- **Current:** `gap-6` (130), `space-y-8 pb-20` (163), `mb-8` (167), `gap-x-12 gap-y-6` (176), `p-4` cells (302, 359).
- **Expected:** `gap-3` blocks, `gap-4` form grid (provisional), `px-3 py-2` head strips. Reference: `dashboard.tsx:99`.
- **Change:** `class-level` — 130 `gap-6` → `gap-3`; 163 `space-y-8` → `space-y-3` (keep `pb-20` for the fixed bar); 167 `mb-8` → `mb-3`; 176 `gap-x-12 gap-y-6` → `gap-4`.
- **Notes:** —

### shard-016-F23 · should · medium · safe areas / z-index
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:368` — `fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur-lg border-t p-4 flex gap-3 lg:hidden z-50`
- **Rule:** vercel-rules "Safe Areas & Layout" bullet "Full-bleed layouts need `env(safe-area-inset-*)`" | design-system §0.3 "`.safe-bottom` maps to `env(safe-area-inset-*)`" | §0.5 z-index scale "Header is `z-30`"; §3 header glass `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60`
- **Current:** fixed bottom bar with no safe-area inset, `z-50` (an undocumented tier above the header and below overlays), `backdrop-blur-lg`.
- **Expected:** `safe-bottom` class, `z-30` (same tier as the sticky header), header glass recipe. Reference: `header.tsx:15`, `index.css:137-143`.
- **Change:** `class-level` — `backdrop-blur-lg` → `backdrop-blur supports-[backdrop-filter]:bg-background/60`; `z-50` → `z-30`; add `safe-bottom`; `p-4 gap-3` → `p-3 gap-2`.
- **Notes:** Provisional §12.2 sticky submit footer is `sticky bottom-4 … rounded-lg border bg-card p-3 shadow-md` — a structural alternative; not required.

### shard-016-F24 · should · medium · motion
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:153` — `animate-spin`
- **Rule:** design-system §8 "Reduced motion: … opt-out is per element (`motion-reduce:animate-none`)"; C-M2 | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** `Loader2 animate-spin` at 153 and 374 with no reduced-motion guard.
- **Expected:** `animate-spin motion-reduce:animate-none`. Reference: `skeleton.tsx:4`, `dashboard.tsx:227`.
- **Change:** `class-level` — add `motion-reduce:animate-none` at both sites.
- **Notes:** Same at `service-invoices.tsx:128,130` and `tires.tsx:149,244` (F32, F43).

### shard-016-F25 · nit · medium · forms
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:258` — `<Input type="number" {...field} onChange={…} />`
- **Rule:** vercel-rules "Forms" bullet "Use correct `type` … and `inputmode`"; "Inputs need `autocomplete`"
- **Current:** meter reading is `type="number"` with no `inputMode`; supervisor/region inputs (276, 290) have no `autoComplete`.
- **Expected:** `inputMode="numeric"` on the meter input; `autoComplete="off"` on the free-text fields.
- **Change:** `class-level` (additive props) — 258 add `inputMode="numeric"`; 276/290 add `autoComplete="off"`.
- **Notes:** —

### shard-016-F26 · should · medium · a11y
- **Where:** `src/widgets/service-invoice-form/service-invoice-form.tsx:135` — `<ArrowLeft className="h-5 w-5" />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"
- **Current:** lucide icons beside visible text (155, 361, 374, 376) and the spinner (153) are announced as `<svg>` with no hiding.
- **Expected:** `aria-hidden="true"` on decorative icons. Reference: `dashboard.tsx:756` (`aria-hidden` on dots/chevrons).
- **Change:** `class-level` (additive prop) — add `aria-hidden="true"` to every lucide icon in the file.
- **Notes:** Applies equally to `service-invoice-details.tsx`, `service-invoices.tsx`, `service-invoices-table.tsx`, `settings.tsx:101`, `tires.tsx` (41, 76, 149, 151, 186, 244, 246), `terminal-select.tsx:131` — see F47 for the terminal-select one; the fixer should sweep all shard files.

### shard-016-F27 · blocker · high · a11y / focus
- **Where:** `src/pages/service-invoices/service-invoices.tsx:143` — `<button onClick={() => setSearchQuery('')} className="absolute inset-y-0 end-0 flex items-center pe-4 text-muted-foreground hover:text-foreground transition-colors">`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`" | "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*`" | design-system §4 C-B1
- **Current:** raw `<button>` with an `X` icon only, no `aria-label`, no `type="button"`, no focus ring.
- **Expected:** `aria-label={t('common.clear')}` (or nearest existing key), `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md`. Reference: `dashboard.tsx:244`.
- **Change:** `class-level` — add `type="button" aria-label={t('common.clear', { defaultValue: 'Clear' })}` and `rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; icon `aria-hidden="true"`. `out-of-shard: src/shared/i18n/en.json, ar.json` if `common.clear` does not exist.
- **Notes:** Provisional §12.2 `SearchInput` primitive (`ps-9`, ghost `h-7 w-7` clear, Escape clears) is the structural alternative.

### shard-016-F28 · blocker · high · forms
- **Where:** `src/pages/service-invoices/service-invoices.tsx:135` — `<Input type="text" placeholder={t('serviceInvoices.searchPlaceholder')} …`
- **Rule:** vercel-rules "Accessibility" bullet "Form controls need `<label>` or `aria-label`" | "Anti-patterns" bullet "Form inputs without labels"
- **Current:** the search input has only a placeholder.
- **Expected:** `aria-label={t('serviceInvoices.searchPlaceholder')}`, `type="search"`, `autoComplete="off"`. Reference: `header.tsx` search trigger carries a translated label.
- **Change:** `class-level` (additive props) — add `aria-label`, `autoComplete="off"`, `name="q"`.
- **Notes:** —

### shard-016-F29 · blocker · high · colour roles
- **Where:** `src/pages/service-invoices/service-invoices.tsx:158` — `<Search className="h-3 w-3 text-blue-500" />`
- **Rule:** design-system §0.2 palette comment "Adding a third accent colour breaks the whole scheme, so don't."
- **Current:** `text-blue-500` on the keyword-match legend icon.
- **Expected:** `text-muted-foreground` (neutral) to pair with F01. Reference: `dashboard.tsx:811` legend in muted.
- **Change:** `class-level` — `text-blue-500` → `text-muted-foreground`.
- **Notes:** Keep consistent with F01.

### shard-016-F30 · blocker · high · RTL/i18n
- **Where:** `src/pages/service-invoices/service-invoices.tsx:110` — `<ArrowLeft className="mr-2 h-4 w-4" />`
- **Rule:** design-system §9 C-I1 no physical margins; "Directional chevrons get `rtl:rotate-180`" | provisional (§12.7) back button `ArrowLeft rtl:rotate-180`
- **Current:** `mr-2` at 110 and 115; back arrow does not mirror in RTL.
- **Expected:** no margin, `rtl:rotate-180` on the arrow. Reference: `cairo-range-calendar.tsx:97`.
- **Change:** `class-level` — 110 `mr-2 h-4 w-4` → `rtl:rotate-180`; 115 remove `mr-2 h-4 w-4`.
- **Notes:** The details/form back arrows (`service-invoice-details.tsx:58`, `service-invoice-form.tsx:135`) need the same `rtl:rotate-180`.

### shard-016-F31 · should · high · radius/border/shadow
- **Where:** `src/pages/service-invoices/service-invoices.tsx:123` — `border-2 border-primary/20 shadow-lg shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/5`
- **Rule:** design-system §4 "Cards are `border bg-card` with no shadow — separation is tone plus a hairline"; "no `border-2`" | §0.2 "colour on this screen is information rather than decoration"
- **Current:** search card with 2px navy border, coloured shadow and a gradient; Input (138) `py-6 text-lg border-2 border-muted … rounded-2xl shadow-inner bg-background/50`.
- **Expected:** plain `Card` (`rounded-lg border bg-card`), Input on the control recipe (`h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm`, provisional §12.2 — same box as `SelectTrigger` §5.4). Reference: `select.tsx:18`, `dashboard.tsx:135`.
- **Change:** `class-level` — 123: remove `border-2 border-primary/20 shadow-lg shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/5`; 138: `ps-12 pe-12 py-6 text-lg border-2 border-muted focus-visible:border-primary/50 rounded-2xl shadow-inner bg-background/50` → `ps-9 pe-9`; icons 128/130/132/147 `h-5 w-5` → `h-4 w-4`; 126 `ps-4` → `ps-3`.
- **Notes:** `rounded-2xl` is outside the token family entirely (§4 C-R1).

### shard-016-F32 · should · medium · motion
- **Where:** `src/pages/service-invoices/service-invoices.tsx:130` — `<Sparkles className="h-5 w-5 text-primary animate-pulse" />`
- **Rule:** design-system §8 "Looping: `animate-pulse` on skeletons and on the live/connecting badge dot… Nothing else loops"; C-M2 `motion-reduce:animate-none` | vercel-rules "Animation" "Honor `prefers-reduced-motion`"
- **Current:** a pulsing icon while a search is active (not loading) and a spinner (128) without a reduced-motion guard.
- **Expected:** static icon; spinner with `motion-reduce:animate-none`. Reference: `dashboard.tsx:227`.
- **Change:** `class-level` — 130 remove `animate-pulse`; 128 add `motion-reduce:animate-none`.
- **Notes:** —

### shard-016-F33 · should · high · type
- **Where:** `src/pages/service-invoices/service-invoices.tsx:152` — `text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60`
- **Rule:** design-system §2 eyebrow `font-semibold tracking-wider text-muted-foreground`; C-C5 "`text-muted-foreground` for secondary text… opacity only for parts of an already-coloured element" | §6 legend `mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground`
- **Current:** legend at 10px/700/`tracking-widest`/`muted-foreground/60`, `mt-4 gap-4`.
- **Expected:** legend recipe. Reference: `dashboard.tsx:811-818`.
- **Change:** `class-level` — `mt-4 flex flex-wrap gap-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60` → `mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground`.
- **Notes:** —

### shard-016-F34 · should · medium · spacing
- **Where:** `src/pages/service-invoices/service-invoices.tsx:121` — `<div className="flex flex-col gap-6">`
- **Rule:** design-system §1 "12px … gap between every top-level block" | §13 D-S1, D-S3
- **Current:** `gap-6` between blocks; search `CardContent p-6` (124).
- **Expected:** `gap-3`, `p-3`. Reference: `dashboard.tsx:99`.
- **Change:** `class-level` — 121 `gap-6` → `gap-3`; 124 `p-6` → `p-3`.
- **Notes:** The `PageShell` wrapper (`gap-6 p-4 md:p-6 lg:p-8`) is D-S1 — `out-of-shard: src/shared/ui/page-shell.tsx`.

### shard-016-F35 · should · medium · navigation & state
- **Where:** `src/pages/service-invoices/service-invoices.tsx:49` — `const [carPage, setCarPage] = React.useState(1);`
- **Rule:** vercel-rules "Navigation & State" bullet "URL reflects state—filters, tabs, pagination, expanded panels in query params" | provisional (§12.7) "URL-synced list state with short keys (`?tab, q, md, rs, p, l`) written with `replace:true` starting from current params"
- **Current:** `q` is in the URL but `carPage`, `invoicePage`, `searchPage` and `selectedCar` live in `useState` — a refresh or shared link loses the page and the selected car.
- **Expected:** `p` (and the car id) in search params, as trips does (`trips.tsx:156-189`).
- **Change:** `structural` — mirror the `q` pattern already in the file (lines 41-47) for `p` and a car-id key; keep the existing `useState` setters as wrappers so no handler is removed.
- **Notes:** Medium: the dashboard has no pagination of its own; the rule is the Vercel bullet plus the provisional trips pattern.

### shard-016-F36 · blocker · high · a11y
- **Where:** `src/widgets/service-invoices-table/service-invoices-table.tsx:100` — `<Button variant="ghost" className="h-8 w-8 p-0">` + `<MoreHorizontal className="h-4 w-4" />`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`" | design-system §9 C-I4
- **Current:** row actions trigger has no accessible name.
- **Expected:** `aria-label={t('common.actions', { defaultValue: 'Actions' })}`. Reference: `user-menu.tsx` trigger carries a translated label.
- **Change:** `class-level` (additive) — add `aria-label` (+ `size="icon"` instead of `h-8 w-8 p-0` is optional); icon `aria-hidden="true"`. `out-of-shard: locale files` if the key is new.
- **Notes:** —

### shard-016-F37 · blocker · high · RTL/i18n
- **Where:** `src/widgets/service-invoices-table/service-invoices-table.tsx:74` — `<div className="text-right font-mono">`
- **Rule:** design-system §9 C-I1 logical utilities everywhere; §6 "`text-end` on a fixed grid column"
- **Current:** `text-right` (74, 97); `mr-2` on menu icons (111, 121, 129).
- **Expected:** `text-end`; icon gap via `gap-2`/`me-2`. Reference: `dashboard.tsx:991`; `dropdown-menu.tsx` items.
- **Change:** `class-level` — 74/97 `text-right` → `text-end`; 111/121/129 `mr-2` → `me-2`.
- **Notes:** —

### shard-016-F38 · blocker · high · locale
- **Where:** `src/widgets/service-invoices-table/service-invoices-table.tsx:56` — `{date.toISOString().split('T')[0]}`
- **Rule:** design-system §14 C-I2 "day-first `d MMM yyyy` everywhere"; §2 dates | vercel-rules "Locale & i18n" "Dates/times: use `Intl.DateTimeFormat` not hardcoded formats"
- **Current:** year-first ISO slice (also shifts the day for Cairo times after 22:00 UTC — `toISOString` is UTC).
- **Expected:** `format(new Date(row.getValue('date')), 'd MMM yyyy')` in `font-mono text-[12.5px] tabular-nums` (provisional §12.4 date cell). Reference: `dashboard.tsx:619` (post-C-I2).
- **Change:** `class-level` (additive import) — `<div className="font-medium">{date.toISOString().split('T')[0]}</div>` → `<div className="font-mono tabular-nums">{format(date, 'd MMM yyyy')}</div>`.
- **Notes:** —

### shard-016-F39 · should · high · type
- **Where:** `src/widgets/service-invoices-table/service-invoices-table.tsx:63` — `<div className="font-black tracking-tight">{row.getValue('plate_number')}</div>`
- **Rule:** design-system §2 "Figures are mono + tabular — KPI values, plates"; weight ceiling 600; "Arabic text is always sans (`dir="rtl"` plates)"
- **Current:** plate at 900 weight, sans, `tracking-tight`.
- **Expected:** `font-mono font-semibold` for Latin plates / `dir="auto"` sans for Arabic. Reference: `dashboard.tsx:744`, `:755`.
- **Change:** `class-level` — `font-black tracking-tight` → `font-semibold` + `dir="auto"` (add `font-mono` only if plates are Latin).
- **Notes:** —

### shard-016-F40 · should · medium · colour roles
- **Where:** `src/widgets/service-invoices-table/service-invoices-table.tsx:85` — `<Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"; §5.3 Badge primitive recipe `gap-1.5`
- **Current:** hand-overridden `secondary` badge with `border-primary/20` and `gap-1`.
- **Expected:** `border-primary/40 bg-primary/10 text-primary`, default `gap-1.5`. Reference: `badge.tsx:5-20`.
- **Change:** `class-level` — `gap-1 bg-primary/10 text-primary border-primary/20` → `border-primary/40 bg-primary/10 text-primary`.
- **Notes:** —

### shard-016-F41 · should · medium · navigation
- **Where:** `src/widgets/service-invoices-table/service-invoices-table.tsx:105` — `<DropdownMenuItem onClick={() => { … navigate(url, { state: { invoice } }); }}>`
- **Rule:** vercel-rules "Navigation & State" bullet "Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)" | "Anti-patterns" "Inline `onClick` navigation without `<a>`"
- **Current:** View (105) and Edit (115) navigate via `onClick`; the Edit item has intent prefetch but no href.
- **Expected:** `DropdownMenuItem asChild` wrapping a `<Link to=… state=…>` (the `onClick` handler can stay on the item). Reference: `dashboard.tsx:611-617` fuel row is a `<Link>` carrying `state.from`; `sidebar.tsx` uses `NavLink`.
- **Change:** `structural` — wrap each navigating item's content in `<Link>` via `asChild`, keeping the existing `onClick`/intent props.
- **Notes:** —

### shard-016-F42 · nit · low · colour roles
- **Where:** `src/widgets/service-invoices-table/service-invoices-table.tsx:126` — `className="text-destructive focus:bg-destructive/10 focus:text-destructive"`
- **Rule:** design-system §3 "destructive menu item keeps red on focus (`user-menu.tsx:92`)"
- **Current:** adds a `focus:bg-destructive/10` fill the reference sign-out item does not have.
- **Expected:** `text-destructive focus:text-destructive` only (focus background stays the accent). Reference: `user-menu.tsx:92`.
- **Change:** `class-level` — remove `focus:bg-destructive/10`.
- **Notes:** —

### shard-016-F43 · blocker · high · i18n
- **Where:** `src/pages/settings/settings.tsx:65` — `<CardTitle>PetroApp Configuration</CardTitle>`
- **Rule:** design-system §9 "Copy, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)" | §14 C-I4
- **Current:** hard-coded English at 26-27 (zod messages), 47, 51 (toasts), 65, 67, 78, 80, 91, 93, 102.
- **Expected:** `t('settings.petroapp.title', { defaultValue: 'PetroApp Configuration' })` etc. Reference: `header.tsx:21` post-C-I4.
- **Change:** `class-level` (additive) — wrap every string in `t(key, { defaultValue })`; zod messages via a resolver-level `t` or `t()` at the `FormMessage` — `out-of-shard: src/shared/i18n/en.json, ar.json` for the new keys.
- **Notes:** The Save label already exists as `common.save`.

### shard-016-F44 · blocker · high · RTL/i18n
- **Where:** `src/pages/settings/settings.tsx:101` — `<Save className="mr-2 h-4 w-4" />`
- **Rule:** design-system §9 C-I1 no physical margins; §5.1 Button icons carry no size classes
- **Current:** `mr-2 h-4 w-4`.
- **Expected:** no classes (Button supplies `gap-2` and `size-4`). Reference: `header.tsx:23`.
- **Change:** `class-level` — remove `mr-2 h-4 w-4`; add `aria-hidden="true"`.
- **Notes:** —

### shard-016-F45 · should · medium · forms
- **Where:** `src/pages/settings/settings.tsx:80` — `<Input placeholder="Enter token" {...field} />`
- **Rule:** vercel-rules "Forms" bullets "Disable spellcheck on emails, codes, usernames (`spellCheck={false}`)", "`autocomplete="off"` on non-auth fields to avoid password manager triggers", "Placeholders end with `…`", "Submit button stays enabled until request starts; spinner during request"
- **Current:** token/cookie inputs have no `spellCheck={false}`/`autoComplete="off"`; placeholders lack `…`; the submit button is disabled while pending with no spinner (100-103).
- **Expected:** `autoComplete="off" spellCheck={false}` on both; `Loader2 animate-spin motion-reduce:animate-none` replacing the `Save` icon while `mutation.isPending` (provisional §12.6 spinner pattern, as in `tires.tsx:148-152`).
- **Change:** `class-level` (additive) — add the two props to both inputs; placeholders `"Enter token…"`/`"Enter cookie…"` (via `t()`, F43); swap icon on pending.
- **Notes:** —

### shard-016-F46 · should · medium · spacing
- **Where:** `src/pages/settings/settings.tsx:61` — `<div className="mx-auto max-w-2xl space-y-6">`
- **Rule:** design-system §1 12px block gap | §13 D-S1/D-S3/D-S4
- **Current:** `space-y-6` between cards, `space-y-4` fields (72); `CardHeader`/`CardContent` default `p-6`.
- **Expected:** `space-y-3` between cards; form field stack per provisional §12.2 `space-y-4` is acceptable (no dashboard rule). Reference: `dashboard.tsx:99`.
- **Change:** `class-level` — 61 `space-y-6` → `space-y-3`. Card padding is `out-of-shard: src/shared/ui/card.tsx` (D-S3).
- **Notes:** —

### shard-016-F47 · blocker · medium · a11y
- **Where:** `src/widgets/terminal-select/terminal-select.tsx:131` — `<AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`"; "Async updates (toasts, validation) need `aria-live="polite"`"
- **Current:** the unresolved-name hint appears asynchronously (after terminals load) with an unhidden icon and no live region.
- **Expected:** `aria-hidden="true"` on the icon; `role="status"` / `aria-live="polite"` on the `<p>`. Reference: `dashboard.tsx:1027` DegradedStrip icon is decorative.
- **Change:** `class-level` (additive props) — line 130 add `role="status"`; line 131 add `aria-hidden="true"`.
- **Notes:** The hint recipe itself (`mt-1 flex items-start gap-1.5 text-[11px] font-medium text-warning`) is the provisional §12.2 reference — do not change classes.

### shard-016-F48 · blocker · high · colour roles
- **Where:** `src/pages/tires/tires.tsx:186` — `<Droplets className="h-4 w-4 text-amber-500" />`
- **Rule:** design-system §0.2 palette comment "Two hues, one job each… Adding a third accent colour breaks the whole scheme"; `--money` amber is "anything someone gets paid"
- **Current:** Tailwind `amber-500` (a non-token hue) on the oil icon; the tires icon (76) is `text-primary`.
- **Expected:** token colour; match the sibling card: `text-primary`. Reference: `dashboard.tsx` uses no non-token colours (§3 "No hex/rgb in any dashboard or shell TSX").
- **Change:** `class-level` — `text-amber-500` → `text-primary`.
- **Notes:** Do not use `text-money` — oil litres are not money (§3 "explicitly not for revenue" applies in reverse).

### shard-016-F49 · blocker · high · empty states
- **Where:** `src/pages/tires/tires.tsx:84` — `<p className="text-sm text-muted-foreground">{t('tiresStock.empty')}</p>`
- **Rule:** design-system §14 C-S3 "one recipe `py-6 text-center text-xs text-muted-foreground`"; §7 "Empties are bare muted paragraphs"
- **Current:** `text-sm`, start-aligned, no padding (84, 194).
- **Expected:** `py-6 text-center text-xs text-muted-foreground`. Reference: `dashboard.tsx:180-183`.
- **Change:** `class-level` — both lines `text-sm text-muted-foreground` → `py-6 text-center text-xs text-muted-foreground`.
- **Notes:** —

### shard-016-F50 · blocker · medium · loading
- **Where:** `src/pages/tires/tires.tsx:82` — `<Skeleton className="h-24" />`
- **Rule:** design-system §14 C-R2 "a skeleton takes the radius of the box it stands in: cards `rounded-lg`"; §7 "Loading is always the `Skeleton` primitive shaped like the slot"
- **Current:** default `rounded-md` skeleton (82, 192) standing in for a `rounded-lg border` table box.
- **Expected:** `Skeleton className="h-24 rounded-lg"`. Reference: `dashboard.tsx:162`.
- **Change:** `class-level` — add `rounded-lg` at both sites.
- **Notes:** Same at `pages/service-invoices/service-invoice-details.tsx:17-18` and `service-invoice-edit.tsx:33-34` (F55).

### shard-016-F51 · should · high · type
- **Where:** `src/pages/tires/tires.tsx:108` — `<td className="px-3 py-2 text-end font-semibold tabular-nums">`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`)"; "Labels recede, figures lead"
- **Current:** quantities (108) and litres (210) in sans `font-semibold tabular-nums`.
- **Expected:** `font-mono tabular-nums` (600 weight not needed in a column). Reference: `dashboard.tsx:509` dd `font-mono tabular-nums`.
- **Change:** `class-level` — `font-semibold tabular-nums` → `font-mono tabular-nums` at both lines.
- **Notes:** D-T5 notes trips forms also drop mono; the dashboard rule wins.

### shard-016-F52 · should · medium · motion
- **Where:** `src/pages/tires/tires.tsx:149` — `<Loader2 className="h-4 w-4 animate-spin" />`
- **Rule:** design-system §8 C-M2 per-element `motion-reduce:animate-none` | vercel-rules "Animation" "Honor `prefers-reduced-motion`"
- **Current:** spinners at 149 and 244 without the guard; icons carry dead `h-4 w-4` (§5.1).
- **Expected:** `animate-spin motion-reduce:animate-none`, no size class. Reference: `skeleton.tsx:4`.
- **Change:** `class-level` — 149/244 `h-4 w-4 animate-spin` → `animate-spin motion-reduce:animate-none`; 151/246 remove `h-4 w-4`; all four `aria-hidden="true"`.
- **Notes:** —

### shard-016-F53 · should · medium · spacing
- **Where:** `src/pages/tires/tires.tsx:43` — `<div className="grid gap-6 xl:grid-cols-2">`
- **Rule:** design-system §1 12px grid gap; §0.4 breakpoints "sm/md/lg only" | §13 D-S1, D-S9 (`xl` added by trips)
- **Current:** `gap-6` and an `xl` breakpoint; forms `p-4` (118, 220).
- **Expected:** `grid gap-3 lg:grid-cols-2`; form well `p-3`. Reference: `dashboard.tsx:134`.
- **Change:** `class-level` — 43 `gap-6 xl:grid-cols-2` → `gap-3 lg:grid-cols-2`; 118/220 `p-4` → `p-3`.
- **Notes:** `CardHeader`/`CardContent` `p-6` — `out-of-shard: src/shared/ui/card.tsx` (D-S3).

### shard-016-F54 · should · medium · forms
- **Where:** `src/pages/tires/tires.tsx:144` — `{(form.formState.errors.brand ?? form.formState.errors.on_hand_qty) && (<p className="text-xs text-destructive">`
- **Rule:** vercel-rules "Forms" bullet "Errors inline next to fields; focus first error on submit" | provisional (§12.2) validation "control gets `border-destructive` + `aria-invalid` + `aria-describedby`; message `p text-[11px] font-medium text-destructive`"
- **Current:** one combined message under the grid; the failing input is not marked `aria-invalid`; number inputs (135, 229) lack `inputMode`.
- **Expected:** `aria-invalid` on the offending input (additive), message `text-[11px] font-medium`; `inputMode="numeric"` / `"decimal"`.
- **Change:** `class-level` (additive) — add `aria-invalid={!!form.formState.errors.brand}` etc. to inputs; 145/240 `text-xs` → `text-[11px] font-medium`; 135 add `inputMode="numeric"`, 229 add `inputMode="decimal"`.
- **Notes:** Keep the shared message (branch not deleted); marking the input is the additive part.

### shard-016-F55 · nit · low · tables
- **Where:** `src/pages/tires/tires.tsx:88` — `<thead className="bg-muted/50 text-xs text-muted-foreground">`
- **Rule:** design-system §3 C-C2 "`/60` head band"; §6 panel head 10px eyebrow | provisional (§12.4) DataTable thead `bg-muted/50 text-xs uppercase tracking-wider`, `th font-medium`
- **Current:** `bg-muted/50`, no uppercase/tracking, `th px-3 py-2` unweighted (88-93, 198-201).
- **Expected:** `bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`, `th px-3 py-2`. Reference: `dashboard.tsx:1001`.
- **Change:** `class-level` — thead → `bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` at both tables.
- **Notes:** No dashboard `<table>` rule — nit, mapping via the head-band recipe.

### shard-016-F56 · nit · low · i18n
- **Where:** `src/pages/tires/tires.tsx:131` — `placeholder="315/80R22.5"`
- **Rule:** vercel-rules "Forms" bullet "Placeholders end with `…` and show example pattern" | design-system §9 C-I4 copy through `t()`
- **Current:** literal example placeholders (131, 225) outside `t()` and without `…`.
- **Expected:** `t('tiresStock.sizePlaceholder', { defaultValue: '315/80R22.5…' })`.
- **Change:** `class-level` — wrap in `t()` with `defaultValue`; `out-of-shard: locale files` for keys.
- **Notes:** —

### shard-016-F57 · should · high · spacing
- **Where:** `src/pages/service-invoices/service-invoice-details.tsx:26` — `<div className="container max-w-6xl mx-auto py-8 px-4">`
- **Rule:** design-system §1 "Page: `mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4`"; §0.4 "The Tailwind `container` … is configured but unused" | §13 D-S1
- **Current:** `container … py-8 px-4` at `service-invoice-details.tsx:16,26`, `service-invoice-edit.tsx:32,42`, `service-invoice-new.tsx:28`; `max-w-5xl` on new/edit vs `max-w-6xl` on details.
- **Expected:** the dashboard page frame. Reference: `dashboard.tsx:99`.
- **Change:** `class-level` — all five: `container max-w-5xl|6xl mx-auto py-8 px-4 [space-y-6]` → `mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4`.
- **Notes:** —

### shard-016-F58 · blocker · medium · loading
- **Where:** `src/pages/service-invoices/service-invoice-details.tsx:17` — `<Skeleton className="h-12 w-1/3" />` / `<Skeleton className="h-[800px] w-full" />`
- **Rule:** design-system §14 C-R2 "text bars `rounded-sm`, cards `rounded-lg`"; §7 "Skeleton shaped like the slot"; C-S6 "so the layout doesn't reflow when the real page mounts"
- **Current:** default `rounded-md` bars at `service-invoice-details.tsx:17-18` and `service-invoice-edit.tsx:33-34`; an 800/600px block does not resemble the header + stat grid + card it stands in for.
- **Expected:** `h-5 w-1/3 rounded-sm` title bar, `grid grid-cols-2 gap-3 md:grid-cols-3` of `h-[92px] rounded-lg`, then `h-96 rounded-lg`. Reference: `app/router/index.tsx` fallback (C-S6), `dashboard.tsx:123-128`.
- **Change:** `class-level` — 17: `h-12 w-1/3` → `h-5 w-1/3 rounded-sm`; 18: `h-[800px] w-full` → `h-96 w-full rounded-lg` (+ optionally the stat-grid row); same on edit page 33-34.
- **Notes:** —

### shard-016-F59 · should · medium · empty/error states
- **Where:** `src/pages/service-invoices/service-invoice-details.tsx:23` — `if (!invoice) return null;`
- **Rule:** design-system §7 "Failures are inline and persistent — a strip or muted copy in place"; C-S3 empty recipe | vercel-rules "Content Handling" bullet "Handle empty states—don't render broken UI for empty strings/arrays"
- **Current:** a missing/failed invoice renders a blank page (details 23, edit 39); the query's `isError` is never read.
- **Expected:** `<p className="py-6 text-center text-xs text-muted-foreground">{t('common.noResults')}</p>` inside the page frame (keep the `return null` branch structure: render the paragraph instead of `null`). Reference: `dashboard.tsx:170-173`.
- **Change:** `structural` (branch kept, its output changes from `null` to the muted paragraph) — both pages.
- **Notes:** —

## Summary
FINDINGS: 59 (blocker 20 / should 33 / nit 6)
