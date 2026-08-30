# Findings — shard-017

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/features/tracking/api.ts` | 132 | no UI content | Fetchers, Cairo wall-clock helpers, query keys. Uses `Intl.DateTimeFormat` with `Africa/Cairo` for day boundaries (matches C-I2 engine split). |
| `src/features/tracking/playback.ts` | 103 | no UI content | Pure replay math. |
| `src/features/tracking/schemas.ts` | 174 | no UI content | Zod wire shapes. `STATUS_COLOR` (lines 160-167) is a hex map consumed by the map/marker layer — third hues are permitted in maps (§3 "third hues only in charts/maps"); `no rule` for the specific values. Its consumers (`components/status-chips`, `map/*`) are in shard-018. |
| `src/features/tracking/tracking-page.tsx` | 673 | audited | Map-first page; no page frame, panel or list, so §1/§6/§7 page recipes do not apply (`no rule` for a full-bleed map layout). All copy/aria goes through `t()`; logical utilities only (`ms-1`, `md:end-3`, `inset-x-*`). URL state via `useSearchParams` (Vercel "Navigation & State" satisfied). |
| `src/features/tracking/url.ts` | 74 | no UI content | URL (de)serialiser. |
| `src/features/tracking/use-history.ts` | 441 | no UI content | Data hook; `TRIP_HUES` RGB triples feed deck.gl leg colours (map hues — `no rule`). |
| `src/features/tracking/use-live-fleet.ts` | 222 | no UI content | SSE hook, no JSX. |

## Findings
### shard-017-F01 · blocker · high · buttons & controls / focus
- **Where:** `src/features/tracking/tracking-page.tsx:477` — `className="pointer-events-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-card/90 shadow backdrop-blur hover:bg-card"` (same on `:516`, `:533`, `:545`)
- **Rule:** design-system §4 "Focus ring. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element (C-B1)" | §14 C-B1 "`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere" | vercel-rules "Focus States" bullet "Interactive elements need visible focus: `focus-visible:ring-*` or equivalent"
- **Current:** four raw `<button>`s (fleet panel opener `:473`, badge refresh `:512`, satellite toggle `:522`, fullscreen `:541`) carry no `focus-visible:` classes; keyboard focus shows only the browser default outline over a map.
- **Expected:** every clickable in the reference has the ring — e.g. fleet tile `dashboard.tsx:735-747`, Button base `shared/ui/button.tsx:7`.
- **Change:** `class-level` — append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1` to each of the four button `className`s (`:477`, `:516`, `:533`, `:545`).
- **Notes:** These float over the map, not inside an `overflow-hidden` card, so the plain outset ring (no `ring-inset`) is correct.

### shard-017-F02 · blocker · high · motion
- **Where:** `src/features/tracking/tracking-page.tsx:505` — `fleet.connection === 'live' && 'animate-pulse bg-success'`
- **Rule:** design-system §8 "`animate-pulse` on skeletons and on the live/connecting badge dot, both with `motion-reduce:animate-none` (C-M2)" | §14 C-M2 | vercel-rules "Animation" bullet "Honor `prefers-reduced-motion` (provide reduced variant or disable)"
- **Current:** `animate-pulse` with no reduced-motion opt-out.
- **Expected:** `animate-pulse motion-reduce:animate-none` (ConnectionBadge dot, `dashboard.tsx:227`).
- **Change:** `class-level` — `'animate-pulse bg-success'` → `'animate-pulse motion-reduce:animate-none bg-success'`.
- **Notes:** Apply the same guard if F14 adds the pulse to the connecting state.

### shard-017-F03 · blocker · medium · buttons & controls / states
- **Where:** `src/features/tracking/tracking-page.tsx:511-520` — `{fleet.connection === 'down' && ( <button type="button" onClick={fleet.refresh} …`
- **Rule:** design-system §14 C-B2 "the strip's Button is the retry; the badge shows state only" | §7 "Retry is always a human action … retry lives only in the DegradedStrip" (`:262`, `:258`)
- **Current:** the connection pill embeds an inline icon-only refresh button when the stream is down — the exact pattern the owner removed from the dashboard's ConnectionBadge on 2026-08-29.
- **Expected:** badge = state only; retry = a compact `DegradedStrip` (`flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]` + `Button variant=outline size=sm h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning hover:text-warning` with `RefreshCw`, `dashboard.tsx:1018-1047`).
- **Change:** `structural` — move `fleet.refresh` into a DegradedStrip-recipe strip rendered under the top bar while `fleet.connection === 'down'` (message `t('tracking.conn.down', …)`, retry Button as above) and leave the pill as state only. Removing the inline button deletes a conditional branch + handler, which the standing constraints forbid without an explicit owner go — flag for the owner exactly as C-B2 was; do not apply unilaterally. Additive alternative that needs no deletion: keep the inline button but give it the ring (F01) and `hover:bg-accent` (F08).
- **Notes:** The `FleetPanel` (shard-018) may already host a strip; check before adding a second retry (C-B2's point was one retry per condition).

### shard-017-F04 · should · high · pills / type
- **Where:** `src/features/tracking/tracking-page.tsx:494` — `'flex h-9 items-center gap-1.5 rounded-full border bg-card/90 px-3 font-mono text-[10px] font-semibold uppercase tracking-wider shadow backdrop-blur'`
- **Rule:** design-system §5.3 "ConnectionBadge `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium` + state tint (`border-X/40 bg-X/10 text-X`; connecting `border-border bg-muted text-muted-foreground`) + 6px dot" | §14 C-T3 "ConnectionBadge recipe is *the* status pill" | §3 "Status tint recipe `border-X/40 bg-X/10 text-X` … never a solid status fill"
- **Current:** a 36px-tall mono 10px uppercase eyebrow-styled pill on a `bg-card/90` glass ground; state is carried by text colour only (no tinted border/background); `shadow` on a pill.
- **Expected:** `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium` with live `border-success/40 bg-success/10 text-success`, connecting `border-border bg-muted text-muted-foreground`, down `border-warning/40 bg-warning/10 text-warning` (`dashboard.tsx:216-249`).
- **Change:** `class-level` — base → `'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur'`; state branches → `'border-success/40 bg-success/10 text-success'` / `'border-border bg-muted text-muted-foreground'` / `'border-warning/40 bg-warning/10 text-warning'` (the last per F05). If a fixed height is wanted to align with the sibling icon buttons keep `h-8` (C-B3), not `h-9`.
- **Notes:** The label text is `t('tracking.conn.…')` — sans, not mono (only figures are mono, §2). Dot size `h-1.5 w-1.5` already matches C-C8.

### shard-017-F05 · should · high · colour roles
- **Where:** `src/features/tracking/tracking-page.tsx:499` — `: 'text-destructive'` and `:507` — `fleet.connection === 'down' && 'bg-destructive'`
- **Rule:** design-system §7 "ConnectionBadge states: … down `border-warning/40 bg-warning/10 text-warning` + static dot" | §3 "Warning … 'not live' badge … degraded / attention, not failure"; "Destructive … critical / negative"
- **Current:** stream-down state is painted destructive (red).
- **Expected:** warning (amber-adjacent) — the reference treats a down stream as "degraded", not a failure (`dashboard.tsx:240-248`).
- **Change:** `class-level` — `'text-destructive'` → `'text-warning'` (or the full tint per F04); dot `'bg-destructive'` → `'bg-warning'`.
- **Notes:** `STATUS_COLOR.offline`/`geofence` in `schemas.ts` are map hues and are not affected.

### shard-017-F06 · should · medium · buttons & controls
- **Where:** `src/features/tracking/tracking-page.tsx:477` — `grid h-9 w-9 shrink-0 place-items-center` (also `:533`, `:545`, and the pill `h-9` at `:494`)
- **Rule:** design-system §5.1 "Call-site override convention … chrome rows are `h-8`" | §14 C-B3 "chrome rows `h-8` (hamburger, theme/language toggles now `h-8 w-8`)"
- **Current:** the map's chrome row (fleet opener, connection pill, satellite, fullscreen) is 36px.
- **Expected:** 32px chrome controls (`header.tsx:18`, `sidebar.tsx:276`, `theme-toggle.tsx:25`).
- **Change:** `class-level` — `h-9 w-9` → `h-8 w-8` on `:477`, `:533`, `:545`; pill `h-9` → `h-8` (or drop the fixed height per F04).
- **Notes:** Touch target drops to 32px; the reference already accepts this for its own chrome row.

### shard-017-F07 · should · medium · radius/border/shadow
- **Where:** `src/features/tracking/tracking-page.tsx:477` — `rounded-full border bg-card/90 shadow backdrop-blur` (also `:494`, `:533`, `:545`)
- **Rule:** design-system §4 "Elevation is reserved for controls and floating layers: `shadow-sm` on filled/outline Button variants … `shadow-md` on every floating menu … `shadow-lg` on Dialog"
- **Current:** bare `shadow` (Tailwind's base shadow), a step that does not exist in the reference ladder.
- **Expected:** controls carry `shadow-sm` (`shared/ui/button.tsx:11-17`).
- **Change:** `class-level` — `shadow` → `shadow-sm` on `:477`, `:494`, `:533`, `:545`.

### shard-017-F08 · should · medium · colour roles / hover
- **Where:** `src/features/tracking/tracking-page.tsx:477` — `hover:bg-card` (also `:536`, `:545`) and `:516` — `hover:bg-muted`
- **Rule:** design-system §14 C-C4 "`hover:bg-accent` on chrome and menu items" | §3 "Hover / keyboard highlight `hover:bg-accent hover:text-accent-foreground` … ghost/outline Buttons" | vercel-rules "Hover & Interactive States" bullet "Buttons/links need `hover:` state"
- **Current:** chrome buttons hover from `bg-card/90` to opaque `bg-card` (opacity-only change, barely visible); the refresh button hovers to `bg-muted` (the calendar-day recipe, not chrome); the satellite button's selected branch (`:535`) has no hover at all.
- **Expected:** `hover:bg-accent hover:text-accent-foreground` for chrome (`button.tsx:14`, `sidebar.tsx:231`); solid navy state hovers via `hover:bg-primary/90` (`button.tsx:11`).
- **Change:** `class-level` — `hover:bg-card` → `hover:bg-accent hover:text-accent-foreground` on `:477`, `:536`, `:545`; `:516` `hover:bg-muted` → `hover:bg-accent hover:text-accent-foreground`; `:535` `'bg-primary text-primary-foreground'` → `'bg-primary text-primary-foreground hover:bg-primary/90'`. Add `transition-colors` to each (§8 "Hover: colour only, `transition-colors`").

### shard-017-F09 · should · medium · radius/border/shadow
- **Where:** `src/features/tracking/tracking-page.tsx:477` — `rounded-full border` (icon buttons at `:477`, `:516`, `:533`, `:545`)
- **Rule:** design-system §4 radius table: "pill `rounded-full` — badges, chips, dots, severity bar, avatar, calendar days, scrollbar thumb"; "10px `rounded-md` — Button … palette quick-action tile" | §5.1 "`icon` h-9 w-9 … `rounded-md` is re-asserted on sm/lg so radius never changes with size"
- **Current:** icon buttons are circular; the reference reserves `rounded-full` for badges/dots/calendar days and gives every button `rounded-md`.
- **Expected:** `rounded-md` icon buttons (`button.tsx:7`, `header.tsx:18` hamburger, `theme-toggle.tsx:25`).
- **Change:** `class-level` — `rounded-full` → `rounded-md` on `:477`, `:533`, `:545`; the 20px refresh button at `:516` (if kept, see F03) → `rounded-sm`. The connection pill (`:494`) stays `rounded-full` — it is a badge.
- **Notes:** Judgment call: these are floating map controls rather than header chrome; the reference has no map, so confidence is medium.

### shard-017-F10 · should · medium · a11y
- **Where:** `src/features/tracking/tracking-page.tsx:541-548` — `<button type="button" onClick={toggleFullscreen} aria-label={t('tracking.fullscreen', 'Fullscreen')}`
- **Rule:** design-system §14 C-B4 "`aria-pressed` for toggles (tiles, presets)" | §9 "`aria-pressed` on toggles"
- **Current:** a two-state toggle (enter/exit fullscreen, icon swaps) with no `aria-pressed`; screen readers hear only "Fullscreen" in both states.
- **Expected:** `aria-pressed={fullscreen}` as the sibling satellite button already does (`:524`) and the fleet tile (`dashboard.tsx:733`).
- **Change:** `class-level` (additive attribute) — add `aria-pressed={fullscreen}` to the button at `:541`.

### shard-017-F11 · nit · medium · a11y
- **Where:** `src/features/tracking/tracking-page.tsx:473-480` — `<button type="button" onClick={() => setPanelOpen(true)} aria-label={t('tracking.fleet', 'Fleet')}`
- **Rule:** design-system §14 C-B4 "`aria-expanded` for disclosure (KPI)" | §9 "`aria-expanded` on disclosure buttons"
- **Current:** the button that opens the FleetPanel exposes no expanded state.
- **Expected:** disclosure buttons carry `aria-expanded` (`dashboard.tsx:424`).
- **Change:** `class-level` (additive attribute) — add `aria-expanded={panelOpen}` to the button at `:473`.
- **Notes:** If `FleetPanel` (shard-018) renders as a Radix Sheet with its own trigger semantics, this is still harmless.

### shard-017-F12 · nit · low · colour roles
- **Where:** `src/features/tracking/tracking-page.tsx:477` — `bg-card/90 … backdrop-blur` (also `:494`, `:536`, `:545`)
- **Rule:** design-system §3 "Header glass `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60` — sticky header — content shows through"
- **Current:** a second glass recipe (`bg-card/90 backdrop-blur`, no `supports-[backdrop-filter]` fallback step).
- **Expected:** the shell's one glass recipe (`header.tsx:15`).
- **Change:** `class-level` — `bg-card/90 backdrop-blur` → `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60` on `:477`, `:494`, `:536`, `:545`.
- **Notes:** Low confidence — the header rule is for a sticky bar; over map tiles `bg-card` (white) may read better than graphite `bg-background`. Owner's call; recorded for completeness.

### shard-017-F13 · nit · low · spacing
- **Where:** `src/features/tracking/tracking-page.tsx:581` — `className="absolute inset-x-2 bottom-2 z-20 flex justify-center md:inset-x-auto md:bottom-auto md:end-3 md:top-16 md:block"`
- **Rule:** design-system §1 "12px `gap-3`, `p-3` … page padding (mobile), gap between every top-level block"; 8px is "rows inside a panel"
- **Current:** the selected-vehicle card is inset 8px from the viewport edge on phones while the top bar (`:472` `p-3`) and the desktop position (`md:end-3`) use 12px.
- **Expected:** 12px page-level inset everywhere (`dashboard.tsx:99` `p-3`).
- **Change:** `class-level` — `inset-x-2 bottom-2` → `inset-x-3 bottom-3`.
- **Notes:** Extrapolating a page-padding rule to an overlay; low confidence.

### shard-017-F14 · nit · medium · motion / states
- **Where:** `src/features/tracking/tracking-page.tsx:506` — `fleet.connection === 'connecting' && 'bg-muted-foreground'`
- **Rule:** design-system §7 "ConnectionBadge states: … connecting `border-border bg-muted text-muted-foreground` + pulsing muted dot"
- **Current:** connecting dot is static; only the live dot pulses.
- **Expected:** connecting dot pulses too (`dashboard.tsx:227`, `:243`).
- **Change:** `class-level` — `'bg-muted-foreground'` → `'animate-pulse motion-reduce:animate-none bg-muted-foreground'`.

## Summary
FINDINGS: 14 (blocker 3 / should 7 / nit 4)
