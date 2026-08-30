import type { LegSegment } from '../use-history';

export interface CursorStore {
  get: () => number;
  set: (v: number) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createCursorStore(initial = 0): CursorStore {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (v) => {
      value = v;
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** The leg whose [depart, arrive] holds `ms`, if any. */
export function legAt(legs: LegSegment[], ms: number): LegSegment | null {
  for (const seg of legs) {
    if (ms >= seg.leg.depart.getTime() && ms <= seg.leg.arrive.getTime()) return seg;
  }
  return null;
}
