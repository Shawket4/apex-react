# Fix log — shard-008
| Finding | Status | Detail |
|---|---|---|
| shard-008-F01 | applied | `mr-1` → `me-1` on DollarSign/Calendar/CreditCard label icons in driver-loan-new.tsx |
| shard-008-F02 | applied | added `aria-pressed={field.value === k}` to the kind toggle Buttons in driver-loan-new.tsx |
| shard-008-F03 | applied | `animate-spin` → `animate-spin motion-reduce:animate-none` on Loader2 in driver-loan-new.tsx |
| shard-008-F04 | applied | ArrowLeft → `rtl:rotate-180` in driver-loan-new.tsx |
| shard-008-F05 | applied | `space-y-6` → `space-y-3`; `gap-x-6 gap-y-4` → `gap-x-4 gap-y-3` in driver-loan-new.tsx |
| shard-008-F06 | applied | dropped `h-4 w-4` on ArrowLeft/Loader2/Save inside Buttons in driver-loan-new.tsx |
| shard-008-F07 | skipped | low confidence; structural (provisional rule only) |
| shard-008-F08 | applied | `autoComplete="off" inputMode="decimal"` on amount Input; `autoComplete="off"` on method Input |
| shard-008-F09 | applied | `aria-hidden="true"` on all listed icons in driver-loan-new.tsx |
| shard-008-F10 | applied | paid row → `border-success/40 bg-success/10`; disc → `bg-success/10 text-success`; badge → `<Badge variant="success">` in driver-loans.tsx |
| shard-008-F11 | applied | amount span → `font-mono text-sm font-semibold tabular-nums text-money` in driver-loans.tsx |
| shard-008-F12 | applied | `aria-label`/`title`=`t('common.delete')` on the Trash2 icon Button in driver-loans.tsx |
| shard-008-F13 | applied | removed `className="text-xs"` from the viewOnly and year-count Badges in driver-loans.tsx |
| shard-008-F14 | applied | year head → `border-b bg-muted/60 px-3 py-2`, title → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`, Calendar `h-3 w-3` |
| shard-008-F15 | applied | month label → `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground`; unpaid disc → `bg-muted text-muted-foreground` |
| shard-008-F16 | applied | removed `transition-colors` and `hover:border-border/80 hover:bg-muted/30` from loan row in driver-loans.tsx |
| shard-008-F17 | skipped | low confidence |
| shard-008-F18 | applied | ArrowLeft → `rtl:rotate-180` in driver-loans.tsx |
| shard-008-F19 | applied | `aria-hidden="true"` on all listed icons (incl. Trash2, now labelled via F12) in driver-loans.tsx |
| shard-008-F20 | applied | dropped `h-4 w-4` on ArrowLeft/FileSpreadsheet/Plus×2/Trash2 inside Buttons in driver-loans.tsx |
| shard-008-F21 | applied | DialogContent + `overscroll-contain` in drivers.tsx |
| shard-008-F22 | applied | `space-y-6` → `space-y-3` in drivers-table.tsx |
| shard-008-F23 | applied | `sm:grid-cols-4` → `lg:grid-cols-3` in drivers-table.tsx |
| shard-008-F24 | applied | `aria-hidden="true"` on Users/Phone/Truck/ShieldCheck/ShieldAlert/Plus×2; dropped `h-4 w-4` on the two in-Button Plus icons |
| shard-008-F25 | applied | `lottieWidth/Height` 100 → 120 in drivers-table.tsx (pure value edit) |
| shard-008-F26 | skipped | low confidence; structural |
| shard-008-F27 | applied | Home icon `h-4 w-4 mr-2` → no className + `aria-hidden="true"` in not-found.tsx |
| shard-008-F28 | applied | removed `size="lg"` and `className="mt-4"`; lottie 180 → 120 in not-found.tsx |
| shard-008-F29 | applied | Card `shadow-2xl border-2 border-primary/10` → `shadow-none` in route-error.tsx |
| shard-008-F30 | applied | CardTitle → `text-lg font-semibold leading-tight sm:text-xl`; refresh Button `font-bold` dropped |
| shard-008-F31 | applied | refresh Button className → `w-full`, `size="lg"` removed; Go-back `size="lg"` removed |
| shard-008-F32 | applied | `bg-muted/30` → `bg-background`, `min-h-screen` → `min-h-dvh`; footer `bg-muted/20` → `bg-muted/40`; chunk hint → `mt-3 rounded-lg border border-dashed border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground` |
| shard-008-F33 | applied | ChevronLeft `h-5 w-5` → `rtl:rotate-180` in route-error.tsx |
| shard-008-F34 | applied | `aria-hidden="true"` on AlertTriangle/RefreshCw×2/ChevronLeft/Home; dead in-Button size classes dropped |
| shard-008-F35 | applied | message `text-xs text-muted-foreground`; `pt-8` → `pt-6`, `px-8 pb-8` → `px-6 pb-6` in route-error.tsx |
| shard-008-F36 | applied | error Card → DegradedStrip recipe (dashed warning strip, `text-[12.5px]`, outline sm retry with RefreshCw) in fee-mappings.tsx; AlertCircle kept |
| shard-008-F37 | applied | skeleton grid `gap-2` → `gap-3`, `h-16` → `h-[92px]`; breakpoints already match FeeMappingsStats (`sm:grid-cols-3 md:grid-cols-5`) |
| shard-008-F38 | applied | Loader2 → `animate-spin motion-reduce:animate-none`; dead size classes dropped on RefreshCw/Download |
| shard-008-F39 | applied | removed `className="gap-1.5"` on both header Buttons and the icons' `h-3.5 w-3.5` |
| shard-008-F40 | applied | three literals → `t('feeMappings.export.filterCompany|filterAccuracy|filterSearch', { value })`; keys added to en.json and ar.json |
| shard-008-F41 | skipped | structural change adding a ref/effect-adjacent behaviour (scroll) — behaviour change, not presentation |
| shard-008-F42 | skipped | needs-ruling (D-ST3) |
| shard-008-F43 | applied | `aria-hidden="true"` on RefreshCw/Download/Banknote/AlertCircle in fee-mappings.tsx |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 38 SKIPPED: 5
