# Fix log — shard-016
| Finding | Status | Detail |
|---|---|---|
| shard-016-F01 | applied | keyword chip → `bg-muted text-muted-foreground border-border print:bg-muted`; hybrid chip → `bg-primary/10 text-primary border-primary/40 print:bg-primary/5`; sidebar `text-blue-500` → `text-muted-foreground` in service-invoice-details.tsx |
| shard-016-F02 | applied | back button `aria-label={t('common.back')}`, icon `aria-hidden` in service-invoice-details.tsx:57 |
| shard-016-F03 | applied | `text-right` → `text-end` ×3; Printer `mr-2` removed in service-invoice-details.tsx |
| shard-016-F04 | applied | h1 → `text-lg font-semibold leading-tight sm:text-xl`; subtitle → `mt-0.5 text-[11.5px]` |
| shard-016-F05 | applied | receipt h2 → `text-lg font-semibold leading-tight text-foreground print:text-base`; h3 → eyebrow recipe |
| shard-016-F06 | applied | Card `border-2 … shadow-lg` → `print:border-border/60`; items box `rounded-lg border`; `divide-y`; `md:border-e`; dashed card `border-border/60`; icon well `rounded-lg`; chips lost `shadow-sm` |
| shard-016-F07 | applied | head band → `border-b bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; `border-background/20` dropped |
| shard-016-F08 | applied | all eyebrows → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (258 keeps `text-primary`; 230 `mb-4` → `mb-3`) |
| shard-016-F09 | applied | plate `text-xl font-black` → `text-[15px] font-semibold` + `dir="auto"` (sans kept — plates may be Arabic); Badge `font-black` removed |
| shard-016-F10 | applied | `split('T')[0]` → `format(new Date(invoice.date), 'd MMM yyyy')` ×2; `•` → `·`; `date-fns` import added |
| shard-016-F11 | applied | `gap-6`→`gap-3`, `space-y-6`→`space-y-3`, grid `gap-4`→`gap-3`, `p-8`→`p-3 sm:p-4`, `p-6`→`p-3` ×3, `mb-10 pb-8`→`mb-3 pb-3`, cells `p-4`→`px-3 py-2.5` |
| shard-016-F12 | applied | matched row `bg-primary/10`, hover `bg-muted/50`, `bg-muted/5` dropped, match card `border-primary/40 bg-primary/10`, wells `bg-muted/40 border-border/60`, StatCard `tone="success"`/`"warning"` values removed |
| shard-016-F13 | applied | `'-'` → `<span className="opacity-40">—</span>` ×2 |
| shard-016-F14 | applied | `h-5 w-5`/`h-4 w-4` removed on ArrowLeft/Printer inside Button |
| shard-016-F15 | applied | back button + clear button `aria-label`; icons `aria-hidden` in service-invoice-form.tsx |
| shard-016-F16 | applied | Textarea/Input `focus-visible:ring-0` → `focus-visible:ring-inset focus-visible:ring-offset-0` |
| shard-016-F17 | applied | `mr-2` removed on all five icons |
| shard-016-F18 | applied | h1/subtitle/h2/h3/items heading/mobile eyebrows per finding |
| shard-016-F19 | applied | 165 `border-2 border-muted/50` removed; 301 `rounded-lg border`; 302 `bg-muted/60 px-3 py-2`; 308 head band recipe; 309 `border-e`; 317 `divide-y`; 320 `md:border-e`; 346 colour dropped; 359 `border-t bg-muted/40` |
| shard-016-F20 | applied | row hover `bg-muted/50`; `bg-muted/5` dropped at 345; 359 `bg-muted/40` |
| shard-016-F21 | applied | added `group-focus-within:opacity-100 focus-within:opacity-100` |
| shard-016-F22 | applied | `gap-6`→`gap-3`, `space-y-8`→`space-y-3`, `mb-8`→`mb-3`, `gap-x-12 gap-y-6`→`gap-4` |
| shard-016-F23 | applied | mobile bar → `safe-bottom … backdrop-blur supports-[backdrop-filter]:bg-background/60 … p-3 gap-2 … z-30` |
| shard-016-F24 | applied | `motion-reduce:animate-none` on both spinners |
| shard-016-F25 | applied | `inputMode="numeric"` on meter input; `autoComplete="off"` on supervisor/region |
| shard-016-F26 | applied | `aria-hidden="true"` on every decorative lucide icon across form, details, list page, table, settings, tires, terminal-select |
| shard-016-F27 | applied | clear button `type="button" aria-label={t('common.clear')}` (existing key) + `rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; icon `aria-hidden` |
| shard-016-F28 | applied | search Input `type="search" name="q" autoComplete="off" aria-label` |
| shard-016-F29 | applied | legend `text-blue-500` → `text-muted-foreground` |
| shard-016-F30 | applied | `mr-2 h-4 w-4` removed on 110/115; `rtl:rotate-180` on back arrows (list page, details, form) |
| shard-016-F31 | applied | search Card → plain `overflow-hidden`; Input → `ps-9 pe-9`; icons `h-4 w-4`; `ps-4` → `ps-3` |
| shard-016-F32 | applied | `animate-pulse` removed; spinner `motion-reduce:animate-none` |
| shard-016-F33 | applied | legend → `mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground` |
| shard-016-F34 | applied | `gap-6` → `gap-3`; `p-6` → `p-3` |
| shard-016-F35 | skipped | structural state→URL sync changes behaviour (refresh/deep-link semantics), not presentation |
| shard-016-F36 | applied | actions trigger `aria-label={t('common.actions')}` (existing key); icon `aria-hidden` |
| shard-016-F37 | applied | `text-right` → `text-end` ×2; `mr-2` → `me-2` ×3 |
| shard-016-F38 | applied | `toISOString().split('T')[0]` → `format(date, 'd MMM yyyy')` in `font-mono tabular-nums`; `date-fns` import added |
| shard-016-F39 | applied | `font-black tracking-tight` → `font-semibold` + `dir="auto"` (sans kept for Arabic plates) |
| shard-016-F40 | applied | Badge → `border-primary/40 bg-primary/10 text-primary`, default gap |
| shard-016-F41 | skipped | structural: wrapping menu items in `<Link asChild>` changes navigation behaviour (href/modifier-click semantics), not presentation |
| shard-016-F42 | skipped | low confidence |
| shard-016-F43 | applied | all UI strings in settings.tsx via `t('settings.petroapp.*', { defaultValue })`; Save → `t('common.save')`; keys added to en.json + ar.json. Zod messages (26-27) left — module-scope schema, no `t` available without restructuring |
| shard-016-F44 | applied | Save icon `mr-2 h-4 w-4` removed, `aria-hidden` |
| shard-016-F45 | applied | `autoComplete="off" spellCheck={false}` on both inputs; placeholders end with `…`; `Loader2 animate-spin motion-reduce:animate-none` while `mutation.isPending` (`Loader2` import added) |
| shard-016-F46 | applied | `space-y-6` → `space-y-3` |
| shard-016-F47 | applied | `role="status"` on hint `<p>`; icon `aria-hidden` |
| shard-016-F48 | applied | `text-amber-500` → `text-primary` |
| shard-016-F49 | applied | empty `<p>` → `py-6 text-center text-xs text-muted-foreground` ×2 |
| shard-016-F50 | applied | `Skeleton` `rounded-lg` ×2 |
| shard-016-F51 | applied | `font-semibold tabular-nums` → `font-mono tabular-nums` ×2 |
| shard-016-F52 | applied | spinners `animate-spin motion-reduce:animate-none`, size classes removed, `aria-hidden` ×4 |
| shard-016-F53 | applied | `gap-6 xl:grid-cols-2` → `gap-3 lg:grid-cols-2`; form wells `p-4` → `p-3` |
| shard-016-F54 | applied | `aria-invalid` on the four inputs; messages `text-[11px] font-medium`; `inputMode="numeric"`/`"decimal"` |
| shard-016-F55 | skipped | low confidence |
| shard-016-F56 | skipped | low confidence |
| shard-016-F57 | applied | all five frames → `mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4` |
| shard-016-F58 | applied | skeletons → `h-5 w-1/3 rounded-sm` + `h-96 w-full rounded-lg` on details and edit pages |
| shard-016-F59 | applied | `return null` branch now returns `py-6 text-center text-xs text-muted-foreground` `common.noResults` paragraph on details and edit pages (`useTranslation` added to details page) |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 54 SKIPPED: 5
