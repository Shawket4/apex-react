# Apex — target aesthetic (Phase 3 brief)

Status: Descriptive. Derived from the dashboard reference; subordinate to .audit/design-system.md. Written 2026-08-29 with the taste skills used as formats only.

Assembly note: Lens 1 was not delivered. §1–§3 below are assembled from the Design Read, dials and Taste DNA rows that Lens 2 and Lens 3 each restated independently; every value is cross-checked against design-system.md (§0–§10, §14 rulings). Lens 3's evidence caveat applies throughout: `e2e/__screenshots__/chromium/dashboard.png` (1440×900, committed in `3fc3585`) currently captures an "Access Token Required" gate, not the dashboard, so reference claims are anchored to `src/pages/dashboard/dashboard.tsx` and the shell files via design-system.md; the shell is read from the sidebar/header visible in `trips.png`, `trips-new.png`, `fleet-expenses.png`, `service-invoices.png`. The capture should be re-taken before Phase 4; no verdict below depends on it.

---

## 1. Design read & dials

**Design Read (one line).** An operations console for fleet dispatchers who scan Arabic plates and EGP figures all day on a phone or a shared office screen — "ledger, not brochure" — built on Tailwind + shadcn primitives, IBM Plex Sans Arabic for words and IBM Plex Mono for every figure, two hues (navy = "you can act on this", amber = "someone gets paid"), zero elevation on content. Evidence: `app/index.css:7-19` ("Two hues, one job each… Adding a third accent colour breaks the whole scheme, so don't"), `app/index.css:91-95` + `index.html:17-20` (font stack), `dashboard.tsx:99` (`max-w-6xl`), design-system.md §0.2 ("colour on this screen is information rather than decoration").

**Dials (describing the reference, not prescribing).**

