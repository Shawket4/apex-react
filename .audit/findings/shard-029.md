# Findings — shard-029

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/pages/users/users.tsx` | 148 | audited | Uses `PageShell` (§14b R-11/R-14) correctly. Toasts on mutation outcome are allowed by `deferred-rulings.md` R-2. `SearchInput` `sm:max-w-sm` vs §12.2's `max-w-sm` page cap — no rule at that precision. |
| `src/widgets/users-table/users-table.tsx` | 261 | audited | Hand-rolled `<table>` where `zones-table` uses the generic `DataTable`; §12.4 documents both a bespoke and a generic table, so **no rule** forces one — but every header/row/cell value below differs from both specs. Desktop/mobile split is CSS (`md:hidden`), unlike §12.4's JS `useIsMobile` — no rule. |
| `src/entities/whatsapp/api.ts` | 23 | no UI content | data/logic only |
| `src/entities/whatsapp/queries.ts` | 52 | no UI content | hook file, no JSX/classes; toast strings all `t()` |
| `src/entities/whatsapp/schemas.ts` | 9 | no UI content | zod only |
| `src/widgets/whatsapp-gateway-card/index.ts` | 1 | no UI content | barrel |
| `src/widgets/whatsapp-gateway-card/whatsapp-gateway-card.tsx` | 143 | audited | `bg-white` on the QR image (`:129`) is functional (scannability), not decoration — **no rule** applied. |
| `src/entities/zone/api.ts` | 55 | no UI content | data/logic only |
| `src/entities/zone/index.ts` | 3 | no UI content | barrel |
| `src/entities/zone/queries.ts` | 114 | no UI content | hooks + toasts, all `t()`; prefetch helper matches C-B5 intent |
| `src/entities/zone/schemas.ts` | 40 | no UI content | zod; validation messages are untranslated English literals but they are schema data, **no rule** in §9 for zod messages |
| `src/widgets/zone-form-dialog/index.ts` | 1 | no UI content | barrel |
| `src/widgets/zone-form-dialog/zone-form-dialog.tsx` | 228 | audited | — |
| `src/widgets/zone-map-picker/index.ts` | 1 | no UI content | barrel |
| `src/widgets/zone-map-picker/zone-map-picker.tsx` | 95 | audited | Cairo centre fallback `[30.0444, 31.2357]` — **no rule** |
| `src/pages/zones/zones.tsx` | 113 | audited | No `icon` passed to `PageShell` while `users.tsx` passes one; §12.1 calls the icon well "optional" — **no rule** |
| `src/widgets/zones-table/columns.tsx` | 116 | audited | — |
| `src/widgets/zones-table/index.ts` | 1 | no UI content | barrel |
| `src/widgets/zones-table/zones-table.tsx` | 35 | audited | — |

## Findings

### shard-029-F01 · blocker · high · RTL/i18n/a11y
- **Where:** `src/pages/users/users.tsx:95` — `<Button variant="outline" size="icon" onClick={() => refetch()} … className="h-9 w-9">`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"
- **Current:** an icon-only refresh button whose only child is `<RefreshCw>`; no accessible name.
- **Expected:** every icon-only control in the reference carries a translated label — `header.tsx:21` (`aria-label={t('common.openMenu')}`), `theme-toggle.tsx:25`; C-I4 requires the string go through `t()`.
- **Change:** `class-level` — add `aria-label={t('common.refresh')}` to the Button at `:95`; add `common.refresh` to `en.json`/`ar.json` if absent (allowed by `deferred-rulings.md` R-8).
- **Notes:** the `RefreshCw` icon itself should also get `aria-hidden="true"` (same bullet family as F17).

### shard-029-F02 · nit · high · buttons & controls
- **Where:** `src/pages/users/users.tsx:100` — `className="h-9 w-9"` (and `:104` `className="h-9 gap-2"`)
- **Rule:** design-system §5.1 "Sizes: `default` h-9 px-4 py-2 (36px) … `icon` h-9 w-9"; base cva already sets `gap-2`
- **Current:** call-site overrides restate the variant defaults.
- **Expected:** §5.1's "call-site override convention" exists to *change* a size (chrome rows `h-8`, popover rows `h-7`); re-asserting the default is dead class weight (`button.tsx:11-24`).
- **Change:** `class-level` — drop `className="h-9 w-9"` at `:100`; drop `className="h-9 gap-2"` at `:104`.
- **Notes:** purely cosmetic; no rendered change.

### shard-029-F03 · blocker · high · motion
- **Where:** `src/widgets/users-table/users-table.tsx:53` — `<div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />` (and `:56` `h-64 animate-pulse rounded-xl bg-muted/30`)
- **Rule:** design-system §14 C-M2 "**→ Ruling:** `motion-reduce:animate-none` on the Skeleton primitive. Applied."; §7 "Loading is always the `Skeleton` primitive shaped like the slot"
- **Current:** two hand-rolled pulsing divs that bypass `Skeleton`, so they keep animating under `prefers-reduced-motion`.
- **Expected:** `Skeleton` = `animate-pulse rounded-md bg-muted motion-reduce:animate-none`, shaped per slot (`skeleton.tsx`, §10 "Skeleton" recipe).
- **Change:** `structural` — replace both divs with the `Skeleton` primitive (already imported elsewhere in the shard): `<Skeleton key={i} className="h-20 rounded-lg" />` and `<Skeleton className="h-64 rounded-lg" />`; add `import { Skeleton } from '@/shared/ui/skeleton';`.
- **Notes:** this also fixes the `rounded-xl` in F04 for these two lines and the non-token `bg-muted/50` / `bg-muted/30` tints (C-C2 reserves `/50` for hover and `/40` for wells).

### shard-029-F04 · blocker · high · radius/border/shadow
- **Where:** `src/widgets/users-table/users-table.tsx:92` — `className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block"` (also `:53`, `:56`, `:209`)
- **Rule:** design-system §14 C-R1 "**→ Ruling:** token family: `rounded-lg` everywhere; `rounded-xl` retired."
- **Current:** four surfaces at `rounded-xl` (Tailwind constant 12px), so a change to `--radius` would move every other card and leave these behind.
- **Expected:** `rounded-lg` (the `--radius` token) on all cards/panels — `Card` primitive is `rounded-lg border bg-card` (`card.tsx:9`), dashboard panels post-C-R1.
- **Change:** `class-level` — `rounded-xl` → `rounded-lg` at `:53`, `:56`, `:92`, `:209`.
- **Notes:** §13 D-R2 records `rounded-xl` surviving only in the trips *mobile list*; nothing licenses it here.

