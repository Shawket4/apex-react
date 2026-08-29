# Brief: Trip-leg overlay for the ETIT live-tracking history view

## Goal
Render the trip-audit's legs and place pins on the ETIT history map
(`src/pages/etit/etit.tsx` and its widgets), over whatever date range the user
has selected. The backend work is DONE and deployed — this is frontend-only,
in `/Users/shawket/Downloads/apex-react`.

## The API (already live)
`GET {VITE_API_BASE_URL_ETIT}/api/v1/vehicles/:id/history?date=…` (or
`from=…&to=…`) — the existing history call the page already makes — now also
returns:

- `pins: [{ name, kind, lat, lng, arrive?, depart?, dwellSecs?, parentTripId? }]`
  — `kind ∈ terminal | dropoff | garage`. One pin per place visit, fed from the
  trip-audit's matched legs. Coordinates sit exactly on the drawn track.
- `legs: [{ parentTripId, seq, legType, fromName, toName, depart, arrive,
  actualKm, osrmKm?, actualSecs, osrmSecs?, distanceRatio?, offRoutePct?,
  distanceMethod, startsBeforeWindow, endsAfterWindow, osrmGeometry? }]`
  — `legType ∈ outbound | between | return | garage`. **No actual geometry**:
  a leg is a time-range; slice the response's own `points` by
  `[depart, arrive]` to get its track segment. `osrmGeometry` (polyline5 of
  the optimal route) is present only when the request adds `include=optimal`.
- Both endpoints (`/history`, `/history/summary`) accept `format=msgpack`
  (named maps — decode with `@msgpack/msgpack` exactly like the apex-rust
  dashboard calls in `src/entities/dashboard/api.ts`). JSON remains default;
  switching the ETIT client to msgpack is optional, not required.

Both arrays are empty when the audit has no matches — never treat that as an
error.

## Design decisions already made (do not relitigate)
1. **Legs are sliced client-side from loaded points.** Filter
   `points` by `p.timestamp >= leg.depart && p.timestamp <= leg.arrive`.
   Boundary legs (crossing the window edge) self-clip because points outside
   the window aren't in the response; when `startsBeforeWindow` or
   `endsAfterWindow` is true, show a "continues beyond range" affordance —
   never imply the visible slice is the whole leg. The leg's `actualKm` /
   times are full-leg truth from the audit and belong in the tooltip as-is.
2. **Optimal route is fetch-on-demand.** Default requests stay without
   `include=optimal`. When the user activates a leg (tap/click), refetch the
   window once with `include=optimal` (React Query, keyed separately, cached)
   or carry it from a single toggle — either way the initial paint never pays
   for optimal polylines. Decode polyline5 the same way the trip-replay map
   does (`src/widgets/trip-replay-map` has prior art).
3. **Pins**: terminal / dropoff / garage markers with distinct styling; label
   = name; tooltip shows arrive→depart and dwell (format like
   `formatSummaryDuration` in `src/entities/etit-vehicle/schemas.ts`).
   Back-to-back trips at the same terminal produce adjacent pins (return
   arrival + next departure) — merge them VISUALLY (one marker, two lines in
   the tooltip) keyed by ~identical coordinates, but keep the data as-is.
4. **Overlay toggles**: add "Legs" and "Places" switches next to the existing
   stops/ignitions toggles in `src/widgets/etit-history-controls/` (both the
   full controls and the floating panel). Off by default? No — Places on by
   default, Legs off by default.
5. **Leg rendering**: color the track segment per leg (alternate a small
   palette by seq; garage legs dashed), with the leg list optionally shown as
   chips/rail — follow the interaction patterns of
   `src/widgets/trip-replay-leg-rail/` for styling, but this is a lighter
   overlay, not the full replay.

## Contracts & conventions
- Zod schemas live in `src/entities/etit-vehicle/schemas.ts` — extend
  `etitHistoryResponseSchema` with `pins`/`legs` (default `[]`, tolerate
  absence). Timestamps are ISO strings; parse like existing fields.
- i18n: add keys under `etit.` in BOTH `src/shared/i18n/locales/en.json` and
  `ar.json` (Arabic is first-class; RTL layouts must hold up).
- Match the repo's component idioms (see the existing etit widgets); theme
  tokens only, no hardcoded colors outside the leg palette.
- `npx tsc --noEmit` must pass; build with `npm run build`.

## Deploy
GitHub Actions for apex-react push-deploy is unreliable — deploy by building
locally and shipping the bundle:
```
npm run build
COPYFILE_DISABLE=1 tar -czf /tmp/apex-dist.tar.gz -C dist .
scp /tmp/apex-dist.tar.gz root@187.124.33.153:/tmp/
ssh root@187.124.33.153 'rm -rf /var/www/apex-react/* && tar -xzf /tmp/apex-dist.tar.gz -C /var/www/apex-react && rm /tmp/apex-dist.tar.gz'
```
Commit + push to origin main as well (`git pull --rebase` first — parallel
sessions touch this repo).

## Verify before calling it done
Truck `19cdd2ad-aaba-ea11-80f4-0025b500010d` around 2026-08-23/24 has
multi-leg trips with pins and legs; date ranges spanning a trip boundary
exercise the `startsBeforeWindow`/`endsAfterWindow` flags. Check both LTR and
RTL, light and dark.
