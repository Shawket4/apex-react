import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import { apiClientMaint } from '@/shared/api/client';
import {
  batteryCountResultSchema,
  batteryStockSchema,
  oilCountResultSchema,
  oilStockSchema,
  tireCountResultSchema,
  tireStockSchema,
  type BatteryCountInput,
  type BatteryCountResult,
  type BatteryCreditInput,
  type BatteryStock,
  type OilCountInput,
  type OilCountResult,
  type OilCreditInput,
  type OilStock,
  type TireCountInput,
  type TireCountResult,
  type TireCreditInput,
  type TireStock,
} from './schemas';

/** False when this build has no address for the garage system: no counts. */
export const canCountStock = apiClientMaint !== null;

function maint(): AxiosInstance {
  if (!apiClientMaint) throw new Error('Maintenance API is not configured');
  return apiClientMaint;
}

/* Stock is the garage system's (maint-rust): it keeps the book, takes
 * shipments and counts, and mirrors every tire and oil movement to Falcon's
 * ledger. Battery stock stays in the garage system. */

export const maintStockApi = {
  /** `GET /stock/tires` — new-tire lines, on-hand counts. */
  async listTires(): Promise<TireStock[]> {
    const res = await maint().get('/stock/tires');
    return z.array(tireStockSchema).parse(res.data);
  },

  /** `GET /stock/oil` — bulk oil liters per type. */
  async listOil(): Promise<OilStock[]> {
    const res = await maint().get('/stock/oil');
    return z.array(oilStockSchema).parse(res.data);
  },

  /** `GET /stock/batteries` — new batteries on the shelf, per product. */
  async listBatteries(): Promise<BatteryStock[]> {
    const res = await maint().get('/stock/batteries');
    return z.array(batteryStockSchema).parse(res.data);
  },

  /** `POST /stock/tires/credit` (level-4) — add a shipment. `refId` is one id
   * per submission, so a retry or a double click adds once. */
  async creditTires(input: TireCreditInput, refId: string): Promise<TireStock> {
    const res = await maint().post('/stock/tires/credit', {
      brand: input.brand,
      model: input.model || null,
      size: input.size || null,
      qty: input.on_hand_qty,
      ref_id: refId,
    });
    return tireStockSchema.parse(res.data);
  },

  /** `POST /stock/batteries/credit` (level-4) — add a battery shipment; the
   * product (brand, model, Ah, volts) is made on first use. */
  async creditBatteries(input: BatteryCreditInput, refId: string): Promise<BatteryStock> {
    const res = await maint().post('/stock/batteries/credit', {
      brand: input.brand,
      model: input.model || null,
      capacity_ah: input.capacity_ah,
      voltage: input.voltage,
      cca: input.cca,
      qty: input.qty,
      ref_id: refId,
    });
    return batteryStockSchema.parse(res.data);
  },

  /** `POST /stock/oil/credit` (level-4) — add oil liters. */
  async creditOil(input: OilCreditInput, refId: string): Promise<OilStock> {
    const res = await maint().post('/stock/oil/credit', {
      oil_type: input.oil_type,
      liters: input.liters_on_hand,
      ref_id: refId,
    });
    return oilStockSchema.parse(res.data);
  },

  /** `POST /stock/tires/count` — bring the book figure to what was counted. */
  async countTires(input: TireCountInput): Promise<TireCountResult> {
    const res = await maint().post('/stock/tires/count', input);
    return tireCountResultSchema.parse(res.data);
  },

  /** `POST /stock/batteries/count` — the same for one battery product. */
  async countBatteries(input: BatteryCountInput): Promise<BatteryCountResult> {
    const res = await maint().post('/stock/batteries/count', input);
    return batteryCountResultSchema.parse(res.data);
  },

  /** `POST /stock/oil/count` — the same for liters of one oil type. */
  async countOil(input: OilCountInput): Promise<OilCountResult> {
    const res = await maint().post('/stock/oil/count', input);
    return oilCountResultSchema.parse(res.data);
  },
};
