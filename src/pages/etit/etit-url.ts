/**
 * The tracking page's shareable state, encoded in the URL.
 *
 *   /etit?v=<vehicleId>                          — live, one truck selected
 *   /etit?v=…&mode=history&from=…&to=…           — a loaded history range
 *   /etit?…&t=<epoch-ms>                         — the replay cursor (written
 *                                                  only while paused, so the
 *                                                  URL isn't rewritten 60×/s)
 *
 * `from`/`to` are Cairo wall-clock `YYYY-MM-DDTHH:mm` — the same notation the
 * proxy speaks, human-readable in a pasted link. Device preferences (rail
 * width, collapse, visible set) are NOT here: they stay in localStorage.
 */

import { cairoFromParts, cairoParts } from '@/entities/etit-vehicle/cairo';

export interface EtitUrlState {
  vehicleId: string | null;
  mode: 'live' | 'history';
  /** Present iff mode === 'history'. */
  from: Date | null;
  to: Date | null;
  /** Replay cursor, epoch ms — restored once on load. */
  cursorMs: number | null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function formatWall(date: Date): string {
  const p = cairoParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

function parseWall(s: string | null): Date | null {
  if (!s) return null;
  const m = WALL_RE.exec(s);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m.map(Number) as unknown as number[];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || hh > 23 || mm > 59) return null;
  return cairoFromParts(y, mo, d, hh, mm);
}

/** Garbage in, live-mode out — a bad link must never crash the page. */
export function parseEtitUrl(params: URLSearchParams): EtitUrlState {
  const vehicleId = params.get('v');
  const from = parseWall(params.get('from'));
  const to = parseWall(params.get('to'));
  const history =
    params.get('mode') === 'history' && vehicleId !== null && from !== null && to !== null;

  const tRaw = params.get('t');
  const t = tRaw !== null ? Number(tRaw) : NaN;
  const cursorMs =
    history && Number.isFinite(t) && t >= from!.getTime() && t <= to!.getTime() + 60_000
      ? t
      : null;

  return {
    vehicleId,
    mode: history ? 'history' : 'live',
    from: history ? from : null,
    to: history ? to : null,
    cursorMs,
  };
}

/** The write half — produces params for navigate({search}, {replace}). */
export function serializeEtitUrl(
  state: EtitUrlState,
  base?: URLSearchParams,
): URLSearchParams {
  const p = new URLSearchParams(base);
  if (state.vehicleId) p.set('v', state.vehicleId);
  else p.delete('v');

  if (state.mode === 'history' && state.vehicleId && state.from && state.to) {
    p.set('mode', 'history');
    p.set('from', formatWall(state.from));
    p.set('to', formatWall(state.to));
    if (state.cursorMs !== null) p.set('t', String(Math.round(state.cursorMs)));
    else p.delete('t');
  } else {
    p.delete('mode');
    p.delete('from');
    p.delete('to');
    p.delete('t');
  }
  return p;
}
