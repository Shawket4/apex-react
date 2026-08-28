/* -------------------------------------------------------------------------- */
/* Code-chunk registry                                                         */
/*                                                                            */
/* Every lazy page in the router, keyed by a stable name. The import() thunks  */
/* resolve to the same modules the router's React.lazy() wraps, so Vite emits  */
/* ONE chunk and a warm here is the same bytes navigation needs.               */
/*                                                                            */
/* Two lookups:                                                               */
/*   preloadChunk('trip-edit')  — a surface that knows exactly where its       */
/*                                click goes (an edit button) names the chunk. */
/*   chunkForPath('/trips/…')   — nav surfaces that only hold a path (sidebar, */
/*                                exception links) resolve it here.            */
/* -------------------------------------------------------------------------- */

const CHUNKS = {
  dashboard: () => import('@/pages/dashboard/dashboard'),

  trips: () => import('@/pages/trips/trips'),
  'trip-new': () => import('@/pages/trips/trip-new'),
  'trip-edit': () => import('@/pages/trips/trip-edit'),

  'fuel-events': () => import('@/pages/fuel-events/fuel-events'),
  'fuel-event-new': () => import('@/pages/fuel-events/fuel-event-new'),
  'fuel-event-edit': () => import('@/pages/fuel-events/fuel-event-edit'),
  'fuel-event-details': () => import('@/pages/fuel-events/fuel-event-details'),

  'fleet-expenses': () => import('@/pages/fleet-expenses/fleet-expenses'),
  'fleet-expense-new': () => import('@/pages/fleet-expenses/fleet-expense-new'),
  'fleet-expense-edit': () => import('@/pages/fleet-expenses/fleet-expense-edit'),
  'fleet-expenses-messages': () => import('@/pages/fleet-expenses/fleet-expenses-messages'),

  drivers: () => import('@/pages/drivers/drivers'),
  'driver-detail': () => import('@/pages/driver-detail/driver-detail'),
  'driver-expenses': () => import('@/pages/driver-expenses/driver-expenses'),
  'driver-expense-new': () => import('@/pages/driver-expenses/driver-expense-new'),
  'driver-loans': () => import('@/pages/driver-loans/driver-loans'),
  'driver-loan-new': () => import('@/pages/driver-loans/driver-loan-new'),

  cars: () => import('@/pages/cars/cars'),
  // Placeholder-backed routes share one module; warming any of them warms all.
  trucks: () => import('@/pages/placeholder/placeholder'),
  tires: () => import('@/pages/tires/tires'),
  tablets: () => import('@/pages/placeholder/placeholder'),
  'speed-violations': () => import('@/pages/placeholder/placeholder'),

  'oil-changes': () => import('@/pages/oil-changes/oil-changes'),
  'oil-change-new': () => import('@/pages/oil-changes/oil-change-new'),
  'oil-change-edit': () => import('@/pages/oil-changes/oil-change-edit'),
  'oil-change-history': () => import('@/pages/oil-changes/oil-change-history'),

  'service-invoices': () => import('@/pages/service-invoices/service-invoices'),
  'service-invoice-new': () => import('@/pages/service-invoices/service-invoice-new'),
  'service-invoice-edit': () => import('@/pages/service-invoices/service-invoice-edit'),
  'service-invoice-details': () => import('@/pages/service-invoices/service-invoice-details'),

  'fee-mappings': () => import('@/pages/fee-mappings/fee-mappings'),
  users: () => import('@/pages/users/users'),
  vendors: () => import('@/pages/placeholder/placeholder'),
  etit: () => import('@/features/tracking/tracking-page'),
  zones: () => import('@/pages/zones/zones'),
  locations: () => import('@/pages/locations/locations'),
  'trip-audit': () => import('@/pages/trip-audit/trip-audit'),
  settings: () => import('@/pages/settings/settings'),
  logs: () => import('@/pages/placeholder/placeholder'),
} as const;

export type ChunkKey = keyof typeof CHUNKS;

const warmed = new Set<ChunkKey>();

export function preloadChunk(key: ChunkKey): void {
  if (warmed.has(key)) return;
  warmed.add(key);
  CHUNKS[key]().catch(() => {
    // Invisible by design: navigation retries the import, and a chunk that
    // 404s mid-deploy resolves itself on the next attempt.
    warmed.delete(key);
  });
}

/* -------------------------------------------------------------------------- */
/* Path → chunk                                                                */
/* Ordered: first match wins, so the more specific pattern sits first.         */
/* -------------------------------------------------------------------------- */

const PATH_RULES: [RegExp, ChunkKey][] = [
  [/^\/$/, 'dashboard'],

  [/^\/trips\/new/, 'trip-new'],
  [/^\/trips\/multi-container\/[^/]+\/edit/, 'trip-edit'],
  [/^\/trips/, 'trips'],

  [/^\/fuel-events\/new/, 'fuel-event-new'],
  [/^\/fuel-events\/[^/]+\/edit/, 'fuel-event-edit'],
  [/^\/fuel-events\/[^/]+/, 'fuel-event-details'],
  [/^\/fuel-events/, 'fuel-events'],

  [/^\/fleet-expenses\/messages/, 'fleet-expenses-messages'],
  [/^\/fleet-expenses\/new/, 'fleet-expense-new'],
  [/^\/fleet-expenses\/[^/]+\/edit/, 'fleet-expense-edit'],
  [/^\/fleet-expenses/, 'fleet-expenses'],

  [/^\/drivers\/[^/]+\/expenses\/new/, 'driver-expense-new'],
  [/^\/drivers\/[^/]+\/expenses/, 'driver-expenses'],
  [/^\/drivers\/[^/]+\/loans\/new/, 'driver-loan-new'],
  [/^\/drivers\/[^/]+\/loans/, 'driver-loans'],
  [/^\/drivers\/[^/]+/, 'driver-detail'],
  [/^\/drivers/, 'drivers'],

  [/^\/oil-changes\/new/, 'oil-change-new'],
  [/^\/oil-changes\/car\//, 'oil-change-history'],
  [/^\/oil-changes\/[^/]+\/edit/, 'oil-change-edit'],
  [/^\/oil-changes/, 'oil-changes'],

  [/^\/service-invoices\/new/, 'service-invoice-new'],
  [/^\/service-invoices\/[^/]+\/edit/, 'service-invoice-edit'],
  [/^\/service-invoices\/[^/]+/, 'service-invoice-details'],
  [/^\/service-invoices/, 'service-invoices'],

  [/^\/cars/, 'cars'],
  [/^\/trucks/, 'trucks'],
  [/^\/tires/, 'tires'],
  [/^\/tablets/, 'tablets'],
  [/^\/speed-violations/, 'speed-violations'],
  [/^\/fee-mappings/, 'fee-mappings'],
  [/^\/users/, 'users'],
  [/^\/vendors/, 'vendors'],
  [/^\/etit/, 'etit'],
  [/^\/zones/, 'zones'],
  [/^\/locations/, 'locations'],
  [/^\/trip-audit/, 'trip-audit'],
  [/^\/settings/, 'settings'],
  [/^\/logs/, 'logs'],
];

export function chunkForPath(path: string): ChunkKey | null {
  const clean = path.split('?')[0] ?? path;
  for (const [pattern, key] of PATH_RULES) {
    if (pattern.test(clean)) return key;
  }
  return null;
}

export function preloadChunkForPath(path: string): void {
  const key = chunkForPath(path);
  if (key) preloadChunk(key);
}
