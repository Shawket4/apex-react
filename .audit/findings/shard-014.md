# Findings — shard-014

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/locations-terminal-dialog/index.ts` | 1 | no UI content | barrel export |
| `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx` | 577 | audited | Full-bleed dialog bands match provisional §12.6; `Switch` primitive: no rule; `max-w-2xl` sized to content (C-B6 analogue, provisional §12.6) — no finding |
| `src/widgets/locations-terminals-table/columns.tsx` | 122 | audited | Column definitions only; DataTable chrome is out-of-shard (`shared/ui/data-table.tsx`) |
| `src/widgets/locations-terminals-table/index.ts` | 1 | no UI content | barrel export |
| `src/widgets/locations-terminals-table/locations-terminals-table.tsx` | 30 | audited | Thin wrapper over `DataTable`; `pageSize={50}` — no rule; empty copy goes through `t()` — nothing to flag |
| `src/entities/maint-stock/api.ts` | 38 | no UI content | |
| `src/entities/maint-stock/queries.ts` | 44 | no UI content | |
| `src/entities/maint-stock/schemas.ts` | 43 | no UI content | |
| `src/entities/mapping/api.ts` | 30 | no UI content | |
| `src/entities/mapping/queries.ts` | 82 | no UI content | |
| `src/entities/mapping/schemas.ts` | 36 | no UI content | |
| `src/entities/oil-change/api.ts` | 83 | no UI content | |
| `src/entities/oil-change/queries.ts` | 104 | no UI content | Mutation toasts (`toast.success/error` via `t()`) are the provisional §12.6 feedback pattern; §13 D-ST3 records toasts as a known trips deviation — not flagged here (no classes, pure hooks) |
| `src/entities/oil-change/schemas.ts` | 160 | no UI content | |
| `src/widgets/oil-change-form/oil-change-form.tsx` | 485 | audited | `Card`/`Form`/`SearchableSelect`/`DatePicker` are provisional §12.2 primitives; the sticky footer band and `-mx-4 md:-mx-6` bleed have only a provisional rule (§12.2) |
| `src/widgets/oil-change-form/oil-change-status-preview.tsx` | 101 | audited | Status card is a provisional §12.2 inline banner; `formatNumber` from `format-number.ts` is the second helper recorded in §13 D-T14 |

## Findings

### shard-014-F01 · blocker · high · RTL/i18n
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:241` — `className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 text-xs text-primary"`
- **Rule:** design-system §9 "Rule C-I1: no physical `ml-/mr-/left-/right-` utilities" | §14 C-I1 "logical utilities everywhere"
- **Current:** `left-0 right-0` physical inset utilities on the auto-assigned-driver hint.
- **Expected:** logical `start-0 end-0` (reference: `dashboard.tsx` uses `end-1.5` for the tile dot, §5.2 Tile recipe `absolute end-1.5 top-1.5`).
- **Change:** `left-0 right-0` → `start-0 end-0` — `class-level`
- **Notes:** Because both edges are set the visual result is the same in RTL; the ruling is nonetheless explicit that physical utilities are not used. Also note this element is `absolute` inside a `FormItem` that is not `relative` — see F02.

### shard-014-F02 · should · medium · spacing
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:241` — `<div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 text-xs text-primary">`
- **Rule:** vercel-rules "Content Handling" bullet "Text containers handle long content"; vercel-rules "Safe Areas & Layout" bullet "Flex/grid over JS measurement for layout"
- **Current:** the hint is `absolute bottom-0` but its `FormItem` parent carries no `relative`; it positions against the nearest positioned ancestor (the `CardContent` grid / card), overlapping whatever sits at the card's bottom edge rather than flowing under the driver control. The `FormMessage` below it flows normally, so error and hint can overlap.
- **Expected:** a non-blocking hint flows in the field stack (provisional §12.2: "Non-blocking hint `mt-1 flex items-start gap-1.5 text-[11px] font-medium text-warning`" — here the colour stays `text-primary` because the hint is informational, not a warning).
- **Change:** `absolute bottom-0 left-0 right-0 flex items-center gap-1.5 text-xs text-primary` → `mt-1 flex items-center gap-1.5 text-[11px] font-medium text-primary` — `class-level`
- **Notes:** If the fixer prefers to keep absolute positioning, add `relative` to the enclosing `FormItem` (`className="relative"`) instead; that is also class-level. Do not remove the branch.

