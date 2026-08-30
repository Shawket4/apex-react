# Deferred findings — shared group

| id | status | note |
|---|---|---|
| shard-001-F05 | skipped | ruling R-4 — compact vs exact money is a role split, `formatCompactCurrency`'s suffix accepted as-is |
| shard-002-F08 | skipped | `keyboardShortcuts: false` is an interaction/behaviour change, not presentational; design system has no rule on map key handling and the arrow-key-swallowing risk inside dialogs stands (R-10 spirit) |
| shard-002-F19 | applied | high-confidence half only: `.leaflet-control-zoom` `border: none; border-radius: 8px` → `1px solid hsl(var(--border))` + `calc(var(--radius) - 2px)`, `src/shared/lib/maps/leaflet-provider.tsx:43`. Button height left at 40px/36px — the finding's own note flags the third-party zoom-anchor touch target as possibly deliberate |
| shard-003-F07 | skipped | ruling R-9 — nested `<button>` risk; the div + role/tabIndex/aria-expanded/onKeyDown fallback (F08) stands |
| shard-003-F39 | applied | grip-handle reveal `duration-150` → `duration-200` (§14 C-M1), `src/shared/ui/draggable.tsx:192` |
| shard-007-F25 | skipped | ruling R-7 — the `form.tsx` FormMessage precedence fix is one of the structural items kept out; without it a schema i18n key would render raw to the user |
| shard-017-F03 | skipped | ruling R-10 / C-B2 precedent — moving the inline refresh into a DegradedStrip deletes a branch + handler; needs an explicit owner go. Additive ring/`hover:bg-accent` alternative already applied in-shard (F01/F08) |
| shard-017-F12 | skipped | no ruling covers it; the finding itself defers to the owner (`bg-card/90` may read better than graphite `bg-background` over map tiles) |
| shard-017-F13 | applied | selected-vehicle overlay `inset-x-2 bottom-2` → `inset-x-3 bottom-3` (§1 12px page inset), `src/features/tracking/tracking-page.tsx:583` |

`npx tsc --noEmit` clean · `lint-diff.py`: NEW 0.

APPLIED: 3 SKIPPED: 6
