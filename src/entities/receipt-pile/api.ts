import { apiClient } from '@/shared/api/client';
import { toDownload, type ExportFormat, type ExportLang } from '@/shared/api/download';
import {
  dropOffDetailSchema,
  pilePlanSchema,
  type DropOffDetail,
  type DropOffDetailParams,
  type PilePlan,
  type PilePlanParams,
} from './schemas';

/**
 * One query string for both endpoints, so the workbook a user downloads is
 * always the plan they were just looking at.
 */
function toQuery(params: PilePlanParams): Record<string, string> {
  const query: Record<string, string> = {
    start_date: params.startDate,
    end_date: params.endDate,
    mode: params.mode,
  };
  // Absent means "derive it from this range"; the server rejects a 0.
  if (params.piles) query.piles = String(params.piles);
  return query;
}

export const receiptPileApi = {
  /** `GET /api/receipt-piles` — the filing plan for a range. */
  async plan(params: PilePlanParams): Promise<PilePlan> {
    const res = await apiClient.get('/api/receipt-piles', { params: toQuery(params) });
    return pilePlanSchema.parse(res.data);
  },

  /**
   * `GET /api/receipt-piles/drop-off` — one drop-off's receipts, split per
   * terminal, in the order the Watanya fee report prints them.
   */
  async dropOff(params: DropOffDetailParams): Promise<DropOffDetail> {
    const res = await apiClient.get('/api/receipt-piles/drop-off', {
      params: {
        start_date: params.startDate,
        end_date: params.endDate,
        drop_off_point: params.dropOffPoint,
      },
    });
    return dropOffDetailSchema.parse(res.data);
  },

  /**
   * `GET /api/receipt-piles/export` — the same plan as a workbook.
   *
   * Built in Go with excelize; the browser only saves it. Building it here
   * would mean a second copy of the layout to drift from, and the checklist
   * sheet's live COUNTIFS formulas would have to be reproduced by hand.
   */
  async export(
    params: PilePlanParams,
    options: { lang: ExportLang; format: ExportFormat } = { lang: 'ar', format: 'xlsx' },
  ): Promise<{ blob: Blob; filename: string }> {
    const res = await apiClient.get('/api/receipt-piles/export', {
      params: { ...toQuery(params), lang: options.lang, format: options.format },
      responseType: 'blob',
    });
    const compact = (d: string) => d.replace(/-/g, '');
    return toDownload(
      res.data,
      res.headers,
      options.format,
      `receipt_piles_${compact(params.startDate)}_${compact(params.endDate)}.${options.format}`,
    );
  },
};
