import { apiClient } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import {
  createRuleResponseSchema,
  pricingRulesResponseSchema,
  repriceFrozenSchema,
  repriceResultSchema,
  truckMonthsResponseSchema,
  type CreateRuleResponse,
  type PricingCompany,
  type PricingRuleInput,
  type RepriceInput,
  type RepriceOutcome,
  type TruckMonths,
} from './schemas';

/**
 * A re-price refused because its range touches frozen months.
 *
 * The server answers 409 with the months it would re-open; anything else
 * (a 409 without them, a 400, a 500) is an ordinary error and is returned as
 * null so the caller rethrows it.
 */
export function parseRepriceConflict(
  err: unknown,
): Extract<RepriceOutcome, { kind: 'frozen' }> | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const parsed = repriceFrozenSchema.safeParse(err.payload);
  if (!parsed.success || parsed.data.frozen_months.length === 0) return null;
  return { kind: 'frozen', months: parsed.data.frozen_months, message: parsed.data.error };
}

export const pricingApi = {
  /** `GET /api/pricing/rules` (permission 3) — every version, grouped by company. */
  async listRules(): Promise<PricingCompany[]> {
    const res = await apiClient.get('/api/pricing/rules');
    return pricingRulesResponseSchema.parse(res.data).companies;
  },

  /** `POST /api/pricing/rules` (permission 4) — append a version. */
  async createRule(input: PricingRuleInput): Promise<CreateRuleResponse> {
    const res = await apiClient.post('/api/pricing/rules', input);
    return createRuleResponseSchema.parse(res.data);
  },

  /** `DELETE /api/pricing/rules/:id` (permission 4) — only a future, unused version. */
  async deleteRule(id: number): Promise<void> {
    await apiClient.delete(`/api/pricing/rules/${id}`);
  },

  /** `GET /api/pricing/truck-months?month=YYYY-MM[&company=]` (permission 3). */
  async truckMonths(month: string, company?: string): Promise<TruckMonths> {
    const res = await apiClient.get('/api/pricing/truck-months', {
      params: company ? { month, company } : { month },
    });
    return truckMonthsResponseSchema.parse(res.data);
  },

  /**
   * `POST /api/pricing/reprice` (permission 4).
   *
   * A 409 naming frozen months is an answer, not a failure: it comes back as
   * `{ kind: 'frozen' }` so the dialog can ask before re-opening them.
   */
  async reprice(input: RepriceInput): Promise<RepriceOutcome> {
    const body: RepriceInput = { from: input.from, to: input.to };
    if (input.company) body.company = input.company;
    if (input.include_frozen) body.include_frozen = true;
    try {
      // Re-pricing a long range runs one transaction server side; give it time.
      const res = await apiClient.post('/api/pricing/reprice', body, { timeout: 120_000 });
      return { kind: 'ok', result: repriceResultSchema.parse(res.data) };
    } catch (err) {
      const frozen = parseRepriceConflict(err);
      if (frozen) return frozen;
      throw err;
    }
  },
};
