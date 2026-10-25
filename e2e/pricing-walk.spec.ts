import { test, expect, type Page, type Route } from '@playwright/test';
import { encode } from '@msgpack/msgpack';
import { mkdirSync } from 'node:fs';

/**
 * The Pricing page and the trip money masking, walked on a mocked API.
 *
 * Self-contained like dialog-typing.spec.ts: a mocked session per permission
 * level, every backend call answered by route interception. It checks what
 * each level may see (permission 3 reads, 4 edits; nothing fee- or money-like
 * in the trips table below 4) and leaves screenshots in SHOTS_DIR.
 *
 *   CHROME_PATH=~/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell \
 *   npx playwright test e2e/pricing-walk.spec.ts
 */
const SHOTS = process.env.SHOTS_DIR ?? 'e2e/test-results/pricing-walk';
mkdirSync(SHOTS, { recursive: true });

test.use({
  storageState: { cookies: [], origins: [] },
  launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
});

/* ---- Fixtures ----------------------------------------------------------- */

const watanyaBands = [
  7315, 7810, 8360, 8910, 9460, 10010, 10560, 11110, 11660, 12210, 12760, 13310, 13860, 14410, 14960,
].map((rate, i) => ({ band: i + 1, rate_per_1000l: rate / 10 }));

const rule = (over: Record<string, unknown>) => ({
  per_km_rate: null,
  rental_amount: null,
  rental_full_days: null,
  notes: '',
  created_by_user_id: 1,
  created_at: '2026-10-25T08:00:00Z',
  bands: [],
  rental_mode: 'none',
  ...over,
});

const RULES = {
  companies: [
    {
      company: 'Petrol Arrows',
      current_rule_id: 1,
      rules: [rule({ id: 1, company: 'Petrol Arrows', effective_from: '2000-01-01', method: 'per_1000l_fee', vat_rate: 0, notes: 'seed: apex-rust revenue.rs' })],
    },
    {
      company: 'Petromin',
      current_rule_id: 4,
      rules: [
        rule({ id: 4, company: 'Petromin', effective_from: '2000-01-01', method: 'per_km', per_km_rate: 42.5, vat_rate: 0.14, rental_mode: 'per_car_day', rental_amount: 2000 }),
      ],
    },
    {
      company: 'TAQA',
      current_rule_id: 3,
      rules: [
        rule({ id: 9, company: 'TAQA', effective_from: '2026-12-01', method: 'per_km', per_km_rate: 52, vat_rate: 0.14, rental_mode: 'monthly_taper', rental_amount: 45000, rental_full_days: 28, notes: '2027 contract' }),
        rule({ id: 3, company: 'TAQA', effective_from: '2000-01-01', method: 'per_km', per_km_rate: 50.5, vat_rate: 0.14, rental_mode: 'monthly_taper', rental_amount: 43000, rental_full_days: 28 }),
      ],
    },
    {
      company: 'Watanya',
      current_rule_id: 2,
      rules: [rule({ id: 2, company: 'Watanya', effective_from: '2000-01-01', method: 'band_per_1000l', vat_rate: 0.14, bands: watanyaBands })],
    },
  ],
};

const tm = (id: number, plate: string, company: string, terminal: string, days: number, monthDays: number, chargeable: number, rental: number, frozen: boolean) => ({
  id,
  car_no_plate: plate,
  car_id: id,
  company,
  terminal,
  month: '2026-09-01',
  days_worked: days,
  month_days_worked: monthDays,
  chargeable_days: chargeable,
  rental,
  rental_vat: Math.round(rental * 14) / 100,
  rule_id: company === 'TAQA' ? 3 : 4,
  computed_at: '2026-10-01T00:00:00Z',
  frozen_at: frozen ? '2026-10-08T00:00:00Z' : null,
});

const TRUCK_ROWS = [
  tm(1, 'ط ق ا 1234', 'Petromin', 'Mostorod', 21, 21, 21, 42000, false),
  tm(2, 'ب ت ر 5521', 'Petromin', 'Suez', 9, 9, 9, 18000, false),
  tm(3, 'ر ع ص 9821', 'TAQA', 'Alexandria', 28, 28, 28, 43000, false),
  tm(4, 'س ن م 4410', 'TAQA', 'Alexandria', 12, 20, 12, 18428.57, false),
  tm(5, 'س ن م 4410', 'TAQA', 'Tanta', 8, 20, 8, 12285.71, false),
];

