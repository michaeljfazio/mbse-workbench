import { defineConfig, devices } from '@playwright/test';

const PORT = Number.parseInt(process.env.PORT ?? '5173', 10);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

// Visual snapshot baselines are pinned to the Linux renderer used by CI
// (GitHub Actions ubuntu-latest). Skip @visual specs when running locally on
// a non-Linux host so the agent's local `npm run check` doesn't flap on
// platform-specific font rendering. The gate still fires in CI.
const SKIP_VISUAL_LOCALLY = !process.env.CI && process.platform !== 'linux';

export default defineConfig({
  testDir: './tests/e2e',
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{testFileName}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  grepInvert: SKIP_VISUAL_LOCALLY ? /@visual/ : undefined,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    deviceScaleFactor: 1,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 },
    },
  ],
  webServer: {
    command: 'pnpm run dev -- --port=' + PORT + ' --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
