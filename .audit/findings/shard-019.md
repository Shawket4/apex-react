# Findings — shard-019

## Coverage
| File | LOC | Status | Notes |
|---|---|---|---|
| `src/entities/transaction/api.ts` | 218 | no UI content | axios wrappers + payload assembly; no JSX/classes |
| `src/entities/transaction/categories.ts` | 205 | no UI content | zod + TanStack hooks; `useCreateEmployee` toasts via `t()` (i18n OK). Toast-on-mutation is a trips-side pattern; the dashboard has no mutation rule → no rule |
| `src/entities/transaction/defaults.ts` | 35 | no UI content | mount-filter helpers |
| `src/entities/transaction/queries.ts` | 310 | no UI content | mutations toast via `t()` (i18n OK); export uses `saveAs` → no rule |
| `src/entities/transaction/schemas.ts` | 280 | no UI content | zod validation messages at `:235-252` are hardcoded English (`'Enter a valid amount, e.g. 1250 or 1250.50'`, `'Select a date'`, …) and reach the form as inline errors; §9 `t()` rule targets JSX/UI files and the brief excludes `entities/*/schemas` from findings, so recorded here only. `COMPANIES`/`PAYMENT_METHODS` are wire values, not labels |
| `src/entities/transaction/vehicles.ts` | 47 | no UI content | zod + query hook |
| `src/entities/trip/api.ts` | 211 | no UI content | msgpack/axios wrappers |
| `src/entities/trip/defaults.ts` | 78 | no UI content | localStorage-backed mount params |
| `src/entities/trip/queries.ts` | 179 | no UI content | query keys + mutations; no toasts (callers handle) |
| `src/entities/trip/schemas.ts` | 444 | no UI content | `computeReceiptStatus` returns hardcoded English `label` values (`'Pending'`, `'In Garage'`, `'In Office'`, `'Complete & Stamped'`) at `:364-394`; whether consumers pass `label` to the screen or map `status` through `t()` is decided in the trips-table widget (out-of-shard). Recorded only; excluded by the data/logic rule |

## Findings

_None. Every file in this shard is a data/logic module without JSX or class strings; the brief directs these to be recorded as `no UI content` rather than graded. Two i18n observations (hardcoded zod messages in `transaction/schemas.ts`, hardcoded receipt-status labels in `trip/schemas.ts`) are noted in the coverage table for whichever shard audits their consumers (`widgets/fleet-expenses-*`, `widgets/trips-table`)._

## Summary
FINDINGS: 0 (blocker 0 / should 0 / nit 0)
