import type { MissingDataFilter, ReceiptStatusFilter } from '@/entities/trip/schemas';

/* -------------------------------------------------------------------------- */
/* URL serialization                                                           */
/*                                                                             */
/* Single-letter codes keep the URL short. Inverse parsers default to ''/all. */
/* -------------------------------------------------------------------------- */

export function serializeMissing(value: MissingDataFilter): string | null {
  if (value === '') return null;
  return value[0]; // 'd' / 'r' / 'a'
}

export function parseMissing(raw: string | null): MissingDataFilter {
  if (raw === 'd') return 'driver';
  if (raw === 'r') return 'route';
  if (raw === 'a') return 'any';
  return '';
}

export function serializeReceiptStatus(value: ReceiptStatusFilter): string | null {
  if (value === '') return null;
  if (value === 'pending') return 'p';
  if (value === 'in_garage') return 'g';
  if (value === 'in_office') return 'o';
  return null;
}

export function parseReceiptStatus(raw: string | null): ReceiptStatusFilter {
  if (raw === 'p') return 'pending';
  if (raw === 'g') return 'in_garage';
  if (raw === 'o') return 'in_office';
  return '';
}
