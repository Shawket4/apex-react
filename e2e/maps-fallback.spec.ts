import { test, expect, type Page } from '@playwright/test';

/**
 * A Google Maps key whose project has billing off does NOT fire
 * `gm_authFailure` and still draws tiles (dimmed, watermarked "For development
 * purposes only", with a "This page can't load Google Maps correctly" dialog).
 * The one machine-readable sign is the error the SDK logs:
 *
 *   Google Maps JavaScript API error: BillingNotEnabledMapError
 *
 * Verified 2026-10-24 against the real key. This stands in for that SDK (a
 * script that logs exactly that and never finishes loading), so it runs
 * offline, and checks the dashboard ends up on Leaflet, on tiles that load
 * (CARTO's basemaps began answering "API KEY REQUIRED" the same month).
 *
 * Self-contained: a mocked session and API; needs a key in the dev build and
 * VITE_MAP_PROVIDER unset or `auto` (skips otherwise).
 * `CHROME_PATH=… npx playwright test e2e/maps-fallback.spec.ts`
 */
test.use({
  storageState: { cookies: [], origins: [] },
  launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
});

const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

async function session(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem(
      'apex-auth',
      JSON.stringify({
        state: {
          token: 'e2e',
          user: { name: 'E2E', email: 'e2e@example.com', permission: 5 },
          isAuthenticated: true,
        },
        version: 0,
      }),
    );
  });
  await page.route(/apextransport\.ddns\.net|\/api\/(go|rust|etit)\//, (route) =>
    /stream/.test(route.request().url())
      ? route.abort()
      : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

interface Health {
  status: string;
  reason?: string;
  code?: string;
  provider: string;
  setting: string;
}

const health = (page: Page) =>
  page.evaluate(() => (window as unknown as { apexGoogleMaps?: Health }).apexGoogleMaps ?? null);

test('a billing-disabled Google key moves every map to Leaflet, on tiles that load', async ({
  page,
}) => {
  await session(page);
  // The SDK, as it behaves with billing off: it logs the error. (The real one
  // then draws watermarked tiles; this one never finishes, which changes
  // nothing: the error alone decides.)
  await page.route(/maps\.googleapis\.com\/maps\/api\/js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `console.error('Google Maps JavaScript API error: BillingNotEnabledMapError\\nhttps://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error');`,
    }),
  );
  const tileHosts = new Set<string>();
  await page.route(
    /arcgisonline\.com|basemaps\.cartocdn\.com|tile\.openstreetmap\.org/,
    (route) => {
      tileHosts.add(new URL(route.request().url()).host);
      return route.fulfill({ contentType: 'image/png', body: BLANK_PNG });
    },
  );

  await page.goto('/etit');
  await expect.poll(() => health(page).then((h) => h?.setting)).toBeTruthy();
  const first = await health(page);
  test.skip(
    first?.setting !== 'auto' || first?.status === 'unconfigured',
    'needs a Google key and VITE_MAP_PROVIDER=auto',
  );

  await expect
    .poll(() => health(page), { timeout: 15_000 })
    .toMatchObject({
      status: 'failed',
      reason: 'billing',
      code: 'BillingNotEnabledMapError',
      provider: 'leaflet',
    });
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('.gm-style')).toHaveCount(0);
  await expect.poll(() => [...tileHosts]).toContain('server.arcgisonline.com');
  expect([...tileHosts]).not.toContain('a.basemaps.cartocdn.com');

  // Remembered for this key: the next load starts on Leaflet, no SDK fetched.
  let sdkRequested = false;
  page.on('request', (r) => {
    if (/maps\.googleapis\.com\/maps\/api\/js/.test(r.url())) sdkRequested = true;
  });
  await page.reload();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  expect(await health(page)).toMatchObject({ status: 'failed', reason: 'billing' });
  expect(sdkRequested).toBe(false);
});
