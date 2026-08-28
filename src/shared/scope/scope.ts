/**
 * The global date scope — one clock for every page that consumes a range.
 *
 * The URL search string is the single source of truth (`?preset=7d` or
 * `?preset=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`), so a view is shareable,
 * refresh-proof, and the back button walks through scope changes. This module
 * is the pure half: parsing, validation, and range arithmetic — all in Cairo
 * calendar days, matching what apex-rust stores.
 */

import { cairoToday } from '@/shared/lib/cairo';

export const SCOPE_PRESETS = ['today', '7d', 'month', '90d'] as const;
export type ScopePreset = (typeof SCOPE_PRESETS)[number];

export const DEFAULT_PRESET: ScopePreset = 'month';

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

/** Garbage in, default out — a bad URL must never crash a query. */
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
  return { preset: DEFAULT_PRESET };
}

export function rangeForScope(scope: Scope): ScopeRange {
  if (scope.preset === 'custom') return { from: scope.from, to: scope.to };
  const t = cairoToday();
  const today = fmt(t.y, t.m, t.d);
  switch (scope.preset) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: fmt(t.y, t.m, t.d - 6), to: today };
    case 'month':
      return { from: fmt(t.y, t.m, 1), to: today };
    case '90d':
      return { from: fmt(t.y, t.m, t.d - 89), to: today };
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
 * Routes that consume the global scope. Only these receive the scope's search
 * params on navigation — other pages (trips, ledger) own their own `from`/`to`
 * params with different semantics, and stray scope params would corrupt them.
 */
export const SCOPE_AWARE_PATHS: ReadonlySet<string> = new Set(['/']);

/** Search string carrying the current scope to `path` — '' if it doesn't consume it. */
export function keepScopeSearch(path: string): string {
  if (!SCOPE_AWARE_PATHS.has(path)) return '';
  const scope = readScope();
  const params = scopeToParams(scope);
  // A default preset needs no URL at all — keep bare links bare.
  if (scope.preset === DEFAULT_PRESET) return '';
  return `?${params.toString()}`;
}
