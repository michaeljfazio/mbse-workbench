import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-8');
await mkdir(outDir, { recursive: true });

const URL = 'https://michaeljfazio.github.io/mbse-workbench/';

const SEED_PROJECT_ID = 'p-smoke-vphase-8';
const BDD_DIAGRAM = 'd-bdd';
const PAR_DIAGRAM = 'd-parametric';

const CD_NEWTON = 'cd-newton';
const CU_NEWTON = 'cu-newton';
const VP_MASS = 'vp-mass';
const VP_ACCEL = 'vp-accel';

const E_BIND_MASS = 'e-bind-mass';
const E_BIND_ACCEL = 'e-bind-accel';

const seed = {
  id: SEED_PROJECT_ID,
  name: 'vphase-8 Smoke',
  createdAt: '2026-05-13T12:00:00.000Z',
  modifiedAt: '2026-05-13T12:05:00.000Z',
  elements: [
    {
      id: CD_NEWTON,
      kind: 'ConstraintDefinition',
      name: 'NewtonsSecondLaw',
      expression: 'f = m * a',
      parameterIds: [],
    },
    {
      id: CU_NEWTON,
      kind: 'ConstraintUsage',
      name: 'newton',
      definitionId: CD_NEWTON,
    },
    {
      id: VP_MASS,
      kind: 'ValueProperty',
      name: 'mass',
      valueType: 'number',
      defaultValue: 12,
    },
    {
      id: VP_ACCEL,
      kind: 'ValueProperty',
      name: 'accel',
      valueType: 'number',
      defaultValue: 9.81,
    },
  ],
  edges: [
    { id: E_BIND_MASS, kind: 'ParameterBinding', sourceId: CU_NEWTON, targetId: VP_MASS },
    { id: E_BIND_ACCEL, kind: 'ParameterBinding', sourceId: CU_NEWTON, targetId: VP_ACCEL },
  ],
  diagrams: [
    { id: BDD_DIAGRAM, viewpointId: 'bdd', name: 'Main BDD', positions: {} },
    {
      id: PAR_DIAGRAM,
      viewpointId: 'parametric',
      name: 'Newton Parametric',
      positions: {
        [CU_NEWTON]: { x: 320, y: 80 },
        [VP_MASS]: { x: 120, y: 320 },
        [VP_ACCEL]: { x: 520, y: 320 },
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

console.log('2/4 — Parametric tab: Newton constraint + 2 ValueProperties + 2 bindings');
await page.getByRole('tab', { name: 'Newton Parametric' }).click();
await page.waitForSelector(`[data-testid="parametric-constraint-${CU_NEWTON}"]`).catch(() => {});
await page.waitForSelector(`[data-testid="parametric-value-${VP_MASS}"]`).catch(() => {});
await page.waitForSelector(`[data-testid="parametric-value-${VP_ACCEL}"]`).catch(() => {});
await page.waitForSelector(`[data-testid="parametric-binding-edge-${E_BIND_MASS}"]`).catch(() => {});
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/02-parametric-graph.png`, fullPage: false });

console.log('3/4 — inspector on ConstraintUsage (newton)');
await page.getByTestId(`project-tree-leaf-${CU_NEWTON}`).click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/03-inspector-constraint.png`, fullPage: false });

console.log('4/4 — inspector on ValueProperty (mass = 12)');
await page.getByTestId(`project-tree-leaf-${VP_MASS}`).click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/04-inspector-value.png`, fullPage: false });

console.log('Done. Screenshots in', outDir);
await browser.close();
