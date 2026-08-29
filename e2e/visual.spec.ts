import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * ONE generic visual spec: loops e2e/routes.json and takes a full-page
 * screenshot per route. No assertions beyond the screenshot diff — this is a
 * change detector, not a test suite.
 */

interface Route {
  name: string;
  path: string | null;
  template?: string;
  unresolved?: string[];
  auth: boolean;
  minPermission?: number;
  note?: string;
}

const { routes } = JSON.parse(
  readFileSync(new URL('./routes.json', import.meta.url), 'utf8'),
) as { routes: Route[] };

/**
 * Some routes poll forever (live tracking), so `networkidle` can never be
 * reached there. We still wait for it, but cap the wait so the run produces
 * a screenshot instead of a timeout. The cap is recorded in .audit/PLAN.md.
 */
const NETWORK_IDLE_CAP_MS = 15_000;

/**
 * The app shell is `h-screen` and scrolls inside `<main class="overflow-y-auto">`,
 * not the document, so Playwright's `fullPage` alone stops at the viewport.
 * To make "full page" mean the whole page, grow the viewport until no
 * ancestor scroll container of `<main>` has hidden overflow (bounded; a few
 * passes because charts/tables can re-layout after a resize).
 */
const BASE_VIEWPORT = { width: 1440, height: 900 };
const MAX_VIEWPORT_HEIGHT = 8000;

async function expandViewportToContent(page: Page) {
  for (let pass = 0; pass < 3; pass++) {
    const needed = await page.evaluate(() => {
      const candidates = [document.scrollingElement, document.querySelector('main')].filter(
        (el): el is Element => !!el,
      );
      let extra = 0;
      for (const el of candidates) {
        extra = Math.max(extra, el.scrollHeight - el.clientHeight);
      }
      return extra;
    });
    if (needed <= 2) return;
    const current = page.viewportSize() ?? BASE_VIEWPORT;
    const height = Math.min(MAX_VIEWPORT_HEIGHT, current.height + needed);
    if (height === current.height) return;
    await page.setViewportSize({ width: current.width, height });
    await page.waitForTimeout(250);
  }
}

async function screenshotRoute(page: Page, route: Route) {
  await page.setViewportSize(BASE_VIEWPORT);
  await page.goto(route.path as string);
  try {
    await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_CAP_MS });
  } catch {
    console.warn(`[visual] ${route.name}: networkidle not reached in ${NETWORK_IDLE_CAP_MS}ms, capturing anyway`);
  }
  await expandViewportToContent(page);
  await expect(page).toHaveScreenshot(`${route.name}.png`, {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
}

test.describe('public routes', () => {
  // No session: /login redirects to / when a session exists.
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of routes.filter((r) => !r.auth)) {
    test(route.name, async ({ page }) => {
      test.skip(!route.path, `unresolved params: ${route.unresolved?.join(', ')}`);
      await screenshotRoute(page, route);
    });
  }
});

test.describe('authenticated routes', () => {
  // The saved session (e2e/storageState.json) is keyed by the origin it was
  // captured on; re-key it to whatever origin this config runs against so a
  // port change never silently logs the run out.
  test.use({
    storageState: async ({ baseURL }, use) => {
      const state = JSON.parse(readFileSync(new URL('./storageState.json', import.meta.url), 'utf8'));
      const origin = new URL(baseURL as string).origin;
      state.origins = (state.origins ?? []).map((o: { origin: string }) => ({ ...o, origin }));
      await use(state);
    },
  });
  for (const route of routes.filter((r) => r.auth)) {
    test(route.name, async ({ page }) => {
      test.skip(!route.path, `unresolved params: ${route.unresolved?.join(', ')}`);
      await screenshotRoute(page, route);
    });
  }
});
