# Findings — shard-024

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/pages/trip-replay/playback-core.ts` | 268 | no UI content | pure geometry/interpolation math; no JSX, no classes, no strings |
| `src/pages/trip-replay/replay-engine.ts` | 369 | no UI content | rAF playback state machine; no JSX or classes. `PLAYBACK_SPEEDS` is data consumed by the HUD |
| `src/pages/trip-replay/replay-model.ts` | 646 | audited | only UI surface is the hard-coded map colour constants (`LEG_COLORS`, `OSRM_COLOR`, `TRUCK_COLOR`, `STOP_PIN_COLOR`, …, `:20-32`). §3's third-hue rule exempts charts/maps and §13 D-C2 records hard-coded map marker hex as an accepted trips pattern, so **no finding**. Everything else is date/geometry logic |
| `src/pages/trip-replay/trip-replay.tsx` | 642 | audited | — |
| `src/pages/trip-replay/use-trip-playback-history.ts` | 159 | no UI content | query/paging hook, no JSX or classes |
| `src/widgets/trip-replay-hud/index.ts` | 2 | no UI content | re-export barrel |
| `src/widgets/trip-replay-hud/trip-replay-hud.tsx` | 297 | audited | — |

Coverage notes (`no rule`):
- The full-screen takeover frame (`fixed inset-0` page that escapes `PageShell`) has **no rule** in the design system — §14b R-14 covers pages rendered inside the shell only. The takeover's *existence* is therefore not flagged; only the values inside it are graded.
- Fixed HUD width `w-64` and the `after:` pseudo-element hit-area expansion have **no rule**; both are reasonable and unflagged.
- `role="group"` on the mode/speed segmented controls: §12.3's tray uses `role="tablist"`, but that is provisional and describes a *tab* tray, not a mode toggle — **no rule**, not flagged.

## Findings

### shard-024-F01 · blocker · high · colour roles
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:196` — `rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400`
- **Rule:** design-system §0.2 (the governing palette comment, `app/index.css:7-19`) "Two hues, one job each… Adding a third accent colour breaks the whole scheme, so don't"; §3 "Non-token colours in the reference: the two scrims and `theme-color`"
- **Current:** the dwell badge (and its dot at `:197`, `bg-amber-500`) uses raw Tailwind `amber-500/600/400` palette classes with a hand-written dark-mode branch, outside the token system. This is chrome, not a chart or map.
- **Expected:** a stopped/attention state is the `--warning` token with the status tint recipe `border-X/40 bg-X/10 text-X` (§3 "Status tint recipe"; the reference DegradedStrip uses `border-warning/40 bg-warning/10 text-warning`, `dashboard.tsx:1018-1047`). Tokens already carry their own dark values so the `dark:` branch disappears.
- **Change:** `class-level` — `:196` `bg-amber-500/15 … text-amber-600 dark:text-amber-400` → `border border-warning/40 bg-warning/10 text-warning`; `:197` `bg-amber-500` → `bg-warning`.
- **Notes:** `--warning` in dark mode is deliberately close to `--money` (§0.2) — that is expected, not a bug. Keep `font-bold` fixed separately (F04).

