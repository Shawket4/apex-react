# Fix log — shard-018
| Finding | Status | Detail |
|---|---|---|
| shard-018-F01 | applied | focus-visible ring appended to close, row-select, hide/show and focus buttons in fleet-panel.tsx |
| shard-018-F02 | applied | `border-primary/40 bg-primary/5` → `border-primary bg-primary/10 text-primary` in fleet-panel.tsx |
| shard-018-F03 | applied | `h-2.5 w-2.5 … ring-2 ring-background` → `h-1.5 w-1.5`, `aria-hidden="true"` in fleet-panel.tsx |
| shard-018-F04 | applied | group heading → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; inline STATUS_COLOR style dropped in fleet-panel.tsx |
| shard-018-F05 | applied | plate `font-bold` → `font-semibold` in fleet-panel.tsx |
| shard-018-F06 | applied | row `hover:bg-muted/60` → `hover:bg-muted/50` + `transition-colors`; icon buttons → `hover:bg-accent hover:text-accent-foreground` in fleet-panel.tsx |
| shard-018-F07 | applied | `shadow-xl` → `shadow-lg` in fleet-panel.tsx |
| shard-018-F08 | applied | search input gets `type="search" name="fleet-search" autoComplete="off" spellCheck={false}`; placeholder ends in `…` (default + en.json/ar.json `tracking.searchPlaceholder`) |
| shard-018-F09 | applied | hidden row `opacity-50` → `opacity-70` in fleet-panel.tsx |
| shard-018-F10 | applied | `rounded-t-2xl` → `rounded-t-lg` in range-picker.tsx |
| shard-018-F11 | applied | `shadow-2xl` → `shadow-lg` in range-picker.tsx |
| shard-018-F12 | applied | close button: focus ring + `hover:bg-accent hover:text-accent-foreground` in range-picker.tsx |
| shard-018-F13 | applied | additive `activePreset` state (cleared on calendar/time change); presets flip `variant` default↔outline + `aria-pressed` in range-picker.tsx |
| shard-018-F14 | applied | `onTouchStart` intent-prefetch added to Load button in range-picker.tsx |
| shard-018-F15 | applied | selects get `text-foreground shadow-sm focus-visible:ring-offset-1` in range-picker.tsx |
| shard-018-F16 | applied | `bg-amber-500/80` → `bg-warning/80` in replay-transport.tsx |
| shard-018-F17 | applied | emerald → `border-success/40 bg-success/10 text-success` / `bg-success/10 text-success` in replay-transport.tsx |
| shard-018-F18 | applied | focus rings on restart, play, speed chips, race toggle (ring-offset-1) and range input (ring-offset-2) in replay-transport.tsx |
| shard-018-F19 | applied | `rounded-lg` → `rounded-md`, `shadow` → `shadow-sm`, `transition-colors`, `hover:bg-accent hover:text-accent-foreground` in replay-transport.tsx |
| shard-018-F20 | applied | speed chip `border-primary/50` → `border-primary`; inactive hover → accent; `transition-colors` in replay-transport.tsx |
| shard-018-F21 | applied | delta chip `font-bold` → `font-semibold` in replay-transport.tsx |
| shard-018-F22 | applied | `timeFmt` built from `i18n.language` (ar-EG/en-GB), memoised, in replay-transport.tsx |
| shard-018-F23 | applied | `fmtDelta` takes unit strings from `t('tracking.unit.h'/'tracking.unit.m')`; keys added to en.json + ar.json |
| shard-018-F24 | applied | `dir="ltr"` on the range input in replay-transport.tsx |
| shard-018-F25 | applied | `p-2.5` → `p-3` in replay-transport.tsx |
| shard-018-F26 | applied | chip → sans `px-2.5 py-1 text-[11px] font-medium`; active = inline tint (border 40%, bg 10%, full-strength text); dot keeps hue; count `opacity-70` in status-chips.tsx |
| shard-018-F27 | applied | dot `h-2 w-2` → `h-1.5 w-1.5`, `aria-hidden="true"` in status-chips.tsx |
| shard-018-F28 | applied | focus ring + ring-offset-1 on chip buttons in status-chips.tsx |
| shard-018-F29 | applied | `aria-hidden="true"` on dots in vehicle-card.tsx, fleet-panel.tsx, status-chips.tsx, time-deck.tsx (current-leg, trip, leg) and labelled-button icons (vehicle-card Focus/Replay, replay-transport Flag) |
| shard-018-F30 | applied | `aria-label="scrub"` → `t('tracking.scrub', 'Playback position')` in time-deck.tsx |
| shard-018-F31 | applied | `rounded-t-2xl shadow-2xl` → `rounded-t-lg shadow-lg` in time-deck.tsx |
| shard-018-F32 | applied | `bg-amber-500/80` → `bg-warning/80` in time-deck.tsx |
| shard-018-F33 | applied | beyond-range pill → `border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning` in time-deck.tsx |
| shard-018-F34 | applied | Stops toggle pressed → `border-primary bg-primary/10 text-primary` in time-deck.tsx |
| shard-018-F35 | applied | Legs toggle pressed violet → `border-primary bg-primary/10 text-primary` in time-deck.tsx |
| shard-018-F36 | applied | `motion-reduce:animate-none` added to pending day segment in time-deck.tsx |
| shard-018-F37 | applied | focus rings on exit, restart, prev/next, play, speed chips, five toggles, trip header, leg cards (ring-offset-1); trip lock `ring-inset`; range input ring-offset-2 in time-deck.tsx |
| shard-018-F38 | applied | loading `<p>` → two `Skeleton`s (import added; `history.isLoading` branch kept); error/empty `py-1` → `py-6`, error `text-destructive` → `text-muted-foreground` in time-deck.tsx |
| shard-018-F39 | applied | square controls `rounded-lg` → `rounded-md`, `shadow-sm transition-colors`, `hover:bg-accent hover:text-accent-foreground`; play `shadow` → `shadow-sm`; speed chips likewise in time-deck.tsx |
| shard-018-F40 | applied | `border-primary/50` → `border-primary` on speed/follow/places; Ignitions pressed → primary wash in time-deck.tsx |
| shard-018-F41 | applied | `font-bold` → `font-semibold` on speed readout, trip chip title, leg card title in time-deck.tsx |
| shard-018-F42 | applied | `fmtSecs` takes `t()` unit strings; ` km` suffixes → `t('tracking.km', 'km')` in time-deck.tsx; keys in en.json + ar.json |
| shard-018-F43 | applied | `timeFmt`/`fullFmt` built from `i18n.language` inside ScrubRow/LegRail, memoised, in time-deck.tsx |
| shard-018-F44 | applied | `hover:bg-destructive/15` → `hover:bg-destructive/10` in time-deck.tsx |
| shard-018-F45 | applied | current-leg chip `text-[10px] font-semibold` → `text-[10.5px] font-medium` in time-deck.tsx |
| shard-018-F46 | applied | `aria-label` (same key as `title`) added to five toggles and trip-lock button in time-deck.tsx |
| shard-018-F47 | applied | `dir="ltr"` on the range input in time-deck.tsx |
| shard-018-F48 | applied | head `py-1.5` → `py-2 bg-muted/60`; body `px-3 py-2.5` → `p-3` in time-deck.tsx |
| shard-018-F49 | applied | locked trip chip / leg card: solid fill → 12% bg + 50% border + full-strength text (inline); `text-white`/`#fff`/`text-white/80` replaced (branches kept) in time-deck.tsx |
| shard-018-F50 | applied | `rounded-xl` → `rounded-lg` in vehicle-card.tsx |
| shard-018-F51 | applied | `shadow-xl` → `shadow-md` in vehicle-card.tsx |
| shard-018-F52 | applied | dot `h-2.5 w-2.5` → `h-1.5 w-1.5`, `aria-hidden="true"` in vehicle-card.tsx |
| shard-018-F53 | applied | focus rings on close/Focus/Replay; close hover → accent in vehicle-card.tsx |
| shard-018-F54 | applied | plate `text-lg font-bold` → `text-[17px] font-semibold leading-tight` in vehicle-card.tsx |
| shard-018-F55 | applied | `text-[10px] text-muted-foreground/80` → `text-[10.5px] text-muted-foreground` in vehicle-card.tsx |
| shard-018-F56 | applied | Focus/Replay → `<Button variant="outline" size="sm">` / `<Button size="sm">` with same onClick; per-icon size classes dropped in vehicle-card.tsx |
| shard-018-F57 | applied | `tsFmt` built from `i18n.language`, memoised, in vehicle-card.tsx |
| shard-018-F58 | applied | tooltip font → Plex Sans stack; title `font-weight:600`; plate `600 14px 'IBM Plex Mono'` + tabular-nums in tracking-map.tsx |
| shard-018-F59 | applied | `#d6d9e0/#1f3a5f/#fff/#6b7280/#b45309` → `hsl(var(--border/--primary/--card/--muted-foreground/--warning))` in tracking-map.tsx |
| shard-018-F60 | applied | `i18n.t()` for Route start/end, beyond-range line, km/h, km, h/m units in tooltip builders; `translate="no"` on Maps link; keys `tracking.routeStart/routeEnd/beyondRangeLine` added to en.json + ar.json |
| shard-018-F61 | applied | `aria-label="Google Maps"` on the tooltip anchor in tracking-map.tsx (focus rule would need index.css — reference file, not touched; browser default outline remains) |
| shard-018-F62 | applied | marker chip font → `'IBM Plex Mono',ui-monospace,monospace` in tracking-map.tsx |
| shard-018-F63 | applied | `infoTimeFmt` resolves locale from `i18n.language` at call time, cached per locale in a Map, in tracking-map.tsx |
Gates: tsc ok, lint-diff ok (770 baseline / 770 now / 0 new)
APPLIED: 63 SKIPPED: 0
