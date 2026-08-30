# Fix log — shard-011
| Finding | Status | Detail |
|---|---|---|
| shard-011-F01 | applied | `text-emerald-600 dark:text-emerald-400` → `font-mono … text-money` in cash-in-review.tsx:171 |
| shard-011-F02 | applied | Amount base → `font-mono font-semibold tabular-nums text-money`; `isIn` branch value → `text-money` (conditional kept) in ledger-list.tsx |
| shard-011-F03 | applied | Fuel/HandCoins/PenLine `text-amber-*`/`text-sky-*` → `text-muted-foreground` in ledger-list.tsx RowFlags |
| shard-011-F04 | applied | remainder line `text-emerald-*` → `text-success`, `text-amber-*` → `text-warning` in split-editor.tsx |
| shard-011-F05 | applied | party-required hint → `text-[11px] font-medium text-destructive` in split-editor.tsx |
| shard-011-F06 | applied | CheckCircle2 `text-emerald-500` → `text-success` + `aria-hidden` in party-picker.tsx |
| shard-011-F07 | applied | `<tr>` gains `tabIndex`/`role="link"`/`onKeyDown` (Enter/Space) + focus ring; TxnCard div gains focus ring in ledger-list.tsx |
| shard-011-F08 | skipped | structural Link wrap would nest buttons inside an anchor (invalid HTML) and change navigation semantics; finding itself allows deferring with F07 applied |
| shard-011-F09 | applied | Lock/PenLine wrapped in focusable labelled `<span tabIndex={0}>` with glyph `aria-hidden`; Fuel/HandCoins get `role="img"` + `aria-label` via new keys `fleetExpenses.sourceFuel`/`sourceLoan` (en+ar) in ledger-list.tsx |
| shard-011-F10 | applied | `htmlFor`/`id` on amount Input and category NativeSelect; party Label `id` + new optional `labelledBy` prop threaded SmartPartyField → PartyPicker → `aria-labelledby` on the combobox Button |
| shard-011-F11 | applied | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on all 8 raw buttons (ledger-list ×4, split-editor ×2, party-picker ×1 `ring-inset`, fuel-event-form ×1) |
| shard-011-F12 | applied | `left-0 right-0` → `inset-x-0` in fuel-event-form.tsx |
| shard-011-F13 | skipped | moving `onClick` off the `<span>` would delete a handler; leaving it as-is (medium confidence, span not user-interactive) |
| shard-011-F14 | applied | skeletons `rounded-lg`, wrapper `space-y-4` → `space-y-6` in fuel-event-form.tsx |
| shard-011-F15 | applied | distance/fuel-rate figures → `font-mono text-[22px] font-semibold leading-none tabular-nums`; labels → eyebrow `mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` |
| shard-011-F16 | applied | total-price well → `h-9 … bg-muted/40 px-3 font-mono text-sm font-semibold tabular-nums text-money` |
| shard-011-F17 | applied | day total → `font-mono tabular-nums text-money`; SplitChip label `font-mono tabular-nums`; tooltip principal/fee `font-mono tabular-nums` |
| shard-011-F18 | applied | CategoryChip `text-xs` → `text-[10.5px]` |
| shard-011-F19 | applied | add-category pill `text-[11px] font-medium border-primary/60`; split pill `text-[11px] font-medium`; SplitChip `text-[11px]` |
| shard-011-F20 | applied | section `rounded-lg border-warning/40 bg-warning/10 p-3` in cash-in-review.tsx |
| shard-011-F21 | applied | fallback variant kept (box retained): `py-6`, `bg-muted/40`, `px-3`, title `text-xs text-muted-foreground`; split-editor loadFailed → `px-3 py-6 text-center text-xs text-muted-foreground` |
| shard-011-F22 | applied | ` km` → `t('fuelEvents.fields.km')`; `&amp;` title → `t('fuelEvents.fields.carAndDriver')`; keys added to en.json + ar.json. ` / ` odometer title left (no key proposed) |
| shard-011-F23 | applied | removed `h-4 w-4` + `aria-hidden` on icons inside Buttons (cash-in-review ×3, party-picker ChevronsUpDown, split-editor Plus, fuel-event-form RotateCcw/Loader2/Save) |
| shard-011-F24 | applied | `aria-hidden="true"` on all listed decorative SVGs |
| shard-011-F25 | applied | removed `z-[10060]` from PopoverContent (primitive already at OVERLAY_Z) |
| shard-011-F26 | skipped | IntersectionObserver auto-fetch is a behaviour change (adds an effect that fires network fetches); `common.loading` already ends with "..." |
| shard-011-F27 | applied | TxnCard `active:bg-muted/40` → `transition-colors hover:bg-muted/50`; TxnRow `hover:bg-muted/40` → `transition-colors hover:bg-muted/50` |
| shard-011-F28 | applied | part eyebrow `text-xs … tracking-wide` → `text-[10px] … tracking-wider` |
| shard-011-F29 | applied | day header → `py-2 text-[10px] font-semibold uppercase tracking-wider` (bg-background kept, sticky); total aside `font-medium normal-case tracking-normal` |
| shard-011-F30 | applied | category tile → `bg-card … transition-colors hover:border-primary` |
| shard-011-F31 | applied | `name`/`autoComplete="off"`/`0.00…` on split amount input; `autoComplete="off"` + `0.00…`/`0…` placeholders on the four fuel-event-form number inputs |
| shard-011-F32 | skipped | `beforeunload` guard is a behaviour change (new effect); dirty-gate untouched |
| shard-011-F33 | applied | Loader2 `animate-spin motion-reduce:animate-none` |
| shard-011-F34 | applied | suggestion card `bg-muted/30` → `bg-muted/40` |
| shard-011-F35 | applied | reference `text-[11px]` removed (inherits `text-xs`) |
| shard-011-F36 | applied | `overscroll-contain` on the three scrolling sheet bodies |
| shard-011-F37 | skipped | NativeSelect's `className` lands on the wrapper div, not the `<select>` (which already sets `bg-background`); fix lives in the primitive — out-of-shard: src/shared/ui/native-select.tsx |
Gates: tsc ok, lint-diff ok (770 baseline / 770 now, 0 new)
APPLIED: 32 SKIPPED: 5
