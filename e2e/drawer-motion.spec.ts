import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * The drawer's motion is asserted from computed style, not read off the class
 * list, because the class list lied for a long time: Tailwind core and
 * tailwindcss-animate both define `duration` and `ease`, and the variant form
 * (`data-[state=open]:duration-500`) emits no CSS at all. Every drawer ran at
 * the plugin's 150ms default while the source said 500. Nothing catches that
 * except measuring what the browser actually resolved.
 */
test.use({
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
  await page.waitForTimeout(120);

  const open = await page.evaluate(() => {
    const el = document.querySelector('[role="dialog"]') as HTMLElement;
    const cs = getComputedStyle(el);
    const overlay = document.querySelector('.fixed.inset-0[data-state]') as HTMLElement | null;
    return {
      duration: cs.animationDuration,
      easing: cs.animationTimingFunction,
      // A blur over the whole viewport is recomputed every frame while the
      // panel slides; it was the stutter on a phone.
      overlayFilter: overlay ? getComputedStyle(overlay).backdropFilter : 'none',
      sheetWidth: Math.round(el.getBoundingClientRect().width),
      railWidth: Math.round(
        (el.querySelector('aside') as HTMLElement).getBoundingClientRect().width,
      ),
    };
  });

  expect(open.duration, 'entry should be long enough to follow').toBe('0.35s');
  expect(open.easing, 'entry should decelerate, not run linear or symmetric').toBe(
    'cubic-bezier(0.32, 0.72, 0, 1)',
  );
  expect(open.overlayFilter).toBe('none');
  // The rail fills the drawer: at w-72 against a w-64 rail, 32px of sheet
  // background showed as grey dead space down the side.
  expect(open.sheetWidth - open.railWidth).toBeLessThanOrEqual(2);
});
