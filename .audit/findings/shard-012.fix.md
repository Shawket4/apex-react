# Fix log — shard-012
| Finding | Status | Detail |
|---|---|---|
| shard-012-F01 | applied | total-price headline → `font-mono text-[22px] font-semibold leading-none tabular-nums text-money`; DetailRow money values wrapped in `<span className="font-mono tabular-nums text-money">` (fuel-event-details.tsx) |
| shard-012-F02 | applied | `text-3xl font-semibold` → `font-mono text-[22px] font-semibold leading-none tabular-nums` on the three headline figures (`eff.className` kept) |
| shard-012-F03 | applied | DetailRow value `truncate font-medium` → `font-mono text-sm font-medium tabular-nums` + `dir="auto"`; sub-lines get `font-mono tabular-nums` |
| shard-012-F04 | applied | DetailRow label → `text-[10px] font-semibold uppercase tracking-wider`; highlight-card labels → eyebrow recipe with `h-3 w-3` icons |
| shard-012-F05 | applied | `p-5` → `p-3` (4 cards); `gap-5` → `gap-3`; `my-5` → `my-3`; grid `gap-4` → `gap-3`; loading `space-y-4` → `space-y-3` |
| shard-012-F06 | applied | `shadow-none` added to all four `<Card>`s |
| shard-012-F07 | applied | details `<h2>` moved above `CardContent` as PanelHead band; Card `overflow-hidden`; `mb-4` dropped |
| shard-012-F08 | applied | `'PPP'` → `'d MMM yyyy'` at both sites |
| shard-012-F09 | applied | skeletons `rounded-lg` (3× `h-[92px]` in `md:grid-cols-3` + `h-64`), title bar `rounded-sm` |
| shard-012-F10 | skipped | low confidence |
| shard-012-F11 | applied | `dir="auto"` on driver-name span in PageShell description |
| shard-012-F12 | applied | `h-4 w-4` dropped on icons inside `Button` in details/edit/new/fuel-events/filters |
| shard-012-F13 | applied | `className="gap-1"` removed from view-only Badge; table Badge override replaced via F40 |
| shard-012-F14 | applied | edit skeletons `rounded-lg`, `space-y-4` → `space-y-3` |
| shard-012-F15 | skipped | low confidence |
| shard-012-F16 | applied | stat grid `gap-2.5` → `gap-3` |
| shard-012-F17 | applied | `tone="primary"/"success"/"warning"` → `tone="default"`; money values wrapped in `<span className="text-money">` |
| shard-012-F18 | applied | search Input: `type="search" name="q" aria-label autoComplete="off" spellCheck={false}` |
| shard-012-F19 | applied | via F20 — `GroupingButton` now renders `Button` (carries the focus ring) |
| shard-012-F20 | applied | `GroupingButton` → `Button variant={active?'default':'outline'} size="sm" className="h-7 text-xs" aria-pressed`; tray → `flex items-center gap-1.5` `role="group"` (aria-label kept); unused `cn` import removed |
| shard-012-F21 | applied | Input `h-8 ps-9`; filters: Filter button `h-8`, sort wrapper `h-8`, SelectTrigger `h-8`, direction button `h-8 w-8` |
| shard-012-F22 | applied | paired explainer → `rounded-lg border-dashed border-border/60 bg-muted/40 px-3 py-2.5 text-[12.5px]`; icon `text-muted-foreground` |
| shard-012-F23 | applied | error `EmptyState` → warning strip with `AlertTriangle` + `h-7` outline retry (same `refetch` handler); `EmptyState` import removed (unused) |
| shard-012-F24 | applied | empty `EmptyState` → `rounded-lg border bg-card px-3 py-6 text-center text-xs text-muted-foreground` block; `canEditFuel` branch + `intentProps` kept |
| shard-012-F25 | applied | popover heading `text-xs` → `text-[10px]` |
| shard-012-F26 | applied | clear button: `rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| shard-012-F27 | applied | status option buttons: ring classes appended |
| shard-012-F28 | applied | selected → `bg-primary/10 text-primary`; hover → `hover:bg-accent hover:text-accent-foreground` |
| shard-012-F29 | applied | dots `h-2 w-2` → `h-1.5 w-1.5` + `aria-hidden` |
| shard-012-F30 | applied | via F31 — `MethodButton` renders `Button` (ring from primitive) |
| shard-012-F31 | applied | `MethodButton` → `Button variant swap size="sm" h-7 text-xs aria-pressed`; tray → `flex items-center gap-1.5` `role="group"`; `disabled`/`icon`/`label`/`count` props kept |
| shard-012-F32 | applied | `opacity-40` → `opacity-50` on disabled |
| shard-012-F33 | applied | count chip → `rounded-full bg-muted px-2 py-0.5 font-mono text-[10.5px] font-medium tabular-nums text-foreground`; active/inactive colour swap neutralised (ternary kept) |
| shard-012-F34 | applied | SelectTrigger → `h-8 w-auto min-w-32 gap-2 rounded-e-none border-e-0` |
| shard-012-F35 | applied | `'MMM d, yyyy'` → `'d MMM yyyy'` (2 sites); `'MMM d'` → `'d MMM'` (2 sites) |
| shard-012-F36 | applied | row price → `font-mono text-sm font-semibold tabular-nums text-money`; flat price cell wrapped; group cost `Stat` gets `className="font-mono text-money"` |
| shard-012-F37 | applied | flat plate `font-mono font-medium tabular-nums`; group-row plate `shrink-0 font-mono tabular-nums text-foreground` |
| shard-012-F38 | applied | `tabular-nums` added to litres/km/rate spans; flat litres cell wrapped |
| shard-012-F39 | applied | tooltip trigger spans: `tabIndex={0}` + `rounded-sm` + ring classes |
| shard-012-F40 | applied | Badge `className={cn(a.status === 'paired' && 'border-primary/40 bg-primary/10 text-primary')}` |
| shard-012-F41 | applied | group title → `cn('truncate text-[15px] font-semibold', grouping==='vehicle' && 'font-mono tabular-nums')` + `dir="auto"` for driver |
| shard-012-F42 | applied | `hover:bg-muted/40` → `hover:bg-muted/50` |
| shard-012-F43 | applied | header div: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` |
| shard-012-F44 | applied | `p-3 md:p-4` → `p-3` (header + 2 skeleton sites) |
| shard-012-F45 | applied | export icon button: ring classes appended |
| shard-012-F46 | applied | export icon button → `rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50` |
| shard-012-F47 | applied | `animate-spin` → `animate-spin motion-reduce:animate-none` |
| shard-012-F48 | applied | chevron → `h-3 w-3 … transition-transform duration-200` + `aria-hidden` |
| shard-012-F49 | applied | filter-hid-all block → `px-3 py-6 text-center text-xs text-muted-foreground`; icon `aria-hidden` |
| shard-012-F50 | applied | row button: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` |
| shard-012-F51 | skipped | would delete handler (`onClick` navigate → `<Link>`) |
| shard-012-F52 | applied | rate span → `inline-flex items-center gap-1.5`; excluded tag → neutral chip, `ms-1` and parentheses dropped |
| shard-012-F53 | applied | bar skeletons `rounded-sm`; body stand-in `h-10 w-full rounded-none` |
| shard-012-F54 | applied | paired pill → `px-2 py-0.5 text-[10.5px]`; icon `h-3 w-3`; count `font-mono tabular-nums` |
| shard-012-F55 | applied | `'—'` → `<span className="opacity-40">—</span>` in table driver cell and DetailRow |
| shard-012-F56 | applied | `shadow-none` on group Card and skeleton Card |
| shard-012-F57 | applied | `dir="auto"` on driver-name spans (group row + flat cell) |
| shard-012-F58 | skipped | low confidence |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 54 SKIPPED: 4
