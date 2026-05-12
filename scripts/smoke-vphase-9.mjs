import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-9');
await mkdir(outDir, { recursive: true });

const URL = 'https://michaeljfazio.github.io/mbse-workbench/';

const SEED_PROJECT_ID = 'p-smoke-vphase-9';
const PKG_DIAGRAM = 'd-package';

const PKG_DOMAIN = 'pkg-domain';
const PKG_SHARED = 'pkg-shared';
const PKG_UTIL = 'pkg-util';

const E_IMPORT_SHARED = 'e-import-shared';
const E_IMPORT_UTIL = 'e-import-util';

const seed = {
  id: SEED_PROJECT_ID,
  name: 'vphase-9 Smoke',
  createdAt: '2026-05-13T12:00:00.000Z',
  modifiedAt: '2026-05-13T12:05:00.000Z',
  elements: [
    { id: PKG_DOMAIN, kind: 'Package', name: 'Domain', memberIds: [] },
    { id: PKG_SHARED, kind: 'Package', name: 'Shared', memberIds: [] },
    { id: PKG_UTIL, kind: 'Package', name: 'Util', memberIds: [] },
  ],
  edges: [
    { id: E_IMPORT_SHARED, kind: 'PackageImport', sourceId: PKG_DOMAIN, targetId: PKG_SHARED },
    { id: E_IMPORT_UTIL, kind: 'PackageImport', sourceId: PKG_SHARED, targetId: PKG_UTIL },
  ],
  diagrams: [
    {
      id: PKG_DIAGRAM,
      viewpointId: 'package',
      name: 'Domain Packages',
      positions: {
        [PKG_DOMAIN]: { x: 80, y: 80 },
        [PKG_SHARED]: { x: 380, y: 80 },
        [PKG_UTIL]: { x: 680, y: 80 },
      },
    },
  ],
  history: { undo: [], redo: [] },
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript((args) => {
  const key = `mbse:v1:project:${args.id}`;
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, JSON.stringify(args.seed));
  }
}, { id: SEED_PROJECT_ID, seed });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') console.log(`[browser-error] ${msg.text()}`);
});

console.log('1/4 — visit shell');
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="canvas-toolbar"]');
await page.screenshot({ path: `${outDir}/01-shell.png`, fullPage: false });

console.log('2/4 — Package tab: three packages + two PackageImport edges');
await page.getByRole('tab', { name: 'Domain Packages' }).click();
await page.waitForSelector(`[data-testid="package-node-${PKG_DOMAIN}"]`).catch(() => {});
await page.waitForSelector(`[data-testid="package-node-${PKG_SHARED}"]`).catch(() => {});
await page.waitForSelector(`[data-testid="package-node-${PKG_UTIL}"]`).catch(() => {});
await page.waitForSelector(`[data-testid="package-import-edge-${E_IMPORT_SHARED}"]`).catch(() => {});
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/02-package-graph.png`, fullPage: false });

console.log('3/4 — inspector on Domain package');
await page.getByTestId(`project-tree-leaf-${PKG_DOMAIN}`).click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/03-inspector-package.png`, fullPage: false });

console.log('4/4 — inspector on Shared package (mid-chain importer)');
await page.getByTestId(`project-tree-leaf-${PKG_SHARED}`).click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/04-inspector-shared.png`, fullPage: false });

console.log('Done. Screenshots in', outDir);
await browser.close();
