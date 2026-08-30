# Findings — shard-001

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/shared/api/client.ts` | 201 | no UI content | axios clients/interceptors; 401 redirect is behaviour, no rule |
| `src/shared/api/errors.ts` | 75 | audited | error classes; default messages reach the screen via `extractErrorMessage` → toasts (see F06) |
| `src/shared/api/query.ts` | 19 | no UI content | QueryClient defaults |
| `src/shared/auth/store.ts` | 83 | no UI content | zustand persist + legacy key sync |
| `src/shared/config/constants.ts` | 68 | no UI content | `DEFAULT_CURRENCY = 'EGP'` — no rule for a currency constant |
| `src/shared/config/env.ts` | 17 | no UI content | env schema |
| `src/shared/hooks/use-debounce.ts` | 12 | no UI content | 300 ms default matches §12.2 SearchInput (provisional); no rule |
| `src/shared/hooks/use-etit-live.ts` | 146 | reference — not audited | |
| `src/shared/hooks/use-layout-store.ts` | 13 | reference — not audited | |
| `src/shared/hooks/use-media-query.ts` | 21 | reference — not audited | |
| `src/shared/hooks/use-mounted.ts` | 7 | reference — not audited | |
| `src/shared/hooks/use-permissions.ts` | 27 | reference — not audited | |
| `src/shared/i18n/index.ts` | 46 | audited | sets `dir`/`lang` at runtime (§15.11); detection `localStorage → navigator` satisfies vercel "Locale & i18n"; no findings |
| `src/shared/lib/animations.ts` | 38 | reference — not audited | |
| `src/shared/lib/cairo.ts` | 201 | reference — not audited | |
| `src/shared/lib/chart-theme.ts` | 84 | audited | tooltip `fontSize 12` / label `fontSize 11` / tick `fontSize 11`: no dashboard rule for chart text sizes (§12.5 records them provisionally) — no rule |
| `src/shared/lib/cn.ts` | 6 | reference — not audited | |
| `src/shared/lib/coords.ts` | 72 | no UI content | URL builders and coordinate guards |
| `src/shared/lib/excel.ts` | 356 | audited | Excel cell colours (`PALETTE.green/red/amber/violet`, `brandLight`) are workbook styling, not screen UI — no rule; brand `FF1B396A` already matches §15.2. Toast channel for export feedback is §13 D-ST3, but a lib function has no in-place surface to render into — recorded, not flagged. `excel.generating`/`excel.downloading` copy should end with `…` (vercel "Typography") — value lives in `out-of-shard: src/shared/i18n/locales/en.json, ar.json` |
| `src/shared/lib/format-number.ts` | 44 | audited | see F03–F05; §13 D-T14 names this file as the second `formatNumber` helper |
| `src/shared/lib/format.ts` | 128 | reference — not audited | |
| `src/shared/lib/fuel.ts` | 359 | reference — not audited | |
| `src/shared/lib/money.ts` | 135 | audited | `Intl.NumberFormat(undefined)` grouping + BigInt fraction — consistent with §2 `formatNumber`; no findings |
| `src/shared/lib/normalize.ts` | 239 | no UI content | search folding; `highlightMatches` returns segments only |
| `src/shared/lib/polyline.ts` | 47 | no UI content | decoder |
| `src/shared/lib/zod-utils.ts` | 24 | audited | see F07 |

## Findings
### shard-001-F01 · should · medium · colour roles
- **Where:** `src/shared/lib/chart-theme.ts:15` — `'#10B981', // emerald — works on both light & dark backgrounds` (through line 22) and `:28` — `export const CHART_OTHER_COLOR = '#6B7280';`
- **Rule:** §13 row D-C2 "Third-hue rule — tokens only | chart series hex palette (emerald/amber/violet/pink/cyan/orange/lime/grey)"; design-system §3 "No hex/rgb in any dashboard or shell TSX"; `index.css` palette rule quoted in §0.2 "Adding a third accent colour breaks the whole scheme, so don't."
- **Current:** seven hard-coded Tailwind hex values for series 2–8 and a hex grey for the "Other" bucket; none track the theme tokens (dark mode gets the same absolute colours).
- **Expected:** the reference never uses a non-token colour (`dashboard.tsx` bar fills are `bg-money`, status colours are `--success/--warning/--destructive`, neutrals are `--muted-foreground`). Charts are the one place the prompt tolerates third hues, so the finding is about *token-backed* colour, not about the count of hues.
- **Change:** `class-level` (value-level, additive): where a series colour coincides with a token role, read the token — `'#10B981'` → `'hsl(var(--success))'`, `'#F59E0B'` → `'hsl(var(--money))'`, `CHART_OTHER_COLOR` `'#6B7280'` → `'hsl(var(--muted-foreground))'`. The remaining five (violet/pink/cyan/orange/lime) have no token; the file's own comment already proposes `--chart-1…8` — defining those tokens is `out-of-shard: src/app/index.css` (a reference file; needs owner approval), so leave them unless that is granted.
- **Notes:** `CHART_SERIES_COLORS[0]` already uses `hsl(var(--primary))`, so the array already mixes token and hex forms; consumers (`widgets/trips-statistics-*`) pass these strings straight to Recharts `stroke/fill`, which accepts `hsl(var(...))`. Do not reorder the array — series index is meaningful to callers.

