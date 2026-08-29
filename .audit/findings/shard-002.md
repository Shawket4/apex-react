# Findings — shard-002

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/shared/lib/maps/google-provider.tsx` | 777 | audited | Map tile style hexes (`darkMapStyle`/`lightMapStyle`) and route/circle/trail colours (`#3b82f6`) are map-only hues — allowed by the palette rule ("third hues only in charts/maps"): no rule. Inline `style={{ bottom: 128 + bottomOffset }}` control offset: no rule. Container has no radius/border (leaflet has `rounded-lg`); map viewport chrome is provisional only (§12.6) and is set by callers: no rule. |
| `src/shared/lib/maps/leaflet-provider.tsx` | 529 | audited | Tile URLs, polyline halo/casing/core hues, `dashArray`: map-only, no rule. `z-[1000]` for in-map controls sits above Leaflet's own panes (400–1000); §0.5 has no tier for in-map layers: no rule. Attribution box (`font-size:10px; border-radius:6px`): no rule. |
| `src/shared/lib/maps/map-pool.ts` | 121 | no UI content | Google Map singleton; no classes/JSX. |
| `src/shared/lib/maps/marker-svg.ts` | 248 | no UI content | SVG artwork for map markers; colours are passed in by callers and rendered on a map (third hues allowed there). Shadow/sheen recipes are map artwork: no rule. |
| `src/shared/lib/maps/types.ts` | 143 | no UI content | Types only. |
| `src/shared/lib/prefetch/assets.ts` | 28 | no UI content | |
| `src/shared/lib/prefetch/chunks.ts` | 147 | no UI content | |
| `src/shared/lib/prefetch/forms.ts` | 63 | no UI content | |
| `src/shared/lib/prefetch/index.ts` | 19 | no UI content | |
| `src/shared/lib/prefetch/intent.ts` | 24 | no UI content | Implements the §5.2 / C-B5 pointer+focus+touch triple — consistent with the reference. |
| `src/shared/lib/prefetch/routes.ts` | 81 | no UI content | |
| `src/shared/scope/index.ts` | 2 | no UI content | |
| `src/shared/scope/scope.ts` | 222 | no UI content | Pure date/URL logic; Cairo-day boundaries via `shared/lib/cairo` as C-I2 requires. |
| `src/shared/scope/use-scope.ts` | 95 | no UI content | Hook without JSX or classes; URL-backed state matches vercel "Navigation & State". |

## Findings

### shard-002-F01 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/lib/maps/google-provider.tsx:757` — `title="Center on markers"` / `aria-label="Center map on markers"` (and `:770-771` `title="Toggle satellite"` / `aria-label="Toggle satellite view"`)
- **Rule:** design-system §14 C-I4 "all aria/sr-only strings through `t()`"; §9 "Copy, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)"
- **Current:** four hard-coded English strings on the two icon-only map controls.
- **Expected:** `aria-label={t('common.centerMap', { defaultValue: 'Center map on markers' })}` etc., as `scope-bar.tsx:109` / `theme-toggle.tsx:25` do.
- **Change:** `class-level` (additive): import `useTranslation` from `react-i18next`, call `const { t } = useTranslation()` inside `GoogleMapView`, and wrap the four strings in `t(key, { defaultValue })`. Keys: `maps.centerOnMarkers`, `maps.toggleSatellite`. `out-of-shard: src/shared/i18n/locales/en.json, ar.json` (add the keys; `defaultValue` keeps EN working until then).
- **Notes:** `title` and `aria-label` may share one key each. Same defect in the Leaflet provider (F10) — use the same keys.

### shard-002-F02 · blocker · high · buttons & controls
- **Where:** `src/shared/lib/maps/google-provider.tsx:763` — `variant={isSatellite ? 'default' : 'secondary'}`
- **Rule:** design-system §14 C-B4 "`aria-pressed` for toggles (tiles, presets), `aria-expanded` for disclosure"; §5.2 scope presets "`variant` flips `default`↔`outline`, `aria-pressed`"
- **Current:** the satellite toggle communicates its state only by variant swap; no `aria-pressed`.
- **Expected:** `aria-pressed={isSatellite}` alongside the variant swap (`scope-date-picker.tsx:132-136`).
- **Change:** `class-level` (additive): add `aria-pressed={isSatellite}` to the satellite `<Button>`.
- **Notes:** none.