### shard-014-F03 · blocker · high · buttons & controls
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:253` — `className="ms-auto inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"`
- **Rule:** design-system §4 "Focus ring. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element (C-B1)" | vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"
- **Current:** raw `<button>` (the "clear auto-assigned driver" control) with hover classes but no focus-visible ring.
- **Expected:** every clickable carries `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (`dashboard.tsx` tile/rows, §10 "Focus" recipe).
- **Change:** append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — `class-level`
- **Notes:** Keyboard users cannot see focus on this control today.

### shard-014-F04 · should · high · type
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:428` — `text-[10px] font-bold text-muted-foreground`
- **Rule:** design-system §2 "Weights used: 400, 500 (`font-medium`), 600 (`font-semibold`). **700 is never used** in the reference" | §13 row D-T8 (weight ceiling 600)
- **Current:** `font-bold` (700) on the `EGP` currency suffix inside the cost input.
- **Expected:** the 10px eyebrow/label role is `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (§2 row "10", `dashboard.tsx:382`).
- **Change:** `text-[10px] font-bold text-muted-foreground` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` — `class-level`
- **Notes:** `EGP` is already uppercase so `uppercase` is a no-op; keep it for recipe parity.

### shard-014-F05 · nit · medium · RTL/i18n
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:429` — `EGP`
- **Rule:** design-system §9 "**Copy**, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)" | vercel-rules "Locale & i18n" bullet "Brand names, code tokens, identifiers: wrap with `translate="no"`"
- **Current:** hard-coded literal `EGP` in JSX.
- **Expected:** `t('common.currency', 'EGP')` (or whatever key the locale files already hold — check `en.json`/`ar.json` for an existing currency key before adding).
- **Change:** `EGP` → `{t('common.currency', 'EGP')}` — `class-level` (JSX text swap, additive); `out-of-shard: src/shared/i18n/en.json, ar.json` if the key does not already exist
- **Notes:** The Arabic UI would show the Latin code; a key lets the owner decide `ج.م` vs `EGP`.

### shard-014-F06 · should · high · loading/empty/error states
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:178` — `<Skeleton className="h-40 w-full" />`
- **Rule:** design-system §7 "Loading is always the `Skeleton` primitive shaped like the slot" | §14 C-R2 "a skeleton takes the radius of the box it stands in: cards `rounded-lg`"
- **Current:** three skeletons (`h-40`, `h-40`, `h-56`) at the primitive's default `rounded-md`, standing in for three `Card`s (`rounded-lg`), stacked with `space-y-4` while the real form stacks with `space-y-6`.
- **Expected:** card skeletons are `rounded-lg` (`dashboard.tsx:162` fleet `Skeleton h-40 rounded-lg`), and the loading frame keeps the real layout's rhythm so it does not reflow (§14 C-S6 rationale).
- **Change:** `<div className="space-y-4">` → `<div className="space-y-6">`; each `Skeleton className="h-40 w-full"` / `"h-56 w-full"` → add `rounded-lg` — `class-level`
- **Notes:** lines 177–180.

### shard-014-F07 · should · medium · type
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:191` — `<CardTitle className="flex items-center gap-2 text-base">`
- **Rule:** provisional (§12.2) "Form card = `Card` … heading `text-sm font-semibold uppercase tracking-wider`" | §13 row D-T3
- **Current:** `CardTitle` at `text-base` (16px) sentence-case with a 16px muted icon — three cards, lines 191, 270, 319.
- **Expected:** provisional form-card heading `text-sm font-semibold uppercase tracking-wider` (`trip-form.tsx:692`); the dashboard's own panel-title role is the 10px eyebrow (§10 PanelHead), which D-T3 lists as the open conflict.
- **Change:** `text-base` → `text-sm font-semibold uppercase tracking-wider` on all three `CardTitle`s — `class-level`
- **Notes:** Medium confidence: the exact form-heading size is provisional and awaits the owner's ruling on D-T3; the fix aligns with the same-role trips value, not the dashboard eyebrow.

