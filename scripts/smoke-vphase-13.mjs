// Release smoke for vphase-13 — runs against the deployed Pages URL and
// captures screenshots of the cold-start UX, every viewpoint, and the
// Phase-13 feature surface (containment tree, Cmd-K palette, API-key modal).
//
// Mirrors the UI flow proven by tests/e2e/phase-13-cold-start.spec.ts.
//
// Usage: node scripts/smoke-vphase-13.mjs
// Output: artifacts/release-vphase-13/*.png

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-13');
await mkdir(outDir, { recursive: true });

const URL = 'https://michaeljfazio.github.io/mbse-workbench/';

const TREE_ROW = '[data-testid^="containment-tree-element-"]';

const rowIdFromTestId = (testId) => {
  const prefix = 'containment-tree-element-';
  if (!testId || !testId.startsWith(prefix)) {
    throw new Error(`unexpected testid: ${testId}`);
  }
  return testId.slice(prefix.length);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 900 } });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') console.log(`[browser-error] ${msg.text()}`);
});

const shot = async (name) => {
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
};

const rowIdByKind = async (kind) => {
  const row = page.locator(`${TREE_ROW}[data-kind="${kind}"]`).first();
  await row.waitFor({ state: 'visible' });
  return rowIdFromTestId(await row.getAttribute('data-testid'));
};

const openRowMenu = async (id) => {
  await page.getByTestId(`containment-tree-element-menu-trigger-${id}`).click({ force: true });
  await page.getByTestId(`containment-tree-element-menu-${id}`).waitFor({ state: 'visible' });
};

const createChild = async (ownerId, kind, ownerRole) => {
  await openRowMenu(ownerId);
  await page.getByTestId(`containment-tree-element-menu-create-child-${ownerId}`).click();
  await page.getByTestId(`containment-tree-element-menu-create-${kind}-${ownerRole}-${ownerId}`).click();
  await page.keyboard.press('Escape');
};

const createRepresentation = async (ownerId, viewpointId) => {
  await openRowMenu(ownerId);
  await page.getByTestId(`containment-tree-element-menu-create-representation-${ownerId}`).click();
  await page.getByTestId(`containment-tree-element-menu-representation-${viewpointId}-${ownerId}`).click();
  await page
    .getByTestId('diagram-panel')
    .waitFor({ state: 'visible' });
};

const activateDiagram = async (name) => {
  await page.getByRole('tablist', { name: 'Diagram tabs' }).getByRole('tab', { name }).click();
};

console.log('1 — visit deployed Pages URL:', URL);
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: /MBSE Workbench/i }).waitFor();
await page.getByTestId('canvas-toolbar').waitFor();
await shot('01-cold-start-shell');

console.log('2 — capture root Package + containment tree (Phase-13 hierarchy)');
const rootPackageId = await rowIdByKind('Package');
await shot('02-containment-tree-root');

console.log('3 — Main BDD bootstrap with first Block via inspector empty-state CTA (T-13.07)');
await page.getByTestId('inspector-empty-action-PartDefinition').click();
const partDefRow = page.locator(`${TREE_ROW}[data-kind="PartDefinition"]`).first();
const partDefId = rowIdFromTestId(await partDefRow.getAttribute('data-testid'));
await page.locator('[data-testid^="bdd-block-"][data-element-id]').first().waitFor();
await shot('03-bdd-with-block');

console.log('4 — create ActionDefinition + StateDefinition for Activity/State-Machine owners');
await createChild(rootPackageId, 'ActionDefinition', 'member');
const actionDefId = await rowIdByKind('ActionDefinition');
await createChild(rootPackageId, 'StateDefinition', 'member');
const stateDefId = await rowIdByKind('StateDefinition');
await shot('04-tree-with-action-state-defs');

console.log('5 — create seven non-BDD representations via tree row menu (T-13.33c)');
await createRepresentation(rootPackageId, 'requirements');
await createRepresentation(rootPackageId, 'use-case');
await createRepresentation(rootPackageId, 'package');
await createRepresentation(partDefId, 'ibd');
await createRepresentation(partDefId, 'parametric');
await createRepresentation(actionDefId, 'activity');
await createRepresentation(stateDefId, 'state-machine');

const viewpoints = [
  { idx: '06', viewpointId: 'bdd', diagramName: 'Main BDD' },
  { idx: '07', viewpointId: 'requirements', diagramName: 'Untitled Project Requirements', toolbar: 'toolbar-add-requirement' },
  { idx: '08', viewpointId: 'use-case', diagramName: 'Untitled Project Use Case', toolbar: 'toolbar-add-actor' },
  { idx: '09', viewpointId: 'package', diagramName: 'Untitled Project Package' },
  { idx: '10', viewpointId: 'ibd', diagramName: 'Block 1 IBD' },
  { idx: '11', viewpointId: 'parametric', diagramName: 'Block 1 Parametric' },
  { idx: '12', viewpointId: 'activity', diagramName: 'New Action Definition Activity', toolbar: 'toolbar-add-action' },
  { idx: '13', viewpointId: 'state-machine', diagramName: 'New State Definition State Machine', toolbar: 'toolbar-add-state' },
];

for (const v of viewpoints) {
  console.log(`${v.idx} — ${v.viewpointId}: ${v.diagramName}`);
  await activateDiagram(v.diagramName);
  await page
    .getByTestId('diagram-panel')
    .getAttribute('data-viewpoint-id')
    .then((vp) => {
      if (vp !== v.viewpointId) {
        throw new Error(`active viewpoint expected ${v.viewpointId}, got ${vp}`);
      }
    });
  if (v.toolbar) {
    await page.getByTestId(v.toolbar).click();
    await page.waitForTimeout(150);
  }
  await shot(`${v.idx}-viewpoint-${v.viewpointId}`);
}

console.log('14 — Cmd-K command palette (search-across-all-elements)');
await page.keyboard.press('Meta+K');
const palette = page.getByTestId('command-palette');
const paletteVisible = await palette.isVisible().catch(() => false);
if (!paletteVisible) {
  // Fallback for non-mac headless: try Ctrl-K
  await page.keyboard.press('Control+K');
}
await palette.waitFor({ state: 'visible' });
await shot('14-cmd-k-palette');
await page.keyboard.press('Escape');

console.log('15 — chat tab opens API-key modal');
await page.locator('#sidebar-tab-chat').click();
await page.getByTestId('api-key-modal-backdrop').waitFor();
await shot('15-chat-api-key-modal');
await page.keyboard.press('Escape');

console.log('16 — chat sidebar needs-key state');
await page.getByTestId('chat-needs-key').waitFor();
await shot('16-chat-needs-key');

console.log('Done. Screenshots in', outDir);
await browser.close();
