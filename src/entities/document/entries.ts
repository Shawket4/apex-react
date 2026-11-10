import type { DocumentType, OwnerDocument, OwnerKind } from './schemas';
import { currentVersion, documentStatus, typeApplies } from './status';

/** One line of what an owner carries: a type, and their document of it if there is one. */
export interface DocumentEntry {
  key: string;
  type: DocumentType;
  document?: OwnerDocument;
}

/**
 * What an owner carries, in catalogue order: every type that applies to them,
 * with one entry per document for the types they hold several of.
 *
 * A paper this vehicle does not carry is left out, unless one was already
 * saved for it: what exists is never hidden by a rule.
 */
export function ownerEntries(
  types: readonly DocumentType[],
  documents: readonly OwnerDocument[],
  ownerKind: OwnerKind,
  carType?: string | null,
): DocumentEntry[] {
  const out: DocumentEntry[] = [];
  for (const type of types) {
    if (type.owner_kind !== ownerKind) continue;
    const mine = documents.filter((d) => d.type_key === type.key);
    if (mine.length === 0) {
      if (typeApplies(type, carType)) out.push({ key: type.key, type });
      continue;
    }
    for (const document of mine) {
      out.push({ key: `${type.key}:${document.id}`, type, document });
    }
  }
  return out;
}

export interface EntriesSummary {
  expired: number;
  expiring: number;
  /** Not added yet, or every version of it hidden. */
  missing: number;
}

/** How many of an owner's documents need attention, and why. */
export function summariseEntries(entries: readonly DocumentEntry[], today?: string): EntriesSummary {
  const summary: EntriesSummary = { expired: 0, expiring: 0, missing: 0 };
  for (const entry of entries) {
    const version = entry.document ? currentVersion(entry.document) : null;
    if (!version) {
      summary.missing += 1;
      continue;
    }
    const status = documentStatus(version.expiry_date, today);
    if (status === 'expired') summary.expired += 1;
    else if (status === 'expiring') summary.expiring += 1;
  }
  return summary;
}