### shard-014-F08 · should · medium · spacing
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:452` — `sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background/90 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:-mx-6 …`
- **Rule:** provisional (§12.2) "Sticky submit footer `sticky bottom-4 flex flex-col-reverse gap-2 rounded-lg border bg-card p-3 shadow-md sm:flex-row sm:justify-end`" | design-system §3 "Header glass … sticky header" and §9 "**Header** is the only sticky/glass surface"
- **Current:** a glass (`backdrop-blur bg-background/90`) full-bleed sticky footer with a negative-margin bleed that assumes the parent page gutter (`-mx-4 md:-mx-6`), `p-4`, `flex-col` (primary button last on mobile).
- **Expected:** the trips sticky footer recipe: a floating `rounded-lg border bg-card p-3 shadow-md` box at `bottom-4`, `flex-col-reverse` so the primary action is on top on phones, `sm:flex-row sm:justify-end` (`trip-form.tsx:901-914`). Glass is reserved for the app header (§9).
- **Change:** `sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background/90 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:-mx-6 md:flex-row md:justify-end md:gap-3 md:px-6` → `sticky bottom-4 flex flex-col-reverse gap-2 rounded-lg border bg-card p-3 shadow-md sm:flex-row sm:justify-end` — `class-level`
- **Notes:** The `-mx-4 md:-mx-6` bleed couples this widget to the page gutter of whichever page mounts it; removing it makes the widget self-contained. Keep the `md:me-auto` on the Reset button (line 459) — it still works in a row layout.

### shard-014-F09 · should · high · buttons & controls
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:461` — `<RotateCcw className="h-4 w-4" />`
- **Rule:** design-system §5.1 "**Icons inside a Button are 16px, by rule.** … icons inside a Button carry no size classes" | §15.4
- **Current:** explicit `h-4 w-4` on icons inside `<Button>` (lines 461, 475, 477); also `h-4 w-4` + `me-1.5` in the terminal dialog (see F12).
- **Expected:** `<RotateCcw />`, `<Loader2 className="animate-spin" />`, `<Save />` — no size classes; `[&_svg]:size-4` on the Button sets the size (`button.tsx:7`, `dashboard.tsx:1043`).
- **Change:** drop `h-4 w-4` from the three icons (keep `animate-spin` on `Loader2`) — `class-level`
- **Notes:** Dead classes today (the Button rule out-ranks them), so no visual change; recorded so code matches reality as §15.4 did for the reference.

### shard-014-F10 · should · high · loading/empty/error states
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:475` — `<Loader2 className="h-4 w-4 animate-spin" />`
- **Rule:** design-system §8 "Looping: `animate-pulse` … both with `motion-reduce:animate-none` (C-M2)" | §14 C-M2 | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** spinning `Loader2` with no reduced-motion guard (this file line 475; terminal dialog lines 253, 400, 459, 565).
- **Expected:** every looping animation carries `motion-reduce:animate-none` (`dashboard.tsx:227`, `skeleton.tsx`).
- **Change:** `animate-spin` → `animate-spin motion-reduce:animate-none` at every `Loader2` in both shard widgets — `class-level`
- **Notes:** §13 D-ST4 lists trips' unguarded spinners as a known deviation; the reference ruling (C-M2) is explicit, so this is graded against §8/§14.

### shard-014-F11 · nit · medium · type
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:193` — `{t('oilChanges.form.sections.vehicle')} &amp; {t('oilChanges.form.sections.personnel')}`
- **Rule:** design-system §9 "Copy … all go through `t()` with `defaultValue` fallbacks (C-I4)"
- **Current:** two translated fragments joined by a hard-coded ` & ` glue; the conjunction is not localised and the word order is fixed for Arabic.
- **Expected:** one key for the whole heading (e.g. `t('oilChanges.form.sections.vehiclePersonnel', 'Vehicle & Personnel')`).
- **Change:** replace the interpolated heading with a single `t()` call — `class-level` (JSX text), `out-of-shard: src/shared/i18n/en.json, ar.json` (new key)
- **Notes:** Additive: keep the existing keys; add the combined one.

