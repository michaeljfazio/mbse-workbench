import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-11');
await mkdir(outDir, { recursive: true });

const URL = 'https://michaeljfazio.github.io/mbse-workbench/';

const SEED_PROJECT_ID = 'p-smoke-vphase-11';

const viewpoints = [
  { id: 'd-bdd', viewpointId: 'bdd', name: 'Main BDD' },
  { id: 'd-ibd', viewpointId: 'ibd', name: 'Main IBD' },
  { id: 'd-req', viewpointId: 'requirements', name: 'System Requirements' },
  { id: 'd-act', viewpointId: 'activity', name: 'Main Activity' },
  { id: 'd-state', viewpointId: 'state-machine', name: 'States Diagram' },
  { id: 'd-uc', viewpointId: 'use-case', name: 'Use Cases Diagram' },
  { id: 'd-param', viewpointId: 'parametric', name: 'Parametric Diagram' },
  { id: 'd-pkg', viewpointId: 'package', name: 'Packages Diagram' },
];

const seed = {
  id: SEED_PROJECT_ID,
  name: 'vphase-11 Smoke',
  createdAt: '2026-05-14T12:00:00.000Z',
  modifiedAt: '2026-05-14T12:05:00.000Z',
  elements: [],
  edges: [],
  diagrams: viewpoints.map((v) => ({
    id: v.id,
    viewpointId: v.viewpointId,
    name: v.name,
    positions: {},
  })),
  history: { undo: [], redo: [] },
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
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

console.log('1 — visit shell');
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="canvas-toolbar"]');
await page.screenshot({ path: `${outDir}/01-shell.png`, fullPage: false });

const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });

let n = 2;
for (const v of viewpoints) {
  const idx = String(n).padStart(2, '0');
  console.log(`${n} — viewpoint ${v.viewpointId}`);
  await tablist.getByRole('tab', { name: v.name }).click();
  await page.waitForTimeout(150);
  await page.locator('body').click({ position: { x: 4, y: 4 } });
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${outDir}/${idx}-${v.viewpointId}.png`, fullPage: false });
  n += 1;
}

console.log(`${n} — chat tab opens API key modal`);
const chatTab = page.locator('#sidebar-tab-chat');
await chatTab.click();
await page.waitForSelector('[data-testid="api-key-modal-backdrop"]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/${String(n).padStart(2, '0')}-chat-api-key-modal.png`, fullPage: false });
n += 1;

console.log(`${n} — chat sidebar needs-key state (modal dismissed)`);
await page.keyboard.press('Escape');
await page.waitForSelector('[data-testid="api-key-modal-backdrop"]', { state: 'detached' }).catch(() => {});
await page.waitForSelector('[data-testid="chat-needs-key"]');
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/${String(n).padStart(2, '0')}-chat-needs-key.png`, fullPage: false });

console.log('Done. Screenshots in', outDir);
await browser.close();
