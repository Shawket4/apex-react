import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
const get = vi.fn();

vi.mock('@/shared/api/client', () => ({
  apiClient: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) },
  apiClientRust: {},
}));

const { tripApi } = await import('./api');
const { receiptPileApi } = await import('../receipt-pile/api');

beforeEach(() => {
  post.mockReset();
  get.mockReset();
});

describe('Watanya export', () => {
  it('sends lang and format for the workbook and keeps the xlsx fallback name', async () => {
    post.mockResolvedValue({ data: 'PK', headers: {} });
    const out = await tripApi.exportWatanyaReport({
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      lang: 'ar',
      format: 'xlsx',
    });
    expect(post).toHaveBeenCalledWith(
      '/api/trips/watanya/export_report',
      { start_date: '2026-09-01', end_date: '2026-09-30', lang: 'ar', format: 'xlsx' },
      { responseType: 'blob' },
    );
    expect(out.filename).toBe('watanya_report.xlsx');
    expect(out.blob.type).toContain('spreadsheetml');
  });

  it('sends the part for a PDF and names it from Content-Disposition', async () => {
    post.mockResolvedValue({
      data: '%PDF',
      headers: {
        'content-disposition': 'attachment; filename="watanya_details_20260901_20260930.pdf"',
      },
    });
    const out = await tripApi.exportWatanyaReport({
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      lang: 'en',
      format: 'pdf',
      part: 'details',
    });
    expect(post.mock.calls[0][1]).toEqual({
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      lang: 'en',
      format: 'pdf',
      part: 'details',
    });
    expect(out.blob.type).toBe('application/pdf');
    expect(out.filename).toBe('watanya_details_20260901_20260930.pdf');
  });

  it('falls back to watanya_<part>.pdf without the header', async () => {
    post.mockResolvedValue({ data: '%PDF', headers: {} });
    const out = await tripApi.exportWatanyaReport({
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      lang: 'en',
      format: 'pdf',
      part: 'summary',
    });
    expect(out.filename).toBe('watanya_summary.pdf');
  });
});

describe('trips export', () => {
  it('adds lang to the labels body and format to the query', async () => {
    post.mockResolvedValue({
      data: '%PDF',
      headers: { 'content-disposition': 'attachment; filename="trips-2026-10-18.pdf"' },
    });
    const out = await tripApi.exportExcel(
      {
        search: '',
        company: 'Watanya',
        startDate: '',
        endDate: '',
        missingData: '',
        receiptStatus: '',
      },
      { title: 'الرحلات' },
      { lang: 'ar', format: 'pdf' },
    );
    expect(post).toHaveBeenCalledWith(
      '/api/trips/export',
      { title: 'الرحلات', lang: 'ar' },
      { params: { company: 'Watanya', format: 'pdf' }, responseType: 'blob' },
    );
    expect(out.blob.type).toBe('application/pdf');
    expect(out.filename).toBe('trips-2026-10-18.pdf');
  });
});

describe('receipt piles export', () => {
  it('adds lang and format to the query', async () => {
    get.mockResolvedValue({ data: 'PK', headers: {} });
    const out = await receiptPileApi.export(
      { startDate: '2026-09-01', endDate: '2026-09-30', mode: 'balanced' },
      { lang: 'en', format: 'xlsx' },
    );
    expect(get).toHaveBeenCalledWith('/api/receipt-piles/export', {
      params: {
        start_date: '2026-09-01',
        end_date: '2026-09-30',
        mode: 'balanced',
        lang: 'en',
        format: 'xlsx',
      },
      responseType: 'blob',
    });
    expect(out.filename).toBe('receipt_piles_20260901_20260930.xlsx');
  });

  it('names a PDF with the pdf extension and type', async () => {
    get.mockResolvedValue({ data: '%PDF', headers: {} });
    const out = await receiptPileApi.export(
      { startDate: '2026-09-01', endDate: '2026-09-30', mode: 'letter' },
      { lang: 'ar', format: 'pdf' },
    );
    expect(out.filename).toBe('receipt_piles_20260901_20260930.pdf');
    expect(out.blob.type).toBe('application/pdf');
  });
});
