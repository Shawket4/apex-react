import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Stored pricing (FalconGo /api/pricing/*)                                    */
/*                                                                            */
/* One effective-dated rule per company version. A trip is priced by the       */
/* newest version effective on its date; car rental by the version effective   */
/* on the first day of its month. Versions are append-only: a change is a new  */
/* row with a later effective_from, never an edit.                            */
/* -------------------------------------------------------------------------- */

export const PRICING_METHODS = ['per_1000l_fee', 'band_per_1000l', 'per_km'] as const;
export type PricingMethod = (typeof PRICING_METHODS)[number];

export const RENTAL_MODES = ['none', 'monthly_taper', 'per_car_day'] as const;
export type RentalMode = (typeof RENTAL_MODES)[number];

export const pricingBandSchema = z.object({
  band: z.number().int(),
  rate_per_1000l: z.number(),
});
export type PricingBand = z.infer<typeof pricingBandSchema>;

export const pricingRuleSchema = z.object({
  id: z.number(),
  company: z.string(),
  effective_from: z.string(),
  method: z.enum(PRICING_METHODS),
  per_km_rate: z.number().nullable().optional(),
  /** A fraction: 0.14 is 14%. */
  vat_rate: z.number(),
  rental_mode: z.enum(RENTAL_MODES),
  rental_amount: z.number().nullable().optional(),
  rental_full_days: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_by_user_id: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
  bands: z.array(pricingBandSchema).nullable().optional().transform((b) => b ?? []),
});
export type PricingRule = z.infer<typeof pricingRuleSchema>;

export const pricingCompanySchema = z.object({
  company: z.string(),
  /** The version in force today (Cairo), or 0 when every version is in the future. */
  current_rule_id: z.number(),
  /** Newest first. */
  rules: z.array(pricingRuleSchema),
});
export type PricingCompany = z.infer<typeof pricingCompanySchema>;

export const pricingRulesResponseSchema = z.object({
  companies: z.array(pricingCompanySchema),
});

/** The body of POST /api/pricing/rules. */
export interface PricingRuleInput {
  company: string;
  effective_from: string;
  method: PricingMethod;
  per_km_rate?: number;
  vat_rate: number;
  rental_mode: RentalMode;
  rental_amount?: number;
  rental_full_days?: number;
  notes?: string;
  bands?: PricingBand[];
}

export const createRuleResponseSchema = z.object({
  rule: pricingRuleSchema,
  /** Live trips on/after effective_from priced under another version. */
  unrepriced_trips: z.number(),
});
export type CreateRuleResponse = z.infer<typeof createRuleResponseSchema>;

/* ---- Truck-months -------------------------------------------------------- */

export const truckMonthRowSchema = z.object({
  id: z.number(),
  car_no_plate: z.string(),
  car_id: z.number().nullable().optional(),
  company: z.string(),
  terminal: z.string(),
  month: z.string(),
  /** Distinct dates this car worked at this terminal this month. */
  days_worked: z.number(),
  /** Distinct dates it worked for the company this month, across terminals. */
  month_days_worked: z.number(),
  chargeable_days: z.number(),
  rental: z.number(),
  rental_vat: z.number(),
  rule_id: z.number().nullable().optional(),
  computed_at: z.string().nullable().optional(),
  frozen_at: z.string().nullable().optional(),
});
export type TruckMonthRow = z.infer<typeof truckMonthRowSchema>;

export const truckMonthTotalSchema = z.object({
  company: z.string(),
  cars: z.number(),
  car_days: z.number(),
  rental: z.number(),
  rental_vat: z.number(),
  frozen: z.boolean(),
});
export type TruckMonthTotal = z.infer<typeof truckMonthTotalSchema>;

export const truckMonthsResponseSchema = z.object({
  month: z.string(),
  rows: z.array(truckMonthRowSchema).nullable().transform((r) => r ?? []),
  totals: z.array(truckMonthTotalSchema).nullable().transform((r) => r ?? []),
});
export type TruckMonths = z.infer<typeof truckMonthsResponseSchema>;

/* ---- Re-price ------------------------------------------------------------ */

export interface RepriceInput {
  from: string;
  to: string;
  company?: string;
  include_frozen?: boolean;
}

export const repriceTotalsSchema = z.object({
  trips: z.number(),
  unpriced: z.number(),
  base_revenue: z.number(),
  revenue_vat: z.number(),
  rental: z.number(),
  rental_vat: z.number(),
  total: z.number(),
});
export type RepriceTotals = z.infer<typeof repriceTotalsSchema>;

export const repriceResultSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  company: z.string().optional(),
  include_frozen: z.boolean().optional(),
  trips_repriced: z.number(),
  trips_changed: z.number(),
  pricing_errors: z.number(),
  months_recomputed: z
    .array(z.object({ company: z.string(), month: z.string() }))
    .nullable()
    .optional()
    .transform((m) => m ?? []),
  before: repriceTotalsSchema,
  after: repriceTotalsSchema,
});
export type RepriceResult = z.infer<typeof repriceResultSchema>;

/** A 409 from POST /api/pricing/reprice: the range touches frozen months. */
export const repriceFrozenSchema = z.object({
  error: z.string().optional(),
  frozen_months: z.array(z.string()),
});

export type RepriceOutcome =
  | { kind: 'ok'; result: RepriceResult }
  | { kind: 'frozen'; months: string[]; message?: string };
