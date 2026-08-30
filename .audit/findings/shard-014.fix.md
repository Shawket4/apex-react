# Fix log — shard-014
| Finding | Status | Detail |
|---|---|---|
| shard-014-F01 | applied | `left-0 right-0` removed (superseded by F02's flowing hint) in oil-change-form.tsx:241 |
| shard-014-F02 | applied | `absolute bottom-0 left-0 right-0 flex items-center gap-1.5 text-xs text-primary` → `mt-1 flex items-center gap-1.5 text-[11px] font-medium text-primary` in oil-change-form.tsx:241 |
| shard-014-F03 | applied | appended `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the clear button in oil-change-form.tsx:253 |
| shard-014-F04 | applied | `text-[10px] font-bold text-muted-foreground` → `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` in oil-change-form.tsx:428 |
| shard-014-F05 | skipped | nit that needs a new locale key (`common.currency` exists but is the label "Currency", not the code) — not a pure class-level edit |
| shard-014-F06 | applied | `space-y-4` → `space-y-6`; `rounded-lg` added to the three skeletons in oil-change-form.tsx:177-180 |
| shard-014-F07 | skipped | needs-ruling — Notes say the form-heading size awaits the owner's ruling on D-T3 |
| shard-014-F08 | applied | sticky footer → `sticky bottom-4 flex flex-col-reverse gap-2 rounded-lg border bg-card p-3 shadow-md sm:flex-row sm:justify-end` in oil-change-form.tsx:452 (`md:me-auto` on Reset kept) |
| shard-014-F09 | applied | dropped `h-4 w-4` from `RotateCcw`, `Loader2`, `Save` in oil-change-form.tsx:461,475,477 |
| shard-014-F10 | applied | `animate-spin` → `animate-spin motion-reduce:animate-none` on every `Loader2` in oil-change-form.tsx and locations-terminal-dialog.tsx |
| shard-014-F11 | skipped | nit that needs a new locale key — not a pure class-level edit |
| shard-014-F12 | applied | `me-1.5 h-4 w-4` removed from Save-button icons in locations-terminal-dialog.tsx:253,255 |
| shard-014-F13 | applied | `h-3 w-3` / `h-3.5 w-3.5` removed from Plus, Pencil, Loader2, Trash2, X, Save inside Buttons in locations-terminal-dialog.tsx |
| shard-014-F14 | applied | `h-7 gap-1.5 text-xs` → `h-7 px-2.5 gap-1.5 text-xs` (line 379); `h-7 gap-1 text-xs` → `h-7 px-2.5 gap-1.5 text-xs` (lines 548, 560) |
| shard-014-F15 | applied | `bg-muted/20` → `bg-muted/40` in locations-terminal-dialog.tsx:368 |
| shard-014-F16 | applied | `rounded-md` → `rounded-lg` on the pattern list card and the add/edit form card |
| shard-014-F17 | applied | spinner + "Loading…" block → two `Skeleton h-10 w-full rounded-none` in `space-y-2`; `Skeleton` imported; `isLoading` branch kept |
| shard-014-F18 | applied | `py-1 text-xs text-muted-foreground` → `py-6 text-center text-xs text-muted-foreground` |
| shard-014-F19 | applied | `<code>` → `inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium` |
| shard-014-F20 | applied | `p-2.5` → `px-3 py-2.5` on pattern list rows |
| shard-014-F22 | applied | `text-muted-foreground tabular-nums` → `font-mono tabular-nums text-muted-foreground` in columns.tsx:54 |
| shard-014-F23 | applied | em dashes wrapped/marked with `opacity-40` in columns.tsx:30,72,81 |
| shard-014-F24 | applied | class ternary collapsed to `text-xs font-medium text-primary`; label ternary kept in columns.tsx:104 |
| shard-014-F25 | applied | `border-X/30 bg-X/5` → `border-X/40 bg-X/10` for success/warning/destructive in oil-change-status-preview.tsx |
| shard-014-F26 | applied | eyebrow `text-xs` → `text-[10px]` in oil-change-status-preview.tsx:74 |
| shard-014-F27 | applied | `font-mono` added to both km figures in oil-change-status-preview.tsx:80,86 |
| shard-014-F28 | applied | `p-4` → `p-3` in oil-change-status-preview.tsx:70 |
| shard-014-F29 | applied | `aria-hidden="true"` on Gauge, AlertCircle, MapPin, Regex, Car, History, Wrench |
| shard-014-F30 | applied | Gauge `h-5 w-5` → `h-3.5 w-3.5` |
| shard-014-F31 | applied | `name` + `autoComplete` (`street-address` for address, `off` elsewhere) on the 7 terminal-dialog Inputs; `autoComplete="off"` on the 5 oil-change-form Inputs |
| shard-014-F32 | applied | `aria-describedby={regexError ? 'rp-pattern-error' : undefined}` on the pattern Input; `id="rp-pattern-error"` on the message |
| shard-014-F33 | skipped | nit that needs a new locale key — not a pure class-level edit |
| shard-014-F34 | applied | `grid gap-2 sm:grid-cols-2` → `grid gap-3 sm:grid-cols-2` in the pattern form |
| shard-014-F21 | n/a | recorded as no-finding in the audit |
| shard-014-F35 | n/a | recorded as no-finding in the audit |
Gates: tsc ok, lint-diff ok (770 → 770, 0 new)
APPLIED: 29 SKIPPED: 4
