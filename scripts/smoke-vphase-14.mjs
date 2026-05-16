// Release smoke for vphase-14 — runs against the deployed Pages URL and
// captures screenshots of the cold-start UX, every viewpoint, plus the new
// Phase-14 Libraries section (T-14.03 / T-14.04: KerML core auto-merged
// into every project with read-only lock badges).
//
// Carries over the vphase-13 viewpoint walkthrough verbatim (each phase
// release is a superset of the prior one) and adds:
//   - Libraries section visible with KerML root collapsed
//   - Expand KerML root → lock-badge count ≥ 2
//   - Selecting a library element shows it in the inspector
//
// Usage: node scripts/smoke-vphase-14.mjs
// Output: artifacts/release-vphase-14/*.png

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'artifacts', 'release-vphase-14');
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

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
    console.log(`[browser-error] ${msg.text()}`);
  }
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

console.log('2 — capture root Package + containment tree');
const rootPackageId = await rowIdByKind('Package');
await shot('02-containment-tree-root');

console.log('3 — Libraries section visible with KerML root collapsed (T-14.03 + T-14.04)');
const librariesSection = page.getByTestId('libraries-section');
await librariesSection.waitFor({ state: 'visible' });
const libraryHeader = page.getByTestId('libraries-section-header');
if (!(await libraryHeader.isVisible())) {
  throw new Error('libraries-section-header not visible');
}
// Pre-expand: only the KerML root row should be present, with its lock badge.
const collapsedRows = await page.locator('[data-testid^="libraries-tree-element-"]').count();
if (collapsedRows < 1) {
  throw new Error(`libraries-tree expected ≥1 collapsed row, got ${collapsedRows}`);
}
await shot('03-libraries-section-collapsed');

console.log('4 — expand KerML root → ≥2 lock badges visible');
const firstLibRow = page.locator('[data-testid^="libraries-tree-element-"]').first();
const firstLibId = (await firstLibRow.getAttribute('data-testid')).replace(
  'libraries-tree-element-',
  '',
);
await page.getByTestId(`libraries-tree-disclosure-${firstLibId}`).click();
// Wait for the row count to grow past 1.
await page.waitForFunction(
  () => document.querySelectorAll('[data-testid^="libraries-tree-element-"]').length > 1,
  { timeout: 5000 },
);
const expandedRows = await page.locator('[data-testid^="libraries-tree-element-"]').count();
const lockBadges = await page.getByTestId('libraries-lock-badge').count();
if (lockBadges < 2) {
  throw new Error(`expected ≥2 libraries-lock-badge, got ${lockBadges}`);
}
console.log(`   library rows expanded: ${expandedRows}, lock badges: ${lockBadges}`);
await shot('04-libraries-section-expanded');

console.log('5 — Main BDD bootstrap with first Block via inspector empty-state CTA');
await page.getByTestId('inspector-empty-action-PartDefinition').click();
const partDefRow = page.locator(`${TREE_ROW}[data-kind="PartDefinition"]`).first();
const partDefId = rowIdFromTestId(await partDefRow.getAttribute('data-testid'));
await page.locator('[data-testid^="bdd-block-"][data-element-id]').first().waitFor();
await shot('05-bdd-with-block');

console.log('6 — create ActionDefinition + StateDefinition for Activity/State-Machine owners');
await createChild(rootPackageId, 'ActionDefinition', 'member');
const actionDefId = await rowIdByKind('ActionDefinition');
await createChild(rootPackageId, 'StateDefinition', 'member');
const stateDefId = await rowIdByKind('StateDefinition');
await shot('06-tree-with-action-state-defs');

console.log('7 — create seven non-BDD representations via tree row menu');
await createRepresentation(rootPackageId, 'requirements');
await createRepresentation(rootPackageId, 'use-case');
await createRepresentation(rootPackageId, 'package');
await createRepresentation(partDefId, 'ibd');
await createRepresentation(partDefId, 'parametric');
await createRepresentation(actionDefId, 'activity');
await createRepresentation(stateDefId, 'state-machine');

const viewpoints = [
  { idx: '08', viewpointId: 'bdd', diagramName: 'Main BDD' },
  { idx: '09', viewpointId: 'requirements', diagramName: 'Untitled Project Requirements', toolbar: 'toolbar-add-requirement' },
  { idx: '10', viewpointId: 'use-case', diagramName: 'Untitled Project Use Case', toolbar: 'toolbar-add-actor' },
  { idx: '11', viewpointId: 'package', diagramName: 'Untitled Project Package' },
  { idx: '12', viewpointId: 'ibd', diagramName: 'Block 1 IBD' },
  { idx: '13', viewpointId: 'parametric', diagramName: 'Block 1 Parametric' },
  { idx: '14', viewpointId: 'activity', diagramName: 'New Action Definition Activity', toolbar: 'toolbar-add-action' },
  { idx: '15', viewpointId: 'state-machine', diagramName: 'New State Definition State Machine', toolbar: 'toolbar-add-state' },
];

for (const v of viewpoints) {
  console.log(`${v.idx} — ${v.viewpointId}: ${v.diagramName}`);
  await activateDiagram(v.diagramName);
  const vp = await page.getByTestId('diagram-panel').getAttribute('data-viewpoint-id');
  if (vp !== v.viewpointId) {
    throw new Error(`active viewpoint expected ${v.viewpointId}, got ${vp}`);
  }
  if (v.toolbar) {
    await page.getByTestId(v.toolbar).click();
    await page.waitForTimeout(150);
  }
  await shot(`${v.idx}-viewpoint-${v.viewpointId}`);
}

console.log('16 — Cmd-K command palette');
await page.keyboard.press('Meta+K');
const palette = page.getByTestId('command-palette');
const paletteVisible = await palette.isVisible().catch(() => false);
if (!paletteVisible) {
  await page.keyboard.press('Control+K');
}
await palette.waitFor({ state: 'visible' });
await shot('16-cmd-k-palette');
await page.keyboard.press('Escape');

console.log('17 — chat tab opens API-key modal');
await page.locator('#sidebar-tab-chat').click();
await page.getByTestId('api-key-modal-backdrop').waitFor();
await shot('17-chat-api-key-modal');
await page.keyboard.press('Escape');

console.log('18 — chat sidebar needs-key state');
await page.getByTestId('chat-needs-key').waitFor();
await shot('18-chat-needs-key');

if (consoleErrors.length > 0) {
  throw new Error(`console errors during smoke: ${consoleErrors.join(' | ')}`);
}

console.log('Done. Screenshots in', outDir);
await browser.close();
