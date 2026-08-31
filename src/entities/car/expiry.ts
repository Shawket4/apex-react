import type { Car } from './schemas';

/**
 * How far ahead a vehicle document counts as expiring.
 *
 * The single definition of the window, for every surface. It is not duplicated
 * in either backend: apex-rust takes it as a query parameter and the Excel
 * export takes it in its request body, so the dashboard's attention panel, the
 * cars screen and the spreadsheet cannot name different trucks as expiring.
 * They did differ before this — the cars screen used 30 days against the
 * dashboard's 60, so a licence with six weeks left was flagged on one and
 * silent on the other.
 */
export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

export type DocumentState = 'valid' | 'expiring' | 'expired' | 'missing';

/** The three dated papers a vehicle carries. Keys match the API's fields. */
export const CAR_DOCUMENT_KINDS = ['license', 'calibration', 'tank_license'] as const;
export type CarDocumentKind = (typeof CAR_DOCUMENT_KINDS)[number];

const FIELD: Record<CarDocumentKind, keyof Car> = {
  license: 'license_expiration_date',
  calibration: 'calibration_expiration_date',
  tank_license: 'tank_license_expiration_date',
};

/**
 * Whole days until a document lapses; negative once it has. `null` when the
 * date is absent or unparseable — legacy rows carry an empty string, which
 * `new Date('')` turns into Invalid Date rather than throwing, so it has to be
 * tested for rather than caught.
 */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value || !value.trim()) return null;
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return null;
  // Compare dates, not instants: a licence expiring today is not half-expired
  // by lunchtime.
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDay(then) - startOfDay(new Date())) / 86_400_000);
}

export function documentState(value: string | null | undefined): DocumentState {
  const days = daysUntil(value);
  if (days === null) return 'missing';
  if (days < 0) return 'expired';
  if (days <= DOCUMENT_EXPIRY_WARNING_DAYS) return 'expiring';
  return 'valid';
}

/**
 * Only tankers carry a tank licence, so a van without one is not missing a
 * paper — it was never required to have it. Mirrors the rule the status column
 * has always applied.
 */
export function documentApplies(car: Car, kind: CarDocumentKind): boolean {
  if (kind !== 'tank_license') return true;
  return car.car_type === 'Trailer' || car.car_type === 'Truck';
}

export interface CarDocument {
  kind: CarDocumentKind;
  value: string | null | undefined;
  state: DocumentState;
  days: number | null;
}

export function carDocuments(car: Car): CarDocument[] {
  return CAR_DOCUMENT_KINDS.filter((kind) => documentApplies(car, kind)).map((kind) => {
    const value = car[FIELD[kind]] as string | null | undefined;
    return { kind, value, state: documentState(value), days: daysUntil(value) };
  });
}

/**
 * The worst state across a vehicle's applicable papers — what the row badge
 * reports. `missing` ranks below `expiring`: an unrecorded date is a gap in the
 * paperwork, not a lapsed licence, and calling it expired would put trucks on
 * the overdue list that nobody can act on.
 */
const RANK: Record<DocumentState, number> = { valid: 0, missing: 1, expiring: 2, expired: 3 };

export function carDocumentState(car: Car): DocumentState {
  return carDocuments(car).reduce<DocumentState>(
    (worst, d) => (RANK[d.state] > RANK[worst] ? d.state : worst),
    'valid',
  );
}
