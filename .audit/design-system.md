# Apex design system — extracted from the dashboard reference

**Status:** Approved by the owner on 2026-08-29 ("use your rulings"). §0–§10 record what the dashboard does and why; §14 records how each internal conflict was ruled and that the ruling has been applied to the reference files; §12–§13 (trips) remain provisional.

**Primary reference (source of truth):** `src/pages/dashboard/dashboard.tsx` + the primitives it imports (`shared/ui/button.tsx`, `shared/ui/skeleton.tsx`, `shared/lib/format.ts`, `shared/lib/fuel.ts`, `shared/lib/cairo.ts`), the foundation (`src/app/index.css`, `tailwind.config.ts`, `index.html`), and the app shell it renders inside (`widgets/layout`, `sidebar`, `header`, `scope-bar`, `command-palette`, `user-menu`, `theme-toggle`, `language-toggle` and the `shared/ui` primitives those pull in: badge, dialog, sheet, popover, dropdown-menu, select, command, scroll-area, avatar, empty-state, cairo-range-calendar, z-index).

**Secondary reference (gap-fill only, never overrides):** the trips module (`pages/trips`, `widgets/trips-table`, `widgets/trips-statistics`, `widgets/trip-form`, `widgets/trip-*-dialog`, `widgets/terminal-select`) and the `shared/ui` primitives only it uses (page-shell, card, stat-card, tabs, data-table, input, label, textarea, checkbox, searchable-select, multi-select, date-picker, month-year-selector, confirm-dialog, collapsible-section, chart-card, search-input, separator, truncate, toaster).

**How to read this file.** Every value carries the Tailwind class and the resolved px. `why` lines are tagged: **[comment]** = taken from a code comment; **[inferred]** = the rule the usage implies (kept modest); **[unknown]** = no basis found. Evidence is `file:line` relative to `src/` (foundation files at repo root). Where the dashboard did the same job two ways, §14 records the ruling (approved 2026-08-29) and the values in §0–§10 are stated post-ruling. Trips patterns appear only in §12 (gaps) and §13 (deviations).

---

## 0. Foundation

### 0.1 Fonts
| Role | Value | Why |
|---|---|---|
| Sans (everything) | `'IBM Plex Sans Arabic', 'IBM Plex Sans', system-ui, sans-serif` on `body` and Tailwind `font-sans`; weights 400/500/600/700 from Google Fonts | **[comment]** Same superfamily so Arabic and Latin "sit on one skeleton"; most data is Arabic so the Arabic cut leads (`app/index.css:91-95`, `index.html:17-20`) |
| Mono (figures) | `'IBM Plex Mono', ui-monospace, monospace` via `font-mono`; weights 400/500/600 only — there is no bold mono | **[comment]** "the mono carries receipt numbers, plates, litres and money so digits line up down a column" (`index.html:17`, `tailwind.config.ts:17`) |
| Tabular figures | `.font-mono, .tabular-nums { font-variant-numeric: tabular-nums }` — `font-mono` alone is already tabular | **[comment]** proportional digits make stacked columns ragged (`app/index.css:218-224`) |
| Rendering | `antialiased`, `font-feature-settings: 'rlig' 1, 'calt' 1` | **[inferred]** ligatures/contextual alternates for Plex (`app/index.css:89-90`) |
| Mobile inputs | every input/select/textarea/`[cmdk-input]` forced to `16px !important` below 768px | **[comment]** stops iOS auto-zoom on focus (`app/index.css:194-215`) |

### 0.2 Colour tokens (HSL triples; used as `hsl(var(--x))` so `/10`, `/40`, `/90` alpha utilities work)
| Token | Light | Dark | Role (see §4) |
|---|---|---|---|
| `--background` | 210 14% 95% (graphite) | 206 23% 6% | page ground |
| `--foreground` | 210 17% 9% | 210 14% 92% | primary text |
| `--card` / `--popover` | 0 0% 100% | 213 18% 10% | surfaces |
| `--primary` | 217 60% 26% (ink navy) | 217 64% 57% | **anything you can act on** |
| `--primary-foreground` | 218 57% 97% | 218 50% 3% | text on primary |
| `--money` | 37 82% 30% (amber) | 38 71% 58% | **anything someone gets paid** |
| `--money-soft` | 39 67% 94% | 39 37% 11% | amber wash (defined; unused on the dashboard) |
| `--success` | 154 46% 34% | 150 36% 48% | passing status — explicitly not for revenue |
| `--warning` | 42 79% 30% | 38 65% 57% | degraded / needs attention (hue-adjacent to money; in dark mode nearly identical to it) |
| `--destructive` | 6 50% 47% | 8 62% 61% | critical / negative |
| `--muted` (= `--secondary`) | 210 13% 91% | 215 18% 13% | subdued surfaces, chips, skeletons |
| `--muted-foreground` | 210 8% 42% | 208 8% 57% | labels, hints, secondary copy |
| `--accent` / `--accent-foreground` | 218 38% 92% / = primary | 217 33% 15% / 216 70% 70% | hover & selected tint (pale navy) |
| `--border` (= `--input`) | 213 13% 86% | 212 15% 17% | every hairline; `* { @apply border-border }` so bare `border` needs no colour |
| `--ring` (= `--primary`) | — | — | focus ring |
| `--radius` | 0.75rem (12px) | same | see §5 |

The palette comment (`app/index.css:7-19`) is the governing rule: *"Two hues, one job each. Navy marks anything you can act on; amber marks anything someone gets paid. Everything else is neutral, so colour on this screen is information rather than decoration… Adding a third accent colour breaks the whole scheme, so don't."*

### 0.3 Global CSS behaviour
- Dark mode is class-based (`darkMode: ['class']`, `.dark` token block), driven by next-themes with `defaultTheme="system"` (`tailwind.config.ts:5`, `app/index.css:52`).
- `html { scroll-behavior: smooth }` (`app/index.css:99`).
- WebKit scrollbars 8px, transparent track, thumb `hsl(var(--border))` radius 4px, hover thumb `muted-foreground` (`app/index.css:117-133`). Radix `ScrollArea` thumb is `rounded-full bg-border` (`shared/ui/scroll-area.tsx:34`).
- Number-input spinners removed (`app/index.css:105-114`).
- `.safe-top` / `.safe-bottom` map to `env(safe-area-inset-*)`; viewport meta has `viewport-fit=cover`, `user-scalable=no` (`app/index.css:137-143`, `index.html:7`). Not applied by the dashboard or shell.
- `@tailwindcss/container-queries` is enabled; `.stat-card-full/.stat-card-compact` swap at `@container (min-width: 11rem)` — used by `StatCard` (trips), not by the dashboard (`app/index.css:146-163`).
- Print: footer/nav hidden (the app header and sidebar carry `print:hidden`), white body, `print-color-adjust: exact`; every colour override reads the `:root` tokens (`hsl(var(--x) / a)`) since the 2026-08-29 fix (§15.1).

### 0.4 Breakpoints in use
`sm` 640 (page and header gutter step, hide button labels), `md` 768 (fuel-row gutter), `lg` 1024 (KPI 4-col, fleet/exceptions 2-col, fixed sidebar vs Sheet, inline scope bar). JS: `useIsDesktop` = `(min-width: 1024px)`, `useIsMobile` = `(max-width: 768px)` (`shared/hooks/use-media-query.ts:20-21`). The Tailwind `container` (2xl 1400, padding 2rem) is configured but unused; the dashboard caps itself with `max-w-6xl`.

### 0.5 Z-index scale (`shared/ui/z-index.ts`)
`CONTAINER_Z` = `z-[9999]` (sheets/drawers), `STACKED_CONTAINER_Z` = `z-[10050]`, `OVERLAY_Z` = `z-[10100]` (menus, popovers, selects). **[comment]** "A TRANSIENT overlay always floats above the CONTAINER it was opened from" — dropdowns at z-50 behind a z-[9999] drawer made sidebar menus dead on phones. Header is `z-30`. Dialog and Sheet both use `CONTAINER_Z`; a dialog above a stacked sheet uses `DIALOG_STACKED_Z` = `z-[10060]` (kept in `dialog.tsx`). Two plain containers at the same tier stack by portal mount order — the last one opened is on top — which is what puts the command palette over the mobile sheet; it is not a z-index guarantee (C-I3).

---

## 1. Spacing scale

The dashboard uses Tailwind's default scale with **12px as the master step**. Ladder observed, with the role each step plays:

| Step | Class | Roles on the dashboard | Why |
|---|---|---|---|
| 1px | `gap-px` | lines inside a fleet tile | **[inferred]** densest element on the page (`dashboard.tsx:735`) |
| 2px | `mt-0.5`, `gap-y-0.5`, `space-y-0.5`, `py-0.5` | subtitle under h1; hint under exception label; chip vertical padding; calendar row gap | tightest text stacking (`:106`, `:958`, `:583`) |
| 4px | `space-y-1`, `pb-1`, `gap-y-1`, `gap-1`, `py-1` | dl row rhythm in drawers; fuel-row line gap; chip icon gap; connection pill vertical pad | **[inferred]** "the densest list on the page (4px apart)" (`:495-497`, `:616`, `:218`) |
| 6px | `gap-1.5`, `mb-1.5`, `mt-1.5`, `px-1.5`, `end-1.5` | label→value in KPI cards; icon↔text gaps; tile side padding; chip strip gap; status-dot inset | **[inferred]** icon/label pairing step (`:427`, `:442`, `:579`, `:741`) |
| 8px | `gap-2`, `py-2`, `px-2`, `p-2`, `pt-2` | rows inside a panel (exceptions, category bars); PanelHead vertical pad; tile top pad; header control gap; sidebar footer pad | **[inferred]** "one step below section gap" (`:179`, `:977`, `:1001`, `header.tsx:15`, `sidebar.tsx:254`) |
| 10px | `py-2.5`, `px-2.5`, `mt-2.5` | list-row vertical pad (fuel rows, exception rows, degraded strip); pill horizontal pad; 'largest' label top | **[inferred]** the standard "list row" pad is 12px × 10px (`:616`, `:940`, `:1021`, `:218`) |
| **12px** | `gap-3`, `p-3`, `px-3`, `mt-3`, `mb-3` | **page padding (mobile), gap between every top-level block, KPI grid gap, panel body padding, KPI card padding, drawer padding, dl label↔value gap, legend gap, fleet legend top margin, compact-strip bottom margin** | **[inferred]** one vertical rhythm; the same step is reused at page, card and panel-body level so nothing nests with a different inset (`:99`, `:124`, `:146`, `:425`, `:494`, `:803`, `:1022`) |
| 14px | `mt-3.5` | 'Service vehicles' label top | (`:776`) — see conflict C-S4 |
| 16px | `sm:p-4`, `sm:px-4`, `md:px-4`, `p-4`, `gap-4` | page and header gutter from 640px; fuel-row gutter from 768px; popover padding; sidebar section gap | (`:99`, `header.tsx:15`, `:616`, `popover.tsx:22`, `sidebar.tsx:200`) |
| 24px | `py-6`, `p-6` | empty/error copy vertical pad (all panels, post-ruling C-S3); dialog padding | (`:171`, `dialog.tsx:45`) |
| 64px | `py-16` | EmptyState primitive (shell only) | (`empty-state.tsx:35`) |

**Layout grids.** Page: `mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4` (1152px cap, centred inside the scrolling `<main>`) (`:99`). KPI row: `grid grid-cols-2 gap-3` + `lg:grid-cols-4` (money) / `lg:grid-cols-3` (no money) (`:359`). Fleet+exceptions: `grid gap-3 lg:grid-cols-[1.6fr_1fr]` — fleet gets 1.6 shares because it holds the tile grid (`:134`). Fleet tiles: `grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-2` — auto-fill so the plate grid reflows with no breakpoints (`:713`, `:779`). Exception row: `grid-cols-[3px_1fr_auto] gap-3` (`:940`). Category bar row: `grid-cols-[86px_1fr_64px] gap-2` — fixed label and value columns, flexible bar (`:981`). Fuel row: `grid-cols-[1fr_auto] gap-x-3 gap-y-1` (`:616`).

**Shell dimensions.** Root `flex h-dvh` — **[comment]** "h-dvh (not min-h-dvh) bounds the flex row to the viewport, so the main column becomes its own scroll context instead of letting the whole page scroll past the sidebar" (`layout.tsx:17-20`); `<main class="flex-1 overflow-y-auto overflow-x-hidden">` (`:48`). Sidebar `w-64` / collapsed `w-[72px]` (fits a 36px icon button + `p-3`), brand row `h-16`, nav `gap-4 p-3`, items `h-9 px-3 gap-3`, footer `border-t p-2` (`sidebar.tsx:172-254`). Header `h-14 gap-2 px-3 sm:px-4` — the same gutter as the page (`header.tsx:15`, C-S1). Mobile sidebar Sheet `w-72 max-w-[85vw] p-0` (`layout.tsx:29`). Popover `w-72 p-4`, sideOffset 4, collisionPadding 8 — **[comment]** "Keep the menu on screen. Opened from a narrow drawer on a 375px phone, an end-aligned menu ran 30px off the left edge" (`dropdown-menu.tsx:51-60`, `popover.tsx:13-22`). Dialog `w-[calc(100%-2rem)] max-w-lg gap-4 p-6` — **[comment]** on phones a dialog floats with a margin instead of hitting the screen edges square-cornered (`dialog.tsx:43-45`).

---

## 2. Type scale

The dashboard page uses a **bespoke pixel scale** (arbitrary `text-[Npx]`) for data; the shell stays on Tailwind's `xs/sm/base/lg` scale. Weights used: 400, 500 (`font-medium`), 600 (`font-semibold`). **700 is never used** in the reference (and Plex Mono isn't loaded above 600). `uppercase` appears only in the 10px eyebrow. `italic` appears only on 11px caveats. `tracking-wider` only on the eyebrow; `tracking-tight` only on `DialogTitle`.