### shard-001-F02 · nit · medium · radius/border/shadow
- **Where:** `src/shared/lib/chart-theme.ts:61` — `borderRadius: 8,` and `:64` — `boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',`
- **Rule:** §13 row D-R5 "Floating surface — Popover `rounded-md bg-popover shadow-md` | Recharts tooltip radius 8 + custom rgba shadow"; design-system §4 "`shadow-md` on every floating menu (Popover, DropdownMenuContent, …)"; §4 "`rounded-md` = 10px … popover/menu/select/command surfaces".
- **Current:** floating tooltip surface at 8px radius with a bespoke shadow.
- **Expected:** every floating surface in the reference is `rounded-md` (10px from the `--radius` token) with Tailwind `shadow-md` (`popover.tsx:22`).
- **Change:** `class-level` (value-level): `borderRadius: 8` → `borderRadius: 'calc(var(--radius) - 2px)'` (= `rounded-md`); `boxShadow` → `'0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'` (Tailwind `shadow-md`).
- **Notes:** inline styles, so the token must be referenced by CSS var, not class. `background`/`border`/`color` already read tokens — leave them.

### shard-001-F03 · should · high · RTL/i18n
- **Where:** `src/shared/lib/format-number.ts:10` — `.toLocaleString('en-US', {`
- **Rule:** design-system §2 "Number formatting: `formatNumber(v, decimals)` = `Intl.NumberFormat(undefined)`" (`shared/lib/format.ts:20-23`); §13 row D-T14 "a second helper `format-number.ts` (en-US locale, trims zeros, uppercase `K`) exists"; vercel-rules "Locale & i18n" bullet "Numbers/currency: use `Intl.NumberFormat` not hardcoded formats".
- **Current:** locale pinned to `en-US`, so Arabic users get Western grouping/digits from this helper while every other figure on screen (`format.ts`, `money.ts`) follows the runtime locale.
- **Expected:** `shared/lib/format.ts:20-23` and `money.ts:17` both use `undefined` (runtime locale).
- **Change:** `class-level` (value-level): `'en-US'` → `undefined`.
- **Notes:** callers are in trips-statistics (out of shard); the output is display-only, so the change is safe. This helper differs from `format.ts` in trimming zeros (`minimumFractionDigits: 0`) — that difference is recorded in §13 "Trips-internal inconsistencies", not ruled on; leave the fraction options alone.

### shard-001-F04 · nit · medium · type
- **Where:** `src/shared/lib/format-number.ts:25` — `` return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B`; `` through `:27` — `` …toFixed(decimals)}K`; ``
- **Rule:** design-system §2 "`compactMoney`: ≥1M → `4.06M`, ≥10k → `982k`, else 0-dp" (`dashboard.tsx:59-66`); §13 row D-T14 "uppercase `K`".
- **Current:** thousands suffix is uppercase `K`, and the default `decimals = 2` yields `12.40K` where the dashboard shows `12k`.
- **Expected:** lowercase `k` at 0 dp for the thousands band; 2 dp only in the millions band (`dashboard.tsx:59-66`).
- **Change:** `class-level` (value-level): `}K` → `}k`; in the ≥10_000 branch use `.toFixed(0)` (keep the `decimals` parameter for the M/B branches so callers are unaffected).
- **Notes:** `formatCompactCurrency` inherits the fix. Do not change the 10 000 threshold — it matches the reference.

### shard-001-F05 · should · low · colour roles
- **Where:** `src/shared/lib/format-number.ts:42` — `` return `${formatCompactNumber(value, decimals)} ${currency}`; `` and `:44`
- **Rule:** design-system §2 "No currency symbol on the dashboard"; §13 row D-T14 "Money format — Dash `compactMoney`, no currency | Trips `formatCurrency` (2 dp + ` EGP`)".
- **Current:** `formatCompactCurrency` appends ` EGP` (or the passed `currency`) to every compact money figure.
- **Expected:** the reference renders money as a bare figure whose role is carried by `font-mono tabular-nums text-money` (C-T1), not by a currency suffix.
- **Change:** no in-file edit recommended — the suffix is the function's contract and callers rely on the shape. Fix belongs at the call sites (`out-of-shard: src/widgets/trips-statistics-*`) by calling `formatCompactNumber` and applying `text-money`. Recorded here so the fixer of those shards can cite it.
- **Notes:** low confidence because D-T14 is a listed deviation awaiting the owner's ruling, not a §14 ruling; leave the export intact (never rename/delete exports).

