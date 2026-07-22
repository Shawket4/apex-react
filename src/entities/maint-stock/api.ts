import { z } from 'zod';
import { apiClient } from '@/shared/api/client';
import {
  oilStockSchema,
  tireStockSchema,
  type OilCreditInput,
  type OilStock,
  type TireCreditInput,
  type TireStock,
} from './schemas';

/* FalconGo returns bare arrays / objects here (no `data` envelope). */

export const maintStockApi = {
  /** `GET /api/maint-stock/tires` — fungible tire lines, on-hand counts. */
  async listTires(): Promise<TireStock[]> {
    const res = await apiClient.get('/api/maint-stock/tires');
    return z.array(tireStockSchema).parse(res.data);
  },

  /** `GET /api/maint-stock/oil` — bulk oil liters per type. */
  async listOil(): Promise<OilStock[]> {
    const res = await apiClient.get('/api/maint-stock/oil');
    return z.array(oilStockSchema).parse(res.data);
  },

  /** `POST /api/maint-stock/tires/credit` (level-4) — add a shipment. */
  async creditTires(input: TireCreditInput): Promise<TireStock> {
    const res = await apiClient.post('/api/maint-stock/tires/credit', input);
    return tireStockSchema.parse(res.data);
  },

  /** `POST /api/maint-stock/oil/credit` (level-4) — add oil liters. */
  async creditOil(input: OilCreditInput): Promise<OilStock> {
    const res = await apiClient.post('/api/maint-stock/oil/credit', input);
    return oilStockSchema.parse(res.data);
  },
};
