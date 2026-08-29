# Findings — shard-023

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx` | 190 | audited | no rule: lightbox focus-trap / `role="dialog"` / `aria-modal` (dashboard has no lightbox; §12.6 is silent on a11y); `max-w-3xl` dialog width is provisional §12.6 and matches. |
| `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx` | 441 | audited | no rule: `Label`→control `mt-1` vs `space-y-1` (trips-internal, §13 tail); `sm:grid-cols-2` form grid; `md:max-w-2xl` width (provisional §12.6, matches); `formatDateTime` output format lives in `shared/lib/format.ts` (reference, not checked here). |

## Findings

### shard-023-F01 · blocker · high · a11y/focus
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:110` — `className="group relative aspect-square overflow-hidden rounded-md border bg-muted/30 transition-all hover:ring-2 hover:ring-primary"`
- **Rule:** design-system §14 C-B1 "`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere" | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** raw `<button>` thumbnail with hover ring only; no `focus-visible:` classes.
- **Expected:** every non-Button clickable carries the ring (fleet tile `dashboard.tsx:735-747`, §10 `Focus`).
- **Change:** `class-level` — add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
- **Notes:** the element is `overflow-hidden` on itself, not inside one; an outset ring is fine.

### shard-023-F02 · blocker · high · a11y/focus
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:137` — `className="absolute end-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-card/20 text-white …"`
- **Rule:** design-system §14 C-B1 (ring-offset-2 on close buttons) | vercel-rules "Focus States" bullet "Interactive elements need visible focus"
- **Current:** raw lightbox close `<button>` with `transition-colors hover:bg-card/30` and no focus ring.
- **Expected:** dialog/sheet close recipe `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` (`shared/ui/dialog.tsx:56`).
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.

### shard-023-F03 · should · high · motion
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:110` — `transition-all hover:ring-2 hover:ring-primary` and `:116` — `transition-transform group-hover:scale-105`
- **Rule:** design-system §8 "Hover: colour only, `transition-colors` … Nothing scales, lifts or changes shadow" | vercel-rules "Animation" bullet "Never `transition: all`—list properties explicitly"
- **Current:** `transition-all` on the tile; image scales to 105% on hover.
- **Expected:** tile hover recipe `transition-colors hover:border-primary` (`dashboard.tsx:735`).
- **Change:** `class-level` — tile: `transition-all hover:ring-2 hover:ring-primary` → `transition-colors hover:border-primary`; img: drop `transition-transform group-hover:scale-105`.
- **Notes:** `group` on the button becomes unused but is harmless; leave it.

### shard-023-F04 · should · medium · RTL
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:183` — `absolute bottom-2 start-1/2 -translate-x-1/2 rounded-full bg-card/80 …`
- **Rule:** design-system §9 C-I1 "logical utilities everywhere"; §13 row D-I1
- **Current:** logical `start-1/2` combined with a physical `-translate-x-1/2`; in RTL `start-1/2` = `right:50%` and the negative X translate pushes the counter further left, off-centre.
- **Expected:** transforms paired with an `rtl:` mirror (§9 "`origin-left` is always paired with `rtl:origin-right`").
- **Change:** `class-level` — `-translate-x-1/2` → `-translate-x-1/2 rtl:translate-x-1/2`.

### shard-023-F05 · should · high · pills/chips
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:118` — `rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums`
- **Rule:** design-system §5.3 neutral chip "`rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`" (C-T3); §13 row D-R4
- **Current:** 4px-radius tag at 10px on a translucent card fill.
- **Expected:** the chip recipe (`dashboard.tsx:583`, `:637`); the number inside is promoted `text-foreground`.
- **Change:** `class-level` — `rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums` → `rounded-full bg-muted px-2 py-0.5 font-mono text-[10.5px] font-medium tabular-nums text-foreground`.
- **Notes:** the lightbox counter at `:183` (`rounded-full … px-3 py-1 text-xs`) is the same role; align to the same chip (`px-2 py-0.5 text-[10.5px]`) if desired — medium confidence, it sits on a black scrim.