### shard-029-F05 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/users-table/users-table.tsx:93` — `<table className="w-full text-left text-sm">`
- **Rule:** design-system §14 C-I1 "**→ Ruling:** logical utilities everywhere"; §9 "Rule C-I1: no physical `ml-/mr-/left-/right-` utilities"
- **Current:** `text-left` pins the whole table's alignment to LTR; in Arabic every cell stays left-aligned.
- **Expected:** `text-start` — used throughout the reference (`dashboard.tsx:418` KPI face, §12.4 `th … text-start`).
- **Change:** `class-level` — `text-left` → `text-start`.
- **Notes:** this table renders Arabic user names; the app runs RTL via i18next.

### shard-029-F06 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/users-table/users-table.tsx:183` — `<Edit className="mr-2 h-3.5 w-3.5" />` (also `:190` `<Trash2 className="mr-2 h-3.5 w-3.5" />`)
- **Rule:** design-system §14 C-I1 "**→ Ruling:** logical utilities everywhere — … palette `ms-auto`/`ms-1`, … user-menu `ms-1`. Applied."
- **Current:** physical `mr-2` on menu-item icons; in RTL the gap lands on the wrong side.
- **Expected:** the reference spaces menu-item icons with `me-2`/`gap-2` (`user-menu.tsx`, `dropdown-menu.tsx:77` item recipe).
- **Change:** `class-level` — `mr-2` → `me-2` at `:183` and `:190`.
- **Notes:** same defect in F18, F22, F34 — different files, so fix each in place.

### shard-029-F07 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/users-table/users-table.tsx:177` — `<Button variant="ghost" size="icon" className="h-8 w-8">` (child: `<MoreHorizontal className="h-4 w-4" />`)
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"
- **Current:** the row's only action affordance has no accessible name.
- **Expected:** §12.4 row actions are "ghost icon `h-7 w-7` with `aria-label`+`title`"; C-I4 requires the string through `t()`.
- **Change:** `class-level` — add `aria-label={t('common.actions')}` (and `title` likewise) to the trigger Button.
- **Notes:** `t` is already in scope in `UserActions`.

### shard-029-F08 · should · high · type
- **Where:** `src/widgets/users-table/users-table.tsx:94` — `className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider"`
- **Rule:** design-system §2 "Weights used: 400, 500 (`font-medium`), 600 (`font-semibold`). **700 is never used**"; §10 "Eyebrow `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"; §14 C-C2 "**→ Ruling:** three steps: `/60` head band, `/50` hover, `/40` wells"
- **Current:** 700 weight on the header band, and a `/30` muted tint that is not one of the three ruled steps.
- **Expected:** eyebrow weight 600; head band `bg-muted/60` (dashboard PanelHead, `dashboard.tsx:999-1005`). §13 D-T8 records `font-bold` as a trips deviation the dashboard wins.
- **Change:** `class-level` — `font-bold` → `font-semibold`, `bg-muted/30` → `bg-muted/60` at `:94`. The per-`th` `font-semibold` at `:96-101` then becomes redundant but is harmless; leave it.
- **Notes:** `th` padding `px-4 py-3` matches §12.4's generic DataTable — leave as is.

