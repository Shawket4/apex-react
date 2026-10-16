import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DURATION, EASE, staggerDelay, STAGGER } from './tokens';

const css = readFileSync(new URL('./motion.css', import.meta.url), 'utf8');
const value = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

describe('motion tokens', () => {
  it('motion.css mirrors every duration', () => {
    for (const [k, ms] of Object.entries(DURATION)) {
      expect(value(`motion-${k}`), k).toBe(`${ms}ms`);
    }
  });

  it('motion.css mirrors every ease', () => {
    const cssName = (k: string) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    for (const [k, pts] of Object.entries(EASE)) {
      expect(value(`ease-${cssName(k)}`), k).toBe(`cubic-bezier(${pts.join(', ')})`);
    }
  });

  it('keeps the product register: 160–220 ms entrances, no overshoot', () => {
    expect(DURATION.fast).toBe(160);
    expect(DURATION.base).toBe(220);
    for (const pts of Object.values(EASE)) expect(Math.max(...pts)).toBeLessThanOrEqual(1);
  });

  it('caps a stagger however long the list', () => {
    expect(staggerDelay(500, 500)).toBeLessThanOrEqual(STAGGER.maxTotal + 1e-9);
    expect(staggerDelay(0, 10)).toBe(0);
  });
});