### shard-002-F03 · should · medium · radius/border/shadow
- **Where:** `src/shared/lib/maps/google-provider.tsx:755` — `className="h-9 w-9 rounded-full shadow-lg backdrop-blur-md bg-card/90 hover:bg-card"` (and `:766-767` on the satellite button)
- **Rule:** design-system §4 "Elevation is reserved for controls and floating layers: `shadow-sm` on filled/outline Button variants… `shadow-lg` on Dialog, CommandDialog, Sheet"; §4 "`rounded-md` Button… `rounded-md` is re-asserted on sm/lg so radius never changes with size" (§5.1); §5.1 variants table — `secondary` "not rendered anywhere in the reference", `outline` is the chrome/floating control variant; §14 C-C4 "`hover:bg-accent` on chrome"
- **Current:** `variant="secondary"` with a pill radius, a dialog-depth shadow, a translucent card fill and a `hover:bg-card` hover.
- **Expected:** the reference's floating control is `Button variant="outline"`: `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`, `rounded-md` (`button.tsx:11-17`; header search / scope trigger).
- **Change:** `class-level`: on both buttons `variant="secondary"` → `variant="outline"` (satellite: `isSatellite ? 'default' : 'outline'`); className `h-9 w-9 rounded-full shadow-lg backdrop-blur-md bg-card/90 hover:bg-card` → `h-8 w-8 rounded-md backdrop-blur-md` (drop `shadow-lg`, `rounded-full`, `bg-card/90`, `hover:bg-card`; keep `backdrop-blur-md` for legibility over tiles — no rule against it). Satellite: drop the `!isSatellite && 'bg-card/90 hover:bg-card'` branch's classes (keep the conditional expression, make it `!isSatellite && ''` or leave the branch intact with no classes — do not delete the branch).
- **Notes:** `h-8` follows §14 C-B3 "chrome rows `h-8`" and matches the Leaflet control (F11) so the two providers look identical (`types.ts:4-6` promises the user "can't tell which provider is active"). Backdrop-blur stays.

### shard-002-F04 · nit · high · buttons & controls
- **Where:** `src/shared/lib/maps/google-provider.tsx:760` — `<Locate className="h-4 w-4" />` (and `:773` `<Layers className="h-4 w-4" />`)
- **Rule:** design-system §5.1 "Icons inside a Button are 16px, by rule… icons inside a Button carry no size classes (`button.tsx:7`, §15.4)"
- **Current:** dead `h-4 w-4` overrides on icons inside `<Button>`.
- **Expected:** bare `<Locate />` / `<Layers />` (`header.tsx:23`).
- **Change:** `class-level`: remove `className="h-4 w-4"` from both icons.
- **Notes:** no visual change.

### shard-002-F05 · should · medium · radius/border/shadow
- **Where:** `src/shared/lib/maps/google-provider.tsx:53-54` — `box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08) !important; border: 1px solid rgba(0,0,0,0.07) !important;`
- **Rule:** design-system §4 "`shadow-md` on every floating menu (Popover, DropdownMenuContent…)"; §3 "Hairlines: bare `border`… → `--border`; one hairline token, set globally"; §3 "No hex/rgb in any dashboard or shell TSX"
- **Current:** the Google info window (a floating popover surface) gets a bespoke two-layer rgba shadow and rgba borders (`:54`, `:59`), plus a hard-coded `#94a3b8` close-glyph colour in dark mode (`:66`) and a `0 4px 24px rgba(0,0,0,0.5)` dark shadow (`:60`).
- **Expected:** Popover surface: `rounded-md border bg-popover shadow-md` (`popover.tsx:22`) — Tailwind `shadow-md` = `0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)`; border `hsl(var(--border))`.
- **Change:** `class-level` (CSS string): `.gm-style-iw-c` `box-shadow` → `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`; `border: 1px solid rgba(0,0,0,0.07)` → `1px solid hsl(var(--border))`; `.dark .gm-style-iw-c` `border-color` → `hsl(var(--border))` and drop its separate `box-shadow` override (token border already switches in dark); `.dark .gm-ui-hover-effect > span { background-color: #94a3b8 }` → `hsl(var(--muted-foreground))`. Keep `border-radius: 12px` (= `rounded-lg`, §4) — optionally `var(--radius)`.
- **Notes:** `!important` is needed to beat Google's inline styles; keep it.