### shard-023-F06 · should · medium · colour
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:131` — `bg-black/90` ; `:137`, `:154`, `:167` — `text-white`
- **Rule:** design-system §3 "Scrim `bg-black/50 backdrop-blur-sm`"; §3 "No hex/rgb … non-token colours in the reference: the two scrims"; §13 row D-C14 and D-C2 (`text-white`)
- **Current:** lightbox scrim at 90% black; controls hard-coded `text-white`.
- **Expected:** the one scrim recipe `bg-black/50 backdrop-blur-sm` (`dialog.tsx:18`); no non-token text colours.
- **Change:** `class-level` — `bg-black/90` → `bg-black/50 backdrop-blur-sm`; `text-white` → `text-primary-foreground` (light on both themes) on the three controls.
- **Notes:** an image lightbox arguably wants a darker scrim; owner may rule the `/90` is a distinct role (D-C14 is listed for ruling).

### shard-023-F07 · should · medium · buttons
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:154` / `:167` — `h-12 w-12 rounded-full bg-card/20 text-white backdrop-blur-sm hover:bg-card/30`; `:158`/`:170` — `<ChevronLeft className="h-6 w-6 rtl:rotate-180" />`
- **Rule:** design-system §5.1 icon sizes "Icons inside a Button are 16px, by rule … carry no size classes"; §5.4 icon-button heights; §13 row D-B7
- **Current:** 48px ghost icon buttons; `h-6 w-6` on the chevrons is dead (beaten by `[&_svg]:size-4`).
- **Expected:** `size="icon"` = `h-9 w-9` (`button.tsx`); no per-icon size classes.
- **Change:** `class-level` — drop `h-12 w-12` (keep `rounded-full`), drop `h-6 w-6` from both chevrons (keep `rtl:rotate-180`).
- **Notes:** the raw close button at `:140` uses `<X className="h-5 w-5">` — not inside a Button, so it *does* render 20px; align to `h-4 w-4`.

### shard-023-F08 · should · high · images
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:112` and `:178` — `<img src=… alt=… loading="lazy" className="h-full w-full object-cover …" />`
- **Rule:** vercel-rules "Images" bullet "`<img>` needs explicit `width` and `height` (prevents CLS)"
- **Current:** no `width`/`height` attributes on either image.
- **Expected:** intrinsic dimensions or a fixed box; the thumbnail already sits in `aspect-square`, the lightbox image has none.
- **Change:** `class-level` (additive attrs) — thumbnails: add `width={400} height={400}`; lightbox: add `width={1200} height={1200}` (CSS `max-h/max-w` + `object-contain` still governs the rendered size).

### shard-023-F09 · should · medium · a11y
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:130-132` — `<div className={\`fixed inset-0 …\`} onClick={() => setEnlargedIndex(null)}>`
- **Rule:** vercel-rules "Anti-patterns" bullet "`<div>` or `<span>` with click handlers"; "Accessibility" bullet "Use semantic HTML … before ARIA"
- **Current:** click-to-dismiss on a `<div>` backdrop; the dismiss action is duplicated by a real close button and Escape, but the container is not announced as a dialog and there is no focus trap.
- **Expected:** overlays are Radix `Dialog` (`dialog.tsx`, `role="dialog"` + trap).
- **Change:** `structural` — additive: `role="dialog" aria-modal="true" aria-label={t('trips.receiptBatch.dialogTitle')}` on the backdrop div and move focus to the close button on open. Do not remove the `onClick`.
- **Notes:** the Escape handler at `:58` is window-level and will also fire while the parent Dialog is open — Radix handles its own Escape; ordering is fine today since the lightbox unmounts first.

### shard-023-F10 · nit · medium · states
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:94-101` — `<div className="… py-4 …"><EmptyState … lottieWidth={140} … className="border-0 bg-transparent py-4 shadow-none" />`
- **Rule:** design-system §7 palette usage "strips it to `border-0 bg-transparent py-6` with … 110px" (`command-palette.tsx:273-281`); §13 row D-ST6
- **Current:** 140px lottie, `py-4` plus an extra `py-4` wrapper.
- **Expected:** `py-6`, lottie 110–120px.
- **Change:** `class-level` — wrapper `py-4` → `py-0`; EmptyState `py-4` → `py-6`; `lottieWidth/Height` 140 → 120.

### shard-023-F11 · nit · medium · radius
- **Where:** `src/widgets/trip-receipt-batch-dialog/trip-receipt-batch-dialog.tsx:110` — `rounded-md border bg-muted/30`; `:90` — `<Skeleton className="aspect-square w-full" />`
- **Rule:** design-system §4 C-R1 "every card, panel and tile uses … `rounded-lg`"; C-R2 skeleton takes the box's radius; §13 row D-R3
- **Current:** tiles and their skeletons at `rounded-md` (10px), well tint `/30`.
- **Expected:** tile `rounded-lg border bg-card` (`dashboard.tsx:735`); skeleton `rounded-lg`.
- **Change:** `class-level` — tile `rounded-md … bg-muted/30` → `rounded-lg … bg-muted/40`; Skeleton add `rounded-lg`.

### shard-023-F12 · blocker · high · RTL
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:153` — `className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-4 max-h-[55vh] md:max-h-[65vh]"`
- **Rule:** design-system §14 C-I1 "logical utilities everywhere"; §9 "no physical `ml-/mr-/left-/right-`"; §13 row D-I1 (`pr-1` scroll bodies)
- **Current:** `pr-1` — in Arabic the scrollbar is on the left and the gutter is on the wrong side.
- **Expected:** `pe-1`.
- **Change:** `class-level` — `pr-1` → `pe-1`.

