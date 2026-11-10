import type { TFunction } from 'i18next';

/** FalconGo stores a car's kind by its English name; this is where it gets a translated one. */
const TYPE_KEYS: Record<string, string> = {
  'No Trailer': 'cars.types.noTrailer',
  Trailer: 'cars.types.trailer',
  Truck: 'cars.types.truck',
};

/** The kind of a car in the reader's language. A kind we do not know is shown as stored. */
export function carTypeName(t: TFunction, type: string | null | undefined): string {
  if (!type) return '';
  const key = TYPE_KEYS[type];
  return key ? t(key) : type;
}