### shard-002-F06 · nit · medium · buttons & controls
- **Where:** `src/shared/lib/maps/google-provider.tsx:64-65` — `.gm-ui-hover-effect { … opacity: 0.5 !important; } .gm-ui-hover-effect:hover { opacity: 1 !important; }`
- **Rule:** design-system §5.4 "Dialog/Sheet close: `absolute end-4 top-4 opacity-70 hover:opacity-100`"
- **Current:** info-window close at 50% resting opacity.
- **Expected:** 70% resting, 100% hover (`dialog.tsx:56`).
- **Change:** `class-level` (CSS string): `opacity: 0.5` → `opacity: 0.7`.
- **Notes:** `inset-inline-end: 6px` on that rule is already logical — good.

### shard-002-F07 · should · medium · motion
- **Where:** `src/shared/lib/maps/google-provider.tsx:124-164` — `function smoothFlyTo(… durationMs = 800)` driving `requestAnimationFrame`
- **Rule:** vercel-rules "Animation" bullet "Honor `prefers-reduced-motion` (provide reduced variant or disable)"; design-system §8 "Reduced motion… opt-out is per element (`motion-reduce:animate-none`…)"
- **Current:** an 800 ms eased camera tween runs on marker double-click and on focus-sentinel changes regardless of the user's motion preference.
- **Expected:** every animation in the reference carries a reduced-motion opt-out (§8, C-M2).
- **Change:** `class-level` (additive, JS): at the top of `smoothFlyTo`, `if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { map.setCenter(target); map.setZoom(targetZoom); return token; }` — the same branch the function already takes when `startCenter` is missing.
- **Notes:** `map.panTo` calls for `PAN_FOLLOW_IDS` are the Maps SDK's own short animation; no rule covers them.

### shard-002-F08 · should · low · RTL/i18n/a11y
- **Where:** `src/shared/lib/maps/google-provider.tsx:267` — `keyboardShortcuts: false,`
- **Rule:** vercel-rules "Touch & Interaction" bullet "Drag/swipe/pinch/path gestures need tap/click and keyboard alternatives unless essential"
- **Current:** the map's built-in keyboard panning/zooming (arrow keys, +/−) is switched off; the only keyboard-reachable map actions are the two overlay buttons and the SDK zoom control.
- **Expected:** keyboard alternative for pan/zoom gestures.
- **Change:** `class-level` (option value): `keyboardShortcuts: false` → `keyboardShortcuts: true`, or leave as is if the owner confirms it was disabled deliberately (no comment explains it).
- **Notes:** Low confidence — the option may have been disabled to stop the map swallowing arrow keys inside form dialogs. Leaflet (`keyboard` default true) currently differs, so the two providers behave differently.

### shard-002-F09 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:516-524` — `<Button size="icon" variant="secondary" … title="Fit to content">` `<Locate … />`
- **Rule:** vercel-rules "Accessibility" bullet "Icon-only buttons need `aria-label`"; anti-patterns "Icon buttons without `aria-label`"
- **Current:** icon-only button with `title` only; no accessible name from `aria-label`.
- **Expected:** `aria-label` as on the Google provider's equivalent (`google-provider.tsx:758`) and every shell icon button (`theme-toggle.tsx:25`).
- **Change:** `class-level` (additive): add `aria-label={t('maps.centerOnMarkers', { defaultValue: 'Center map on markers' })}` (see F10 for `t`).
- **Notes:** use the same key as F01 so both providers announce identically.

