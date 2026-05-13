import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-10');
await mkdir(outDir, { recursive: true });

const URL = 'https://michaeljfazio.github.io/mbse-workbench/';

const SEED_PROJECT_ID = 'p-smoke-vphase-10';
const BDD_DIAGRAM = 'd-bdd';
const ACTIVITY_DIAGRAM = 'd-activity';
const REQ_DIAGRAM = 'd-requirements';

const REQ_MISSION = 'r-mission';
const BLOCK_ENGINE = 'b-engine';
const ACTION_BRAKE = 'a-brake';
const E_SATISFY_ENGINE = 'e-sat-engine';
const E_SATISFY_BRAKE = 'e-sat-brake';

const seed = {
  id: SEED_PROJECT_ID,
  name: 'vphase-10 Smoke',
  createdAt: '2026-05-13T12:00:00.000Z',
  modifiedAt: '2026-05-13T12:05:00.000Z',
  elements: [
    {
      id: REQ_MISSION,
      kind: 'Requirement',
      name: 'Mission',
      text: 'The system shall complete its mission safely.',
      reqId: 'R-001',
      priority: 'high',
      status: 'approved',
    },
    {
      id: BLOCK_ENGINE,
      kind: 'PartDefinition',
      name: 'Engine',
      isAbstract: false,
      propertyIds: [],
      portIds: [],
    },
    {
      id: ACTION_BRAKE,
      kind: 'ActionUsage',
      name: 'Brake',
      nodeType: 'action',
    },
  ],
  edges: [
    {
      id: E_SATISFY_ENGINE,
      kind: 'RequirementTrace',
      sourceId: REQ_MISSION,
      targetId: BLOCK_ENGINE,
      traceKind: 'satisfy',
    },
    {
      id: E_SATISFY_BRAKE,
      kind: 'RequirementTrace',
      sourceId: REQ_MISSION,
      targetId: ACTION_BRAKE,
      traceKind: 'satisfy',
    },
  ],
  diagrams: [
    {
      id: BDD_DIAGRAM,
      viewpointId: 'bdd',
      name: 'Main BDD',
      positions: { [BLOCK_ENGINE]: { x: 220, y: 140 } },
    },
    {
      id: ACTIVITY_DIAGRAM,
      viewpointId: 'activity',
      name: 'Main Activity',
      positions: { [ACTION_BRAKE]: { x: 220, y: 140 } },
    },
    {
      id: REQ_DIAGRAM,
      viewpointId: 'requirements',
      name: 'System Requirements',
      positions: { [REQ_MISSION]: { x: 220, y: 140 } },
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

console.log('1/6 — visit shell');
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="canvas-toolbar"]');
await page.screenshot({ path: `${outDir}/01-shell.png`, fullPage: false });

const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });

console.log('2/6 — Requirements diagram: Mission requirement node');
await tablist.getByRole('tab', { name: 'System Requirements' }).click();
await page.waitForSelector(`[data-testid="requirements-req-${REQ_MISSION}"]`).catch(() => {});
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/02-requirements-diagram.png`, fullPage: false });

console.log('3/6 — BDD: Engine block (satisfies Mission)');
await tablist.getByRole('tab', { name: 'Main BDD' }).click();
await page.waitForSelector(`[data-testid="bdd-block-${BLOCK_ENGINE}"]`).catch(() => {});
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/03-bdd-engine.png`, fullPage: false });

console.log('4/6 — Activity: Brake action (satisfies Mission)');
await tablist.getByRole('tab', { name: 'Main Activity' }).click();
await page.waitForSelector(`[data-testid="activity-action-${ACTION_BRAKE}"]`).catch(() => {});
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/04-activity-brake.png`, fullPage: false });

console.log('5/6 — Requirements surface: Matrix tab (Mission × Engine, Brake)');
await page.getByTestId('surface-tab-requirements').click();
await page.getByTestId('requirements-tab-matrix-button').click();
await page.waitForSelector(
  `[data-testid="requirements-matrix-glyph-${REQ_MISSION}-${BLOCK_ENGINE}-satisfy"]`,
).catch(() => {});
await page.waitForSelector(
  `[data-testid="requirements-matrix-glyph-${REQ_MISSION}-${ACTION_BRAKE}-satisfy"]`,
).catch(() => {});
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/05-matrix.png`, fullPage: false });

console.log('6/6 — Requirements surface: Coverage tab + impact-active on Engine');
await page.getByTestId('requirements-tab-coverage-button').click();
await page.waitForSelector('[data-testid="requirements-coverage-panel"]').catch(() => {});
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/06-coverage.png`, fullPage: false });

await tablist.getByRole('tab', { name: 'Main BDD' }).click();
await page.locator(`[data-testid="bdd-block-${BLOCK_ENGINE}"]`).click({ button: 'right' });
await page.waitForSelector('[data-testid="element-context-menu"]').catch(() => {});
await page.getByTestId('context-menu-show-impact').click();
await page.waitForSelector('[data-testid="impact-banner"]').catch(() => {});
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/07-impact-active.png`, fullPage: false });

console.log('Done. Screenshots in', outDir);
await browser.close();
