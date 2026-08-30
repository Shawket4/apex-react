# Fix log — shard-006
| Finding | Status | Detail |
|---|---|---|
| shard-006-F01 | applied | `aria-hidden="true"` added to every lucide icon in driver-detail.tsx (page icons ×3, Badge icons ×2, ArrowLeft ×2, Edit, Trash2, Info, Loader2 ×2, ShieldCheck, ShieldX) |
| shard-006-F02 | applied | `aria-label={t('common.back'/'edit'/'delete')}` added to the three header action controls (existing keys; no locale edits) |
| shard-006-F03 | applied | banner `rounded-md border-warning/30 bg-warning/5 p-2.5 text-xs` → `rounded-lg border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]`; message span `text-muted-foreground` → `min-w-0` |
| shard-006-F04 | applied | Approve/Reject `className="h-8"` → `"h-7 px-2.5 gap-1.5"` |
| shard-006-F05 | applied | title skeleton `+rounded-sm`; panel skeleton `h-64 rounded-lg` |
| shard-006-F06 | applied | loading frame `mx-auto w-full max-w-4xl space-y-4` → `flex w-full flex-col gap-3`; `h-32` block → `h-9 w-72 rounded-lg` tab-tray stand-in |
| shard-006-F07 | applied | subtitle `text-xs` → `text-[11.5px]` |
| shard-006-F08 | applied | both Loader2 `animate-spin` → `animate-spin motion-reduce:animate-none` |
| shard-006-F09 | applied | both Back buttons rendered `asChild` around `<Link to="/drivers" onClick={() => navigate('/drivers')}>` (handler kept); `Link` import added |
| shard-006-F10 | applied | `className="gap-1"` removed on the three Badges (primitive `gap-1.5` applies) |
| shard-006-F11 | applied | `h-4 w-4` / `h-3.5 w-3.5` dropped from the eight icons inside Buttons; `rtl:rotate-180` and `animate-spin` kept |
| shard-006-F12 | applied | `tabular-nums` → `font-mono tabular-nums` on `#{driver.ID}` |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 12 SKIPPED: 0
