# Fix log — shard-029
| Finding | Status | Detail |
|---|---|---|
| shard-029-F01 | applied | added `aria-label={t('common.refresh')}` to the refresh Button and `aria-hidden="true"` to `RefreshCw` in `src/pages/users/users.tsx:95-102` (key `common.refresh` already exists in en/ar) |
| shard-029-F02 | applied | dropped `className="h-9 w-9"` and `className="h-9 gap-2"` (variant defaults) in `src/pages/users/users.tsx:95-104` |
| shard-029-F03 | applied | two hand-rolled `animate-pulse` divs → `Skeleton` (`h-20 rounded-lg`, `h-64 rounded-lg`) + `import { Skeleton }` in `src/widgets/users-table/users-table.tsx:53-56` |
| shard-029-F04 | applied | `rounded-xl` → `rounded-lg` at `users-table.tsx:53,56` (via F03) and `:92`, `:209` |
| shard-029-F05 | applied | `text-left` → `text-start` on the table in `users-table.tsx:93` |
| shard-029-F06 | applied | `mr-2` → `me-2` on the Edit/Trash2 menu icons in `users-table.tsx:183,190` |
| shard-029-F07 | applied | added `aria-label`/`title` `t('common.actions')` to the row-actions trigger in `users-table.tsx:177` |
| shard-029-F08 | applied | `font-bold` → `font-semibold`, `bg-muted/30` → `bg-muted/60` on the thead band in `users-table.tsx:94` |
| shard-029-F09 | applied | `font-bold` → `font-semibold` on the two mobile-card eyebrows in `users-table.tsx:225,234` |
| shard-029-F10 | applied | `hover:bg-muted/20` → `hover:bg-muted/50` in `users-table.tsx:106` |
| shard-029-F11 | applied | `divide-y divide-border/50` → `divide-y` in `users-table.tsx:104` |
| shard-029-F12 | applied | removed `shadow-sm` in `users-table.tsx:92` and `:209` |
| shard-029-F13 | applied | `tone="success"/"warning"/"destructive"` → `tone="default"` on the three category StatCards in `users-table.tsx:75,81,87`; `tone="primary"` kept on the total |
| shard-029-F14 | applied | permission variant map → `1:'outline', 2:'outline', 3:'secondary', 4:'secondary'` in `users-table.tsx:152-159` (no `default`/`destructive`); covers the mobile card too |
| shard-029-F15 | applied | added `font-mono` beside `tabular-nums` at `users-table.tsx:109,115,229,238` |
| shard-029-F16 | applied | structural: `users.length === 0 && !loading` now renders `EmptyState` (`no_results.json`, `t('common.noResults')`) in place of the desktop table + mobile grid; both existing branches kept inside the else fragment (`users-table.tsx`) |
| shard-029-F17 | applied | `aria-hidden="true"` added to the decorative icons at `users-table.tsx:178,213,226,235,246,255` |
| shard-029-F18 | applied | `mr-2 h-4 w-4 animate-spin` → `animate-spin motion-reduce:animate-none`; `className="mr-2 h-4 w-4"` dropped on `RefreshCw`/`QrCode` in `whatsapp-gateway-card.tsx:97,99,106` |
| shard-029-F19 | applied | added `width={256} height={256}` to the QR `<img>` in `whatsapp-gateway-card.tsx:126` |
| shard-029-F20 | applied | `motion-reduce:animate-none` appended to both `Loader2` spinners in `whatsapp-gateway-card.tsx:97,136` |
| shard-029-F21 | applied | `aria-hidden="true"` on `MessageCircle` (`:71`) and the in-button icons (`:97,99,106`) in `whatsapp-gateway-card.tsx` |
| shard-029-F22 | applied | `mr-2 h-4 w-4 animate-spin` → `animate-spin motion-reduce:animate-none` + `aria-hidden` in `zone-form-dialog.tsx:219` |
| shard-029-F23 | applied | bare `*` → `<span className="text-destructive">*</span>` in `zone-form-dialog.tsx:114,128,147,166` |
| shard-029-F24 | applied | Cancel `variant="ghost"` → `variant="outline"` in `zone-form-dialog.tsx:215` |
| shard-029-F25 | applied | removed `shadow-sm` from the active-switch well in `zone-form-dialog.tsx:185` |
| shard-029-F26 | applied | placeholder default → `'e.g. Headquarters…'` (`zone-form-dialog.tsx:116`) and `zones.fields.namePlaceholder` updated in `en.json` (`e.g. Headquarters…`) and `ar.json` (`مثل المقر الرئيسي…`) |
| shard-029-F27 | skipped | out-of-shard: `src/shared/lib/maps/google-provider.tsx` parses hex only (marker colour goes into a generated SVG data-URI at `google-provider.tsx:177`, circles fall back to `#3b82f6`), so `hsl(var(--x))` would render an invisible marker; the finding itself defers this to a provider change |
| shard-029-F28 | skipped | low confidence (nit · low) |
| shard-029-F29 | applied | structural: `window.confirm` replaced by a `deletingZone` state + mounted `ConfirmDialog` (`variant="destructive"`, `loading={deleteMutation.isPending}`); `handleDelete` kept and `deleteMutation.mutateAsync` moved into `onConfirmDelete` in `src/pages/zones/zones.tsx:46-50` |
| shard-029-F30 | applied | `size="sm"` on both header Buttons, labels wrapped in `<span className="hidden sm:inline">`, redundant `className="gap-2"` dropped in `zones.tsx:75-91` |
| shard-029-F31 | applied | `h-4 w-4 animate-spin` → `animate-spin motion-reduce:animate-none` on `Loader2` and redundant sizing dropped on `Radar` in `zones.tsx:82,84` |
| shard-029-F32 | applied | structural: destructured `isError`/`refetch` from `useZones()` and added an `EmptyState` + `warning.lottie` + `Button outline` retry branch in place of `<ZonesTable>`; table branch untouched (`zones.tsx`) |
| shard-029-F33 | applied | `aria-label`/`title` `t('common.actions')` on the trigger and `aria-hidden="true"` on `MoreHorizontal` in `zones-table/columns.tsx:27-28` |
| shard-029-F34 | applied | `mr-2` → `me-2` + `aria-hidden="true"` on Edit/Power/Trash2 in `zones-table/columns.tsx:33,37,44` |
| shard-029-F35 | applied | added `font-mono` at `zones-table/columns.tsx:77,82,87` |
| shard-029-F36 | applied | dropped `className={!active ? 'opacity-50' : ''}` from the status Badge in `zones-table/columns.tsx:95` |
| shard-029-F37 | skipped | low confidence (nit · low) |
| shard-029-F38 | skipped | low confidence (nit · low); finding itself notes the cap may never bite |
Gates: tsc ok, lint-diff ok (baseline 776, now 774, NEW 0)
APPLIED: 34 SKIPPED: 4
