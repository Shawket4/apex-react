# UI Coherence Audit — PLAN.md (source of truth)

> Re-read this file at the start of EVERY session before doing anything.
> If memory and this file disagree, this file wins.
> Update after every meaningful step.

## Status

- **Current phase:** Phase 3 done (`.audit/aesthetic-brief.md`, descriptive, subordinate to `design-system.md`). **Overnight run launched 2026-08-29 evening:** `AUDIT_CONFIRM_ALL=1 AUDIT_PUSH=1 .audit/run-audit.sh --phase both` — audit + fix for all 29 shards, one commit per shard, push at the end. Owner's instruction: no further input; review `.audit/run-summary.md`, `.audit/findings/*.md|*.fix.md|*.FAILED` and `.audit/visual/` in the morning.
- Branch: `audit/ui-coherence` (from `main` @ a29ab58). Tag `pre-audit-baseline` = a29ab58.
- Phase 0 ✅ (2026-08-29) · Phase 1 ✅ (2026-08-29) · Phase 2 ✅ (2026-08-29) · Phase 3+ not started.

## Standing constraints (apply to every session)

- **Reference implementation — never change for coherence reasons:** the dashboard screen. (Exception already exercised: the owner-approved rulings of 2026-08-29 in `design-system.md` §14, applied once; any further change to these files needs the same explicit approval.) Concretely: `src/pages/dashboard/dashboard.tsx`, the primitives and libs it imports (`shared/ui/button.tsx`, `shared/ui/skeleton.tsx`, `shared/lib/format.ts`, `shared/lib/fuel.ts`, `shared/lib/cairo.ts`, `shared/lib/cn.ts`, `shared/hooks/use-etit-live.ts`, `shared/hooks/use-permissions.ts`), the foundation (`src/app/index.css`, `tailwind.config.ts`, `index.html` font links), and the app shell it renders in (`widgets/layout`, `widgets/sidebar`, `widgets/header`, `widgets/scope-bar`, `widgets/command-palette`, `widgets/user-menu`, `widgets/theme-toggle`, `widgets/language-toggle` and the `shared/ui` primitives those pull in — see `.audit/reference-closures.json`). Other screens are brought in line with these; these are not brought in line with other screens. If the reference is internally inconsistent, the owner decides which side wins (see `.audit/design-system.md` → "Conflicts for the owner"). Only a bug fix explicitly requested by the owner may touch these files.
- **Secondary reference — NOT exempt from later fixes:** the trips module (`pages/trips`, `widgets/trips-table`, `widgets/trips-statistics`, `widgets/trip-form`, `widgets/trip-location-dialog`, `widgets/trip-receipt-dialog`, `widgets/trip-receipt-batch-dialog`, `widgets/terminal-select`). It only fills gaps the dashboard does not cover (forms, data tables, tabs, pagination, dialogs, charts). Where trips diverges from the dashboard, the dashboard wins and the divergence is listed under "Trips deviations" in `.audit/design-system.md` for the owner to rule on.