### shard-029-F09 · should · high · type
- **Where:** `src/widgets/users-table/users-table.tsx:225` — `className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"` (also `:234`)
- **Rule:** design-system §2 "**700 is never used**"; §10 "Eyebrow `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`"
- **Current:** the mobile card's field eyebrows are 700.
- **Expected:** `font-semibold` — the single eyebrow style above every figure and label (`dashboard.tsx:382`, `:427`).
- **Change:** `class-level` — `font-bold` → `font-semibold` at `:225` and `:234`.
- **Notes:** the `gap-1.5` icon pairing is correct (§1, 6px step).

### shard-029-F10 · should · high · tables/lists
- **Where:** `src/widgets/users-table/users-table.tsx:106` — `<tr key={user.ID} className="hover:bg-muted/20 transition-colors">`
- **Rule:** design-system §14 C-C4 "**→ Ruling:** named roles — `hover:bg-muted/50` on content rows/cards"
- **Current:** `/20` — a fourth muted step, weaker than any hover in the reference.
- **Expected:** `hover:bg-muted/50` (`dashboard.tsx:425`, `:616`, `:940`).
- **Change:** `class-level` — `hover:bg-muted/20` → `hover:bg-muted/50`.
- **Notes:** §13 D-C3 lists trips' `/40` as a deviation the dashboard wins; `/20` is not licensed either way.

### shard-029-F11 · nit · medium · radius/border/shadow
- **Where:** `src/widgets/users-table/users-table.tsx:104` — `<tbody className="divide-y divide-border/50">`
- **Rule:** design-system §4 "Border. 1px everywhere … one hairline token, set globally" (§3 "Hairlines: bare `border`, `border-b/t/e`, `divide-y` → `--border`")
- **Current:** the row dividers are half-strength.
- **Expected:** bare `divide-y` inheriting `--border` — the fuel list uses `ul.divide-y` with no alpha (`dashboard.tsx:604`). §13 D-C13 records `border-border/50` as a trips deviation the dashboard wins.
- **Change:** `class-level` — `divide-y divide-border/50` → `divide-y`.
- **Notes:** the dashed `border-border/60` alpha (C-R4) applies only to dashed `dl` hairlines, not solid list dividers.

### shard-029-F12 · should · high · radius/border/shadow
- **Where:** `src/widgets/users-table/users-table.tsx:92` — `… rounded-xl border bg-card shadow-sm md:block` (also `:209` `rounded-xl border bg-card p-4 shadow-sm space-y-3`)
- **Rule:** design-system §4 "**Shadow.** None on any dashboard card, panel, tile … Cards are `border bg-card` with **no shadow** — separation is tone (white on graphite) plus a hairline"
- **Current:** both the desktop table card and the mobile user card lift with `shadow-sm`.
- **Expected:** the `Card` primitive is `rounded-lg border bg-card text-card-foreground`, no shadow (`card.tsx:9`); elevation is reserved for controls and floating layers.
- **Change:** `class-level` — remove `shadow-sm` at `:92` and `:209`.
- **Notes:** §13 D-R1 recorded `Card` carrying `shadow-sm`; the primitive no longer does, so these hand-rolled cards are now the only lifted surfaces on the page.

### shard-029-F13 · blocker · medium · colour roles
- **Where:** `src/widgets/users-table/users-table.tsx:71-88` — `tone="success"` (regulars), `tone="warning"` (managers), `tone="destructive"` (admins)
- **Rule:** `src/app/index.css:7-19` palette rule, quoted in design-system §0.2: *"Two hues, one job each … Everything else is neutral, so colour on this screen is information rather than decoration"*; §3 "Success … passing status only", "Warning … degraded / attention, not failure", "Destructive … critical / negative"
- **Current:** four status hues used to distinguish four *permission categories*. Nothing about a manager is degraded and nothing about an admin is critical; the colour carries no state.
- **Expected:** categories that are not statuses take the neutral tone — `StatCard` `tone="default"` = `bg-muted text-muted-foreground` (`stat-card.tsx:10`), matching §3's "Neutral chip" role.
- **Change:** `class-level` — `tone="success"` → `tone="default"` at `:75`, `tone="warning"` → `tone="default"` at `:81`, `tone="destructive"` → `tone="default"` at `:87`. Keep `tone="primary"` on the total (navy = the actionable/primary summary) or drop it to `default` too; primary is the safer keep.
- **Notes:** `PermissionBadge` in the same file carries the same category-as-status problem (F14) — the two should end up consistent.

