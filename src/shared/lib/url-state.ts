/* -------------------------------------------------------------------------- */
/* Form state in the URL                                                       */
/*                                                                            */
/* A long form loses everything on refresh, and cannot be handed to someone   */
/* else half-done. Putting its state in a query parameter fixes both at once: */
/* the URL is the draft. One opaque parameter rather than one per field,      */
/* because the state is a tree (containers, compartments) and the field list  */
/* changes; a versioned JSON blob survives both.                              */
/*                                                                            */
/* base64url of UTF-8 JSON: `btoa` alone throws on Arabic receipt numbers and */
/* drop-off names, and plain JSON in a query string triples in length once    */
/* percent-encoded.                                                           */
/* -------------------------------------------------------------------------- */

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function encodeUrlState(state: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(state)));
}

/** Null for anything that is not our own encoding — a hand-edited URL is not an error. */
export function decodeUrlState<T>(text: string | null, isValid: (value: unknown) => value is T): T | null {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(text)));
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}
