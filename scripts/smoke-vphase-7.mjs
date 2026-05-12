import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-7');
await mkdir(outDir, { recursive: true });

const URL = 'https://michaeljfazio.github.io/mbse-workbench/';

const SEED_PROJECT_ID = 'p-smoke-vphase-7';
const BDD_DIAGRAM = 'd-bdd';
const UC_DIAGRAM = 'd-use-case';

const ACTOR_DRIVER = 'a-driver';
const ACTOR_MECHANIC = 'a-mechanic';
const UC_START = 'uc-start';
const UC_AUTH = 'uc-auth';
const UC_DIAG = 'uc-diagnose';

const E_INCLUDE = 'e-include';
const E_EXTEND = 'e-extend';
const E_GEN = 'e-gen';

const seed = {
  id: SEED_PROJECT_ID,
  name: 'vphase-7 Smoke',
  createdAt: '2026-05-12T11:00:00.000Z',
  modifiedAt: '2026-05-12T11:05:00.000Z',
  elements: [
    { id: ACTOR_DRIVER, kind: 'Actor', name: 'Driver' },
    { id: ACTOR_MECHANIC, kind: 'Actor', name: 'Mechanic' },
    { id: UC_START, kind: 'UseCase', name: 'Start Vehicle', text: 'Driver authenticates and starts the engine.' },
    { id: UC_AUTH, kind: 'UseCase', name: 'Authenticate', text: 'Validate the driver credentials.' },
    { id: UC_DIAG, kind: 'UseCase', name: 'Run Diagnostics', text: 'Mechanic-only diagnostic workflow.' },
  ],
  edges: [
    { id: E_INCLUDE, kind: 'Include', sourceId: UC_START, targetId: UC_AUTH },
    { id: E_EXTEND, kind: 'Extend', sourceId: UC_DIAG, targetId: UC_START, extensionPoint: 'after-start' },
    { id: E_GEN, kind: 'Generalization', sourceId: ACTOR_MECHANIC, targetId: ACTOR_DRIVER },
  ],
  diagrams: [
    { id: BDD_DIAGRAM, viewpointId: 'bdd', name: 'Main BDD', positions: {} },
    {
      id: UC_DIAGRAM,
      viewpointId: 'use-case',
      name: 'Vehicle Use Cases',
      positions: {
        [ACTOR_DRIVER]: { x: 40, y: 120 },
        [ACTOR_MECHANIC]: { x: 40, y: 300 },
        [UC_START]: { x: 320, y: 80 },
        [UC_AUTH]: { x: 560, y: 80 },
        [UC_DIAG]: { x: 320, y: 280 },
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

console.log('2/4 — Use Case tab with 2 Actors + 3 Use Cases + 3 edges');
await page.getByRole('tab', { name: 'Vehicle Use Cases' }).click();
await page.waitForSelector(`[data-testid="use-case-actor-${ACTOR_DRIVER}"]`).catch(() => {});
await page.waitForSelector(`[data-testid="use-case-node-${UC_START}"]`).catch(() => {});
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/02-use-case-graph.png`, fullPage: false });

console.log('3/4 — inspector on Extend edge (extensionPoint populated)');
await page.getByTestId(`project-tree-leaf-${E_EXTEND}`).click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/03-inspector-extend.png`, fullPage: false });

console.log('4/4 — inspector on Start Vehicle use case (text populated)');
await page.getByTestId(`project-tree-leaf-${UC_START}`).click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/04-inspector-usecase.png`, fullPage: false });

console.log('Done. Screenshots in', outDir);
await browser.close();
