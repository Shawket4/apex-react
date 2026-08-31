import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Driver names must survive a phone.
 *
 * These rows put the date, the plate, the driver and the source chip on one
 * line with the price taking the other half of the grid. Every item except the
 * driver was shrink-0, so the driver absorbed the entire squeeze: 30px against
 * the 65-166px an Arabic name actually needs. It rendered as two characters
 * and an ellipsis, which is worse than not showing it at all — it looks like
 * data rather than a layout failure.
 */
test.use({
  storageState: async ({ baseURL }, use) => {
    const state = JSON.parse(readFileSync(new URL('./storageState.json', import.meta.url), 'utf8'));
    const origin = new URL(baseURL as string).origin;
    state.origins = (state.origins ?? []).map((o: { origin: string }) => ({ ...o, origin }));
    await use(state);
  },
});
test('dashboard fuel rows on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const panel = page.locator('section:has-text("FUEL EVENTS")').first();
  await panel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const clipped = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('a[href^="/fuel-events"] *').forEach((e) => {
      const el = e as HTMLElement;
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        out.push(`"${el.innerText?.slice(0, 30)}" ${el.clientWidth}<${el.scrollWidth}`);
      }
    });
    return out.slice(0, 8);
  });
  expect(clipped, 'nothing in a fuel row may be cut off at 390px').toEqual([]);
});
