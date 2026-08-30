# Fix log — shard-025
| Finding | Status | Detail |
|---|---|---|
| shard-025-F01 | applied | `bg-sky-500`/`bg-amber-500`/`bg-red-500` → `bg-primary`/`bg-warning`/`bg-destructive` in trip-replay-timeline.tsx:51-53 |
| shard-025-F02 | applied | `bg-slate-950/35` → `bg-black/35` in trip-replay-timeline.tsx:293 |
| shard-025-F03 | applied | `tabIndex={-1}` → `tabIndex={disabled ? -1 : 0}`, added `onKeyDown` (Arrow/Home/End → `onScrub`) and `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` on the band in trip-replay-timeline.tsx:172-190, 245, 253-254 (additive only) |
| shard-025-F04 | applied | `rounded-xl` → `rounded-lg` in trip-replay-leg-rail.tsx:72 |
| shard-025-F05 | applied | `text-xs font-bold` → `text-[10px] font-semibold` in trip-replay-leg-rail.tsx:81 |
| shard-025-F06 | applied | `hover:bg-muted/60` → `hover:bg-muted/50` in trip-replay-leg-rail.tsx:121 |
| shard-025-F07 | applied | `border-primary/60 bg-primary/10` → `border-primary bg-primary/10 text-primary` in trip-replay-leg-rail.tsx:120 |
| shard-025-F08 | applied | Badge `className="px-1 py-0 text-[9px]"` → `className="shrink-0"` in trip-replay-leg-rail.tsx:170 |
| shard-025-F09 | applied | `shadow-xl` → `shadow-lg` in trip-replay-leg-rail.tsx:72 |
| shard-025-F10 | applied | `h-2 w-2` → `h-1.5 w-1.5` on the leg-colour key dot in trip-replay-leg-rail.tsx:127 |
| shard-025-F11 | applied | clock line `text-[10px] tabular-nums` → `font-mono text-[11px] tabular-nums` (leg-rail:156); km line wrapper → `text-[11px]` with `font-mono` on the numeric `<span dir="ltr">` only (safer variant, leg-rail:163-164) |
| shard-025-F12 | applied | `shadow transition-transform group-hover:scale-125` → `shadow-sm` on the event pin in trip-replay-timeline.tsx:336 |
| shard-025-F13 | applied | leg chip → `gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground` in trip-replay-timeline.tsx:359 |
| shard-025-F14 | applied | `bg-muted/50` → `bg-muted` on the band track in trip-replay-timeline.tsx:253 |
| shard-025-F15 | applied | hand-rolled `border-2` ring spinner → `<Loader2 className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />` with `role="status"` + `aria-label={t('common.loading', 'Loading…')}` on the wrapper; added `useTranslation` and the `Loader2` import in trip-replay-map.tsx:1-3, 38, 130-140 (reused the existing `common.loading` key, no locale change) |
| shard-025-F16 | applied | `bg-muted/30` → `bg-muted/40` in trip-replay-map.tsx:130 |
| shard-025-F17 | skipped | needs-ruling — the finding states the fixer may reasonably record this as accepted-as-is; the swap to a native `<button>` requires lifting the nested loop `<Button>` out of the card (a restructure the finding declines to mandate), and §12.4 records the same `div role=button` fallback |
| shard-025-F18 | applied | `shadow-lg` → `shadow-md` on the scrub tooltip in trip-replay-timeline.tsx:232 |
| shard-025-F19 | skipped | nit whose change is not a pure class-level edit — it rewrites the `scrollIntoView` call inside an effect (behaviour of the scroll), not a class list |
| shard-025-F20 | applied (partial) | added `role="img"` beside the existing `aria-label` on the `Moon` in leg-rail:135, and `aria-hidden="true"` on the redundant `Moon` in trip-replay-timeline.tsx:370. The `title` half was dropped: lucide's `LucideProps` omits `title`, so it fails `tsc` (TS2322) |
| shard-025-F21 | skipped | low confidence |
| shard-025-F22 | skipped | nit whose change is not a pure class-level edit — it wraps the `—` fallbacks in new `<span>` elements |
Gates: tsc ok, lint-diff ok (0 new; 775 vs baseline 776)
APPLIED: 18 SKIPPED: 4
