# Fix log — shard-004
| Finding | Status | Detail |
|---|---|---|
| shard-004-F01 | applied | `MapLoadingState` now uses `useTranslation`; caption is `sr-only` `t('common.loadingMap', { defaultValue: 'Loading map…' })` in `src/shared/ui/map-view.tsx:163-169`; `common.loadingMap` added to en.json/ar.json |
| shard-004-F02 | applied | superseded by F03 — the `animate-spin` element was removed with the hand-rolled spinner in `src/shared/ui/map-view.tsx` |
| shard-004-F03 | applied | spinner block → `<Skeleton className="h-full w-full rounded-lg" />` (imported from `./skeleton`) in `src/shared/ui/map-view.tsx:163-169`; both call sites (`:148`, `:206`) unchanged |
| shard-004-F04 | applied | `bg-muted/30` → `bg-muted/40` in `src/shared/ui/map-view.tsx:164` |
| shard-004-F05 | applied | `aria-label="Previous month"` / `"Next month"` → `t('common.previousMonth'…)` / `t('common.nextMonth'…)` in `src/shared/ui/month-year-selector.tsx:80,124`; `t` destructured from the existing `useTranslation()`; keys added to en.json/ar.json (existing `previousMonth`/`nextMonth` sat in a feature namespace, not `common`) |
| shard-004-F06 | applied | focus ring now arrives via the Button primitive (see F07) in `src/shared/ui/month-year-selector.tsx:76,120` |
| shard-004-F07 | applied | both raw `<button>`s → `Button variant="ghost" size="icon" className="h-7 w-7"`; chevrons lost `h-3.5 w-3.5`, kept `rtl:rotate-180`; `onClick`, `type="button"`, `aria-label` preserved (`src/shared/ui/month-year-selector.tsx:76-84,120-128`) |
| shard-004-F08 | applied | `focus:ring-1` removed from both borderless SelectTriggers in `src/shared/ui/month-year-selector.tsx:93,109` |
| shard-004-F09 | applied | `'h-9' : 'h-10'` → `'h-8' : 'h-9'` in `src/shared/ui/multi-select.tsx:130`; prop and both branches kept |
| shard-004-F10 | applied | heading `text-xs` → `text-[10px]` in `src/shared/ui/multi-select.tsx:185` |
| shard-004-F11 | applied | selected `bg-accent text-accent-foreground` → `bg-primary/10 text-primary`; hover `hover:bg-accent/60` → `hover:bg-accent hover:text-accent-foreground` in `src/shared/ui/multi-select.tsx:222-225` |
| shard-004-F12 | applied | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended to the option button class in `src/shared/ui/multi-select.tsx:221` |
| shard-004-F13 | applied | `opacity-40` → `opacity-50` in `src/shared/ui/multi-select.tsx:226` |
| shard-004-F14 | applied | dot `h-2 w-2` → `h-1.5 w-1.5` + `aria-hidden="true"` in `src/shared/ui/multi-select.tsx:229-232` |
| shard-004-F15 | applied (class-level fallback) | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` added to the clear span in `src/shared/ui/multi-select.tsx:170`. The structural option was not taken: `PopoverTrigger asChild` accepts exactly one child, so moving the clear affordance out of the trigger requires a new wrapper element around the trigger — a layout change beyond the class-level scope, and the finding names this fallback explicitly. `clear`, `onKeyDown` and the `!compact && count > 0` branch untouched |
| shard-004-F16 | applied | lottie `70` → `110` (both axes), `py-4` → `py-6` in `src/shared/ui/multi-select.tsx:204-207` |
| shard-004-F17 | skipped | needs-ruling — Notes call it a judgment call and defer to the owner ("if the owner keeps navy, leave as is") |
| shard-004-F18 | skipped | low confidence |
| shard-004-F19 | applied | `text-foreground` added after `bg-background` in `src/shared/ui/native-select.tsx:24` |
| shard-004-F20 | applied | `flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8` → `mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 p-3 sm:p-4` (`:22`); children `gap-6` → `gap-3` (`:39`) in `src/shared/ui/page-shell.tsx` |
| shard-004-F21 | applied | header `flex flex-col justify-between gap-4 sm:flex-row sm:items-start` → `flex items-center justify-between gap-3` in `src/shared/ui/page-shell.tsx:23` |
| shard-004-F22 | applied | h1 `text-2xl font-semibold tracking-tight md:text-3xl` → `text-lg font-semibold leading-tight sm:text-xl` (`truncate` kept) in `src/shared/ui/page-shell.tsx:31` |
| shard-004-F23 | applied | wrapper `space-y-1` → `space-y-0.5` (`:30`); description `text-sm` → `text-[11.5px]` (`:33`) in `src/shared/ui/page-shell.tsx` |
| shard-004-F24 | applied | `transition-all` → `transition-transform duration-200 motion-reduce:transition-none` in `src/shared/ui/progress.tsx:15` |
| shard-004-F25 | applied | `bg-secondary` → `bg-muted` in `src/shared/ui/progress.tsx:11` |
| shard-004-F26 | applied | `py-8 … text-sm` → `py-6 … text-xs`; fallback wrapped as `<span className="opacity-40">—</span>` in `src/shared/ui/ranked-list.tsx:59-60` |
| shard-004-F27 | applied | value span → `shrink-0 font-mono text-sm font-semibold tabular-nums` in `src/shared/ui/ranked-list.tsx:85` |
| shard-004-F28 | applied | track `h-1.5 … rounded-full` → `h-[15px] … rounded`; fill `h-full rounded-full bg-primary` → `block h-full rounded bg-money`; width `${widthPct}%` → `${Math.max(widthPct, 2)}%` in `src/shared/ui/ranked-list.tsx:90-94`; `barClassName` override kept |
| shard-004-F29 | applied | `hover:bg-muted/40` → `hover:bg-muted/50` in `src/shared/ui/ranked-list.tsx:78` |
| shard-004-F30 | applied | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended inside the `item.onClick &&` branch in `src/shared/ui/ranked-list.tsx:78-79`; `Wrapper` switch untouched |
| shard-004-F31 | applied | `space-y-3` → `space-y-2` in `src/shared/ui/ranked-list.tsx:66` |
| shard-004-F32 | applied | label span → `min-w-0 truncate text-sm font-medium` + `dir="auto"` in `src/shared/ui/ranked-list.tsx:82-84` |
| shard-004-F33 | applied | `text-xs` → `font-mono text-[11px]` in `src/shared/ui/ranked-list.tsx:97` |
| shard-004-F34 | applied | `placeholder = 'Search...'` default removed; body now resolves `placeholder ?? t('common.searchPlaceholder')` and passes it to both `placeholder` and `aria-label` (`src/shared/ui/search-input.tsx:82,89-90,117,124`); prop kept and signature unchanged. `common.searchPlaceholder` re-typeset to end with `…` in en.json/ar.json |
| shard-004-F35 | applied | `aria-label="Clear search"` → `aria-label={t('common.clear')}` in `src/shared/ui/search-input.tsx:137` |
| shard-004-F36 | applied | `autoComplete="off"`, `name={id ?? 'search'}`, `inputMode="search"` added to the `<Input>` in `src/shared/ui/search-input.tsx:119-121`; `type="text"` kept |
| shard-004-F37 | applied | straight quotes → `“…”` at `src/shared/ui/searchable-select.tsx:175,192` |
| shard-004-F38 | applied | lottie `70` → `110` (both axes), `py-4` → `py-6` in `src/shared/ui/searchable-select.tsx:157-160` |
| shard-004-F39 | applied | `className="p-0"` → `cn('p-0', matchTriggerWidth && 'w-[--radix-popover-trigger-width]')` in `src/shared/ui/searchable-select.tsx:143`; the measuring effect and inline `style` left in place |
| shard-004-F40 | applied | all three value `<p>`s: `text-sm font-semibold leading-tight tracking-tight tabular-nums sm:text-base md:text-lg` → `font-mono text-[22px] font-semibold leading-none tabular-nums` in `src/shared/ui/stat-card.tsx:73,81,91`; `truncate`, `stat-card-compact`/`stat-card-full` and `valueClassName` kept |
| shard-004-F41 | applied | `font-medium` → `font-semibold`, `sm:text-[11px]` removed in `src/shared/ui/stat-card.tsx:66` |
| shard-004-F42 | applied | `text-[10px] … sm:text-[11px]` → `text-[11.5px]` in `src/shared/ui/stat-card.tsx:99` |
| shard-004-F43 | applied | `p-3 sm:gap-3 sm:p-3.5` → `p-3` (`:54`); `space-y-0.5` → `space-y-1.5` (`:65`) in `src/shared/ui/stat-card.tsx` |
| shard-004-F44 | applied | `focus-visible:ring-offset-2` → `focus-visible:ring-offset-1` in `src/shared/ui/switch.tsx:11` |
| shard-004-F45 | applied | thumb `shadow-lg` → `shadow-sm` in `src/shared/ui/switch.tsx:19` |
| shard-004-F46 | applied | `transition-all` → `transition-colors` in `src/shared/ui/tabs.tsx:29` |
| shard-004-F47 | skipped | needs-ruling — Notes state D-B2 (segmented choice) is "a listed deviation awaiting a ruling" |
| shard-004-F48 | applied | `'mt-2 focus-visible:outline-none'` → `'mt-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'` in `src/shared/ui/tabs.tsx:43-46` |
| shard-004-F49 | applied | `richColors` → `richColors={false}` (`:20`) and token-based `success`/`error`/`warning`/`info` entries added to `toastOptions.classNames` in `src/shared/ui/toaster.tsx:28-34` |
| shard-004-F50 | applied | `loop` → `loop={false}` on both lottie icons; `motion-reduce:hidden` added to both `h-10 w-10` wrappers (the Suspense fallback box stands in) in `src/shared/ui/toaster.tsx:41-50` |
| shard-004-F51 | applied | `drop-shadow-md` removed from both icon wrappers in `src/shared/ui/toaster.tsx:41,48` |
| shard-004-F52 | skipped | low confidence |
| shard-004-F53 | applied | `animate-in fade-in-0 zoom-in-95` → `duration-200 data-[state=delayed-open]:animate-in data-[state=instant-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95` in `src/shared/ui/tooltip.tsx:18` |
| shard-004-F54 | skipped | low confidence |
Gates: tsc ok, lint-diff ok (baseline 770, now 770, 0 new)
APPLIED: 49 SKIPPED: 5
