import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/i18n', () => ({
  default: { language: 'en', t: (_key: string, fallback?: string) => fallback ?? _key },
}));

import { liveDisplay } from './live-display';
import type { LiveStatus, Vehicle } from './schemas';

const now = new Date('2026-10-25T08:00:00Z').getTime();
const vehicle = { id: 'v', plate: 'ف ل ص 8567', status: 3, statusLabel: 'Stopped (Ignition Off)', lastLocationAt: new Date('2026-10-10T09:00:00Z') } as unknown as Vehicle;
const live = (status: number, minsAgo: number) =>
  ({ id: 'v', status, statusLabel: 'Moving', speed: 60, lat: 30, lng: 31, timestamp: new Date(now - minsAgo * 60_000) }) as unknown as LiveStatus;

describe('liveDisplay', () => {
  it('reads a fresh fix by its status code', () => {
    const d = liveDisplay(vehicle, live(1, 5), now);
    expect(d.group).toBe('moving');
    expect(d.stale).toBe(false);
  });

  it('calls a fix from 10 October no signal, with when it was last seen', () => {
    const d = liveDisplay(vehicle, null, now);
    expect(d.stale).toBe(true);
    expect(d.label).toBe('No signal');
    expect(d.at?.toISOString()).toBe('2026-10-10T09:00:00.000Z');
  });

  it('keeps offline as offline', () => {
    expect(liveDisplay(vehicle, live(12, 600), now).stale).toBe(false);
  });
});
