/**
 * File downloads from the Go exports.
 *
 * Every server export (trips, Watanya, receipt piles) can now come back as an
 * Excel workbook or a PDF, in English or Arabic. These helpers keep the three
 * callers agreeing on the parameter values, the MIME type a saved file gets,
 * and how its name is read from Content-Disposition.
 */

export type ExportFormat = 'xlsx' | 'pdf';
export type ExportLang = 'en' | 'ar';

export const EXPORT_MIME: Record<ExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

/** The export language for an i18next language tag ("ar", "ar-EG", "en-GB"…). */
export function toExportLang(language: string | undefined): ExportLang {
  return (language ?? '').toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

/**
 * The file name a Content-Disposition header carries, preferring the RFC 5987
 * `filename*=UTF-8''…` form (non-ASCII names) over plain `filename=`.
 */
export function filenameFromDisposition(header: unknown, fallback: string): string {
  if (typeof header !== 'string') return fallback;
  const star = header.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // fall through to the plain form
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain?.[1]?.trim() || fallback;
}

/** Wraps a blob response as a file of the requested format. */
export function toDownload(
  data: unknown,
  headers: Record<string, unknown> | undefined,
  format: ExportFormat,
  fallbackName: string,
): { blob: Blob; filename: string } {
  const blob = new Blob([data as BlobPart], { type: EXPORT_MIME[format] });
  const filename = filenameFromDisposition(headers?.['content-disposition'], fallbackName);
  return { blob, filename };
}