### shard-023-F13 · blocker · high · locale
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:164` — `value={format(trip.date, 'PPP')}`
- **Rule:** design-system §14 C-I2 "day-first `d MMM yyyy` everywhere"; §13 row D-T16 (`PPP` in dialogs)
- **Current:** `PPP` renders month-first ("April 29th, 2026").
- **Expected:** `d MMM yyyy` (`dashboard.tsx` lists/drawers, §2 Dates).
- **Change:** `class-level` (string literal) — `'PPP'` → `'d MMM yyyy'`.

### shard-023-F14 · blocker · medium · a11y
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:383-400` — `<Button variant="ghost" size="icon" … onClick={onToggleStamp} … aria-label={step.stamped ? … : …}`
- **Rule:** design-system §14 C-B4 "`aria-pressed` for toggles"; §9 ARIA
- **Current:** the stamp toggle conveys state only by swapping label and icon.
- **Expected:** `aria-pressed` reflecting state (fleet tile `dashboard.tsx:733`, presets `scope-date-picker.tsx`).
- **Change:** `class-level` (additive attr) — add `aria-pressed={step.stamped}`; keep the existing label/title.
- **Notes:** with `aria-pressed` the label should ideally be the constant action name ("Stamp"); leaving the swap is acceptable, hence medium.

### shard-023-F15 · should · high · type
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:182` and `:227` — `text-xs font-semibold uppercase tracking-wider text-muted-foreground`
- **Rule:** design-system §2 Eyebrow "`text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §13 row D-T3 (dialog h4 `text-xs`)
- **Current:** 12px eyebrows.
- **Expected:** 10px (`dashboard.tsx:427`, §10 `Eyebrow`).
- **Change:** `class-level` — `text-xs` → `text-[10px]` on both `h4`s; the `Plus` icon at `:228` stays `h-3 w-3`.
- **Notes:** `h4` under a `DialogTitle` (`h2`) skips `h3` — vercel "Headings hierarchical"; changing the tag is `structural` and optional.

### shard-023-F16 · should · high · radius/colour
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:156` and `:162` — `rounded-md border bg-muted/30 p-3`
- **Rule:** design-system §4 C-R1 `rounded-lg`; §3 C-C2 "three steps: `/60` head band, `/50` hover, `/40` wells"; §13 rows D-R3, D-C5
- **Current:** context well at `rounded-md` / `bg-muted/30`.
- **Expected:** truck drawer well `rounded-lg border bg-muted/40 p-3` (`dashboard.tsx:841`).
- **Change:** `class-level` — `rounded-md border bg-muted/30` → `rounded-lg border bg-muted/40` (both the skeleton box and the data box).

### shard-023-F17 · should · high · radius
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:349` — `<li className="flex items-start gap-3 rounded-md border bg-card p-3">`; `:226` — `<section className="rounded-md border bg-card p-3">`
- **Rule:** design-system §4 C-R1; §6 "Row cards in a gap: `rounded-lg border bg-card px-3 py-2.5`"; §13 row D-R3
- **Current:** step rows and the add-step card at `rounded-md`.
- **Expected:** `rounded-lg` (`dashboard.tsx:940`).
- **Change:** `class-level` — `rounded-md` → `rounded-lg` at both sites.

