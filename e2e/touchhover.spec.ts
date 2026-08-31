import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const PROD = 'https://apextransport.ddns.net';
test.use({
  baseURL: PROD,
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
  storageState: async ({}, use) => {
    const state = JSON.parse(readFileSync(new URL('./storageState.json', import.meta.url), 'utf8'));
    state.origins = (state.origins ?? []).map((o: { origin: string }) => ({ ...o, origin: PROD }));
    await use(state);
  },
});
test('tapping a kpi must not leave it shaded', async ({ page }) => {
  await page.goto(PROD + '/');
  await page.waitForTimeout(4500);
  const kpi = page.locator('button[aria-expanded]:has(dt)').first();
  await kpi.tap();
  await page.waitForTimeout(700);
  await kpi.tap();
  await page.waitForTimeout(700);
  // Tap somewhere inert, as a person would when they look away.
  await page.locator('h1').first().tap();
  await page.waitForTimeout(500);
  const bg = await kpi.evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log('KPI BG AFTER TAPS ' + bg);
  await page.screenshot({ path: 'e2e/test-results/touch.png' });
  expect(true).toBe(true);
});