### shard-014-F12 · should · high · buttons & controls
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:253` — `<Loader2 className="me-1.5 h-4 w-4 animate-spin" />`
- **Rule:** design-system §5.1 "cva base: `inline-flex items-center justify-center gap-2` … **Icons inside a Button are 16px, by rule** … icons inside a Button carry no size classes" | §14 C-S7 "one gap, no extra margin"
- **Current:** Save-button icons carry `me-1.5 h-4 w-4` (lines 253, 255): the Button's own `gap-2` plus `me-1.5` = 14px between icon and label.
- **Expected:** bare `<Save />` / `<Loader2 className="animate-spin" />`; the Button's `gap-2` is the spacing (`button.tsx:7`, DegradedStrip retry `dashboard.tsx:1043`).
- **Change:** `me-1.5 h-4 w-4 animate-spin` → `animate-spin motion-reduce:animate-none`; `me-1.5 h-4 w-4` → (no classes) — `class-level`
- **Notes:** Also applies F10 to this spinner.

### shard-014-F13 · should · high · buttons & controls
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:385` — `<Plus className="h-3 w-3" />`
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule … icons inside a Button carry no size classes" | §15.4
- **Current:** `h-3 w-3` / `h-3.5 w-3.5` on icons inside `<Button>`s (lines 385, 447, 459, 461, 554, 565, 567) — all dead classes, rendered at 16px.
- **Expected:** no size classes on icons inside Buttons (`dashboard.tsx:1043`, `header.tsx:23`).
- **Change:** remove `h-3 w-3` / `h-3.5 w-3.5` from every icon that is a direct child of a `<Button>` in this file; keep `animate-spin` — `class-level`
- **Notes:** No visual change (the rule already wins by specificity); §15.4 removed the same dead overrides from the reference.

### shard-014-F14 · should · high · buttons & controls
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:379` — `className="h-7 gap-1.5 text-xs"`
- **Rule:** design-system §5.1 "popover-internal and in-strip buttons are `h-7 text-xs`" — the in-strip retry is `h-7 px-2.5 gap-1.5 text-xs` (`dashboard.tsx:1041`, C-B3)
- **Current:** `size="sm"` (`px-3`) + `h-7 gap-1.5 text-xs` on the "Add pattern" button; the two form buttons at lines 548 and 560 use `h-7 gap-1 text-xs` (`gap-1` is a third gap value).
- **Expected:** the one compact-button override `h-7 px-2.5 gap-1.5 text-xs` (§5.1 call-site convention).
- **Change:** line 379 `h-7 gap-1.5 text-xs` → `h-7 px-2.5 gap-1.5 text-xs`; lines 548, 560 `h-7 gap-1 text-xs` → `h-7 px-2.5 gap-1.5 text-xs` — `class-level`
- **Notes:** —

### shard-014-F15 · should · high · colour roles
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:368` — `className="space-y-2 rounded-lg border bg-muted/20 p-3"`
- **Rule:** design-system §3 "Sub-surface tint `bg-muted/60` head band · `bg-muted/50` hover · `bg-muted/40` wells … three steps (C-C2)" | §14 C-C2
- **Current:** nested well at `bg-muted/20`.
- **Expected:** wells are `bg-muted/40` (`dashboard.tsx:494`, `:841` Truck drawer `mt-3 rounded-lg border bg-muted/40 p-3`).
- **Change:** `bg-muted/20` → `bg-muted/40` — `class-level`
- **Notes:** The inner pattern rows and form box (`bg-card`, lines 408, 473) then read as cards on a well, matching the drawer-on-card hierarchy.