### shard-029-F14 · should · medium · colour roles
- **Where:** `src/widgets/users-table/users-table.tsx:152-159` — `{ 1: 'secondary', 2: 'outline', 3: 'default', 4: 'destructive' }`
- **Rule:** design-system §3 "Actionable (navy) … **[comment]** navy marks anything you can act on"; "Destructive … critical / negative"
- **Current:** an admin badge renders solid navy (`Badge` `default` = `border-transparent bg-primary text-primary-foreground`, `badge.tsx:10`) — the reference's "you can act on this" fill — and a super-admin badge renders red, reading as an error.
- **Expected:** a non-actionable, non-status label is the neutral chip: §3 "Neutral chip `bg-muted text-muted-foreground`" / `Badge variant="secondary"`.
- **Change:** `class-level` — map all four levels to `'secondary'`, or keep a single rank cue (e.g. `outline` for 1–2, `secondary` for 3–4). Do not use `default` or `destructive` here.
- **Notes:** the variant map is also used by `MobileUserCard` (`:220`), so one edit covers both surfaces. Coordinate with F13.

### shard-029-F15 · should · high · type
- **Where:** `src/widgets/users-table/users-table.tsx:109` — `<td className="px-4 py-3 text-muted-foreground tabular-nums">` (also `:115`, `:229`, `:238`)
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values, bar amounts, the fuel-row price"
- **Current:** phone numbers and timestamps get `tabular-nums` but stay in the sans face, so a column of phones does not align on the same skeleton as every other figure column in the app.
- **Expected:** `font-mono tabular-nums` (`dashboard.tsx:501-509` dd rows; `stat-card.tsx:97` value). §12.4 also has table figure cells mono.
- **Change:** `class-level` — add `font-mono` alongside `tabular-nums` at `:109`, `:115`, `:229`, `:238`.
- **Notes:** §2 also says "Arabic text is always sans" — these four cells are numeric/Latin only, so mono is safe.

### shard-029-F16 · should · medium · loading/empty/error states
- **Where:** `src/widgets/users-table/users-table.tsx:105` — `{users.map((user) => (` (and `:129` for the mobile grid)
- **Rule:** vercel-rules "Content Handling" bullet "Handle empty states—don't render broken UI for empty strings/arrays"; `deferred-rulings.md` R-1 "A list/table that IS the page or tab's whole content → `EmptyState` primitive"
- **Current:** when the search filters everything out (or there are no users), the page shows a header row over an empty tbody and an empty mobile grid — no message, no way to tell "no results" from "still loading".
- **Expected:** §12.4's DataTable renders `EmptyState no_results` (`border-0 bg-transparent py-12`) in that slot; `zones-table` gets this for free by using `DataTable`.
- **Change:** `structural` — when `users.length === 0 && !loading`, render the `EmptyState` primitive (`shared/ui/empty-state.tsx`) in place of the table/mobile grid, with a `t()` title and the `no_results` lottie. Keep both existing branches for the non-empty case.
- **Notes:** the users page filters client-side (`users.tsx:32-40`), so the empty case is reachable by typing in the search box on every load.

### shard-029-F17 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/users-table/users-table.tsx:178` — `<MoreHorizontal className="h-4 w-4" />` (also `:213`, `:226`, `:235`, `:246`, `:255`, and the `StatCard` icons are handled by the primitive)
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden=\"true\"`"
- **Current:** decorative lucide icons are exposed to assistive tech; the phone/calendar icons in the mobile card duplicate the label text next to them.
- **Expected:** design-system §9 "**ARIA**: … `aria-hidden` on dots/chevrons/severity bars/sentinel" — the reference hides every purely decorative glyph.
- **Change:** `class-level` — add `aria-hidden="true"` to the icons at `:178`, `:213`, `:226`, `:235`, `:246`, `:255`.
- **Notes:** `:246`/`:255` sit next to visible text labels, so hiding them loses nothing; `:178` is covered by the `aria-label` added in F07.

### shard-029-F18 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/whatsapp-gateway-card/whatsapp-gateway-card.tsx:97` — `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` (also `:99` `RefreshCw`, `:106` `QrCode`)
- **Rule:** design-system §14 C-I1 "**→ Ruling:** logical utilities everywhere"
- **Current:** physical `mr-2` on icons inside Buttons; the gap flips to the wrong side in Arabic, and the Button base already supplies `gap-2` (§5.1), so the spacing is doubled in LTR.
- **Expected:** no margin at all — `[&_svg]:size-4` + `gap-2` on the Button base handles icon spacing (`button.tsx:7`, `dashboard.tsx:1043`).
- **Change:** `class-level` — `mr-2 h-4 w-4 animate-spin` → `animate-spin` at `:97`; drop the whole `className="mr-2 h-4 w-4"` at `:99` and `:106`.
- **Notes:** §15.4 is explicit that `h-4 w-4` inside a Button is dead weight — `[&_svg]:size-4` already wins on specificity.