- Never delete a prop, handler, conditional branch, effect, or export.
- Never rename an exported symbol.
- Never "clean up" code not explicitly in scope.
- Never fix a failing test by editing the test.
- Never handle credentials, log in, or enter passwords — hand that to the user.
- **The app talks to PRODUCTION. Read-only, always: GET requests only, never submit a form, click a save/delete/approve/reconnect control, or call a POST/PUT/DELETE endpoint (even "read-by-POST" legacy ones like `GetDriverExpenses` are only reached through the app's own page loads).** The visual spec only navigates and screenshots. Verified 2026-08-29 that no page fires a write on mount (all `mutate`/POST/PUT/DELETE sites are click handlers).
- Touching a file outside the current shard/scope → STOP and report.
- Taste skills (`design-taste-frontend`, `redesign-existing-projects`, `taste`) are Phase 3 ONLY, and only to describe a target aesthetic. Never during audit or remediation.
- Findings are graded against the FROZEN local ruleset `.audit/vercel-rules.md`, not the live skill.

## Existing coverage (Phase 0.2)

- **No test infrastructure existed.** No vitest/jest/playwright/cypress config, no `*.test.*` / `*.spec.*` files, no test script in package.json (scripts: dev, build, preview, lint, format, tauri*).
- CI: `.github/workflows/deploy.yml` runs `npm run build` (= `tsc --noEmit && vite build`) then scp's `dist/` to a VPS on push to main. `release.yml` builds Tauri desktop + Android on `v*` tags. Neither runs lint or tests.
- Stack: React 19 + TS 5.6 + Vite 6, react-router-dom 7 (`createBrowserRouter`, no Next.js), TanStack Query/Table, Zustand, Radix/shadcn, Tailwind 3.4, i18next (EN/AR + RTL), next-themes, deck.gl + Google Maps + Leaflet, Tauri 2 shell.
- Fonts come from Google Fonts (index.html) — screenshots need network for identical typography.

## Baseline results (Phase 0.3) — pre-existing, DO NOT FIX

| Check | Result | File |
|---|---|---|
| `npx tsc --noEmit` | **exit 0**, clean | `.audit/baseline-types.txt` |
| `npm run build` | **exit 0**, clean (chunk sizes listed) | `.audit/baseline-build.txt` |
| `npx eslint src --format json` | **exit 1 — 697 errors, 73 warnings across 343 files** | `.audit/baseline-lint.json` (+ `.stderr.txt`) |

ESLint baseline breakdown (root cause is `eslint.config.js`, not the code): the flat config spreads `js.configs.recommended.rules` **without declaring browser/TS globals**, so core `no-undef` fires on `window`, `localStorage`, `setTimeout`, `HTMLElement`, `google`, etc., and core `no-unused-vars`/`no-redeclare` fire on TS type-only symbols. Genuine signal buried in there: `react-hooks/exhaustive-deps` (~17), `react-refresh/only-export-components` (~40, warn), `@typescript-eslint/no-unused-vars` (~15). Also `npm run lint` passes `--ext`, which ESLint 9 flat config no longer accepts. **A NEW lint error later = ours; these are not.** Rule: compare against `baseline-lint.json` by (file, rule, message), not by count.

Re-check after Phase 2 (deps changed by Playwright install): `tsc --noEmit` still exit 0.

## Routes (Phase 0.4) — `e2e/routes.json`

Router: `src/app/router/index.tsx`, react-router v7 `createBrowserRouter`. `/login`, `/404`, `*` are outside `<Layout>`; everything else is under `<ProtectedRoute><Layout/>` + a Suspense layout route. Per-route `minPermissionLevel` recorded in routes.json (1 viewer · 2 editor · 3 manager · 4 admin).

- **46 routes total**: 31 static (3 public + 28 authenticated) · 15 dynamic — **all resolved** (see below).
- Redirects kept as probes: `/fleet-expenses/review → /fleet-expenses/messages`, `* → /404`.

### Dynamic routes — RESOLVED 2026-08-29 (real prod IDs from GET list endpoints; nothing written)

| Param | Value used | Source |
|---|---|---|
| fuel event `:id` | 1857 | `GET /api/protected/GetFuelEvents` (last 120 days) |
| trip `:parentId` | 6005 (parent of containers 11640, 11641 — multi-container) | `GET /api/v1/trips` (rust), rows' `parent_trip_id` |
| oil change `:id` | 2 | `GET /api/GetAllOilChanges` |
| car `:carId` | `ف م س 9247` (URL-encoded) — plate that has oil-change history | `GET /api/GetAllOilChanges` |
| service invoice `:id` | 321 | `GET /api/service-invoices?page=1&limit=5` |
| driver `:id` | 1 | `GET /api/drivers` |
| transaction `:id` | 527 | `GET /api/v1/transactions?limit=5` (rust) |
| trip audit `:id` | 31562 | `GET api/v1/trip-audit/matches?per_page=5` (etit) |

If a record is deleted later the route will screenshot a not-found/empty state; re-point via `template` in routes.json. Original table for reference:

### (was) Unresolved routes — example values needed

| Param | Routes | Need |
|---|---|---|
| fuel event `:id` | `/fuel-events/:id`, `/fuel-events/:id/edit` | one real fuel-event ID |
| trip `:parentId` | `/trips/multi-container/:parentId/edit`, `/trips/parent/:parentId/route-summary` | one real trip parent ID (ideally multi-container) |
| oil change `:id` | `/oil-changes/:id/edit` | one real oil-change ID |
| car `:carId` | `/oil-changes/car/:carId` | one real number plate (will be URL-encoded) |
| service invoice `:id` | `/service-invoices/:id`, `/service-invoices/:id/edit` | one real invoice ID |
| driver `:id` | `/drivers/:id`, `/drivers/:id/expenses`, `/drivers/:id/expenses/new`, `/drivers/:id/loans`, `/drivers/:id/loans/new` | one real driver ID |
| transaction `:id` | `/fleet-expenses/:id/edit` | one real banksms transaction ID |
| trip audit `:id` | `/trip-audit/:id/replay` | one real trip-audit ID |

Fill the `path` field in `e2e/routes.json` (keep `template`) and the spec picks them up.

### Query-param variants (found via `useSearchParams`; not in routes.json yet — decision needed)

- `/trips?tab=statistics` (default `list`) — statistics tab is a large separate surface (`widgets/trips-statistics`, 3.3k LOC).
- `/oil-changes?status=good|warning|critical`; `/fleet-expenses?source=…&uncat=1`; `/fleet-expenses/messages?status=…&media=1`; `/fuel-events/new?carId=…`; `/fleet-expenses/new?raw_message_id=…`; `/trips/new?terminal=…`.
- Global scope params (`shared/scope/use-scope.ts`, kept across nav by the sidebar): `co`, `d`, `f`, `g`, `l`, `m`, `md`, `p`, `s`, `rs`, `q`.
- Live-tracking URL state: `features/tracking/url.ts`.

### Observed while deriving routes (NOT fixed — out of scope)

- `widgets/driver-detail` navigates to `` `/drivers/${driverId}/salaries` `` but **no such route exists** → falls to `*` → `/404`.
- Import graph: never-imported modules (candidate dead code, verify before touching): `entities/driver-analytics/queries.ts`, `entities/location/index.ts`, `entities/receipt-batch/queries.ts`, `entities/trip-audit/index.ts`, `entities/trip-summary/queries.ts`, `shared/ui/date-range-picker.tsx`, `shared/ui/draggable.tsx`, `widgets/trips-statistics/trips-statistics-cars.tsx`.

## Visual baseline harness (Phase 0.4)

- `@playwright/test` 1.62.1 added as devDependency (only package.json/lock change). Chromium headless shell installed.
- `playwright.config.ts`: baseURL `http://localhost:5173`, `webServer: npm run dev` (reuses a running server), 1 worker, viewport 1440×900, `colorScheme: light`, `locale: en-US`, `timezoneId: Africa/Cairo`, `reducedMotion: reduce`, `toHaveScreenshot { maxDiffPixelRatio: 0.01, animations: 'disabled' }`. Screenshots → `e2e/__screenshots__/chromium/<route>.png`.
- `e2e/visual.spec.ts`: ONE generic spec, loops routes.json, `page.goto` → `waitForLoadState('networkidle')` → grow viewport to `<main>` scrollHeight (≤ 8000 px) → `toHaveScreenshot(fullPage)`. No assertions. `npx playwright test --list` → 46 tests.
  - Deviation to confirm: `networkidle` wait is **capped at 15 s** with a console warning, because `/etit` (live tracking) polls forever and would otherwise time out every run. Remove the cap if you prefer a hard failure.
- Auth: `e2e/storageState.json` produced by the user on 2026-08-29 (admin, permission 4; localStorage only, no cookies). Previously this **blocked the 43 authenticated screenshots**. Session lives in `localStorage` (`apex-auth` zustand-persist blob + legacy `jwt`/`permission`/`user_name`/`user_email` keys) and the backend also sets a `jwt` cookie. The spec consumes `e2e/storageState.json` (git-ignored) and never logs in. Nothing was attempted with credentials.

### How to produce `e2e/storageState.json` (user does this — never the agent)

```bash
npm run dev                      # terminal 1 (port 5173)
npx playwright codegen --save-storage=e2e/storageState.json http://localhost:5173/login   # terminal 2
# log in with an ADMIN account in the codegen browser (level 4 — needed for /tires, /fleet-expenses/*, /logs),
# wait for the dashboard to render, then close the browser window. The file is written on close.
npx playwright test              # first run writes baseline PNGs to e2e/__screenshots__/
```
Use an admin account or the level-3/4 routes will `<Navigate to="/">` and screenshot the dashboard instead. The file contains your JWT — it is git-ignored; keep it that way.

### Environment findings from the first authenticated run (2026-08-29) — NOT fixable from this repo

1. **Google Maps: `RefererNotAllowedMapError`** — the Maps API key does not allow `http://localhost:5173/*`. Every map surface (`/etit`, `/zones`, `/locations`, `/trip-audit/:id/replay`, `/trips/parent/:parentId/route-summary`, map dialogs) screenshots the grey "Oops! Something went wrong" panel. Fix is in Google Cloud Console (add the localhost referrer to the key) — user's call; the harness is otherwise fine.
2. **ETIT backend CORS** — in a plain browser dev session the app calls `https://apextransport.ddns.net/api/etit/...` directly (the Vite proxy is only used under Tauri) and the ETIT server answers `Access-Control-Allow-Origin: https://apextransport.ddns.net`, so every ETIT request (`/api/v1/vehicles`, `/vehicles/live`, `/stream/live`, trip-audit, location suggestions) is blocked. Go and Rust backends are fine. Consequences: `/etit` shows "CONNECTING" forever, dashboard shows "Live status unavailable", `/trip-audit` and `/trip-audit/:id/replay` load empty/spinner. Server-side CORS config — user's call. (Alternative inside the repo would be routing the browser dev client through the existing proxy, but that changes app code and is out of audit scope.)
3. **Inner scroll container** — the shell is `h-screen` and scrolls inside `<main class="flex-1 overflow-y-auto">`, so `fullPage` captured only 900 px. Spec now grows the viewport to `<main>`'s scrollHeight (≤ 8000 px) before capturing, so screenshots include everything below the fold. Baselines re-taken after this change.

### Known nondeterminism in the harness (decisions needed)

1. Dev server proxies `/api/*` to the **production backend** (`apextransport.ddns.net`) — screenshots contain live data and will drift on their own. Options: (a) accept and re-baseline before each remediation shard; (b) record HAR per route with `page.routeFromHAR` and replay; (c) point at a staging backend. Recommend (b) once storageState exists.
2. Google Maps tiles/markers on `/etit`, `/zones`, `/locations`, replay: inherently non-deterministic; mask via `mask:` option later or accept diffs there.
3. Language: screenshots follow whatever `i18nextLng` the storageState carries. RTL/Arabic is a coherence concern — decide whether to run EN only, or EN + AR as two projects.
4. Dark mode: `defaultTheme="system"`, pinned to light via `colorScheme`. Decide whether to add a dark project.

## Skills (Phase 1)

| Skill | Location | Source SHA (HEAD at install, 2026-08-29) | Use |
|---|---|---|---|
| `web-design-guidelines` | `.agents/skills/web-design-guidelines` → symlink `.claude/skills/` | vercel-labs/agent-skills `063bee94c3f4df8453406c830b0a7df0f2860278` | audit reference only; findings graded against the frozen copy below |
| `design-taste-frontend` | `.agents/skills/design-taste-frontend` → symlink `.claude/skills/` | Leonxlnx/taste-skill `ccbc15639c97057cbfcf32ecebc38ef716e4bb37` | **Phase 3 only** |
| `redesign-existing-projects` | `.agents/skills/redesign-existing-projects` → symlink `.claude/skills/` | Leonxlnx/taste-skill `ccbc15639c97057cbfcf32ecebc38ef716e4bb37` | **Phase 3 only** |
| `taste` | `~/.claude/skills/taste` (git clone) | senlindesign/taste-skill `6dce223f2f5665d3636ca9a44ec3a7aa1322a9b8` | **Phase 3 only** |

The `skills` CLI also wrote `skills-lock.json` at the repo root (per-skill content hashes) — keep it; it complements the source SHAs above.

Notes: `npx skills add vercel-labs/agent-skills/web-design-guidelines` (path form) found no skill; `--skill web-design-guidelines` worked. The `skills` CLI installs to `.agents/skills/` and symlinks into `.claude/skills/`; `.agents/` added to `.gitignore` (`.claude/` already was).

**Frozen ruleset:** `.audit/vercel-rules.md` = vercel-labs/web-interface-guidelines `command.md` @ `e3d624baaf29dc1fc645aff3e38f03e564d2d6b1`, with the **"Content & Copy" section deleted** (10 lines: active voice, Title Case, numerals, specific labels, error next-steps, second person, `&` over "and") — brand preference, wrong for this codebase. 181 lines remain.

## Shard manifest (Phase 2)

- Enumeration: `.audit/files.txt` — every `.ts/.tsx/.jsx/.css/.scss` under `src/`, `<loc>\t<path>`, sorted by LOC desc. (`.json` locale files, `.lottie`, `.DS_Store` excluded by extension.)
- **344 files · 59,408 LOC** (163 .ts = 16,981 · 180 .tsx = 42,202 · 1 .css = 225). Largest: `widgets/trip-form/trip-form.tsx` 1,331.
- Import graph: `.audit/graph.json` (madge, `--ts-config tsconfig.json`, rooted at `src/`, paths relative to `src/`): 346 nodes (344 + 2 locale JSONs), 1,575 edges.
- Script: `.audit/make_shards.py` (deterministic; re-run after refactors: `python3 .audit/make_shards.py`). Groups by directory, orders shared → app → features by feature name (entities/pages/widgets of the same feature adjacent), packs sequentially at ≤ 2,500 LOC, splits only oversized directories (`shared/ui`, `widgets/trips-statistics`). Verified: identical output on re-run; every file in exactly one shard; all shards ≤ 2,500.
- **29 shards** → `.audit/shards/shard-001.txt … shard-029.txt` + `manifest.json` (includes per-shard `external_imports` for context).

### Shard progress

| Shard | LOC | Groups | Status |
|---|---|---|---|
| 001 | 2468 | shared/api, auth, config, hooks, i18n, lib | pending |
| 002 | 2499 | shared/lib/maps, lib/prefetch, scope | pending |
| 003 | 2385 | shared/types, shared/ui (1/2) | pending |
| 004 | 2267 | shared/ui (2/2), src root, app, app/providers | pending |
| 005 | 2082 | app/router, auth, car, cars, command-palette | pending |
| 006 | 2368 | dashboard, driver, driver-analytics, driver-detail page | pending |
| 007 | 2092 | driver-detail widgets, driver-expense(s), driver-form, driver-loan | pending |
| 008 | 1632 | driver-loans, drivers, drivers-table, error pages, fee-mapping entity+page | pending |
| 009 | 1469 | widgets/fee-mappings | pending |
| 010 | 1786 | pages/fleet-expenses | pending |
| 011 | 2480 | fleet-expenses-table, fuel-event entity, fuel-event-form | pending |
| 012 | 2461 | fuel-events pages/table, header, language-toggle, layout | pending |
| 013 | 2346 | location entity/page, locations-* dialogs/tables/pickers (1/2) | pending |
| 014 | 1937 | locations-* (2/2), maint-stock, mapping, oil-change entity, oil-change-form | pending |
| 015 | 2419 | oil-changes pages/table, placeholder, raw-message, receipt(-batch), scope-bar, service-cars-table | pending |
| 016 | 2330 | service-invoice*, settings, sidebar, terminal-select, theme-toggle, tires | pending |
| 017 | 1819 | features/tracking (root) | pending |
| 018 | 2457 | features/tracking/components, /map | pending |
| 019 | 2007 | entities/transaction, entities/trip | pending |
| 020 | 1265 | trip-audit entity + page | pending |
| 021 | 1599 | trip-audit-detail-dialog, -matches-table, -queue | pending |
| 022 | 2349 | trip-form, trip-location-dialog | pending |
| 023 | 631 | trip-receipt(-batch)-dialog | pending |
| 024 | 2383 | pages/trip-replay, trip-replay-hud | pending |
| 025 | 1948 | trip-replay-leg-rail/-map/-timeline, trip-statistics, trip-summary | pending |
| 026 | 2171 | pages/trips, trips-statistics (1/2) | pending |
| 027 | 1836 | trips-statistics (2/2) | pending |
| 028 | 2483 | trips-table, user entity, user-form-dialog, user-menu | pending |
| 029 | 1439 | users, users-table, whatsapp*, zone*, zones | pending |

## Overnight runner (added 2026-08-29)

- `.audit/run-audit.sh` loops `.audit/shards/*.txt` through headless `claude -p` with `.audit/prompts/audit.md` (read-only findings → `.audit/findings/shard-NNN.md`) and `.audit/prompts/fix.md` (edits + `shard-NNN.fix.md`), then gates each shard: `.audit/check-constraints.py` (reference/e2e/source-of-truth untouched, only shard files + both locale files, no removed export/handler/hook/JSX-conditional) → `tsc` → `.audit/lint-diff.py` (no message beyond `baseline-lint.json`) → `npm run build` → Playwright (diffs copied to `.audit/visual/shard-NNN/`, then re-baselined) → one commit per shard. Failure reverts the shard and writes `shard-NNN.FAILED`; `shard-NNN.done` markers make re-runs resume.
- Guards: `Skill`, `WebFetch`, `WebSearch` are denied on every call (taste skills cannot run; grading is against the frozen `vercel-rules.md` + `design-system.md` only); a bare invocation refuses to run all shards (`AUDIT_CONFIRM_ALL=1` or `--shards`/`--from`); `--dry-run` renders prompts only; per-call `--max-budget-usd` (`AUDIT_BUDGET_USD=12`, `FIX_BUDGET_USD=20`) and a 40-min wall-clock timeout (no `--max-turns` in CLI 2.1.251); `caffeinate` keeps the Mac awake.
- Smoke test 2026-08-29: `--phase audit --shards 023` → 30 findings (5 blocker / 20 should / 5 nit) in 2.5 min, `src` untouched, format parsed by the runner. The findings file is kept as the first real audit output.
- Recommended sequence: `AUDIT_CONFIRM_ALL=1 .audit/run-audit.sh --phase audit` overnight (read-only, no commits), review `.audit/findings/*.md` and rule on `needs-ruling` items, then `--phase fix`.

## Decisions approved by user

- 2026-08-29 — **Design system extracted** (`.audit/design-system.md`, 14-agent extraction + mechanical evidence check). Owner ruled on all 36 dashboard-internal conflicts ("use your rulings"), chose to fix them before Phase 3, and delegated C-I2 (date engine: keep date-fns for display, day-first patterns) and C-I5 (palette density: widget's declared values win). Rulings applied to the reference files (23 files, +249/−136): `dashboard.tsx`, `badge/skeleton/select/dropdown-menu/popover/dialog/sheet/command/cairo-range-calendar.tsx`, `command-palette/header/sidebar/theme-toggle/language-toggle/user-menu/scope-date-picker`, `app/router/index.tsx`, `index.css`, `index.html`, `excel.ts`, `en.json`/`ar.json`. **Not applied: C-B2** (removing the ConnectionBadge's inline refresh button deletes a branch + handler — blocked by the standing constraints; needs an explicit go). tsc clean; lint identical to baseline (770/770 messages, 0 new); build clean. Visual change detector: only 3 routes moved above the 1% threshold (driver-detail, oil-change-history, locations — all from the 2px-taller `Badge` recipe, C-T3); **re-baselined all 46 routes to the post-ruling state, 46/46 on verify**.
- 2026-08-29 — Adversarial verification (4 lenses: constraints, ruling fidelity, regression risk, doc consistency): no constraint violations; one regression found and fixed (the trips receipt lightbox `z-[60]` fell under the raised Dialog — now `OVERLAY_Z` + `pointer-events-auto`, `widgets/trip-receipt-batch-dialog`); C-C1 completed (`text-primary` on the selected tile); the route fallback's toolbar skeleton row restored (no ruling had asked for its removal); design-system.md §0–§10 re-synced to the post-ruling code. Screenshot baselines unaffected by these three edits (selected/suspense/lightbox states are not captured). C-B2 then applied with the owner's explicit go ("Do it that's fine"): the badge's inline refresh button removed; retry lives only in the DegradedStrip. Dashboard screenshot re-baselined.
- 2026-08-29 — Session file produced by the user (admin). Dynamic-route IDs to be taken from API list responses (GET only).
- 2026-08-29 — **App points at production. Never add or edit data.** (Also recorded as a standing constraint above.)
- Defaults accepted by silence (changeable): 15 s networkidle cap; live backend with re-baselining; EN + light only; no query-param variants yet; `@playwright/test` as devDependency; `.audit/` committed on the branch.

## Open questions for user

_(none blocking; the defaults listed under "Decisions" stand until changed)_

## Session log

- 2026-08-29 — Harness smoke test: `npx playwright test -g "public routes"` wrote 3 baselines (`login`, `not-found`, `not-found-catchall`, 1440×900) then passed 3/3 on re-run. Authenticated routes untested (no storageState). Fixed a config bug where `devices['Desktop Chrome']` overrode the viewport to 1280×720.
- 2026-08-29 — User produced `e2e/storageState.json` (admin). IDs for the 15 dynamic routes pulled with GET-only calls (scratchpad script, not in repo). First authenticated run exposed: Maps referrer error, ETIT CORS, inner-scroll `fullPage` limitation (see "Environment findings"). Spec updated to grow the viewport to `<main>`'s scrollHeight (cap 8000 px).
- 2026-08-29 — **Baselines: all 46 routes captured** (`e2e/__screenshots__/chromium/*.png`, 24 of them taller than 900 px; `fleet-expenses-messages` and the `/fleet-expenses/review` redirect hit the 8000 px cap). Verify run: **46/46 pass** on immediate re-run (`.audit/baseline-visual-run4-verify.txt`). Earlier 900 px baselines were also 46/46 deterministic (`run2`). Runs take ~1.7 min. Map/ETIT routes are baselined in their error/empty state until the key referrer and CORS are fixed — re-baseline those after the fix.
- 2026-08-29 (evening) — **Phase 3**: `.audit/aesthetic-brief.md` written with the taste skills used as formats only (Design Read + three dials from design-taste-frontend; Taste DNA Trigger→Decision→Reason→Evidence from senlindesign/taste; the redesign skill's checklist inverted into a "what it is not / do not fix" table). No code touched. Runner reviewed (3 lenses; 3 blockers fixed: timeout counted as done, greedy JSX regex, Playwright infra failures re-baselined) and gate-tested on synthetic edits. Owner: "run the audit and fix right after … leave this overnight … git add . and commit and push". Committed and pushed; overnight run launched detached.
- 2026-08-29 — Phases 0–2 done. Nothing committed; working tree holds: `.audit/`, `e2e/`, `playwright.config.ts`, `.gitignore` (+4 ignores), `package.json`/`package-lock.json` (+@playwright/test), `e2e/__screenshots__/chromium/` (46 baselines).