### shard-002-F10 · blocker · high · RTL/i18n/a11y
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:521` — `title="Fit to content"`
- **Rule:** design-system §14 C-I4 "all aria/sr-only strings through `t()`"; §9 (C-I4)
- **Current:** hard-coded English tooltip.
- **Expected:** `t()` with `defaultValue`.
- **Change:** `class-level` (additive): `const { t } = useTranslation()` in `LeafletMapView`; `title={t('maps.centerOnMarkers', { defaultValue: 'Center map on markers' })}`. `out-of-shard: src/shared/i18n/locales/en.json, ar.json` (add key; shared with F01/F09).
- **Notes:** wording unified with the Google control (F01) — `types.ts:4-6` says the user should not be able to tell which provider is active.

### shard-002-F11 · should · medium · buttons & controls
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:517-519` — `size="icon" variant="secondary" className="h-8 w-8 rounded-md shadow-md"`
- **Rule:** design-system §5.1 variants table — `secondary` "not rendered anywhere in the reference"; §4 "`shadow-sm` on filled/outline Button variants… `shadow-md` on every floating menu"; §14 C-C4 "`hover:bg-accent` on chrome"
- **Current:** secondary variant (`bg-secondary` = muted fill, no border) with a menu-depth `shadow-md`.
- **Expected:** `Button variant="outline"` `h-8 w-8` — `border border-input bg-background shadow-sm hover:bg-accent` (`button.tsx:11-17`, sidebar collapse `h-8 w-8`).
- **Change:** `class-level`: `variant="secondary"` → `variant="outline"`; className `h-8 w-8 rounded-md shadow-md` → `h-8 w-8 rounded-md backdrop-blur-md` (drop `shadow-md`; add `backdrop-blur-md` to match the Google control after F03).
- **Notes:** after F03 + F11 both providers render the same `outline h-8 w-8 rounded-md` control.

### shard-002-F12 · should · medium · spacing
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:513` — `className="absolute end-3 z-[1000] flex flex-col gap-1.5"`
- **Rule:** design-system §1 8px `gap-2` — "header control gap" (`header.tsx:15`); the Google provider's identical control stack uses `gap-2` (`google-provider.tsx:749`)
- **Current:** `gap-1.5` (6px) between stacked map controls.
- **Expected:** `gap-2` (8px) — the control-to-control step.
- **Change:** `class-level`: `gap-1.5` → `gap-2`.
- **Notes:** only one button renders today, so no visible change until a second control is added; fixes the provider mismatch.

### shard-002-F13 · nit · high · buttons & controls
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:523` — `<Locate className="h-4 w-4" />`
- **Rule:** design-system §5.1 "icons inside a Button carry no size classes" (§15.4)
- **Current:** dead size override inside `<Button>`.
- **Expected:** bare `<Locate />`.
- **Change:** `class-level`: remove `className="h-4 w-4"`.
- **Notes:** none.

### shard-002-F14 · should · medium · motion
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:27-31` — `.custom-marker:hover { transform: scale(1.08); transition: transform 0.18s ease; z-index: 1000; }`
- **Rule:** design-system §8 "Hover: colour only, `transition-colors`… Nothing scales, lifts or changes shadow"; vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"
- **Current:** markers grow 8% on hover with a 180 ms transform transition, no reduced-motion guard.
- **Expected:** no scale on hover (§8); if any motion is kept it needs a reduced-motion variant.
- **Change:** `class-level` (CSS string): remove `transform: scale(1.08); transition: transform 0.18s ease;` from `.custom-marker:hover`, keeping `z-index: 1000` (raise-on-hover is stacking, not motion). Alternatively wrap the two declarations in `@media (prefers-reduced-motion: no-preference) { … }`.
- **Notes:** the Google provider has no marker hover effect, so removal also aligns the providers.

### shard-002-F15 · should · high · motion
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:48` — `transition: all 0.2s ease;` (and `:60` on `.leaflet-popup-close-button`)
- **Rule:** vercel-rules "Animation" bullet "Never `transition: all`—list properties explicitly"; anti-patterns "`transition: all`"; design-system §8 "Hover: colour only, `transition-colors`"
- **Current:** `transition: all` on the zoom-control anchors and the popup close button.
- **Expected:** colour-only transitions (`transition-colors` = `color, background-color, border-color, text-decoration-color, fill, stroke` 150 ms).
- **Change:** `class-level` (CSS string): both `transition: all 0.2s ease` → `transition: background-color 0.15s ease, color 0.15s ease`.
- **Notes:** none.

