/**
 * Error bodies on blob downloads.
 *
 * A request made with `responseType: 'blob'` gets its error body as a Blob
 * too, so a server's `{ "error": "...", "code": "..." }` would never reach
 * `toApiError` — the toast fell back to axios's generic "Request failed with
 * status code 422". These helpers read the blob back into JSON first.
 */

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

/**
 * Reads a blob body back as JSON when it is one. Returns the parsed object,
 * or `undefined` when the value is not a blob or the blob is not JSON.
 */
export async function readJsonBlob(value: unknown): Promise<unknown> {
  if (!isBlob(value)) return undefined;
  let text: string;
  try {
    text = await value.text();
  } catch {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** True when a 2xx blob body is really a JSON message, not a file. */
export function isJsonBlob(value: unknown): value is Blob {
  return isBlob(value) && /json/i.test(value.type);
}

/**
 * Replaces a blob error body with its parsed JSON, in place, so the normal
 * error mapping sees `message` / `error` / `code`. Anything that is not a JSON
 * blob is left exactly as it was.
 */
export async function unwrapBlobErrorBody(error: unknown): Promise<void> {
  const response = (error as { response?: { data?: unknown } } | null)?.response;
  if (!response || !isBlob(response.data)) return;
  const parsed = await readJsonBlob(response.data);
  if (parsed && typeof parsed === 'object') response.data = parsed;
}
