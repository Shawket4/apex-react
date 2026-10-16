import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * The drawer's motion is asserted from what the browser shows, not read off
 * the class list (the class list once lied: every drawer ran at a plugin's
 * 150ms default while the source said 500). The slide is the motion system's
 * (recipes.sheet: 320ms on the drawer curve), so mid-slide the panel is still
 * travelling in from its edge, and at rest it carries no transform at all.
 */
test.use({
  // The suite runs reduced by default (stable screenshots); this spec is about motion.
  reducedMotion: 'no-preference',
  storageState: async ({ baseURL }, use) => {
    const state = JSON.parse(readFileSync(new URL('./storageState.json', import.meta.url), 'utf8'));
    const origin = new URL(baseURL as string).origin;
    state.origins = (state.origins ?? []).map((o: { origin: string }) => ({ ...o, origin }));
    await use(state);
  },
});

test('the mobile drawer opens with deliberate motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2500);

  await page.locator('header button, [class*="print:hidden"] button').first().click();
  await page.waitForTimeout(80);

  const mid = await page.evaluate(() => {
    const el = document.querySelector('[role="dialog"]') as HTMLElement;
    return new DOMMatrix(getComputedStyle(el).transform).m41;
  });
  await page.waitForTimeout(600);

  const open = await page.evaluate(() => {
    const el = document.querySelector('[role="dialog"]') as HTMLElement;
    const overlay = document.querySelector('.fixed.inset-0[data-state]') as HTMLElement | null;
    return {
      transform: getComputedStyle(el).transform,
      // A blur over the whole viewport is recomputed every frame while the
      // panel slides; it was the stutter on a phone.
      overlayFilter: overlay ? getComputedStyle(overlay).backdropFilter : 'none',
      sheetWidth: Math.round(el.getBoundingClientRect().width),
      railWidth: Math.round(
        (el.querySelector('aside') as HTMLElement).getBoundingClientRect().width,
      ),
    };
  });

  expect(mid, 'mid-slide the panel is still coming in from the start edge').toBeLessThan(0);
  expect(open.transform, 'at rest the motion system hands the panel back to CSS').toBe('none');
  expect(open.overlayFilter).toBe('none');
  // The rail fills the drawer: at w-72 against a w-64 rail, 32px of sheet
  // background showed as grey dead space down the side.
  expect(open.sheetWidth - open.railWidth).toBeLessThanOrEqual(2);
});
