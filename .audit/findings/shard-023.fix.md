# Fix log — shard-023
| Finding | Status | Detail |
|---|---|---|
| shard-023-F01 | applied | added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the thumbnail button in trip-receipt-batch-dialog.tsx:110 |
| shard-023-F02 | applied | appended `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to the lightbox close button, trip-receipt-batch-dialog.tsx:137 |
| shard-023-F03 | applied | `transition-all hover:ring-2 hover:ring-primary` → `transition-colors hover:border-primary`; dropped `transition-transform group-hover:scale-105` from the img (trip-receipt-batch-dialog.tsx:110/116) |
| shard-023-F04 | applied | `-translate-x-1/2` → `-translate-x-1/2 rtl:translate-x-1/2` in trip-receipt-batch-dialog.tsx:183 |
| shard-023-F05 | applied | thumbnail counter → `rounded-full bg-muted px-2 py-0.5 font-mono text-[10.5px] font-medium tabular-nums text-foreground` (trip-receipt-batch-dialog.tsx:118) |
| shard-023-F06 | skipped | needs-ruling — Notes say the owner may rule `bg-black/90` a distinct lightbox role (D-C14 listed for ruling). The `text-white` → `text-primary-foreground` part was applied with F02/F07 since it is not ruling-dependent. |
| shard-023-F07 | applied | dropped `h-12 w-12` from both nav Buttons (kept `rounded-full`), dropped `h-6 w-6` from both chevrons (kept `rtl:rotate-180`), close `X` `h-5 w-5` → `h-4 w-4` (trip-receipt-batch-dialog.tsx:140/154/167) |
| shard-023-F08 | applied | added `width={400} height={400}` to the thumbnail img and `width={1200} height={1200}` to the lightbox img (trip-receipt-batch-dialog.tsx:112/178) |
| shard-023-F09 | applied | added `role="dialog" aria-modal="true" aria-label={t('trips.receiptBatch.dialogTitle')}` to the backdrop div (trip-receipt-batch-dialog.tsx:130); `onClick` kept. The "move focus to the close button on open" half was not done — it is a new effect/behaviour change, out of the class-level+additive scope for this run. |
| shard-023-F10 | applied | wrapper `py-4` → `py-0`, EmptyState `py-4` → `py-6`, lottie 140 → 120 (trip-receipt-batch-dialog.tsx:94-101) |
| shard-023-F11 | applied | tile `rounded-md … bg-muted/30` → `rounded-lg … bg-muted/40`; skeleton `+rounded-lg` (trip-receipt-batch-dialog.tsx:90/110) |
| shard-023-F12 | applied | `pr-1` → `pe-1` in trip-receipt-dialog.tsx:153 |
| shard-023-F13 | applied | `format(trip.date, 'PPP')` → `'d MMM yyyy'` in trip-receipt-dialog.tsx:164 |
| shard-023-F14 | applied | added `aria-pressed={step.stamped}` to the stamp toggle Button; label/title unchanged (trip-receipt-dialog.tsx:383-400) |
| shard-023-F15 | applied | both eyebrow `h4`s `text-xs` → `text-[10px]` (trip-receipt-dialog.tsx:182/227); `h4` tag left as-is (optional structural) |
| shard-023-F16 | applied | context well and its skeleton box `rounded-md border bg-muted/30` → `rounded-lg border bg-muted/40` (trip-receipt-dialog.tsx:156/162) |
| shard-023-F17 | applied | `rounded-md` → `rounded-lg` on the step `li` and the add-step `section` (trip-receipt-dialog.tsx:349/226) |
| shard-023-F18 | applied | `bg-success/15` → `bg-success/10`, `bg-primary/15` → `bg-primary/10` on the icon disc (trip-receipt-dialog.tsx:354-355) |
| shard-023-F19 | applied | stamped chip → `inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success`; `Stamp` `h-2.5 w-2.5` → `h-3 w-3` (trip-receipt-dialog.tsx:366) |
| shard-023-F20 | applied | added optional `mono`/`empty` props to `Field` (no prop removed) appending `font-mono tabular-nums` / `opacity-40`; passed `mono` for receipt no, date, vehicle; empty receipt no now renders a dimmed `—`; added `dir="auto"` to the value span (trip-receipt-dialog.tsx:163-165, 424-441) |
| shard-023-F21 | applied | context skeletons → `h-3.5 w-3/4 rounded-sm`, `h-3.5 w-2/3 rounded-sm`, `h-3.5 w-4/5 rounded-sm`; both row skeletons `+rounded-lg` (trip-receipt-dialog.tsx:157-159/187-188) |
| shard-023-F22 | applied | fallback form only — EmptyState kept (D-ST1 ruling pending on whether dialogs keep EmptyState), normalised to `border-0 bg-transparent py-6` and lottie 100 → 110 (trip-receipt-dialog.tsx:191-197) |
| shard-023-F23 | applied | both `Loader2` → `animate-spin motion-reduce:animate-none` (no size classes); dropped `h-3.5 w-3.5` from `CheckCircle2`, `Stamp`, `Trash2` inside Buttons (trip-receipt-dialog.tsx:309/402/404/406/417) |
| shard-023-F24 | applied | footer Close `variant="outline"` → `variant="ghost"` (trip-receipt-dialog.tsx:319) |
| shard-023-F25 | applied | added `name="received_by" autoComplete="off"` to the Input and `name="notes"` to the Textarea (trip-receipt-dialog.tsx:266-285) |
| shard-023-F26 | applied | added `overscroll-contain` to the scroll body (trip-receipt-dialog.tsx:153) |
| shard-023-F27 | skipped | needs-ruling — finding itself states "Owner ruling pending on D-ST3"; the inline-strip vs toast channel is a decision, and adding error state + a strip is behaviour, not presentation |
| shard-023-F28 | applied | note chip `text-xs` → `text-[11px]` (trip-receipt-dialog.tsx:377) |
| shard-023-F29 | applied | added `font-semibold` to the `Field` eyebrow (trip-receipt-dialog.tsx:435) |
| shard-023-F30 | applied | added `aria-hidden="true"` to the decorative `Plus`, `Archive`, `Building2` (select item), `Stamp` (checkbox label), row `Icon` and chip `Stamp` (trip-receipt-dialog.tsx:228/250/252/297/358/367) |
Gates: tsc ok, lint-diff ok (776 baseline / 776 now, 0 new)
APPLIED: 28 SKIPPED: 2