### shard-014-F16 · should · high · radius/border/shadow
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:408` — `className="divide-y overflow-hidden rounded-md border bg-card"`
- **Rule:** design-system §4 "Rule (C-R1): every card, panel and tile uses the token family (`rounded-lg`)"; `rounded-md` is for "Button, SelectTrigger, nav links … popover/menu/select/command surfaces" | §13 row D-R3
- **Current:** the pattern list card (line 408) and the add/edit form card (line 473) are `rounded-md border bg-card`.
- **Expected:** card surfaces are `rounded-lg border bg-card` (§10 Panel recipe, `dashboard.tsx:135`).
- **Change:** `rounded-md` → `rounded-lg` on lines 408 and 473 — `class-level`
- **Notes:** —

### shard-014-F17 · should · high · loading/empty/error states
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:399` — `<div className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 … /> Loading…`
- **Rule:** design-system §7 "Loading is always the `Skeleton` primitive shaped like the slot" | §7 table "Truck-day pending: `space-y-2` of `Skeleton h-3.5 rounded-sm`" | §13 row D-ST4
- **Current:** a spinner + "Loading…" text while the receipt patterns list loads.
- **Expected:** skeleton rows shaped like the list: e.g. `<div className="space-y-2"><Skeleton className="h-10 w-full rounded-none" /> ×2</div>` (§7 "Fuel pending", `dashboard.tsx:599-604`) or text bars `h-3.5 rounded-sm` (`:887-891`).
- **Change:** replace the spinner block with `<div className="space-y-2"><Skeleton className="h-10 w-full rounded-none" /><Skeleton className="h-10 w-full rounded-none" /></div>` — `structural` (imports `Skeleton` from `@/shared/ui/skeleton`; keep the `isLoading` branch)
- **Notes:** Keep `t('common.loading', …)` unused only if the string is referenced elsewhere; do not delete the key.

### shard-014-F18 · should · high · loading/empty/error states
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:404` — `<p className="py-1 text-xs text-muted-foreground">`
- **Rule:** design-system §7 "Exceptions empty: `py-6 text-center text-xs text-muted-foreground` — the one empty/error recipe (C-S3)" | §10 "Empty/error px-3 py-6 text-center text-xs text-muted-foreground"
- **Current:** `py-1` start-aligned empty copy.
- **Expected:** `py-6 text-center text-xs text-muted-foreground` (`dashboard.tsx:180-183`); the parent well already has `p-3` so no `px-3` needed.
- **Change:** `py-1 text-xs text-muted-foreground` → `py-6 text-center text-xs text-muted-foreground` — `class-level`
- **Notes:** —

### shard-014-F19 · should · medium · buttons & controls
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:428` — `<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">`
- **Rule:** design-system §5.3 "kbd (header and palette) `h-5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground` (C-T7)" | §14 C-T7
- **Current:** an inline code token at `rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]` — the same job as the kbd chip (a mono token in a muted box) with a different recipe.
- **Expected:** the C-T7 token recipe; the regex is content rather than a hint so it keeps `text-foreground`: `inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium`.
- **Change:** `rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]` → `inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium` — `class-level`
- **Notes:** Medium confidence — mapping a regex `<code>` to the kbd recipe is a judgment; the alternative same-role element (`×N` chip `rounded border px-1 font-mono text-[10px]`) is provisional §12.4 and agrees on 10px mono + border.

### shard-014-F20 · should · high · lists
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:415` — `className="flex flex-col gap-1.5 p-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"`
- **Rule:** design-system §6 "Flush divided list … rows full-bleed `px-3 py-2.5`" | §1 "the standard 'list row' pad is 12px × 10px"
- **Current:** list rows inside a `divide-y` card at `p-2.5` (10 × 10).
- **Expected:** `px-3 py-2.5` (`dashboard.tsx:616`, §10 List row).
- **Change:** `p-2.5` → `px-3 py-2.5` — `class-level`
- **Notes:** —

### shard-014-F21 · should · high · buttons & controls
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:453` — `className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"`
- **Rule:** provisional (§12.2) "remove `ghost icon h-7 w-7 text-destructive hover:bg-destructive/10`" (`trip-form.tsx:679`) and (§12.4) row actions "danger `text-destructive hover:text-destructive`"
- **Current:** matches the provisional recipe — **no finding**; recorded only so the fixer does not "correct" it. (Retained as a coverage note; not counted.)
- **Expected:** —
- **Change:** none
- **Notes:** Not counted in the summary.

### shard-014-F22 · should · medium · tables/lists
- **Where:** `src/widgets/locations-terminals-table/columns.tsx:54` — `className="text-muted-foreground tabular-nums"`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values, bar amounts" | provisional (§12.4) "figures `font-mono text-[12.5px] tabular-nums`"
- **Current:** the radius figure (a number in metres) is sans `tabular-nums`; the fallback "Default (500 m)" string shares the cell.
- **Expected:** figures are `font-mono tabular-nums` (`dashboard.tsx:495`, `:985-991`).
- **Change:** `text-muted-foreground tabular-nums` → `font-mono tabular-nums text-muted-foreground` — `class-level`
- **Notes:** The translated fallback text will also render mono; if the fixer prefers, wrap only the numeric branch in `<span className="font-mono tabular-nums">` (still class-level/additive).