### shard-002-F16 · blocker · high · colour roles
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:52` — `.leaflet-control-zoom a:hover { background: rgba(59, 130, 246, 0.1); color: #2563EB; }` (also `:72` `rgba(59,130,246,0.15)` / `#60a5fa`; `:62` `.leaflet-popup-close-button:hover { background: rgba(239,68,68,0.1); color: #dc2626; }`; `:79` `.dark .leaflet-control-attribution a { color: #93c5fd; }`)
- **Rule:** design-system §0.2 palette comment (`index.css:7-19`): "Two hues, one job each. Navy marks anything you can act on… Adding a third accent colour breaks the whole scheme, so don't."; §3 "Actionable (navy)… Hover / keyboard highlight `hover:bg-accent hover:text-accent-foreground`… every hover reads as 'navy = actionable'"
- **Current:** the zoom buttons hover to Tailwind blue-600/blue-400 on a blue-500 wash, the popup close hovers to red-600 on a red wash, attribution links are blue-300 — these are UI controls, not map features, so the map exemption does not apply.
- **Expected:** chrome hover `bg-accent` + `text-accent-foreground` (`button.tsx:18`); close button neutral with opacity change (§5.4, see F21); links `text-primary`.
- **Change:** `class-level` (CSS string): `.leaflet-control-zoom a:hover` → `background: hsl(var(--accent)); color: hsl(var(--accent-foreground));` and delete the separate `.dark .leaflet-control-zoom a:hover` colours (tokens switch in dark) or set them to the same token pair; `.leaflet-popup-close-button:hover` → `background: hsl(var(--accent)); color: hsl(var(--accent-foreground));`; `.dark .leaflet-control-attribution a` → `color: hsl(var(--primary));`.
- **Notes:** these rules are injected as a string, so the tokens must be written as `hsl(var(--x))`, not Tailwind classes.

### shard-002-F17 · should · medium · colour roles
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:41` — `background: rgba(255,255,255,0.9)` (and `:47` `color: #374151`, `:46` `border-bottom: 1px solid rgba(0,0,0,0.1)`, `:54` `rgba(255,255,255,0.8)`, `:57` `background: #f8fafc`, `:59` `color: #6b7280`, `:64-78` dark hexes `#0f172a`, `rgba(30,37,53,0.9)`, `#cbd5e1`, `#1e2535`, `#e2e8f0`, `#94a3b8`)
- **Rule:** design-system §3 "No hex/rgb in any dashboard or shell TSX; the print block reads the tokens"; §0.2 token roles (`--card` surfaces, `--foreground`/`--muted-foreground` text, `--border` hairlines); §3 "Header glass `bg-background/80 backdrop-blur`"
- **Current:** the injected Leaflet chrome (zoom control, attribution, popup, container ground) is painted with Tailwind slate/gray hexes and rgba whites/blacks, with a hand-maintained `.dark` block that approximates the dark tokens.
- **Expected:** token-driven colours so light/dark follow `index.css` automatically — e.g. control glass `hsl(var(--card) / 0.9)`, text `hsl(var(--foreground))`, secondary `hsl(var(--muted-foreground))`, hairlines `hsl(var(--border))`, map ground `hsl(var(--muted))`, popup `hsl(var(--popover))` / `hsl(var(--popover-foreground))`.
- **Change:** `class-level` (CSS string): replace each literal with the token listed above; the `.dark` overrides for `.leaflet-container`, `.leaflet-control-zoom`, `.leaflet-control-zoom a`, `.leaflet-popup-content-wrapper/.leaflet-popup-tip`, `.leaflet-control-attribution` then only need to keep declarations that are not colour (shadow), or may be reduced to the same token values. Do not remove the `.dark` selectors themselves.
- **Notes:** the Google info-window block already uses `hsl(var(--card, …))` for its dark background (`google-provider.tsx:58`) — same technique.

### shard-002-F18 · should · medium · radius/border/shadow
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:34-35` — `box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.05);` (also `:42` zoom control `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)`, `:38` tip shadow)
- **Rule:** design-system §4 "`shadow-md` on every floating menu (Popover…)"; "`shadow-sm` on filled/outline Button variants"; §3 hairlines → `--border`
- **Current:** popup wrapper uses Tailwind's `shadow-xl` values; the zoom control (a button group) uses a single-layer `shadow-md`-ish value; borders are rgba blacks.
- **Expected:** popup = Popover depth `shadow-md` (`0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)`), border `hsl(var(--border))`; zoom control = control depth `shadow-sm` (`0 1px 2px 0 rgb(0 0 0 / .05)`).
- **Change:** `class-level` (CSS string): `.leaflet-popup-content-wrapper` box-shadow → the `shadow-md` value, border → `1px solid hsl(var(--border))`; `.leaflet-control-zoom` box-shadow → the `shadow-sm` value; `.dark .leaflet-control-zoom` box-shadow → same `shadow-sm` value.
- **Notes:** `border-radius: 12px` on the popup = `rounded-lg`, consistent with the Google info window (F05).

### shard-002-F19 · nit · low · buttons & controls
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:40` — `.leaflet-control-zoom { border: none; border-radius: 8px; …}` and `:49` `width: 40px; height: 40px; line-height: 40px; font-size: 18px;` (`:86` 36px below 640px)
- **Rule:** design-system §4 "10px `rounded-md` Button, SelectTrigger…"; §14 C-B3 "chrome rows `h-8`"; §4 "Border. 1px everywhere"
- **Current:** the zoom button group is 8px-radius, borderless, 40px-tall buttons (36px on phones).
- **Expected:** control radius `rounded-md` (10px, token-derived), 1px `--border` hairline, 32px (`h-8`) control height — the overlay Button beside it is `h-8 w-8 rounded-md` after F11.
- **Change:** `class-level` (CSS string): `border-radius: 8px` → `10px` (or `calc(var(--radius) - 2px)`); `border: none` → `border: 1px solid hsl(var(--border))`; `width/height/line-height: 40px` → `32px` and `font-size: 18px` → `16px`; drop or align the 640px override to the same 32px.
- **Notes:** low confidence on the height — Leaflet's zoom anchors are third-party chrome, and a larger touch target may have been deliberate; the radius/border part is high confidence.

