import type { PricingCompany, PricingMethod } from './schemas';

/* -------------------------------------------------------------------------- */
/* What a route's `fee` is, and who may see it                                 */
/*                                                                            */
/* fee_mappings.fee is not money. For Watanya it is a band number; for Petrol  */
/* Arrows it is EGP per 1,000 L; for the per-km companies (TAQA, Petromin) it   */
/* is unused. Rendering it with formatCurrency printed "5.00 EGP" for band 5.   */
/* Permission 3 is where pricing becomes visible at all (FalconGo gates        */
/* /api/pricing on 3); below it nothing fee- or money-like is shown.           */
/* -------------------------------------------------------------------------- */

export const PRICING_VIEW_LEVEL = 3;
export const PRICING_EDIT_LEVEL = 4;
/** apex-rust only sends trip revenue at 4; the table shows it from there. */
export const TRIP_REVENUE_LEVEL = 4;

/**
 * The seeded methods (FalconGo Models/pricing.go), used until the rules have
 * loaded and for anyone whose rules request is not allowed. A company missing
 * here and from the rules shows nothing — the safe default.
 */
export const KNOWN_COMPANY_METHODS: Readonly<Record<string, PricingMethod>> = {
  'Petrol Arrows': 'per_1000l_fee',
  Watanya: 'band_per_1000l',
  TAQA: 'per_km',
  Petromin: 'per_km',
};

/** Each company's method in force today, from the rules response. */
export function methodsFromRules(
  companies: readonly PricingCompany[] | undefined,
): Record<string, PricingMethod> {
  const out: Record<string, PricingMethod> = { ...KNOWN_COMPANY_METHODS };
  for (const c of companies ?? []) {
    const current = c.rules.find((r) => r.id === c.current_rule_id) ?? c.rules[c.rules.length - 1];
    if (current) out[c.company] = current.method;
  }
  return out;
}

export type FeeDisplay =
  | { kind: 'band'; band: number }
  | { kind: 'rate'; ratePer1000L: number }
  | null;

/**
 * What a route's fee means for its company, or null when nothing is shown:
 * below permission 3, for a per-km company, an unknown company, or no fee.
 */
export function describeMappingFee(
  level: number,
  method: PricingMethod | undefined,
  fee: number | string | null | undefined,
): FeeDisplay {
  if (level < PRICING_VIEW_LEVEL || !method) return null;
  const n = typeof fee === 'string' ? Number(fee) : fee;
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (method === 'band_per_1000l') return { kind: 'band', band: n };
  if (method === 'per_1000l_fee') return { kind: 'rate', ratePer1000L: n };
  return null;
}

/**
 * The money line under a trip's distance: its revenue at permission 4 when the
 * server sent one, and nothing otherwise. Never the summed fee — that was a
 * band number or a rate printed as EGP.
 */
export function tripMoneyCell(level: number, revenue: number | null | undefined): number | null {
  if (level < TRIP_REVENUE_LEVEL) return null;
  return revenue != null && Number.isFinite(revenue) ? revenue : null;
}