| Dial | Value | What it means on this screen | Evidence |
|---|---|---|---|
| DESIGN_VARIANCE | 2 | One page container `max-w-6xl gap-3 p-3 sm:p-4`; one panel recipe (`rounded-lg border bg-card`, no shadow); one 10px eyebrow; one `bg-muted/60` panel-head band; grids auto-fill (`repeat(auto-fill,minmax(78px,1fr))`) rather than art-direct; symmetry is the point | `dashboard.tsx:99,:135,:359,:713`; §1, §4, §10 |
| MOTION_INTENSITY | 1–2 | `transition-colors` (150ms) on hovers; `duration-200` chevron rotate; pulsing 6px dot on the live badge; disclosure content mounts instantly; nothing lifts, scales, spins or animates height (sidebar `transition-[width]` is the shell's one accepted exception) | §8; C-M1; `sidebar.tsx:172-282` |
| VISUAL_DENSITY | 7–8 | 12px master step (`gap-3`, `p-3`); 10px eyebrows; `px-3 py-2.5` list rows; `text-[12px]` dl rows; 9–10px tile text; `gap-px` inside tiles; the page is meant to be read, not browsed | §1, §2; `dashboard.tsx:379,:501,:741` |

Any remediation that moves these dials toward the design-taste-frontend skill's `8 / 6 / 4` baseline is moving away from the reference.

**Foundation values the read rests on (quoted, not restated wholesale).**
- Ground: light `--background 210 14% 95%` (graphite), dark `206 23% 6%`; every neutral sits at hue 206–215 (`--muted 210 13% 91%`, `--border 213 13% 86%`, `--muted-foreground 210 8% 42%`) — one cool family (§0.2).
- Accents: navy `217 60% 26%` (dark `217 64% 57%`), amber `37 82% 30%` — 82% saturation at 30% lightness reads as ink, not neon (§0.2).
- Type: `'IBM Plex Sans Arabic', 'IBM Plex Sans', system-ui`, weights 400/500/600, never 700; Plex Mono not loaded above 600 (§0.1, §2). Page title `text-lg sm:text-xl font-semibold leading-tight` (`dashboard.tsx:103`); largest type is a KPI figure at `22px font-mono` (`:436`).
- Figures: `font-mono tabular-nums` everywhere (`:385,:436,:509,:744`; `index.css:218-224`); money additionally `text-money` (C-T1).
- Radius: `--radius: 0.75rem`; cards `rounded-lg` (12px), controls `rounded-md` (10px), items `rounded-sm` (8px), bars/kbd `rounded` (4px), pills/dots `rounded-full`; `rounded-xl` retired (§4, C-R1).
- Shadow: `grep -c shadow dashboard.tsx` = 0; `shadow-sm` on controls, `shadow-md` on floating menus, `shadow-lg` on dialogs only (§4).
- Border: 1px everywhere; dashed means "not live / placeholder / degraded" (§4).

---

## 2. Taste DNA

Trade-offs the reference makes, in the form Trigger → Decision → Reason → Evidence.

**DNA-1 — Figures lead, headings recede.**
Trigger: a dispatcher lands on a screen of KPIs and a fleet grid.
Decision: the h1 is the formatted date at 18/20px `font-semibold`; the largest type is the 22px mono KPI value.
Reason: the number is the content; a hero heading would compete with it.
Evidence: `dashboard.tsx:103,:436`; §2; D-T1 flags trips' `text-2xl md:text-3xl` as the deviation.

**DNA-2 — Two hues, one job each.**
Trigger: a row shows a plate, a date, a fee and a status.
Decision: navy for anything actionable, amber for anything paid; success/warning/destructive are status pills only; everything else neutral.
Reason: "reusing the success green for [money] is what made a figure look like a badge."
Evidence: `app/index.css:7-19`; §3; `trips.png` fee column.

**DNA-3 — Mono digits, sans words, one amber column.**
Trigger: 25 rows × 8 columns of mixed Arabic/Latin.
Decision: every identifier and figure `font-mono tabular-nums`; money `text-money`; words in Plex Sans Arabic.
Reason: a dispatcher reads the money column top-to-bottom; tabular mono makes it a column, amber makes it findable without a header.
Evidence: `trips.png` fee column — the only thing that already reads like the reference; `index.css:218-224`; C-T1.

**DNA-4 — One eyebrow, one size.**
Trigger: every panel, KPI and dl group needs a label.
Decision: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`, at 10px only; the PanelHead aside resets to `normal-case tracking-normal` for data.
Reason: caps at one size are a label; caps at several sizes are a hierarchy the page does not have.
Evidence: `dashboard.tsx:379,:424,:504,:775,:1003-1005`; `sidebar.tsx:204`; §2, §10.

**DNA-5 — Tone plus hairline, never shadow.**
Trigger: a white panel must separate from the graphite ground, and from its neighbours in dark mode.
Decision: `rounded-lg border bg-card`, no `box-shadow`; sub-surfaces are translucent muted steps `/60 /50 /40`.
Reason: "separation is tone (white on graphite) plus a hairline"; in dark mode the hairline (`--border 212 15% 17%`) is the only separator, so the border stays and the shadow goes.
Evidence: §4; C-C2; `grep -c shadow dashboard.tsx` = 0.

**DNA-6 — Colour is information, so the ground is flat.**
Trigger: the temptation to add grain, gradient, mesh or imagery to an empty panel.
Decision: none of them; no `bg-gradient-*` in dashboard or shell; header "glass" is `bg-background/80 backdrop-blur` translucency only.
Reason: any colour that is not information breaks the rule that colour is information.
Evidence: `index.css:7-19`; §3; grep of `dashboard.tsx` for `gradient` = 0.

**DNA-7 — Speed from prefetch, not motion.**
Trigger: a clickable row or tile needs to feel responsive.
Decision: `transition-colors` hover (`hover:bg-muted/50` rows, `hover:bg-accent` chrome, `hover:border-primary` tiles); no `active:` scale; hover-intent prefetch on `onPointerEnter`/`onFocus`/`onTouchStart`.
Reason: perceived speed comes from the next page already being loaded, not from the button bouncing.
Evidence: §5.1, §8; C-C4, C-B5.

**DNA-8 — Loading is the slot's shape; errors stay in place.**
Trigger: a panel is fetching, empty, or failed.
Decision: Skeleton sized and rounded like the slot (`h-[92px] rounded-lg` KPI, `h-3.5 rounded-sm` text, `h-10 rounded-none` flush rows); empty is one `py-6 text-center text-xs text-muted-foreground` line; error is the dashed `DegradedStrip` (`border-warning/40 bg-warning/10`) with one outline retry — never a spinner, never a toast, never an illustration.
Reason: the panel "stays useful instead of vanishing"; a 120px animation makes "nothing here" louder than "something here".
Evidence: §7; C-R2, C-S3; `dashboard.tsx:1018-1047,:1041`; `RefreshCw` never spins (§8).

**DNA-9 — Disclosure mounts inline, not over.**
Trigger: a KPI or truck needs a detail view.
Decision: drawer mounts inline below the card (`aria-expanded`), content unanimated; Dialog only for palette and date picker, Sheet only for the mobile sidebar.
Reason: zero layering on content keeps the ledger a single reading surface.
Evidence: `dashboard.tsx:494,:841`; §8, §12.6.

**DNA-10 — Shapes carry meaning.**
Trigger: something needs a pill, a dashed border, or a square tag.
Decision: `rounded-full` for state (status pills `border-X/40 bg-X/10 text-X` 11px, neutral chips, dots, avatar); dashed for "not live / degraded"; `rounded` (4px) for bars and kbd only.
Reason: when a shape is reserved for one meaning, the reader decodes it without a legend.
Evidence: §4; C-T3; `dashboard.tsx:1018`.

**DNA-11 — Structural alignment, no optical hacks.**
Trigger: labels, values and bars must line up down a list.
Decision: fixed grid tracks (`grid-cols-[86px_1fr_64px]`, `[3px_1fr_auto]`), `items-baseline` dl rows, KPI detail `min-h-[17px]` so cards stay equal.
Reason: "fixed label and value columns, flexible bar" aligns by construction rather than by 1–2px nudges.
Evidence: `dashboard.tsx:442,:501,:940,:981`; §1, §6.

**DNA-12 — Bilingual before stylish.**
Trigger: choosing a typeface for plates that are mostly Arabic.
Decision: the Arabic cut of Plex leads the stack; the sidebar mirrors in RTL (`rtl:` chevrons, logical utilities); every string goes through `t()`.
Reason: a Latin-only "character" font would break Arabic plates; the font is a bilingual decision, not a style decision.
Evidence: §0.1 [comment]; C-I1, C-I4; `index.html:17-20`.

**Surface-specific DNA rows (from Lens 2).**
- Forms: Trigger — a fuel-event form computes km/L as you type. Decision — show it as a KPI card, uncoloured, mono. Reason — colouring a figure "good/poor" while the user is still typing is a badge on a number they have not committed to. Evidence — `fuel-events-new.png` bottom tiles vs §10 KPI recipe.
- Detail pages: Trigger — one fuel event has six facts and three derived numbers. Decision — three KPI cards + one dashed-row dl; `2,870.62` in amber mono, everything else neutral. Reason — the reader wants the money and the km/L first; the dl is where "the exact figures live" (§2 `compactMoney` comment). Evidence — `fuel-event-details.png` already has the three-card + details shape.
- Finance: Trigger — 282 uncategorised bank rows and a "+ category" control on each. Decision — one neutral chip per row; the filter tile is the only pressed navy. Reason — 282 identical dark buttons make the page a wall; colour means state, so the row needing attention is the one carrying the warning tint. Evidence — `fleet-expenses.png` rows.
- Maps: Trigger — a live map must show moving / idling / offline at a glance. Decision — reuse `STATUS_STYLES` and the 6px dot at 11px; nothing else on the chrome is coloured. Reason — the map tiles already supply colour noise, so the chrome must be neutral for the dots to be the only signal. Evidence — `etit.png` "CONNECTING" pill (the badge idea at the wrong size and family); §5.3.
- Placeholders: Trigger — a module is not built yet. Decision — say so in 12px muted text inside the ordinary panel. Reason — the reference never pads an absence. Evidence — `trucks.png`, where the illustration is the largest element on the page; §7.

---

## 3. What it is not

Each row is a pattern the redesign-existing-projects checklist would "fix" and that the reference refuses on purpose. Verdict key from Lens 3: AVOIDS = deliberately not done; EXHIBITS (taste) = does the "generic" thing on purpose and it is the standard.

| Pattern the checklist proposes | Verdict | Evidence |
|---|---|---|
| Swap the font for a "character" face (Geist/Outfit/Satoshi) | AVOIDS — bilingual Plex Sans Arabic leads; never swap | `index.css:91-95`, `index.html:17-20`; §0.1 |
| Bigger, tighter, heavier headlines | AVOIDS — h1 is the date at 18/20px; figures are the largest type | `dashboard.tsx:103,:436`; D-T1 |
| Add 500/600 to a 400/700 set | AVOIDS, inverted — uses 400/500/600, never 700; `font-bold` is a deviation | §2; D-T8 |
| Add letter-spacing to headings | EXHIBITS narrowly — `tracking-wider` on the 10px eyebrow only; `tracking-tight` only on DialogTitle | `dashboard.tsx:379,:1003` |
| Drop all-caps subheaders for sentence case | EXHIBITS — the 10px uppercase eyebrow is the label style; the dilution is caps at other sizes, not caps | `dashboard.tsx:379,:424,:504,:775`; §10 |
| Pure `#000` background | AVOIDS — graphite `210 14% 95%` / `206 23% 6%`; black only as the `bg-black/50` scrim | §0.2; C-C7 |
| Pick one accent colour | EXHIBITS — two hues by rule, semantic not decorative; never collapse, never add a third | `index.css:7-19`; D-C2 |
| Tinted / coloured box-shadow | AVOIDS further than asked — zero content shadows of any tint | §4; `grep -c shadow dashboard.tsx` = 0 |
| Grain, noise, texture, mesh | AVOIDS — flatness is the taste; colour = information | `index.css:7-19`; §3 |
| Purple/blue "AI gradient" | AVOIDS — no `bg-gradient-*`; header glass is translucency | §3 |
| Background imagery on empty sections | AVOIDS — empties are one muted `py-6 text-xs` line; lottie only in the palette | C-S3; §7, §8 |
| Break symmetry, offset the grid | EXHIBITS — centred `max-w-6xl`, equal KPI columns; the only asymmetry (`lg:grid-cols-[1.6fr_1fr]`) is functional | `dashboard.tsx:99,:134,:359` |
| Vary border-radius "for softness" | EXHIBITS by ruling — one token ladder (`rounded-lg/md/sm`, `rounded`, `rounded-full`); `rounded-xl` retired | §4; C-R1 |
| Negative margins, overlap, layering | AVOIDS — everything flat inside `overflow-hidden` panels; drawers mount inline | `dashboard.tsx:135,:417,:494` |
| Double the whitespace | AVOIDS explicitly — 12px step, `py-2.5` rows, `gap-px` tiles; the skill itself concedes dense data dashboards | §1; D-S1 |
| Replace the left sidebar with top nav | EXHIBITS — `w-64`/`w-[72px]` start-side sidebar, Sheet on mobile, plus ⌘K palette already coexisting | `sidebar.tsx:172-254`; §5.4 |
| `active:scale(0.98)` press feedback | AVOIDS — no `active:` state anywhere; colour-only transitions | §5.1, §8 |
| 200–300ms transitions on everything | EXHIBITS narrowly — colour 150ms, chevrons `duration-200`, disclosure instant, drawers do not animate height | C-M1; §8 |
| Spinners for loading | AVOIDS — slot-shaped skeletons; `RefreshCw` never spins | C-R2; §7, §8 |
| Composed "getting started" empty states | AVOIDS — one muted line; `EmptyState` is the deviation | C-S3; D-ST1 |
| Toasts for errors | AVOIDS — inline persistent `DegradedStrip` or muted copy in place | `dashboard.tsx:1018-1047`; §7 |
| Remove the card border, keep the shadow | EXHIBITS — border + white, no shadow; the hairline is the only separator in dark mode | §4; `--border 212 15% 17%` |
| One filled + one ghost button per group | AVOIDS — the page renders one Button (outline retry); filled only for active preset and Apply | `dashboard.tsx:1041`; §5.1 |
| Square "New/Beta" badges | EXHIBITS semantically — `rounded-full` is reserved for state pills and chips, not marketing tags | C-T3; §4 |
| Modals for everything | AVOIDS — inline drawers; Dialog for palette and date picker only | `dashboard.tsx:494,:841` |
| Squircle avatars | EXHIBITS — one `rounded-full bg-primary/10` avatar in the sidebar footer | §4, §3 |
| Replace the sun/moon toggle | EXHIBITS — shadcn crossfade, ghost `h-8 w-8`, `defaultTheme="system"` | `theme-toggle.tsx:18-27` |
| Swap Lucide for Phosphor/Heroicons | EXHIBITS — `lucide-react`, one stroke, sized by rule (16px in buttons via `[&_svg]:size-4`, 12px chevrons, 14px strip icon) | `dashboard.tsx:11`; §5.1, §15.4 |
| Convert hard-coded px tracks to rem/% | EXHIBITS — `86px`/`64px`/`3px`/`78px` tracks are deliberate structure | `dashboard.tsx:713,:940,:981`; §1 |
| Replace arbitrary z-index values | EXHIBITS (defect, ruled) — `z-[9999]`/`z-[10050]`/`z-[10100]` are a named scale | `z-index.ts`; §0.5; C-I3 |
| Animate width/height | EXHIBITS (accepted) — sidebar `transition-[width]` is the one bespoke motion; not a target | `sidebar.tsx:172-282`; §8 |
| Sentence-case every header | EXHIBITS, split by role — eyebrows uppercase, h1 a date, nav items Title Case nouns | `trips.png` sidebar |
| Optical bottom padding | EXHIBITS — symmetric `p-3`/`py-2.5`; tile `pb-1.5 pt-2` exists to clear the status dot, not for optics | `dashboard.tsx:741`; §1 |

N/A rows (marketing-only, no bearing on the reference): 65ch body width, `text-wrap: balance`, gradients' evenness, lighting direction, three-column feature rows, bottom-aligned CTAs, FAQ accordion, carousels, pricing towers, footer link farms, placeholder copy, favicon/meta, cookie consent.

---

## 4. How it should read on each surface

Shared by every family: the `max-w-6xl gap-3 p-3 sm:p-4` frame (§1); title row `text-lg sm:text-xl font-semibold` + `11.5px` muted subtitle + actions on one line at `h-8` (§2, C-B3); panels `overflow-hidden rounded-lg border bg-card`, no shadow (§4); PanelHead eyebrow `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` on `bg-muted/60` (§10).

### 4.1 List pages with tables (`trips.png`, `fuel-events.png`, `service-invoices.png`, `oil-changes.png`, `fee-mappings.png`, `users.png`)
The fuel-events panel of the dashboard stretched to a page. Rows are flush `divide-y` at `px-3 py-2.5` (C-S2). Column heads are the PanelHead eyebrow. Identifiers and figures (receipt, plate, date, litres, km, EGP) are `font-mono tabular-nums`; money additionally `text-money`; nothing else on the row is coloured except one status pill (`border-X/40 bg-X/10 text-X`, 11px) (§3, C-T1). Free text truncates; identifiers `shrink-0` (§6). Hover `bg-muted/50`; selected `bg-primary/10 text-primary` (C-C4, C-C1). Loading is `Skeleton h-10 rounded-none` rows in the same panel (C-R2); empty and error are a `py-6 text-center text-xs text-muted-foreground` line, error with a DegradedStrip when there is a retry — never an illustration, never a toast (§7). Pagination and per-page controls at `h-8` (C-B3).

### 4.2 Forms (`trips-new.png`, `fuel-events-new.png`, `service-invoice-edit.png`, `oil-change-edit.png`)
The dashboard has no form (§11), so the form is §12.2 inside the dashboard frame: `gap-3` page; each group a `rounded-lg border bg-card` panel with a PanelHead eyebrow rather than a titled card; fields `h-9 rounded-md border-input` so Input, Select and DatePicker line up; `Label text-sm font-medium`, required star destructive, `space-y-1` label→control (§12.2). Figures typed into a field (odometer, litres, EGP) are mono (§2; D-T5). Computed read-outs are KPI-card recipes: eyebrow, `22px font-mono` value, `11.5px` detail (§10). Validation after blur as an `11px text-destructive` line and `border-destructive/40` card (§12.2). Submit row `Button default` + `Cancel outline` at `h-8`; pending is `disabled:opacity-50`, not a spinner (§5.1, §8). Warnings are the DegradedStrip; success readouts are neutral figures — green is a passing status, not a number (§3).

### 4.3 Detail pages (`driver-detail.png`, `fuel-event-details.png`, `service-invoice-details.png`)
KPI-row-plus-drawer at page scale. Title row is the plate or name at `text-lg sm:text-xl font-semibold` (Arabic in sans, Latin plates in mono, §2), an `11.5px` muted subtitle `#id · date · driver`, and the Back/Edit/Delete cluster at `h-8`. Below, `grid grid-cols-2 gap-3 lg:grid-cols-4|3` KPI cards — eyebrow, `22px font-mono` value (amber if money), `11.5px` detail with `min-h-[17px]` (§6). Facts are a `dl space-y-1 text-[12px]` with dashed `border-border/60` dividers, `dt` muted truncating, `dd font-mono shrink-0` (§6 item 1, C-D1) inside a `bg-muted/40` well — no icon per row. Status is one 11px pill; failed expiries are a `text-destructive` value plus a pill, not a tinted card. Loading is `Skeleton h-3.5 rounded-sm` at `w-3/4 w-2/3 w-4/5` (§7); errors a `py-6 text-center text-xs` line with the headline still showing.

### 4.4 Finance (`fleet-expenses.png`, `fleet-expenses-messages.png`, `fleet-expense-edit.png`)
Where the amber rule matters most: every debit/credit figure is `font-mono tabular-nums text-money` (C-T1) with sign, no currency symbol — "the exact figures live in the drawers" (§2). The ledger is a flush `divide-y` stream (§6 item 2) with day headers as PanelHead asides (`10px normal-case` data on `bg-muted/60`); the KPI row is `grid-cols-2 gap-3 lg:grid-cols-4` of 22px mono cards; the category breakdown is the dashboard's div bar chart (`h-[15px] rounded bg-muted` track, `bg-money` fill, 2% floor, §6) — not a pie; a timeline, if drawn, uses only `hsl(var(--primary))` and the muted grid (§12.5). Inbound messages are the fuel-event row recipe: `grid-cols-[1fr_auto]`, date `shrink-0`, text `dir="auto"` truncating, one neutral chip for "ignored", an `h-7` outline action. Uncategorised rows carry the warning tint (`border-warning/40 bg-warning/10`), never a black button. Edits are the 4.2 form; the source message sits in a `bg-muted/40 p-3` well with a 10px eyebrow.

### 4.5 Maps & live (`etit.png`, `zones.png`, `locations.png`, `trip-replay.png`)
The dashboard owns the live vocabulary: ConnectionBadge (`rounded-full border px-2.5 py-1 text-[11px] font-medium`, `border-success/40 bg-success/10 text-success` with a pulsing 6px dot; connecting = `border-border bg-muted text-muted-foreground`), the `STATUS_STYLES` map, fleet tiles with `17px font-mono` plates and `9.5px` status lines, the compact DegradedStrip with one retry (§5.3, §7, C-B2). The map fills `<main>` edge to edge (the one legitimate exception to the frame); floating controls are `h-8` outline/ghost buttons and the 11px pill on `bg-card` with a hairline and `shadow-md` at most (§4); the vehicle list is the fleet-tile grid or a `divide-y` list with mono plates; the selected vehicle's card is the Truck drawer (`rounded-lg border bg-muted/40 p-3 text-[12px]`, 15px mono plate, dashed dl rows). Marker and route colours come from `STATUS_STYLES` tokens; terminal/drop-off pins take navy/amber by role. Stream down: badge turns warning, DegradedStrip over the map, tiles fall back to trip records (§7). Loading is a skeleton over the map slot. Replay's mode switch is the scope-preset pattern: `h-7 text-xs` pills, default↔outline, `aria-pressed` (C-B4). The HUD is a KPI card; the scrubber a `bg-muted` track with a `bg-primary` thumb and `bg-money`/status fills only.

### 4.6 Placeholders & settings (`trucks.png`, `tablets.png`, `settings.png`, `not-found.png`)
An empty is a single `py-6 text-center text-xs text-muted-foreground` line inside the normal panel (C-S3); a "not yet built" page is the same frame — title row, one panel, one muted sentence — so navigating to Trucks does not change the app's rhythm. `EmptyState` (dashed, `py-16`, lottie 120px) exists for the command palette only, stripped there to `border-0 bg-transparent py-6` (§7). Settings is the simplest 4.2 form: one panel per integration with a PanelHead eyebrow ("PETROAPP", aside = status), `h-9` inputs, an `h-8` Save; gateway status is the 11px `Badge` in the head's aside; save feedback is inline copy. Not-found is the app frame with one panel and `Button default` at `h-9` — the same navy the sidebar uses, no illustration.

---

## 5. Where the aesthetic is currently diluted

Merged from Lens 2 departures and Lens 3 §B, deduplicated, grouped by the rule diluted. Direction of every fix is toward §0–§10 values, never toward a checklist "upgrade".

### 5.1 Frame and spacing (§1; D-S1–D-S4)
- PageShell replaces the dashboard frame: `text-2xl md:text-3xl` title, `text-sm` subtitle, 40px `h-10 w-10 rounded-lg bg-muted` icon well, `gap-6 p-4 md:p-6 lg:p-8`, no `max-w-6xl` (`shared/ui/page-shell.tsx:22-33`). Visible on all six list screenshots and `trucks.png`/`tablets.png`: title ~1.5× the reference, first data row ~200px down, table edge to edge in `trips.png`. The icon well is the one PageShell element §12.1 counts as a genuine gap; its size and radius are not.
- Detail containers deviate three ways: driver `max-w-4xl space-y-4`, fuel `max-w-4xl space-y-4`, invoice `container max-w-6xl py-8 px-4` with a `text-2xl font-bold` h1 (`pages/driver-detail/driver-detail.tsx:90`, `pages/fuel-events/fuel-event-details.tsx:83`, `pages/service-invoices/service-invoice-details.tsx:26`, `widgets/service-invoice-details/service-invoice-details.tsx:61`).
- Forms: `Card > CardHeader pb-3 > CardTitle text-base` with 16px icon, `CardContent p-6`, `space-y-6` between cards (`widgets/fuel-event-form/fuel-event-form.tsx:208-213`, `widgets/oil-change-form/oil-change-form.tsx:190-195`, `widgets/trip-form/trip-form.tsx:660,691,817`; `shared/ui/card.tsx:17,42`) — `fuel-events-new.png` and `oil-change-edit.png` show three stacked cards of ~35% air. Nested `ContainerCard` (numbered `rounded-md bg-primary/10` disc, `trip-form.tsx:1115`) is a bordered box inside a Card inside PageShell; the reference nests with `bg-muted/40 p-3` wells.
- Settings is a `max-w-2xl` column of shadcn Cards, `CardHeader p-6`, 16px `font-semibold tracking-tight` title, Save at `h-9` inside the card (`pages/settings/settings.tsx:61-70`; `settings.png`).
- Pagination as a second bordered card `rounded-lg border bg-card p-3` (`trips-pagination.tsx`) where the reference ends a list with an in-list `li p-3` note (C-S5).
- ChartCard header `h3 text-sm md:text-base font-semibold tracking-tight`, `p-4 md:p-5` body, no tinted head band (`chart-card.tsx:63,75`; D-T4, D-S6).

### 5.2 Type (§2; D-T1–D-T8)
- Uppercase migrates off 10px: trips thead `text-[10.5px]` (`trips-desktop-table.tsx:85`), form section heads `text-sm font-semibold uppercase tracking-wider` ("TRIP DETAILS", `trip-form.tsx:692,819`), status preview `text-xs uppercase` (`widgets/oil-change-form/oil-change-status-preview.tsx:74`), fact labels `text-xs uppercase tracking-wide` (`fuel-event-details.tsx:46`), source-message eyebrow `text-[11px] uppercase` (`pages/fleet-expenses/fleet-expense-form.tsx:297-298`), "VIEW ›" row links in every `service-invoices.png` row.
- Three table-header specs: users `thead text-[10px] font-bold` (`widgets/users-table/users-table.tsx:94`), DataTable `text-xs font-medium h-11` (§12.4), trips `text-[10.5px] font-semibold`; `service-invoices.png` has a sentence-case sortable head (`Plate Number ⇅`) with no band.
- Weight 700/900 and `tracking-widest`: `font-black text-lg` plate (`widgets/service-cars-table/service-cars-table.tsx:39`), `font-bold tracking-widest text-muted-foreground/60` legend (`pages/service-invoices/service-invoices.tsx:152`), service-invoice form `text-2xl font-bold` h1/h2, `text-lg uppercase tracking-widest` subtitle, `text-center font-bold text-lg` heading (`widgets/service-invoice-form/service-invoice-form.tsx:138-359`), details `text-3xl font-black uppercase tracking-tighter` + `tracking-[0.3em]` (`service-invoice-details.tsx:123-186`), map `font-mono text-[9px] font-semibold uppercase tracking-widest` section heads and `font-bold`/`font-black` plates (`fleet-panel.tsx:113,144`, `vehicle-card.tsx:46`, `trip-replay-hud.tsx:140`), 36px `CONNECTING` pill `font-mono text-[10px] uppercase` (`tracking-page.tsx:494`), replay title `text-sm font-bold` (`trip-replay.tsx:503-518`).
- Figures leave mono: headline values `text-3xl font-semibold` sans (`fuel-event-details.tsx:169-202`), fuel readouts `text-xl font-semibold` (`fuel-event-form.tsx:434-439`), StatCard sans `md:text-lg` with `h-8 w-8 rounded-md` icon tile (`stat-card.tsx:66-99`; `fleet-expenses.tsx:340-372`), locations strip `text-3xl font-semibold text-warning` / `text-2xl` sans (`pages/locations/locations.tsx:225-268`), sans odometer/cost inputs in `oil-change-edit.png` (D-T5). Oversized search input `py-6 text-lg` (`service-invoices.tsx:138`).

### 5.3 Colour (§3; D-C1–D-C8)
- Money in green: `text-success`/`tone="success"` on fuel price and efficiency (`widgets/fuel-events-table/fuel-events-table.tsx:271`, `pages/fuel-events/fuel-events.tsx:376`), trip fee (`trip-form.tsx:1295`), oil status preview (`oil-change-status-preview.tsx:25-26`); `fuel-events.png` km/L figures are green/amber/red per row. Ledger money is neutral `font-semibold` with no `text-money` anywhere in the finance family (`fleet-expenses.tsx:340-372`).
- Third hues hard-coded (D-C2; `index.css:7-19`):
  - Donut `#2a78d6`/`#eb6834` light, `#3987e5`/`#d95926` dark, grey `#8A968F`, theme-switched by hand (`fleet-expenses.tsx:226-227`; visible top-right of `fleet-expenses.png`). The AreaChart line is navy and conforms.
  - `text-blue-500` keyword icon (`service-invoices.tsx:156`); `blue-500`/`indigo-500` `text-[9px] font-black` pills (`service-invoice-details.tsx:309`).
  - Map hex `#f59e0b #16a34a #6b7280 #1f3a5f #d97706 #dc2626 #1d4ed8` (`features/tracking/map/layers.ts:45-52,153`, `tracking-map.tsx:94`) and inline-styled HTML tooltips with `#6b7280`/`#b45309` (`tracking-map.tsx:129-210`).
  - Replay `#2563eb`/`#16a34a`/`#f59e0b` (`widgets/trip-replay-map/google-adapter.ts:107,220`).
  - Tailwind `amber-500`/`amber-600`/`slate-950`/`text-white` in deck and HUD (`features/tracking/components/time-deck.tsx:186,322,560-647`, `widgets/trip-replay-hud/trip-replay-hud.tsx:196-197`, `trip-replay-timeline.tsx:293`).
- Foreground-as-fill selected state `bg-foreground text-background` (`fleet-expense-form.tsx:420`, `fleet-expenses.tsx:768`, `fleet-expenses-messages.tsx:106,120`; solid black "Out" segment in `fleet-expense-edit.png`) and `bg-foreground text-background` table head (`service-invoice-details.tsx`) vs `bg-primary/10 text-primary` (C-C1).
- Solid status fill with emoji on the efficiency card (`fuel-event-details.tsx:163-173`); tinted cards for expiries at `/30 /5` alphas, `rounded-md`, no retry (`widgets/driver-detail/overview-tab.tsx:165,246-247`, `driver-detail.tsx:169`) vs the dashed `/40 /10` strip (D-C6, D-C8, D-R3).
- Gradient: `bg-gradient-to-br from-background via-background to-primary/5` hero (`service-invoices.tsx:123-124`). Off-recipe pill `border-X/30 bg-X/15 px-2 py-0.5 text-xs` (`receipt-status-badge.tsx:18-45`; D-C7); hover `bg-muted/40` (`trips-desktop-table.tsx:216`; D-C3); muted tint `/20` in `EmptyState` (C-C2); opacity-faded muted text `/60` (C-C5).

### 5.4 Radius, border, shadow (§4; D-R1–D-R4)
- Content shadows return (reference: none on any dashboard card; `shadow-md` ceiling for floating menus):
  - `shadow-sm` default on `Card` (`shared/ui/card.tsx:8`; D-R1); `rounded-xl … shadow-sm` users-table (`users-table.tsx:92`; D-R2).
  - `shadow-md` sticky trip footer (`trip-form.tsx:901`) — the reference's only sticky element is the app header (§6).
  - `border-2 border-primary/20 shadow-lg shadow-primary/5` hero card (`service-invoices.tsx:123-124`) — a 2px border, a tinted shadow and a gradient in one class string; `py-6 text-lg border-2 border-muted rounded-2xl shadow-inner bg-background/50` input (`:138`).
  - `border-2 border-muted shadow-lg` details card, `rounded-full … font-black … shadow-sm` tags (`service-invoice-details.tsx:123-186`); `rounded-xl border-2 border-muted` line-item box and `border-t-2` footer (`service-invoice-form.tsx:138-359`).
  - `shadow-xl backdrop-blur` fleet panel and vehicle card (`fleet-panel.tsx:81`, `vehicle-card.tsx:38`); `shadow-2xl rounded-t-2xl` time deck (`time-deck.tsx:284`); `shadow-lg shadow-primary/30` play button and `bg-card/85 backdrop-blur-md rounded-xl` HUD (`trip-replay-hud.tsx:130,233`); leg rail (`trip-replay-leg-rail.tsx:72`).
- `rounded-xl` returns as the dominant card radius in finance (`fleet-expenses.tsx:353,380,402-403`, `fleet-expense-form.tsx:297` with `border-s-4 border-s-primary`, `cash-in-review.tsx:106`), `rounded-t-2xl` bottom sheets (`split-editor.tsx:217`, `ledger-list.tsx:253`), `rounded-xl` skeletons (`users-table.tsx:53-56`, `zones.png` cards), `h-12 w-12 rounded-xl bg-primary` icon disc (`service-invoice-details.tsx`).
- Dashed border and pill re-purposed as buttons: `rounded-full border-dashed border-primary/50 text-xs font-semibold text-primary` category chips at `min-h-11` on ~280 rows (`ledger-list.tsx:507,527`; `fleet-expenses.png`); "Trailer / No Trailer" `text-xs` pills in every `service-invoices.png` row (C-T3); 32px `rounded-full bg-muted` icon discs per fact (`fuel-event-details.png`, `driver-detail.png`; D-L2).

### 5.5 Motion and feedback channel (§7, §8; D-ST1–D-ST4)
- Spinners and non-colour motion (reference: skeletons, `animate-pulse` only, `RefreshCw` never spins, no scale):
  - `Loader2 animate-spin` in submit buttons (`trip-form.tsx:914`, `fuel-event-form.tsx:487`, `oil-change-form.tsx:475`).
  - Fee-mappings page load (`pages/fee-mappings/fee-mappings.tsx:137`).
  - Replay and map slots, including a `border-2 border-t-transparent` ring (`pages/trip-replay/trip-replay.tsx:545,558`, `widgets/trip-replay-map/trip-replay-map.tsx:131`, `shared/ui/map-view.tsx:164`); `trip-replay.png` is a bare spinner on graphite.
  - WhatsApp link button and `h-8 w-8` QR spinner (`widgets/whatsapp-gateway-card/whatsapp-gateway-card.tsx:97,136`).
  - `RefreshCw animate-spin` and `Download animate-pulse` toolbar icons (`fleet-expenses.tsx:285,295`).
  - `Sparkles animate-pulse` while searching (`service-invoices.tsx:130-131`).
  - `animate-ping` dot (`trip-replay-hud.tsx:197`); `group-hover:scale-125` markers (`trip-replay-timeline.tsx:336`).
- Toasts: every fee-mapping mutation (`fee-mappings.tsx:101-119`), trip validation (`trip-form.tsx:591-642`), replay load errors (`trip-replay.tsx:261-268`), settings and gateway saves (`settings.tsx:47-51`, `whatsapp-gateway-card.tsx:50`).
- Illustrated empties: `EmptyState` in oil-changes (`pages/oil-changes/oil-changes.tsx:190-202`), messages (`fleet-expenses-messages.tsx:141-148`), placeholder 120px lottie in dashed `bg-muted/20 py-16` (`pages/placeholder/placeholder.tsx:21-31`, `shared/ui/empty-state.tsx:35`; `trucks.png`), not-found 180px lottie + `size="lg"` (`pages/error/not-found.tsx:14-27`).
- Wrong-shape loading: `animate-pulse rounded-xl bg-muted/50` blocks (`users-table.tsx:53-56`), `Skeleton h-28` message blocks, card-per-message with `bg-muted` bubble (`fleet-expenses-messages.png`), "Load more" footer button instead of the sentinel + skeleton row (§6.2; `fleet-expenses.png` bottom).

### 5.6 Shell and layering (§6, §9; D-L3, D-L4, D-B1–D-B6)
- Sticky/glass surfaces beyond the app header: `sticky bottom-0 -mx-4 bg-background/90 backdrop-blur` save bars (`fuel-event-form.tsx:464`, `oil-change-form.tsx:452`), `fixed … backdrop-blur-lg z-50` (`service-invoice-form.tsx:368`), sticky day headers `sticky top-0 z-10 bg-background text-xs font-semibold` (`ledger-list.tsx:189`), replay `fixed inset-0 z-50` with its own `bg-card/70 backdrop-blur` header and `bg-muted p-1` Tabs tray (`trip-replay.tsx:503-518`; `trip-replay.png` top-right).
- Control heights: three `h-9` action buttons on trips (D-B1), `h-10` MultiSelect beside `h-9` inputs (`trips-new.png`; D-B6), `ChevronRight h-4 w-4 → rotate-90` vs `ChevronDown h-3 w-3 → rotate-180` (`trips-desktop-table.tsx:225`; D-L3).
- Hard-coded English copy outside `t()`: `placeholder.tsx:28-29`, `settings.tsx:47-51` (C-I4, D-I2).

---

## 6. Use of this brief

This brief gives Phase 4 remediation a shared vocabulary — the Design Read, the three dials, the twelve DNA rows and the refusal table — so that a fix can be named by the rule it restores rather than by taste. Every value quoted here (hsl, px, class, alpha, ruling code) comes from .audit/design-system.md §0–§10 and §14 and is reproduced, not invented; where a line-number or screenshot is cited it is the evidence for a departure, not a specification. Nothing in this document authorises a change the design system does not: an item is a remediation target only because it appears in §5 and only in the direction of the §0–§10 value it diluted.
