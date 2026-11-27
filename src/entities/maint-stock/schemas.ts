import { z } from 'zod';

/**
 * Maintenance stock — the garage system's (maint-rust) book of new tires,
 * batteries and oil.
 *
 * Shipments are entered here (level-4) and sent to the garage system, which
 * also records what the garage uses and mirrors tire and oil movements to
 * Falcon. Tires are fungible counts (brand/model/size), batteries counts per
 * product (brand/model/Ah/volts), oil bulk liters per type — individual tire
 * and battery identity (DOT or serial, km, history) lives in the maintenance
 * system, not here. Batteries are counted in the garage system alone: no
 * Falcon ledger.
 */

export const tireStockSchema = z.object({
  brand: z.string(),
  model: z.string().nullish(),
  size: z.string().nullish(),
  on_hand_qty: z.number(),
}).passthrough();
export type TireStock = z.infer<typeof tireStockSchema>;

export const oilStockSchema = z.object({
  oil_type: z.string(),
  liters_on_hand: z.coerce.number(),
}).passthrough();
export type OilStock = z.infer<typeof oilStockSchema>;

/** Shipment entry: quantity to ADD to the (possibly new) stock line. */
export const tireCreditInputSchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim(),
  size: z.string().trim(),
  on_hand_qty: z.coerce.number().int().positive(),
});
export type TireCreditInput = z.infer<typeof tireCreditInputSchema>;

/** An optional whole number in a range; an empty field is null. */
function optionalWhole(min: number, max: number) {
  return z.preprocess(
    (value) =>
      value === '' || value === null || value === undefined || Number.isNaN(value) ? null : value,
    z.coerce.number().int().min(min).max(max).nullable(),
  );
}

/** Battery shipment: brand, model, Ah and volts name the product (CCA rides along). */
export const batteryCreditInputSchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim(),
  capacity_ah: optionalWhole(1, 2000),
  voltage: optionalWhole(2, 48),
  cca: optionalWhole(1, 5000),
  qty: z.coerce.number().int().positive().max(10_000),
});
export type BatteryCreditInput = z.infer<typeof batteryCreditInputSchema>;

export const oilCreditInputSchema = z.object({
  oil_type: z.string().trim().min(1),
  liters_on_hand: z.coerce.number().positive(),
});
export type OilCreditInput = z.infer<typeof oilCreditInputSchema>;

/* -------------------------------------------------------------------------- */
/* Stock counts — these go to the GARAGE system (maint-rust), not to Falcon.   */
/*                                                                            */
/* "We counted N": the garage system records the one movement that brings its  */
/* book figure to N and mirrors it up to Falcon in the background. Another     */
/* service answers, so its replies are read leniently.                         */
/* -------------------------------------------------------------------------- */

/** One id per submission; the same id again is the same count, recorded once. */
export interface TireCountInput {
  brand: string;
  model: string;
  size: string;
  counted: number;
  ref_id: string;
  note?: string;
}

/** The product is named the way the stock list sent it. */
export interface BatteryCountInput {
  brand: string;
  model: string | null;
  capacity_ah: number | null;
  voltage: number | null;
  cca: number | null;
  counted: number;
  ref_id: string;
  note?: string;
}

export interface OilCountInput {
  oil_type: string;
  counted_liters: number;
  ref_id: string;
  note?: string;
}

const maybeText = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

const maybeNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

export const tireCountResultSchema = z
  .object({
    brand: maybeText,
    model: maybeText,
    size: maybeText,
    /** The garage system's book figure before the count. */
    before: maybeNumber,
    on_hand_qty: maybeNumber,
    /** Signed: negative was taken off. */
    change: maybeNumber,
  })
  .passthrough();
export type TireCountResult = z.infer<typeof tireCountResultSchema>;

export const oilCountResultSchema = z
  .object({
    oil_type: maybeText,
    before: maybeNumber,
    liters_on_hand: maybeNumber,
    change: maybeNumber,
  })
  .passthrough();
export type OilCountResult = z.infer<typeof oilCountResultSchema>;

/* -------------------------------------------------------------------------- */
/* Batteries — counted in the garage system alone, per product.               */
/* -------------------------------------------------------------------------- */

/** A model sent as '' (the server's "none") is no model. */
const modelText = maybeText.transform((value) => (value?.trim() ? value : null));

export const batteryStockSchema = z
  .object({
    id: maybeText,
    brand: z.string(),
    model: modelText,
    capacity_ah: maybeNumber,
    voltage: maybeNumber,
    cca: maybeNumber,
    /** New, on the shelf. */
    on_hand_qty: z.coerce.number(),
    /** How many batteries of this product have a record of their own. */
    batteries: maybeNumber.transform((value) => value ?? 0),
  })
  .passthrough();
export type BatteryStock = z.infer<typeof batteryStockSchema>;

export const batteryCountResultSchema = z
  .object({
    brand: maybeText,
    model: modelText,
    capacity_ah: maybeNumber,
    voltage: maybeNumber,
    before: maybeNumber,
    on_hand_qty: maybeNumber,
    change: maybeNumber,
  })
  .passthrough();
export type BatteryCountResult = z.infer<typeof batteryCountResultSchema>;
