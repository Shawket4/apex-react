# Fix log — shard-022
| Finding | Status | Detail |
|---|---|---|
| shard-022-F01 | applied | `tabular-nums text-success` → `font-mono tabular-nums text-money` in drop-off-picker-modal.tsx:207 |
| shard-022-F02 | applied | added `aria-label={t('common.previous')}` / `t('common.next')` to the pager Buttons (drop-off-picker-modal.tsx:240,252); both keys already exist in en/ar — no locale edit |
| shard-022-F03 | applied | added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (:135) and `+ ring-inset` (:185) |
| shard-022-F04 | applied | `bg-primary/5` → `bg-primary/10 text-primary` at :136 and :187 |
| shard-022-F05 | applied | `hover:bg-muted/60` → `hover:bg-muted/50` at :135 and :186 |
| shard-022-F06 | applied | spinner block → `space-y-2 p-3` of 4 × `Skeleton h-10 w-full rounded-none`; added Skeleton import, dropped now-unused `Loader2` import |
| shard-022-F07 | applied | `text-sm font-medium` → `text-[13px] font-medium leading-snug` + `dir="auto"` at :141 and :195 |
| shard-022-F08 | applied | Cancel `variant="outline"` → `variant="ghost"` at :267 |
| shard-022-F09 | applied | dropped `h-3.5 w-3.5` from both pager chevrons (:247, :259) |
| shard-022-F10 | skipped | nit that is not a pure class-level edit (string + new i18n key) |
| shard-022-F11 | skipped | nit that is not a pure class-level edit (prop + new hook call) |
| shard-022-F12 | skipped | low confidence |
| shard-022-F13 | applied | `tabular-nums text-success` → `font-mono tabular-nums text-money` in trip-form.tsx:1295 |
| shard-022-F14 | applied | `border-warning/30 bg-warning/5` → `border-warning/40 bg-warning/10`; icon well `bg-warning/20` → `bg-warning/10` (trip-form.tsx:663,665) |
| shard-022-F15 | applied | capacity banner → `flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[12.5px]` with `/40` + `/10` alphas, icons `h-3.5 w-3.5`; receipt-pattern (:1139) and duplicate (:1167) strips → `rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` |
| shard-022-F16 | applied | `text-foreground/80` → `text-muted-foreground` at :1030, :1146, :1173 |
| shard-022-F17 | applied | `text-sm` → `text-[10px]` on the two section headings (:692, :819) |
| shard-022-F18 | applied | `bg-muted/20 p-3 md:p-4` → `bg-muted/40 p-3` at :1109 |
| shard-022-F19 | applied | removed `shadow-md` from the sticky submit footer (:901) |
| shard-022-F20 | applied | `space-y-6` → `space-y-3` (:660, FormSkeleton); `p-4 md:p-6` → `p-3` at :691, :817, :1313, :1325 |
| shard-022-F21 | applied | added `htmlFor={`dropoff-${idx}`}` to the Label and matching `id` to the picker Button (:1257, :1261) |
| shard-022-F22 | skipped | would change behaviour rather than presentation (new submitError state + programmatic focus on submit) |
| shard-022-F23 | skipped | would change behaviour rather than presentation (submit gating) |
| shard-022-F24 | skipped | would change behaviour rather than presentation (new beforeunload/router guard) |
| shard-022-F25 | skipped | nit that is not a pure class-level edit (props + new i18n key) |
| shard-022-F26 | applied | dropped size classes from the icons at :683, :834, :848, :914, :916, :1131, :1271 (kept `animate-spin`) |
| shard-022-F27 | applied | `rounded-md border border-dashed bg-muted/30` → `rounded-lg border border-dashed border-border/60 bg-muted/40` (:1000) |
| shard-022-F28 | skipped | nit that is not a pure class-level edit (strings + new i18n keys) |
| shard-022-F29 | applied | `tabular-nums` → `font-mono tabular-nums` at :1031, :1036, :1289 |
| shard-022-F30 | applied | `Skeleton h-10` → `h-9` at :704, :732, :776 and the five FormSkeleton field bars |
| shard-022-F31 | applied | `pr-2` → `pe-2` in duplicate-comparison-dialog.tsx:76 |
| shard-022-F32 | applied | eyebrow `text-xs` → `text-[10px]` (:154); added `font-semibold` to the two DiffRow labels (:247, :261) |
| shard-022-F33 | applied | `'PPP'` → `'d MMM yyyy'` at :101 and :102 |
| shard-022-F34 | applied | receipt number → `font-mono text-sm font-semibold tabular-nums` (:159) |
| shard-022-F35 | applied | panel `overflow-hidden rounded-lg border bg-card` (:150); head row `+ gap-2 bg-muted/60` (:152) |
| shard-022-F36 | applied | `bg-warning/15` → `bg-warning/10` (:62) |
| shard-022-F37 | skipped | nit that is not a pure class-level edit (string + formatNumber + new i18n key) |
| shard-022-F38 | applied | `text-[10px]` → `text-[10.5px]` on the origin chip (:164) |
| shard-022-F39 | skipped | low confidence |
| shard-022-F40 | applied | duplicate dialog spinner → `animate-spin motion-reduce:animate-none`, size class dropped; same on trip-form.tsx:914 |
| shard-022-F41 | applied | `left-3` → `start-3` on the map legend (trip-location-dialog.tsx:279) |
| shard-022-F42 | applied | `Retry` → `t('common.retry')`, `Loading map…` → `t('common.loadingMap')`; `useTranslation()` added inside MapErrorState/MapLoadingState; both keys already exist in en/ar — no locale edit |
| shard-022-F43 | applied | legend dot `h-2.5 w-2.5` → `h-1.5 w-1.5`; legend text `text-xs` → `text-[11px]` at :287 and :390 |
| shard-022-F44 | partly applied | popup label `color:#71717a` → `color:hsl(var(--muted-foreground))` (:454); the `bg-blue-500` route swatch skipped — needs-ruling (Notes: must match `MapView`'s polyline colour, out-of-shard `shared/ui/map-view.tsx`; flag for the owner rather than diverge) |
| shard-022-F45 | applied | partial-coord banner → `rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px] text-warning`, icon `h-3.5 w-3.5`, body `text-muted-foreground` |
| shard-022-F46 | applied | `font-medium … tracking-widest` → `font-semibold … tracking-wider` (:363) |
| shard-022-F47 | skipped | needs-ruling — Notes make the treatment conditional on whether `car_no_plate` can be Arabic (§2 forbids Arabic in mono); that is a decision, not a fix |
| shard-022-F48 | applied | `'PPP'` → `'d MMM yyyy'` (:206) |
| shard-022-F49 | applied | `bg-muted/30` → `bg-muted/40` at :202, :245, :374 |
| shard-022-F50 | applied | copy `text-sm` → `text-xs`; retry `className="h-7 gap-1.5 px-2.5 text-xs"` and icon size class dropped; disc `bg-destructive/10` → `bg-warning/10`, icon `text-destructive` → `text-warning` |
| shard-022-F51 | partly applied | took the finding's stated minimum (`motion-reduce:animate-none` on the map spinner); the Skeleton swap would have deleted the loading label that F42 requires translated |
| shard-022-F52 | applied | appended `rounded-sm` to both text-bar skeletons (:379, :380) |
| shard-022-F53 | applied | dropped size classes from the icons at :304, :312, :322, :415 |
| shard-022-F54 | skipped | nit that is not a pure class-level edit (strings + new i18n keys) |
| shard-022-F55 | skipped | low confidence |
Gates: tsc ok, lint-diff ok (baseline 776, now 776, NEW 0)
APPLIED: 42 SKIPPED: 13
