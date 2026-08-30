# Fix log — shard-009
| Finding | Status | Detail |
|---|---|---|
| shard-009-F01 | applied | emerald/sky/rose hand-rolled pairs → `border-success/40 bg-success/10 text-success` / `border-warning/40 bg-warning/10 text-warning` / `border-destructive/40 bg-destructive/10 text-destructive` / `border-border bg-muted text-muted-foreground`; dots → `bg-success`/`bg-warning`/`bg-destructive`; `dark:` classes dropped in accuracy-badge.tsx:17-38 |
| shard-009-F02 | applied | `gap-1 rounded-md px-2 py-0.5` → `gap-1.5 rounded-full px-2.5 py-1` in accuracy-badge.tsx:55 |
| shard-009-F03 | applied | `aria-hidden="true"` on `<Icon>` in accuracy-badge.tsx:59 |
| shard-009-F04 | applied | `{diffKm.toFixed(1)}km` → `{formatNumber(diffKm, 1)}&nbsp;{t('feeMappings.units.km','km')}` in accuracy-badge.tsx:64; key `feeMappings.units.km` added to en/ar |
| shard-009-F05 | applied | `text-2xl font-bold tabular-nums` → `font-mono text-[22px] font-semibold leading-none tabular-nums`, value via `formatNumber(value, 0)` in fee-mappings-bulk-enrich-dialog.tsx:136 |
| shard-009-F06 | applied | `rounded-md p-2.5` → `rounded-lg border p-3`; tones → `border-border bg-muted text-foreground` / `border-success/40 bg-success/10 text-success` / `border-destructive/40 bg-destructive/10 text-destructive` in fee-mappings-bulk-enrich-dialog.tsx:129-135 |
| shard-009-F07 | applied | `font-semibold` added to eyebrow in fee-mappings-bulk-enrich-dialog.tsx:137 |
| shard-009-F08 | applied | `rounded-md` → `rounded-lg` on list container in fee-mappings-bulk-enrich-dialog.tsx:71 |
| shard-009-F09 | skipped | low confidence |
| shard-009-F10 | applied | `aria-hidden="true"` on XCircle/CheckCircle2/X in fee-mappings-bulk-enrich-dialog.tsx:82,84,111 |
| shard-009-F11 | applied | `<X className="me-1.5 h-3.5 w-3.5" />` → `<X aria-hidden="true" />` in fee-mappings-bulk-enrich-dialog.tsx:111 |
| shard-009-F12 | applied | `toFixed` + bare `km`/`min`/`Δ` → `formatNumber(...)` + `&nbsp;` + `t('feeMappings.units.km')`, `t('feeMappings.units.min')`, `t('feeMappings.bulkEnrich.delta')`; `—` for null; metrics div now `font-mono` in fee-mappings-bulk-enrich-dialog.tsx:91-99; keys added to en/ar |
| shard-009-F13 | applied | `overscroll-contain` added to dialog body in fee-mappings-bulk-enrich-dialog.tsx:50 |
| shard-009-F14 | applied | `dir="auto"` on drop-off name in fee-mappings-bulk-enrich-dialog.tsx:87 |
| shard-009-F15 | applied | `aria-label`, `name="search"`, `autoComplete="off"`, `spellCheck={false}` on Input; `aria-hidden="true"` on Search icon in fee-mappings-filters.tsx:57-67 |
| shard-009-F16 | applied | both `h-9 w-[180px]` → `h-8 w-auto min-w-32`; Clear `h-9 gap-1 text-xs` → `gap-1.5`; `<X className="h-3.5 w-3.5" />` → `<X aria-hidden="true" />`; Input `ps-9` → `h-8 ps-9` in fee-mappings-filters.tsx |
| shard-009-F17 | applied | `font-mono` added; counts via `formatNumber(n, 0)` in fee-mappings-filters.tsx:130-131 |
| shard-009-F18 | skipped | out-of-shard: src/pages/fee-mappings/* owns the filter state |
| shard-009-F19 | applied | `<Card>` → `<Card className="shadow-none">` in fee-mappings-form.tsx:172 |
| shard-009-F20 | applied | `p-4 sm:p-5` → `p-3` in fee-mappings-form.tsx:173 |
| shard-009-F21 | applied | `text-sm font-semibold` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` in fee-mappings-form.tsx:179 |
| shard-009-F22 | applied | placeholders → `t('feeMappings.form.placeholders.company|terminal|dropOffPoint', 'Watanya…'|'Cairo…'|'Qena…')` in fee-mappings-form.tsx:203,220,236; keys added to en/ar |
| shard-009-F23 | applied | `aria-hidden="true"` on Pencil/Plus/Sparkles/X/Loader2 in fee-mappings-form.tsx |
| shard-009-F24 | applied | `motion-reduce:animate-none` on Loader2 in fee-mappings-form.tsx:282 |
| shard-009-F25 | applied | `me-1.5 h-3.5 w-3.5` dropped from X and Loader2 in fee-mappings-form.tsx:277,282 |
| shard-009-F26 | applied | `name={id}`, `inputMode={type === 'number' ? 'decimal' : undefined}`, `autoComplete="off"` added to Field Input in fee-mappings-form.tsx:324-328 |
| shard-009-F27 | skipped | structural change adding focus-first-invalid logic in handleSubmit changes behaviour, not presentation |
| shard-009-F28 | applied | `aria-hidden="true"` on MapPin/Loader2/Save in fee-mappings-location-dialog.tsx:124,230,232 |
| shard-009-F29 | applied | `motion-reduce:animate-none` on Loader2 in fee-mappings-location-dialog.tsx:230 |
| shard-009-F30 | applied | `me-1.5 h-4 w-4` dropped from Loader2/Save in fee-mappings-location-dialog.tsx:230,232 |
| shard-009-F31 | applied | `rounded-md border bg-muted/30 p-2 text-xs` → `rounded-lg border bg-muted/40 p-3 text-[12px]` in fee-mappings-location-dialog.tsx:190 |
| shard-009-F32 | applied | `font-semibold tabular-nums` → `font-mono tabular-nums` on the three value divs in fee-mappings-location-dialog.tsx |
| shard-009-F33 | applied | ` km` → `&nbsp;{t('feeMappings.units.km')}`; `toFixed(0) min` → `formatNumber(v, 0)&nbsp;{t('feeMappings.units.min')}` in fee-mappings-location-dialog.tsx:196,204,214 |
| shard-009-F34 | applied | `'—'` → `<span className="opacity-40">—</span>` in fee-mappings-location-dialog.tsx:218 |
| shard-009-F35 | applied | `overscroll-contain` added to dialog body in fee-mappings-location-dialog.tsx:134 |
| shard-009-F36 | applied | `dir="auto"` on DialogDescription; ` → ` → ` · ` separator in fee-mappings-location-dialog.tsx:127-129 |
| shard-009-F37 | applied | `name="lat"/"lng"`, `inputMode="decimal"`, `autoComplete="off"`; placeholders `30.044420…` / `31.235712…` in fee-mappings-location-dialog.tsx:141-169 |
| shard-009-F38 | skipped | needs-ruling (Notes: owner may prefer the trips disabled-until-valid pattern) |
| shard-009-F39 | applied | `info` → `'bg-warning/10 text-warning'` (dark: class dropped) in fee-mappings-stats.tsx:99 |
| shard-009-F40 | applied | `font-medium … tracking-widest` → `font-semibold … tracking-wider` in fee-mappings-stats.tsx:114 |
| shard-009-F41 | applied | `text-lg font-semibold leading-tight tabular-nums` → `font-mono text-[22px] font-semibold leading-none tabular-nums`, `formatNumber(value, 0)` in fee-mappings-stats.tsx:117 |
| shard-009-F42 | applied | `gap-2` → `gap-3` in fee-mappings-stats.tsx:77 |
| shard-009-F43 | applied | `aria-hidden="true"` on the five well icons in fee-mappings-stats.tsx:43-71 |
| shard-009-F44 | applied | covered by F41 (`formatNumber(value, 0)`) |
| shard-009-F45 | applied | `font-semibold tabular-nums` → `font-mono tabular-nums text-money` in fee-mappings-table.tsx:130 |
| shard-009-F46 | applied | `aria-label` mirroring `title` on the three icon Buttons; `aria-hidden="true"` on MapPin/Pencil/Trash2 in fee-mappings-table.tsx:159-191 |
| shard-009-F47 | applied | `h-3.5 w-3.5` dropped from the three action icons in fee-mappings-table.tsx |
| shard-009-F48 | applied | both `'—'` → `<span className="opacity-40">—</span>` in fee-mappings-table.tsx:86,107 |
| shard-009-F49 | applied | `` `${v.toFixed(0)} min` `` → `{formatNumber(v, 0)}&nbsp;{t('feeMappings.units.min','min')}` in fee-mappings-table.tsx:104 |
| shard-009-F50 | applied | `dir="auto"` on company/terminal/drop-off spans in fee-mappings-table.tsx:45,52,59 |
| shard-009-F51 | skipped | low confidence |

Locale keys added (en + ar): `feeMappings.units.km`, `feeMappings.units.min`, `feeMappings.bulkEnrich.delta`, `feeMappings.form.placeholders.{company,terminal,dropOffPoint}`.

Gates: tsc ok, lint-diff ok (0 new)
APPLIED: 46 SKIPPED: 5
