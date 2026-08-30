# Fix log — shard-017
| Finding | Status | Detail |
|---|---|---|
| shard-017-F01 | applied | added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1` to the four buttons in tracking-page.tsx:478, :517, :534, :547 |
| shard-017-F02 | applied | `animate-pulse bg-success` → `animate-pulse motion-reduce:animate-none bg-success` tracking-page.tsx:506 |
| shard-017-F03 | skipped | needs-ruling — moving the inline refresh into a DegradedStrip deletes a branch + handler (C-B2 precedent requires explicit owner go); additive alternative applied via F01/F08 (ring + `hover:bg-accent`) |
| shard-017-F04 | applied | pill base → `inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur`; state tints `border-success/40 bg-success/10 text-success` / `border-border bg-muted text-muted-foreground` / `border-warning/40 bg-warning/10 text-warning` tracking-page.tsx:495-500 |
| shard-017-F05 | applied | `text-destructive` → warning tint (via F04); dot `bg-destructive` → `bg-warning` tracking-page.tsx:508 |
| shard-017-F06 | applied | `h-9 w-9` → `h-8 w-8` on :478, :534, :547; pill `h-9` → `h-8` :495 |
| shard-017-F07 | applied | `shadow` → `shadow-sm` on :478, :534, :547; pill shadow dropped per F04 recipe :495 |
| shard-017-F08 | applied | `hover:bg-card` → `hover:bg-accent hover:text-accent-foreground` + `transition-colors` on :478, :537, :547; :517 `hover:bg-muted` → same; :536 selected → `+ hover:bg-primary/90` |
| shard-017-F09 | applied | `rounded-full` → `rounded-md` on :478, :534, :547; refresh button :517 → `rounded-sm`; pill stays `rounded-full` |
| shard-017-F10 | applied | added `aria-pressed={fullscreen}` tracking-page.tsx:546 |
| shard-017-F11 | applied | added `aria-expanded={panelOpen}` tracking-page.tsx:477 |
| shard-017-F12 | skipped | low confidence; notes defer to owner (glass recipe over map tiles) |
| shard-017-F13 | skipped | low confidence (page-padding rule extrapolated to an overlay) |
| shard-017-F14 | applied | connecting dot → `animate-pulse motion-reduce:animate-none bg-muted-foreground` tracking-page.tsx:507 |

Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 11 SKIPPED: 3
