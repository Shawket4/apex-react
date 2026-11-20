import { isReadableInstant } from '@/entities/maintenance/lib';
import { formatCairoDate } from '@/shared/lib/cairo';

/** A date from the garage system, or a dash when there is none to read. */
export function maintDate(value: string | null | undefined, language: string): string {
  return isReadableInstant(value) ? formatCairoDate(value, language) : '—';
}