### shard-029-F19 · should · high · images
- **Where:** `src/widgets/whatsapp-gateway-card/whatsapp-gateway-card.tsx:126` — `<img src={qrUrl} alt={…} className="h-64 w-64 rounded-md bg-white p-2" />`
- **Rule:** vercel-rules "Images" bullet "`<img>` needs explicit `width` and `height` (prevents CLS)"
- **Current:** dimensions come only from classes, so the dialog body jumps when the blob resolves (the QR also re-fetches every 20 s, `whatsapp/queries.ts:26`).
- **Expected:** explicit attributes alongside the classes.
- **Change:** `class-level` — add `width={256} height={256}` to the `<img>`.
- **Notes:** `alt` is present and translated — that part is correct. The container already reserves `min-h-64`, so the fix is belt-and-braces but the rule is explicit.

### shard-029-F20 · should · high · motion
- **Where:** `src/widgets/whatsapp-gateway-card/whatsapp-gateway-card.tsx:136` — `<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />` (also `:97`)
- **Rule:** vercel-rules "Animation" bullet "Honor `prefers-reduced-motion` (provide reduced variant or disable)"; design-system §14 C-M2 "**→ Ruling:** `motion-reduce:animate-none` on the Skeleton primitive"
- **Current:** both spinners loop unconditionally under reduced motion; the `Skeleton` on the same card (`:55`) correctly stops.
- **Expected:** every looping animation in the reference carries `motion-reduce:animate-none` (`dashboard.tsx:227` badge dot, `skeleton.tsx`).
- **Change:** `class-level` — append `motion-reduce:animate-none` at `:97` and `:136`.
- **Notes:** §13 D-ST4 records trips' unguarded `Loader2` as a deviation; the guard is the ruled side. Same defect in F31.

### shard-029-F21 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/whatsapp-gateway-card/whatsapp-gateway-card.tsx:71` — `<MessageCircle className="h-4 w-4" />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden=\"true\"`"
- **Current:** the card title's leading glyph is announced before the title text.
- **Expected:** design-system §9 "`aria-hidden` on dots/chevrons/severity bars"; §12.6 "Dialog title with leading icon `flex items-center gap-2` + `h-4 w-4 text-primary`" — decorative by role.
- **Change:** `class-level` — add `aria-hidden="true"` at `:71`; do the same for the in-button icons at `:97`, `:99`, `:106` while editing them for F18.
- **Notes:** §12.6 also puts `text-primary` on a dialog/section title icon; adding it here is optional and not required by a rule.

### shard-029-F22 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/zone-form-dialog/zone-form-dialog.tsx:219` — `{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}`
- **Rule:** design-system §14 C-I1 "**→ Ruling:** logical utilities everywhere"
- **Current:** physical `mr-2` inside a Button that already has `gap-2`; wrong side in RTL.
- **Expected:** no margin; `[&_svg]:size-4` + base `gap-2` (`button.tsx:7`, §15.4).
- **Change:** `class-level` — `className="mr-2 h-4 w-4 animate-spin"` → `className="animate-spin motion-reduce:animate-none"` (the reduced-motion guard is the same rule as F20).
- **Notes:** this dialog is a submit path used in Arabic.

### shard-029-F23 · should · medium · forms
- **Where:** `src/widgets/zone-form-dialog/zone-form-dialog.tsx:114` — `<FormLabel>{t('zones.fields.name', 'Zone Name')} *</FormLabel>` (also `:128`, `:147`, `:166`)
- **Rule:** provisional (§12.2) "required marker `<span class=\"text-destructive\">*</span>`"
- **Current:** the asterisk is baked into the label text as a plain character, so it is announced as part of the name and carries no colour role.
- **Expected:** a destructive-coloured span sibling (`trip-form.tsx:701`).
- **Change:** `class-level` — `{t('zones.fields.name', 'Zone Name')} <span className="text-destructive">*</span>` at `:114`, `:128`, `:147`, `:166`.
- **Notes:** provisional (§12) — the dashboard has no forms, so §12.2 governs (`deferred-rulings.md` R-5 uses the same reasoning for form headings).

