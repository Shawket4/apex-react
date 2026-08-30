# Fix log — shard-010
| Finding | Status | Detail |
|---|---|---|
| shard-010-F01 | applied | `rounded-xl` → `rounded-lg` on the source-message well, fleet-expense-form.tsx:300 |
| shard-010-F02 | applied | `p-3.5` → `p-3` on the source-message well, fleet-expense-form.tsx:300 |
| shard-010-F03 | applied | eyebrow `text-[11px] … tracking-wide` → `text-[10px] … tracking-wider`; timestamp span gets `font-medium normal-case tracking-normal`, fleet-expense-form.tsx:301-311 |
| shard-010-F04 | applied | `bg-amber-500/10 text-amber-700 dark:text-amber-400` → `border border-warning/40 bg-warning/10 text-warning`, fleet-expense-form.tsx:343 |
| shard-010-F05 | applied | `border-emerald-500/30 bg-emerald-500/5` → `border-success/40 bg-success/10`; icon `text-emerald-500` → `text-success`, fleet-expense-form.tsx:520-521 |
| shard-010-F06 | applied | `border-primary/30 bg-primary/5` → `border-primary/40 bg-primary/10`, fleet-expense-form.tsx:367 |
| shard-010-F07 | applied | `aria-pressed={form.watch('direction') === d}` added to both direction buttons, fleet-expense-form.tsx:438 |
| shard-010-F08 | applied | selected `bg-foreground text-background` → `bg-primary text-primary-foreground`; `font-semibold` → `font-medium`, fleet-expense-form.tsx:441-443 |
| shard-010-F09 | applied | structural, in-file: `Field` gains optional `id`/`labelId` props (`<Label htmlFor={id} id={labelId}>`); every Input/NativeSelect/Textarea got a matching `id` (fe-amount, fe-currency, fe-date, fe-time, fe-category, fe-counterparty, fe-reference, fe-account, fe-payment-method, fe-company, fe-car, fe-paid-by, fe-description); direction group is `role="group" aria-labelledby="fe-direction-label"`. `SmartPartyField` (out-of-shard, no `id` prop) left unassociated. No prop/handler/branch removed |
| shard-010-F10 | applied | `autoComplete="off"` on amount, currency, counterparty, reference, account, paid_by Inputs and description Textarea |
| shard-010-F11 | applied | `autoFocus={mode === 'create'}` → `autoFocus={mode === 'create' && isDesktop}` via `useIsDesktop` (import only from the reference hook), fleet-expense-form.tsx:31,75,410 |
| shard-010-F12 | skipped | nit that is not a pure class-level edit (needs a new locale key in en/ar) |
| shard-010-F13 | applied | minimal option: `font-mono tabular-nums` added to the parent-amount `<p>`, fleet-expense-form.tsx:372 |
| shard-010-F14 | skipped | structural: adds local state and swaps the caption — changes behaviour; toast calls must stay; owner's call (needs-ruling) |
| shard-010-F15 | applied | `<Save className="h-4 w-4" />` → `saving ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Save />`, fleet-expense-form.tsx:673-677 |
| shard-010-F16 | applied | dropped `h-4 w-4` from ArrowLeft (kept `rtl:rotate-180`), Save, Trash2, Split inside Buttons |
| shard-010-F17 | applied | `gap-6` → `gap-3`; both `space-y-4` → `space-y-3`, fleet-expense-form.tsx:295,298,362 |
| shard-010-F18 | skipped | low confidence |
| shard-010-F19 | applied | `aria-pressed={status === s}` on the status chips, fleet-expenses-messages.tsx:110 |
| shard-010-F20 | applied | `border-foreground bg-foreground text-background` → `border-primary bg-primary text-primary-foreground`; `font-semibold` → `font-medium` on status chips, media chip (messages.tsx:112-114, 126-128) and `FilterChip` (fleet-expenses.tsx:786-788) |
| shard-010-F21 | applied | `type="search"` + `aria-label` on the search Input in fleet-expenses-messages.tsx:140-145 and fleet-expenses.tsx:596-601 |
| shard-010-F22 | applied | RefreshCw: dropped `h-4 w-4`, spin now `animate-spin motion-reduce:animate-none` (messages.tsx:98, fleet-expenses.tsx:286); Download `animate-pulse motion-reduce:animate-none` (fleet-expenses.tsx:297) |
| shard-010-F23 | applied | `aria-label` on Back/Refresh (messages.tsx:83,94) and Refresh/Export/Add (fleet-expenses.tsx:284,295,304) |
| shard-010-F24 | applied | pill geometry `rounded-full px-2 py-0.5 text-xs font-medium` → `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium`, messages.tsx:226; `STATUS_TONE` colours are out-of-shard (`entities/raw-message/schemas.ts`) — not touched |
| shard-010-F25 | applied | `h-28 w-full` → `h-28 w-full rounded-lg`, messages.tsx:155 |
| shard-010-F26 | applied | `p-3 sm:p-4` → `p-3`, messages.tsx:222 |
| shard-010-F27 | applied | `italic text-muted-foreground` → `text-xs text-muted-foreground`, messages.tsx:244 |
| shard-010-F28 | applied | `variant="secondary"` → `variant="outline"`, messages.tsx:272 |
| shard-010-F29 | applied | `rounded-xl` → `rounded-lg` on the uncategorized tile button, cash-in strip and both chart skeletons, fleet-expenses.tsx:359,386,411-412 |
| shard-010-F30 | applied | Fuel `text-amber-500` → `text-muted-foreground`, HandCoins `text-sky-500` → `text-muted-foreground`, both `aria-hidden="true"`, fleet-expenses.tsx:664,671 |
| shard-010-F31 | applied | `tabular-nums font-medium` → `font-mono tabular-nums text-money` on donut legend, by-category list, advances-by-person; cash-in total `ms-2 tabular-nums text-muted-foreground` → `ms-2 font-mono tabular-nums text-money`, fleet-expenses.tsx:391,512,548,576. StatCard values are out-of-shard |
| shard-010-F32 | applied | `text-sm` → `text-xs` on the nothing-categorized empty copy, fleet-expenses.tsx:479 |
| shard-010-F33 | applied | `text-[11px]` → `text-[10.5px] font-medium` on the kind chip, fleet-expenses.tsx:569 |
| shard-010-F34 | applied | `bg-muted/30` → `bg-muted/40` on the source-toggle tray, fleet-expenses.tsx:662 |
| shard-010-F35 | applied | stat skeletons `h-5 w-24/w-16` → `+ rounded-sm` (fleet-expenses.tsx:203-204); ledger skeletons `h-14 w-full` → `+ rounded-none` (LedgerList rows are a flush divided list, no row radius), fleet-expenses.tsx:684 |
| shard-010-F36 | applied | `'ring-2 ring-warning'` → `'[&>*]:border-primary [&>*]:bg-primary/10'` (targets the child StatCard), fleet-expenses.tsx:360; warning tone kept |
| shard-010-F37 | applied | `gap-3 sm:gap-4` → `gap-3` on the stat grid; `gap-4` → `gap-3` on chart skeleton grid, chart grid and breakdown grid, fleet-expenses.tsx:318,410,416,529 |
| shard-010-F38 | skipped | nit that is structural (replaces a text glyph with an icon), not a pure class-level edit |
| shard-010-F39 | applied | dropped `h-4 w-4` from the Plus icons in both Buttons (fleet-expenses.tsx:307,704) and the messages ArrowLeft (covered with F16 pattern) |
| shard-010-F40 | applied | `aria-hidden="true"` on ArrowDownLeft, ChevronRight, legend `<i>`, both Search icons |
Gates: tsc ok, lint-diff ok (770 baseline / 770 now / 0 new)
APPLIED: 35 SKIPPED: 5
