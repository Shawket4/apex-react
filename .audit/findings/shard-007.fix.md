# Fix log — shard-007
| Finding | Status | Detail |
|---|---|---|
| shard-007-F01 | applied | `Card role=button` → `<Link to={link.to} …>` wrapping the Card (all handlers/intentProps kept) in financial-tab.tsx:65 |
| shard-007-F02 | applied | `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2` → `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` in financial-tab.tsx:80 |
| shard-007-F03 | applied | `hover:border-primary/40 hover:bg-muted/40` → `hover:bg-muted/50` in financial-tab.tsx:79 |
| shard-007-F04 | applied | `p-4` → `px-3 py-2.5` in financial-tab.tsx:84 |
| shard-007-F05 | applied | `aria-hidden="true"` on Icon + ChevronRight in financial-tab.tsx:85,90 |
| shard-007-F06 | applied | `aria-hidden="true"` on all 13 icons in overview-tab.tsx |
| shard-007-F07 | applied | `gap-2.5 md:grid-cols-4` → `gap-3 lg:grid-cols-4` in overview-tab.tsx:150 |
| shard-007-F08 | applied | `rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs` → `rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` in overview-tab.tsx:165 |
| shard-007-F09 | applied | `space-y-4` → `space-y-3` in overview-tab.tsx:148 and documents-tab.tsx:178 |
| shard-007-F10 | applied | `p-4 md:p-5` → `p-3`; `mb-4 text-sm font-semibold` → `mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` in overview-tab.tsx:179-180, 235-236 |
| shard-007-F11 | applied | `rounded-md border p-3` → `rounded-lg border px-3 py-2.5`; `/30 … /5` → `/40 … /10` in overview-tab.tsx:245-247 |
| shard-007-F12 | skipped | out-of-shard: `src/shared/ui/stat-card.tsx` tone union has no destructive member |
| shard-007-F13 | applied | `'—'` → `<span className="opacity-40">—</span>` in overview-tab.tsx:94,190,255 and documents-tab.tsx:271 |
| shard-007-F14 | skipped | low confidence |
| shard-007-F15 | applied | `aria-label="Zoom out/Zoom in/Rotate"` → `t('drivers.docs.zoomOut|zoomIn|rotate', { defaultValue })` in documents-tab.tsx:340,348,356; keys added to en.json + ar.json |
| shard-007-F16 | applied | `border-destructive/30` → `/40`; `border-warning/30` → `/40` in documents-tab.tsx:222-223 |
| shard-007-F17 | applied | `rounded-md border border-primary/20 bg-primary/5 p-2.5` → `rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2.5` in documents-tab.tsx:321 |
| shard-007-F18 | applied | `bg-muted/30 p-4` → `bg-muted/40 p-3` in documents-tab.tsx:362 |
| shard-007-F19 | applied | input `hidden` → `peer sr-only`, moved above label; label `hover:bg-muted/50` → `hover:bg-accent hover:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1` in documents-tab.tsx:423-438 |
| shard-007-F20 | applied | added `min-h-[40vh]` to the preview wrapper in documents-tab.tsx:362 |
| shard-007-F21 | applied | dropped `h-4 w-4`/`h-3.5 w-3.5` on icons inside `<Button>` in documents-tab, pin-tab, driver-expense-new, driver-expenses, driver-form (all listed sites) |
| shard-007-F22 | applied | `aria-hidden="true"` on icons at documents-tab.tsx:229,234,240,246,322,427,448 |
| shard-007-F23 | applied | removed `gap-1` from the 8 listed Badges in documents-tab.tsx and overview-tab.tsx |
| shard-007-F24 | applied | `{cat}`/`{m}`/`{expense.category}`/`{expense.payment_method}` → `t('driverExpenses.categories|paymentMethods.<value>', { defaultValue })`; key tables added to en.json + ar.json; schema constants unchanged |
| shard-007-F25 | skipped | out-of-shard: `src/shared/ui/form.tsx` FormMessage renders `error.message` verbatim (error wins over children), so a key in the schema would display raw; loan schema also consumed by shard-008 — record for shared/ui + shard-008 |
| shard-007-F26 | applied | `mr-1` → `me-1` at driver-expense-new.tsx:111,136,158,187,217 and driver-expenses.tsx:229 |
| shard-007-F27 | applied | `ArrowLeft className="h-4 w-4"` → `className="rtl:rotate-180"` in driver-expense-new.tsx:96 and driver-expenses.tsx:99 |
| shard-007-F28 | skipped | low confidence |
| shard-007-F29 | applied | `space-y-6` → `space-y-3` in driver-expense-new.tsx:102 and driver-form.tsx:67; `space-y-4` → `space-y-3` in driver-expenses.tsx:172 |
| shard-007-F30 | applied | `inputMode="decimal" autoComplete="off"` on amount Input; `autoComplete="off"` on Textarea in driver-expense-new.tsx |
| shard-007-F31 | skipped | would change behaviour (navigation blocker), not presentation |
| shard-007-F32 | applied | ` *` → `{' '}<span className="text-destructive" aria-hidden="true">*</span>` in driver-expense-new.tsx:112,137 |
| shard-007-F33 | applied | `aria-hidden="true"` on Receipt + 5 FormLabel icons in driver-expense-new.tsx |
| shard-007-F34 | applied | `text-sm font-semibold` → `font-mono text-sm font-semibold tabular-nums text-money` in driver-expenses.tsx:224 |
| shard-007-F35 | skipped | out-of-shard: `src/shared/ui/stat-card.tsx` has no money tone hook |
| shard-007-F36 | applied | green-* → `border-success/40 bg-success/10`, `bg-success/10 text-success`, `<Badge variant="success">` in driver-expenses.tsx:203,212,234 |
| shard-007-F37 | applied | month label → `mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` in driver-expenses.tsx:190 |
| shard-007-F38 | applied | removed `text-[10px]`/`text-xs` from the four Badges in driver-expenses.tsx:103,181,228,234 |
| shard-007-F39 | applied | year header → `border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; inner `text-sm font-semibold` removed in driver-expenses.tsx:176-177 |
| shard-007-F40 | applied | `p-3 transition-colors` → `px-3 py-2.5`; else-branch hover classes → `''` in driver-expenses.tsx:201-204 |
| shard-007-F41 | applied | `aria-label={t('common.delete')}` on the delete Button in driver-expenses.tsx:261 |
| shard-007-F42 | applied | `aria-hidden="true"` on the 8 listed icons in driver-expenses.tsx |
| shard-007-F43 | applied | added `isLoading && <5 × Skeleton h-[92px] rounded-lg>` KPI grid above the list skeleton in driver-expenses.tsx:147 (existing branches kept) |
| shard-007-F44 | applied | `d.toLocaleString('default', { month: 'long' })` → `format(d, 'MMMM')` (date-fns import) in driver-expenses.tsx:43 |
| shard-007-F45 | applied | concatenation → `t('driverExpenses.countLabel', { count, defaultValue })` in driver-expenses.tsx:182; `countLabel`/`countLabel_other` added to en.json + ar.json |
| shard-007-F46 | skipped | low confidence (D-T14 not ruled) |
| shard-007-F47 | applied | `rounded-md border bg-muted/30 p-4` and `… p-2.5` → `rounded-lg border bg-muted/40 p-3` in pin-tab.tsx:74,145 |
| shard-007-F48 | applied | `text-2xl` → `text-[22px] leading-none` in pin-tab.tsx:81 |
| shard-007-F49 | applied | `aria-hidden="true"` on Key + Lock in pin-tab.tsx:64,146 |
| shard-007-F50 | applied | `text-base` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` on both CardTitles in driver-form.tsx:71,119 |
| shard-007-F51 | applied | `autoComplete="off"` on name + phone Inputs, `inputMode="tel"` on phone in driver-form.tsx |
| shard-007-F52 | skipped | low confidence; would delete a conditional branch — needs-ruling |
| shard-007-F53 | applied | `aria-hidden="true"` on User + Calendar in driver-form.tsx:72,120 |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 45 SKIPPED: 8