### shard-029-F24 · should · medium · buttons & controls
- **Where:** `src/widgets/zone-form-dialog/zone-form-dialog.tsx:215` — `<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>`
- **Rule:** provisional (§12.2) "**Sticky submit footer** … Cancel outline, primary default"; §12.6 dialog footers use `outline` for Cancel (`drop-off-picker-modal.tsx:267`)
- **Current:** the dialog's Cancel is `ghost`, so it has no boundary beside the filled submit.
- **Expected:** `variant="outline"` in a form/dialog footer; `ghost` is the reference's *chrome* variant (§5.1: sidebar collapse, toggles, menu triggers).
- **Change:** `class-level` — `variant="ghost"` → `variant="outline"` at `:215`.
- **Notes:** provisional (§12.2/§12.6). §13 D-B4 records trips' own inconsistency here; the form-footer recipe is the one with a stated reason.

### shard-029-F25 · nit · medium · radius/border/shadow
- **Where:** `src/widgets/zone-form-dialog/zone-form-dialog.tsx:185` — `className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm sm:mt-6"`
- **Rule:** design-system §4 "**Shadow.** None on any dashboard card, panel, tile … Elevation is reserved for controls and floating layers"
- **Current:** an in-form bordered well lifts with `shadow-sm`.
- **Expected:** border + tone only; §12.2's repeater item well is `rounded-lg border bg-muted/20 p-3 md:p-4`, no shadow.
- **Change:** `class-level` — remove `shadow-sm` at `:185`.
- **Notes:** radius and padding here already match the token family — only the shadow is off.

### shard-029-F26 · nit · high · typography
- **Where:** `src/widgets/zone-form-dialog/zone-form-dialog.tsx:116` — `placeholder={t('zones.fields.namePlaceholder', 'e.g. Headquarters')}`
- **Rule:** vercel-rules "Forms" bullet "Placeholders end with `…` and show example pattern"
- **Current:** the placeholder shows an example but has no ellipsis.
- **Expected:** `e.g. Headquarters…`.
- **Change:** `class-level` — change the `defaultValue` at `:116` to `'e.g. Headquarters…'` and update the `zones.fields.namePlaceholder` value in `en.json`/`ar.json` (locale edits are allowed, `deferred-rulings.md` R-8).
- **Notes:** use the single `…` glyph, not three dots (vercel "Typography": "`…` not `...`").

### shard-029-F27 · should · medium · colour roles
- **Where:** `src/widgets/zone-map-picker/zone-map-picker.tsx:46` — `color: '#dc2626', // Red pin for active` (also `:63` `'#9ca3af'`, `:75` `'#dc2626'`)
- **Rule:** `src/app/index.css:7-19` palette rule quoted in design-system §0.2 — "Adding a third accent colour breaks the whole scheme, so don't"; §3 "Non-token colours in the reference: the two scrims and `theme-color #1b396a`"; §13 D-C2 (map markers `#16A34A`/`#DC2626` listed as a trips deviation the dashboard wins)
- **Current:** three hard-coded hexes for the active pin, its circle and the faint other-zone circles — none of them a token, and they do not change with dark mode.
- **Expected:** the destructive and muted-foreground tokens (`--destructive` 6 50% 47%, `--muted-foreground`), read as `hsl(var(--x))`.
- **Change:** `class-level` — replace the three literals with token reads (e.g. `color: 'hsl(var(--destructive))'`, `'hsl(var(--muted-foreground))'`) **only if** the map provider accepts a CSS colour string; `deferred-rulings.md` R-7 records that `google-provider.tsx` parses **hex only**, so if the provider still needs hex this becomes `structural` and `out-of-shard: src/shared/lib/maps/google-provider.tsx`.
- **Notes:** verify against the provider before editing — a token string handed to hex-only parsing renders an invisible marker, which is worse than the wrong hue.

### shard-029-F28 · nit · low · spacing
- **Where:** `src/widgets/zone-map-picker/zone-map-picker.tsx:84` — `<div className="h-[400px] w-full rounded-md border overflow-hidden">`
- **Rule:** provisional (§12.6) "**Map viewport**: `relative h-[380px] overflow-hidden rounded-lg border bg-muted/30`"
- **Current:** 400px tall, `rounded-md` (10px), no ground tint — so the map well reads as a control surface rather than a card.
- **Expected:** the trips map viewport recipe (`trip-location-dialog.tsx`), whose radius is also the `rounded-lg` token required by C-R1 for card-like surfaces.
- **Change:** `class-level` — `h-[400px] w-full rounded-md border overflow-hidden` → `relative h-[380px] w-full overflow-hidden rounded-lg border bg-muted/30`.
- **Notes:** provisional (§12.6); the height change is cosmetic — if the fixer prefers, keep `h-[400px]` and change only the radius, which is the part C-R1 actually rules on.

