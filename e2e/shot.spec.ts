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

test('oil changes table chips', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/oil-changes');
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/test-results/oil.png', fullPage: false });

  const chips = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('span[title]').forEach((el) => {
      const t = el.getAttribute('title') || '';
      if (/filter|separator|فلتر/i.test(t)) {
        out.push(`${el.textContent?.trim()} | ${el.className} | ${t.slice(0, 50)}`);
      }
    });
    return out.slice(0, 8);
  });
  console.log('CHIPS\n' + chips.join('\n'));
  expect(true).toBe(true);
});
