import { defineConfig, devices } from '@playwright/test';

/**
 * Visual-baseline change detector for the UI coherence audit.
 * Screenshots only — see e2e/visual.spec.ts and e2e/routes.json.
 *
 * Auth: authenticated routes consume e2e/storageState.json (git-ignored).
 * Produce it yourself — the spec never logs in. See .audit/PLAN.md.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://localhost:5173',
    storageState: 'e2e/storageState.json',
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'Africa/Cairo',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  // Device spread comes FIRST so the audit viewport below wins (Desktop Chrome
  // ships 1280x720; project-level `use` overrides top-level `use`).
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  // The backends' CORS allowlists know the origin http://localhost:5173, so the
  // detector runs the app there. It never reuses a server it did not start: if
  // another tool holds the port, Playwright fails loudly instead of screenshotting
  // a stranger (that happened once — a plugin's own Vite dashboard on 5173/5174).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
