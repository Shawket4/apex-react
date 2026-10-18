import { describe, expect, it } from 'vitest';

import { EXPORT_MIME, filenameFromDisposition, toDownload, toExportLang } from './download';

describe('filenameFromDisposition', () => {
  it('reads the plain and the RFC 5987 forms', () => {
    expect(filenameFromDisposition('attachment; filename="trips-2026-10-18.pdf"', 'x')).toBe(
      'trips-2026-10-18.pdf',
    );
    expect(
      filenameFromDisposition(
        `attachment; filename="r.xlsx"; filename*=UTF-8''%D8%AA%D9%82%D8%B1%D9%8A%D8%B1.xlsx`,
        'x',
      ),
    ).toBe('تقرير.xlsx');
    expect(
      filenameFromDisposition('attachment; filename=watanya_summary_20260901_20260930.pdf', 'x'),
    ).toBe('watanya_summary_20260901_20260930.pdf');
  });

  it('falls back when the header is missing', () => {
    expect(filenameFromDisposition(undefined, 'watanya_report.xlsx')).toBe('watanya_report.xlsx');
  });
});

describe('toDownload', () => {
  it('types a PDF as a PDF, not a spreadsheet', () => {
    const { blob, filename } = toDownload('%PDF-1.4', {}, 'pdf', 'watanya_summary.pdf');
    expect(blob.type).toBe('application/pdf');
    expect(filename).toBe('watanya_summary.pdf');
  });

  it('types a workbook as xlsx', () => {
    expect(toDownload('PK', undefined, 'xlsx', 'a.xlsx').blob.type).toBe(EXPORT_MIME.xlsx);
  });
});

describe('toExportLang', () => {
  it('maps i18next tags to en/ar', () => {
    expect(toExportLang('ar')).toBe('ar');
    expect(toExportLang('ar-EG')).toBe('ar');
    expect(toExportLang('en-GB')).toBe('en');
    expect(toExportLang(undefined)).toBe('en');
  });
});
