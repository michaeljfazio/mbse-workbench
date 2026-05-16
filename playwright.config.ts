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
  // CI runner is ubuntu-latest (4 vCPU / 16 GB). Playwright's
  // conservative default is workers = cores/2 = 2, but at 612 specs the
  // serial pace pushes wallclock past the 60-min job cap (iter-766/.767
  // both cancelled around 412/612 specs). 4 workers ≈ 1 per core; each
  // worker drives one browser process at a time so peak memory stays
  // well under the 16 GB ceiling. If this regresses to flake-from-
  // contention, drop to 3.
  workers: process.env.CI ? 4 : undefined,
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
  // Split functional and visual specs into separate projects. Visual specs
  // are deterministic — if a baseline diff is real, retrying produces the
  // same diff. Globally `retries: 2` then triples the wallclock during a
  // visual-baseline-drift storm (e.g. iter-765's tab-strip rename diff'd
  // many baselines and pushed the job past the 60-min cap). Visual projects
  // run with `retries: 0`; functional projects keep the global retries.
  //
  // `snapshotPathTemplate` is overridden per project so baseline file names
  // stay `<arg>-chromium.png` / `<arg>-webkit.png` regardless of project
  // name (otherwise renaming the project would invalidate every committed
  // baseline).
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 },
      grepInvert: /@visual/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 },
      grepInvert: /@visual/,
    },
    {
      name: 'chromium-visual',
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 },
      grep: /@visual/,
      retries: 0,
      snapshotPathTemplate:
        '{testDir}/__screenshots__/{testFileName}/{arg}-chromium{ext}',
    },
    {
      name: 'webkit-visual',
      use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 },
      grep: /@visual/,
      retries: 0,
      snapshotPathTemplate:
        '{testDir}/__screenshots__/{testFileName}/{arg}-webkit{ext}',
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