### shard-023-F18 · should · high · colour
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:354-355` — `'bg-success/15 text-success' : 'bg-primary/15 text-primary'`
- **Rule:** design-system §3 "Current / selected wash `bg-primary/10 text-primary`"; status tint `bg-X/10`; §13 row D-C6
- **Current:** `/15` alpha on the icon disc.
- **Expected:** `/10` (avatar fallback, palette icon wells).
- **Change:** `class-level` — `bg-success/15` → `bg-success/10`; `bg-primary/15` → `bg-primary/10`.

### shard-023-F19 · should · high · pills/chips
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:366` — `inline-flex items-center gap-0.5 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success`
- **Rule:** design-system §5.3 status pill "`inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium` + `border-X/40 bg-X/10 text-X`" (C-T3); §13 rows D-R4, D-C7
- **Current:** 4px-radius, borderless, `/15`, 10px.
- **Expected:** the `Badge` recipe (`badge.tsx:5-20`).
- **Change:** `class-level` — → `inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success`; `Stamp` icon `h-2.5 w-2.5` → `h-3 w-3`. (Or `structural`: swap the span for `<Badge variant="success">`.)

### shard-023-F20 · should · medium · type
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:163-166` — `value={\`#${trip.receipt_no || '—'}\`}` … `:438` — `<span className="truncate font-medium">{value}</span>`
- **Rule:** design-system §2 "Figures are mono + tabular"; §2 "empty numeric is `—` at `opacity-40`"; §13 rows D-T5, D-C11; §9 "`dir="auto"` on free-text labels and mixed values"
- **Current:** receipt no, date and plate render in sans `font-medium`; the dash is full-strength; free text (driver, terminal, drop-off) has no `dir`.
- **Expected:** identifiers `font-mono tabular-nums` (`dashboard.tsx:843`); `<span class="opacity-40">—</span>`; `dir="auto"` (`dashboard.tsx:498`).
- **Change:** `structural` (Field needs a prop) — add an optional `mono?: boolean` to `Field` that appends `font-mono tabular-nums`, pass it for receipt no, date, vehicle; add `dir="auto"` to the value span. Empty dash: render `'—'` via a `<span className="opacity-40">` when `receipt_no` is empty.
- **Notes:** the `#` prefix matches the trips table (§12.4, provisional).

### shard-023-F21 · should · high · loading
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:157-159` — `<Skeleton className="h-3 w-32" />` …; `:187-188` — `<Skeleton className="h-16 w-full" />`
- **Rule:** design-system §14 C-R2 "cards `rounded-lg`, text bars `rounded-sm`"; §7 KPI-drawer pending "`Skeleton h-3.5 rounded-sm` at `w-3/4`, `w-2/3`, `w-4/5`"; §13 row D-ST5
- **Current:** 12px bars at the default 10px radius; row skeletons at default radius.
- **Expected:** `h-3.5 rounded-sm` bars (`dashboard.tsx:459-467`); row stand-ins `rounded-lg`.
- **Change:** `class-level` — `h-3 w-32` → `h-3.5 w-3/4 rounded-sm`, `h-3 w-48` → `h-3.5 w-2/3 rounded-sm`, `h-3 w-40` → `h-3.5 w-4/5 rounded-sm`; `h-16 w-full` → `h-16 w-full rounded-lg` (×2).

### shard-023-F22 · should · medium · states
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:191-197` — `<EmptyState … lottieWidth={100} … className="py-8 bg-transparent border-dashed" />`
- **Rule:** design-system §7 "Empties are bare muted paragraphs … the one empty/error recipe (C-S3) `py-6 text-center text-xs text-muted-foreground`"; §13 rows D-ST1, D-ST6
- **Current:** a dashed `EmptyState` box with a 100px lottie and an 18px title for an in-dialog list of ≤2 rows.
- **Expected:** `<p className="py-6 text-center text-xs text-muted-foreground">` (`dashboard.tsx:180-183`).
- **Change:** `structural` — replace the `EmptyState` with the bare paragraph recipe. If the owner keeps `EmptyState` inside dialogs (D-ST1 pending), at least normalise to the palette variant `border-0 bg-transparent py-6` and 110px.

### shard-023-F23 · should · medium · motion
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:309` and `:402` — `<Loader2 className="h-3.5 w-3.5 animate-spin" />`
- **Rule:** design-system §8 "Reduced motion: … opt-out is per element (`motion-reduce:animate-none`)" (C-M2); §13 row D-ST4 "no motion-reduce guard" | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** spinners loop without a reduced-motion guard; `h-3.5 w-3.5` inside a Button is dead (§5.1).
- **Expected:** `animate-spin motion-reduce:animate-none`; no size classes inside Button.
- **Change:** `class-level` — `h-3.5 w-3.5 animate-spin` → `animate-spin motion-reduce:animate-none` at both sites (also drop `h-3.5 w-3.5` from `CheckCircle2`/`Stamp`/`Trash2` at `:404`, `:406`, `:417`).

### shard-023-F24 · should · medium · buttons
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:319` — `<Button variant="outline" onClick={() => onOpenChange(false)}>`
- **Rule:** design-system §5.1 "`ghost` … Cancel"; §13 row D-B4 "outline default `h-9` in dialogs"
- **Current:** default-height outline Close in the footer.
- **Expected:** dismiss actions are `ghost` in the reference (scope popover Cancel `scope-date-picker.tsx`).
- **Change:** `class-level` — `variant="outline"` → `variant="ghost"`.
- **Notes:** height: dialogs have no reference; leave `h-9`.

### shard-023-F25 · should · high · forms
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:266-272` — `<Input id="step-received-by" value={newReceivedBy} … placeholder={…} className="mt-1" />`
- **Rule:** vercel-rules "Forms" bullets "Inputs need `autocomplete` and meaningful `name`" and "`autocomplete=\"off\"` on non-auth fields"; "Placeholders end with `…`"
- **Current:** no `name`, no `autoComplete`; placeholder text lives in i18n (not checked — `out-of-shard: src/shared/i18n/*.json`).
- **Expected:** `name="received_by" autoComplete="off"`; same for the Textarea (`name="notes"`).
- **Change:** `class-level` (additive attrs) — add `name="received_by" autoComplete="off"` to the Input and `name="notes"` to the Textarea.

### shard-023-F26 · should · medium · touch
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:153` — `flex-1 overflow-y-auto pr-1 min-h-0 space-y-4 max-h-[55vh] md:max-h-[65vh]`
- **Rule:** vercel-rules "Touch & Interaction" bullet "`overscroll-behavior: contain` in modals/drawers/sheets"; design-system §6 scroll containers use `overscroll-contain` (`command.tsx:63-71`)
- **Current:** inner scroll body without overscroll containment.
- **Expected:** `overscroll-contain`.
- **Change:** `class-level` — add `overscroll-contain`.

### shard-023-F27 · should · medium · states
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:113`, `:118`, `:128`, `:130`, `:137`, `:139` — `toast.success(…)` / `toast.error(…)`
- **Rule:** design-system §7 "Failures are inline and persistent — a strip or muted copy in place — never a toast"; §13 row D-ST3
- **Current:** every mutation outcome is a toast.
- **Expected:** inline feedback; the dashboard's failure idiom is a `DegradedStrip`-style strip (`dashboard.tsx:1018-1047`, §10 `Strip`).
- **Change:** `structural` — keep the toast calls (never delete handlers); additionally hold the last error in state and render it as an inline strip (`flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`) above the timeline. Owner ruling pending on D-ST3; mark as should.

### shard-023-F28 · nit · high · type
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:377` — `mt-1 rounded bg-muted/40 px-2 py-1 text-xs italic text-muted-foreground`
- **Rule:** design-system §2 "`italic` appears only on 11px caveats"; §13 row D-T11
- **Current:** 12px italic note chip.
- **Expected:** `text-[11px] italic` (`dashboard.tsx:873`).
- **Change:** `class-level` — `text-xs` → `text-[11px]`.

### shard-023-F29 · nit · medium · type
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:435` — `text-[10px] uppercase tracking-wider text-muted-foreground`
- **Rule:** design-system §2 Eyebrow "600 weight"
- **Current:** field eyebrow without `font-semibold`.
- **Expected:** `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (`dashboard.tsx:382`).
- **Change:** `class-level` — add `font-semibold`.

### shard-023-F30 · nit · medium · a11y
- **Where:** `src/widgets/trip-receipt-dialog/trip-receipt-dialog.tsx:228`, `:250`, `:252`, `:297`, `:358`, `:367` — decorative lucide icons beside text
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden=\"true\"`"; design-system §9 "`aria-hidden` on dots/chevrons"
- **Current:** icons next to a visible label carry no `aria-hidden`.
- **Expected:** `aria-hidden="true"` (`dashboard.tsx:424`, `:756`).
- **Change:** `class-level` (additive attr) — add `aria-hidden="true"` to each. Lucide already sets `aria-hidden` by default in recent versions — verify the installed version before applying; low cost either way.

## Summary
FINDINGS: 30 (blocker 5 / should 20 / nit 5)
