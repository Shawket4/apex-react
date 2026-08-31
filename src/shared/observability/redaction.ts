/**
 * The redaction rules behind Sentry's `beforeSend`.
 *
 * Kept free of any Sentry import so the rules can be exercised on their own —
 * this is a compliance control and it should be possible to check what it does
 * without standing up an SDK.
 *
 * See ./sentry.ts for what this protects and why it must not be relaxed.
 */

/**
 * Substrings that mark a key as carrying personal data. Matched against the key
 * with case and separators removed, so `driver_name`, `driverName` and
 * `DRIVER NAME` all match `name`.
 *
 * Deliberately broad: over-redacting an error report costs a little debugging
 * context, while under-redacting one puts a driver's phone number in a database
 * we promised it would not be in.
 */
const REDACT_FRAGMENTS = [
  'phone', 'mobile', 'email', 'name', 'address', 'password', 'passwd',
  'secret', 'token', 'authorization', 'cookie', 'session',
  'latitude', 'longitude', 'national', 'ssn',
];

/**
 * Keys that are personal in full but too short to match as substrings — `lat`
 * would otherwise match `plate` and `translate`.
 */
const REDACT_EXACT = ['lat', 'lng', 'lon', 'long', 'coords', 'gps'];

export const REDACTED = '[redacted]';

const normalise = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

export function isSensitiveKey(key: string): boolean {
  const k = normalise(key);
  return REDACT_EXACT.includes(k) || REDACT_FRAGMENTS.some((f) => k.includes(f));
}

/**
 * Walk a value, replacing the values of sensitive keys.
 *
 * Recursive on purpose: the interesting data is never at the top level. A trip
 * payload nests the driver inside the trip inside the response, and a flat pass
 * over the outermost object would miss every one of them.
 *
 * `seen` guards the cycles that appear once you are redacting arbitrary runtime
 * objects rather than parsed JSON.
 */
export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[circular]';
  seen.add(value as object);

  if (Array.isArray(value)) return value.map((v) => redact(v, seen));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitiveKey(k) ? REDACTED : redact(v, seen);
  }
  return out;
}

/** Keep a query string's keys so a URL still says which filters were in play. */
export function redactQuery(query: string): string {
  return query
    .split('&')
    .map((pair) => {
      const [k] = pair.split('=');
      return k && isSensitiveKey(k) ? `${k}=${REDACTED}` : pair;
    })
    .join('&');
}


/** Strip a URL's query string down to its non-sensitive values. */
export function redactUrl(url: string): string {
  const [path, query] = url.split('?');
  return query ? `${path}?${redactQuery(query)}` : path;
}
