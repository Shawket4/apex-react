import { describe, expect, it } from 'vitest';

import { parseFigure } from './support';

describe('parseFigure', () => {
  it('counts the one number and keeps everything around it', () => {
    const f = parseFigure('EGP 12,345.50 total')!;
    expect(f.value).toBe(12345.5);
    expect(f.format(f.value)).toBe('EGP 12,345.50 total');
    expect(f.format(0)).toBe('EGP 0.00 total');
    expect(f.format(1234.567)).toBe('EGP 1,234.57 total');
  });

  it('handles compact forms and negatives', () => {
    expect(parseFigure('4.06M')!.format(1.5)).toBe('1.50M');
    expect(parseFigure('982k')!.format(41.2)).toBe('41k');
    const neg = parseFigure('-1,200 L')!;
    expect(neg.value).toBe(-1200);
    expect(neg.format(-600)).toBe('-600 L');
  });

  it('leaves alone what is not one figure', () => {
    expect(parseFigure('3 / 5')).toBeNull();
    expect(parseFigure('2026-10-16')).toBeNull();
    expect(parseFigure('—')).toBeNull();
    expect(parseFigure('007')).toBeNull();
  });
});