### shard-029-F29 · should · high · loading/empty/error states
- **Where:** `src/pages/zones/zones.tsx:47` — `if (window.confirm(t('common.confirmDelete', 'Are you sure you want to delete this?'))) {`
- **Rule:** provisional (§12.6) "**ConfirmDialog** (`confirm-dialog.tsx`): `max-w-[400px] text-center p-6 gap-6` … Used with `variant=\"destructive\"` and `loading` bound to `mutation.isPending`"
- **Current:** a native browser dialog — unstyled, untranslatable beyond its message, no destructive variant, no pending state, and it names no zone.
- **Expected:** the `ConfirmDialog` primitive, exactly as `users.tsx:136-144` in this same shard already does for user deletion.
- **Change:** `structural` — replace the `window.confirm` guard with a `deletingZone` state + a mounted `<ConfirmDialog open={!!deletingZone} … variant="destructive" loading={deleteMutation.isPending} />`; keep `handleDelete` as the handler that sets the state and keep `deleteMutation.mutateAsync` in the confirm callback. No prop, handler or export is removed.
- **Notes:** §12.6 also notes page-level dialogs are mounted once "so they survive tab switches". Two pages in one shard doing the same job two ways is the coherence defect here.

### shard-029-F30 · should · medium · buttons & controls
- **Where:** `src/pages/zones/zones.tsx:75-91` — `<Button variant="outline" onClick={handleScanNow} … className="gap-2">` / `<Button onClick={handleCreateNew} className="gap-2">`
- **Rule:** provisional (§12.1) "actions `flex flex-wrap items-center gap-2` of `Button outline size=sm` (labels `hidden sm:inline`, 16px icons) with the primary CTA as `Button default size=sm`"
- **Current:** both header actions are default size (h-9) with always-visible labels, so on a phone "Run scan now" + "New Zone" push the title row into two lines. `users.tsx:104-107` in this shard already hides its label at `<sm`.
- **Expected:** `size="sm"` on both, with the label wrapped in `<span className="hidden sm:inline">`.
- **Change:** `class-level` — add `size="sm"` to both Buttons; wrap the label text at `:86` and `:90` in `<span className="hidden sm:inline">…</span>`; drop the redundant `className="gap-2"` (the Button base already sets `gap-2`, §5.1).
- **Notes:** provisional (§12.1). `PageShell` supplies the `flex flex-wrap items-center gap-2` actions wrapper itself (`page-shell.tsx:36`), so the extra `<div className="flex items-center gap-2">` at `:74` is a second nested flex row — harmless, but the same is true in `users.tsx:94`.

### shard-029-F31 · should · high · motion
- **Where:** `src/pages/zones/zones.tsx:82` — `<Loader2 className="h-4 w-4 animate-spin" />`
- **Rule:** vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"; design-system §14 C-M2 ruling
- **Current:** the scan button's spinner loops under reduced motion; scans are long-running, so it is on screen for a while.
- **Expected:** `motion-reduce:animate-none`, as on every looping animation in the reference.
- **Change:** `class-level` — `className="h-4 w-4 animate-spin"` → `className="animate-spin motion-reduce:animate-none"` (dropping `h-4 w-4`, which `[&_svg]:size-4` already beats, §15.4). Do the same for the `Radar` icon's redundant sizing at `:84`.
- **Notes:** same fix shape as F20 and F22.

### shard-029-F32 · should · medium · loading/empty/error states
- **Where:** `src/pages/zones/zones.tsx:20` — `const { data: zones = [], isLoading } = useZones();`
- **Rule:** design-system §7 "Failures are **inline and persistent** — a strip or muted copy in place"; `deferred-rulings.md` R-1 (page-level content → `EmptyState`) and §13 D-ST2
- **Current:** `isError` is never read, so a failed `GET /zones` renders exactly like "there are no zones" — an empty table with no message and no retry.
- **Expected:** an error branch: either the `DegradedStrip`-style inline copy (§10 "Strip") or, since this table is the page's whole content, `EmptyState` + warning lottie + `Button outline` retry (§12.6 "Full-panel error", `trips.tsx:511-522`).
- **Change:** `structural` — destructure `isError` and `refetch` from `useZones()` and render the error branch in place of `<ZonesTable>`; keep the existing table branch untouched.
- **Notes:** additive only — no existing branch or handler is removed. `users.tsx` has the same gap but at least surfaces a refresh control; zones has neither.