### shard-024-F02 · blocker · high · radius/border/shadow
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:130` — `pointer-events-auto w-64 rounded-xl border bg-card/85 p-3 shadow-xl backdrop-blur-md`
- **Rule:** design-system §14 ruling **C-R1** "token family: `rounded-lg` everywhere; `rounded-xl` retired"; §4 "every card, panel and tile uses the token family (`rounded-lg`); `rounded-xl` is not used, so one variable moves every surface"
- **Current:** the HUD card is `rounded-xl` (a fixed Tailwind 12px constant that does not follow `--radius`).
- **Expected:** `rounded-lg` — the radius every card/panel/tile carries (`dashboard.tsx:135`, `:417`, `:735`).
- **Change:** `class-level` — `rounded-xl` → `rounded-lg`.
- **Notes:** same 12px today; the point of the ruling is that changing `--radius` must move this surface too.

### shard-024-F03 · blocker · high · RTL/i18n/a11y
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:178` — `<Gauge className="h-3 w-3" />`
- **Rule:** vercel-rules "Accessibility" bullet "Decorative icons need `aria-hidden=\"true\"`"; design-system §9 "**ARIA**: … `aria-hidden` on dots/chevrons/severity bars/sentinel"
- **Current:** every purely decorative icon in this shard is exposed to assistive tech. Sites: HUD `Gauge` (`:178`), the pinging dwell dot (`:197`), `RotateCcw` (`:228`), `Pause`/`Play` (`:247`, `:249`), `FastForward` (`:285`), `Crosshair` (`:291`); page `ArrowLeft` (`trip-replay.tsx:513`), `TriangleAlert` (`:536`), both `Loader2` (`:545`, `:558`), `Layers` (`:587`). The Buttons carrying `aria-label`/visible text still announce their icon children.
- **Expected:** the reference marks decorative glyphs `aria-hidden` (`dashboard.tsx:226`, `:756`).
- **Change:** `class-level` (attribute-level) — add `aria-hidden="true"` to each icon listed above.
- **Notes:** `Moon` at `:145` is the exception — it is the *only* carrier of the "night window" meaning; see F04.

### shard-024-F04 · blocker · medium · RTL/i18n/a11y
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:145-148` — `<Moon className="h-3.5 w-3.5 text-primary" aria-label={t('tripReplay.hud.night', 'Night window')} />`
- **Rule:** vercel-rules "Accessibility" bullet "Use semantic HTML (`<button>`, `<a>`, `<label>`, `<table>`) before ARIA"; "Decorative icons need `aria-hidden=\"true\"`"
- **Current:** `aria-label` is placed on a bare `<svg>` with no role. `aria-label` on a generic/`graphics-*` element is not reliably exposed, so the night state is announced to nobody while the icon is still in the accessibility tree.
- **Expected:** meaning carried by text, as the reference does (status is a labelled pill or a `title`, `dashboard.tsx:216-249`, `:756`).
- **Change:** `class-level` — mark the icon `aria-hidden="true"` and put the label in a sibling `<span className="sr-only">{t('tripReplay.hud.night', 'Night window')}</span>`. (Adding the sibling span is additive, not structural.)
- **Notes:** keep the existing translation key; do not remove the icon.

### shard-024-F05 · should · high · type
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:140` — `font-mono text-lg font-black tabular-nums`
- **Rule:** design-system §2 "Weights used: 400, 500 (`font-medium`), 600 (`font-semibold`). **700 is never used** in the reference (and Plex Mono isn't loaded above 600)"
- **Current:** weight 900 on the elapsed clock; also `font-black` on the speed-selector digits (`:264`), and `font-bold` (700) on the HUD eyebrows (`:157`, `:168`), the dwell badge (`:196`) and the page `h1` (`trip-replay.tsx:518`).
- **Expected:** `font-semibold` (600) is the ceiling; the reference's headline figure is `font-mono text-[22px] font-semibold leading-none tabular-nums` (`dashboard.tsx:436`). `font-black` on `font-mono` renders at the loaded 600 anyway (`index.html:17`), so the class is also inert here.
- **Change:** `class-level` — `:140` `font-black` → `font-semibold`; `:264` `font-black` → `font-semibold`; `:157`/`:168`/`:196` `font-bold` → `font-semibold`; `trip-replay.tsx:518` `font-bold` → `font-semibold`.
- **Notes:** §13 D-T8 records `font-bold` as a *trips deviation the dashboard wins over*, so this is not a sanctioned gap-fill.

### shard-024-F06 · should · high · type
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:157` — `text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70`
- **Rule:** design-system §2 eyebrow row "**10** · `text-[10px]` · **600, `uppercase tracking-wider text-muted-foreground`**"; §10 `Eyebrow text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`; §14 ruling **C-C5** "`text-muted-foreground` for secondary *text*; opacity only for secondary parts of an already-coloured element"
- **Current:** 9px, weight 700, and the muted token faded to `/70`. Two sites: `:157` (Driven) and `:168` (Speed).
- **Expected:** the one eyebrow style — `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` (`dashboard.tsx:382`, `:427`).
- **Change:** `class-level` — both sites: `text-[9px] font-bold … text-muted-foreground/70` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`.
- **Notes:** 9.5px in §2 is the fleet-tile *status line*, not a label; there is no 9px label size in the scale.

### shard-024-F07 · should · high · type
- **Where:** `src/pages/trip-replay/trip-replay.tsx:524` — `<span className="text-sm font-semibold" dir="ltr">{detail.car_no_plate || '—'}</span>`
- **Rule:** design-system §2 "Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, **plates**, dl values, bar amounts…"; §2 row 17 "Fleet tile plate (Latin) … mono so plates align"
- **Current:** the number plate renders in the sans face.
- **Expected:** mono, as every plate in the reference (`dashboard.tsx:744`, `:843`).
- **Change:** `class-level` — `text-sm font-semibold` → `font-mono text-sm font-semibold tabular-nums`.
- **Notes:** `dir="ltr"` is correct and must stay; an Arabic plate would need sans (§2 "Arabic text is always sans"), but this field is the Latin plate string.

### shard-024-F08 · should · high · motion
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:197` — `<span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-amber-500" />`
- **Rule:** design-system §8 "**Looping**: `animate-pulse` on skeletons and on the live/connecting badge dot, **both with `motion-reduce:animate-none`** (C-M2)"; vercel-rules "Animation" bullet "Muted decorative loops must stop under `prefers-reduced-motion`"
- **Current:** three unguarded looping animations in the shard: `animate-ping` here, and `animate-spin` at `trip-replay.tsx:545` and `:558`.
- **Expected:** every loop carries `motion-reduce:animate-none` (`dashboard.tsx:227`, `skeleton.tsx`).
- **Change:** `class-level` — add `motion-reduce:animate-none` to all three sites.
- **Notes:** §13 D-ST4 already records "no motion-reduce guard" on trips' `Loader2` as a deviation, so trips is not cover for it here.

