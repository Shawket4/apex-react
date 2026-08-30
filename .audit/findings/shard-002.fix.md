# Fix log — shard-002
| Finding | Status | Detail |
|---|---|---|
| shard-002-F01 | applied | added `useTranslation` to `GoogleMapView`; four literals → `t('maps.centerOnMarkers'/'maps.toggleSatellite', { defaultValue })` in google-provider.tsx:757-776; keys added to en.json/ar.json |
| shard-002-F02 | applied | added `aria-pressed={isSatellite}` to the satellite `<Button>` in google-provider.tsx:769 |
| shard-002-F03 | applied | both overlay buttons `variant="secondary"` → `variant="outline"` (satellite `isSatellite ? 'default' : 'outline'`); `h-9 w-9 rounded-full shadow-lg backdrop-blur-md bg-card/90 hover:bg-card` → `h-8 w-8 rounded-md backdrop-blur-md`; `!isSatellite && ''` branch kept |
| shard-002-F04 | applied | removed `className="h-4 w-4"` from `<Locate />` and `<Layers />` in google-provider.tsx |
| shard-002-F05 | applied | `.gm-style-iw-c` box-shadow → `shadow-md` values, border → `hsl(var(--border))`; `.dark` border-color → `hsl(var(--border))`, its separate box-shadow override dropped (google-provider.tsx:53-60) |
| shard-002-F06 | applied | `.gm-ui-hover-effect` `opacity: 0.5` → `0.7`; dark close glyph `#94a3b8` → `hsl(var(--muted-foreground))` |
| shard-002-F07 | applied | reduced-motion guard at the top of `smoothFlyTo` (setCenter/setZoom + early return); used `globalThis.matchMedia` to avoid a new `no-undef` lint message on `window` |
| shard-002-F08 | skipped | low confidence (`keyboardShortcuts: false` may be deliberate) |
| shard-002-F09 | applied | added `aria-label={t('maps.centerOnMarkers', …)}` to the Leaflet fit-bounds button |
| shard-002-F10 | applied | `title="Fit to content"` → `t('maps.centerOnMarkers', { defaultValue: 'Center map on markers' })`; `useTranslation` added to `LeafletMapView` |
| shard-002-F11 | applied | `variant="secondary"` → `outline`; `h-8 w-8 rounded-md shadow-md` → `h-8 w-8 rounded-md backdrop-blur-md` |
| shard-002-F12 | applied | control stack `gap-1.5` → `gap-2` in leaflet-provider.tsx |
| shard-002-F13 | applied | removed `className="h-4 w-4"` from `<Locate />` in leaflet-provider.tsx |
| shard-002-F14 | applied | `.custom-marker:hover` — dropped `transform: scale(1.08)` and `transition: transform 0.18s ease`, kept `z-index: 1000` |
| shard-002-F15 | applied | both `transition: all 0.2s ease` → `transition: background-color 0.15s ease, color 0.15s ease` (zoom anchors, popup close) |
| shard-002-F16 | applied | zoom hover, popup-close hover and their `.dark` variants → `hsl(var(--accent))` / `hsl(var(--accent-foreground))`; `.dark .leaflet-control-attribution a` → `hsl(var(--primary))` |
| shard-002-F17 | applied | injected Leaflet chrome repainted with tokens: control glass `hsl(var(--card) / 0.9)`, text `hsl(var(--foreground))`, attribution `hsl(var(--muted-foreground))`, hairlines `hsl(var(--border))`, container `hsl(var(--muted))`, popup `hsl(var(--popover))`/`hsl(var(--popover-foreground))`; `.dark` selectors retained |
| shard-002-F18 | applied | `.leaflet-popup-content-wrapper` box-shadow → `shadow-md` values, border → `hsl(var(--border))`; `.leaflet-control-zoom` (and `.dark`) box-shadow → `shadow-sm` value |
| shard-002-F19 | skipped | low confidence (zoom-anchor height/radius flagged as possibly deliberate third-party touch target) |
| shard-002-F20 | applied | `map.flyTo(…, { duration: 0.75 })` → adds `animate: !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches` |
| shard-002-F21 | applied | `.leaflet-popup-close-button` `color: #6b7280` → `color: inherit; opacity: 0.7`, `border-radius: 4px` → `8px`, hover → `opacity: 1` |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 19 SKIPPED: 2
