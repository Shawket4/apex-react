import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * The app shell is `h-dvh` and `<main>` owns the scroll, so the document itself
 * must never be scrollable. When it is, the page overscrolls past its own
 * content and past the sidebar — you scroll into empty background.
 *
 * The way that happens is not obvious, which is why this is a test rather than
 * a code comment: an absolutely positioned descendant with no positioned
 * ancestor resolves against the initial containing block, so it lands at its
 * static position in DOCUMENT space, outside the scroll container, and
 * stretches documentElement.scrollHeight to reach it. A single 1px `.sr-only`
 * label near the bottom of a long page is enough to add hundreds of pixels of
 * dead scroll.
 */
test.use({
  storageState: async ({ baseURL }, use) => {
    const state = JSON.parse(readFileSync(new URL('./storageState.json', import.meta.url), 'utf8'));
    const origin = new URL(baseURL as string).origin;
    state.origins = (state.origins ?? []).map((o: { origin: string }) => ({ ...o, origin }));
    await use(state);
  },
});

const ROUTES = ['/', '/trips', '/oil-changes', '/fuel-events', '/live-tracking'];

for (const route of ROUTES) {
  test(`the document does not scroll: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    // Panels load in; a short settle avoids measuring a half-built page.
    await page.waitForTimeout(2500);

    const { scroll, client, culprits } = await page.evaluate(() => {
      const de = document.documentElement;
      // Name what is sticking out, so a failure says which element to fix
      // rather than only that the number is wrong.
      const culprits: string[] = [];
      if (de.scrollHeight > de.clientHeight) {
        document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
          const bottom = el.getBoundingClientRect().bottom + window.scrollY;
          if (bottom > de.clientHeight + 1 && getComputedStyle(el).position === 'absolute') {
            const positioned = el.parentElement?.closest(
              '.relative, .absolute, .fixed, .sticky',
            );
            if (!positioned) {
              culprits.push(`${el.tagName}.${el.className}`.slice(0, 80));
            }
          }
        });
      }
      return { scroll: de.scrollHeight, client: de.clientHeight, culprits: culprits.slice(0, 5) };
    });

    expect(
      scroll,
      culprits.length
        ? `document scrolls ${scroll - client}px past the viewport; unpositioned absolute descendants: ${culprits.join(', ')}`
        : `document scrolls ${scroll - client}px past the viewport`,
    ).toBe(client);
  });
}
