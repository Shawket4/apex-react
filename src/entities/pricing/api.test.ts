import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();

// errors.ts pulls in i18n, which sets <html dir> on load; there is no DOM here.
vi.mock('@/shared/i18n', () => ({ default: { t: (k: string) => k } }));

vi.mock('@/shared/api/client', () => ({
  apiClient: { post: (...a: unknown[]) => post(...a) },
}));

const { ApiError } = await import('@/shared/api/errors');
const { pricingApi, parseRepriceConflict } = await import('./api');

const totals = { trips: 10, unpriced: 0, base_revenue: 1000, revenue_vat: 140, rental: 0, rental_vat: 0, total: 1140 };

beforeEach(() => post.mockReset());

describe('reprice', () => {
  it('sends only what was set and parses the result', async () => {
    post.mockResolvedValue({
      data: {
        from: '2026-10-01',
        to: '2026-10-25',
        include_frozen: false,
        trips_repriced: 10,
        trips_changed: 3,
        pricing_errors: 0,
        months_recomputed: null,
        before: totals,
        after: { ...totals, base_revenue: 1100, total: 1254 },
      },
    });
    const out = await pricingApi.reprice({ from: '2026-10-01', to: '2026-10-25', company: '', include_frozen: false });
    expect(post).toHaveBeenCalledWith(
      '/api/pricing/reprice',
      { from: '2026-10-01', to: '2026-10-25' },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
    expect(out.kind).toBe('ok');
    if (out.kind === 'ok') {
      expect(out.result.after.total).toBe(1254);
      expect(out.result.months_recomputed).toEqual([]);
    }
  });

  it('sends company and include_frozen when set', async () => {
    post.mockResolvedValue({
      data: { trips_repriced: 0, trips_changed: 0, pricing_errors: 0, months_recomputed: [], before: totals, after: totals },
    });
    await pricingApi.reprice({ from: '2026-09-01', to: '2026-09-30', company: 'TAQA', include_frozen: true });
    expect(post.mock.calls[0][1]).toEqual({ from: '2026-09-01', to: '2026-09-30', company: 'TAQA', include_frozen: true });
  });

  it('turns a 409 with frozen months into an answer, not a failure', async () => {
    post.mockRejectedValueOnce(
      new ApiError('the range includes frozen months', 409, {
        error: 'the range includes frozen months; resend with include_frozen: true',
        frozen_months: ['2026-08', '2026-09'],
      }),
    );
    const out = await pricingApi.reprice({ from: '2026-08-01', to: '2026-10-25' });
    expect(out).toEqual({
      kind: 'frozen',
      months: ['2026-08', '2026-09'],
      message: 'the range includes frozen months; resend with include_frozen: true',
    });
  });

  it('rethrows a 409 without frozen months, and any other error', async () => {
    const dup = new ApiError('conflict', 409, { error: 'conflict' });
    post.mockRejectedValueOnce(dup);
    await expect(pricingApi.reprice({ from: '2026-08-01', to: '2026-08-31' })).rejects.toBe(dup);

    const bad = new ApiError('to is before from', 400, { error: 'to is before from' });
    post.mockRejectedValueOnce(bad);
    await expect(pricingApi.reprice({ from: '2026-08-31', to: '2026-08-01' })).rejects.toBe(bad);
  });
});

describe('parseRepriceConflict', () => {
  it('only matches a 409 that names months', () => {
    expect(parseRepriceConflict(new ApiError('x', 409, { frozen_months: [] }))).toBeNull();
    expect(parseRepriceConflict(new ApiError('x', 500, { frozen_months: ['2026-08'] }))).toBeNull();
    expect(parseRepriceConflict(new Error('x'))).toBeNull();
    expect(parseRepriceConflict(new ApiError('x', 409, { frozen_months: ['2026-08'] }))).toEqual({
      kind: 'frozen',
      months: ['2026-08'],
      message: undefined,
    });
  });
});
