import * as React from 'react';

import { useReducedMotion } from './media';
import { DURATION } from './tokens';

/**
 * True inside a Stagger, which brings its items in with the commit that
 * mounts them, so a chart card placed in one does not arrive a second time.
 */
export const Arriving = React.createContext(false);

/** Whether this sits inside a Stagger (which already brings it in). */
export function useArriving() {
  return React.useContext(Arriving);
}

/**
 * A figure already formatted as text ("1,234 L", "4.06M", "EGP 980.50").
 * When it holds exactly one number, that number counts up and everything
 * around it (unit, suffix, separators, decimals) stays as written; anything
 * else (a date, "3 / 5", a dash) is shown as is.
 */
export function parseFigure(text: string) {
  const numbers = text.match(/\d[\d,]*(?:\.\d+)?/g);
  if (!numbers || numbers.length !== 1) return null;
  const m = /^([\s\S]*?)(-?)(\d[\d,]*)(?:\.(\d+))?([\s\S]*)$/.exec(text);
  if (!m) return null;
  const [, prefix, sign, int, frac = '', suffix] = m;
  if (int.length > 1 && int.startsWith('0') && !int.startsWith('0,')) return null;
  const value = Number(`${sign}${int.replace(/,/g, '')}.${frac || '0'}`);
  if (!Number.isFinite(value)) return null;
  const grouped = int.includes(',');
  const decimals = frac.length;
  const format = (n: number) =>
    `${prefix}${n < 0 ? '-' : ''}${Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: grouped,
    })}${suffix}`;
  return { value, format };
}

/**
 * Props for a Recharts series so its draw runs with the motion tokens: the
 * same duration as the KPI count-ups beside it, off under reduced motion.
 * Recharts keeps its own engine (it morphs between datasets); these are the
 * only values it reads.
 */
export function useChartMotion() {
  const reduced = useReducedMotion();
  return {
    isAnimationActive: !reduced,
    animationDuration: DURATION.count,
    animationEasing: 'ease-out' as const,
  };
}
