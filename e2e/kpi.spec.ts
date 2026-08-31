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
test('revenue kpi after expand and collapse', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(PROD + '/');
  await page.waitForTimeout(4500);
  // The KPI cards are the buttons that contain a <dt>; the first aria-expanded
  // button on the page is the user menu.
  const kpi = page.locator('button[aria-expanded]:has(dt)').first();
  // Expand then collapse the way a person does: two clicks in quick
  // succession, which the browser also reads as a double-click.
  await kpi.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'e2e/test-results/kpi-open.png' });
  await kpi.click();
  await page.waitForTimeout(1200);
  // Leave the pointer where a person's would be: still on the card.
  const grid = page.locator('div.grid').first();
  await grid.screenshot({ path: 'e2e/test-results/kpi.png' });
  // Bottom-left corner of the revenue card, magnified.
  const box = await kpi.locator('xpath=..').boundingBox();
  if (box) {
    await page.screenshot({
      path: 'e2e/test-results/kpi-corner.png',
      clip: { x: box.x, y: box.y + box.height - 26, width: 120, height: 26 },
      scale: 'css',
    });
  }
  // Where does the grey actually stop?
  const geom = await kpi.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const p = (el.parentElement as HTMLElement).getBoundingClientRect();
    const pcs = getComputedStyle(el.parentElement as HTMLElement);
    return {
      gapBottom: +(p.bottom - b.bottom).toFixed(2),
      gapTop: +(b.top - p.top).toFixed(2),
      cardBorder: pcs.borderBottomWidth,
      cardPadding: pcs.paddingBottom,
      lastChildIsButton: (el.parentElement as HTMLElement).lastElementChild === el,
    };
  });
  console.log('GEOM ' + JSON.stringify(geom));
  const info = await kpi.evaluate((el) => {
    const parent = el.parentElement as HTMLElement;
    const cs = getComputedStyle(el);
    const pcs = getComputedStyle(parent);
    return {
      btnBg: cs.backgroundColor, btnRadius: cs.borderRadius,
      btnH: Math.round(el.getBoundingClientRect().height),
      cardH: Math.round(parent.getBoundingClientRect().height),
      cardRadius: pcs.borderRadius, cardOverflow: pcs.overflow,
      focused: document.activeElement === el,
      matchesFocusVisible: el.matches(':focus-visible'),
      cardChildren: parent.children.length,
      selection: (window.getSelection()?.toString() ?? '').slice(0, 60),
      userSelect: cs.userSelect,
    };
  });
  console.log('KPI ' + JSON.stringify(info));
  expect(true).toBe(true);
});
