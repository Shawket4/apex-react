import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const PROD = 'https://apextransport.ddns.net';

test.use({
  baseURL: PROD,
  storageState: async ({}, use) => {
    const state = JSON.parse(readFileSync(new URL('./storageState.json', import.meta.url), 'utf8'));
    state.origins = (state.origins ?? []).map((o: { origin: string }) => ({ ...o, origin: PROD }));
    await use(state);
  },
});

test('what production is actually serving', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PROD + '/fuel-events');
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const probe = await page.evaluate(() => {
    // The horizontal scroller only exists in the new build.
    const scroller = document.querySelector('.-mx-4.flex.items-center.gap-2.overflow-x-auto');
    const card = document.querySelector('[class*="grid-cols-2"][class*="sm:flex"]');
    return {
      url: location.pathname,
      hasNewToolbar: !!scroller,
      hasNewCardGrid: !!card,
      bundle: (document.querySelector('script[src*="index-"]') as HTMLScriptElement)?.src.split('/').pop(),
    };
  });
  console.log('PROD ' + JSON.stringify(probe));
  await page.screenshot({ path: 'e2e/test-results/prod-fe.png', fullPage: true });
  expect(true).toBe(true);
});
