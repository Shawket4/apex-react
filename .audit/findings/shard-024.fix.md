# Fix log — shard-024
| Finding | Status | Detail |
|---|---|---|
| shard-024-F01 | applied | dwell badge `bg-amber-500/15 … text-amber-600 dark:text-amber-400` → `border border-warning/40 bg-warning/10 text-warning`; dot `bg-amber-500` → `bg-warning` in trip-replay-hud.tsx:207-210 |
| shard-024-F02 | applied | `rounded-xl` → `rounded-lg` on the HUD card, trip-replay-hud.tsx:140 |
| shard-024-F03 | applied | `aria-hidden="true"` added to `Gauge`, dwell dot, `RotateCcw`, `Pause`, `Play`, `FastForward`, `Crosshair` (trip-replay-hud.tsx) and `ArrowLeft`, `TriangleAlert`, both `Loader2`, `Layers` (trip-replay.tsx) |
| shard-024-F04 | applied | `Moon` marked `aria-hidden="true"`; label moved to a sibling `<span className="sr-only">` keeping `tripReplay.hud.night`, trip-replay-hud.tsx:155-160 |
| shard-024-F05 | applied | `font-black` → `font-semibold` (hud clock :150, speed digits :274); `font-bold` → `font-semibold` (hud eyebrows :167/:178, dwell badge :207, `trip-replay.tsx` h1 :520) |
| shard-024-F06 | applied | both HUD eyebrows `text-[9px] font-bold … text-muted-foreground/70` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` |
| shard-024-F07 | applied | plate `text-sm font-semibold` → `font-mono text-sm font-semibold tabular-nums`, trip-replay.tsx:526; `dir="ltr"` preserved |
| shard-024-F08 | applied | `motion-reduce:animate-none` added to the `animate-ping` dwell dot and the retained `animate-spin` `Loader2` (trip-replay.tsx:546); the second spinner was replaced by `Skeleton` under F09 |
| shard-024-F09 | applied | structural, in-file: centred `Loader2` block → `<Skeleton className="absolute inset-0 rounded-none" />`, `Skeleton` imported from `@/shared/ui/skeleton`; the `isLoading || !detail` branch is unchanged |
| shard-024-F10 | applied | HUD card `shadow-xl` → `shadow-lg`; play button `shadow-lg shadow-primary/30` → `shadow-sm`; satellite toggle bare `shadow` → `shadow-sm` |
| shard-024-F11 | skipped | needs-ruling — Notes flag §12.3 as provisional and say a fixer may defer pending an owner ruling on the mode-tray recipe (the `font-black`→`font-semibold` weight at hud:274 was applied under F05) |
| shard-024-F12 | applied | active `HudToggle` `border-primary/50 bg-primary/10 text-foreground` → `border-primary bg-primary/10 text-primary` |
| shard-024-F13 | applied | header (:506) and timeline band (:628) `bg-card/70 backdrop-blur` → `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60`; HUD card `bg-card/85` → `bg-card`; HUD toggle inactive `bg-card/60` → `bg-card`; satellite toggle `bg-card/90` → `bg-card` |
| shard-024-F14 | applied | `formatDurationShort(ms, units?)` gained an optional `DurationUnits` param (signature is additive; existing shard-025 callers unaffected); HUD passes `t('tripReplay.hud.unitHour'/'unitMinute'/'unitSecond')`. Keys `unitHour`/`unitMinute`/`unitSecond` added to `en.json` and `ar.json` under `tripReplay.hud` (Arabic: س / د / ث) |
| shard-024-F15 | applied | `formatNumber` imported in both files; `kmDriven.toFixed(1)`, `kmOptimal.toFixed(1)`, `Math.round(state.speedKmh)` (hud) and `Math.round(speed)`, `km.toFixed(1)` (trip-replay.tsx getPreview) replaced. 1 dp kept for km per Notes |
| shard-024-F16 | applied | `safe-top` added to the takeover header (:506), `safe-bottom` to the timeline band wrapper (:628) |
| shard-024-F17 | skipped | low confidence (finding is graded `low`; Notes say nothing currently stacks over the takeover) |
| shard-024-F18 | applied | plate fallback wrapped: `{detail.car_no_plate \|\| <span className="opacity-40">—</span>}`, trip-replay.tsx:527; the HUD interpolated dashes left alone per the finding's own `no rule` note; `\|\|` logic unchanged |
| shard-024-F19 | skipped | needs-ruling — the finding itself says "Not recommended without an owner ruling" on D-ST3, and the fix would change redirect behaviour / delete a branch |
| shard-024-F20 | skipped | low confidence |
Gates: tsc ok, lint-diff ok (baseline 776, now 776, 0 new)
APPLIED: 16 SKIPPED: 4
