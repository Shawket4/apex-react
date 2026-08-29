/**
 * The global date scope — one clock for every page that consumes a range.
 *
 * The URL search string is the single source of truth (`?preset=7d` or
 * `?preset=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`), so a view is shareable,
 * refresh-proof, and the back button walks through scope changes. This module
 * is the pure half: parsing, validation, and range arithmetic — all in Cairo
 * calendar days, matching what apex-rust stores.
 */

import { cairoDayRange, cairoInstant, cairoToday } from '@/shared/lib/cairo';

export const SCOPE_PRESETS = ['today', 'yesterday', '7d', '30d', 'mtd'] as const;
export type ScopePreset = (typeof SCOPE_PRESETS)[number];

/** Month-to-date: apex bills monthly, so the month is the natural resting scope. */
export const DEFAULT_PRESET: ScopePreset = 'mtd';

export type Scope =
  | { preset: ScopePreset }
  | { preset: 'custom'; from: string; to: string };

export interface ScopeRange {
  /** Inclusive Cairo calendar days, YYYY-MM-DD — exactly what the API takes. */
  from: string;
  to: string;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDay(s: string): boolean {
  if (!DAY_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function fmt(y: number, m0: number, d: number): string {
  // Normalizes overflow (e.g. day 0 → last day of previous month) via UTC Date.
  const dt = new Date(Date.UTC(y, m0, d));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate(),
  ).padStart(2, '0')}`;
}

/* -------------------------------------------------------------------------- */
/* Persistence — the URL stays the source of truth; localStorage only SEEDS   */
/* a bare URL, so a refresh, a new tab, or a fresh session resumes the last   */
/* scope while shared links land exactly as sent.                              */
/* -------------------------------------------------------------------------- */

const SCOPE_STORAGE_KEY = 'apex:scope';

interface StoredScope {
  preset?: string;
  from?: string;
  to?: string;
  co?: string | null;
}

function loadStored(): StoredScope {
  try {
    const raw = window.localStorage.getItem(SCOPE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredScope) : {};
  } catch {
    return {};
  }
}

/** Mirror the live scope (merging partial updates). Called by the hooks on
 *  every change — including clears, so "All companies" persists as all. */
export function storeScopeSlice(patch: StoredScope): void {
  try {
    window.localStorage.setItem(
      SCOPE_STORAGE_KEY,
      JSON.stringify({ ...loadStored(), ...patch }),
    );
  } catch {
    /* storage unavailable — the URL still works */
  }
}

function storedScope(): Scope | null {
  const s = loadStored();
  if (s.preset === 'custom' && s.from && s.to && isValidDay(s.from) && isValidDay(s.to) && s.from <= s.to) {
    return { preset: 'custom', from: s.from, to: s.to };
  }
  if ((SCOPE_PRESETS as readonly string[]).includes(s.preset ?? '')) {
    return { preset: s.preset as ScopePreset };
  }
  return null;
}

export function storedCompany(): string | null {
  const s = loadStored();
  return typeof s.co === 'string' && s.co ? s.co : null;
}

/** Garbage in, default out — a bad URL must never crash a query. A URL with
 *  NO scope at all falls back to the last persisted scope. */
export function parseScope(params: URLSearchParams): Scope {
  const preset = params.get('preset');
  if (preset === 'custom') {
    const from = params.get('from') ?? '';
    const to = params.get('to') ?? '';
    if (isValidDay(from) && isValidDay(to) && from <= to) {
      return { preset: 'custom', from, to };
    }
    return { preset: DEFAULT_PRESET };
  }
  if ((SCOPE_PRESETS as readonly string[]).includes(preset ?? '')) {
    return { preset: preset as ScopePreset };
  }
  if (preset === null && typeof window !== 'undefined') {
    const stored = storedScope();
    if (stored) return stored;
  }
  return { preset: DEFAULT_PRESET };
}

export function rangeForScope(scope: Scope): ScopeRange {
  if (scope.preset === 'custom') return { from: scope.from, to: scope.to };
  const t = cairoToday();
  const today = fmt(t.y, t.m, t.d);
  switch (scope.preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const y = fmt(t.y, t.m, t.d - 1);
      return { from: y, to: y };
    }
    case '7d':
      return { from: fmt(t.y, t.m, t.d - 6), to: today };
    case '30d':
      return { from: fmt(t.y, t.m, t.d - 29), to: today };
    case 'mtd':
      return { from: fmt(t.y, t.m, 1), to: today };
  }
}

/**
 * The scope's identity inside query keys. Presets keep their name (stable
 * across the day, so hover-warmed entries match page reads); custom ranges
 * are their bounds.
 */
export function scopeKey(scope: Scope): string {
  return scope.preset === 'custom' ? `${scope.from}_${scope.to}` : scope.preset;
}

/** The search params that persist a scope — the write half of parseScope. */
export function scopeToParams(scope: Scope, base?: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams(base);
  p.set('preset', scope.preset);
  if (scope.preset === 'custom') {
    p.set('from', scope.from);
    p.set('to', scope.to);
  } else {
    // A preset owns the whole scope: stale custom bounds must not linger.
    p.delete('from');
    p.delete('to');
  }
  return p;
}

/**
 * The scope encoded in the CURRENT location, for non-hook contexts (prefetch
 * warmers on hover, sidebar links carrying the scope across navigation).
 */
export function readScope(): Scope {
  if (typeof window === 'undefined') return { preset: DEFAULT_PRESET };
  return parseScope(new URLSearchParams(window.location.search));
}

/** The current URL's scope resolved for query use — key + bounds in one go. */
export function currentScopeSlice(): { key: string; range: ScopeRange } {
  const scope = readScope();
  return { key: scopeKey(scope), range: rangeForScope(scope) };
}

/**
 * Search string carrying the current scope to `path`. The scope is global:
 * every module consumes it, none owns its own date/company params, so it
 * travels on every navigation. `path` stays in the signature for call sites
 * that may one day exclude a route.
 */
export function keepScopeSearch(_path: string): string {
  const scope = readScope();
  const co = readScopeCompany();
  const params = scopeToParams(scope);
  if (co) params.set('co', co);
  else params.delete('co');
  // The default scope with no company needs no URL at all — keep bare links bare.
  if (scope.preset === DEFAULT_PRESET) params.delete('preset');
  return params.size > 0 ? `?${params.toString()}` : '';
}

/* -------------------------------------------------------------------------- */
/* Company — the second scope dimension (Madar's branch, ours is company).     */
/* Lives in the same URL under `co`; null means all companies.                 */
/* -------------------------------------------------------------------------- */

export function readScopeCompany(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.has('co')) return params.get('co') || null;
  // No co in the URL at all: seed from the persisted scope. (An explicit
  // "All companies" clears storage too, so it stays cleared.)
  return storedCompany();
}

/**
 * A scope range as Cairo day-boundary INSTANTS (RFC3339) for endpoints that
 * filter on timestamps rather than calendar days (the ledger).
 */
export function scopeRangeToInstants(range: ScopeRange): { from: string; to: string } {
  const [fy, fm, fd] = range.from.split('-').map(Number);
  const [ty, tm, td] = range.to.split('-').map(Number);
  return {
    from: cairoInstant(fy, fm - 1, fd),
    to: cairoDayRange(ty, tm - 1, td)[1],
  };
}