function truckMonths(company: string) {
  const rows = TRUCK_ROWS.filter((r) => !company || r.company === company);
  const totals: Record<string, { company: string; cars: number; car_days: number; rental: number; rental_vat: number; frozen: boolean }> = {};
  const seen = new Set<string>();
  for (const r of rows) {
    const t = (totals[r.company] ??= { company: r.company, cars: 0, car_days: 0, rental: 0, rental_vat: 0, frozen: false });
    if (!seen.has(r.company + r.car_no_plate)) {
      seen.add(r.company + r.car_no_plate);
      t.cars++;
      t.car_days += r.month_days_worked;
    }
    t.rental += r.rental;
    t.rental_vat += r.rental_vat;
    t.frozen ||= r.frozen_at != null;
  }
  return { month: '2026-09', rows, totals: Object.values(totals) };
}

const totalsBefore = { trips: 412, unpriced: 3, base_revenue: 1843210.5, revenue_vat: 214337.2, rental: 136714.28, rental_vat: 19140, total: 2213401.98 };
const totalsAfter = { trips: 412, unpriced: 1, base_revenue: 1901887.25, revenue_vat: 222552.41, rental: 136714.28, rental_vat: 19140, total: 2280293.94 };

const trip = (id: number, company: string, fee: number, drop: string, receipt: string) => ({
  ID: id,
  car_id: 7,
  driver_id: 3,
  car_no_plate: 'ر ع ص 9821',
  driver_name: 'محمد عبد الله',
  transporter: 'Apex',
  company,
  terminal: 'Mostorod',
  drop_off_point: drop,
  tank_capacity: 36000,
  date: '2026-10-20',
  receipt_no: receipt,
  mileage: 214,
  distance: 214,
  fee,
  receipt_steps: [],
});

const TRIPS = {
  data: [
    trip(101, 'Watanya', 5, 'وطنية - بنها', '880112'),
    trip(102, 'Petrol Arrows', 117.5, 'Petrol Arrows - Tanta', '880113'),
    trip(103, 'TAQA', 0, 'TAQA - Alexandria', '880114'),
  ],
  meta: { page: 1, pages: 1, total: 3, limit: 25 },
};

/* ---- Session + API ------------------------------------------------------ */

interface Calls {
  reprice: Record<string, unknown>[];
  createRule: Record<string, unknown>[];
}

async function boot(page: Page, { permission, lang }: { permission: number; lang: 'en' | 'ar' }): Promise<Calls> {
  const calls: Calls = { reprice: [], createRule: [] };
  await page.addInitScript(
    ({ permission, lang }) => {
      localStorage.setItem('i18nextLng', lang);
      localStorage.setItem(
        'apex-auth',
        JSON.stringify({
          state: { token: 'e2e', user: { name: 'E2E', email: 'e2e@example.com', permission }, isAuthenticated: true },
          version: 0,
        }),
      );
    },
    { permission, lang },
  );

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(/apextransport\.ddns\.net|\/api\/(go|rust|etit)\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (/etit/.test(path)) return route.abort();

    if (path.endsWith('/api/pricing/rules') && req.method() === 'GET') {
      if (permission < 3) return json(route, { error: 'forbidden' }, 403);
      return json(route, RULES);
    }
    if (path.endsWith('/api/pricing/rules') && req.method() === 'POST') {
      const body = req.postDataJSON();
      calls.createRule.push(body);
      return json(route, { rule: { id: 50, created_at: '2026-10-25T09:00:00Z', created_by_user_id: 1, per_km_rate: null, rental_amount: null, rental_full_days: null, notes: '', ...body }, unrepriced_trips: 42 }, 201);
    }
    if (path.endsWith('/api/pricing/truck-months')) {
      return json(route, truckMonths(url.searchParams.get('company') ?? ''));
    }
    if (path.endsWith('/api/pricing/reprice')) {
      const body = req.postDataJSON();
      calls.reprice.push(body);
      if (!body.include_frozen) {
        return json(route, { error: 'the range includes frozen months; resend with include_frozen: true to re-open and re-freeze them', frozen_months: ['2026-08', '2026-09'] }, 409);
      }
      return json(route, {
        from: body.from,
        to: body.to,
        company: body.company,
        include_frozen: true,
        trips_repriced: 412,
        trips_changed: 128,
        pricing_errors: 1,
        months_recomputed: [
          { company: 'Watanya', month: '2026-08-01' },
          { company: 'Watanya', month: '2026-09-01' },
          { company: 'Watanya', month: '2026-10-01' },
        ],
        before: totalsBefore,
        after: totalsAfter,
      });
    }
    if (path.endsWith('/api/v1/trips')) {
      return route.fulfill({ status: 200, contentType: 'application/msgpack', body: Buffer.from(encode(TRIPS)) });
    }
    return json(route, []);
  });
  return calls;
}

