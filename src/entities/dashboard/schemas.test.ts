import { describe, expect, it } from 'vitest';
import { STALE_FIX_MS, tileStatus, type FleetEntry, type LiveVehicle } from './schemas';

const NOW = Date.parse('2026-10-25T07:35:00Z');

const entry: FleetEntry = {
  etit_id: 'v1',
  plate_no: '8567',
  plate_ar: 'س ج ط',
  last_trip_date: null,
  days_idle: null,
};

function live(status: number, statusLabel: string, ageMs = 60_000, speed = 0): LiveVehicle {
  return {
    id: 'v1',
    lat: 26.8,
    lng: 33.9,
    speed,
    status,
    statusLabel,
    timestamp: new Date(NOW - ageMs).toISOString(),
  };
}

describe('tileStatus', () => {
  it('reads "Stopped (Ignition Off)" as stopped, not offline', () => {
    expect(tileStatus(entry, live(3, 'Stopped (Ignition Off)'), NOW)).toBe('stopped');
  });

  it.each([
    [1, 'Moving', 'moving'],
    [4, 'Moving', 'moving'],
    [13, 'Idling (Ignition On)', 'idling'],
    [12, 'Offline', 'offline'],
    [17, 'Geofence Violation', 'geofence'],
    [18, 'Geofence Violation', 'geofence'],
    [99, 'Unknown', 'unknown'],
    [0, '', 'unknown'],
  ] as const)('status %i → %s', (code, label, want) => {
    expect(tileStatus(entry, live(code, label), NOW)).toBe(want);
  });

  it('classifies by the number, whatever the label says', () => {
    expect(tileStatus(entry, live(1, 'Ignition Off'), NOW)).toBe('moving');
    expect(tileStatus(entry, live(3, 'Moving', 60_000, 50), NOW)).toBe('stopped');
  });

  it('treats a fix older than the threshold as no signal', () => {
    expect(tileStatus(entry, live(1, 'Moving', STALE_FIX_MS - 1000), NOW)).toBe('moving');
    expect(tileStatus(entry, live(1, 'Moving', STALE_FIX_MS + 1000), NOW)).toBe('unknown');
    expect(tileStatus(entry, live(3, 'Stopped', 3 * 3600_000), NOW)).toBe('unknown');
    // Offline stays offline — ETIT's own verdict.
    expect(tileStatus(entry, live(12, 'Offline', 3 * 3600_000), NOW)).toBe('offline');
  });

  it('keeps a reading with no timestamp on its status', () => {
    expect(tileStatus(entry, { ...live(13, 'Idling'), timestamp: null }, NOW)).toBe('idling');
  });

  it('untracked and absent vehicles', () => {
    expect(tileStatus({ ...entry, etit_id: null }, live(1, 'Moving'), NOW)).toBe('untracked');
    expect(tileStatus(entry, undefined, NOW)).toBe('unknown');
  });
});