### shard-014-F23 · should · high · colour roles
- **Where:** `src/widgets/locations-terminals-table/columns.tsx:30` — `{row.original.address || '—'}`
- **Rule:** design-system §2 "empty numeric is `—` at `opacity-40`" | §7 "Zero revenue `<span class="opacity-40">—</span>`" | §13 row D-C11
- **Current:** the em dash renders at full `text-muted-foreground` (address line 30, pin source line 72, allowed companies line 81).
- **Expected:** `<span className="opacity-40">—</span>` (`dashboard.tsx:765`).
- **Change:** line 30 `{row.original.address || '—'}` → `{row.original.address || <span className="opacity-40">—</span>}`; lines 72 and 81 `<span className="text-muted-foreground">—</span>` → `<span className="text-muted-foreground opacity-40">—</span>` — `class-level`
- **Notes:** —

### shard-014-F24 · should · medium · buttons & controls
- **Where:** `src/widgets/locations-terminals-table/columns.tsx:104` — `<span className={pinned ? 'text-xs font-medium text-muted-foreground' : 'text-xs font-medium text-primary'}>`
- **Rule:** design-system §3 "Actionable (navy) `text-primary` … navy marks anything you can act on" | §14 C-C5 "`text-muted-foreground` for secondary *text*"
- **Current:** the row's action affordance ("Manage" / "Set pin") is a bare `<span>`: navy when unpinned, muted when pinned — the same action (open the row's dialog) gets two colours depending on data, and "Manage" loses its actionable colour.
- **Expected:** both labels are actionable affordances → `text-primary` (§3 Actionable role). The row itself is the clickable (DataTable `onRowClick`), so the span stays non-interactive; it should not be a `<button>` (that would nest two click targets).
- **Change:** `className={pinned ? 'text-xs font-medium text-muted-foreground' : 'text-xs font-medium text-primary'}` → `className="text-xs font-medium text-primary"` — `class-level` (keep the `pinned` ternary for the label text)
- **Notes:** Do not remove the conditional; only the class branch collapses. Medium confidence: the muted/navy split may be an intentional "needs attention" emphasis, but the palette rule assigns emphasis to warning (the `No pin` badge already carries it).

### shard-014-F25 · should · high · colour roles
- **Where:** `src/widgets/oil-change-form/oil-change-status-preview.tsx:24` — `card: 'border-success/30 bg-success/5'`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … 10% tint + 40% border + full-strength text" | §14 C-C3 `border-warning/40` | §13 row D-C6
- **Current:** `border-X/30 bg-X/5` for all three tones (lines 24, 29, 34).
- **Expected:** `border-X/40 bg-X/10` (`dashboard.tsx:221`, DegradedStrip `:1031`).
- **Change:** `border-success/30 bg-success/5` → `border-success/40 bg-success/10`; `border-warning/30 bg-warning/5` → `border-warning/40 bg-warning/10`; `border-destructive/30 bg-destructive/5` → `border-destructive/40 bg-destructive/10` — `class-level`
- **Notes:** Provisional §12.2 banners use `/30 /5`, but the dashboard has an explicit rule for the same role (status tint), so the dashboard wins.

### shard-014-F26 · should · high · type
- **Where:** `src/widgets/oil-change-form/oil-change-status-preview.tsx:74` — `className={cn('text-xs font-semibold uppercase tracking-wider', tone.label)}`
- **Rule:** design-system §2 row "10 · `text-[10px]` · 600, `uppercase tracking-wider`" — "one label style above every figure and panel" | §13 row D-T3
- **Current:** eyebrow at `text-xs` (12px).
- **Expected:** `text-[10px] font-semibold uppercase tracking-wider` (`dashboard.tsx:382`); the tone colour replaces `text-muted-foreground` here, as the ConnectionBadge does for its state.
- **Change:** `text-xs font-semibold uppercase tracking-wider` → `text-[10px] font-semibold uppercase tracking-wider` — `class-level`
- **Notes:** —

