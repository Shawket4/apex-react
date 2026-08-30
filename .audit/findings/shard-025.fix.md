# Fix log — shard-025
| Finding | Status | Detail |
|---|---|---|
| shard-025-F01 | applied | `bg-sky-500`/`bg-amber-500`/`bg-red-500` → `bg-primary`/`bg-warning`/`bg-destructive` in trip-replay-timeline.tsx:51-53 |
| shard-025-F02 | applied | `bg-slate-950/35` → `bg-black/35` in trip-replay-timeline.tsx:293 |
| shard-025-F03 | applied | band `tabIndex={disabled ? -1 : 0}` + `focus-visible:ring-*` + additive `onKeyDown` (Arrows/Home/End → `onScrub`) in trip-replay-timeline.tsx:172-188, 253-254, 262 |
| shard-025-F04 | applied | `rounded-xl` → `rounded-lg` in trip-replay-leg-rail.tsx:72 |
| shard-025-F05 | applied | `text-xs font-bold` → `text-[10px] font-semibold` in trip-replay-leg-rail.tsx:81 |
| shard-025-F06 | applied | `hover:bg-muted/60` → `hover:bg-muted/50` in trip-replay-leg-rail.tsx:121 |
| shard-025-F07 | applied | `border-primary/60 bg-primary/10` → `border-primary bg-primary/10 text-primary` in trip-replay-leg-rail.tsx:120 |
| shard-025-F08 | applied | Badge size override `px-1 py-0 text-[9px]` → `shrink-0` in trip-replay-leg-rail.tsx:170 |
| shard-025-F09 | applied | `shadow-xl` → `shadow-lg` in trip-replay-leg-rail.tsx:72 |
| shard-025-F10 | applied | `h-2 w-2` → `h-1.5 w-1.5` in trip-replay-leg-rail.tsx:127 |
| shard-025-F11 | applied | `:156` → `mt-1 font-mono text-[11px] tabular-nums text-muted-foreground`; `:163` wrapper to `text-[11px]` with `font-mono` on the numeric `<span dir="ltr">` only (safer variant, Arabic never in mono) |
| shard-025-F12 | applied | `shadow transition-transform group-hover:scale-125` → `shadow-sm` (growth dropped) in trip-replay-timeline.tsx:336 |
| shard-025-F13 | applied | leg chip → `gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground` in trip-replay-timeline.tsx:359 |
| shard-025-F14 | applied | `bg-muted/50` → `bg-muted` in trip-replay-timeline.tsx:253 |
| shard-025-F15 | applied | hand-rolled ring spinner → `<Loader2 className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none" aria-hidden>`; wrapper gets `role="status"` + `aria-label={t('common.loading')}` (existing key reused, no locale edit); added `useTranslation`/`Loader2` imports in trip-replay-map.tsx |
| shard-025-F16 | applied | `bg-muted/30` → `bg-muted/40` in trip-replay-map.tsx:130 |
| shard-025-F17 | skipped | accepted-as-is — native `<button>` swap would require lifting the nested loop `<Button>` out of the card (behaviour/structure change); §12.4 records this exact `div role=button` fallback and the keyboard handler + focus ring are already present |
| shard-025-F18 | applied | tooltip `shadow-lg` → `shadow-md` in trip-replay-timeline.tsx:232 |
| shard-025-F19 | skipped | nit whose change is JS-level, not a pure class-level edit (nits apply only when class-level); the inline `window.matchMedia` also introduced a NEW `no-undef` lint message in a touched file |
| shard-025-F20 | applied (partial) | added `role="img"` beside the existing `aria-label` on `Moon` (trip-replay-leg-rail.tsx:135); the suggested `title` was reverted — lucide's `LucideProps` rejects `title` (tsc TS2322). Also added `aria-hidden="true"` to the redundant `Moon` in trip-replay-timeline.tsx:370 per the finding's note |
| shard-025-F21 | skipped | low confidence |
| shard-025-F22 | applied | missing leg endpoints and km figures wrapped as `<span className="opacity-40">—</span>` in trip-replay-leg-rail.tsx:131, 165-166 |
Gates: tsc ok, lint-diff ok (776/776, 0 new)
APPLIED: 19 SKIPPED: 3