const settle = async (page: Page) => {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(500);
};

/**
 * The app scrolls inside <main>, not the document, so a "full page" shot grows
 * the viewport to the content first and puts it back after.
 */
async function shot(page: Page, name: string, fullPage = true) {
  if (!fullPage) return page.screenshot({ path: `${SHOTS}/${name}.png` });
  const size = page.viewportSize()!;
  const height = await page.evaluate(() => {
    const main = document.querySelector('main');
    const inner = main ? main.scrollHeight - main.clientHeight : 0;
    return Math.max(document.documentElement.scrollHeight, window.innerHeight + inner);
  });
  await page.setViewportSize({ width: size.width, height: Math.min(height, 6000) });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  await page.setViewportSize(size);
}

/* ---- The walk ----------------------------------------------------------- */

for (const width of [412, 1440]) {
  for (const lang of ['en', 'ar'] as const) {
    const tag = `${width}-${lang}`;
    const t = lang === 'en'
      ? { newVersion: 'New version', save: /Save version from/, reprice: /Re-price trips from/, review: 'Review', confirm: 'Re-price now', include: 'Include frozen months', cont: 'Continue with frozen months', rental: 'Truck rental', pricing: 'Pricing' }
      : { newVersion: 'نسخة جديدة', save: /حفظ النسخة من/, reprice: /إعادة تسعير الرحلات من/, review: 'مراجعة', confirm: 'إعادة التسعير الآن', include: 'تضمين الشهور المُقفلة', cont: 'المتابعة مع الشهور المُقفلة', rental: 'إيجار الشاحنات', pricing: 'التسعير' };

    test(`pricing at permission 3 is read-only (${tag})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await boot(page, { permission: 3, lang });
      await page.goto('/pricing');
      await expect(page.getByRole('heading', { level: 1, name: t.pricing })).toBeVisible();
      await expect(page.getByTestId('pricing-company-Watanya')).toBeVisible();
      await expect(page.getByRole('button', { name: t.newVersion })).toHaveCount(0);
      await settle(page);
      await shot(page, `pricing-p3-${tag}`);
      await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, 'no horizontal page scroll').toBeLessThanOrEqual(0);

      await page.getByRole('tab', { name: t.rental }).click();
      await expect(page.getByTestId('truck-months')).toBeVisible();
      await settle(page);
      await shot(page, `truck-months-p3-${tag}`);
    });

    test(`pricing at permission 4: new version, re-price with frozen months (${tag})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const calls = await boot(page, { permission: 4, lang });
      await page.goto('/pricing');
      await expect(page.getByTestId('pricing-company-Watanya')).toBeVisible();
      await settle(page);
      await shot(page, `pricing-p4-${tag}`);

      // New Watanya version: the band table, edited.
      await page.getByTestId('pricing-company-Watanya').getByRole('button', { name: t.newVersion }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByTestId('band-table-editor')).toBeVisible();
      await expect(dialog.getByTestId('band-table-editor').locator('li')).toHaveCount(15);
      const vat = dialog.locator('#rule-vat');
      await expect(vat).toHaveValue('14');
      await dialog.getByTestId('band-table-editor').locator('li').nth(4).locator('input').nth(1).fill('1,050');
      await settle(page);
      await shot(page, `rule-form-watanya-${tag}`, false);
      await dialog.getByTestId('band-table-editor').scrollIntoViewIfNeeded();
      await shot(page, `rule-form-watanya-bands-${tag}`, false);

      // Validation: a bad band row blocks the save.
      await dialog.getByTestId('band-table-editor').locator('li').nth(2).locator('input').nth(1).fill('');
      await dialog.getByRole('button', { name: t.save }).click();
      expect(calls.createRule).toHaveLength(0);
      await shot(page, `rule-form-watanya-error-${tag}`, false);
      await dialog.getByTestId('band-table-editor').locator('li').nth(2).locator('input').nth(1).fill('83.6');

      await dialog.getByRole('button', { name: t.save }).click();
      await expect(dialog.getByTestId('pricing-rule-saved')).toBeVisible();
      expect(calls.createRule).toHaveLength(1);
      const sent = calls.createRule[0] as { vat_rate: number; bands: { band: number; rate_per_1000l: number }[]; method: string; per_km_rate?: number };
      expect(sent.vat_rate).toBe(0.14);
      expect(sent.method).toBe('band_per_1000l');
      expect(sent.bands).toHaveLength(15);
      expect(sent.bands[4]).toEqual({ band: 5, rate_per_1000l: 1050 });
      expect('per_km_rate' in sent).toBe(false);
      await shot(page, `rule-saved-${tag}`, false);

      // Re-price from the new version's date: review, confirm, 409 frozen, tick, confirm.
      await dialog.getByRole('button', { name: t.reprice }).click();
      const rp = page.getByTestId('reprice-dialog');
      await expect(rp).toBeVisible();
      await rp.getByRole('button', { name: t.review }).click();
      await expect(rp.getByTestId('reprice-confirm')).toBeVisible();
      expect(calls.reprice).toHaveLength(0);
      await shot(page, `reprice-confirm-${tag}`, false);
      await rp.getByRole('button', { name: t.confirm }).click();
      await expect(rp.getByTestId('reprice-frozen')).toBeVisible();
      expect(calls.reprice).toHaveLength(1);
      expect(calls.reprice[0]).toMatchObject({ company: 'Watanya' });
      expect('include_frozen' in calls.reprice[0]).toBe(false);
      const cont = rp.getByRole('button', { name: t.cont });
      await expect(cont).toBeDisabled();
      await shot(page, `reprice-frozen-409-${tag}`, false);
      await rp.getByRole('checkbox').click();
      await expect(cont).toBeEnabled();
      await shot(page, `reprice-frozen-ticked-${tag}`, false);
      await cont.click();
      await rp.getByRole('button', { name: t.confirm }).click();
      await expect(rp.getByTestId('reprice-result')).toBeVisible();
      expect(calls.reprice[1]).toMatchObject({ include_frozen: true, company: 'Watanya' });
      await shot(page, `reprice-result-${tag}`, false);
      await page.keyboard.press('Escape');

      await page.getByRole('tab', { name: t.rental }).click();
      await expect(page.getByTestId('truck-months')).toBeVisible();
      await settle(page);
      await shot(page, `truck-months-p4-${tag}`);
    });

    for (const permission of [2, 3]) {
      test(`trips table shows no money or fee at permission ${permission} (${tag})`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await boot(page, { permission, lang });
        await page.goto('/trips?from=2026-10-01&to=2026-10-25');
        await expect(page.getByText('880112').first()).toBeVisible({ timeout: 15_000 });
        await settle(page);
        const main = page.locator('main');
        const text = await main.innerText();
        expect(text, 'no currency anywhere on the trips page').not.toMatch(/EGP|ج\.م|جنيه/);
        // Watanya's band (5) and Petrol Arrows' rate (117.5) must not surface as figures.
        expect(text).not.toMatch(/\b5\.00\b|117\.50/);
        await shot(page, `trips-p${permission}-${tag}`);
      });
    }
  }
}
