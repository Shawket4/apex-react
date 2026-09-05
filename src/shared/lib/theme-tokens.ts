import * as React from 'react';

/* -------------------------------------------------------------------------- */
/* Theme tokens outside CSS                                                    */
/*                                                                            */
/* Canvas and WebGL can't read `hsl(var(--primary))` — they need a concrete    */
/* colour. This resolves the app's design tokens to hex at runtime and         */
/* re-resolves them when the theme flips, so a 3D scene stays on the same      */
/* palette as the DOM around it instead of hardcoding a second one.            */
/*                                                                            */
/* The theme is a `dark` class on <html> (same signal the map providers watch, */
/* see shared/lib/maps/leaflet-provider.tsx), so a MutationObserver on that    */
/* attribute is the whole subscription.                                       */
/* -------------------------------------------------------------------------- */

/** Convert a token's `"217 60% 26%"` triple to `#rrggbb`. */
function tokenToHex(value: string): string | null {
  const parts = value.trim().replace(/%/g, '').split(/[\s,/]+/);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(parts[1]) / 100;
  const l = Number(parts[2]) / 100;
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const channel = (n: number) =>
    Math.round(255 * f(n))
      .toString(16)
      .padStart(2, '0');

  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function readTokens(names: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === 'undefined') return out;
  const computed = getComputedStyle(document.documentElement);
  for (const name of names) {
    const hex = tokenToHex(computed.getPropertyValue(`--${name}`));
    if (hex) out[name] = hex;
  }
  return out;
}

/**
 * Resolve design tokens to hex, keeping up with theme changes.
 *
 * Returns an empty map on the first server-side or pre-mount render; callers
 * should fall back to a literal for any token they haven't got yet.
 */
export function useThemeTokens(names: readonly string[]): Record<string, string> {
  const key = names.join(',');
  const [tokens, setTokens] = React.useState<Record<string, string>>(() =>
    readTokens(names),
  );

  React.useEffect(() => {
    const list = key.split(',');
    const refresh = () => setTokens(readTokens(list));
    refresh();

    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    return () => observer.disconnect();
  }, [key]);

  return tokens;
}
