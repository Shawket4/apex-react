import { apiClient } from '@/shared/api/client';
import { pilePlanSchema, type PilePlan, type PilePlanParams } from './schemas';

/** Query string shared by the JSON and export endpoints, so the workbook a
 *  user downloads is always the plan they were just looking at. */
function toQuery(params: PilePlanParams): Record<string, string> {
  const q: Record<string, string> = {
    start_date: params.startDate,
    end_date: params.endDate,
    mode: params.mode,
  };
  // Absent means "derive it from this range" — sending 0 would be rejected.
  if (params.piles) q.piles = String(params.piles);
  return q;
}

export const receiptPileApi = {
  /** `GET /api/receipt-piles` — the filing plan for a range. */
  async plan(params: PilePlanParams): Promise<PilePlan> {
    const res = await apiClient.get('/api/receipt-piles', { params: toQuery(params) });
    return pilePlanSchema.parse(res.data);
  },

  /**
   * `GET /api/receipt-piles/export` — the same plan as a workbook.
   *
   * The file is built in Go with excelize; the browser only saves it. Building
   * it here would mean a second implementation of the layout to drift from,
   * and the checklist sheet's live COUNTIFS formulas would have to be
   * reproduced by hand.
   */
  async export(params: PilePlanParams): Promise<{ blob: Blob; filename: string }> {
    const res = await apiClient.get('/api/receipt-piles/export', {
      params: toQuery(params),
      responseType: 'blob',
    });
    const blob = new Blob([res.data as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    let filename = `receipt_piles_${params.startDate}_${params.endDate}.xlsx`;
    const disposition = res.headers?.['content-disposition'];
    if (typeof disposition === 'string') {
      const match = disposition.match(/filename="?([^"]+)"?/i);
      if (match?.[1]) filename = match[1];
    }
    return { blob, filename };
  },
};