### shard-014-F27 · should · high · type
- **Where:** `src/widgets/oil-change-form/oil-change-status-preview.tsx:80` — `className="font-semibold text-foreground tabular-nums"`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`)" | §13 row D-T5 ("forms, dialogs and statistics use no `font-mono` at all — sans `tabular-nums`")
- **Current:** the km figures (lines 80, 86) are sans `font-semibold tabular-nums`.
- **Expected:** `font-mono font-semibold tabular-nums` (`dashboard.tsx:495` dl values, `:648` litres/km).
- **Change:** line 80 `font-semibold text-foreground tabular-nums` → `font-mono font-semibold tabular-nums text-foreground`; line 86 `font-semibold tabular-nums` → `font-mono font-semibold tabular-nums` — `class-level`
- **Notes:** The unit ` km` is inside the same span; the dashboard also keeps units inline in mono (`:648`).

### shard-014-F28 · should · medium · spacing
- **Where:** `src/widgets/oil-change-form/oil-change-status-preview.tsx:70` — `className={cn('rounded-lg border p-4', tone.card)}`
- **Rule:** design-system §1 "**12px** … panel body padding, KPI card padding, drawer padding" | §7 DegradedStrip `rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5`
- **Current:** `p-4` (16px) on a status card that sits inside a form card.
- **Expected:** the dashboard's tinted status box (DegradedStrip) is `px-3 py-2.5`; nested boxes are `p-3` (Truck drawer `dashboard.tsx:841`).
- **Change:** `rounded-lg border p-4` → `rounded-lg border p-3` — `class-level`
- **Notes:** Medium: the DegradedStrip is single-line; the three-line preview maps better to the `p-3` well.

### shard-014-F29 · nit · high · a11y
- **Where:** `src/widgets/oil-change-form/oil-change-status-preview.tsx:72` — `<Gauge className={cn('mt-0.5 h-5 w-5 shrink-0', tone.value)} />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden="true"`" | design-system §9 "`aria-hidden` on dots/chevrons/severity bars"
- **Current:** decorative `Gauge` (line 72) and `AlertCircle` (line 93) icons without `aria-hidden`; also `MapPin` (`locations-terminal-dialog.tsx:132`), `Regex` (`:371`), and the `Car`/`History`/`Wrench` title icons (`oil-change-form.tsx:192, 271, 320`).
- **Expected:** `aria-hidden="true"` on every decorative icon (`dashboard.tsx:756`).
- **Change:** add `aria-hidden="true"` to each listed icon — `class-level` (attribute, additive)
- **Notes:** Icons inside Buttons are already `pointer-events-none` but still announced; Radix/lucide don't add `aria-hidden` by default.

### shard-014-F30 · nit · medium · type
- **Where:** `src/widgets/oil-change-form/oil-change-status-preview.tsx:72` — `h-5 w-5`
- **Rule:** design-system §7 DegradedStrip "`AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning` (`items-start` + `mt-0.5` keeps the icon on the first line)"
- **Current:** a 20px leading icon in the tinted status box.
- **Expected:** the strip's leading icon is `h-3.5 w-3.5` (`dashboard.tsx:1033`).
- **Change:** `mt-0.5 h-5 w-5 shrink-0` → `mt-0.5 h-3.5 w-3.5 shrink-0` — `class-level`
- **Notes:** Pairs with F28.

### shard-014-F31 · should · medium · forms
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:164` — `<Input id="terminal-address" dir="auto" value={address} …`
- **Rule:** vercel-rules "Forms" bullet "Inputs need `autocomplete` and meaningful `name`" and "`autocomplete="off"` on non-auth fields to avoid password manager triggers"
- **Current:** none of the eight inputs in this dialog (lines 164, 179, 193, 207, 479, 497, 519) nor the oil-change `Input`s (`oil-change-form.tsx:301, 333, 359, 388, 414`) set `name`/`autoComplete` (the oil-change ones receive `name` via `{...field}`, but no `autoComplete`).
- **Expected:** `name="…"` and `autoComplete="off"` on every non-auth text/number input.
- **Change:** add `name` + `autoComplete="off"` to each `Input` in the terminal dialog; add `autoComplete="off"` to each `Input` in the oil-change form — `class-level` (attributes, additive)
- **Notes:** The address field could take `autoComplete="street-address"` instead of `off`.

