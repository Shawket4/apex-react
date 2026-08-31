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
for (const route of ['/cars', '/oil-changes', '/fuel-events']) {
test(`stat cards on ${route}`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(route);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.stat-card-full, .stat-card-compact'))
      .filter((e) => (e as HTMLElement).clientWidth > 0)
      .map((e) => {
        const el = e as HTMLElement;
        const card = el.closest('[class*="rounded-lg"]') as HTMLElement | null;
        return `${el.className.includes('compact') ? 'C' : 'F'} "${el.innerText}" ${el.clientWidth}/${el.scrollWidth} card=${card?.clientWidth}`;
      }),
  );
  console.log(`${route}\n  ` + r.join('\n  '));
  // Nothing should be showing an ellipsis.
  const clipped = r.filter((x) => {
    const m = x.match(/(\d+)\/(\d+)/);
    return m && +m[2] > +m[1] + 1;
  });
  expect(clipped, 'stat values must not be cut off').toEqual([]);
});
}