### shard-002-F20 · should · medium · motion
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:401` — `map.flyTo([info.lat, info.lng], 18, { duration: 0.75 });`
- **Rule:** vercel-rules "Animation" bullet "Honor `prefers-reduced-motion`"; design-system §8 reduced-motion opt-out per element
- **Current:** 750 ms fly-to on marker double-click, unconditional.
- **Expected:** instant `setView` when the user prefers reduced motion (Leaflet's own `animate: false`).
- **Change:** `class-level` (JS option): `{ duration: 0.75 }` → `{ duration: 0.75, animate: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches }`.
- **Notes:** mirrors F07 on the Google provider.

### shard-002-F21 · nit · medium · buttons & controls
- **Where:** `src/shared/lib/maps/leaflet-provider.tsx:58-61` — `.leaflet-popup-close-button { color: #6b7280; font-size: 18px; padding: 4px 8px; border-radius: 4px; transition: all 0.2s ease; }`
- **Rule:** design-system §5.4 "Dialog/Sheet close: `absolute end-4 top-4 opacity-70 hover:opacity-100`… `rounded-sm`"
- **Current:** popup close is a grey glyph with a 4px radius and a colour/background hover (red — see F16).
- **Expected:** the close-button recipe — inherit `currentColor`, `opacity: 0.7`, hover `opacity: 1`, `border-radius` 8px (`rounded-sm`).
- **Change:** `class-level` (CSS string): `color: #6b7280` → `color: inherit; opacity: 0.7`; `border-radius: 4px` → `8px`; `.leaflet-popup-close-button:hover` → `opacity: 1` (background/colour per F16 or none).
- **Notes:** the hue part is F16; this is the recipe part.

## Summary
FINDINGS: 21 (blocker 5 / should 11 / nit 5)