### shard-014-F32 · nit · high · forms
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:497` — `<Input id="rp-pattern" … placeholder="^WT-\d{5}$" className="font-mono" aria-invalid={regexError || undefined} />`
- **Rule:** vercel-rules "Forms" bullet "Errors inline next to fields" — message present, but the error `<p>` (line 506) is not linked; provisional (§12.2) "control gets `border-destructive focus-visible:ring-destructive` + `aria-invalid` + `aria-describedby`"
- **Current:** `aria-invalid` is set; the error paragraph has no `id` and the input no `aria-describedby`.
- **Expected:** `aria-describedby="rp-pattern-error"` on the input and `id="rp-pattern-error"` on the message (`trip-form.tsx:1198-1208`).
- **Change:** add `aria-describedby={regexError ? 'rp-pattern-error' : undefined}` to the Input and `id="rp-pattern-error"` to the `<p>` — `class-level` (attributes, additive)
- **Notes:** The message recipe `text-[11px] font-medium text-destructive` already matches §12.2.

### shard-014-F33 · nit · medium · RTL/i18n
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:501` — `placeholder="^WT-\d{5}$"`
- **Rule:** §13 row D-I2 "placeholders 'WT-12345'" (untranslated) | design-system §9 C-I4 "Copy … through `t()`" | vercel-rules "Forms" bullet "Placeholders end with `…` and show example pattern"
- **Current:** hard-coded English/regex placeholders (`^WT-\d{5}$` line 501; `30.044420` / `31.235712` lines 185, 199 are numeric examples and are fine).
- **Expected:** `t('locations.receiptPatterns.patternPlaceholder', '^WT-\\d{5}$')` so the Arabic locale can supply its own sample.
- **Change:** wrap the placeholder in `t()` with the current value as `defaultValue` — `class-level`; `out-of-shard: src/shared/i18n/en.json, ar.json` (optional key)
- **Notes:** Low impact; the regex is the same in both languages.

### shard-014-F34 · should · medium · spacing
- **Where:** `src/widgets/locations-terminal-dialog/locations-terminal-dialog.tsx:174` — `className="grid grid-cols-2 gap-3 sm:grid-cols-3"`
- **Rule:** provisional (§12.2) "Field stack `space-y-1`; trip-level grid `grid gap-4 md:grid-cols-2 lg:grid-cols-3`; per-container grid `grid gap-3 md:grid-cols-2 lg:grid-cols-4`"; the form box at line 474 uses `grid gap-2 sm:grid-cols-2`
- **Current:** three field-grid gaps in one dialog: `gap-4` (body, line 141), `gap-3` (coords, line 174), `gap-2` (pattern form, line 474).
- **Expected:** one field-grid gap; the dashboard's master step is 12px (§1) and the dense form grid is `gap-3` (§12.2).
- **Change:** line 474 `grid gap-2 sm:grid-cols-2` → `grid gap-3 sm:grid-cols-2` — `class-level`
- **Notes:** Leave line 141's `gap-4` (section rhythm) — it matches §12.2 form-card `space-y-4`.

### shard-014-F35 · nit · high · motion
- **Where:** `src/widgets/oil-change-form/oil-change-form.tsx:237` — `className={cn(driverAutoAssigned && 'border-primary/40')}`
- **Rule:** design-system §3 "Status tint recipe `border-X/40 bg-X/10 text-X`"; "Current / selected wash `bg-primary/10 text-primary`"
- **Current:** an auto-assigned driver control is marked by `border-primary/40` alone.
- **Expected:** —
- **Change:** none — **no finding** (no rule maps a "pre-filled" input state; recorded as `no rule`). Not counted.
- **Notes:** Not counted in the summary.

## Summary
Counted findings: F01–F20, F22–F34 (F21 and F35 are recorded as no-finding notes and are not counted).

FINDINGS: 33 (blocker 2 / should 25 / nit 6)
