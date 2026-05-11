import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-4');
await mkdir(outDir, { recursive: true });

const URL = 'https://michaeljfazio.github.io/mbse-workbench/';

const SEED_PROJECT_ID = 'p-smoke-vphase-4';
const BDD_DIAGRAM = 'd-bdd';
const REQ_DIAGRAM = 'd-requirements';
const REQ_A_ID = 'r-001';
const REQ_B_ID = 'r-002';

const seed = {
  id: SEED_PROJECT_ID,
  name: 'vphase-4 Smoke',
  createdAt: '2026-05-12T10:00:00.000Z',
  modifiedAt: '2026-05-12T10:05:00.000Z',
  elements: [
    {
      id: REQ_A_ID,
      kind: 'Requirement',
      name: 'Mission',
      reqId: 'R-001',
      text: 'System shall meet mission objectives.',
      priority: 'critical',
      status: 'approved',
    },
    {
      id: REQ_B_ID,
      kind: 'Requirement',
      name: 'Subfunction',
      reqId: 'R-002',
      text: 'System shall actuate brakes.',
      priority: 'high',
      status: 'draft',
    },
  ],
  edges: [
    {
      id: 'e-derive',
      kind: 'RequirementTrace',
      sourceId: REQ_B_ID,
      targetId: REQ_A_ID,
      traceKind: 'derive',
    },
  ],
  diagrams: [
    {
      id: BDD_DIAGRAM,
      viewpointId: 'bdd',
      name: 'Main BDD',
      positions: {},
    },
    {
      id: REQ_DIAGRAM,
      viewpointId: 'requirements',
      name: 'System Requirements',
      positions: {
        [REQ_A_ID]: { x: 80, y: 100 },
        [REQ_B_ID]: { x: 420, y: 100 },
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

console.log('2/4 — Requirements tab with seeded R-001 + R-002 + derive trace');
await page.getByRole('tab', { name: 'System Requirements' }).click();
await page.waitForSelector('[data-testid="requirements-req-r-001"]');
await page.waitForSelector('g[data-trace-kind="derive"]');
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/02-requirements-with-derive.png`, fullPage: false });

console.log('3/4 — BDD canvas with a fresh Engine block + "+ Link requirement"');
await page.getByRole('tab', { name: 'Main BDD' }).click();
await page.waitForSelector('[data-testid="canvas-toolbar"]');
await page.getByTestId('toolbar-add-block').click();
const blocks = page.locator('[data-testid^="bdd-block-"][data-element-id]');
await blocks.first().waitFor();
const engineId = await blocks.first().getAttribute('data-element-id');
await page.getByTestId(`project-tree-leaf-${engineId}`).click();
await page.getByTestId('inspector-name').fill('Engine');
await page.getByTestId('inspector-name').press('Enter');
await page.waitForSelector('[data-testid="inspector-trace-links"]');
await page.getByTestId('inspector-add-trace-link').click();
await page.waitForSelector('[data-testid="link-requirement-popover"]');
await page.screenshot({ path: `${outDir}/03-bdd-link-requirement-popover.png`, fullPage: false });
await page.getByTestId(`link-requirement-row-${REQ_A_ID}`).click();
await page.getByTestId('link-requirement-kind-satisfy').click();
await page.waitForSelector('[data-testid="inspector-trace-link-list"]');
await page.screenshot({ path: `${outDir}/04-bdd-with-satisfy.png`, fullPage: false });

console.log('Done. Screenshots in', outDir);
await browser.close();
