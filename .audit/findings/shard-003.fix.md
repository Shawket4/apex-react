# Fix log — shard-003
| Finding | Status | Detail |
|---|---|---|
| shard-003-F01 | applied | removed `shadow-sm` from the `Card` base string in card.tsx:8 |
| shard-003-F02 | applied | `p-6` → `p-3` in `CardHeader` (card.tsx:17), `CardContent` (:42), `CardFooter` (:49) |
| shard-003-F03 | applied | `gap-3 border-b px-4 py-3 md:px-5 md:py-4` → `gap-2 border-b bg-muted/60 px-3 py-2` in chart-card.tsx:61 (`items-start` kept) |
| shard-003-F04 | applied | `text-sm font-semibold tracking-tight md:text-base` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` in chart-card.tsx:63 |
| shard-003-F05 | applied | `'p-4 md:p-5'` → `'p-3'` in chart-card.tsx:75 |
| shard-003-F06 | applied | `shadow` → `shadow-sm` in checkbox.tsx:13 |
| shard-003-F07 | applied (partial) | collapsible-section.tsx:84-85 — icon + title now wrapped in a native `<button type="button" aria-expanded>` for the collapsible branch (`alwaysOpen` renders the previous fragment unchanged); every existing `role`/`tabIndex`/`onClick`/`onKeyDown` kept. The button deliberately carries **no** `onClick`: the click bubbles to the header row's handler, so mouse and keyboard each toggle exactly once (the finding's "keep the handlers, add an onClick" wording would have double-toggled). The `ChevronDown` was **not** moved inside the button — the existing `{!alwaysOpen && <ChevronDown/>}` block is a conditional branch that may not be deleted, so moving it would have rendered two chevrons. |
| shard-003-F08 | applied | appended `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` to the collapsible-only class string at collapsible-section.tsx:64, and to the new header button |
| shard-003-F09 | applied | `transition-transform` → `transition-transform duration-200` in collapsible-section.tsx:98 |
| shard-003-F10 | applied | `hover:bg-muted/40` → `hover:bg-muted/50` in collapsible-section.tsx:64 |
| shard-003-F11 | applied | `gap-3 border-b px-4 py-3 md:px-5 md:py-3.5` → `gap-2 border-b bg-muted/60 px-3 py-2` in collapsible-section.tsx:63 |
| shard-003-F12 | applied | `h-4 w-4` → `h-3 w-3` and `aria-hidden="true"` added on the `ChevronDown` in collapsible-section.tsx:96-101 |
| shard-003-F13 | applied | `text-xl font-bold tracking-tight text-center` → `text-center` on `DialogTitle` in confirm-dialog.tsx:74 |
| shard-003-F14 | applied | dropped `mr-2` from the `Loader2` in confirm-dialog.tsx:100 (Button's `gap-2` supplies the separation, C-S7); `aria-hidden="true"` added |
| shard-003-F15 | applied | `animate-spin` → `animate-spin motion-reduce:animate-none` in confirm-dialog.tsx:100 |
| shard-003-F16 | applied | `gap-6` → `gap-4` at confirm-dialog.tsx:59; footer `sm:justify-center gap-2 sm:gap-2` → `sm:justify-end gap-2` at :85 |
| shard-003-F17 | applied | `aria-hidden="true"` + `motion-reduce:hidden` on the lottie wrapper `<div>` at confirm-dialog.tsx:62; `loop`/`autoplay` untouched |
| shard-003-F18 | applied | data-table.tsx:180 `bg-muted/50 text-xs` → `bg-muted/60 text-[10px]`; :186 `h-11 px-4 … font-medium` → `h-10 px-3 … font-semibold`; :244 `px-4 py-3` → `px-3 py-2.5`; :160 footer td `px-4 py-3` → `px-3 py-2.5`; :211 skeleton td `p-4` → `px-3 py-2.5` |
| shard-003-F19 | applied | `hover:bg-muted/40` → `hover:bg-muted/50` in data-table.tsx:228 |
| shard-003-F20 | applied | `bg-muted/30` → `bg-muted/40` (:230); `bg-muted/10` → `bg-muted/40` (:250) |
| shard-003-F21 | applied | `border-t-2` → `border-t` in data-table.tsx:152 |
| shard-003-F22 | applied | sort button gains `rounded-sm` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (:192); `aria-hidden="true"` on `ArrowUpDown` (:196) |
| shard-003-F23 | applied | additive on the row `<tr>`: `role="button"`, `tabIndex={0}`, `aria-expanded`, an Enter/Space `onKeyDown` mirroring the click, and the inset focus ring — all gated on `onRowClick \|\| canExpand`; every existing handler kept |
| shard-003-F24 | applied | `aria-label={t('common.previous')}` / `t('common.next')` on the two pager buttons; `aria-hidden="true"` on both chevrons. Existing keys reused — no locale edit needed |
| shard-003-F25 | applied | `className="h-8 w-8"` added to both pager `Button`s (data-table.tsx:293, :301) |
| shard-003-F26 | applied | `h-4 w-full` → `h-3.5 w-full rounded-sm` in data-table.tsx:212 |
| shard-003-F27 | applied | `py-12` → `py-6`; lottie `100` → `110` (both axes) in data-table.tsx:266-272 |
| shard-003-F28 | applied | `text-[10px]` → `text-xs` in date-picker.tsx:139 |
| shard-003-F29 | applied | appended `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the day-button base string in date-picker.tsx:163 |
| shard-003-F30 | applied | `rounded-sm` + focus-visible ring added to the "Today" button in date-picker.tsx:184 |
| shard-003-F31 | applied | `className="h-7 text-xs"` added to the Cancel `Button` in date-picker.tsx:188 |
| shard-003-F32 | applied | `aria-pressed` added at date-range-picker.tsx:146 (`isPresetActive(p)`), :157 (`isAllTime`), :169 (`isCustom`) |
| shard-003-F33 | applied | three sites → `h-7 shrink-0 text-xs`; custom trigger keeps `gap-1`, `sm:gap-1.5` dropped |
| shard-003-F34 | applied | `text-[10px]` → `text-xs` in date-range-picker.tsx:214 |
| shard-003-F35 | applied | appended `transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` in date-range-picker.tsx:252 |
| shard-003-F36 | applied | `className="h-7 text-xs"` added to Cancel and Apply (date-range-picker.tsx:276-281) |
| shard-003-F37 | applied | `mb-4` → `mb-3` (:179); `mt-4` → `mt-3` (:267) |
| shard-003-F38 | applied | `-translate-x-1/2` → `-translate-x-1/2 rtl:translate-x-1/2` in draggable.tsx:191 |
| shard-003-F39 | skipped | low confidence (`nit · low`) |
| shard-003-F40 | applied | `left-0 right-0` → `inset-x-0` in form.tsx:151 |
| shard-003-F41 | applied | `aria-live="polite"` added to the `<p>` in form.tsx:147 (class-level/additive option; the structural always-render variant not taken — it would change the empty-state render behaviour) |
| shard-003-F42 | applied | `peer-disabled:opacity-70` → `peer-disabled:opacity-50` in label.tsx:7 |
Gates: tsc ok, lint-diff ok (baseline 770, now 770, NEW 0)
APPLIED: 41 SKIPPED: 1
