import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test.use({
  storageState: async ({ baseURL }, use) => {
    const state = JSON.parse(readFileSync(new URL('./storageState.json', import.meta.url), 'utf8'));
    const origin = new URL(baseURL as string).origin;
    state.origins = (state.origins ?? []).map((o: { origin: string }) => ({ ...o, origin }));
    await use(state);
  },
});
test('the login page is usable straight after signing out', async ({ page }) => {
  // Signing out from inside the mobile drawer unmounts the layout while a
  // modal Radix dialog is open. Radix puts `pointer-events: none` on <body>
  // for the duration of a modal and restores it on close; if that cleanup is
  // skipped the login page renders perfectly and ignores every click until a
  // reload. This walks that exact path.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2500);

  await page.locator('header button, [class*="print:hidden"] button').first().click();
  await page.waitForTimeout(700);
  await page.locator('aside button').first().click();
  await page.waitForTimeout(600);
  await page.getByRole('menuitem').last().click();
  await page.waitForTimeout(1500);

  await expect(page).toHaveURL(/\/login/);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).pointerEvents),
    'a stale modal lock leaves the page unclickable',
  ).not.toBe('none');

  // Prove the handlers are alive: an empty submit must raise validation. No
  // credentials, no network call.
  const submit = page.locator('button[type="submit"]').first();
  await submit.click({ timeout: 5000 });
  await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 5000 });
});
