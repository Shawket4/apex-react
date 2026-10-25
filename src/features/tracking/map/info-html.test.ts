import { beforeEach, describe, expect, it, vi } from 'vitest';

const lang = vi.hoisted(() => ({ value: 'en' }));
vi.mock('@/shared/i18n', () => ({
  default: {
    get language() {
      return lang.value;
    },
    t: (_key: string, fallback?: string) => fallback ?? _key,
  },
}));

import { vehicleInfoHtml } from './info-html';
import { formatCairoStamp } from '@/shared/lib/cairo';
import type { LiveMarkerDatum } from './types';

function datum(): LiveMarkerDatum {
  return {
    vehicle: {
      id: 'v1',
      codename: 'OL/8567',
      // Arabic letters first: this is what flipped the card RTL before.
      plate: 'س ج ط 8567',
      speedLimit: 80,
      online: true,
      speed: 0,
      status: 3,
      statusLabel: 'Stopped (Ignition Off)',
      lastLocationAt: new Date('2026-10-25T03:48:43Z'),
    },
    live: {
      id: 'v1',
      speed: 86,
      status: 1,
      statusLabel: 'Moving',
      lat: 26.84,
      lng: 33.92,
      timestamp: new Date('2026-10-25T07:18:00Z'),
    },
    selected: false,
    hidden: false,
  };
}

describe('vehicleInfoHtml', () => {
  beforeEach(() => {
    lang.value = 'en';
  });

  it('shows the live fix in the shared format, isolated LTR, in an LTR card', () => {
    const html = vehicleInfoHtml(datum(), 26.84, 33.92);
    expect(html).toContain('<div dir="ltr"');
    expect(html).not.toContain('dir="auto"');
    expect(html).toContain('<bdi dir="ltr">25 Oct, 10:18</bdi>');
    // Same string the vehicle card renders.
    expect(html).toContain(formatCairoStamp(new Date('2026-10-25T07:18:00Z'), 'en'));
  });

  it('renders the Arabic stamp RTL in an Arabic UI', () => {
    lang.value = 'ar';
    const html = vehicleInfoHtml(datum(), 26.84, 33.92);
    expect(html).toContain('<div dir="rtl"');
    expect(html).toContain('<bdi dir="rtl">٢٥ أكتوبر، ١٠:١٨</bdi>');
  });
});
