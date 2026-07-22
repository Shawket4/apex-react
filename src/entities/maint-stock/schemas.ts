import { z } from 'zod';

/**
 * Maintenance stock — Falcon's authoritative CREDIT ledger for the garage.
 *
 * Shipments are entered here (level-4); the maintenance system mirrors these
 * numbers down and pushes consumption debits back up idempotently. Tires are
 * fungible counts (brand/model/size), oil is bulk liters per type — individual
 * tire identity (DOT, km, history) lives in the maintenance system, not here.
 */

export const tireStockSchema = z.object({
  ID: z.number(),
  brand: z.string(),
  model: z.string().nullish(),
  size: z.string().nullish(),
  on_hand_qty: z.number(),
  UpdatedAt: z.string().nullish(),
});
export type TireStock = z.infer<typeof tireStockSchema>;

export const oilStockSchema = z.object({
  ID: z.number(),
  oil_type: z.string(),
  liters_on_hand: z.number(),
  UpdatedAt: z.string().nullish(),
});
export type OilStock = z.infer<typeof oilStockSchema>;

/** Shipment entry: quantity to ADD to the (possibly new) stock line. */
export const tireCreditInputSchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim(),
  size: z.string().trim(),
  on_hand_qty: z.coerce.number().int().positive(),
});
export type TireCreditInput = z.infer<typeof tireCreditInputSchema>;

export const oilCreditInputSchema = z.object({
  oil_type: z.string().trim().min(1),
  liters_on_hand: z.coerce.number().positive(),
});
export type OilCreditInput = z.infer<typeof oilCreditInputSchema>;
