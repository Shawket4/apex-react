# Fix log — shard-001
| Finding | Status | Detail |
|---|---|---|
| shard-001-F01 | applied | `'#10B981'` → `'hsl(var(--success))'`, `'#F59E0B'` → `'hsl(var(--money))'` in chart-theme.ts:15-16; `CHART_OTHER_COLOR` `'#6B7280'` → `'hsl(var(--muted-foreground))'` at :28. Array order unchanged. Violet/pink/cyan/orange/lime left as-is (no token; `--chart-N` would touch reference `index.css`). |
| shard-001-F02 | applied | `borderRadius: 8` → `'calc(var(--radius) - 2px)'`, `boxShadow` → Tailwind `shadow-md` values in chart-theme.ts:61,64 |
| shard-001-F03 | applied | `.toLocaleString('en-US', …)` → `.toLocaleString(undefined, …)` in format-number.ts:10 |
| shard-001-F04 | applied | `}K` → `}k` and `.toFixed(decimals)` → `.toFixed(0)` in the ≥10_000 branch, format-number.ts:27 (doc comment example updated to match) |
| shard-001-F05 | skipped | low confidence; D-T14 listed for ruling; fix belongs at call sites (out-of-shard: widgets/trips-statistics-*) |
| shard-001-F06 | applied | `import i18n from '@/shared/i18n'` in errors.ts; default messages → `i18n.t('errors.unauthorized|forbidden|notFound|network|networkCheck', { defaultValue })`; unexpected-error fallback reuses existing `errors.unexpected.message` (finding's `errors.unexpected` is already an object key); `extractErrorMessage` fallback reuses existing `errors.generic`. Keys added to en.json + ar.json under `errors`. No import cycle (`i18n/index.ts` imports nothing from `shared/api`). |
| shard-001-F07 | applied | `import i18n from '@/shared/i18n'` in zod-utils.ts; `.refine(check, () => ({ message: i18n.t('validation.positive|nonNegative', { defaultValue }) }))` (lazy form, zod 3.25.76 supports it, follows language switches); `zDateString` `.regex` has no lazy form → `i18n.t('validation.invalidDate', …)` resolved at import. New top-level `validation` namespace added to en.json + ar.json. Export names/shapes unchanged. |
| shard-001-F08 | applied | excel.ts: `buildSheet` gains optional trailing `t` param (defaults to `i18n.getFixedT(null,'translation')`), called with the in-scope `t`; `Generated:` → `t('excel.generated')`, `toLocaleString('en-GB')` → `toLocaleString(i18n.language)`, `'TOTALS'` → `t('excel.totals')`. Keys `excel.generated`/`excel.totals` added to en.json + ar.json. `ySplit: 7` untouched. |
Gates: tsc ok, lint-diff ok (770/770, 0 new)
APPLIED: 7 SKIPPED: 1