### shard-024-F09 · should · medium · loading/empty/error states
- **Where:** `src/pages/trip-replay/trip-replay.tsx:556-559` — `<div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>`
- **Rule:** design-system §7 "Loading is always the `Skeleton` primitive shaped like the slot"; §13 row **D-ST4** "Pending indicator — Dash: skeletons only; no spinner / Trips: `Loader2 animate-spin`… (no motion-reduce guard)"
- **Current:** the whole map area is a bare centred spinner while the match detail loads.
- **Expected:** a `Skeleton` shaped like the slot it replaces — for a full-bleed map viewport, one `Skeleton` filling the area (the reference's shape-matched skeletons, `dashboard.tsx:123-128`, `:162`).
- **Change:** `structural` — replace the spinner div with `<Skeleton className="absolute inset-0 rounded-none" />` (or `h-full w-full`), importing `Skeleton` from `@/shared/ui/skeleton`. If the fixer prefers to keep the spinner, F08's `motion-reduce:animate-none` is the minimum.
- **Notes:** the second spinner (`:545`, "Loading GPS trace…") is a *background* refetch indicator beside live content — §12.6 provisional sanctions that shape ("background refetch indicator … while data stays visible"), so it is not flagged here beyond F08.

### shard-024-F10 · should · medium · radius/border/shadow
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:130` — `shadow-xl backdrop-blur-md`
- **Rule:** design-system §4 "Shadow … `shadow-sm` on filled/outline Button variants…; `shadow-md` on every floating menu…; `shadow-lg` on Dialog, CommandDialog, Sheet"
- **Current:** `shadow-xl` — a depth above every tier in the scale; and the play button at `:233` adds `shadow-lg shadow-primary/30`, a *coloured* shadow that exists nowhere in the reference.
- **Expected:** floating panels top out at `shadow-lg` (`dialog.tsx:49`, `sheet.tsx:30`); controls get `shadow-sm` (`button.tsx:11-17`) and no shadow tint.
- **Change:** `class-level` — `:130` `shadow-xl` → `shadow-lg`; `:233` `shadow-lg shadow-primary/30` → `shadow-sm`.
- **Notes:** the satellite toggle at `trip-replay.tsx:583` uses bare `shadow` (Tailwind default), also off-scale → `shadow-sm`.

### shard-024-F11 · should · medium · buttons & controls
- **Where:** `src/pages/trip-replay/trip-replay.tsx:211-229` — `flex rounded-lg border bg-muted/40 p-0.5` / option `rounded px-2.5 py-1 text-xs font-semibold … bg-primary text-primary-foreground`
- **Rule:** provisional (§12.3) "**Segmented tray**: `inline-flex max-w-full flex-wrap gap-0.5 rounded-md border bg-muted/40 p-0.5`; options `h-7 gap-1.5 rounded px-2.5 text-xs font-medium`, active `bg-background text-foreground shadow-sm`, inactive `text-muted-foreground hover:text-foreground`"
- **Current:** the tray is `rounded-lg` (not `rounded-md`), options are `font-semibold` with no `h-7`, and the active option is a solid `bg-primary` fill rather than the raised `bg-background … shadow-sm` chip. The HUD speed selector (`trip-replay-hud.tsx:255-272`) repeats the same three divergences.
- **Expected:** the §12.3 tray recipe, so the app's two segmented trays and this one read alike.
- **Change:** `class-level` — tray `rounded-lg` → `rounded-md`; options `font-semibold` → `font-medium` and add `h-7`; active `bg-primary text-primary-foreground` → `bg-background text-foreground shadow-sm`. Apply to both `trip-replay.tsx:211/222/227` and `trip-replay-hud.tsx:255/264/270`.
- **Notes:** provisional (§12.3) — the design system has no primary rule for a mode tray, so a fixer may reasonably defer this pending an owner ruling. `aria-pressed` and the `after:` hit-area expansion are correct and must be preserved.

### shard-024-F12 · should · medium · colour roles
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:101` — `border-primary/50 bg-primary/10 text-foreground`
- **Rule:** design-system §14 ruling **C-C1** "`bg-primary/10 text-primary` (+ `border-primary` on tiles)"; §3 "Current / selected wash — `bg-primary/10 text-primary`"
- **Current:** the active `HudToggle` keeps `text-foreground` and fades the border to an unlisted `/50` alpha.
- **Expected:** the selected wash is `bg-primary/10 text-primary`, with a full-strength `border-primary` where the element carries a border (`dashboard.tsx:737` post-ruling, `sidebar.tsx:230`).
- **Change:** `class-level` — `border-primary/50 bg-primary/10 text-foreground` → `border-primary bg-primary/10 text-primary`.
- **Notes:** the inactive branch (`border-border bg-card/60 text-muted-foreground hover:text-foreground`) is left alone apart from F13.

### shard-024-F13 · should · medium · colour roles
- **Where:** `src/pages/trip-replay/trip-replay.tsx:505` — `border-b bg-card/70 px-4 py-2 backdrop-blur`
- **Rule:** design-system §3 "Header glass — `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60`"; §14 ruling **C-C2** "three steps: `/60` head band, `/50` hover, `/40` wells"
- **Current:** three ad-hoc `bg-card` alphas across the shard — takeover header `bg-card/70` (`:505`), timeline band `bg-card/70` (`:627`), HUD card `bg-card/85` (`hud:130`), HUD toggle `bg-card/60` (`hud:102`), satellite toggle `bg-card/90` (`:584`) — and none carries the `supports-[backdrop-filter]:` fallback the reference glass surface uses, so on a browser without backdrop-filter these read as translucent panels over a map.
- **Expected:** the reference's one glass recipe, `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60` (`header.tsx`), for the header and timeline bands; opaque `bg-card` for the floating panels that sit over the map.
- **Change:** `class-level` — `:505` and `:627` `bg-card/70 backdrop-blur` → `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60`; `hud:130` `bg-card/85` → `bg-card` (keep `backdrop-blur-md` if the fixer prefers the glass look, but pair it with a `supports-[backdrop-filter]:` alpha); `hud:102` `bg-card/60` → `bg-card`; `:584` `bg-card/90` → `bg-card`.
- **Notes:** these panels float over a *map*, so legibility, not just coherence, depends on the opaque fallback.

### shard-024-F14 · should · medium · RTL/i18n/a11y
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:27-29` — `` if (h > 0) return `${h}h ${m}m`; `` … `` return `${s}s`; ``
- **Rule:** design-system §14 ruling **C-I4** "all aria/sr-only strings through `t()`"; §9 "**Copy**, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks"; §13 row **D-I2** "Untranslated strings — Dash: all `t()`"
- **Current:** `formatDurationShort` hard-codes the English unit letters `h`/`m`/`s`; these are rendered into the dwell badge (`:199`) and the skipped-stops line (`:206`), both user-visible in Arabic.
- **Expected:** every visible string resolves through `t()` (`dashboard.tsx:950-960`).
- **Change:** `class-level` — thread `t` into the formatter (e.g. accept a units object or return `{h,m,s}` and format at the call sites with `t('tripReplay.hud.hours', 'h')` etc.). Requires adding keys to `en.json`/`ar.json` (`out-of-shard: src/shared/i18n/locales/en.json`, `out-of-shard: src/shared/i18n/locales/ar.json`).
- **Notes:** `formatDurationShort` and `formatElapsed` are **exported** (`index.ts:1`) and also consumed by `widgets/trip-replay-timeline` / `-leg-rail` (shard-025) — do not change their signatures destructively; add an optional parameter. `formatElapsed`'s `H:MM:SS` output is digits only and needs no translation.

### shard-024-F15 · should · medium · RTL/i18n/a11y
- **Where:** `src/widgets/trip-replay-hud/trip-replay-hud.tsx:161` — `{state.kmDriven.toFixed(1)}{' '}`
- **Rule:** design-system §2 "Number formatting: `formatNumber(v, decimals)` = `Intl.NumberFormat(undefined)` with fixed fraction digits… Decimals by unit: counts/money 0, litres 2, **km 0**, km/L 1"; vercel-rules "Locale & i18n" bullet "Numbers/currency: use `Intl.NumberFormat` not hardcoded formats"
- **Current:** raw `toFixed(1)` / `Math.round()` at `hud:161`, `:163`, `:179` and `trip-replay.tsx:401-402`. `toFixed` always emits Latin digits with a `.` separator, so Arabic never gets its own grouping/decimal marks.
- **Expected:** `formatNumber` from `shared/lib/format.ts` (`format.ts:20-23`), the shared helper the reference uses for every figure.
- **Change:** `class-level` — import `formatNumber` from `@/shared/lib/format` and replace `x.toFixed(1)` → `formatNumber(x, 1)` and `Math.round(state.speedKmh)` → `formatNumber(state.speedKmh, 0)` at the five sites.
- **Notes:** §2 says km is 0-dp on the dashboard; §13 D-T15 records trips using 1 dp. Replay km is a live odometer where 1 dp is meaningful — keep 1 dp and only change the engine, unless the owner rules otherwise.

### shard-024-F16 · should · medium · spacing (safe areas)
- **Where:** `src/pages/trip-replay/trip-replay.tsx:503` — `<div className="fixed inset-0 z-50 flex flex-col bg-background">`
- **Rule:** vercel-rules "Safe Areas & Layout" bullet "Full-bleed layouts need `env(safe-area-inset-*)` for notches"; design-system §0.3 "`.safe-top` / `.safe-bottom` map to `env(safe-area-inset-*)`; viewport meta has `viewport-fit=cover`"
- **Current:** the takeover is `fixed inset-0` with `viewport-fit=cover` set globally, so on a notched phone the top bar sits under the status bar and the timeline band / `bottom-3` satellite toggle sit under the home indicator. The app's own shell never needs this because it is not full-bleed; this page is.
- **Expected:** full-bleed surfaces opt into the existing `.safe-top` / `.safe-bottom` helpers (`app/index.css:137-143`).
- **Change:** `class-level` — add `safe-top` to the header (`:505`) and `safe-bottom` to the timeline band wrapper (`:627`); the map overlay wrapper (`:594`) and the satellite toggle (`:583`) sit inside the mapped area and can stay.
- **Notes:** the helpers exist and are unused by the reference precisely because nothing in the reference is full-bleed — this is the first legitimate consumer in the shard.

### shard-024-F17 · should · low · radius/border/shadow (z-index)
- **Where:** `src/pages/trip-replay/trip-replay.tsx:503` — `fixed inset-0 z-50`
- **Rule:** design-system §0.5 "`CONTAINER_Z` = `z-[9999]` (sheets/drawers), `STACKED_CONTAINER_Z` = `z-[10050]`, `OVERLAY_Z` = `z-[10100]`… **[comment]** 'A TRANSIENT overlay always floats above the CONTAINER it was opened from'"; §14 ruling **C-I3** "Sheet imports `CONTAINER_Z`/`STACKED_CONTAINER_Z` instead of literals"
- **Current:** a hard-coded `z-50` literal for a surface that covers the whole app shell. It clears the header (`z-30`) but sits far below every Dialog/Sheet/Popover tier, and it is exactly the kind of literal C-I3 removed elsewhere.
- **Expected:** the shared scale — a full-screen container is `CONTAINER_Z` (`shared/ui/z-index.ts`), the same tier Dialog and Sheet use.
- **Change:** `class-level` — import `CONTAINER_Z` from `@/shared/ui/z-index` and use it in place of `z-50`.
- **Notes:** low confidence because the takeover is not a Radix layer and nothing currently stacks over it; the finding is about using the scale rather than a literal. The map overlay's own `z-10`/`z-20` are local to the takeover's stacking context and are fine.

### shard-024-F18 · nit · medium · colour roles
- **Where:** `src/pages/trip-replay/trip-replay.tsx:525` — `{detail.car_no_plate || '—'}`
- **Rule:** design-system §2 "Inline separator is ` · `; **empty numeric is `—` at `opacity-40`**" (`dashboard.tsx:765`); §14 §13 row D-C11 "Empty value — Dash: `—` at `opacity-40`"
- **Current:** the em-dash placeholder renders at full strength; the HUD leg line does the same (`trip-replay-hud.tsx:188-189`).
- **Expected:** `<span className="opacity-40">—</span>`.
- **Change:** `class-level` — wrap the fallback dash in `<span className="opacity-40">—</span>` at `trip-replay.tsx:525`; at `trip-replay-hud.tsx:188-189` the dash is interpolated into a `t()` argument, so leave it (`no rule` for a dash inside an interpolated string) or move the fallback out of the interpolation — the fixer's call.
- **Notes:** cosmetic only; do not change the `||` fallback logic.

### shard-024-F19 · nit · medium · loading/empty/error states
- **Where:** `src/pages/trip-replay/trip-replay.tsx:261` — `toast.error(t('tripReplay.toast.loadError', 'Could not load this trip.'));`
- **Rule:** design-system §7 "Failures are **inline and persistent** — a strip or muted copy in place — never a toast (the dashboard and shell never call `toast`)"; §13 row **D-ST3** "Feedback channel — Dash: inline, never toast / Trips: Sonner toasts"
- **Current:** load failure and the unmatched case (`:267`) are announced by toast while the user is being navigated away to `/trip-audit`.
- **Expected:** the reference reports failure in place (`DegradedStrip`, `dashboard.tsx:117-122`).
- **Change:** `structural` — would mean rendering an inline error state on the replay route instead of redirecting. **Not recommended without an owner ruling:** a toast is the only channel that survives the redirect, and removing the redirect changes behaviour (the audit forbids deleting branches). Recorded so the owner can rule on D-ST3.
- **Notes:** if D-ST3 is ruled in trips' favour, this finding is void.

### shard-024-F20 · nit · low · spacing
- **Where:** `src/pages/trip-replay/trip-replay.tsx:505` — `flex flex-wrap items-center gap-3 border-b bg-card/70 px-4 py-2 backdrop-blur`
- **Rule:** design-system §14 ruling **C-S1** "page gutters win: header is now `px-3 sm:px-4`"; §1 "Header `h-14 gap-2 px-3 sm:px-4` — the same gutter as the page"
- **Current:** the takeover's own top bar uses a flat `px-4` and `gap-3`, so on a phone its controls sit 4px further in than every other chrome row in the app.
- **Expected:** `gap-2 px-3 sm:px-4` (`header.tsx:15`).
- **Change:** `class-level` — `gap-3 … px-4` → `gap-2 … px-3 sm:px-4`.
- **Notes:** the map overlay wrapper's `gap-3 p-3` (`:594`) is content padding, matches §1's 12px master step, and is not flagged.

## Summary
FINDINGS: 20 (blocker 4 / should 13 / nit 3)
