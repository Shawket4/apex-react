import type { TFunction } from 'i18next';
import type { DocumentType } from '@/entities/document/schemas';

/**
 * A type's name. The server only ever sends the key; a key with no
 * translation yet (a type added before its name) shows as the key itself
 * rather than an empty heading.
 */
export function documentTypeName(t: TFunction, typeKey: string): string {
  return t(`documents.types.${typeKey}`, { defaultValue: typeKey });
}

/** "Site access pass · Petrojet" for the types an owner holds several of. */
export function documentName(t: TFunction, typeKey: string, label?: string | null): string {
  const name = documentTypeName(t, typeKey);
  return label ? `${name} · ${label}` : name;
}

export function slotName(t: TFunction, slotKey: string): string {
  return t(`documents.slots.${slotKey}`, { defaultValue: slotKey });
}

/** Whether "renew" is the word: a paper is renewed, a photo is replaced. */
export function isPaper(type: DocumentType): boolean {
  return type.layout === 'sides' || type.layout === 'pages';
}