### shard-001-F06 · should · medium · RTL/i18n
- **Where:** `src/shared/api/errors.ts:50` — `return new NetworkError(ax.message || 'Network error — please check your connection.');` (also `:16` `'Unauthorized'`, `:23` `'Forbidden'`, `:30` `'Not found'`, `:37` `'Network error'`, `:57` `'An unexpected error occurred'`, `:71` `fallback = 'Something went wrong'`)
- **Rule:** design-system §9 "Copy, aria-labels and sr-only text all go through `t()` with `defaultValue` fallbacks (C-I4)"; §14 C-I4 "all aria/sr-only strings through `t()`"; §12.6 (provisional) "`toast.error(extractErrorMessage(err, fallback))` on failure" — i.e. these strings are rendered to the user.
- **Current:** English literals baked into the error classes and the `extractErrorMessage` fallback; Arabic users see English toasts/banners whenever the server sends no message.
- **Expected:** every user-visible string in the reference is `t(key, { defaultValue })` (`dashboard.tsx:950-960`).
- **Change:** `class-level` (additive): `import i18n from '@/shared/i18n'` (the pattern `excel.ts:17` already uses) and replace each literal with `i18n.t('errors.network', { defaultValue: 'Network error — please check your connection.' })` etc. (`errors.unauthorized`, `errors.forbidden`, `errors.notFound`, `errors.unexpected`, `errors.generic`). Adding the keys is `out-of-shard: src/shared/i18n/locales/en.json, ar.json`; with `defaultValue` the English text is unchanged until the keys exist.
- **Notes:** `errors.generic` already exists per §12.6 ("`errors.generic`" used by the trips full-panel error) — reuse it for the `extractErrorMessage` fallback. Keep the class names/status codes untouched; only the message strings change. `@/shared/i18n` imports `./locales/*.json` — check `client.ts → errors.ts` does not create an import cycle with `i18n` (it does not today: `i18n/index.ts` imports nothing from `shared/api`).

### shard-001-F07 · should · medium · RTL/i18n
- **Where:** `src/shared/lib/zod-utils.ts:7` — `.refine((v) => Number.isFinite(v) && v > 0, { message: 'Must be a positive number' });` (also `:13`, `:19` `'Must be zero or greater'`, `:24` `'Invalid date'`)
- **Rule:** design-system §9 "Copy … all go through `t()` with `defaultValue` fallbacks (C-I4)"; provisional (§12.2) "Validation: … message `p text-[11px] font-medium text-destructive`" — these messages are rendered inline next to fields.
- **Current:** English validation messages hard-coded in shared schema helpers.
- **Expected:** translated copy with a `defaultValue` fallback, as everywhere in the reference.
- **Change:** `class-level` (additive): `import i18n from '@/shared/i18n'` and use `{ message: i18n.t('validation.positive', { defaultValue: 'Must be a positive number' }) }`, `validation.nonNegative`, `validation.invalidDate`. Because the schemas are module-level constants the message is resolved once at import; to follow language switches, pass a function: zod `.refine(fn, () => ({ message: i18n.t(...) }))` is supported in zod v3 (`refine(check, (val) => RefinementCtx)` via `.superRefine`) — if the installed zod version lacks a lazy message form, mark this `structural`. Keys are `out-of-shard: src/shared/i18n/locales/en.json, ar.json`.
- **Notes:** exports must keep their names and shapes; only `message` values change.

### shard-001-F08 · should · medium · RTL/i18n
- **Where:** `src/shared/lib/excel.ts:254` — `` subParts.push(`Generated: ${new Date().toLocaleString('en-GB')}`); `` and `:334` — `if (!c.total) return i === 0 ? 'TOTALS' : '';`
- **Rule:** design-system §9 "Copy … all go through `t()`" (C-I4); vercel-rules "Locale & i18n" bullet "Dates/times: use `Intl.DateTimeFormat` not hardcoded formats" (the locale is hard-coded to `en-GB`).
- **Current:** two English literals in the exported workbook and a date pinned to the `en-GB` locale, while the same function already resolves its toast copy through `i18n.getFixedT` (`:157-161`).
- **Expected:** the file's own `t` for user-facing text; the runtime locale for the timestamp (dashboard dates follow the user's language, §2 / C-I2).
- **Change:** `class-level` (additive): `t` is already in scope in `exportToExcel` — pass it (or `i18n.getFixedT(null, 'translation')`) into `buildSheet` via a new optional parameter, then `` `${t('excel.generated', { defaultValue: 'Generated' })}: ${new Date().toLocaleString(i18n.language)}` `` and `t('excel.totals', { defaultValue: 'TOTALS' })`. Keys `out-of-shard: src/shared/i18n/locales/en.json, ar.json`.
- **Notes:** `buildSheet` is not exported, so adding a parameter is allowed; do not change the frozen `ySplit: 7` row layout. The `'✓'`/`'—'` bool glyphs (`:133`) are language-neutral — no change.

## Summary
FINDINGS: 8 (blocker 0 / should 6 / nit 2)
