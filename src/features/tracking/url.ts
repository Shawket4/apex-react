/**
 * The tracking page's shareable state, in the URL:
 *
 *   /tracking?v=<id>                                — live, truck selected
 *   /tracking?v=…&h=1&hf=YYYY-MM-DD&ht=YYYY-MM-DD — a loaded history range
 *   /tracking?…&t=<epoch-ms>                        — replay cursor (written
 *                                                     debounced, on pause)
 *
 * Days are Cairo calendar days. Garbage falls back to live mode — a bad link
 * must never crash the page. Device preferences (panel open, hidden set)
 * live in localStorage, not here. `hf`/`ht` (not from/to) so the GLOBAL
 * scope's own from/to params can never be trampled by a replay link.
 */

export interface TrackingUrl {
  vehicleId: string | null;
  mode: 'live' | 'history';
  /** Cairo day strings, inclusive. Present iff mode === 'history'. */
  from: string | null;
  to: string | null;
  /** Replay cursor, epoch ms — restored once on load. */
  cursorMs: number | null;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTrackingUrl(params: URLSearchParams): TrackingUrl {
  const vehicleId = params.get('v');
  const from = params.get('hf');
  const to = params.get('ht');
  const history =
    params.get('h') === '1' &&
    vehicleId !== null &&
    from !== null &&
    to !== null &&
    DAY_RE.test(from) &&
    DAY_RE.test(to) &&
    from <= to;

  const tRaw = params.get('t');
  const t = tRaw !== null ? Number(tRaw) : NaN;

  return {
    vehicleId,
    mode: history ? 'history' : 'live',
    from: history ? from : null,
    to: history ? to : null,
    cursorMs: history && Number.isFinite(t) && t > 0 ? t : null,
  };
}

export function writeTrackingUrl(
  state: TrackingUrl,
  base?: URLSearchParams,
): URLSearchParams {
  const p = new URLSearchParams(base);
  if (state.vehicleId) p.set('v', state.vehicleId);
  else p.delete('v');

  if (state.mode === 'history' && state.vehicleId && state.from && state.to) {
    p.set('h', '1');
    p.set('hf', state.from);
    p.set('ht', state.to);
    if (state.cursorMs !== null) p.set('t', String(Math.round(state.cursorMs)));
    else p.delete('t');
  } else {
    p.delete('h');
    p.delete('hf');
    p.delete('ht');
    p.delete('t');
  }
  return p;
}
