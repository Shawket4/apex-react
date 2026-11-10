import type { DocumentOverviewRow, OwnerKind } from '@/entities/document/schemas';
import {
  DOCUMENT_STATUSES,
  daysUntilDay,
  documentStatus,
  type DocumentStatus,
} from '@/entities/document/status';

/** One document in force, with the car or driver it belongs to. */
export interface FleetDocument {
  /** Unique across both kinds. */
  key: string;
  kind: OwnerKind;
  ownerId: number;
  /** The plate or the driver's name; empty when the owner is no longer listed. */
  ownerName: string;
  typeKey: string;
  label: string;
  issueDate: string | null;
  expiryDate: string | null;
  fileCount: number;
  status: DocumentStatus;
  /** Days to expiry, negative once passed, null with no expiry date. */
  days: number | null;
}

/** Where a row leads: the owner's page, on its documents. */
export function ownerDocumentsPath(kind: OwnerKind, ownerId: number): string {
  return `/${kind === 'car' ? 'cars' : 'drivers'}/${ownerId}?tab=documents`;
}

export function fleetDocuments(
  kind: OwnerKind,
  rows: readonly DocumentOverviewRow[],
  ownerNames: ReadonlyMap<number, string>,
  today?: string,
): FleetDocument[] {
  return rows.map((row) => ({
    key: `${kind}:${row.document_id}`,
    kind,
    ownerId: row.owner_id,
    ownerName: ownerNames.get(row.owner_id) ?? '',
    typeKey: row.type_key,
    label: row.label,
    issueDate: row.issue_date ?? null,
    expiryDate: row.expiry_date ?? null,
    fileCount: row.file_count,
    status: documentStatus(row.expiry_date, today),
    days: daysUntilDay(row.expiry_date, today),
  }));
}

/**
 * What needs attention first: lapsed papers (longest lapsed on top), then
 * the ones about to lapse, then the rest by date, undated last.
 */
export function byUrgency(a: FleetDocument, b: FleetDocument): number {
  const status = DOCUMENT_STATUSES.indexOf(a.status) - DOCUMENT_STATUSES.indexOf(b.status);
  if (status !== 0) return status;
  if (a.days !== null && b.days !== null && a.days !== b.days) return a.days - b.days;
  return a.ownerName.localeCompare(b.ownerName) || a.key.localeCompare(b.key);
}

export function countByStatus(rows: readonly FleetDocument[]): Record<DocumentStatus, number> {
  const counts: Record<DocumentStatus, number> = { expired: 0, expiring: 0, valid: 0, undated: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}
