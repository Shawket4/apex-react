import { describe, expect, it } from 'vitest';
import { byUrgency, countByStatus, fleetDocuments, ownerDocumentsPath } from './rows';

const TODAY = '2026-11-10';
const names = new Map([
  [1, 'ABC 123'],
  [2, 'XYZ 789'],
]);

function row(document_id: number, owner_id: number, expiry_date: string | null) {
  return {
    document_id,
    owner_id,
    type_key: 'vehicle_licence',
    label: '',
    version_id: document_id * 10,
    issue_date: null,
    expiry_date,
    file_count: 2,
  };
}

describe('fleetDocuments', () => {
  it('names the owner and reads the status off the expiry date', () => {
    const [lapsed, undated, orphan] = fleetDocuments(
      'car',
      [row(1, 1, '2026-11-01'), row(2, 2, null), row(3, 99, '2030-01-01')],
      names,
      TODAY,
    );
    expect(lapsed).toMatchObject({ key: 'car:1', ownerName: 'ABC 123', status: 'expired', days: -9 });
    expect(undated).toMatchObject({ status: 'undated', days: null });
    expect(orphan).toMatchObject({ ownerName: '', status: 'valid' });
  });

  it('puts what lapsed longest ago first and the undated last', () => {
    const rows = fleetDocuments(
      'car',
      [
        row(1, 1, null),
        row(2, 1, '2030-01-01'),
        row(3, 2, '2026-11-20'),
        row(4, 2, '2026-11-01'),
        row(5, 1, '2026-10-01'),
      ],
      names,
      TODAY,
    );
    expect(rows.sort(byUrgency).map((r) => r.key)).toEqual([
      'car:5',
      'car:4',
      'car:3',
      'car:2',
      'car:1',
    ]);
    expect(countByStatus(rows)).toEqual({ expired: 2, expiring: 1, valid: 1, undated: 1 });
  });
});

describe('ownerDocumentsPath', () => {
  it('leads to the documents tab of the owner', () => {
    expect(ownerDocumentsPath('car', 7)).toBe('/cars/7?tab=documents');
    expect(ownerDocumentsPath('driver', 3)).toBe('/drivers/3?tab=documents');
  });
});