| px | Class | Weight / leading / family | Role | Where | Why |
|---|---|---|---|---|---|
| 22 | `text-[22px]` | 600, `leading-none`, **mono** + `tabular-nums` | **KPI value** (+ `text-money` when money) | `:385`, `:436` | **[inferred]** largest figure; mono/tabular so `4.06M` aligns across the row |
| 20/18 | `sm:text-xl` / `text-lg` | 600, `leading-tight`, sans | **Page title** (today's date) | `:103` | one large sans heading; grows one step at sm |
| 18 | `text-lg` | 600, mono, tabular | Exception count (coloured by severity) | `:964` | — |
| 17 | `text-[17px]` | 600, `leading-tight`, mono | Fleet tile plate (Latin) | `:744`, `:788` | tile headline; mono so plates align in the auto-fill grid |
| 15 | `text-[15px]` | 600, mono | Truck-drawer plate | `:843` | one step below the tile |
| 14 | `text-sm` | 600 (price) / 500 (shell) | Fuel-row price (`font-mono tabular-nums text-money`); sidebar nav, dropdown/select items, command items, brand name | `:641`, `sidebar.tsx:228` | shell body size |
| 13 | `text-[13px]` | 500, `leading-snug` | Exception row label | `:960` | row-title size |
| 12.5 | `text-[12.5px]` | 400 | DegradedStrip body | `:1021` | slightly larger than rows |
| 12 | `text-[12px]` | 400 | dl rows in KPI/Truck drawers; category bar rows | `:495`, `:841`, `:981` | body-row size for label/value pairs |
| 12 | `text-xs` (12/16) | 400 / 500 | Fuel-row meta line, litres/km, efficiency (500); **all empty/error copy** (C-S3/C-T2); Button `sm` and the retry; calendar; user-menu email; sidebar tagline | `:625`, `:648`, `:470`, `button.tsx:24` | Tailwind step; same px as above but with a 16px line-height |
| 11.5 | `text-[11.5px]` | 400 | Page subtitle (range · company · updated); KPI detail line; category bar amount (mono) | `:106`, `:442`, `:1001` | the "hint under a figure/title" size (C-T4) |
| 11 | `text-[11px]` | 500 (pill) / 400 | ConnectionBadge and the `Badge` primitive; fleet legend; exception hint; the italic 'needs stream' caveat; palette footer | `:218`, `badge.tsx:6`, `:811`, `:965`, `:883` | status-pill / "hint under a row label" size (C-T4) |
| 10.5 | `text-[10.5px]` | 500 | Neutral chips: fuel method chips and the in-row method tag; end-of-list footer; truck-drawer date | `:589`, `:637`, `:662`, `:855` | chip size (C-T3) |
| **10** | `text-[10px]` | **600, `uppercase tracking-wider text-muted-foreground`** | **Eyebrow**: KPI label, PanelHead, 'largest', 'Service vehicles', sidebar section headings, kbd hint, Arabic plate (no uppercase) | `:382`, `:427`, `:1001`, `:507`, `:776`, `sidebar.tsx:204`, `header.tsx:40`, `:747` | **[inferred]** one label style above every figure and panel |
| 9.5 | `text-[9.5px]` | 600 (tracked) / 400 (untracked) | Fleet tile status line | `:758`, `:802` | smallest text |
| 9 | `text-[9px]` | 400, mono | Fleet tile revenue today · yesterday | `:755` | — |

**Rules that fall out of the usage**
- Figures are mono + tabular (`font-mono tabular-nums`) — KPI values, plates, dl values, bar amounts, the fuel-row price, kbd hints. Arabic text is always sans (`dir="rtl"` plates at `:755`). Rule C-T1: every money figure is `font-mono tabular-nums text-money`.
- Labels recede, figures lead: every label/caption/hint is `text-muted-foreground`; a value inside a muted context is promoted back with `text-foreground` (chip amount `:586`, plate in meta line `:621`).
- The PanelHead aside resets the eyebrow: `font-medium normal-case tracking-normal` — data (a date, totals) drops the uppercase/tracking but keeps 10px and muted (`:1003`).
- Number formatting: `formatNumber(v, decimals)` = `Intl.NumberFormat(undefined)` with fixed fraction digits, non-finite → `'0'` (`shared/lib/format.ts:20-23`). `compactMoney`: ≥1M → `4.06M`, ≥10k → `982k`, else 0-dp; **[comment]** "The exact figures live in the drawers" (`:59-66`). Decimals by unit: counts/money 0, litres 2, km 0, km/L 1, mileage `toFixed(1)`. No currency symbol on the dashboard.
- Dates: date-fns `format()` with no locale is the display engine; day-first everywhere — headline `EEEE d MMMM`, range `d MMM` – `d MMM yyyy`, as-of `HH:mm`, lists and drawers `d MMM yyyy` (C-I2). The scope bar/calendar use `Intl.DateTimeFormat` with `ar-EG`/`en-GB` and `timeZone: 'Africa/Cairo'`; the dashboard's "today" is Cairo's day — **[comment]** "at 00:58 Cairo the UTC date is still yesterday and the headline said so" (`:92-95`, `shared/lib/cairo.ts`).
- Inline separator is ` · `; empty numeric is `—` at `opacity-40` (`:110`, `:574`, `:761`, `:765`).

---

## 3. Colour roles — when each is used

| Role | Classes | Used on | Rule |
|---|---|---|---|
| Actionable (navy) | `bg-primary text-primary-foreground` (filled), `text-primary`, `border-primary`, `ring-ring` | Default Button, brand mark, active preset pill, calendar endpoints, focus rings, fleet tile hover/selected border | **[comment]** navy marks anything you can act on. Focus is an actionable affordance so it takes the navy. |
| Current / selected wash | `bg-primary/10 text-primary` | Active nav link, avatar fallback, palette icon wells, calendar in-range days, fuel "paired" status | **[inferred]** 10% navy wash + full navy foreground = "you are here / this is actionable context" |
| Hover / keyboard highlight | `hover:bg-accent hover:text-accent-foreground`, `focus:bg-accent` (menu items) | ghost/outline Buttons, nav links, dropdown/select/command items | pale navy tint — every hover reads as "navy = actionable". Selected/current state is the `bg-primary/10 text-primary` wash above (C-C1), never the accent |
| Content-row hover | `hover:bg-muted/50` + `transition-colors` | KPI card face, fuel rows, exception rows | **[inferred]** large content surfaces get a half-strength neutral wash, not the accent |
| Money (amber) | `text-money` on figures; `bg-money` on bar fills | KPI money values, fuel price, 'largest' amounts, tile revenue, category bars | **[comment]** "revenue is not a passing status, and reusing the success green for it is what made a figure look like a badge" |
| Success | `text-success`, `bg-success`, `border-success`, `border-success/40 bg-success/10` | live badge, moving tile border+dot, positive revenue delta, fuel efficiency 'good' | passing status only |
| Warning | `text-warning`, `bg-warning`, `border-warning/40 bg-warning/10` (pill), `border-dashed border-warning/40 bg-warning/10` (strip) | 'not live' badge, idling dot, non-critical exceptions, DegradedStrip, efficiency 'average' | degraded / attention, not failure |
| Destructive | `text-destructive`, `bg-destructive`, `focus:text-destructive` | offline dot, critical exception bar+count, negative delta, owed split, sign-out item, efficiency 'poor' | critical / negative; destructive menu item keeps red on focus (`user-menu.tsx:92`) |
| Neutral chip | `bg-muted text-muted-foreground` (+ value `text-foreground`) | method chips, in-row tags, kbd, skeleton, avatar fallback, date summary box | non-status chips are neutral; the number inside is promoted |
| Sub-surface tint | `bg-muted/60` head band · `bg-muted/50` hover · `bg-muted/40` wells (drawers, palette breadcrumb and footer) | — | translucent muted marks "nested, not a new card" — three steps (C-C2). `EmptyState` (`/20`) is not used by the dashboard |
| Status tint recipe | `border-X/40 bg-X/10 text-X` | ConnectionBadge, `Badge` status variants, DegradedStrip, fuel efficiency bg | 10% tint + 40% border + full-strength text; never a solid status fill |
| De-emphasis by opacity | `opacity-70` (yesterday revenue, untracked tile, 'all companies' note, dialog close), `opacity-50` (separator dot, select chevron, disabled), `opacity-40` (em dash), `text-muted-foreground/30` (future days), `/50`, `/60` (palette) | — | **[inferred]** secondary parts of an already-coloured element fade by opacity so they keep the parent hue (amber stays amber) |
| Hairlines | bare `border`, `border-b/t/e`, `divide-y` → `--border`; `border-dashed border-border/60` for dl rows | everywhere | one hairline token, set globally |
| Scrim | `bg-black/50 backdrop-blur-sm` | Dialog and Sheet overlays | hard-coded black, theme-independent |
| Header glass | `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60` | sticky header | content shows through |

Non-token colours in the reference: the two scrims and `theme-color #1b396a` (= `--primary`). No hex/rgb in any dashboard or shell TSX; the print block reads the tokens.

Status → colour maps that must stay shared: `STATUS_STYLES` in `dashboard.tsx:669-676` (moving/idling/stopped/offline/unknown/untracked) and `analyseEvents` classNames in `shared/lib/fuel.ts` — **[comment]** "Centralised to avoid drift between components".

---

## 4. Radius, border, shadow

**Radius token.** `--radius: 0.75rem` → `rounded-lg` = 12px, `rounded-md` = 10px, `rounded-sm` = 8px (`tailwind.config.ts:70-72`). `rounded` (4px) is a Tailwind default. Rule (C-R1): every card, panel and tile uses the token family (`rounded-lg`); `rounded-xl` is not used, so one variable moves every surface.

| Radius | Class | Elements |
|---|---|---|
| 12px (token) | `rounded-lg` | **all** cards: the four top-level panels and KPI cards (post-ruling C-R1; were `rounded-xl`), fleet tiles, exception rows, truck drawer, DegradedStrip, dialog, EmptyState, date-picker summary box, panel/KPI/fleet skeletons |
| 10px | `rounded-md` | Button, SelectTrigger, nav links, brand mark, Skeleton default, popover/menu/select/command surfaces, palette quick-action tile |
| 8px | `rounded-sm` | menu/select/command items, dialog/sheet close, skeleton text bars (C-R2) |
| 0 | `rounded-none` | skeletons standing in for flush list rows (C-R2) |
| 4px | `rounded` | category bar track+fill, kbd chips |
| pill | `rounded-full` | badges, chips, dots, severity bar, avatar, calendar days, scrollbar thumb |

**Border.** 1px everywhere; no `border-2`. Cards are `border bg-card` with **no shadow** — separation is tone (white on graphite) plus a hairline. Border colour is the state channel on tiles: `hover:border-primary`, selected `border-primary bg-primary/10 text-primary`, moving `border-success` (`:743-745`, `:678`). Dashed = "not live / placeholder / degraded": untracked tiles `border-dashed opacity-70` (`:683`), DegradedStrip `border-dashed border-warning/40` (`:1031`), EmptyState `border-dashed` (`empty-state.tsx:35`), dl row dividers `border-dashed border-border/60` (`:497`, `:832`). `overflow-hidden` on every panel/KPI card so the tinted PanelHead band and flush lists clip to the corners (`:135`, `:417`).

**Shadow.** None on any dashboard card, panel, tile or the sidebar/header (header uses blur instead). Elevation is reserved for controls and floating layers: `shadow-sm` on filled/outline Button variants, SelectTrigger, calendar endpoints; `shadow-md` on every floating menu (Popover, DropdownMenuContent, DropdownMenuSubContent, SelectContent); `shadow-lg` on Dialog, CommandDialog, Sheet (`button.tsx:11-17`, `popover.tsx:22`, `dialog.tsx:49`, `sheet.tsx:30`).

**Focus ring.** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on every interactive element (C-B1) — including nav links, calendar days, SelectTrigger and the dialog/sheet close buttons; `ring-inset` on the KPI card face and fuel rows because they sit inside `overflow-hidden` parents that would clip an outset ring (`:431`, `:623`); plain outset on tiles, exception rows, the inline refresh link; `ring-offset-1` on Button/SelectTrigger, `ring-offset-2` on close buttons. Never plain `focus:` — a ring must not appear on mouse click.

---

## 5. Buttons and interactive controls

### 5.1 The Button primitive (`shared/ui/button.tsx`)
cva base: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:… ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`.

| Variant | Classes | Used in the reference |
|---|---|---|
| `default` | `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90` | active preset pill, Apply |
| `outline` | `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground` | header search, scope date trigger, inactive preset pills, mobile filters, **DegradedStrip retry** (the dashboard page's only `<Button>`) |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` | sidebar collapse, theme/language toggles, user-menu trigger, calendar month nav, Cancel |
| `destructive`, `secondary`, `link`, `success` | defined | not rendered anywhere in the reference |

Sizes: `default` h-9 px-4 py-2 (36px); `sm` h-8 px-3 text-xs (32px); `lg` h-11 px-6 text-base (unused); `icon` h-9 w-9. `rounded-md` is re-asserted on sm/lg so radius never changes with size. Hover on solid variants darkens via `/90` alpha; non-solid variants hover to the accent tint. Transition is colour only — no scale, lift, or shadow change on hover/press; there is no `active:` state anywhere in the reference.

**Call-site override convention** (via `cn` = `twMerge(clsx())`, so later classes win): chrome rows are `h-8` — scope trigger, company select, mobile filters, hamburger, theme/language toggles and sidebar collapse (`h-8 w-8`); popover-internal and in-strip buttons are `h-7 text-xs` (presets, Cancel/Apply, calendar nav `h-7 w-7`, the DegradedStrip retry `h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning hover:text-warning` — **[inferred]** recoloured to warning to sit inside the strip, `:1041`) (C-B3).

**Icons inside a Button are 16px, by rule.** `[&_svg]:size-4` compiles to `.class svg` (specificity 0,1,1) and beats any per-icon size class (0,1,0), so icons inside a Button carry no size classes (`button.tsx:7`, `:1043`, `header.tsx:23`; §15.4).

### 5.2 Non-Button clickables (the dashboard's main interaction surfaces)
| Surface | Element & classes | State semantics |
|---|---|---|
| KPI card face | raw `<button class="block w-full p-3 text-start transition-colors hover:bg-muted/50 focus-visible:ring-inset …">` with `aria-expanded`; `ChevronDown h-3 w-3 transition-transform` → `rotate-180` when open (`:418-433`) | disclosure; drawer mounts inline below |
| Fleet tile | raw `<button class="relative flex flex-col items-center gap-px rounded-lg border bg-card px-1.5 pb-1.5 pt-2 text-center transition-colors hover:border-primary …">` with `aria-pressed`; selected `border-primary bg-primary/10 text-primary` (`:735-747`) | toggle; opens TruckDrawer below the grid |
| Untracked tile | same classes as a `<div>` + `border-dashed opacity-70`, no hover/transition (`:781-786`) | **[inferred]** motion/hover signal interactivity; non-interactive tiles carry neither |
| Fuel-event row | `<Link class="grid … px-3 py-2.5 md:px-4 text-start transition-colors hover:bg-muted/50 focus-visible:ring-inset …">` carrying `state.from` for back-navigation (`:611-617`) | navigation |
| Exception row | `<Link class="grid grid-cols-[3px_1fr_auto] items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50 …">` (`:936-941`) | navigation, scope carried in the query string |
| Scope presets | `Button size="sm" h-7 text-xs`, `variant` flips `default`↔`outline`, `aria-pressed` (`scope-date-picker.tsx:132-136`) | segmented choice by variant swap (C-B4) |
| Calendar day | raw `<button class="h-8 w-8 rounded-full text-xs font-medium">`; today `border border-primary text-primary`; endpoints `bg-primary text-primary-foreground shadow-sm font-semibold`; in-range `bg-primary/10` with `rounded-s-full`/`rounded-e-full` caps; future `text-muted-foreground/30 cursor-not-allowed`; focus-visible ring (`cairo-range-calendar.tsx:138-156`) | **[comment]** "the app's ONE range calendar so every date surface has the same look" |
| Sidebar nav | `NavLink class="flex items-center rounded-md text-sm font-medium transition-all duration-200 ease-out focus-visible:…ring-ring"`; active `bg-primary/10 text-primary`, inactive `text-muted-foreground hover:bg-accent …` (`sidebar.tsx:227-234`) | current route |

**Intent prefetch** is part of every clickable: `onPointerEnter` + `onFocus` + `onTouchStart` (C-B5) call a deduped `prefetchQuery`/chunk preload — **[comment]** "hovering (or focusing, or touching) the card warms the drawer's exact query, so opening it renders from cache" (`:411-423`, `:614`, `:731`, `:938`, `sidebar.tsx:148-226`). Fleet tiles skip the warm while the stream is down (`:724`).

### 5.3 Pills, chips, badges
| Element | Recipe | Where |
|---|---|---|
| ConnectionBadge | `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium` + state tint (`border-X/40 bg-X/10 text-X`; connecting `border-border bg-muted text-muted-foreground`) + 6px dot | `:216-249` |
| Badge primitive | same recipe as the ConnectionBadge: `inline-flex gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium`; status variants `border-X/40 bg-X/10 text-X` (C-T3) | `badge.tsx:5-20`; the shell uses it only in the palette |
| Method chip | `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground` + mono `text-foreground` amount | `:583` |
| In-row tag | the same neutral chip: `rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium` (C-T3/C-S7) | `:637` |
| kbd (header and palette) | `h-5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground` (C-T7) | `header.tsx:40`, `command-palette.tsx:68` |
| Status dots | `h-1.5 w-1.5 rounded-full` everywhere — badge, tile corner, legend (C-C8) | `:226`, `:749`, `:814` |

Two pill recipes remain: the 11px status pill and the 10.5px neutral chip (C-T3).

### 5.4 Shell controls (shadcn defaults, for completeness)
SelectTrigger `h-9 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` (scope bar overrides to `h-8 w-auto min-w-32 gap-2`); items `rounded-sm py-1.5 pe-2 ps-8 text-sm focus:bg-accent` with a 14px check slot at `start-2` (`select.tsx:18-116`). DropdownMenuItem `rounded-sm px-2 py-1.5 text-sm focus:bg-accent data-[disabled]:opacity-50` (`dropdown-menu.tsx:77`). CommandItem `rounded-sm px-2 py-1.5 text-sm data-[selected=true]:bg-accent`; the palette widget's own `px-4 py-2.5` rows, `h-14 text-base` input and 16px icons are the effective values (C-I5 removed the CommandDialog descendant overrides that used to beat them). Disabled everywhere = `opacity-50` (+ `pointer-events-none` or `cursor-not-allowed`). Dialog/Sheet close: `absolute end-4 top-4 opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2` (`dialog.tsx:56`, `sheet.tsx:71`).

---

## 6. Tables, lists and data display

**There is no `<table>` on the dashboard or in the shell.** Tabular data is built from three structures:

1. **Key/value `dl` rows** (drawers): `dl class="space-y-1 text-[12px]"`; row `flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1 last:border-b-0 last:pb-0`; `dt min-w-0 truncate text-muted-foreground dir="auto"`; `dd m-0 shrink-0 font-mono tabular-nums` (`:501-509`). **[inferred]** label truncates, value never wraps; a dashed hairline separates dense rows without weight. Money values add `text-money` (`:522`). The Truck drawer's `Row` and the 'largest' dl use the same build (C-D1).
2. **Flush divided list** (fuel events): `ul class="max-h-[420px] divide-y overflow-y-auto"`, rows full-bleed `px-3 py-2.5 md:px-4`, two-column two-line grid with the amount trailing (`:604-644`). Infinite: `<li ref aria-hidden class="h-px">` sentinel observed with `rootMargin: '200px'`; loading-more `li p-3` + `Skeleton h-10`; end note `li p-2 text-center text-[10.5px]` with the total (`:547-658`).
3. **Row cards in a gap** (exceptions): `grid gap-2` of `rounded-lg border bg-card px-3 py-2.5` links; severity is encoded twice — a `w-[3px] min-h-[26px] rounded-full` bar and the count colour (`:940-968`). Category bars are plain rows in `grid gap-2` (`:977-995`).

Rule (C-S2): flush divided list for streams; bordered row-cards only when each row is its own link with identity/severity; plain rows for bars.

**Other display idioms**
- **KPI card**: `dt` eyebrow (`mb-1.5`, chevron `h-3 w-3`), `dd` 22px mono value, `p` detail `mt-1.5 min-h-[17px] text-[11.5px]` — the min-height keeps cards equal when detail is empty (`:427-442`). Delta detail: `inline-flex gap-1` with `TrendingUp/Down h-3 w-3` in success/destructive (`:294`).
- **Inline drawer** (KPI): `border-t bg-muted/40 p-3` flush strip inside the card (`:494`). **Truck drawer**: `mt-3 rounded-lg border bg-muted/40 p-3 text-[12px]` box below the grid with a title row (15px mono plate · Arabic plate · `ms-auto text-[10.5px]` date) (`:841-850`). Same tint and padding; different chrome because one belongs to a single card and the other to a grid.
- **Bar chart made of divs**: track `h-[15px] overflow-hidden rounded bg-muted`, fill `<i class="block h-full rounded bg-money" style="width:max(pct,2)%">` — 2% floor keeps zero-ish bars visible; value `text-end font-mono text-[11.5px] tabular-nums` (`:985-991`).
- **Panel head**: `h2 class="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"` + aside `font-medium normal-case tracking-normal` (`:999-1005`). PanelHead is a normal block; the only sticky element is the app header.
- **Chip strip** under a head: `flex flex-wrap gap-1.5 border-b px-3 py-2` (`:579`).
- **Legend**: `mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground`, items `gap-1.5` with `<i class="h-1.5 w-1.5 rounded-full">` reusing `STATUS_STYLES` so legend and tiles cannot disagree (`:811-818`).
- **Numeric alignment**: `justify-between` on flex rows (dd trails) or `text-end` on a fixed grid column; never a `<table>` column.
- **Truncation**: only free text truncates (driver name `truncate`, dl labels `min-w-0 truncate`); identifiers (date, plate) are `shrink-0` (`:618-627`). Mixed-direction text gets `dir="auto"` (`:498`, `:834`, `:982`); Arabic plates `dir="rtl"`.
- **Scroll containers**: fuel list `max-h-[420px]`; CommandList `max-h-[300px]` (palette `max-h-[400px]`) with `overscroll-contain` and touch/wheel propagation stopped — **[comment]** portaled lists are outside react-remove-scroll's locked content (`command.tsx:63-71`); SelectContent `max-h-96`.

---

## 7. Loading, empty, error and degraded states

**Principle (from usage and comments):** two independent sources (apex MessagePack query, etit SSE stream) "neither waits for or can take down the other" (`:51-56`). Failures are **inline and persistent** — a strip or muted copy in place — never a toast (the dashboard and shell never call `toast`). Loading is always the `Skeleton` primitive shaped like the slot. Empties are bare muted paragraphs; the shared `EmptyState` is not used on the page.

| Situation | Treatment | Evidence |
|---|---|---|
| Apex pending | `grid grid-cols-2 gap-3` + `lg:grid-cols-4|3` of 4 or 3 × `Skeleton h-[92px] rounded-lg`, following `showMoney` (matches the KPI footprint so the page does not reflow; C-D2) | `:123-128` |
| Apex error | KPI row **replaced** by `DegradedStrip` (message + retry `dashboard.refetch()`); exceptions panel shows `py-6 text-center text-xs text-muted-foreground` "unavailable" with **no second retry** — **[comment]** "figures, or an honest strip" | `:117-122`, `:170-173` |
| Fleet pending | one `Skeleton h-40 rounded-lg` in the panel body | `:162` |
| Exceptions pending | `grid gap-2` of 3 × `Skeleton h-12 rounded-lg` (C-D2) | `:174-179` |
| Exceptions empty | `py-6 text-center text-xs text-muted-foreground` "all clear" — the one empty/error recipe (C-S3) | `:180-183` |
| KPI drawer pending | `space-y-2 border-t bg-muted/40 p-3` with `Skeleton h-3.5 rounded-sm` at `w-3/4`, `w-2/3`, `w-4/5` | `:459-467` |
| KPI drawer error | `border-t bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground`, no retry — **[inferred]** the headline still shows; user can close/reopen | `:468-474` |
| Fuel pending | `space-y-2 p-3` of 4 × `Skeleton h-10 w-full rounded-none` (flush rows have no radius; C-R2) | `:599-604` |
| Fuel error / empty | `px-3 py-6 text-center text-xs text-muted-foreground` | `:605-608` |
| Fuel fetching next page | `li p-3` + `Skeleton h-10 rounded-none` after the sentinel | `:656-660` |
| Fuel totals pending | PanelHead aside simply absent; chip strip only renders once data exists — no skeleton | `:572-592` |
| Truck-day pending | `space-y-2` of `Skeleton h-3.5 rounded-sm` at `w-2/3`, `w-1/2` | `:887-891` |
| Truck-day error | `py-6 text-center text-xs text-muted-foreground` (the italic 11px style is only the 'needs stream' caveat) | `:892-893` |
| Stream down | ConnectionBadge → warning pill with inline underlined "refresh"; a **compact** `DegradedStrip` (`mb-3`) above the fleet grid; tiles fall back to trip records ("stays useful instead of vanishing"); truck-day query disabled and the drawer shows a "last worked" row + italic "needs stream" note | `:147-153`, `:240-248`, `:704-708`, `:829`, `:863-876` |
| Zero revenue | `<span class="opacity-40">—</span>` | `:765` |
| Unknown i18n key | `t(key, { defaultValue: key.replace(/_/g,' ') })` — **[comment]** a deploy-order skew once put a raw i18n path on screen | `:950-960` |

**DegradedStrip** (`:1018-1047`): `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`; `AlertTriangle mt-0.5 h-3.5 w-3.5 text-warning` (`items-start` + `mt-0.5` keeps the icon on the first line when the message wraps); message `min-w-0`; retry `Button variant=outline size=sm` overridden as in §5.1. Retry is always a human action — **[comment]** `useEtitLive` "never sets a timer to refetch… refresh() is the only way back" after `MAX_FAILURES = 3` (`use-etit-live.ts:17-36`).

**ConnectionBadge states**: live `border-success/40 bg-success/10 text-success` + pulsing dot; "caught up" label for 5s after an SSE `lag` event — **[comment]** "purely a badge blink"; connecting `border-border bg-muted text-muted-foreground` + pulsing muted dot; down `border-warning/40 bg-warning/10 text-warning` + static dot (`:216-249`, `use-etit-live.ts:91-94`).

**Shell states**: route-level Suspense fallback `PageLoadingFallback` in `app/router/index.tsx` mirrors the dashboard frame (`max-w-6xl gap-3 p-3 sm:p-4`; title/subtitle bars `rounded-sm`, a pill, a toolbar bar, `grid grid-cols-2 gap-3 lg:grid-cols-4` of `h-[92px] rounded-lg`, then `h-96 rounded-lg`) — **[comment]** so the layout doesn't reflow when the real page mounts (C-S6). `EmptyState` primitive: `flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center`, lottie 120×120 (lazy, transparent Suspense box) or `h-12 w-12 rounded-full bg-muted` icon, `h3 text-lg font-semibold`, `p max-w-sm text-sm text-muted-foreground`, action `mt-2` (`empty-state.tsx:33-57`); the palette strips it to `border-0 bg-transparent py-6 shadow-none` with `no_results.json` at 110px (`command-palette.tsx:273-281`). Scope bar companies: no loading UI; a stale company is self-healed to null — **[comment]** it "would silently filter everything to zero" (`scope-bar.tsx:44-49`). Toaster exists (`shared/ui/toaster.tsx`: top-right, richColors, closeButton, 40px lottie icons) but is unused by the reference.

---

## 8. Motion

**Vocabulary (small and deliberate):**
- **Looping**: `animate-pulse` on skeletons and on the live/connecting badge dot, both with `motion-reduce:animate-none` (C-M2). Lottie loops only in empty states (palette `no_results`). Nothing else loops; the `RefreshCw` retry icon never spins.
- **Hover**: colour only, `transition-colors` (150ms, Tailwind default easing) on cards/rows/tiles/Button/Badge (`:425`, `:616`, `:735`, `:940`, `button.tsx:7`). Nothing scales, lifts or changes shadow. No `active:` state.
- **Disclosure**: a chevron rotates (`transition-transform duration-200` + `rotate-180`, C-M1), the disclosed content (KPI drawer, truck drawer) **mounts instantly** — no height/opacity animation (`:437`, `:450`, `:820`). The `accordion-down/up` and `fade-in` keyframes in `tailwind.config.ts:74-92` are unused by the reference.
- **Sidebar collapse** (the shell's one bespoke animation): everything `duration-200 ease-out`; width `transition-[width]`; hidden text collapses via `max-w-0 opacity-0 pointer-events-none invisible` ↔ `max-w-40 opacity-100` (or `max-h-0` for headings) rather than unmounting, so it can tween; chevron `transition-transform duration-200` with `rotate-180`/`rtl:` mirroring (`sidebar.tsx:172-282`, `user-menu.tsx:53-66`).
- **Theme toggle**: shadcn sun/moon rotate+scale crossfade (`transition-all dark:-rotate-90 dark:scale-0`), with an `aria-hidden` ghost placeholder before mount so the wrong icon never flashes (`theme-toggle.tsx:18-27`).
- **Overlays** (tailwindcss-animate `data-[state]` utilities): Dialog, Popover, DropdownMenu and Select all `duration-200` fade + zoom-95 (C-M3); Select's trigger chevron is static; Sheet slide `open 500ms / close 300ms ease-in-out`, `rtl:` mirrored; close buttons `transition-opacity` 70→100% (`dialog.tsx:20-56`, `popover.tsx:22`, `select.tsx:67`, `sheet.tsx:30`).
- **Palette**: trailing chevron/hint/badge `opacity-0 transition-opacity group-aria-selected:opacity-100` — affordances appear only on the highlighted row; the row highlight itself is instant (`command-palette.tsx:305-425`).
- **Scroll**: `scroll-behavior: smooth`; infinite list via IntersectionObserver `rootMargin 200px`.
- **Reduced motion**: no global `prefers-reduced-motion` rule; opt-out is per element (`motion-reduce:animate-none` on the badge dot and the Skeleton primitive).
- **Perceived speed** rather than motion: hover-intent prefetch everywhere (§5.2).

---

## 9. Shell, RTL/i18n, formatting, accessibility (behavioural rules the dashboard follows)

- **Logical properties** for RTL: `ms-*`, `me-*`, `start-*`, `end-*`, `text-start/end`, `ps-/pe-`, `border-e/s`, `rounded-s-full/e-full` across the dashboard and most primitives (`:313`, `:741`, `:991`, `select.tsx:109`, `sheet.tsx:35-67`). Directional chevrons get `rtl:rotate-180` (`cairo-range-calendar.tsx:97`, `dropdown-menu.tsx:28`, `sidebar.tsx:282`). Rule C-I1: no physical `ml-/mr-/left-/right-` utilities; `origin-left` is always paired with `rtl:origin-right`.
- **Bidi text**: `dir="auto"` on free-text labels and mixed values; `dir="rtl"` on Arabic plates; Arabic never in mono.
- **Copy**, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4).
- **ARIA**: `aria-expanded` on disclosure buttons, `aria-pressed` on toggles, `aria-hidden` on dots/chevrons/severity bars/sentinel; native `title` for compressed context (tile revenue, collapsed nav) (`:424`, `:733`, `:756`, `sidebar.tsx:234`). Keyboard parity: every hover-prefetch also fires on focus; ⌘/Ctrl+K toggles the palette; Backspace-on-empty and Escape go *back* inside palette sub-pages — **[comment]** handled before Radix's document listener so a close reaching `onOpenChange` is always a real close (`command-palette.tsx:52-254`).
- **Language**: `i18n.changeLanguage` from a ghost icon dropdown; `i18nextLng` in localStorage. **Theme**: next-themes light/dark/system, stored under `apex-theme`.
- **Header** is the only sticky/glass surface; **print** hides header/sidebar/nav (`print:hidden`) and, via the CSS `header` rule, also the dashboard's own `<header>` (§15).
- **Sidebar collapse** state is in-memory zustand, not persisted (`use-layout-store.ts`).

---

## 10. Dashboard component recipes (quick reference)
```
Page        mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4
Panel       section.overflow-hidden.rounded-lg.border.bg-card > PanelHead + div.p-3
PanelHead   h2.flex.items-center.justify-between.gap-2.border-b.bg-muted/60.px-3.py-2.text-[10px].font-semibold.uppercase.tracking-wider.text-muted-foreground  [aside: font-medium normal-case tracking-normal]
Eyebrow     text-[10px] font-semibold uppercase tracking-wider text-muted-foreground
KPI card    div.overflow-hidden.rounded-lg.border.bg-card > button.block.w-full.p-3.text-start.hover:bg-muted/50 (dt eyebrow mb-1.5 · dd font-mono text-[22px] font-semibold leading-none tabular-nums [text-money] · p mt-1.5 min-h-[17px] text-[11.5px] text-muted-foreground)
Drawer      border-t bg-muted/40 p-3 > dl.space-y-1.text-[12px] > row flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1 last:border-b-0 last:pb-0
Tile        button.relative.flex.flex-col.items-center.gap-px.rounded-lg.border.bg-card.px-1.5.pb-1.5.pt-2.text-center.hover:border-primary  [selected: border-primary bg-primary/10 text-primary] [dot: absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full]
Row card    a.grid.grid-cols-[3px_1fr_auto].items-center.gap-3.rounded-lg.border.bg-card.px-3.py-2.5.hover:bg-muted/50
List row    a.grid.grid-cols-[1fr_auto].gap-x-3.gap-y-1.px-3.py-2.5.md:px-4.hover:bg-muted/50.focus-visible:ring-inset  (inside ul.divide-y.max-h-[420px].overflow-y-auto)
Status pill inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium  border-X/40 bg-X/10 text-X   (= the Badge primitive)
Chip        rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground
Strip       flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]  + Button outline sm h-7 px-2.5 gap-1.5 text-xs border-warning/40 text-warning
Empty/error px-3 py-6 text-center text-xs text-muted-foreground
Bar         span.h-[15px].overflow-hidden.rounded.bg-muted > i.block.h-full.rounded.bg-money
Skeleton    animate-pulse rounded-md bg-muted motion-reduce:animate-none  (shaped per slot: cards h-[92px]/h-40 rounded-lg · text bars h-3.5 rounded-sm · flush rows h-10 rounded-none)
Focus       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  [+ ring-inset inside overflow-hidden; ring-offset-1 on Button/Select; never plain focus:]
```

---

## 11. What the dashboard does NOT contain (so trips is consulted)
Page header with actions · form fields (input/label/textarea/checkbox/combobox/multi-select/date field) · validation · tabs · segmented controls in a tray · `<table>` with headers, sorting, footer totals · pagination · confirm dialogs · toasts · spinners · charts · stat cards with icons · mobile card list · sticky footers · lightbox · Excel export. These are filled in §12 from the trips module and are **provisional until the owner accepts them** — they are not part of the reference.

---

## 12. Gap fills from the trips module (secondary reference — provisional)

Values are what trips does; `why` as before. Where a gap-fill also *disagrees* with something the dashboard does have, it is listed in §13, not here.

### 12.1 Page header — `PageShell` (`shared/ui/page-shell.tsx`)
`flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8`; header `flex flex-col gap-4 sm:flex-row sm:items-start`; optional icon well `hidden sm:flex h-10 w-10 rounded-lg bg-muted text-muted-foreground` with a 20px icon; `h1 truncate text-2xl font-semibold tracking-tight md:text-3xl`; description `text-sm text-muted-foreground`; actions `flex flex-wrap items-center gap-2` of `Button outline size=sm` (labels `hidden sm:inline`, 16px icons) with the primary CTA as `Button default size=sm` (`page-shell.tsx:22-39`, `trips.tsx:358-422`). **[inferred]** labels hide on phones so three actions fit beside the title. ⚠ Every one of these values differs from the dashboard's page header (§13 D-S1..D-T2) — the dashboard wins; only the *existence* of an actions cluster and the icon well are gaps.

### 12.2 Forms
- **Input** `h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-2 ring-ring ring-offset-1 disabled:opacity-50`, invalid `aria-[invalid=true]:border-destructive ring-destructive/20` — same recipe as SelectTrigger so controls line up at 36px (`input.tsx:12-17`). **Textarea** `min-h-[80px]`, same box (`textarea.tsx:10`). **Checkbox** `h-4 w-4 rounded-sm border border-primary shadow`, checked `bg-primary text-primary-foreground` (`checkbox.tsx:13-19`). **Label** `text-sm font-medium leading-none`, `peer-disabled:opacity-70`; required marker `<span class="text-destructive">*</span>`; dense grids downsize to `text-xs` (`label.tsx:7`, `trip-form.tsx:701`, `:1186`).
- **Field stack** `space-y-1` (Label + control); trip-level grid `grid gap-4 md:grid-cols-2 lg:grid-cols-3`, wide field `md:col-span-2`; per-container grid `grid gap-3 md:grid-cols-2 lg:grid-cols-4` (`trip-form.tsx:696-698`, `:1183`).
- **Validation**: control gets `border-destructive focus-visible:ring-destructive` + `aria-invalid` + `aria-describedby`; message `p text-[11px] font-medium text-destructive`; the enclosing card gets `border-destructive/40`; **[comment]** shown only after blur "so users are not flagged before typing" (`trip-form.tsx:170`, `:1110`, `:1198-1208`). Non-blocking hint `mt-1 flex items-start gap-1.5 text-[11px] font-medium text-warning` + `AlertTriangle h-3 w-3` (`terminal-select.tsx:130`).
- **Form card** = `Card` (`rounded-lg border bg-card shadow-sm`) + `CardContent space-y-4 p-4 md:p-6`; heading `text-sm font-semibold uppercase tracking-wider`; cards stacked `space-y-6` (`trip-form.tsx:660-692`).
- **Repeater item** `rounded-lg border bg-muted/20 p-3 md:p-4`; header with index badge `h-7 w-7 rounded-md bg-primary/10 text-xs font-semibold text-primary`, remove `ghost icon h-7 w-7 text-destructive hover:bg-destructive/10`; items `space-y-3`; add/split `outline sm gap-1.5` with 14px icons (`trip-form.tsx:1109-1128`, `:835-868`).
- **Sticky submit footer** `sticky bottom-4 flex flex-col-reverse gap-2 rounded-lg border bg-card p-3 shadow-md sm:flex-row sm:justify-end`; Cancel outline, primary default with `Save` icon → `Loader2 animate-spin` while pending; disabled until valid (`trip-form.tsx:901-914`).
- **Inline banners** `rounded-md border px-3 py-2 text-xs` + icon `mt-0.5 shrink-0`; success `border-success/30 bg-success/5 text-success`; warning `border-warning/30 bg-warning/5 text-warning`; destructive `border-destructive/40 bg-destructive/5`; neutral hint `border-dashed bg-muted/30 text-muted-foreground`; title `font-medium`, body `text-foreground/80` (`trip-form.tsx:1000-1154`, `trip-location-dialog.tsx:230`).
- **Pickers**: field-styled trigger `Button outline w-full justify-start gap-2 font-normal` (`text-muted-foreground` when empty) (`trip-form.tsx:1267`); **SearchableSelect** = outline `role=combobox w-full justify-between font-normal` + `ChevronsUpDown h-4 w-4 opacity-50`, popover `p-0` width locked to the trigger, Command list with `Check me-2 h-4 w-4` and create rows `text-primary font-medium` (`searchable-select.tsx:127-215`); **MultiSelect** trigger `h-10` default / `h-9` sm with count pill `h-4 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground`, popover `w-[--radix-popover-trigger-width] min-w-[12rem] p-2`, heading `text-xs font-semibold uppercase tracking-wider`, rows `rounded-sm px-2 py-1.5 text-sm` selected `bg-accent` hover `bg-accent/60`, custom checkbox glyph `h-3.5 w-3.5 rounded border` (`multi-select.tsx:130-234`); **DatePicker** trigger `h-9 w-full justify-between font-normal` + `CalendarIcon opacity-50`, popover `w-auto p-4`, `MonthYearSelector` header (raw `rounded p-1 hover:bg-muted` chevrons, month/year as borderless Selects `h-8 text-sm font-semibold shadow-none focus:ring-1`), weekday row `text-[10px] font-semibold`, day cells identical to the range calendar, footer `mt-3 border-t pt-3` with a `text-xs font-medium text-primary hover:underline` "Today" link (`date-picker.tsx:40-188`, `month-year-selector.tsx:26-89`).
- **Search input** (`search-input.tsx`): `relative` wrapper, `Search` icon `absolute start-3 h-4 w-4 text-muted-foreground`, Input `ps-9` (+ `pe-9` with clear), clear = ghost `h-7 w-7 p-0 absolute end-1`, Escape clears, debounce 300ms, page caps `max-w-sm`; pairs with `normalize()` for Arabic/Latin folding (`normalize.ts`).

### 12.3 Tabs and segmented controls
- **Tabs** primitive: `TabsList inline-flex h-9 rounded-lg bg-muted p-1 text-muted-foreground`; `TabsTrigger rounded-md px-3 py-1 text-sm font-medium transition-all`, active `bg-background text-foreground shadow`; triggers `gap-1.5` with 14px icons; `TabsContent mt-2` (page overrides `mt-3 md:mt-4`) (`tabs.tsx:14-43`, `trips.tsx:423-440`). **[comment]** statistics is an in-page tab so users flip views without losing date filters.
- **Segmented tray** (receipt status): `inline-flex max-w-full flex-wrap gap-0.5 rounded-md border bg-muted/40 p-0.5` `role=tablist`; options `h-7 gap-1.5 rounded px-2.5 text-xs font-medium`, active `bg-background text-foreground shadow-sm`, inactive `text-muted-foreground hover:text-foreground`; **[comment]** height auto not h-9 because fixed height + wrapping labels "burst the control open" (`trips-filters.tsx:190-216`).
- **Popover checklist filter** (missing data): trigger `variant` default when active, `size=sm h-9 gap-1.5`, count pill `h-4 min-w-4 rounded-full bg-primary-foreground px-1 text-[10px] font-semibold text-primary`; `PopoverContent align=end w-56 p-2`; heading `px-2 py-1.5 text-xs font-semibold uppercase tracking-wider` with inline clear; rows `rounded-sm px-2 py-1.5 text-sm`, selected `bg-accent`, hover `bg-accent/60`, `CheckCircle2 h-3.5 text-primary` (`trips-filters.tsx:62-142`).
- **Mobile filters disclosure**: `Button outline sm h-9 sm:hidden` with `aria-expanded` and a count badge `rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground`; refinements `hidden sm:flex` until toggled — **[comment]** they "cost ~150px of a 812px screen and pushed the first trip below the fold" (`trips.tsx:455-481`).
- **Chip group as choice** (company selector): `flex flex-wrap gap-2` of `Button size=sm h-9`, selected `default` else `outline` (`trips-statistics-routes.tsx:74-84`).

### 12.4 Data tables
- **Bespoke trips table** (`trips-desktop-table.tsx`): `Card overflow-hidden` > `w-full overflow-x-auto` > `table w-full caption-bottom border-collapse text-sm`; `thead tr border-b bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground`; `th h-10 whitespace-nowrap px-3 font-semibold scope=col` aligned `text-start/end/center` — **[comment]** "alignment encodes the kind of value — text starts, figures end, status centres; one padding scale for header and body"; `td px-3 py-2.5 align-middle`; columns hidden progressively `hidden md:/lg:/xl:table-cell`; sr-only header for the expand column (`:82-173`). Row `cursor-pointer border-b transition-colors hover:bg-muted/40`, expanded `bg-muted/30`, leading `ChevronRight h-4 w-4 transition-transform` → `rotate-90`; detail row `border-b bg-muted/20` `td colSpan px-3 py-3` (`:216-305`). Cell roles: receipt `font-mono text-[13px] font-medium tabular-nums` with `#`; date `font-mono text-[12.5px] tabular-nums` `d MMM yyyy`; text cells `Truncate` at 13px with `max-w-[130..230px]`; figures `font-mono text-[12.5px] tabular-nums`; two-line vehicle/driver cell `space-y-0.5` (14px icon + mono, then `text-[11.5px] text-muted-foreground`) (`:248-344`). Route cell: `h-1.5 w-1.5 rounded-full bg-success` origin dot → `→` → `bg-destructive` destination dot, names `Truncate dir=auto`, drops joined by Arabic comma `، ` — **[comment]** "two stacked lines read as two unrelated places rather than a journey" (`:318-329`, `trip-row.ts:73-74`). Row actions: `flex justify-end gap-1` of ghost icon `h-7 w-7` with `aria-label`+`title`, 14px icons, danger `text-destructive hover:text-destructive`, `stopPropagation` (`:527-594`). Expanded field grid `dl grid grid-cols-2 gap-x-8 gap-y-2 text-[12.5px] sm:grid-cols-4`, `dt` eyebrow, `dd mt-0.5 font-medium` (`:425-499`). Loading: 8 `tr border-b` × 10 `td px-3 py-2.5` with `Skeleton h-4 w-full` (`:620-623`). Multi-container marker `rounded bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground` + `Layers h-3 w-3` (`:235-236`).
- **Generic DataTable** (`shared/ui/data-table.tsx`, TanStack): `overflow-hidden rounded-lg border bg-card` > `overflow-auto` > `table text-sm`; `thead border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground`, `th h-11 px-4 text-start font-medium` with sort `ArrowUpDown h-3 w-3`; `td px-4 py-3 align-middle`; rows `border-b last:border-0 hover:bg-muted/40 data-[state=selected]:bg-muted`, expanded `bg-muted/30`, sub-row `bg-muted/10 p-0`; loading 5 rows `td p-4 Skeleton h-4`; footer `tr border-t-2 bg-muted/40 font-semibold` `td px-4 py-3 tabular-nums`; empty `EmptyState no_results` 100px `border-0 bg-transparent py-12`; pager `text-sm text-muted-foreground` with outline icon prev/next `rtl:rotate-180` (`:152-286`). Numeric columns `block text-end tabular-nums`, totals `font-semibold` (`trips-statistics-car-table.tsx:56-61`). Mobile: header abbreviations via `hidden sm:inline` / `sm:hidden` pairs and `hidden sm:table-cell` columns (hard-coded English); edge-bleed wrapper `overflow-x-auto -mx-3 sm:-mx-4 md:mx-0` (`trips-statistics-companies.tsx:429-620`).
- **Nested drill-down** (level 2/3 sub-tables): wrapper `border-l-2 border-primary/30 ms-4 my-2 me-2` (level 3 `border-success/40`); `table w-full text-xs`; `thead bg-muted/30 text-[10px] uppercase tracking-wider`, `th/td px-3 py-2` (level 3 `py-1.5`, `text-[11px] sm:text-xs`, `thead bg-muted/20 text-[9px] sm:text-[10px]`); rows `border-t border-border/50 hover:bg-muted/40` (level 3 `/30`); chevron `ChevronRight h-3 w-3 rtl:rotate-180` → `rotate-90 rtl:rotate-90`; loading/error/empty hints `border-l-2 … p-2.5 text-[11px] text-muted-foreground` (+ `italic`, error rule `border-destructive/40`) (`trips-statistics-companies.tsx:397-1052`). Note `border-l-2` is physical.
- **Pagination strip** (`trips-pagination.tsx`): `flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between`; range text `text-xs text-muted-foreground` with `font-medium text-foreground` tabular figures; per-page `SelectTrigger h-7 w-[70px] text-xs`; jump `Input h-7 w-16 text-xs` + ghost `h-7 px-2` (lg+, pages>5); nav ghost icon `h-8 w-8`, current page `default h-8 w-8 text-xs tabular-nums`, ellipsis `MoreHorizontal`; first/last hidden below sm; mobile `page / pages`; hidden when `pages<=1 && total<=10` (`:42-207`).
- **Mobile card list** (`trips-mobile-list.tsx`): `overflow-hidden rounded-xl border bg-card`; sticky day header `sticky top-0 z-10 border-y bg-muted/95 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-muted/80` with date `text-[11px] font-semibold uppercase tracking-wider` (`EEE d MMM yyyy`) and count `text-[11px] tabular-nums text-muted-foreground` — **[comment]** sticky "so the day you are inside stays named; no day total because a paginated page would be confidently wrong" (`:65-77`); row `div role=button tabIndex=0 aria-expanded` with Enter/Space, `px-3 py-2.5 transition-colors hover:bg-muted/40 active:bg-muted/60 focus-visible:ring-inset`; line 1 receipt `font-mono text-[13px] font-medium` + company `text-[11px] text-muted-foreground max-w-[110px]` + `ChevronDown h-3.5 w-3.5` rotate-180; line 2 `mt-1 text-[13.5px] font-medium` route; line 3 `mt-1.5` meta `text-[11px]` + money `font-mono text-[13.5px] font-semibold text-money` (`:133-219`); expanded well `border-t bg-muted/30 px-3 py-2.5`, money well `border-t bg-money-soft px-3 py-2.5` (the only `money-soft` use) (`:227-233`); action chips `inline-flex gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium hover:bg-muted`, danger `border-destructive/30 text-destructive hover:bg-destructive/10` (`:380-383`); loading `space-y-2` of 8 × `Skeleton h-[84px] rounded-xl` (`:52-54`). Desktop/mobile switch is JS `useIsMobile` (768px), not CSS.
- **Pressable money figure** → breakdown popover: `button rounded font-mono text-[12.5px] font-semibold tabular-nums text-money underline decoration-dotted underline-offset-4 hover:bg-money/10`; `PopoverContent align=end w-72 shadow-lg`; breakdown `dl space-y-1 text-[12.5px]`, lines `flex items-baseline justify-between gap-4`, `dd shrink-0 font-mono tabular-nums text-foreground/90` (strong `font-semibold text-money`), total after `border-t pt-1`, `×N` chip `rounded border px-1 font-mono text-[10px]`, hint `mt-2 text-[11px] leading-relaxed text-muted-foreground` (`trips-desktop-table.tsx:355-391`, `revenue-breakdown.tsx:109-223`). **[comment]** one module so table and mobile list never disagree about a figure.
- **Receipt status badge** `inline-flex gap-1 rounded-full border px-2 py-0.5 text-xs font-medium` + 12px icon; pending `bg-muted text-muted-foreground border-border`; in_garage/in_office `bg-warning/15 text-warning border-warning/30`; complete `bg-success/15 text-success border-success/30`; `compact` = icon only with `title` (`receipt-status-badge.tsx:10-51`).
- **Truncate** primitive: `block truncate`, sets native `title` only while measured as clipped (ResizeObserver) — **[comment]** an unconditional title "stops meaning 'there is more here'" (`truncate.tsx:7-52`).
- **Separator** primitive: Radix `shrink-0 bg-border`, `h-px w-full` / `h-full w-px` (`separator.tsx:14-15`).

### 12.5 Stat cards and charts
- **StatCard** (`stat-card.tsx`): `Card overflow-hidden` with `containerType: inline-size`; `CardContent flex items-center gap-3 p-3 sm:p-3.5`; icon tile `h-8 w-8 rounded-md` toned (`bg-muted` / `bg-X/10 text-X`) with 16px icon; label `truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]`; value `truncate text-sm font-semibold leading-tight tracking-tight tabular-nums sm:text-base md:text-lg` (sans) with an optional `{full, compact}` pair swapped by the `@container` rule; subvalue `text-[10px] tabular-nums sm:text-[11px]`. Grid `grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5` with a sixth card `lg:hidden` — **[comment]** "Desktop shows 5 cards (matches the fuel-events stats pattern)" (`trips-statistics-summary.tsx:117-248`). Press-to-reveal: card wrapped in `button.text-start` as `PopoverTrigger`, `hover:bg-accent/40`, `PopoverContent align=start w-64 p-3` with eyebrow `text-xs font-medium`, `dl space-y-2 text-sm`, `dd font-semibold tabular-nums`, hint `mt-2 border-t pt-2 text-xs leading-relaxed` — **[comment]** "A press, not a hover: this page is used on a phone" (`:124-165`).
- **ChartCard** (`chart-card.tsx`): `Card flex flex-col overflow-hidden`; header `flex items-start justify-between gap-3 border-b px-4 py-3 md:px-5 md:py-4`, `h3 text-sm font-semibold tracking-tight md:text-base`, description `mt-0.5 text-xs text-muted-foreground`, actions slot; body `p-4 md:p-5`, height default 320px as inline style — **[comment]** Recharts' ResponsiveContainer "needs a real height to measure against" (`:38-75`). Metric selector `SelectTrigger h-8 w-[120px] text-xs` in the actions slot (`trips-statistics-timeline.tsx:264`).
- **Chart theme** (`shared/lib/chart-theme.ts`): series `['hsl(var(--primary))', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16']`, other `#6B7280` — **[comment]** "mid-range of each color family so tints work in both light and dark mode… neutral so it doesn't compete visually"; tooltip `bg popover, 1px border, borderRadius 8, fontSize 12, boxShadow 0 4px 12px rgba(0,0,0,.08)`, cursor `muted` at 0.4; axis ticks `fontSize 11 fill muted-foreground` (`:6-82`). Timeline: stacked `AreaChart` margins `{10,20,0,0}`, per-series gradient 0.55→0.15 — **[comment]** "blend visually where they overlap"; `CartesianGrid strokeDasharray 3 3 stroke border`; `strokeWidth 2`; X ticks `d MMM`, Y `formatCompactNumber`; hand-rolled tooltip `rounded-lg border bg-background p-2 shadow-sm` with a `border-b pb-1 text-xs font-bold` total line and 8px dots (`trips-statistics-timeline.tsx:288-387`). Pie: outer radius 70/80/90 by `window.innerWidth`, slice stroke `hsl(var(--card))` 2px, labels only when >4% (`trips-statistics-companies.tsx:249-303`). Chart footer band `border-t bg-muted/20 px-4 py-3 md:px-5` with eyebrow `text-[10px] font-medium uppercase tracking-wider`, headline `text-xl font-bold tracking-tight text-success`, min/max/avg `text-sm font-bold tabular-nums` (`trips-statistics-timeline.tsx:396-422`).
- **CollapsibleSection** (`collapsible-section.tsx`): `Card overflow-hidden`; header `flex items-center gap-3 border-b px-4 py-3 md:px-5 md:py-3.5`, collapsible adds `cursor-pointer select-none transition-colors hover:bg-muted/40`, `role=button tabIndex=0 aria-expanded`, `ChevronDown h-4 w-4 text-muted-foreground transition-transform` → `rotate-180`; body shown/hidden with **no height animation** — **[comment]** "so long sections don't feel sluggish" (`:33-98`). Company card variant: icon well `h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-primary/10 text-primary`, title `text-sm sm:text-base font-semibold` + `Badge secondary text-[10px] sm:text-xs`, meta `text-[11px] sm:text-xs text-muted-foreground` (`trips-statistics-companies.tsx:165-200`).

### 12.6 Dialogs, confirmation, feedback
- **Dialog widths** beyond `max-w-lg`: `max-w-[400px]` confirm, `max-w-xl` list picker, `max-w-2xl` diff/receipt steps, `max-w-3xl` images, `max-w-4xl` map — **[inferred]** width scales with content (`drop-off-picker-modal.tsx:101`, `duplicate-comparison-dialog.tsx:59`, `trip-receipt-batch-dialog.tsx:76`, `trip-location-dialog.tsx:189`). **Full-bleed dialog**: `flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0`, header `shrink-0 border-b px-6 py-4`, body `flex-1 overflow-y-auto px-6 py-4`, footer `shrink-0 border-t` + `px-6 py-3 sm:justify-between` (`trip-location-dialog.tsx:190-300`). Dialog title with leading icon `flex items-center gap-2` + `h-4 w-4 text-primary`, or a `h-10 w-10 rounded-full bg-warning/15 text-warning` disc beside title/description (`:191-192`, `duplicate-comparison-dialog.tsx:61-62`).
- **ConfirmDialog** (`confirm-dialog.tsx`): `max-w-[400px] text-center p-6 gap-6`; lottie `h-20 w-20` (warning for destructive, success otherwise); title `text-xl font-bold tracking-tight text-center`; description `text-sm text-muted-foreground text-center px-2`; footer `flex-col-reverse sm:flex-row sm:justify-center gap-2`; Cancel outline `w-full sm:w-auto`; confirm `destructive|default min-w-[80px]` with `Loader2 h-4 w-4 animate-spin mr-2` while loading; `stacked` prop lifts it above sheets (`:59-100`). Used with `variant="destructive"` and `loading` bound to `mutation.isPending`; page-level dialogs are mounted once — **[comment]** "so they survive tab switches" (`trips.tsx:569-603`).
- **Toasts** (Sonner via `shared/ui/toaster.tsx`: `top-right richColors closeButton`, toast `bg-background text-foreground border-border shadow-lg`, 40px lottie icons): `toast.success` after mutations/exports, `toast.error(extractErrorMessage(err, fallback))` on failure; export 404 mapped to an "empty" message — **[comment]** "say that rather than reporting a failure, because nothing actually went wrong"; long exports mutate one `toast.loading(id)` through to success/error (`trips.tsx:246-335`, `shared/lib/excel.ts:161-209`).
- **Spinners**: `Loader2 animate-spin` replaces the leading icon on pending buttons (`h-4 w-4` default, `h-3.5` sm/icon), button disabled; centred list loading `h-6 w-6 text-muted-foreground`; map overlay `absolute inset-0 z-10 bg-background/70 backdrop-blur-sm` with `h-7 w-7 text-primary`; background refetch indicator `inline-flex gap-1.5 text-xs text-muted-foreground` + `h-3 w-3 animate-spin` while data stays visible (`trips.tsx:368`, `trips-statistics.tsx:154-157`, `trip-location-dialog.tsx:246`).
- **Full-panel error** = `EmptyState lottieSrc=warning.lottie 100×100` + `errors.generic` + `Button outline` retry, replacing the list and pagination (`trips.tsx:511-522`); inside a `Card CardContent p-6` on the statistics tab (`trips-statistics.tsx:101-112`). **Full-panel empty** = `EmptyState` with title + CTA (`trips-desktop-table.tsx:76`, `trips.tsx:535-543`).
- **Lists inside dialogs**: searchable paginated option list (`ScrollArea h-[340px] rounded-md border`, `ul divide-y`, rows `flex gap-3 px-3 py-2.5 hover:bg-muted/60`, selected `bg-primary/5` + `Check text-primary`, icon well `h-8 w-8 rounded-md bg-muted`, meta `text-xs` with fee in `text-success`, pager ghost `h-7 w-7`; PAGE_SIZE 15) (`drop-off-picker-modal.tsx:117-249`); diff table with `bg-warning/10` changed rows and `text-warning` new values (`duplicate-comparison-dialog.tsx:36-267`); step timeline `ol space-y-2` of `li flex items-start gap-3 rounded-md border bg-card p-3` with `h-8 w-8 rounded-full bg-success/15|bg-primary/15` disc, tag `rounded bg-success/15 px-1.5 py-0.5 text-[10px]`, notes `rounded bg-muted/40 px-2 py-1 text-xs italic`, actions ghost `h-7 w-7` (`trip-receipt-dialog.tsx:349-377`); context block `grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border bg-muted/30 p-3 text-xs` with `text-[10px] uppercase tracking-wider` labels (`:162`); stat strip `grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4` with `h-7 w-7 rounded-md bg-muted` wells (`trip-location-dialog.tsx:203-378`).
- **Image grid + lightbox**: `grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4`, tiles `aspect-square overflow-hidden rounded-md border bg-muted/30 transition-all hover:ring-2 hover:ring-primary`, `img object-cover group-hover:scale-105`; lightbox `fixed inset-0 z-[60] bg-black/90 p-4`, controls `rounded-full bg-card/20 text-white backdrop-blur-sm` (`h-9 w-9` close, `h-12 w-12` prev/next), arrow keys/Escape (`trip-receipt-batch-dialog.tsx:89-166`).
- **Map viewport**: `relative h-[380px] overflow-hidden rounded-lg border bg-muted/30`; legend `absolute bottom-3 left-3 z-[1000] rounded-md border bg-background/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm`; markers hard-coded `#16A34A` / `#DC2626`, route `bg-blue-500` — inline HTML outside the token system (`trip-location-dialog.tsx:56-289`).
- **Excel export** (`shared/lib/excel.ts`): branded banner, header row white-on-brand, zebra rows, totals with SUM formulas; brand `FF1E40AF` (**[comment]** "matches Apex primary" — it is Tailwind blue-800, same as the stale `theme-color`, not `--primary`); number formats `#,##0.00 "EGP"`, `#,##0`, `0.0%`, `dd mmm yyyy` (`:82-341`).

### 12.7 Other behaviours
- URL-synced list state with short keys (`?tab, q, md, rs, p, l`) written with `replace:true` **starting from current params so global scope keys survive**; page size persisted to localStorage; page resets to 1 on filter change (`trips-filters.tsx:228`, `trips.tsx:156-189`).
- `active:bg-muted/60` on touch rows — the only pressed state anywhere (`trips-mobile-list.tsx:145`).
- Back-to-list `Button outline sm` with `ArrowLeft rtl:rotate-180`, label `hidden sm:inline` (`trip-new.tsx:18-19`).

---

## 13. Trips deviations (dashboard wins; listed for the owner to rule on later)

Grouped by dimension. "Dash" = the reference value; "Trips" = what trips does instead. Evidence in the trips files.

### Spacing / layout
| # | Topic | Dash | Trips | Evidence |
|---|---|---|---|---|
| D-S1 | Page container | `max-w-6xl gap-3 p-3 sm:p-4` | `PageShell`: `gap-6 p-4 md:p-6 lg:p-8`, no max width; children `gap-6` | `page-shell.tsx:22,39` |
| D-S2 | Page header layout | single row `items-center gap-3` | `flex-col gap-4 sm:flex-row sm:items-start` | `page-shell.tsx:23` |
| D-S3 | Card/panel body padding | `p-3` | `CardContent p-6` (Card); `p-4 md:p-6` (forms); `p-4 md:p-5` (charts/tables); `p-6` (error/empty cards); `p-3 sm:p-3.5` (StatCard) | `card.tsx:42`, `trip-form.tsx:691`, `chart-card.tsx:75`, `trips-statistics.tsx:101`, `stat-card.tsx:54` |
| D-S4 | Section rhythm | `gap-3` at all widths | `space-y-3 md:space-y-4`; forms `space-y-6`; `TabsContent mt-3 md:mt-4` | `trips-statistics.tsx:151`, `trip-form.tsx:660`, `trips.tsx:510` |
| D-S5 | KPI/stat grid | `grid-cols-2 gap-3 lg:grid-cols-4|3` | `grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5` | `trips-statistics-summary.tsx:117` |
| D-S6 | Section head strip | `px-3 py-2` tinted band | `CollapsibleSection`/`ChartCard` header `px-4 py-3 md:px-5 md:py-3.5|4`, no tint | `collapsible-section.tsx:63`, `chart-card.tsx:48` |
| D-S7 | Popover | default `w-72 p-4` | `w-64 p-3` (stat popover); `w-56 p-2` (filter); `w-72 shadow-lg` (revenue) | `trips-statistics-summary.tsx:145`, `trips-filters.tsx:107`, `trips-desktop-table.tsx:391` |
| D-S8 | Dialog padding | `gap-4 p-6`, footer `sm:justify-end` | ConfirmDialog `gap-6`, footer `sm:justify-center`; location dialog `gap-0 p-0` with own bands | `confirm-dialog.tsx:59,85`, `trip-location-dialog.tsx:189` |
| D-S9 | Breakpoints | sm/md/lg only | adds `xl` for a table column; JS `useIsMobile` decides table vs cards | `trips-desktop-table.tsx:94`, `trips-table.tsx:46` |

### Typography
| # | Topic | Dash | Trips | Evidence |
|---|---|---|---|---|
| D-T1 | Page title | `text-lg sm:text-xl font-semibold leading-tight` | `text-2xl md:text-3xl font-semibold tracking-tight truncate` | `page-shell.tsx:31` |
| D-T2 | Page subtitle | `text-[11.5px]`, `mt-0.5` | `text-sm`, `space-y-1` | `page-shell.tsx:30-33` |
| D-T3 | Eyebrow | `text-[10px] font-semibold uppercase tracking-wider` | table thead `text-[10.5px]` (th semibold) / DataTable `text-xs` (th medium) / form card headings `text-sm font-semibold` / dialog h4 `text-xs font-semibold` / companies heading `text-xs sm:text-sm` / StatCard & footer eyebrows `text-[10px] font-medium` (+ `tracking-widest` once) / mobile day header `text-[11px] font-semibold` not muted | `trips-desktop-table.tsx:85`, `data-table.tsx:180-186`, `trip-form.tsx:692`, `trip-receipt-dialog.tsx:182`, `trips-statistics-companies.tsx:86`, `stat-card.tsx:66`, `trips-statistics-timeline.tsx:400`, `trip-location-dialog.tsx:364`, `trips-mobile-list.tsx:76` |
| D-T4 | Panel/card title | 10px uppercase eyebrow in a tinted band | `ChartCard h3 text-sm md:text-base font-semibold tracking-tight`; table card `h3 text-base font-semibold` + `text-xs` subtitle; no band | `chart-card.tsx:61-63`, `trips-statistics-routes.tsx:285-290` |
| D-T5 | Figures | `font-mono tabular-nums` | list/table cells are mono (`text-[12.5px]`/`[13px]`); **forms, dialogs and statistics use no `font-mono` at all** — sans `tabular-nums` | `trips-desktop-table.tsx:259`, `trip-form.tsx:1197`, `trips-statistics-car-table.tsx:48` |
| D-T6 | Money in a row | `text-sm font-semibold tabular-nums text-money` (sans) | `font-mono text-[12.5px]` desktop / `text-[13.5px]` mobile, `font-semibold text-money` | `trips-desktop-table.tsx:398`, `trips-mobile-list.tsx:219` |
| D-T7 | Headline figure | `font-mono text-[22px] font-semibold leading-none` | StatCard value sans `text-sm sm:text-base md:text-lg font-semibold tracking-tight`; projected revenue `text-xl font-bold tracking-tight text-success` | `stat-card.tsx:91`, `trips-statistics-timeline.tsx:403` |
| D-T8 | Weight ceiling | 600 max | `font-bold` (700) on totals, tooltip total, projections, ConfirmDialog title | `trips-statistics-companies.tsx:540`, `trips-statistics-timeline.tsx:340`, `confirm-dialog.tsx:74` |
| D-T9 | Responsive text | fixed px except h1 | many roles step with breakpoints (`text-[11px] sm:text-xs`, `text-xs sm:text-sm`, `text-[9px] sm:text-[10px]`) | `trips-statistics-companies.tsx:172-950` |
| D-T10 | Dialog title | `text-lg font-semibold leading-none tracking-tight` | ConfirmDialog `text-xl font-bold tracking-tight text-center` | `confirm-dialog.tsx:74` |
| D-T11 | Italic hint | `text-[11px] italic` | `text-xs italic` on a `rounded bg-muted/40 px-2 py-1` chip; level-2 hint `text-xs italic` | `trip-receipt-dialog.tsx:377`, `trips-statistics-companies.tsx:1034` |
| D-T12 | Hint leading | default | `text-[11px] leading-relaxed` | `revenue-breakdown.tsx:223` |
| D-T13 | Calendar weekday header | `text-xs font-semibold` | `text-[10px] font-semibold` | `date-picker.tsx:139` |
| D-T14 | Money format | `compactMoney`, no currency | `formatCurrency` (2 dp + ` EGP`), compact only in StatCard; a second helper `format-number.ts` (en-US locale, trims zeros, uppercase `K`) exists | `trips-statistics-summary.tsx:200`, `format-number.ts:10-27` |
| D-T15 | Distance decimals | 0 dp | 1 dp (desktop row, timeline) / 0 dp (mobile) / 2 dp (summary) | `trips-desktop-table.tsx:371`, `trips-mobile-list.tsx:197`, `trips-statistics-summary.tsx:187` |
| D-T16 | Date pattern | `d MMM yyyy` / `MMM d, yyyy` (split) | `d MMM yyyy` tables; `EEE d MMM yyyy` day headers; `PPP` in dialogs and chart tooltips; `fmtDate` in DatePicker | `trips-desktop-table.tsx:260`, `trips-mobile-list.tsx:77`, `duplicate-comparison-dialog.tsx:101`, `trips-statistics-timeline.tsx:336` |

### Colour
| # | Topic | Dash | Trips | Evidence |
|---|---|---|---|---|
| D-C1 | **Money colour** | `text-money` on every monetary figure | **`text-success` (green)** on revenue/fee/total in forms, pickers, statistics, projections; StatCard `tone="success"` for revenue; VAT/rent `text-muted-foreground` | `trip-form.tsx:1295`, `drop-off-picker-modal.tsx:207`, `trips-statistics-companies.tsx:190,476`, `trips-statistics-timeline.tsx:403`, `trips-statistics-summary.tsx:207` |
| D-C2 | Third-hue rule | tokens only | chart series hex palette (emerald/amber/violet/pink/cyan/orange/lime/grey); map markers `#16A34A`/`#DC2626`, `bg-blue-500`, `text-white`, `#71717a` | `chart-theme.ts:15-28`, `trip-location-dialog.tsx:132-289` |
| D-C3 | Row hover | `bg-muted/50` | `bg-muted/40` (tables, mobile rows, DataTable, collapsible header); `/30` level-3; `/60` picker rows & toggles; `bg-accent/40` stat card; `bg-accent/60` option rows | `trips-desktop-table.tsx:216`, `trips-mobile-list.tsx:143`, `drop-off-picker-modal.tsx:186`, `trips-statistics-summary.tsx:140`, `trips-filters.tsx:142` |
| D-C4 | Head band tint | `bg-muted/60` | thead `bg-muted/40` (trips) / `/50` (DataTable) / `/30`, `/20` (nested); mobile day header `bg-muted/95` | `trips-desktop-table.tsx:85`, `data-table.tsx:180`, `trips-mobile-list.tsx:73` |
| D-C5 | Expanded well | `bg-muted/40` | `bg-muted/20` (desktop), `/30` (mobile, context blocks, stat strips, map), `/10` (DataTable sub-row), `/20` (repeater items) | `trips-desktop-table.tsx:304`, `trips-mobile-list.tsx:233`, `data-table.tsx:250`, `trip-form.tsx:1109` |
| D-C6 | Icon-well / tag alpha | `X/10` | `X/15`, `X/20`, `X/5` (banners) | `trip-form.tsx:665`, `trip-receipt-dialog.tsx:355`, `trip-form.tsx:1013` |
| D-C7 | Status pill | `border-X/40 bg-X/10 text-X` py-1 11px (badge) / `border-transparent bg-X/10` (Badge) | `border-X/30 bg-X/15 text-X` px-2 py-0.5 text-xs | `receipt-status-badge.tsx:18-45` |
| D-C8 | Warning banner | dashed `border-warning/60 bg-warning/10 px-3 py-2.5 text-[12.5px]` + retry | solid `rounded-md border-warning/30 bg-warning/5 px-3 py-2 text-xs`, body `text-foreground/80`, no retry | `trip-form.tsx:1014-1167` |
| D-C9 | Secondary copy | `text-muted-foreground` | `text-foreground/80`, `text-foreground/90` | `trip-form.tsx:1030`, `revenue-breakdown.tsx:114` |
| D-C10 | Selected row | `border-primary bg-accent` / `bg-primary/10` | `bg-primary/5` (+ Check); unregistered option `border-solid border-primary bg-primary/5` | `drop-off-picker-modal.tsx:136,220` |
| D-C11 | Empty value | `—` at `opacity-40` | `—` at full `text-muted-foreground`, or bare | `trips-desktop-table.tsx:285`, `trips-statistics-companies.tsx:496` |
| D-C12 | Disabled | `opacity-50` | `opacity-40` (MultiSelect rows), `opacity-70` (Label) | `multi-select.tsx:225`, `label.tsx:7` |
| D-C13 | Divider alpha | full `border` (lists), `border-border/60` dashed (dl) | solid `border-border/50`, `/30`; toggle tray `border-border/50` | `trips-statistics-companies.tsx:734,989,841` |
| D-C14 | Overlay | `bg-black/50 backdrop-blur-sm` at z-50 / z-index constants | lightbox `z-[60] bg-black/90`; map legend `z-[1000]` | `trip-receipt-batch-dialog.tsx:130`, `trip-location-dialog.tsx:280` |

### Radius / border / shadow
| # | Topic | Dash | Trips | Evidence |
|---|---|---|---|---|
| D-R1 | Card shadow | none | `Card` = `rounded-lg … shadow-sm`; submit footer `shadow-md`; revenue popover `shadow-lg`; chart tooltip `shadow-sm` | `card.tsx:8`, `trip-form.tsx:901`, `trips-desktop-table.tsx:391`, `trips-statistics-timeline.tsx:334` |
| D-R2 | Card radius class | `rounded-xl` panels | `rounded-lg` (Card), `rounded-xl` (mobile list only) | `card.tsx:8`, `trips-mobile-list.tsx:65` |
| D-R3 | Inner wells | `rounded-lg` | `rounded-md` (dialog blocks, step rows, banners, list border); `rounded` (diff cells) | `trip-receipt-dialog.tsx:162,349`, `duplicate-comparison-dialog.tsx:243` |
| D-R4 | Small tags | `rounded-full` pills | `rounded` (4px) tags: group count, `×N`, stamped, image counter; `rounded-full` only the duplicate-origin pill | `trips-desktop-table.tsx:235,450`, `trip-receipt-dialog.tsx:366` |
| D-R5 | Floating surface | Popover `rounded-md bg-popover shadow-md` | chart tooltip `rounded-lg bg-background shadow-sm`; Recharts tooltip radius 8 + custom rgba shadow | `trips-statistics-timeline.tsx:334`, `chart-theme.ts:61-64` |

### Buttons / controls
| # | Topic | Dash | Trips | Evidence |
|---|---|---|---|---|
| D-B1 | Toolbar height | `sm` shrunk to `h-8`/`h-7` | `sm` **raised** to `h-9` (Filters, Clear, missing-data, company chips, select wrapper); pagination `h-7`/`h-8` | `trips.tsx:458,495`, `trips-filters.tsx:92`, `trips-statistics-routes.tsx:84`, `trips-pagination.tsx:150-175` |
| D-B2 | Segmented choice | separate `h-7` pills, variant swap | bordered tray `rounded-md border bg-muted/40 p-0.5` with `h-7 rounded` options, active `bg-background shadow-sm`; Tabs tray `h-9 rounded-lg bg-muted p-1`; raw toggle `rounded px-2 py-0.5 text-[10px]` active `bg-primary` | `trips-filters.tsx:193-211`, `tabs.tsx:14`, `trips-statistics-companies.tsx:827-841` |
| D-B3 | Select override | `h-8 w-auto min-w-32 gap-2` | `h-7 w-[70px] text-xs`; `h-8 w-[120px] text-xs` | `trips-pagination.tsx:114`, `trips-statistics-timeline.tsx:264` |
| D-B4 | Cancel/Close | ghost `h-7 text-xs` (popover) | ghost sm unmodified (`h-8`), outline default `h-9` in dialogs, ghost `h-8 text-xs` | `date-picker.tsx:188`, `drop-off-picker-modal.tsx:267`, `trip-location-dialog.tsx:334` |
| D-B5 | Calendar month nav | ghost icon `h-7 w-7`, translated aria | raw `rounded p-1 hover:bg-muted` `h-3.5` chevrons, English aria | `month-year-selector.tsx:78-81` |
| D-B6 | Control height | 36px | MultiSelect `h-10` default (trip-form passes `md` → 40px beside 36px inputs) | `multi-select.tsx:130`, `trip-form.tsx:1251` |
| D-B7 | Icon buttons | `h-7`/`h-8`/`h-9` | `h-7 w-7` ghost (matches calendar nav); lightbox `h-9 w-9` raw, `h-12 w-12` | `trip-form.tsx:679`, `trip-receipt-batch-dialog.tsx:166` |
| D-B8 | Outline sm gap/icon | `gap-2` + 16px | `gap-1.5` + 14px | `trips-statistics.tsx:166-168` |
| D-B9 | Count chip | `rounded-full bg-muted … text-[10.5px]` | `rounded bg-accent px-1.5 text-[10px] font-semibold`; `rounded-full bg-primary … text-[10px]` | `trips-desktop-table.tsx:235`, `trips.tsx:465` |
| D-B10 | Badge | hand-rolled 11px | `Badge secondary text-[10px] sm:text-xs` | `trips-statistics-companies.tsx:175` |
| D-B11 | Icon well | `rounded-full bg-primary/10` / `rounded-md … ring-1 ring-primary/20` | `rounded-md bg-primary/10` `h-7 w-7 sm:h-8 sm:w-8`, no ring | `trips-statistics-companies.tsx:165` |

### Tables / lists
| # | Topic | Dash | Trips | Evidence |
|---|---|---|---|---|
| D-L1 | KPI card | whole card is a button; inline `border-t bg-muted/40 p-3` drawer; mono dd; dashed rows | StatCard with icon tile; detail in a floating `PopoverContent w-64 p-3`, `dl space-y-2 text-sm`, no dividers | `trips-statistics-summary.tsx:128-152` |
| D-L2 | Key/value rows | `dl space-y-1 text-[12px]`, dashed dividers, `dd font-mono` | stacked `Field` (eyebrow over `dd mt-0.5 font-medium`, no dividers, `text-[12.5px]` grid); `RevenueBreakdown` lines `gap-4`, solid `border-t` before total, `dd text-foreground/90` | `trips-desktop-table.tsx:499`, `revenue-breakdown.tsx:114-195` |
| D-L3 | Chevron | `ChevronDown h-3 w-3` → `rotate-180` | `ChevronRight h-4 w-4` → `rotate-90` (desktop), `h-3 w-3` (nested); `ChevronDown h-3.5` (mobile) | `trips-desktop-table.tsx:225`, `trips-statistics-companies.tsx:400`, `trips-mobile-list.tsx:171` |
| D-L4 | Sticky header | app header only | mobile day header `sticky top-0 z-10 bg-muted/95 …` | `trips-mobile-list.tsx:72` |
| D-L5 | Rule primitive | empty `border-t` divs | `Separator` primitive exists; trips still uses `border-t` divs too | `separator.tsx:14`, `trips-mobile-list.tsx:245` |
| D-L6 | Title tooltips | unconditional `title` | `Truncate` sets `title` only when clipped (chip/km cells still unconditional) | `truncate.tsx:51`, `trips-desktop-table.tsx:237` |

### States
| # | Topic | Dash | Trips | Evidence |
|---|---|---|---|---|
| D-ST1 | Empty list | bare `<p>` (`py-6 text-center text-[13px]` / `p-3 text-xs`) | `EmptyState` (dashed, `py-16`, `text-lg` title, CTA); DataTable variant `border-0 bg-transparent py-12`; solid-border box `rounded-lg border bg-muted/20 p-6 sm:p-8` for group tables; chart body `text-xs text-center` | `trips-desktop-table.tsx:76`, `data-table.tsx:271`, `trips-statistics-companies.tsx:612,252` |
| D-ST2 | Query error | `DegradedStrip` in place, content still renders | `EmptyState` + warning lottie + `Button outline` (h-9) **replacing** list and pagination; `MapErrorState` with destructive disc + hard-coded 'Retry'; nested `border-l-2 border-destructive/40 … italic`, no retry | `trips.tsx:512-518`, `trip-location-dialog.tsx:409-429`, `trips-statistics-companies.tsx:929` |
| D-ST3 | Feedback channel | inline, never toast | Sonner toasts for every mutation/export | `trips.tsx:246-335` |
| D-ST4 | Pending indicator | skeletons only; no spinner | `Loader2 animate-spin` in buttons, lists, map, refetch indicator (no motion-reduce guard) | `trips.tsx:368`, `trips-statistics.tsx:157` |
| D-ST5 | List skeleton | `space-y-2 p-3` × `h-10 w-full`; KPI `h-[92px] rounded-xl` | table: 8 rows × 10 `Skeleton h-4`; mobile 8 × `h-[84px] rounded-xl`; stats 5 × `h-[88px]` default radius in `gap-2.5`; form `h-10` fields; dialogs `h-3`/`h-2.5`/`h-16`/`h-32`/`aspect-square` | `trips-desktop-table.tsx:623`, `trips-mobile-list.tsx:54`, `trips-statistics.tsx:87`, `trip-form.tsx:1320`, `trip-receipt-dialog.tsx:157-188` |
| D-ST6 | EmptyState sizing in dialogs | palette 110px `py-6` | lottie 70/80/100/140 with `py-4`, or `py-8` dashed | `searchable-select.tsx:157`, `drop-off-picker-modal.tsx:163`, `trip-receipt-dialog.tsx:196` |
| D-ST7 | Pressed state | none | `active:bg-muted/60` on mobile rows | `trips-mobile-list.tsx:145` |
| D-ST8 | Collapse animation | none (matches) | CollapsibleSection also none — **[comment]** deliberate | `collapsible-section.tsx:98` |

### Shell / i18n / a11y
| # | Topic | Dash | Trips | Evidence |
|---|---|---|---|---|
| D-I1 | Logical vs physical | logical only | `border-l-2` nesting rules, `left-3` legend, `pr-2`/`pr-1` scroll bodies, `mr-2` spinner | `trips-statistics-companies.tsx:666`, `trip-location-dialog.tsx:280`, `duplicate-comparison-dialog.tsx:76`, `confirm-dialog.tsx:100` |
| D-I2 | Untranslated strings | all `t()` | 'Retry', 'Loading map…', 'Previous/Next month', 'Vol (L)', 'Dist (km)', 'Rev', 'Rent', 'VAT', 'Total', 'Days', 'L', 'Other', placeholders 'WT-12345' | `trip-location-dialog.tsx:429`, `map-view.tsx:165`, `month-year-selector.tsx:122`, `trips-statistics-companies.tsx:432-504`, `trips-statistics-timeline.tsx:181` |

### Trips-internal inconsistencies (recorded, not judged)
km decimals 0/1/2 across desktop/mobile/summary/timeline · three table-header specs (10.5px/h-10/px-3/`bg-muted/40` vs 12px/h-11/px-4/`bg-muted/50` vs nested 10px/9px) · expanded wells `/10`, `/20`, `/30` · label→control `space-y-1` vs `mt-1` · field grids `gap-4` vs `gap-3` · uppercase headings at 14/12/10px · lottie sizes 70–140 · warning/destructive banner alphas `/30 /5` vs `/40 /5` · two `formatNumber` helpers (`format.ts` vs `format-number.ts`) · `SearchInput` doc says debounce 200ms, hook/page use 300ms · pie uses `themedTooltipProps` but the timeline hand-rolls its tooltip and passes `tick={{ fontSize: 11 }}` without the muted fill · timeline tooltip uses className `tabular` (not a Tailwind class; `tabular-nums` intended) at `trips-statistics-timeline.tsx:342,360`.

---

## 14. Rulings on the dashboard's internal conflicts (approved 2026-08-29, applied the same day)

Each item keeps the options that were found, followed by **→ Ruling** and whether it is applied in the reference files. Tie-breakers used: majority usage in the dashboard; the rule stated in `index.css`; the recipe that already carries a reason.

### Spacing
- **C-S1 Header vs page gutters.** App header `px-4 md:px-6` (`header.tsx:15`) vs page `p-3 sm:p-4` (`dashboard.tsx:99`) — header controls and page content do not share an edge.
  **→ Ruling:** page gutters win: header is now `px-3 sm:px-4` (`header.tsx`). Applied.
- **C-S2 Panel body construction.** (a) `p-3` wrapper + `grid gap-2` of bordered `rounded-lg` row-cards (exceptions `:169-183`, category bars unbordered `:977`); (b) flush `ul.divide-y` of `px-3 py-2.5 md:px-4` rows with no wrapper (fuel `:604-616`). The `md:px-4` bump exists only because fuel rows are flush; it disappears once (a)/(b) is decided.
  **→ Ruling:** keep all three, as named roles — flush `divide-y` list for streams; `gap-2` bordered row-cards only when each row is its own link with identity/severity; plain rows for bars. No code change.
- **C-S3 Empty/error copy padding & alignment.** `py-6 text-center` inside the `p-3` body (exceptions `:171,:175`) vs `p-3` start-aligned (fuel `:600,:602`) vs `border-t bg-muted/40 p-3` (KPI drawer `:464`) vs no padding, italic (truck drawer `:883`).
  **→ Ruling:** one recipe `py-6 text-center text-xs text-muted-foreground` (with `px-3` where the parent has no padding; the KPI drawer keeps its `border-t bg-muted/40` well). Applied to exceptions, fuel, KPI drawer and truck drawer.
- **C-S4 Eyebrow margins.** `mb-1.5 mt-3.5` ('Service vehicles' `:776`) vs `mb-1 mt-2.5` ('largest' `:507`).
  **→ Ruling:** `mb-1.5 mt-3.5`. Applied to the 'largest' label.
- **C-S5 List footer padding.** loading-more `li p-3` (`:650`) vs end-note `li p-2` (`:655`).
  **→ Ruling:** `p-3`. Applied to the end-of-list note.
- **C-S6 Route-level Suspense fallback** (`app/router/index.tsx:96-115`) mirrors PageShell (`gap-6 p-4 md:p-6 lg:p-8`, KPI grid `gap-2.5 md:grid-cols-4` of `h-20`) — not the dashboard (`gap-3 p-3 sm:p-4`, `gap-3 lg:grid-cols-4` of `h-[92px]`). The shell's loading frame reflows into the dashboard on every navigation.
  **→ Ruling:** fallback mirrors the dashboard frame (`max-w-6xl gap-3 p-3 sm:p-4`, KPI grid `gap-3 lg:grid-cols-4` of `h-[92px] rounded-lg`). Applied in `app/router/index.tsx`.
- **C-S7 In-row method tag double spacing.** meta line `gap-1.5` + tag `ms-1` = 10px, every other item 6px (`:618`, `:630`). Same pattern in the sidebar brand: `gap-2` base, `gap-3` expanded, plus `ml-2` on the text (`sidebar.tsx:180-190`).
  **→ Ruling:** one gap, no extra margin — tag `ms-1` removed; sidebar brand row is `gap-3` expanded with the `ml-2` removed. Applied.
- **C-S8 Mobile breakpoint.** `useIsMobile` and the iOS input rule use `max-width: 768px` while the sidebar/scope bar switch at `lg` 1024 (`use-media-query.ts:20-21`, `index.css:195`, `header.tsx:19`).
  **→ Ruling:** left as is — 768 marks 'phone' (input zoom, list-vs-table), 1024 marks 'has a fixed sidebar'; two different questions. No code change.
### Typography
- **C-T1 Money figure face.** `font-mono tabular-nums text-money` [KPI value, drawer 'largest', tile revenue, bar amounts — 4 sites] vs `text-sm font-semibold tabular-nums text-money` in sans [fuel-row price `:634` — 1 site].
  **→ Ruling:** `font-mono tabular-nums text-money`. Applied to the fuel-row price.
- **C-T2 Twelve-pixel copy.** `text-xs` (12/16) [fuel meta, empty/error copy, litres/km] vs `text-[12px]` (inherited leading) [dl rows, bars, truck drawer] vs `text-[13px]` [exception label, "all clear"]. Specifically the exceptions panel puts `text-xs` (error `:171`) and `text-[13px]` (empty `:175`) in the same slot.
  **→ Ruling:** `text-xs` for all empty/error copy (12/16); `text-[12px]` stays for dl rows/bars (inherited leading); the 13px 'all clear' becomes `text-xs`. Applied.
- **C-T3 Pill text sizes.** ConnectionBadge `text-[11px] font-medium py-1` (`:218`) · method chip `text-[10.5px]` (`:583`) · in-row tag `text-[9.5px]` (`:630`) · Badge primitive `text-xs py-0.5 border-transparent` (`badge.tsx:6`) — four recipes for "small pill".
  **→ Ruling:** ConnectionBadge recipe is *the* status pill and the `Badge` primitive now matches it (`gap-1.5 px-2.5 py-1 text-[11px]`, status variants `border-X/40 bg-X/10 text-X`); neutral chips are `px-2 py-0.5 text-[10.5px] font-medium`; the 9.5px in-row tag becomes a chip. Applied.
- **C-T4 Hint sizes.** `text-[11.5px]` [subtitle `:106`, KPI detail `:442`, bar amounts `:991`] vs `text-[11px]` [exception hint `:958`, legend `:803`, italic notes `:873`] vs `text-[12.5px]` [DegradedStrip `:1021`].
  **→ Ruling:** keep both by role — 11.5px under a figure/title, 11px under a row label/legend; DegradedStrip stays 12.5px. No code change.
- **C-T5 Large figure sizes.** 22px KPI (`:436`) · 18px `text-lg` exception count (`:964`) · 17px tile plate (`:744`) · 15px drawer plate (`:843`) — four sizes for "the big number in this box".
  **→ Ruling:** keep as a four-step figure scale (22 KPI › 18 count › 17 tile › 15 drawer). No code change.
- **C-T6 Tile status weight.** `font-semibold` on tracked tiles (`:750`) vs regular on untracked (`:794`), same 9.5px slot.
  **→ Ruling:** regular weight for non-interactive (untracked) tiles — already the case. No code change.
- **C-T7 kbd hints.** header: sans, `py-0.5`, `rounded border`, ⌘ glyph at `text-xs` (`header.tsx:40-41`) vs palette `Kbd`: `h-5 font-mono border-border`, no `py` (`command-palette.tsx:68`).
  **→ Ruling:** the palette `Kbd` recipe (`h-5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium`); header kbd aligned. Applied.
- **C-T8 Drawer failure copy** (`dashboard.drawer.failed`, one string): `text-xs` on `border-t bg-muted/40 p-3` (`:464`) · `p-3 text-xs` (`:600`) · `text-[11px] italic` (`:883`).
  **→ Ruling:** same recipe as C-S3. Applied.
### Colour
- **C-C1 Selected fill.** fleet tile `border-primary bg-accent` (`:737`) vs nav active / calendar range `bg-primary/10` (`sidebar.tsx:230`, `cairo-range-calendar.tsx:138`).
  **→ Ruling:** `bg-primary/10 text-primary` (+ `border-primary` on tiles). Applied to the selected fleet tile.
- **C-C2 Muted tint steps.** `/60` PanelHead · `/50` hover · `/40` drawers · `/30` palette breadcrumb · `/20` palette footer & EmptyState — five steps, no stated scale (`:1001`, `:425`, `:494`, `command-palette.tsx:103,127`, `empty-state.tsx:35`).
  **→ Ruling:** three steps: `/60` head band, `/50` hover, `/40` wells; palette breadcrumb/footer moved to `/40`; `EmptyState` (`/20`, unused by the dashboard) left for the trips phase. Applied.
- **C-C3 Warning border alpha.** `border-warning/40` (badge `:221`) vs `border-warning/60 border-dashed` (strip `:1021`).
  **→ Ruling:** `border-warning/40`. Applied to DegradedStrip and its retry button.
- **C-C4 Hover recipes.** `hover:bg-muted/50` rows/cards (`:425`, `:616`, `:940`) vs `hover:border-primary` tiles (`:735`) vs `hover:bg-accent` chrome/nav (`button.tsx:18`, `sidebar.tsx:231`) vs `hover:bg-muted` calendar days (`cairo-range-calendar.tsx:153`).
  **→ Ruling:** named roles — `hover:bg-muted/50` on content rows/cards, `hover:bg-accent` on chrome and menu items, `hover:border-primary` on tiles, `hover:bg-muted` on calendar days. No code change.
- **C-C5 De-emphasis.** `text-muted-foreground` vs opacity (`opacity-70/50/40` on `:313`, `:761-765`) vs `text-muted-foreground/60`, `/50` in the palette (`command-palette.tsx:110,380`).
  **→ Ruling:** `text-muted-foreground` for secondary *text*; opacity only for secondary parts of an already-coloured element (amber stays amber). Existing sites already follow this. No code change.
- **C-C6 Menu separators.** `bg-border` (`command.tsx:108`) vs `bg-muted` (`dropdown-menu.tsx:149`, `select.tsx:130`).
  **→ Ruling:** `bg-border`. Applied to dropdown and select separators.
- **C-C7 Overlay scrim.** Dialog `bg-black/50 backdrop-blur-sm` (`dialog.tsx:18`) vs Sheet `bg-black/50` (`sheet.tsx:18`).
  **→ Ruling:** both scrims `bg-black/50 backdrop-blur-sm`. Applied to Sheet.
- **C-C8 Status dot size.** 6px on the badge and tile corner (`:226`, `:741`) vs 8px in the legend that explains the tiles (`:806`).
  **→ Ruling:** 6px (`h-1.5 w-1.5`). Applied to the legend.
### Radius / border / shadow
- **C-R1 Radius class family.** `rounded-xl` (Tailwind constant) on panels/KPI cards (`:135`, `:417`) vs `rounded-lg` (token) on tiles/rows/drawers/strip/dialog (`:735`, `:940`, `:841`, `:1021`). Same 12px today; changing `--radius` would move one family and not the other, and today the nesting hierarchy is flat (panel and tile share a radius while `rounded` sits at 4px far below `rounded-sm` 8px).
  **→ Ruling:** token family: `rounded-lg` everywhere; `rounded-xl` retired. Applied to all panels, KPI cards and the KPI skeleton.
- **C-R2 Skeleton radius.** `rounded-xl` KPI (`:126`) · `rounded-lg` fleet (`:162`) · default `rounded-md` 10px for text bars and list rows (`:456`, `:596`) — 14px-tall text bars get a 10px radius (near-pill) and the fuel-row skeleton stands in for rows that have no radius at all.
  **→ Ruling:** a skeleton takes the radius of the box it stands in: cards `rounded-lg`, text bars `rounded-sm`, flush list rows `rounded-none`. Applied.
- **C-R3 Divider idiom.** bare `border-b/t` relying on `* { border-border }` (dashboard, sidebar, header) vs explicit `border-b border-border` (palette `command-palette.tsx:103,127`).
  **→ Ruling:** bare `border-b/t` (the global rule); explicit `border-border` tolerated. No code change.
- **C-R4 Dashed-border colour.** `border-border/60` dl rows (`:497`) · `border-warning/60` strip (`:1021`) · full `border-border` + `opacity-70` on the tile (`:675`) · `border-border` + `bg-muted/20` EmptyState.
  **→ Ruling:** `border-border/60` for dashed hairlines; `border-warning/40` for the warning strip (C-C3); whole-element fading via `opacity-70` unchanged. Applied via C-C3.
- **C-R5 Floating shadow depth.** `shadow-md` Popover/Dropdown/Select (`popover.tsx:22`, `dropdown-menu.tsx:60`) vs `shadow-lg` DropdownMenuSubContent (`dropdown-menu.tsx:40`).
  **→ Ruling:** `shadow-md`. Applied to DropdownMenuSubContent.
### Buttons / controls
- **C-B1 Focus ring.** inset (`:425`, `:616`) · plain outset (`:735`, `:940`, `:244`) · `focus-visible … ring-offset-1` (Button) · `focus: … ring-offset-1` (SelectTrigger `select.tsx:18`) · `focus: … ring-offset-2` (Dialog/Sheet close) · **none** (sidebar NavLink `sidebar.tsx:228`, calendar days `cairo-range-calendar.tsx:151`, menu items rely on Radix highlight). `focus:` shows a ring on mouse click; `focus-visible:` does not.
  **→ Ruling:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` everywhere; `ring-inset` only inside `overflow-hidden`; `ring-offset-1` on Button/Select, `ring-offset-2` on close buttons; Select and close buttons moved from `focus:` to `focus-visible:`; rings added to NavLink and calendar days. Applied.
- **C-B2 Retry for one condition.** stream down shows both an underlined text button in the badge (`:241-247`) and an outline `h-7` Button with icon in the compact strip (`:1027-1035`).
  **→ Ruling:** the strip's Button is the retry; the badge shows state only. Applied with the owner's explicit go (2026-08-29) — the badge's inline refresh button was removed; `live.refresh` is reached through the compact DegradedStrip in the fleet panel.
- **C-B3 Compact control heights in one row.** header: hamburger `size=icon` 36px next to `h-8` scope trigger/select/search; sidebar footer: theme/language toggles 36px next to the `h-8 w-8` collapse button (`header.tsx:18`, `scope-bar.tsx:66,108`, `theme-toggle.tsx:25`, `sidebar.tsx:276`); popover buttons `h-7`; retry `h-7 text-[11.5px]` vs presets `h-7 text-xs`.
  **→ Ruling:** chrome rows `h-8` (hamburger, theme/language toggles now `h-8 w-8`); popover-internal buttons `h-7 text-xs` (retry aligned). Applied.
- **C-B4 Selected/toggle semantics.** `aria-pressed` + class swap (tile `:733`) · `aria-expanded` + chevron (KPI `:424`) · variant swap with no aria state (presets `scope-date-picker.tsx:133`).
  **→ Ruling:** `aria-pressed` for toggles (tiles, presets), `aria-expanded` for disclosure (KPI). Applied to the presets.
- **C-B5 Prefetch triggers.** pointer+focus+touch (KPI cards `:421-423`, nav links `sidebar.tsx:224-226`) vs pointer+focus only (tiles `:731-732`, fuel rows `:614-615`, exception rows `:938-939`).
  **→ Ruling:** pointer + focus + touch everywhere. Applied to tiles, fuel rows and exception rows.
- **C-B6 Popover width.** primitive `w-72` · scope mobile `w-60` · date picker `w-auto max-w-[min(20rem,calc(100vw-2rem))]` (`popover.tsx:22`, `scope-bar.tsx:114`, `scope-date-picker.tsx:126`).
  **→ Ruling:** primitive `w-72 p-4` is the default; call sites may size to content. No code change.
### Lists / data
- **C-D1 dl row build.** KpiDrawer row: `dt min-w-0 truncate dir=auto`, `dd shrink-0` (`:497-501`) vs TruckDrawer `Row`: dt untruncated, `dd dir=auto`, no `shrink-0` (`:832-835`); the 'largest' dl has no dividers at all (`:512`). Long labels truncate in one drawer and squeeze the value in the other.
  **→ Ruling:** KpiDrawer's build (`dt min-w-0 truncate dir=auto`, `dd shrink-0 font-mono tabular-nums`); TruckDrawer `Row` rewritten to it; the 'largest' dl gets the dashed dividers. Applied.
- **C-D2 Loading treatment per panel.** fleet and fuel show skeletons; the exceptions panel renders an empty grid while pending (`:180`); the KPI skeleton is always `lg:grid-cols-4` but non-money users get `lg:grid-cols-3` (`:124` vs `:359`) so the row reflows when data lands.
  **→ Ruling:** exceptions panel gets a skeleton while pending; the KPI skeleton's column count follows `showMoney`. Applied.
- **C-D3 KPI drawer vs Truck drawer chrome.** flush `border-t` strip (`:494`) vs `mt-3 rounded-lg border` box (`:841`). (The completeness critic argues these are genuinely different roles — one belongs to a single card, the other to a grid — and share what matters: `bg-muted/40 p-3 text-[12px]` and the dashed rows. Listed so you can confirm.)
  **→ Ruling:** not a conflict — different roles, shared traits. No code change.
### Motion
- **C-M1 Chevron duration.** `transition-transform` 150ms (KPI `:431`) vs `transition-transform duration-200` (sidebar `sidebar.tsx:281`); dashboard hover `transition-colors` 150ms vs sidebar `transition-all duration-200 ease-out` for a mostly-colour hover (`sidebar.tsx:228`).
  **→ Ruling:** `duration-200` for every chevron/collapse/icon transition. Applied to the KPI chevron and theme icons.
- **C-M2 Reduced motion.** badge dot `motion-reduce:animate-none` (`:227`) vs Skeleton with no guard (`skeleton.tsx:4`, ~12 instances on the page).
  **→ Ruling:** `motion-reduce:animate-none` on the Skeleton primitive. Applied.
- **C-M3 Overlay motion.** Dialog `duration-200` fade+zoom · Popover/Dropdown 150ms fade+zoom · Select fade only, no chevron rotation · Sheet slide 500/300ms.
  **→ Ruling:** Dialog, Popover, Dropdown and Select all `duration-200` fade + zoom-95; Sheet keeps its slide. Applied.
### Shell / i18n / a11y
- **C-I1 Logical vs physical.** dashboard/Select/Sheet use `ms-/me-/end-/start-`; Dialog close uses `right-4` + `rtl:left-4 rtl:right-auto` (`dialog.tsx:52`); palette `ml-auto`/`ml-1` (`command-palette.tsx:114,306`), sidebar brand `ml-2`/`origin-left` (`sidebar.tsx:189-190`), user-menu `ml-1` (`user-menu.tsx:75`) do not mirror in Arabic.
  **→ Ruling:** logical utilities everywhere — dialog close `end-4`, palette `ms-auto`/`ms-1`, sidebar `origin-left rtl:origin-right` and `ml-2` removed, user-menu `ms-1`. Applied.
- **C-I2 Date order and engine.** fuel list `MMM d, yyyy` (`:619`) vs day-first everywhere else (`:104`, `:109`, `:869`); date-fns without locale/timezone on the dashboard (`format.ts:13`) vs `Intl` with `ar-EG`/`en-GB` + Cairo in the scope bar and calendar (`cairo.ts:140`, `scope-date-picker.tsx:66`).
  **→ Ruling:** day-first `d MMM yyyy` everywhere (fuel list changed). Engine: date-fns `format()` stays the display engine for page content; `Intl` + Cairo stays where day *boundaries* are computed (scope bar, calendar, `cairo.ts`). Applied.
- **C-I3 z-index tiers.** `z-index.ts` documents two container tiers; Sheet hard-codes `z-[9999]` and a local `STACKED_Z`; Dialog is `z-50` with its own `DIALOG_STACKED_Z z-[10060]` — so a plain Dialog (the command palette) renders **below** an open mobile Sheet (`sheet.tsx:18,52`, `dialog.tsx:18,32,45`, `z-index.ts:19-30`).
  **→ Ruling:** Dialog uses `CONTAINER_Z`; Sheet imports `CONTAINER_Z`/`STACKED_CONTAINER_Z` instead of literals; `DIALOG_STACKED_Z` (`z-[10060]`) kept for a dialog above a stacked sheet. Applied. Note: Dialog and Sheet now share one tier, so which is on top is decided by portal mount order (the one opened last wins); that puts a palette opened from the mobile sheet above it, but is not a z-index guarantee. The trips receipt lightbox (`z-[60]`, a sibling of its Dialog) was raised to `OVERLAY_Z` in the same change so it still floats above the dialog.
- **C-I4 aria-label language.** translated (`scope-bar.tsx:109`, `theme-toggle.tsx:25`, calendar) vs hard-coded English ('Open menu' `header.tsx:21`, 'Expand/Collapse sidebar' `sidebar.tsx:277`, sr-only 'Close'/'Command Palette' `dialog.tsx:54`, `command.tsx:28`).
  **→ Ruling:** all aria/sr-only strings through `t()` (`common.openMenu`, `common.expandSidebar`, `common.collapseSidebar`, `common.close`, `commandPalette.title/description` added to en+ar). Applied.
- **C-I5 Command palette density is defined three times** (`command.tsx:121` base `px-2 py-1.5` · `command.tsx:33` CommandDialog descendant override `px-2 py-3`, input `h-12`, icons `h-5` · `command-palette.tsx:269,301,412` widget `px-4 py-2.5`/`px-4 py-3`, input `h-14`, icons `h-4`). By CSS specificity the CommandDialog override wins, so the widget's values are dead code — effective rows are `px-2 py-3` with 20px icons and a 48px input. Which was intended?

---
  **→ Ruling:** the palette widget's declared values win (`px-4 py-2.5` rows, `h-14 text-base` input, 16px item icons); the CommandDialog descendant overrides that out-ranked them were removed. Applied.
## 14b. Rulings on the trips deviations (2026-08-30)

Applied after the shard remediation, when the owner reported that the audited pages had been
squeezed. The pattern in each is the same: §13 listed a **role difference** as a deviation, and
"the dashboard wins" was applied to a **shared primitive**, turning a difference of purpose into
a uniformity error. §11 already said the dashboard contains no page header, no form and no
icon stat card — so for those, §12's trips values govern, not the dashboard's.

- **R-11 (D-S1, D-T1, D-T2) Page frame is per page kind.** The dashboard's
  `max-w-6xl gap-3 p-3 sm:p-4` and 18/20px title belong to *an overview of small panels*. A page
  whose content is a wide table, a form or a detail column uses `PageShell`'s own frame —
  `gap-6 p-4 md:p-6 lg:p-8`, no width cap (a nine-column table needs the width), `text-2xl
  md:text-3xl` title, `text-sm` description. **`page-shell.tsx` reverted; the three bespoke
  service-invoice frames restored to `gap-6 p-4 md:p-6 lg:p-8` at their original `max-w-5xl/6xl`.**
- **R-12 (D-T7, D-L1) StatCard keeps its own scale.** The dashboard's KPI card is a *vertical*
  card whose whole job is one 22px figure. `StatCard` is a *horizontal* icon tile three lines
  deep; a 22px mono value and `space-y-1.5` overflow it and defeat its container-query
  compact/full swap. Restored to `p-3 sm:p-3.5`, `space-y-0.5`, `text-sm sm:text-base md:text-lg`,
  `text-[10px] sm:text-[11px]` label and subvalue. **Kept from the audit:** `font-mono` on the
  value — §2's figure rule, and it is what makes a column of tiles align.
- **R-14 (owner, 2026-08-30) One page frame for every screen, the dashboard included.**
  After R-11 restored `PageShell`, the owner asked for the dashboard to use it too — so the frame
  is no longer "dashboard vs pages" but one shared component. `pages/dashboard/dashboard.tsx` now
  renders `<PageShell icon title description actions>`: the date is the title, the range · company ·
  updated line is the description, the `ConnectionBadge` is the actions slot. Consequences that
  supersede §1/§2/§10 where they describe the dashboard's old frame: page padding is
  `p-4 md:p-6 lg:p-8` (not `p-3 sm:p-4`), section rhythm is `gap-6` (not `gap-3`), the page title is
  `text-2xl md:text-3xl` (not `text-lg sm:text-xl`), the description is `text-sm` (not
  `text-[11.5px]`), and there is no `max-w-6xl` cap. Everything *inside* a panel — the 12px card
  padding, the 10px eyebrow, the 22px mono KPI figure, the row paddings — is unchanged.
  **The dashboard is therefore no longer frozen as an exact pixel reference; the shared primitives
  (`PageShell`, `StatCard`, `Card`, `Button`, …) are now what "the reference" means.**
- **R-13 A clipped figure explains itself.** `StatCard` values now measure themselves and, only
  while actually clipped (or while showing a compact form), become a tooltip carrying the whole
  number — Radix on hover and focus, `onPointerDown` for touch, `aria-label` for assistive tech.
  Same principle as `Truncate` (§12.4): a tooltip that is always there stops meaning
  "there is more here".

The rulings that unblocked the deferred findings (R-1..R-10) are recorded in
`.audit/deferred-rulings.md`.

## 15. Foundation defects (status after the 2026-08-29 fixes)
1. **[fixed]** Print palette (`index.css` print block) was the stock shadcn palette, not the Apex tokens; it covered only `bg-muted/50` and hid every `<header>`. Now: every print override reads the `:root` tokens (`hsl(var(--x) / a)`), `/40` and `/60` are covered, and only `footer, nav` are hidden (the app header/sidebar already carry `print:hidden`, so the dashboard's own header prints).
2. **[fixed]** `theme-color` meta was `#1e40af` (Tailwind blue-800) — now `#1b396a` (= `--primary` 217 60% 26%). The Excel brand colour `FF1E40AF` (`excel.ts`) is now `FF1B396A`.
3. **[fixed]** `--muted-foreground` was declared twice in both `:root` and `.dark` (`index.css:32-33`, `64-65`).
4. **[kept as the rule]** Button locks icon size to 16px — `[&_svg]:size-4` beats per-icon classes (`button.tsx:7`). This is now the stated rule (icons inside a Button are 16px); the dead `h-3 w-3` / `h-5 w-5` overrides on the retry icon and the header Menu were removed so code matches reality.
5. **[fixed — see C-I5]** CommandDialog descendant overrides make the palette widget's `px-4 py-2.5`, `h-14`, `h-4` icon classes dead (`command.tsx:33`) — see C-I5.
6. **[fixed — see C-I3]** z-index constants duplicated / dialog under sheet — see C-I3.
7. **[fixed]** Indicator icon overflowed its slot in Select and DropdownMenu (wrapper `h-3.5 w-3.5`, `Check h-4 w-4`) — Check is now `h-3.5 w-3.5`.
8. **[left]** `isOpen && 'lg:col-span-1'` on the KPI card is a no-op (`dashboard.tsx:417`).
9. **[left]** Duplicate tokens: `--secondary` = `--muted`, `--input` = `--border`, `--ring` = `--primary` in both modes; `--money-soft` unused on the dashboard (used once in trips).
10. **[left]** Custom keyframes unused by the reference: `accordion-down/up`, `fade-in` (`tailwind.config.ts:74-92`).
11. **[left]** No `dir` attribute in `index.html` (`lang="en"`); RTL is applied at runtime (not in the files read — presumably `shared/i18n`).

---

## 16. Method
Nine per-dimension readers over the primary set (dashboard + shell + foundation), three readers over the trips-only files given the dashboard digest as ground truth, then an adversarial conflict critic and a completeness critic (14 agents, ~1.7M tokens). Every evidence line was checked mechanically against the source (2,481 of 2,482 quotes found at the cited line ±2; the one miss was discarded). I then read all reports and every file cited in §0–§10 myself. Values are stated as written in the code; "why" is a code comment where one exists and an explicitly-tagged inference otherwise.
