# Fix log — shard-013
| Finding | Status | Detail |
|---|---|---|
| shard-013-F01 | applied | `text-3xl font-semibold tabular-nums text-warning` → `font-mono text-[22px] font-semibold leading-none tabular-nums text-warning` in locations.tsx:225 |
| shard-013-F02 | applied | `mt-1 text-2xl font-semibold tabular-nums` → `mt-1.5 font-mono text-[22px] font-semibold leading-none tabular-nums` in locations.tsx:255, :268 (`dir="ltr"` kept) |
| shard-013-F03 | applied | `flex items-center gap-2 text-sm text-muted-foreground` → `flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` in locations.tsx:251, :264 |
| shard-013-F04 | applied | `mt-0.5 text-sm` → `mt-1.5 text-[11.5px]` (:228); `text-xs` → `mt-1.5 text-[11.5px]` (:258, :271) in locations.tsx |
| shard-013-F05 | applied | `p-4` → `p-3` on the three header cards; `mb-4` → `mb-3` on the grid in locations.tsx:216-263 |
| shard-013-F06 | applied | `border-warning/50 bg-warning/5` → `border-warning/40 bg-warning/10`; `bg-success/5` → `bg-success/10` in locations.tsx:220 |
| shard-013-F07 | applied | moot — pills swapped to `Button` (F08), which carries the focus-visible ring |
| shard-013-F08 | applied | structural: raw `<button>` pill → `<Button size="sm" variant={active ? 'default' : 'outline'} className="h-7 text-xs" aria-pressed>` keeping key/type/onClick/count span; count span `opacity-80` → `opacity-70` in locations.tsx:186-202 |
| shard-013-F09 | applied | removed `className="px-1.5"` from `<Badge variant="warning">` in locations.tsx:291 |
| shard-013-F10 | skipped | low confidence |
| shard-013-F11 | applied | `<Trash2 className="h-4 w-4" />` → `<Trash2 />`; `<Save className="me-1.5 h-4 w-4" />` → `<Save />`; Loader2 `me-1.5 h-4 w-4 animate-spin` → `animate-spin motion-reduce:animate-none`; dropped `gap-1.5` from the delete Button in locations-dropoff-dialog.tsx:218-234 |
| shard-013-F12 | applied | `motion-reduce:animate-none` added next to `animate-spin` in locations-dropoff-dialog.tsx:232 |
| shard-013-F13 | applied (partial) | added `name="lat"/"lng"/"radius_m"`, `autoComplete="off"`, `inputMode="decimal"/"decimal"/"numeric"` to the three Inputs; placeholders `30.044420…`, `31.235712…` in locations-dropoff-dialog.tsx:151-191. Radius placeholder ellipsis NOT applied: the locale key `locations.fields.radiusDefaultPlaceholder` is shared with the drop-offs table radius cell (columns.tsx:46), where "Default (300 m)…" would be wrong copy — locale files left untouched |
| shard-013-F14 | skipped | needs-ruling — Notes say the success→warning role mapping is a judgment call (also coupled to the queue row icon) |
| shard-013-F15 | applied | added `font-mono` to the coordinates cell (columns.tsx:73) and the radius cell (columns.tsx:43) |
| shard-013-F16 | applied | `text-muted-foreground` → `opacity-40` on both `—` spans in columns.tsx:61, :70 |
| shard-013-F17 | skipped | out-of-shard: `src/shared/lib/maps/google-provider.tsx` parses marker colours as hex (`hex(d.color)`), so `hsl(var(--primary))` would break markers; the token-resolution path is structural and needs the out-of-shard MapView confirmation |
| shard-013-F18 | applied | added `aria-expanded={expanded}` and `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` to the row toggle in locations-needs-attention.tsx:586-596 |
| shard-013-F19 | applied | `hover:bg-muted/40` → `hover:bg-muted/50`; expanded `bg-muted/30` → `bg-muted/40` in locations-needs-attention.tsx:584, :596 |
| shard-013-F20 | applied | row title `text-sm font-medium` → `text-[13px] font-medium leading-snug`; hint `text-xs` → `text-[11px]` in locations-needs-attention.tsx:601, :610 |
| shard-013-F21 | applied | structural (recommended option): `<Badge variant="outline" className="shrink-0 text-[10px]">` → `<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">` with the same children in locations-needs-attention.tsx:604; the now-unused `Badge` import removed to keep tsc/lint clean |
| shard-013-F22 | skipped | needs-ruling — Notes say apply only if the owner rules for the dashboard recipe (§13 D-ST1 unruled) |
| shard-013-F23 | applied | `p-6 text-center text-sm text-muted-foreground` → `px-3 py-6 text-center text-xs text-muted-foreground` in locations-needs-attention.tsx:398 |
| shard-013-F24 | applied | moot — pills swapped to `Button` (F25), which carries the focus-visible ring |
| shard-013-F25 | applied | structural: raw `<button>` pill → `<Button size="sm" variant={active ? 'default' : 'outline'} className="h-7 text-xs" aria-pressed>` keeping key/type/onClick/label/count span; count span `opacity-80` → `opacity-70` in locations-needs-attention.tsx:338-352; NativeSelect left at `h-8` per Notes |
| shard-013-F26 | applied | strip → `flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`, text wrapped in `<span className="min-w-0">`, icon `h-4 w-4` → `h-3.5 w-3.5` in locations-needs-attention.tsx:323-324 (optional retry button not added) |
| shard-013-F27 | applied | wrapper `space-y-2` → `space-y-2 rounded-lg border bg-card p-3`; skeletons `h-12 w-full` → `h-10 w-full rounded-none` in locations-needs-attention.tsx:281-285 |
| shard-013-F28 | applied | chevron `h-4 w-4 … transition-transform` → `h-3 w-3 … transition-transform duration-200`; `aria-hidden="true"` added in locations-needs-attention.tsx:617-619 |
| shard-013-F29 | applied (partial) | dots `h-2.5 w-2.5` → `h-1.5 w-1.5` + `aria-hidden="true"`; legend `text-xs` → `text-[11px]` in locations-needs-attention.tsx:652-658. Inline hex `style` kept so the legend stays in step with the map markers (F17 skipped) |
| shard-013-F30 | applied | removed `h-3.5 w-3.5` from the six Button icons; spinners → `animate-spin motion-reduce:animate-none`; `gap-1.5` dropped from the four Buttons' `className` (prop kept as `""`) in locations-needs-attention.tsx:524-681 |
| shard-013-F31 | applied | `space-y-4` → `space-y-3` in locations-needs-attention.tsx:321 |
| shard-013-F32 | applied | `rounded-md border border-primary/30 bg-primary/5 p-2.5 text-sm` → `rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-[12.5px]` in locations-dropoff-dialog.tsx:140 |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 28 SKIPPED: 4
