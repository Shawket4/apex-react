import { test, expect } from '@playwright/test';

/**
 * Typing straight after a form dialog opens keeps every character.
 *
 * Dialog entrances run on the motion system (GSAP), and these keystrokes land
 * while the entrance is still playing. Another dashboard on the same motion
 * contract lost the tail of the input that way ("Coffee and a f" saved), so
 * this types at once on a slow device (4x CPU throttle), on a phone and a
 * desktop, both clicking the field and relying on the dialog's auto-focus.
 *
 * Self-contained: a mocked session and a mocked API, so nothing reaches a
 * backend and no storageState is needed.
 */
const TEXT = 'Coffee and a free cookie 1234';

test.use({
  storageState: { cookies: [], origins: [] },
  // CHROME_PATH runs it on an installed headless shell when the bundled one is absent.
  launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
});

for (const width of [412, 1440]) {
  for (const mode of ['click the field', 'auto-focus'] as const) {
    test(`typing at once into the Add car dialog keeps the value (${width}px, ${mode})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      // The entrance must actually play: the point is typing through it.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.addInitScript(() => {
        localStorage.setItem('i18nextLng', 'en');
        localStorage.setItem(
          'apex-auth',
          JSON.stringify({
            state: {
              token: 'e2e',
              user: { name: 'E2E', email: 'e2e@example.com', permission: 5 },
              isAuthenticated: true,
            },
            version: 0,
          }),
        );
      });
      await page.route(/apextransport\.ddns\.net|\/api\/(go|rust|etit)\//, (route) =>
        /etit/.test(route.request().url())
          ? route.abort()
          : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
      );
      await page.goto('/cars');
      const add = page.getByRole('button', { name: /Add Car/ }).first();
      await expect(add).toBeVisible();

      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

      await add.click();
      const field = page
        .locator('[role="dialog"] input:not([type]), [role="dialog"] input[type="text"]')
        .first();
      if (mode === 'click the field') {
        await field.waitFor({ state: 'attached' });
        await field.click({ force: true });
      }
      await page.keyboard.type(TEXT, { delay: 15 });

      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await expect(field).toHaveValue(TEXT);
      await expect(field).toBeFocused();
    });
  }
}
