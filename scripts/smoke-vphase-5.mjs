import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-5');
await mkdir(outDir, { recursive: true });

const URL = 'https://michaeljfazio.github.io/mbse-workbench/';

const SEED_PROJECT_ID = 'p-smoke-vphase-5';
const BDD_DIAGRAM = 'd-bdd';
const ACTIVITY_DIAGRAM = 'd-activity';

const INITIAL = 'a-initial';
const VALIDATE = 'a-validate';
const ADULT = 'a-adult';
const APPROVE = 'a-approve';
const REJECT = 'a-reject';
const DONE = 'a-done';
const FINAL = 'a-final';

const seed = {
  id: SEED_PROJECT_ID,
  name: 'vphase-5 Smoke',
  createdAt: '2026-05-12T10:00:00.000Z',
  modifiedAt: '2026-05-12T10:05:00.000Z',
  elements: [
    { id: INITIAL, kind: 'ActionUsage', name: '', nodeType: 'initial' },
    { id: VALIDATE, kind: 'ActionUsage', name: 'Validate', nodeType: 'action' },
    { id: ADULT, kind: 'ActionUsage', name: 'Adult?', nodeType: 'decision' },
    { id: APPROVE, kind: 'ActionUsage', name: 'Approve', nodeType: 'action' },
    { id: REJECT, kind: 'ActionUsage', name: 'Reject', nodeType: 'action' },
    { id: DONE, kind: 'ActionUsage', name: 'Done', nodeType: 'merge' },
    { id: FINAL, kind: 'ActionUsage', name: '', nodeType: 'final' },
  ],
  edges: [
    { id: 'cf-1', kind: 'ControlFlow', sourceId: INITIAL, targetId: VALIDATE },
    { id: 'cf-2', kind: 'ControlFlow', sourceId: VALIDATE, targetId: ADULT },
    {
      id: 'cf-3',
      kind: 'ControlFlow',
      sourceId: ADULT,
      targetId: APPROVE,
      guard: 'age >= 18',
    },
    { id: 'cf-4', kind: 'ControlFlow', sourceId: ADULT, targetId: REJECT },
    { id: 'cf-5', kind: 'ControlFlow', sourceId: APPROVE, targetId: DONE },
    { id: 'cf-6', kind: 'ControlFlow', sourceId: REJECT, targetId: DONE },
    { id: 'cf-7', kind: 'ControlFlow', sourceId: DONE, targetId: FINAL },
    {
      id: 'of-1',
      kind: 'ObjectFlow',
      sourceId: APPROVE,
      targetId: DONE,
      itemType: 'Token',
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
      id: ACTIVITY_DIAGRAM,
      viewpointId: 'activity',
      name: 'System Activity',
      positions: {
        [INITIAL]: { x: 200, y: 30 },
        [VALIDATE]: { x: 200, y: 110 },
        [ADULT]: { x: 200, y: 210 },
        [APPROVE]: { x: 100, y: 320 },
        [REJECT]: { x: 300, y: 320 },
        [DONE]: { x: 200, y: 430 },
        [FINAL]: { x: 210, y: 510 },
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

console.log('2/4 — Activity tab with seeded 7-node approval flow + 7 ControlFlows + 1 ObjectFlow');
await page.getByRole('tab', { name: 'System Activity' }).click();
await page.waitForSelector('[data-action-node-type="initial"]');
await page.waitForSelector('[data-action-node-type="final"]');
await page.waitForSelector(
  '[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]',
);
await page.waitForSelector(
  '[data-testid^="activity-edge-"][data-edge-kind="ObjectFlow"]',
);
await page.locator('body').click({ position: { x: 4, y: 4 } });
await page.mouse.move(0, 0);
await page.screenshot({ path: `${outDir}/02-activity-with-graph.png`, fullPage: false });

console.log('3/4 — inspector on guarded ControlFlow Adult? → Approve');
const guardedEdge = page
  .locator(
    '[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"][data-edge-id="cf-3"]',
  )
  .first();
await guardedEdge.waitFor();
// Edge clicks are unreliable in RF v12; surface the guard via the inspector by
// clicking the guard label itself.
await page.getByTestId('activity-edge-guard-cf-3').click({ force: true });
// Fallback if the label is not the click target: use the workspace store API
// via in-page setSelection.
await page.evaluate(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window;
  if (w.__mbseSetSelection) w.__mbseSetSelection(['cf-3']);
});
await page.waitForTimeout(150);
// If the inspector isn't visible, try project tree leaf for the edge (not all
// builds expose a debug hook). Falling back to selecting via the project tree.
const inspectorEdge = page.getByTestId('inspector-control-flow-edge');
if (!(await inspectorEdge.isVisible().catch(() => false))) {
  // Best-effort: click the edge midpoint inside the SVG using bounding box.
  const box = await guardedEdge.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}
await inspectorEdge.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
await page.screenshot({ path: `${outDir}/03-inspector-controlflow-guard.png`, fullPage: false });

console.log('4/4 — inspector on ObjectFlow Approve → Done');
const objectFlow = page
  .locator(
    '[data-testid^="activity-edge-"][data-edge-kind="ObjectFlow"][data-edge-id="of-1"]',
  )
  .first();
await objectFlow.waitFor();
const ofBox = await objectFlow.boundingBox();
if (ofBox) {
  await page.mouse.click(ofBox.x + ofBox.width / 2, ofBox.y + ofBox.height / 2);
}
await page
  .getByTestId('inspector-object-flow-edge')
  .waitFor({ state: 'visible', timeout: 5000 })
  .catch(() => {});
await page.screenshot({ path: `${outDir}/04-inspector-objectflow.png`, fullPage: false });

console.log('Done. Screenshots in', outDir);
await browser.close();
