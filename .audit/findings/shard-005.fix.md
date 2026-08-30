# Fix log — shard-005
| Finding | Status | Detail |
|---|---|---|
| shard-005-F01 | applied | `focus:outline-none focus:ring-2 focus:ring-ring` → `focus-visible:…` in src/pages/auth/login.tsx:130 |
| shard-005-F02 | applied | `rounded-xl` → `rounded-lg` on brand icon well, login.tsx:52 |
| shard-005-F03 | applied | `font-bold` → `font-semibold` on h1, login.tsx:55 |
| shard-005-F04 | applied | `border-none shadow-lg md:border md:shadow-sm` → `border shadow-none`, login.tsx:81 |
| shard-005-F05 | applied | `text-2xl font-semibold tracking-tight` → `text-lg font-semibold leading-tight sm:text-xl`, login.tsx:84 |
| shard-005-F06 | applied (partial) | `loginSchema.email` is `z.string().min(1)` — plain usernames accepted, so per the finding's Notes `type="text"` kept; added `spellCheck={false}` only, login.tsx:100 |
| shard-005-F07 | applied | `autoFocus` → `autoFocus={isDesktop}` with `const isDesktop = useIsDesktop()` (reference hook import added), login.tsx:10,30,104 |
| shard-005-F08 | applied | `animate-spin` → `animate-spin motion-reduce:animate-none` on Loader2, login.tsx:156 |
| shard-005-F09 | applied | dropped `h-4 w-4` on Loader2/LogIn inside Button, login.tsx:156,161 |
| shard-005-F10 | applied | `bg-gradient-to-br from-primary to-primary/70` → `bg-primary`; radial-gradient class dropped (div kept), login.tsx:47-48 |
| shard-005-F11 | skipped | low confidence |
| shard-005-F12 | skipped | low confidence / provisional, owner's call |
| shard-005-F13 | applied | `pr-8` → `pe-8`; `right-3` → `end-3`, car-form.tsx:204,208 |
| shard-005-F14 | applied | `h-4 w-4 mr-2` removed from Plus/Save; Loader2 → `animate-spin motion-reduce:animate-none`, car-form.tsx:238,320,322 |
| shard-005-F15 | applied | SelectItem labels → `t('cars.types.noTrailer|trailer|truck', …)`; keys added to en.json + ar.json (values kept) |
| shard-005-F16 | applied | `L` → `t('cars.units.litre', 'L')` at car-form.tsx:186,208; no top-level `units` namespace exists, key added under `cars.units` in both locales (ar: "لتر") |
| shard-005-F17 | applied | `<span>` → `<span className="font-mono tabular-nums">`, car-form.tsx:186 |
| shard-005-F18 | applied | `aria-label={t('cars.sections.removeCompartment', …)}` added; dead `h-4 w-4` dropped from Trash2; key added to both locales, car-form.tsx:217,220 |
| shard-005-F19 | applied | `h-10 w-10 shrink-0` → `h-9 w-9 shrink-0` (provisional destructive-hover recipe not applied), car-form.tsx:216 |
| shard-005-F20 | applied | `text-base font-semibold` → `text-sm font-semibold uppercase tracking-wider` on 4 CardTitles, car-form.tsx:104,151,180,247 |
| shard-005-F21 | applied | covered by F14 edit, car-form.tsx:320 |
| shard-005-F22 | skipped | needs-ruling — edits a conditional expression on the submit button (removing a branch); conflicts with provisional §12.2 |
| shard-005-F23 | applied | added `overscroll-contain` to DialogContent, cars.tsx:95 |
| shard-005-F24 | applied | `h-3 w-3 mr-1` → `h-3 w-3` on ShieldAlert/Clock/ShieldCheck, cars-table.tsx:154,162,169 |
| shard-005-F25 | applied | className removed from both Plus icons inside Button, cars-table.tsx:237,258 |
| shard-005-F26 | applied | `aria-label`/`title={t('cars.editCar')}` added; `h-4 w-4` dropped from Edit, cars-table.tsx:182-189 |
| shard-005-F27 | applied | ` L` → `{t('cars.units.litre', 'L')}`, cars-table.tsx:142 |
| shard-005-F28 | applied | figure wrapped in `<span className="font-mono tabular-nums">`, cars-table.tsx:142 |
| shard-005-F29 | applied | `truncate font-medium` → `font-medium tabular-nums` + `dir="auto"`, cars-table.tsx:117 |
| shard-005-F30 | skipped | low confidence |
| shard-005-F31 | applied | `space-y-6` → `space-y-3`, cars-table.tsx:199 |
| shard-005-F32 | applied | `sm:grid-cols-4` → `lg:grid-cols-4`, cars-table.tsx:200 |
| shard-005-F33 | skipped | low confidence; logic change, not presentation |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 28 SKIPPED: 5