### shard-029-F33 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/zones-table/columns.tsx:27` — `<Button variant="ghost" size="icon" className="h-8 w-8">`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"
- **Current:** the row-actions trigger (`MoreHorizontal`, `:28`) has no accessible name — this is the only way to edit, toggle or delete a zone.
- **Expected:** §12.4 row actions are "ghost icon `h-7 w-7` with `aria-label`+`title`"; C-I4 requires `t()`.
- **Change:** `class-level` — add `aria-label={t('common.actions')}` and `title={t('common.actions')}` to the trigger; add `aria-hidden="true"` to the `MoreHorizontal` at `:28`.
- **Notes:** `t` is already in scope in `ZoneActions`. Identical to F07 — use the same locale key in both.

### shard-029-F34 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/zones-table/columns.tsx:33` — `<Edit className="mr-2 h-3.5 w-3.5" />` (also `:37` `Power`, `:44` `Trash2`)
- **Rule:** design-system §14 C-I1 "**→ Ruling:** logical utilities everywhere"
- **Current:** three physical `mr-2` icon margins in the dropdown items; wrong side in Arabic.
- **Expected:** logical `me-2` (the reference menu items use `gap`/logical spacing throughout — `user-menu.tsx`, `dropdown-menu.tsx:77`).
- **Change:** `class-level` — `mr-2` → `me-2` at `:33`, `:37`, `:44`; add `aria-hidden="true"` to each icon while editing (F17's rule applies here too).
- **Notes:** the dropdown is portaled, so it inherits `dir` from the document — the mirroring genuinely matters.

### shard-029-F35 · should · high · type
- **Where:** `src/widgets/zones-table/columns.tsx:77` — `<div className="text-muted-foreground tabular-nums">{row.original.lat.toFixed(6)}</div>` (also `:82`, `:87`)
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`)"
- **Current:** six-decimal coordinates and a radius in the sans face, so a column of latitudes does not align digit-for-digit — the exact case the mono rule exists for ("so digits line up down a column", §0.1).
- **Expected:** `font-mono tabular-nums`; §12.4's table figure cells are mono too.
- **Change:** `class-level` — add `font-mono` at `:77`, `:82`, `:87`.
- **Notes:** same defect as F15 in `users-table`; fix both so the two zone/user tables agree.

### shard-029-F36 · should · medium · colour roles
- **Where:** `src/widgets/zones-table/columns.tsx:95` — `<Badge variant={active ? 'success' : 'secondary'} className={!active ? 'opacity-50' : ''}>`
- **Rule:** design-system §14 C-C5 "**→ Ruling:** `text-muted-foreground` for secondary *text*; opacity only for secondary parts of an already-coloured element"; §5.4 "Disabled everywhere = `opacity-50`"
- **Current:** the inactive badge is a whole element faded to 50% — the reference's *disabled* signal — even though it is a live, readable status.
- **Expected:** the neutral chip carries "inactive" on its own: `Badge variant="secondary"` with no opacity (`badge.tsx:11`, §3 "Neutral chip").
- **Change:** `class-level` — drop the `className={!active ? 'opacity-50' : ''}` prop value, i.e. render `<Badge variant={active ? 'success' : 'secondary'}>`.
- **Notes:** `success` on the active state is correct — §3 "Success … passing status only", and an active zone is a passing status.

### shard-029-F37 · nit · low · tables/lists
- **Where:** `src/widgets/zones-table/columns.tsx:103` — `header: '',`
- **Rule:** provisional (§12.4) "sr-only header for the expand column"; vercel-rules "Accessibility" bullet "Use semantic HTML (`<button>`, `<a>`, `<label>`, `<table>`) before ARIA"
- **Current:** the actions column has a literally empty `<th>`, so screen-reader table navigation announces a blank column header.
- **Expected:** an `sr-only` label, the way the trips table handles its unlabelled column.
- **Change:** `class-level` — `header: () => <span className="sr-only">{t('common.actions')}</span>,` at `:103` (`t` is already in scope in `useZoneColumns`).
- **Notes:** provisional (§12.4); pairs with the `common.actions` key introduced by F07/F33.

### shard-029-F38 · nit · low · performance
- **Where:** `src/widgets/zones-table/zones-table.tsx:32` — `pageSize={100}`
- **Rule:** vercel-rules "Performance" bullet "Large lists (>50 items): virtualize (`virtua`, `content-visibility: auto`)"
- **Current:** up to 100 rows render at once, each with a mounted `DropdownMenu` trigger.
- **Expected:** either a page size under the 50-row threshold or virtualization.
- **Change:** `class-level` — lower to `pageSize={50}` (the `DataTable` pager already exists, §12.4). Virtualization would be `structural` and `out-of-shard: src/shared/ui/data-table.tsx`.
- **Notes:** low confidence — the deployed zone count may be far under 100, in which case this never bites. Recorded because the cap, not the data, is what the rule reads.

## Summary
FINDINGS: 38 (blocker 13 / should 18 / nit 7)
