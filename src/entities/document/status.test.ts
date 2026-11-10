import { describe, expect, it } from 'vitest';
import { currentVersion, daysUntilDay, documentStatus, typeApplies } from './status';
import { documentTypeSchema, ownerDocumentSchema } from './schemas';

const TODAY = '2026-11-10';

describe('daysUntilDay', () => {
  it('counts whole days, negative once passed', () => {
    expect(daysUntilDay('2026-11-10', TODAY)).toBe(0);
    expect(daysUntilDay('2026-11-11', TODAY)).toBe(1);
    expect(daysUntilDay('2026-11-09', TODAY)).toBe(-1);
    expect(daysUntilDay('2027-11-10', TODAY)).toBe(365);
  });

  it('has no answer without a date', () => {
    expect(daysUntilDay(null, TODAY)).toBeNull();
    expect(daysUntilDay('', TODAY)).toBeNull();
    expect(daysUntilDay('soon', TODAY)).toBeNull();
  });
});

describe('documentStatus', () => {
  it('a missing expiry date is undated, never expired', () => {
    expect(documentStatus(null, TODAY)).toBe('undated');
    expect(documentStatus(undefined, TODAY)).toBe('undated');
  });

  it('expires the day after its date, not on it', () => {
    expect(documentStatus('2026-11-10', TODAY)).toBe('expiring');
    expect(documentStatus('2026-11-09', TODAY)).toBe('expired');
  });

  it('warns inside the thirty-day window only', () => {
    expect(documentStatus('2026-12-10', TODAY)).toBe('expiring');
    expect(documentStatus('2026-12-11', TODAY)).toBe('valid');
  });
});

describe('currentVersion', () => {
  const parse = (current: number | null) =>
    ownerDocumentSchema.parse({
      id: 1,
      type_key: 'vehicle_licence',
      current_version_id: current,
      versions: [
        { id: 3, created_at: '2026-11-01T00:00:00Z', hidden: true },
        { id: 2, created_at: '2026-10-01T00:00:00Z' },
      ],
    });

  it('is the version the server names, not the newest', () => {
    expect(currentVersion(parse(2))?.id).toBe(2);
  });

  it('is nothing when every version is hidden', () => {
    expect(currentVersion(parse(null))).toBeNull();
  });
});

describe('typeApplies', () => {
  const type = (car_types?: string[]) =>
    documentTypeSchema.parse({
      key: 'tank_licence',
      owner_kind: 'car',
      layout: 'sides',
      slots: [],
      car_types,
    });

  it('a type with no list applies to every owner', () => {
    expect(typeApplies(type(), null)).toBe(true);
    expect(typeApplies(type([]), 'No Trailer')).toBe(true);
  });

  it('a tank licence is a tanker paper', () => {
    expect(typeApplies(type(['Trailer', 'Truck']), 'Truck')).toBe(true);
    expect(typeApplies(type(['Trailer', 'Truck']), 'No Trailer')).toBe(false);
    expect(typeApplies(type(['Trailer', 'Truck']), null)).toBe(false);
  });
});
