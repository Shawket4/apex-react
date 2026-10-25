import { describe, expect, it } from 'vitest';
import { cairoStampHtml, formatCairoStamp } from './cairo';

// 2026-10-25 07:18Z — 10:18 in Cairo, still summer time (EEST, UTC+3).
const FIX = '2026-10-25T07:18:00Z';

describe('formatCairoStamp — the one map date-time', () => {
  it('reads day, month, then time in English', () => {
    expect(formatCairoStamp(FIX, 'en')).toBe('25 Oct, 10:18');
    expect(formatCairoStamp(new Date(FIX), 'en')).toBe('25 Oct, 10:18');
  });

  it('renders Arabic with Arabic digits and month', () => {
    expect(formatCairoStamp(FIX, 'ar')).toBe('٢٥ أكتوبر، ١٠:١٨');
  });

  it('is Cairo wall clock whatever the browser zone, across the DST switch', () => {
    // Winter (EET, UTC+2) after the last Thursday of October.
    expect(formatCairoStamp('2026-11-01T12:00:00Z', 'en')).toBe('1 Nov, 14:00');
    // Day boundary: 21:05Z on the 25th is already the 26th in Cairo.
    expect(formatCairoStamp('2026-10-25T21:05:00Z', 'en')).toBe('26 Oct, 00:05');
  });

  it('never prints hour 24 at midnight', () => {
    expect(formatCairoStamp('2026-10-25T21:00:00Z', 'en')).toBe('26 Oct, 00:00');
  });
});

describe('cairoStampHtml', () => {
  it('isolates the stamp in its own direction so an RTL card cannot reorder it', () => {
    expect(cairoStampHtml(FIX, 'en')).toBe('<bdi dir="ltr">25 Oct, 10:18</bdi>');
    expect(cairoStampHtml(FIX, 'ar')).toBe('<bdi dir="rtl">٢٥ أكتوبر، ١٠:١٨</bdi>');
  });
});
