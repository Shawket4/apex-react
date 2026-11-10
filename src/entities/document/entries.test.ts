import { describe, expect, it } from 'vitest';
import { ownerEntries, summariseEntries } from './entries';
import { documentTypeSchema, ownerDocumentSchema } from './schemas';

const TODAY = '2026-11-10';

const type = (key: string, owner_kind: 'car' | 'driver', extra: Record<string, unknown> = {}) =>
  documentTypeSchema.parse({ key, owner_kind, layout: 'sides', slots: [], ...extra });

const TYPES = [
  type('driving_licence', 'driver'),
  type('site_access_pass', 'driver', { multiple: true }),
  type('vehicle_licence', 'car'),
  type('tank_licence', 'car', { car_types: ['Trailer', 'Truck'] }),
];

const doc = (id: number, type_key: string, expiry_date: string | null, label = '') =>
  ownerDocumentSchema.parse({
    id,
    type_key,
    label,
    current_version_id: id * 10,
    versions: [{ id: id * 10, created_at: '2026-10-01T00:00:00Z', expiry_date }],
  });

describe('ownerEntries', () => {
  it('lists every type of the owner kind, added or not, in catalogue order', () => {
    const entries = ownerEntries(TYPES, [], 'driver');
    expect(entries.map((e) => e.key)).toEqual(['driving_licence', 'site_access_pass']);
    expect(entries.every((e) => e.document === undefined)).toBe(true);
  });

  it('gives each document of a several-per-owner type its own entry', () => {
    const entries = ownerEntries(
      TYPES,
      [doc(1, 'site_access_pass', null, 'Petrojet'), doc(2, 'site_access_pass', null, 'Enppi')],
      'driver',
    );
    expect(entries.map((e) => e.key)).toEqual([
      'driving_licence',
      'site_access_pass:1',
      'site_access_pass:2',
    ]);
  });

  it('leaves out a paper the vehicle does not carry, unless one was saved', () => {
    expect(ownerEntries(TYPES, [], 'car', 'No Trailer').map((e) => e.key)).toEqual([
      'vehicle_licence',
    ]);
    expect(ownerEntries(TYPES, [], 'car', 'Trailer').map((e) => e.key)).toEqual([
      'vehicle_licence',
      'tank_licence',
    ]);
    expect(
      ownerEntries(TYPES, [doc(7, 'tank_licence', null)], 'car', 'No Trailer').map((e) => e.key),
    ).toEqual(['vehicle_licence', 'tank_licence:7']);
  });
});

describe('summariseEntries', () => {
  it('counts what is expired, expiring and not added; an undated paper is none of them', () => {
    const entries = ownerEntries(
      [...TYPES, type('drug_test', 'driver'), type('national_id', 'driver')],
      [
        doc(1, 'driving_licence', '2026-11-09'),
        doc(2, 'site_access_pass', '2026-11-20'),
        doc(3, 'drug_test', null),
      ],
      'driver',
    );
    expect(summariseEntries(entries, TODAY)).toEqual({ expired: 1, expiring: 1, missing: 1 });
  });

  it('counts a document with every version hidden as not added', () => {
    const hidden = ownerDocumentSchema.parse({
      id: 1,
      type_key: 'driving_licence',
      current_version_id: null,
      versions: [{ id: 10, created_at: '2026-10-01T00:00:00Z', hidden: true }],
    });
    const entries = ownerEntries([type('driving_licence', 'driver')], [hidden], 'driver');
    expect(summariseEntries(entries, TODAY)).toEqual({ expired: 0, expiring: 0, missing: 1 });
  });
});
